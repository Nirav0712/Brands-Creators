import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentProviderType, PaymentStatus, PaymentType } from '@brands-creators/types';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ required: true, unique: true, index: true, uppercase: true })
  paymentNumber: string; // e.g. PAY-2026-000001

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Application', index: true })
  applicationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Requirement', index: true })
  requirementId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Milestone', index: true })
  milestoneId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  brandId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  professionalId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number; // Project base amount (e.g. 85000)

  @Prop({ required: true, default: 'INR', uppercase: true })
  currency: string;

  @Prop({ required: true, default: 5, min: 0, max: 100 })
  platformFeePercentage: number;

  @Prop({ required: true, default: 0, min: 0 })
  platformFee: number; // Calculated platform commission

  @Prop({ required: true, default: 0, min: 0 })
  taxPercentage: number;

  @Prop({ required: true, default: 0, min: 0 })
  taxAmount: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number; // Amount paid by Brand

  @Prop({ required: true, min: 0 })
  professionalAmount: number; // Amount payable to Professional

  @Prop({
    type: String,
    enum: Object.values(PaymentProviderType),
    default: PaymentProviderType.RAZORPAY,
    index: true,
  })
  provider: PaymentProviderType;

  @Prop({ index: true })
  providerOrderId?: string; // e.g. order_xxx

  @Prop({ index: true })
  providerPaymentId?: string; // e.g. pay_xxx

  @Prop()
  providerSignature?: string;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true,
  })
  status: PaymentStatus;

  @Prop({
    type: String,
    enum: Object.values(PaymentType),
    default: PaymentType.PROJECT_PAYMENT,
  })
  paymentType: PaymentType;

  @Prop({ type: Types.ObjectId, ref: 'Transaction' })
  transactionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Payout' })
  payoutId?: Types.ObjectId;

  @Prop({ default: 0 })
  refundAmount?: number;

  @Prop()
  refundReason?: string;

  @Prop()
  refundedAt?: Date;

  @Prop()
  paidAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  failureReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ brandId: 1, createdAt: -1 });
PaymentSchema.index({ professionalId: 1, createdAt: -1 });
PaymentSchema.index({ projectId: 1, status: 1 });
PaymentSchema.index({ providerOrderId: 1 }, { sparse: true });
