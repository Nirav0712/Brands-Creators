import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { AuditAction } from '@brands-creators/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  async logAction(
    adminUserId: string,
    adminName: string,
    action: AuditAction,
    targetEntity: string,
    targetId: string,
    details: string,
    ipAddress?: string,
  ) {
    const log = new this.auditModel({
      adminUserId: Types.ObjectId.isValid(adminUserId)
        ? new Types.ObjectId(adminUserId)
        : new Types.ObjectId('000000000000000000000000'),
      adminName,
      action,
      targetEntity,
      targetId,
      details,
      ipAddress,
    });
    return log.save();
  }

  async findAll(filter: PaginationQueryDto) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ adminName: regex }, { targetEntity: regex }, { details: regex }];
    }

    const [items, total] = await Promise.all([
      this.auditModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.auditModel.countDocuments(query),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Sanitizes strings to prevent credential/token leakage
   */
  private redactSecrets(str: string): string {
    if (!str) return '';
    return str
      .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
      .replace(/(password|secret|token|apikey|authorization|jwt|hash)["':=\s]+([^\s,;}]+)/gi, '$1=[REDACTED]');
  }

  /**
   * Escapes CSV cell value according to RFC 4180 and protects against formula injection
   */
  private escapeCsvCell(val: any): string {
    if (val === null || val === undefined) return '""';
    let str = String(val);

    // Redact any secrets
    str = this.redactSecrets(str);

    // Prevent CSV formula injection in spreadsheet software (=, +, -, @, \t, \r)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Escape double quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  async exportLogs(
    adminUserId: string,
    adminName: string,
    filter: {
      format?: 'csv' | 'json';
      search?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    },
  ) {
    const format = filter.format === 'json' ? 'json' : 'csv';
    const limit = Math.min(10000, Math.max(1, Number(filter.limit) || 1000));

    const query: any = {};
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ adminName: regex }, { targetEntity: regex }, { details: regex }];
    }

    if (filter.action) {
      query.action = filter.action;
    }

    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) query.createdAt.$gte = new Date(filter.startDate);
      if (filter.endDate) query.createdAt.$lte = new Date(filter.endDate);
    }

    const items = await this.auditModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    // Redact sensitive properties on records
    const sanitizedItems = items.map((item: any) => ({
      id: item._id?.toString(),
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : '',
      adminUserId: item.adminUserId?.toString() || '',
      adminName: item.adminName || '',
      action: item.action,
      targetEntity: item.targetEntity,
      targetId: item.targetId,
      details: this.redactSecrets(item.details || ''),
      ipAddress: item.ipAddress || '',
    }));

    // Record audit action for the export itself
    try {
      await this.logAction(
        adminUserId,
        adminName,
        AuditAction.AUDIT_LOG_EXPORTED,
        'AuditLog',
        'export',
        `Exported ${sanitizedItems.length} records as ${format.toUpperCase()}`,
      );
    } catch {
      // Ignore background log write failures during export
    }

    if (format === 'json') {
      return {
        format: 'json',
        filename: `audit-logs-export-${Date.now()}.json`,
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            exportedBy: adminName,
            totalRecords: sanitizedItems.length,
            records: sanitizedItems,
          },
          null,
          2,
        ),
      };
    }

    // Generate CSV string
    const headers = [
      'Timestamp',
      'Admin Name',
      'Admin User ID',
      'Action',
      'Target Entity',
      'Target ID',
      'Details',
      'IP Address',
    ];

    const rows = sanitizedItems.map((item) => [
      this.escapeCsvCell(item.createdAt),
      this.escapeCsvCell(item.adminName),
      this.escapeCsvCell(item.adminUserId),
      this.escapeCsvCell(item.action),
      this.escapeCsvCell(item.targetEntity),
      this.escapeCsvCell(item.targetId),
      this.escapeCsvCell(item.details),
      this.escapeCsvCell(item.ipAddress),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return {
      format: 'csv',
      filename: `audit-logs-export-${Date.now()}.csv`,
      contentType: 'text/csv; charset=utf-8',
      data: csvContent,
    };
  }
}
