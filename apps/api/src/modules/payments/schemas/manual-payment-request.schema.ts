import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ManualPaymentMethod,
  ManualPaymentStatus,
  ManualPaymentTargetType,
  IManualPaymentRequest,
} from '@brands-creators/types';

export type ManualPaymentRequestDocument = ManualPaymentRequest & Document;

@Schema({ timestamps: true, collection: 'manualPaymentRequests' })
export class ManualPaymentRequest implements Omit<IManualPaymentRequest, '_id' | 'userId' | 'user' | 'targetPlanId' | 'reviewedBy' | 'createdAt' | 'updatedAt'> {
  @Prop({ type: String, required: true, unique: true, index: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ManualPaymentTargetType, required: true })
  targetType: ManualPaymentTargetType;

  @Prop({ type: Types.ObjectId, ref: 'SubscriptionPlan', required: false })
  targetPlanId?: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  tokenPackageQuantity?: number;

  @Prop({ type: String, default: '' })
  targetTitle?: string;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, default: 'INR' })
  currency: string;

  @Prop({ type: String, enum: ManualPaymentMethod, required: true })
  paymentMethod: ManualPaymentMethod;

  @Prop({ type: String, required: true, index: true })
  transactionReference: string;

  @Prop({ type: String, default: '' })
  senderIdentifier?: string; // sender UPI ID or sender account name

  @Prop({ type: String, default: '' })
  proofImageUrl?: string;

  @Prop({
    type: String,
    enum: ManualPaymentStatus,
    default: ManualPaymentStatus.PENDING_VERIFICATION,
    index: true,
  })
  status: ManualPaymentStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: String })
  rejectionReason?: string;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: String, unique: true, sparse: true })
  idempotencyKey?: string;

  @Prop({ type: String })
  fulfillmentRefId?: string; // subscription ID or ledger ID created upon approval

  @Prop({ type: String })
  notes?: string;
}

export const ManualPaymentRequestSchema = SchemaFactory.createForClass(ManualPaymentRequest);
ManualPaymentRequestSchema.index({ status: 1, createdAt: -1 });
