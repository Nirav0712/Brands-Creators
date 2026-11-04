import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SubscriptionPlanDuration, UserRole } from '@brands-creators/types';

export type SubscriptionPlanDocument = SubscriptionPlan & Document;

@Schema({ timestamps: true, collection: 'subscriptionPlans' })
export class SubscriptionPlan {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ type: Number, required: true, min: 0 })
  price: number; // in INR

  @Prop({ default: 'INR' })
  currency: string;

  @Prop({
    type: String,
    enum: SubscriptionPlanDuration,
    default: SubscriptionPlanDuration.MONTHLY,
    index: true,
  })
  duration: SubscriptionPlanDuration;

  @Prop({ type: Number, default: 30 })
  durationDays: number;

  @Prop({ type: Number, default: 0, min: 0 })
  includedTokens: number;

  @Prop({ type: [String], default: [] })
  entitlements: string[];

  @Prop({
    type: [String],
    enum: UserRole,
    default: [UserRole.CREATOR, UserRole.BRAND, UserRole.PRODUCTION_TEAM],
  })
  allowedRoles: UserRole[];

  @Prop({ default: false, index: true })
  isFree: boolean;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);

SubscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });

