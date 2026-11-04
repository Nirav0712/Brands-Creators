import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShortlistDocument = Shortlist & Document;

@Schema({ timestamps: true, collection: 'shortlists' })
export class Shortlist {
  @Prop({ type: Types.ObjectId, ref: 'BrandProfile', required: true, index: true })
  brandId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Requirement' })
  requirementId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'CreatorProfile' }], default: [] })
  creatorProfileIds: Types.ObjectId[];
}

export const ShortlistSchema = SchemaFactory.createForClass(Shortlist);

ShortlistSchema.index({ brandId: 1, createdAt: -1 });
