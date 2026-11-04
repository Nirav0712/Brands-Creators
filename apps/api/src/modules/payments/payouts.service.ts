import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payout, PayoutDocument } from './schemas/payout.schema';
import { PayoutStatus, UserRole } from '@brands-creators/types';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    @InjectModel(Payout.name)
    private readonly payoutModel: Model<PayoutDocument>,
  ) {}

  async createPayout(params: {
    projectId: Types.ObjectId;
    paymentId: Types.ObjectId;
    professionalId: Types.ObjectId;
    amount: number;
    currency?: string;
    platformFee?: number;
    provider?: string;
  }): Promise<PayoutDocument> {
    const count = await this.payoutModel.countDocuments();
    const year = new Date().getFullYear();
    const payoutNumber = `PO-${year}-${String(count + 1).padStart(6, '0')}`;

    const payout = new this.payoutModel({
      payoutNumber,
      projectId: params.projectId,
      paymentId: params.paymentId,
      professionalId: params.professionalId,
      amount: params.amount,
      currency: params.currency || 'INR',
      platformFee: params.platformFee || 0,
      status: PayoutStatus.PENDING,
      provider: params.provider || 'MANUAL',
    });

    return payout.save();
  }

  async findAll(requestingUser: any, query?: { projectId?: string; status?: string; page?: number; limit?: number }) {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    const filter: any = {};
    if (!isAdmin) {
      filter.professionalId = new Types.ObjectId(reqUserId);
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
      this.payoutModel
        .find(filter)
        .populate('projectId', 'title projectNumber')
        .populate('professionalId', 'fullName email')
        .populate('paymentId', 'paymentNumber amount currency status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.payoutModel.countDocuments(filter),
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

    const query = Types.ObjectId.isValid(id) ? { _id: new Types.ObjectId(id) } : { payoutNumber: id };
    const payout = await this.payoutModel
      .findOne(query)
      .populate('projectId', 'title projectNumber')
      .populate('professionalId', 'fullName email')
      .populate('paymentId', 'paymentNumber amount currency status')
      .lean();

    if (!payout) {
      throw new NotFoundException('Payout record not found');
    }

    const isProfessional = payout.professionalId?._id?.toString() === reqUserId || payout.professionalId?.toString() === reqUserId;

    if (!isProfessional && !isAdmin) {
      throw new ForbiddenException('Access denied to this payout record');
    }

    return payout;
  }
}
class PayoutssService {}
