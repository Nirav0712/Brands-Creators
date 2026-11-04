import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuditAction } from '@brands-creators/types';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'auditLogs' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  adminUserId: Types.ObjectId;

  @Prop({ required: true })
  adminName: string;

  @Prop({ type: String, enum: AuditAction, required: true, index: true })
  action: AuditAction;

  @Prop({ required: true, index: true })
  targetEntity: string;

  @Prop({ required: true, index: true })
  targetId: string;

  @Prop({ required: true })
  details: string;

  @Prop()
  ipAddress?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ createdAt: -1, adminUserId: 1 });
