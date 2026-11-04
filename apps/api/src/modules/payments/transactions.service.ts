import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import {
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  PaymentProviderType,
  UserRole,
} from '@brands-creators/types';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async createEntry(params: {
    paymentId?: Types.ObjectId;
    projectId: Types.ObjectId;
    brandId: Types.ObjectId;
    professionalId: Types.ObjectId;
    type: TransactionType;
    direction: TransactionDirection;
    amount: number;
    currency?: string;
    status?: TransactionStatus;
    provider?: PaymentProviderType;
    providerTransactionId?: string;
    reference?: string;
    metadata?: Record<string, any>;
    capturedAt?: Date;
    refundedAt?: Date;
  }): Promise<TransactionDocument> {
    const count = await this.transactionModel.countDocuments();
    const year = new Date().getFullYear();
    const transactionNumber = `TXN-${year}-${String(count + 1).padStart(6, '0')}`;

    const transaction = new this.transactionModel({
      transactionNumber,
      paymentId: params.paymentId,
      projectId: params.projectId,
      brandId: params.brandId,
      professionalId: params.professionalId,
      type: params.type,
      direction: params.direction,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: params.status || TransactionStatus.CAPTURED,
      provider: params.provider || PaymentProviderType.RAZORPAY,
      providerTransactionId: params.providerTransactionId,
      reference: params.reference,
      metadata: params.metadata || {},
      capturedAt: params.capturedAt || (params.status === TransactionStatus.CAPTURED ? new Date() : undefined),
      refundedAt: params.refundedAt,
    });

    return transaction.save();
  }

  async findAll(requestingUser: any, query?: { projectId?: string; status?: string; page?: number; limit?: number }) {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    const filter: any = {};
    if (!isAdmin) {
      const uObjId = new Types.ObjectId(reqUserId);
      filter.$or = [{ brandId: uObjId }, { professionalId: uObjId }];
    }

    if (query?.projectId && Types.ObjectId.isValid(query.projectId)) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query?.status) {
      filter.status = query.status;
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .populate('projectId', 'title projectNumber')
        .populate('brandId', 'fullName email')
        .populate('professionalId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.transactionModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, requestingUser: any): Promise<any> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    const query = Types.ObjectId.isValid(id) ? { _id: new Types.ObjectId(id) } : { transactionNumber: id };
    const transaction = await this.transactionModel
      .findOne(query)
      .populate('projectId', 'title projectNumber')
      .populate('brandId', 'fullName email')
      .populate('professionalId', 'fullName email')
      .lean();

    if (!transaction) {
      throw new NotFoundException('Transaction record not found');
    }

    const isBrand = transaction.brandId?._id?.toString() === reqUserId || transaction.brandId?.toString() === reqUserId;
    const isProfessional = transaction.professionalId?._id?.toString() === reqUserId || transaction.professionalId?.toString() === reqUserId;

    if (!isBrand && !isProfessional && !isAdmin) {
      throw new ForbiddenException('Access denied to this transaction record');
    }

    return transaction;
  }
}
