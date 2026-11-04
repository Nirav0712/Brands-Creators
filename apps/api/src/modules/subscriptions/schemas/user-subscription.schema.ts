import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SubscriptionStatus } from '@brands-creators/types';

export type UserSubscriptionDocument = UserSubscription & Document;

@Schema({ timestamps: true, collection: 'userSubscriptions' })
export class UserSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SubscriptionPlan', required: true, index: true })
  planId: Types.ObjectId;

  @Prop({
    type: String,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
    index: true,
  })
  status: SubscriptionStatus;

  @Prop({ required: true, default: Date.now })
  startsAt: Date;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: false })
  isAutoRenew: boolean;

  @Prop({ type: Number, default: 0 })
  grantedTokensCount: number;

  @Prop({ type: String, trim: true })
  paymentRequestId?: string;

  @Prop()
  cancelledAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const UserSubscriptionSchema = SchemaFactory.createForClass(UserSubscription);

UserSubscriptionSchema.index({ userId: 1, status: 1 });
UserSubscriptionSchema.index({ expiresAt: 1, status: 1 });

