/**
 * Standard Payment Gateway Adapter Interface
 *
 * Implements a pluggable abstraction layer so future gateways (Razorpay, Cashfree, PhonePe, Stripe)
 * can be integrated cleanly without touching core order/token business logic.
 */

export interface InitiatePaymentParams {
  orderId: string;
  amount: number;
  currency: string;
  customer: {
    userId: string;
    email: string;
    name: string;
    phone?: string;
  };
  notes?: Record<string, string>;
  callbackUrl?: string;
}

export interface InitiatePaymentResult {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  clientSecret?: string;
  checkoutUrl?: string;
  gatewayParameters?: Record<string, any>;
}

export interface PaymentVerificationParams {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature?: string;
  rawPayload?: any;
}

export interface PaymentVerificationResult {
  isVerified: boolean;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  gatewayTransactionId: string;
  amountReceived: number;
  currency: string;
  paymentMethod?: string;
  errorMessage?: string;
}

export interface PaymentGatewayAdapter {
  getGatewayName(): string;
  initiateOrder(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult>;
  processWebhook?(rawBody: any, headers: Record<string, any>): Promise<PaymentVerificationResult>;
}

