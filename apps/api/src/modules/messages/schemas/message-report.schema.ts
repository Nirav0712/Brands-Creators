import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MessageReportReason, MessageReportStatus } from '@brands-creators/types';

export type MessageReportDocument = MessageReport & Document;

@Schema({ timestamps: true, collection: 'messageReports' })
export class MessageReport {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true, index: true })
  messageId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reportedBy: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(MessageReportReason),
    required: true,
  })
  reason: MessageReportReason;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(MessageReportStatus),
    default: MessageReportStatus.PENDING,
    index: true,
  })
  status: MessageReportStatus;

  @Prop({ type: Date })
  resolvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;
}

export const MessageReportSchema = SchemaFactory.createForClass(MessageReport);

MessageReportSchema.index({ status: 1, createdAt: -1 });
MessageReportSchema.index({ messageId: 1, reportedBy: 1 }, { unique: true });
