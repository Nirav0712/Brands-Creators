import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  VerificationStatus,
  ProfileVisibility,
  PricingModel,
  AvailabilityStatus,
} from '@brands-creators/types';
import {
  PortfolioItem,
  PortfolioItemSchema,
  ServiceOffer,
  ServiceOfferSchema,
} from '../../creators/schemas/creator.schema';

export type ProductionTeamProfileDocument = ProductionTeamProfile & Document;

@Schema({ _id: true, timestamps: false })
export class ProductionClient {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  logoUrl?: string;

  @Prop({ trim: true })
  projectTitle?: string;
}

export const ProductionClientSchema = SchemaFactory.createForClass(ProductionClient);

@Schema({ timestamps: true, collection: 'productionTeamProfiles' })
export class ProductionTeamProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  studioName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ trim: true })
  tagline?: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, default: 5 })
  teamSize: number;

  @Prop({ type: Number })
  foundedYear?: number;

  @Prop({ type: [String], default: [] })
  equipmentRoster: string[];

  @Prop({ type: [String], default: [], index: true })
  specialties: string[];

  @Prop({ type: [ServiceOfferSchema], default: [] })
  services: ServiceOffer[];

  @Prop({
    type: {
      city: { type: String, required: true, index: true },
      state: { type: String },
      country: { type: String, required: true, default: 'India' },
    },
    required: true,
  })
  location: {
    city: string;
    state?: string;
    country: string;
  };

  @Prop({ type: [String], default: [] })
  serviceAreas: string[];

  @Prop({ required: true, default: 25000 })
  startingDayRate: number;

  @Prop({ type: String, enum: PricingModel, default: PricingModel.PER_DAY })
  pricingModel: PricingModel;

  @Prop({ required: true, default: 'INR' })
  currency: string;

  @Prop({ type: [PortfolioItemSchema], default: [] })
  portfolio: PortfolioItem[];

  @Prop({ type: [ProductionClientSchema], default: [] })
  previousClients: ProductionClient[];

  @Prop({ type: String, enum: AvailabilityStatus, default: AvailabilityStatus.AVAILABLE_NOW })
  availability: AvailabilityStatus;

  @Prop({ type: String, enum: VerificationStatus, default: VerificationStatus.UNVERIFIED, index: true })
  verificationStatus: VerificationStatus;

  @Prop({ type: String, enum: ProfileVisibility, default: ProfileVisibility.PUBLISHED, index: true })
  visibilityStatus: ProfileVisibility;

  @Prop({ trim: true })
  logoUrl?: string;

  @Prop({ trim: true })
  coverImageUrl?: string;
}

export const ProductionTeamProfileSchema = SchemaFactory.createForClass(ProductionTeamProfile);

ProductionTeamProfileSchema.index({ specialties: 1, 'location.city': 1 });
ProductionTeamProfileSchema.index({ visibilityStatus: 1, slug: 1 });
