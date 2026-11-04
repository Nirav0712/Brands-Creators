import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole, UserStatus } from '@brands-creators/types';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  username: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({
    type: [String],
    enum: UserRole,
    default: [UserRole.CREATOR],
    index: true,
  })
  roles: UserRole[];

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    index: true,
  })
  status: UserStatus;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ select: false })
  emailVerificationTokenHash?: string;

  @Prop()
  emailVerificationExpiresAt?: Date;

  @Prop({ default: false })
  onboardingCompleted: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  selectedCategoryIds?: Types.ObjectId[];

  @Prop({ trim: true })
  avatarUrl?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ type: Types.ObjectId, ref: 'CreatorProfile' })
  creatorProfileId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BrandProfile' })
  brandProfileId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ProductionTeamProfile' })
  productionTeamProfileId?: Types.ObjectId;

  @Prop({ select: false })
  refreshTokenHash?: string;

  @Prop({ select: false })
  passwordResetTokenHash?: string;

  @Prop()
  passwordResetExpiresAt?: Date;

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1, status: 1 });
UserSchema.index({ username: 1, status: 1 });
