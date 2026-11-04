import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationPreferenceDocument = NotificationPreference & Document;

@Schema({ _id: false })
export class ChannelCategoryPreferences {
  @Prop({ type: Boolean, default: true })
  applications: boolean;

  @Prop({ type: Boolean, default: true })
  projects: boolean;

  @Prop({ type: Boolean, default: true })
  messages: boolean;

  @Prop({ type: Boolean, default: true })
  payments: boolean;

  @Prop({ type: Boolean, default: true })
  reviews: boolean;

  @Prop({ type: Boolean, default: false })
  marketing: boolean;
}

export const ChannelCategoryPreferencesSchema = SchemaFactory.createForClass(ChannelCategoryPreferences);

@Schema({ timestamps: true, collection: 'notification_preferences' })
export class NotificationPreference {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: ChannelCategoryPreferencesSchema, default: () => ({}) })
  inApp: ChannelCategoryPreferences;

  @Prop({ type: ChannelCategoryPreferencesSchema, default: () => ({}) })
  email: ChannelCategoryPreferences;

  @Prop({ type: String, enum: ['INSTANT', 'DAILY', 'WEEKLY', 'NONE'], default: 'INSTANT' })
  digestFrequency: string;

  @Prop({ type: Boolean, default: false })
  quietHoursEnabled: boolean;

  @Prop({ type: String, default: '22:00' })
  quietHoursStart: string;

  @Prop({ type: String, default: '08:00' })
  quietHoursEnd: string;

  @Prop({ type: String, default: 'Asia/Kolkata' })
  timezone: string;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);
