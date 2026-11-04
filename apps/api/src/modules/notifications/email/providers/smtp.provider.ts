import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailProvider, SendEmailParams, SendEmailResult } from '../email-provider.interface';

@Injectable()
export class SmtpEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;
  private readonly replyToAddress: string;
  private readonly configured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT')) || 587;
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM') ||
      'Brands & Creators <notifications@brandsandcreators.com>';
    this.replyToAddress =
      this.configService.get<string>('EMAIL_REPLY_TO') ||
      'support@brandsandcreators.com';

    if (host && user && pass) {
      this.configured = true;
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.logger.log(`SMTP Email Provider configured with host: ${host}:${port}`);
    } else {
      this.configured = false;
      this.logger.log('SMTP credentials not configured. Email provider operating in fallback sandbox mode.');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch (err: any) {
      const sanitized = this.redactSensitiveData(err.message || 'SMTP verification failed');
      this.logger.warn(`SMTP verification failed: ${sanitized}`);
      return false;
    }
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.configured || !this.transporter) {
      // Safe sandbox mock mode when no live SMTP credentials are provisioned
      const simulatedId = `sim_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      this.logger.log(`[Sandbox Simulation] Recipient: ${this.maskEmail(params.to)} | Subject: "${params.subject}" (MsgId: ${simulatedId})`);
      return {
        success: true,
        messageId: simulatedId,
        isRetryable: false,
        simulated: true,
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: params.recipientName ? `"${params.recipientName}" <${params.to}>` : params.to,
        replyTo: params.replyTo || this.replyToAddress,
        subject: params.subject,
        html: params.html,
        text: params.text || params.subject,
      });

      return {
        success: true,
        messageId: info.messageId,
        simulated: false,
      };
    } catch (err: any) {
      const classification = this.classifySmtpError(err);
      this.logger.warn(
        `SMTP send failure for ${this.maskEmail(params.to)}: ${classification.sanitizedError} [Class: ${classification.classification}, Retryable: ${classification.isRetryable}]`,
      );

      return {
        success: false,
        error: classification.sanitizedError,
        isRetryable: classification.isRetryable,
        errorClassification: classification.classification,
        simulated: false,
      };
    }
  }

  /**
   * Classify SMTP error according to RFC 5321 and transactional provider semantics
   */
  classifySmtpError(err: any): { isRetryable: boolean; classification: string; sanitizedError: string } {
    const code = (err.code || '').toUpperCase();
    const responseCode = Number(err.responseCode) || 0;
    const rawMessage = err.message || '';
    const messageLower = rawMessage.toLowerCase();
    const sanitizedError = this.redactSensitiveData(rawMessage);

    // 1. Authentication / Configuration Failure -> Permanent (Do not retry bad credentials)
    if (
      code === 'EAUTH' ||
      responseCode === 535 ||
      responseCode === 534 ||
      messageLower.includes('authentication') ||
      messageLower.includes('credentials')
    ) {
      return {
        isRetryable: false,
        classification: 'AUTHENTICATION_FAILURE',
        sanitizedError,
      };
    }

    // 2. Syntax / Parameter Error -> Permanent
    if (responseCode === 501 || responseCode === 502) {
      return {
        isRetryable: false,
        classification: 'SYNTAX_ERROR',
        sanitizedError,
      };
    }

    // 3. Permanent Recipient Rejection (No mailbox, invalid address) -> Permanent
    if (
      responseCode === 550 ||
      responseCode === 551 ||
      responseCode === 553 ||
      messageLower.includes('no such user') ||
      messageLower.includes('mailbox unavailable') ||
      messageLower.includes('user not found')
    ) {
      return {
        isRetryable: false,
        classification: 'RECIPIENT_NOT_FOUND',
        sanitizedError,
      };
    }

    // 4. Message Policy / Quota Exceeded -> Permanent for this payload
    if (responseCode === 552 || messageLower.includes('exceeded storage')) {
      return {
        isRetryable: false,
        classification: 'MESSAGE_SIZE_EXCEEDED',
        sanitizedError,
      };
    }

    // 5. Rate Limits & Throttling -> Transient / Retryable
    if (
      responseCode === 429 ||
      messageLower.includes('rate limit') ||
      messageLower.includes('too many requests') ||
      messageLower.includes('throttled') ||
      (responseCode === 452 && messageLower.includes('limit'))
    ) {
      return {
        isRetryable: true,
        classification: 'RATE_LIMIT_EXCEEDED',
        sanitizedError,
      };
    }

    // 6. Network & Connection Timeouts -> Transient / Retryable
    if (
      ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ESOCKET', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE'].includes(code)
    ) {
      return {
        isRetryable: true,
        classification: 'NETWORK_TIMEOUT',
        sanitizedError,
      };
    }

    // 7. Temporary SMTP 4xx Mailbox / Server States (RFC 5321) -> Transient / Retryable
    if (
      responseCode === 421 || // Service not available, closing transmission
      responseCode === 450 || // Mailbox temporarily unavailable / busy
      responseCode === 451 || // Local processing error
      responseCode === 452 || // Insufficient storage (temporary)
      responseCode === 454    // TLS temporarily unavailable
    ) {
      return {
        isRetryable: true,
        classification: 'TRANSIENT_SERVER_ERROR',
        sanitizedError,
      };
    }

    // 8. Provider-Specific Retryable 5xx Errors (Overload / Gateway timeout in SES/SendGrid)
    if (
      responseCode === 503 || // Bad sequence or temporary server overload
      responseCode === 504 || // Gateway / Command timeout
      responseCode === 521 || // Server not accepting connections temporarily
      (responseCode === 554 && messageLower.includes('try again'))
    ) {
      return {
        isRetryable: true,
        classification: 'RETRYABLE_GATEWAY_ERROR',
        sanitizedError,
      };
    }

    // 9. Permanent 5xx Rejections (554 Transaction failed, relay access denied, spam block)
    if (responseCode >= 500 && responseCode < 600) {
      return {
        isRetryable: false,
        classification: 'PERMANENT_TRANSACTION_REJECTION',
        sanitizedError,
      };
    }

    // 10. General 4xx fallback
    if (responseCode >= 400 && responseCode < 500) {
      return {
        isRetryable: true,
        classification: 'TRANSIENT_4XX',
        sanitizedError,
      };
    }

    return {
      isRetryable: false,
      classification: 'UNKNOWN_FAILURE',
      sanitizedError,
    };
  }

  /**
   * Redact passwords, credentials, tokens, and sensitive headers from error messages
   */
  private redactSensitiveData(str: string): string {
    if (!str) return '';
    return str
      .replace(/([pP]assword|[pP]ass|[sS]ecret|[tT]oken|[kK]ey|[aA]uth)[\s:=]+[^\s&,;]+/g, '$1=[REDACTED]')
      .replace(/Bearer\s+[A-Za-z0-9\-_.]+/g, 'Bearer [REDACTED]')
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (match) => this.maskEmail(match));
  }

  /**
   * Mask email for safe privacy logging (e.g. user@example.com -> us***@example.com)
   */
  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '[INVALID_EMAIL]';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local.substring(0, 2)}***@${domain}`;
  }
}
