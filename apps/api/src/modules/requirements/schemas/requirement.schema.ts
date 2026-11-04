import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RequirementStatus, BudgetType, ProfileVisibility } from '@brands-creators/types';

export type RequirementDocument = Requirement & Document;

@Schema({ timestamps: true, collection: 'requirements' })
export class Requirement {
  @Prop({ type: Types.ObjectId, ref: 'BrandProfile', required: true, index: true })
  brandId: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  title: string;

  @Prop({ required: true, trim: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  subcategoryId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  subcategoryIds: Types.ObjectId[];

  @Prop({
    type: {
      city: { type: String },
      state: { type: String },
      country: { type: String, default: 'India' },
      isRemote: { type: Boolean, default: true },
    },
    required: true,
  })
  location: {
    city?: string;
    state?: string;
    country: string;
    isRemote: boolean;
  };

  @Prop({ type: [String], default: [] })
  serviceLocations: string[];

  @Prop({ default: true })
  remoteAllowed: boolean;

  @Prop({
    type: String,
    enum: BudgetType,
    default: BudgetType.RANGE,
  })
  budgetType: BudgetType;

  @Prop({
    type: {
      min: { type: Number, required: true, index: true },
      max: { type: Number, required: true, index: true },
      currency: { type: String, default: 'INR' },
    },
    required: true,
  })
  budget: {
    min: number;
    max: number;
    currency: string;
  };

  @Prop({ required: true, index: true })
  applicationDeadline: Date;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ default: 1 })
  professionalsRequired: number;

  @Prop({ type: [String], default: [] })
  deliverables: string[];

  @Prop({ type: [String], default: [] })
  requiredSkills: string[];

  @Prop({ default: 'MID_LEVEL' })
  preferredExperience: string;

  @Prop({ type: [String], default: ['English', 'Hindi'] })
  requiredLanguages: string[];

  @Prop({ type: [String], default: [] })
  targetPlatforms: string[];

  @Prop({ default: 'General' })
  targetIndustry: string;

  @Prop()
  genderPreference?: string;

  @Prop({
    type: [
      {
        url: { type: String, required: true },
        name: { type: String, required: true },
        fileType: { type: String },
        sizeBytes: { type: Number },
      },
    ],
    default: [],
  })
  attachments: Array<{
    url: string;
    name: string;
    fileType?: string;
    sizeBytes?: number;
  }>;

  @Prop({ type: Object, default: {} })
  categorySpecificFields: Record<string, any>;

  @Prop({
    type: String,
    enum: RequirementStatus,
    default: RequirementStatus.PUBLISHED,
    index: true,
  })
  status: RequirementStatus;

  @Prop({
    type: String,
    default: 'PUBLIC',
  })
  visibility: string;

  @Prop({ default: false, index: true })
  featured: boolean;

  @Prop({ default: 0 })
  applicationCount: number;

  @Prop()
  publishedAt?: Date;

  @Prop()
  closedAt?: Date;
}

export const RequirementSchema = SchemaFactory.createForClass(Requirement);

RequirementSchema.index({ status: 1, categoryId: 1, createdAt: -1 });
RequirementSchema.index({ 'location.city': 1, 'location.isRemote': 1 });
RequirementSchema.index({ 'budget.min': 1, 'budget.max': 1 });
RequirementSchema.index({ requiredSkills: 1 });

