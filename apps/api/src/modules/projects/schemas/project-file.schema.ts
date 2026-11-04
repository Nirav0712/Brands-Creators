import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectFileDocument = ProjectFile & Document;

@Schema({ timestamps: true, collection: 'project_files' })
export class ProjectFile {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Milestone', index: true })
  milestoneId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  uploadedBy: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  fileName: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String })
  publicId?: string;

  @Prop({ type: String, default: 'application/octet-stream' })
  mimeType: string;

  @Prop({ type: Number, default: 0 })
  size: number;

  @Prop({ type: Number, default: 1 })
  version: number;

  @Prop({ type: String, trim: true })
  description?: string;
}

export const ProjectFileSchema = SchemaFactory.createForClass(ProjectFile);

ProjectFileSchema.index({ projectId: 1, createdAt: -1 });
