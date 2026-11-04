import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TokenWalletDocument = TokenWallet & Document;

@Schema({ timestamps: true, collection: 'tokenWallets' })
export class TokenWallet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, default: 0, min: 0 })
  balance: number;

  @Prop({ type: Number, default: 0 })
  totalReceived: number;

  @Prop({ type: Number, default: 0 })
  totalSpent: number;

  @Prop({ type: Number, default: 10 }) // Default reference rate: 1 token = ₹10 INR
  currencyReferenceRate: number;

  @Prop()
  lastTransactionAt?: Date;
}

export const TokenWalletSchema = SchemaFactory.createForClass(TokenWallet);

TokenWalletSchema.index({ userId: 1 });

