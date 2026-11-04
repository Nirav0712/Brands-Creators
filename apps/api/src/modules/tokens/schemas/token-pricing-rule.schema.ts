import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TokenActionCostKey } from '@brands-creators/types';

export type TokenPricingRuleDocument = TokenPricingRule & Document;

@Schema({ timestamps: true, collection: 'tokenPricingRules' })
export class TokenPricingRule {
  @Prop({ type: String, enum: TokenActionCostKey, required: true, unique: true, index: true })
  actionKey: TokenActionCostKey;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Number, required: true, min: 0 })
  costTokens: number;

  @Prop({ default: true })
  isEnabled: boolean;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true, default: 'SYSTEM' })
  updatedBy: string;
}

export const TokenPricingRuleSchema = SchemaFactory.createForClass(TokenPricingRule);

