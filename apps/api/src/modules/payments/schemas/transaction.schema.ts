import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  PaymentProviderType,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '@brands-creators/types';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction {
  @Prop({ required: true, unique: true, index: true, uppercase: true })
  transactionNumber: string; // e.g. TXN-2026-000001

  @Prop({ type: Types.ObjectId, ref: 'Payment', index: true })
  paymentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  brandId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  professionalId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(TransactionType),
    required: true,
    index: true,
  })
  type: TransactionType;

  @Prop({
    type: String,
    enum: Object.values(TransactionDirection),
    required: true,
  })
  direction: TransactionDirection;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, default: 'INR', uppercase: true })
  currency: string;

  @Prop({
    type: String,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.PENDING,
    index: true,
  })
  status: TransactionStatus;

  @Prop({
    type: String,
    enum: Object.values(PaymentProviderType),
    default: PaymentProviderType.RAZORPAY,
  })
  provider: PaymentProviderType;

  @Prop({ index: true })
  providerTransactionId?: string;

  @Prop()
  reference?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop()
  capturedAt?: Date;

  @Prop()
  refundedAt?: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ projectId: 1, createdAt: -1 });
TransactionSchema.index({ brandId: 1, createdAt: -1 });
TransactionSchema.index({ professionalId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
