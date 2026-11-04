import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IPaymentSettings } from '@brands-creators/types';

export type PaymentSettingsDocument = PaymentSettings & Document;

@Schema({ timestamps: true, collection: 'paymentSettings' })
export class PaymentSettings implements Omit<IPaymentSettings, '_id'> {
  @Prop({ type: Boolean, default: true })
  upiEnabled: boolean;

  @Prop({ type: String, default: 'pay.brandscreators@icici' })
  upiId: string;

  @Prop({ type: String, default: 'Brands & Creators Marketplace Media Pvt Ltd' })
  upiDisplayName: string;

  @Prop({ type: String, default: '/images/payment-qr-demo.png' })
  qrCodeUrl?: string;

  @Prop({ type: Boolean, default: true })
  bankTransferEnabled: boolean;

  @Prop({ type: String, default: 'Brands & Creators Marketplace Media Pvt Ltd' })
  bankAccountHolder: string;

  @Prop({ type: String, default: 'HDFC Bank' })
  bankName: string;

  @Prop({ type: String, default: '50200098765432' })
  accountNumber: string;

  @Prop({ type: String, default: 'HDFC0001234' })
  ifscCode: string;

  @Prop({ type: String, default: 'Indiranagar Main Branch, Bengaluru' })
  branchName?: string;

  @Prop({
    type: String,
    default:
      'Please mention your registered email or account ID as reference when completing your payment. Submissions are typically verified by administration within 1-2 hours during business hours.',
  })
  paymentInstructions: string;

  @Prop({
    type: String,
    default:
      'Each submission requires a valid UTR or UPI Transaction Reference Number. Duplicate references will automatically be flagged for fraud prevention.',
  })
  verificationPolicy: string;

  @Prop({ type: String })
  updatedBy?: string;
}

export const PaymentSettingsSchema = SchemaFactory.createForClass(PaymentSettings);
