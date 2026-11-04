import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ReviewStatus, UserRole } from '@brands-creators/types';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true, collection: 'reviews' })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reviewerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  revieweeId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    required: true,
  })
  reviewerRole: UserRole;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number; // 1 to 5 integer or half-step

  @Prop()
  title?: string;

  @Prop({ required: true })
  comment: string;

  @Prop({
    type: {
      quality: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      timeliness: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 },
    },
    _id: false,
  })
  criteria?: {
    quality?: number;
    communication?: number;
    timeliness?: number;
    professionalism?: number;
    value?: number;
  };

  @Prop({ required: true, default: true, index: true })
  verifiedProject: boolean;

  @Prop({
    type: String,
    enum: Object.values(ReviewStatus),
    default: ReviewStatus.PUBLISHED,
    index: true,
  })
  status: ReviewStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  responseBy?: Types.ObjectId;

  @Prop()
  responseText?: string;

  @Prop()
  responseAt?: Date;

  @Prop()
  editedAt?: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Unique constraint: one review per reviewer for a specific project and reviewee
ReviewSchema.index({ projectId: 1, reviewerId: 1, revieweeId: 1 }, { unique: true });
ReviewSchema.index({ revieweeId: 1, status: 1 });
ReviewSchema.index({ reviewerId: 1, createdAt: -1 });
