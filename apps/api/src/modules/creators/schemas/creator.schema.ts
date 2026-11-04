import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AvailabilityStatus,
  ServiceMode,
  VerificationStatus,
  PricingModel,
  ExperienceLevel,
  ProfileVisibility,
} from '@brands-creators/types';

export type CreatorProfileDocument = CreatorProfile & Document;

@Schema({ _id: true, timestamps: false })
export class PortfolioItem {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, enum: ['IMAGE', 'VIDEO', 'REEL', 'CASE_STUDY', 'PROJECT'], default: 'IMAGE' })
  mediaType: string;

  @Prop({ required: true, trim: true })
  mediaUrl: string;

  @Prop({ trim: true })
  coverImage?: string;

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop({ trim: true })
  videoUrl?: string;

  @Prop({ trim: true })
  externalVideoUrl?: string;

  @Prop({ trim: true })
  projectUrl?: string;

  @Prop({ trim: true })
  category?: string;

  @Prop({ trim: true })
  clientBrand?: string;

  @Prop({ type: [String], default: [] })
  deliverables?: string[];

  @Prop({ type: [String], default: [] })
  servicesProvided?: string[];

  @Prop({ type: [String], default: [] })
  skillsUsed?: string[];

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ trim: true })
  projectDate?: string;

  @Prop({ default: false })
  isFeatured?: boolean;

  @Prop({ default: 0 })
  sortOrder?: number;

  @Prop({ type: Object, default: {} })
  metrics?: {
    views?: number;
    likes?: number;
    reach?: number;
    engagement?: number;
  };
}

export const PortfolioItemSchema = SchemaFactory.createForClass(PortfolioItem);

@Schema({ _id: true, timestamps: false })
export class ServiceOffer {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, default: 0 })
  startingPrice: number;

  @Prop({ required: true, default: 'INR' })
  currency: string;

  @Prop({ type: String, enum: PricingModel, default: PricingModel.PER_PROJECT })
  pricingModel?: PricingModel;

  @Prop({ default: 3 })
  deliveryDays?: number;

  @Prop({ type: [String], default: [] })
  features?: string[];
}

export const ServiceOfferSchema = SchemaFactory.createForClass(ServiceOffer);

@Schema({ _id: true, timestamps: false })
export class BrandCollaboration {
  @Prop({ required: true, trim: true })
  brandName: string;

  @Prop({ trim: true })
  brandLogo?: string;

  @Prop({ required: true, trim: true })
  campaignName: string;

  @Prop({ required: true, trim: true })
  role: string;

  @Prop({ type: [String], default: [] })
  services: string[];

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  date?: string;

  @Prop({ trim: true })
  mediaUrl?: string;

  @Prop({ trim: true })
  externalUrl?: string;
}

export const BrandCollaborationSchema = SchemaFactory.createForClass(BrandCollaboration);

@Schema({ timestamps: true, collection: 'creatorProfiles' })
export class CreatorProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ required: true, trim: true })
  headline: string;

  @Prop({ required: true, trim: true })
  bio: string;

  @Prop({ trim: true })
  about?: string; // Rich markdown / detailed about

  @Prop({ trim: true, default: 'CREATOR' })
  professionalType?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  primaryCategoryId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  additionalCategoryIds?: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId }], default: [] })
  subcategoryIds: Types.ObjectId[];

  @Prop({ type: [String], default: [], index: true })
  skills: string[];

  @Prop({
    type: {
      city: { type: String, required: true, index: true },
      state: { type: String },
      country: { type: String, required: true, default: 'India' },
      area: { type: String },
      postalCode: { type: String },
      addressLine1: { type: String },
      addressLine2: { type: String },
      landmark: { type: String },
      isPublicAddress: { type: Boolean, default: false },
      geoPoint: {
        type: Object,
        default: undefined,
      },
    },
    required: true,
  })
  location: {
    city: string;
    state?: string;
    country: string;
    area?: string;
    postalCode?: string;
    addressLine1?: string;
    addressLine2?: string;
    landmark?: string;
    isPublicAddress?: boolean;
    geoPoint?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };

  @Prop({ type: Object, default: {} })
  customFieldValues?: Record<string, any>;

  @Prop({ type: [String], default: [] })
  serviceAreas: string[];

  @Prop({ type: [String], default: ['English', 'Hindi'] })
  languages: string[];

  @Prop({ type: String, enum: PricingModel, default: PricingModel.PER_PROJECT, index: true })
  pricingModel: PricingModel;

  @Prop({ required: true, default: 5000, index: true })
  startingPrice: number;

  @Prop({ default: false })
  isCustomQuoteOnly: boolean;

  @Prop({ required: true, default: 'INR' })
  currency: string;

  @Prop({ type: String, enum: ServiceMode, default: ServiceMode.HYBRID, index: true })
  serviceMode: ServiceMode;

  @Prop({ type: String, enum: AvailabilityStatus, default: AvailabilityStatus.AVAILABLE_NOW, index: true })
  availability: AvailabilityStatus;

  @Prop({ type: String, enum: ExperienceLevel, default: ExperienceLevel.MID_LEVEL })
  experienceLevel: ExperienceLevel;

  @Prop({ default: 1 })
  experienceYears: number;

  @Prop({ type: String, enum: VerificationStatus, default: VerificationStatus.UNVERIFIED, index: true })
  verificationStatus: VerificationStatus;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  verificationRequestedAt?: Date;

  @Prop({ trim: true })
  verificationNotes?: string;

  @Prop({ type: String, enum: ProfileVisibility, default: ProfileVisibility.PUBLISHED, index: true })
  visibilityStatus: ProfileVisibility;

  @Prop({ default: 0 })
  completionPercentage: number;

  @Prop({ type: [Object], default: [] })
  completionChecklist?: Array<{ key: string; label: string; completed: boolean; weight: number }>;

  @Prop({ default: 0, index: true })
  averageRating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ type: [PortfolioItemSchema], default: [] })
  portfolio: PortfolioItem[];

  @Prop({ type: [ServiceOfferSchema], default: [] })
  services: ServiceOffer[];

  @Prop({ type: [BrandCollaborationSchema], default: [] })
  brandCollaborations: BrandCollaboration[];

  @Prop({ trim: true })
  coverImageUrl?: string;

  @Prop({ default: false, index: true })
  featured: boolean;

  @Prop({ default: 0 })
  totalFollowers?: number;
}

export const CreatorProfileSchema = SchemaFactory.createForClass(CreatorProfile);

CreatorProfileSchema.index({ primaryCategoryId: 1, 'location.city': 1, availability: 1 });
CreatorProfileSchema.index({ skills: 1, averageRating: -1 });
CreatorProfileSchema.index({ featured: 1, averageRating: -1 });
CreatorProfileSchema.index({ visibilityStatus: 1, slug: 1 });
CreatorProfileSchema.index({ serviceAreas: 1 });
CreatorProfileSchema.index({ 'location.geoPoint': '2dsphere' }, { sparse: true });

