import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentWebhookDocument = PaymentWebhook & Document;

@Schema({ timestamps: true, collection: 'paymentwebhooks' })
export class PaymentWebhook {
  @Prop({ required: true, index: true })
  eventId: string;

  @Prop({ required: true, default: 'RAZORPAY', index: true })
  provider: string;

  @Prop({ required: true, index: true })
  eventType: string;

  @Prop({ type: Types.ObjectId, ref: 'Payment', index: true })
  paymentId?: Types.ObjectId;

  @Prop()
  payloadHash?: string;

  @Prop({ default: false, index: true })
  processed: boolean;

  @Prop()
  processedAt?: Date;

  @Prop({ type: Object })
  rawPayload?: Record<string, any>;
}

export const PaymentWebhookSchema = SchemaFactory.createForClass(PaymentWebhook);

PaymentWebhookSchema.index({ provider: 1, eventId: 1 }, { unique: true });
