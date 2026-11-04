import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MessageType, MessageStatus } from '@brands-creators/types';

export type MessageDocument = Message & Document;

@Schema({ _id: false })
export class MessageAttachment {
  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String })
  publicId?: string;

  @Prop({ type: String, enum: ['image', 'video', 'file', 'document'], default: 'image' })
  type: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: Number, required: true })
  size: number;

  @Prop({ type: Number })
  width?: number;

  @Prop({ type: Number })
  height?: number;

  @Prop({ type: Number })
  duration?: number;
}

export const MessageAttachmentSchema = SchemaFactory.createForClass(MessageAttachment);

@Schema({ _id: false })
export class MessageReadReceipt {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  readAt: Date;
}

export const MessageReadReceiptSchema = SchemaFactory.createForClass(MessageReadReceipt);

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  senderId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(MessageType),
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  @Prop({ type: String, default: '', trim: true })
  text: string;

  @Prop({ type: [MessageAttachmentSchema], default: [] })
  attachments: MessageAttachment[];

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  replyToMessageId?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Prop({ type: [MessageReadReceiptSchema], default: [] })
  readBy: MessageReadReceipt[];

  @Prop({ type: Date })
  editedAt?: Date;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Optimized compound indexes for cursor/pagination and retrieval
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, _id: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
