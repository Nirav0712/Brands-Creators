import { PaymentProviderType } from '@brands-creators/types';

export interface CreateOrderParams {
  amount: number; // in standard currency unit (e.g. 85000 INR)
  currency: string;
  receipt: string; // e.g. paymentNumber
  notes?: Record<string, string>;
}

export interface ProviderOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  provider: PaymentProviderType;
  rawResponse?: any;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface RefundParams {
  paymentId: string;
  amount?: number;
  notes?: Record<string, string>;
  reason?: string;
}

export interface ProviderRefundResult {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  rawResponse?: any;
}

export interface IPaymentProvider {
  readonly providerType: PaymentProviderType;
  createOrder(params: CreateOrderParams): Promise<ProviderOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<boolean>;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean;
  processRefund(params: RefundParams): Promise<ProviderRefundResult>;
}
