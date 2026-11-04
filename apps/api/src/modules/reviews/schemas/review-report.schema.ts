import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ReviewReportReason, ReviewReportStatus } from '@brands-creators/types';

export type ReviewReportDocument = ReviewReport & Document;

@Schema({ timestamps: true, collection: 'review_reports' })
export class ReviewReport {
  @Prop({ type: Types.ObjectId, ref: 'Review', required: true, index: true })
  reviewId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reportedBy: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ReviewReportReason),
    required: true,
  })
  reason: ReviewReportReason;

  @Prop()
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(ReviewReportStatus),
    default: ReviewReportStatus.PENDING,
    index: true,
  })
  status: ReviewReportStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;

  @Prop()
  resolvedAt?: Date;
}

export const ReviewReportSchema = SchemaFactory.createForClass(ReviewReport);

ReviewReportSchema.index({ status: 1, createdAt: -1 });
