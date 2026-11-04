import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlatformSettingDocument = PlatformSetting & Document;

@Schema({ timestamps: true, collection: 'platformSettings' })
export class PlatformSetting {
  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ type: Object, required: true })
  value: any;

  @Prop()
  description?: string;

  @Prop({ default: 'SYSTEM' })
  updatedBy: string;
}

export const PlatformSettingSchema = SchemaFactory.createForClass(PlatformSetting);
