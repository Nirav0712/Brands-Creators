import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationType, NotificationChannel } from '@brands-creators/types';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: NotificationType,
    required: true,
    index: true,
  })
  type: NotificationType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({ trim: true })
  link?: string;

  @Prop({ trim: true })
  actionUrl?: string;

  @Prop({ trim: true })
  body?: string;

  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: [String], enum: NotificationChannel, default: [NotificationChannel.IN_APP] })
  channels?: NotificationChannel[];

  @Prop({ type: String, trim: true, index: true })
  entityType?: string;

  @Prop({ type: Types.ObjectId })
  entityId?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  deduplicationKey?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ deduplicationKey: 1 }, { sparse: true });
