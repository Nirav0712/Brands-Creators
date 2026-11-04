import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VerificationStatus, ProfileVisibility, BrandTeamRole } from '@brands-creators/types';

export type BrandProfileDocument = BrandProfile & Document;

@Schema({ _id: true, timestamps: false })
export class BrandTeamMember {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ type: String, enum: BrandTeamRole, default: BrandTeamRole.COLLABORATOR })
  role: BrandTeamRole;

  @Prop({ type: String, enum: ['INVITED', 'ACTIVE', 'REVOKED'], default: 'INVITED' })
  status: string;

  @Prop({ default: Date.now })
  invitedAt: Date;

  @Prop()
  joinedAt?: Date;

  @Prop({ index: true })
  inviteToken?: string;

  @Prop()
  inviteExpiresAt?: Date;
}

export const BrandTeamMemberSchema = SchemaFactory.createForClass(BrandTeamMember);

@Schema({ _id: true, timestamps: false })
export class BrandCampaign {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Number })
  year?: number;

  @Prop({ type: [String], default: [] })
  deliverables?: string[];

  @Prop({ trim: true })
  mediaUrl?: string;

  @Prop({ trim: true })
  budgetRange?: string;
}

export const BrandCampaignSchema = SchemaFactory.createForClass(BrandCampaign);

@Schema({ timestamps: true, collection: 'brandProfiles' })
export class BrandProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  companyName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ trim: true })
  tagline?: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, trim: true, index: true })
  industry: string;

  @Prop({ trim: true, default: '1-10 employees' })
  companySize?: string;

  @Prop({ type: Number })
  foundedYear?: number;

  @Prop({ trim: true })
  logoUrl?: string;

  @Prop({ trim: true })
  coverImageUrl?: string;

  @Prop({ trim: true })
  websiteUrl?: string;

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
  serviceAreas?: string[];

  @Prop({ trim: true })
  contactEmail?: string;

  @Prop({ trim: true })
  contactPhone?: string;

  @Prop({ type: String, enum: VerificationStatus, default: VerificationStatus.UNVERIFIED, index: true })
  verificationStatus: VerificationStatus;

  @Prop({ type: String, enum: ProfileVisibility, default: ProfileVisibility.PUBLISHED, index: true })
  visibilityStatus: ProfileVisibility;

  @Prop({ default: 1 })
  teamSize?: number;

  @Prop({ default: 0 })
  activeRequirementsCount?: number;

  @Prop({ type: [BrandCampaignSchema], default: [] })
  previousCampaigns?: BrandCampaign[];

  @Prop({ type: [BrandTeamMemberSchema], default: [] })
  teamMembers?: BrandTeamMember[];
}

export const BrandProfileSchema = SchemaFactory.createForClass(BrandProfile);

BrandProfileSchema.index({ industry: 1, 'location.city': 1 });
BrandProfileSchema.index({ visibilityStatus: 1, slug: 1 });

