import { Controller, Get, Query, UseGuards, Res, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@brands-creators/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ExportAuditLogsDto } from './dto/export-audit-logs.dto';

@ApiTags('Audit Logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export platform audit logs as CSV or JSON (Super Admin / Admin only)' })
  async exportAuditLogs(
    @Request() req: any,
    @Query() filter: ExportAuditLogsDto,
    @Res() res: Response,
  ) {
    const adminUserId = req.user?.sub || req.user?.userId || req.user?.id || 'admin';
    const adminName = req.user?.fullName || req.user?.username || 'Platform Administrator';
    const exported = await this.auditLogsService.exportLogs(adminUserId, adminName, filter);

    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(exported.data);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List platform audit logs (Super Admin / Admin only)' })
  async getAuditLogs(@Query() filter: PaginationQueryDto) {
    return this.auditLogsService.findAll(filter);
  }
}
