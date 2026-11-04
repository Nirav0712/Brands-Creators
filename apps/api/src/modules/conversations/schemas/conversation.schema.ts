import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ConversationType, ConversationStatus } from '@brands-creators/types';

export type ConversationDocument = Conversation & Document;

@Schema({ _id: false })
export class ConversationParticipant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  role: string; // BRAND, CREATOR, PRODUCTION_TEAM, ADMIN, etc.

  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;

  @Prop({ type: Date })
  lastReadAt?: Date;

  @Prop({ type: Boolean, default: false })
  muted: boolean;

  @Prop({ type: Boolean, default: false })
  archived: boolean;
}

export const ConversationParticipantSchema = SchemaFactory.createForClass(ConversationParticipant);

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({
    type: String,
    enum: Object.values(ConversationType),
    default: ConversationType.APPLICATION,
    index: true,
  })
  type: ConversationType;

  @Prop({ type: String, trim: true })
  title?: string;

  @Prop({ type: String })
  avatar?: string;

  @Prop({ type: [ConversationParticipantSchema], required: true })
  participants: ConversationParticipant[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Requirement' })
  requirementId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Application', index: true })
  applicationId?: Types.ObjectId;

  @Prop({ type: String })
  projectId?: string;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessageId?: Types.ObjectId;

  @Prop({ type: Date, index: true })
  lastMessageAt?: Date;

  @Prop({ type: String })
  lastMessagePreview?: string;

  @Prop({ type: Number, default: 0 })
  messageCount: number;

  @Prop({
    type: String,
    enum: Object.values(ConversationStatus),
    default: ConversationStatus.ACTIVE,
    index: true,
  })
  status: ConversationStatus;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes for high-performance querying and tenant isolation
ConversationSchema.index({ 'participants.userId': 1, updatedAt: -1 });
ConversationSchema.index({ 'participants.userId': 1, status: 1, lastMessageAt: -1 });
ConversationSchema.index({ applicationId: 1, type: 1 });
ConversationSchema.index({ requirementId: 1 });
ConversationSchema.index({ status: 1, lastMessageAt: -1 });
