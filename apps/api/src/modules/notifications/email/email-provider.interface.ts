export interface SendEmailParams {
  to: string;
  recipientName?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  metadata?: Record<string, any>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isRetryable?: boolean;
  simulated?: boolean;
  errorClassification?: string;
}

export interface IEmailProvider {
  send(params: SendEmailParams): Promise<SendEmailResult>;
  verifyConnection(): Promise<boolean>;
  isConfigured(): boolean;
}
