import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MilestoneStatus } from '@brands-creators/types';

export type MilestoneDocument = Milestone & Document;

@Schema({ timestamps: true, collection: 'milestones' })
export class Milestone {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: Number, default: 1 })
  order: number;

  @Prop({
    type: String,
    enum: Object.values(MilestoneStatus),
    default: MilestoneStatus.PENDING,
    index: true,
  })
  status: MilestoneStatus;

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  completedBy?: Types.ObjectId;
}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone);

MilestoneSchema.index({ projectId: 1, order: 1 });
MilestoneSchema.index({ projectId: 1, status: 1 });
