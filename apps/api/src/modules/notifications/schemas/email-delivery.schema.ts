import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EmailDeliveryStatus } from '@brands-creators/types';

export type EmailDeliveryJobDocument = EmailDeliveryJob & Document;

@Schema({ timestamps: true, collection: 'email_deliveries' })
export class EmailDeliveryJob {
  @Prop({ type: Types.ObjectId, ref: 'Notification', index: true })
  notificationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipientId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  recipientEmail: string;

  @Prop({ trim: true })
  recipientName?: string;

  @Prop({ required: true, trim: true, index: true })
  template: string;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true })
  html: string;

  @Prop({ required: true })
  text: string;

  @Prop({
    type: String,
    enum: EmailDeliveryStatus,
    default: EmailDeliveryStatus.PENDING,
    index: true,
  })
  status: EmailDeliveryStatus;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Number, default: 3 })
  maxAttempts: number;

  @Prop({ type: Date, default: () => new Date(), index: true })
  nextAttemptAt?: Date;

  @Prop({ type: String, default: 'SMTP' })
  provider: string;

  @Prop({ type: String, trim: true })
  providerMessageId?: string;

  @Prop({ type: String, trim: true })
  error?: string;

  @Prop({ type: Boolean, default: false, index: true })
  isSimulated?: boolean;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Date })
  processedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;
}

export const EmailDeliveryJobSchema = SchemaFactory.createForClass(EmailDeliveryJob);

EmailDeliveryJobSchema.index({ status: 1, nextAttemptAt: 1 });
EmailDeliveryJobSchema.index({ recipientId: 1, createdAt: -1 });
