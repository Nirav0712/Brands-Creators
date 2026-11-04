import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PushSubscriptionDocument = PushSubscription & Document;

@Schema({ _id: false })
export class PushSubscriptionKeys {
  @Prop({ required: true })
  p256dh: string;

  @Prop({ required: true })
  auth: string;
}

export const PushSubscriptionKeysSchema = SchemaFactory.createForClass(PushSubscriptionKeys);

@Schema({ timestamps: true, collection: 'pushSubscriptions' })
export class PushSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  endpoint: string;

  @Prop({ type: PushSubscriptionKeysSchema, required: true })
  keys: PushSubscriptionKeys;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop()
  userAgent?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PushSubscriptionSchema = SchemaFactory.createForClass(PushSubscription);

PushSubscriptionSchema.index({ userId: 1, isActive: 1 });
