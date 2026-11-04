import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PayoutStatus } from '@brands-creators/types';

export type PayoutDocument = Payout & Document;

@Schema({ timestamps: true, collection: 'payouts' })
export class Payout {
  @Prop({ required: true, unique: true, index: true, uppercase: true })
  payoutNumber: string; // e.g. PO-2026-000001

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Payment', required: true, index: true })
  paymentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  professionalId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, default: 'INR', uppercase: true })
  currency: string;

  @Prop({ required: true, default: 0 })
  platformFee: number;

  @Prop({
    type: String,
    enum: Object.values(PayoutStatus),
    default: PayoutStatus.PENDING,
    index: true,
  })
  status: PayoutStatus;

  @Prop({ default: 'MANUAL' })
  provider: string;

  @Prop()
  providerPayoutId?: string;

  @Prop()
  scheduledAt?: Date;

  @Prop()
  processedAt?: Date;

  @Prop()
  failureReason?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const PayoutSchema = SchemaFactory.createForClass(Payout);

PayoutSchema.index({ professionalId: 1, createdAt: -1 });
PayoutSchema.index({ projectId: 1, status: 1 });
