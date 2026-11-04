import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TokenLedgerType, TokenLedgerDirection } from '@brands-creators/types';

export type TokenLedgerEntryDocument = TokenLedgerEntry & Document;

@Schema({ timestamps: true, collection: 'tokenLedgerEntries' })
export class TokenLedgerEntry {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TokenWallet', required: true, index: true })
  walletId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number, required: true })
  balanceAfter: number;

  @Prop({ type: String, enum: TokenLedgerType, required: true, index: true })
  type: TokenLedgerType;

  @Prop({ type: String, enum: TokenLedgerDirection, required: true, index: true })
  direction: TokenLedgerDirection;

  @Prop({ type: String, trim: true })
  sourceRefId?: string;

  @Prop({ type: String, trim: true })
  performedBy?: string; // e.g. admin userId or 'SYSTEM'

  @Prop({ type: String, required: true, trim: true })
  reason: string;

  @Prop({ type: String, trim: true, index: true })
  idempotencyKey?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const TokenLedgerEntrySchema = SchemaFactory.createForClass(TokenLedgerEntry);

TokenLedgerEntrySchema.index({ userId: 1, createdAt: -1 });
TokenLedgerEntrySchema.index({ walletId: 1, createdAt: -1 });
TokenLedgerEntrySchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

