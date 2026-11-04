import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProjectActivityType } from '@brands-creators/types';

export type ProjectActivityDocument = ProjectActivity & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'project_activities' })
export class ProjectActivity {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  actorId: Types.ObjectId;

  @Prop({ type: String })
  actorRole?: string;

  @Prop({
    type: String,
    enum: Object.values(ProjectActivityType),
    required: true,
  })
  type: ProjectActivityType;

  @Prop({ type: String, required: true, trim: true })
  description: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const ProjectActivitySchema = SchemaFactory.createForClass(ProjectActivity);

ProjectActivitySchema.index({ projectId: 1, createdAt: -1 });
