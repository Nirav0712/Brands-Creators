import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApplicationStatus } from '@brands-creators/types';

export type ApplicationDocument = Application & Document;

@Schema({ timestamps: true, collection: 'applications' })
export class Application {
  @Prop({ type: Types.ObjectId, ref: 'Requirement', required: true, index: true })
  requirementId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  applicantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CreatorProfile', index: true })
  creatorProfileId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  proposal: string;

  @Prop({ required: true })
  offeredPrice: number;

  @Prop({ required: true, default: 'INR' })
  currency: string;

  @Prop({ default: 'Immediately' })
  availability: string;

  @Prop({ default: '3 Days' })
  estimatedDelivery: string;

  @Prop({
    type: [
      {
        title: { type: String, required: true },
        mediaUrl: { type: String, required: true },
        mediaType: { type: String, default: 'IMAGE' },
        coverImage: { type: String },
        clientBrand: { type: String },
      },
    ],
    default: [],
  })
  selectedPortfolioItems: Array<{
    title: string;
    mediaUrl: string;
    mediaType: string;
    coverImage?: string;
    clientBrand?: string;
  }>;

  @Prop({ trim: true })
  additionalMessage?: string;

  @Prop({
    type: String,
    enum: ApplicationStatus,
    default: ApplicationStatus.SUBMITTED,
    index: true,
  })
  status: ApplicationStatus;

  @Prop({ default: 0 })
  matchScore: number;

  @Prop({ trim: true })
  brandNotes?: string;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

ApplicationSchema.index({ requirementId: 1, applicantId: 1 }, { unique: true });
ApplicationSchema.index({ status: 1, createdAt: -1 });
ApplicationSchema.index({ matchScore: -1 });
