import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TaskPriority, TaskStatus } from '@brands-creators/types';

export type ProjectTaskDocument = ProjectTask & Document;

@Schema({ timestamps: true, collection: 'project_tasks' })
export class ProjectTask {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Milestone', index: true })
  milestoneId?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(TaskPriority),
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Prop({
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.TODO,
    index: true,
  })
  status: TaskStatus;

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ type: Date })
  completedAt?: Date;
}

export const ProjectTaskSchema = SchemaFactory.createForClass(ProjectTask);

ProjectTaskSchema.index({ projectId: 1, status: 1 });
ProjectTaskSchema.index({ assignedTo: 1, status: 1 });
