import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DeliverableType, DeliverableStatus } from '@brands-creators/types';

export type DeliverableDocument = Deliverable & Document;

@Schema({ _id: false })
export class DeliverableFile {
  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String })
  publicId?: string;

  @Prop({ type: String, default: 'file' })
  type: string;

  @Prop({ type: String, default: 'application/octet-stream' })
  mimeType: string;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: Number, default: 0 })
  size: number;
}

export const DeliverableFileSchema = SchemaFactory.createForClass(DeliverableFile);

@Schema({ _id: false })
export class DeliverableVersion {
  @Prop({ type: Number, required: true })
  version: number;

  @Prop({ type: [DeliverableFileSchema], default: [] })
  files: DeliverableFile[];

  @Prop({ type: [String], default: [] })
  links: string[];

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submittedBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  submittedAt: Date;

  @Prop({
    type: String,
    enum: Object.values(DeliverableStatus),
    default: DeliverableStatus.SUBMITTED,
  })
  status: DeliverableStatus;

  @Prop({ type: String, trim: true })
  feedback?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt?: Date;
}

export const DeliverableVersionSchema = SchemaFactory.createForClass(DeliverableVersion);

@Schema({ timestamps: true, collection: 'deliverables' })
export class Deliverable {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Milestone', index: true })
  milestoneId?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(DeliverableType),
    default: DeliverableType.OTHER,
  })
  type: DeliverableType;

  @Prop({
    type: String,
    enum: Object.values(DeliverableStatus),
    default: DeliverableStatus.PENDING,
    index: true,
  })
  status: DeliverableStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  submittedBy?: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  submissionVersion: number;

  @Prop({ type: [DeliverableFileSchema], default: [] })
  files: DeliverableFile[];

  @Prop({ type: [String], default: [] })
  links: string[];

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Date })
  submittedAt?: Date;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  feedback?: string;

  @Prop({ type: [DeliverableVersionSchema], default: [] })
  versions: DeliverableVersion[];
}

export const DeliverableSchema = SchemaFactory.createForClass(Deliverable);

DeliverableSchema.index({ projectId: 1, milestoneId: 1 });
DeliverableSchema.index({ projectId: 1, status: 1 });
