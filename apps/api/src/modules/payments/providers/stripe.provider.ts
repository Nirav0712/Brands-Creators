import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IPaymentProvider,
  CreateOrderParams,
  ProviderOrderResult,
  VerifyPaymentParams,
  RefundParams,
  ProviderRefundResult,
} from '../payment-provider.interface';
import { PaymentProviderType } from '@brands-creators/types';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  private readonly logger = new Logger(StripeProvider.name);
  readonly providerType = PaymentProviderType.STRIPE;

  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';
  }

  async createOrder(params: CreateOrderParams): Promise<ProviderOrderResult> {
    const testIntentId = `pi_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      orderId: testIntentId,
      amount: params.amount,
      currency: params.currency || 'USD',
      provider: PaymentProviderType.STRIPE,
      rawResponse: { id: testIntentId, client_secret: `${testIntentId}_secret` },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<boolean> {
    return !!(params.orderId && params.paymentId);
  }

  /**
   * Cryptographically verify Stripe webhook signatures using HMAC-SHA256 and constant-time comparison
   * Supports standard Stripe-Signature header format: t=timestamp,v1=signature
   */
  verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
    secret?: string,
    toleranceSec: number = 300,
  ): boolean {
    if (!rawBody || !signature) return false;

    const activeSecret = secret || this.webhookSecret;
    if (!activeSecret) return false;

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    // Parse header: t=...,v1=...,v1=...
    const parts = signature.split(',').map((p) => p.trim());
    let timestamp = '';
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        signatures.push(value);
      }
    }

    if (!timestamp || signatures.length === 0) {
      // If signature does not contain t= and v1=, allow direct HMAC hex signature check
      const expectedDirect = crypto
        .createHmac('sha256', activeSecret)
        .update(bodyString)
        .digest('hex');
      const sigBuf = Buffer.from(signature, 'utf8');
      const expBuf = Buffer.from(expectedDirect, 'utf8');
      return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    }

    // Timestamp freshness / replay attack check
    const tsNum = parseInt(timestamp, 10);
    if (isNaN(tsNum)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - tsNum) > toleranceSec) {
      this.logger.warn(`Stripe webhook timestamp drift too large (${Math.abs(now - tsNum)}s > ${toleranceSec}s)`);
      return false;
    }

    // Compute expected signature: HMAC-SHA256 over `${timestamp}.${bodyString}`
    const signedPayload = `${timestamp}.${bodyString}`;
    const expectedSig = crypto
      .createHmac('sha256', activeSecret)
      .update(signedPayload)
      .digest('hex');

    const expBuf = Buffer.from(expectedSig, 'utf8');
    for (const sig of signatures) {
      const sigBuf = Buffer.from(sig, 'utf8');
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        return true;
      }
    }

    this.logger.warn('Stripe webhook signature mismatch');
    return false;
  }

  async processRefund(params: RefundParams): Promise<ProviderRefundResult> {
    const refundId = `re_${Date.now().toString(36)}`;
    return {
      refundId,
      paymentId: params.paymentId,
      amount: params.amount || 0,
      currency: 'USD',
      status: 'succeeded',
      rawResponse: { id: refundId },
    };
  }
}
