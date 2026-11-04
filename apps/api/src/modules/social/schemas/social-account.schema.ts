import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SocialPlatform, VerificationStatus } from '@brands-creators/types';

export type SocialAccountDocument = SocialAccount & Document;

@Schema({ timestamps: true, collection: 'socialAccounts' })
export class SocialAccount {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: SocialPlatform, required: true, index: true })
  platform: SocialPlatform;

  @Prop({ required: true, trim: true })
  profileUrl: string;

  @Prop({ required: true, trim: true })
  handle: string;

  @Prop({ default: false })
  isConnected: boolean;

  @Prop({ type: String, enum: VerificationStatus, default: VerificationStatus.UNVERIFIED })
  verificationStatus: VerificationStatus;

  @Prop({
    type: {
      followers: { type: Number, default: 0 },
      subscribers: { type: Number, default: 0 },
      postsCount: { type: Number, default: 0 },
      following: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
    },
    default: {},
  })
  metrics: {
    followers?: number;
    subscribers?: number;
    postsCount?: number;
    following?: number;
    engagementRate?: number;
  };

  @Prop()
  lastSyncedAt?: Date;

  @Prop()
  verificationRequestedAt?: Date;

  @Prop()
  verifiedAt?: Date;

  @Prop({ trim: true })
  verificationNotes?: string;

  @Prop({ default: false })
  isSimulated?: boolean;

  @Prop()
  officialPlatformUserId?: string;

  @Prop()
  tokenExpiresAt?: Date;

  @Prop()
  rawVerificationDetails?: string;

  @Prop({ select: false })
  accessToken?: string;

  @Prop({ select: false })
  refreshToken?: string;
}

export const SocialAccountSchema = SchemaFactory.createForClass(SocialAccount);

SocialAccountSchema.index({ userId: 1, platform: 1 }, { unique: true });
