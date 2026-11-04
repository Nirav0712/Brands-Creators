import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProjectStatus, ProjectRole } from '@brands-creators/types';

export type ProjectDocument = Project & Document;

@Schema({ _id: false })
export class ProjectParticipant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ProjectRole), required: true })
  role: ProjectRole;

  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;

  @Prop({ type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status: string;
}

export const ProjectParticipantSchema = SchemaFactory.createForClass(ProjectParticipant);

@Schema({ timestamps: true, collection: 'projects' })
export class Project {
  @Prop({ type: String, required: true, unique: true, index: true, trim: true })
  projectNumber: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, unique: true, index: true, trim: true })
  slug: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(ProjectStatus),
    default: ProjectStatus.CONFIRMED,
    index: true,
  })
  status: ProjectStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  brandId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  professionalId: Types.ObjectId;

  @Prop({ type: String, default: 'CREATOR' })
  professionalType: string;

  @Prop({ type: Types.ObjectId, ref: 'Requirement', required: true, index: true })
  requirementId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Application', required: true, unique: true, index: true })
  applicationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', index: true })
  conversationId?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  approvedBudget: number;

  @Prop({ type: String, default: 'INR' })
  currency: string;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: Date })
  actualStartDate?: Date;

  @Prop({ type: Date })
  actualEndDate?: Date;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: [ProjectParticipantSchema], default: [] })
  participants: ProjectParticipant[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: String, trim: true })
  cancellationReason?: string;

  @Prop({ type: String, trim: true })
  holdReason?: string;

  @Prop({ type: String, trim: true })
  completionNotes?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Compound Indexes for fast dashboard and workspace queries
ProjectSchema.index({ brandId: 1, createdAt: -1 });
ProjectSchema.index({ professionalId: 1, createdAt: -1 });
ProjectSchema.index({ status: 1, updatedAt: -1 });
ProjectSchema.index({ 'participants.userId': 1, status: 1 });
