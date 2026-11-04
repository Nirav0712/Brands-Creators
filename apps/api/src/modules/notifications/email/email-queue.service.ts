import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailDeliveryJob, EmailDeliveryJobDocument } from '../schemas/email-delivery.schema';
import { EmailDeliveryStatus } from '@brands-creators/types';
import { SmtpEmailProvider } from './providers/smtp.provider';

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private isProcessing = false;
  private workerInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(EmailDeliveryJob.name)
    private readonly emailJobModel: Model<EmailDeliveryJobDocument>,
    private readonly emailProvider: SmtpEmailProvider,
  ) {}

  onModuleInit() {
    this.logger.log('EmailQueueService initialized. Starting background queue runner...');

    // Sweep pending/stale jobs on startup
    setImmediate(() => {
      this.processNextBatch().catch((err) =>
        this.logger.warn(`Initial queue sweep error: ${err.message}`),
      );
    });

    // Run resilient periodic tick every 30 seconds
    this.workerInterval = setInterval(() => {
      this.processNextBatch().catch((err) =>
        this.logger.warn(`Periodic email queue tick error: ${err.message}`),
      );
    }, 30000);

    // Unref so the interval does not block application teardown
    if (this.workerInterval.unref) {
      this.workerInterval.unref();
    }
  }

  onModuleDestroy() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
    this.logger.log('EmailQueueService worker interval stopped.');
  }

  /**
   * Enqueue durable email delivery job
   */
  async enqueueJob(data: {
    notificationId?: Types.ObjectId;
    recipientId: Types.ObjectId;
    recipientEmail: string;
    recipientName?: string;
    template: string;
    subject: string;
    html: string;
    text: string;
    metadata?: Record<string, any>;
    nextAttemptAt?: Date;
  }): Promise<EmailDeliveryJobDocument> {
    const job = new this.emailJobModel({
      ...data,
      status: EmailDeliveryStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
      nextAttemptAt: data.nextAttemptAt || new Date(),
    });

    const saved = await job.save();

    // Trigger immediate background processing
    setImmediate(() => {
      this.processNextBatch().catch((err) =>
        this.logger.error(`Error in immediate background email queue execution: ${err.message}`),
      );
    });

    return saved;
  }

  /**
   * Atomically claim and process pending jobs in queue
   * Concurrency Safe: Uses findOneAndUpdate to prevent race conditions across multi-worker clusters
   */
  async processNextBatch(batchSize = 10): Promise<{ processed: number; success: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, success: 0, failed: 0 };
    }

    this.isProcessing = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      const now = new Date();
      const staleTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes stale threshold

      for (let i = 0; i < batchSize; i++) {
        // Atomic job claim: claim either PENDING job ready for attempt or PROCESSING job that crashed/stalled
        const job = await this.emailJobModel.findOneAndUpdate(
          {
            $or: [
              { status: EmailDeliveryStatus.PENDING, nextAttemptAt: { $lte: now } },
              { status: EmailDeliveryStatus.PROCESSING, updatedAt: { $lt: staleTime } },
            ],
          },
          {
            $set: {
              status: EmailDeliveryStatus.PROCESSING,
              updatedAt: now,
            },
            $inc: { attempts: 1 },
          },
          { sort: { createdAt: 1 }, new: true },
        );

        if (!job) {
          break; // No more eligible jobs to claim in this batch
        }

        const result = await this.emailProvider.send({
          to: job.recipientEmail,
          recipientName: job.recipientName,
          subject: job.subject,
          html: job.html,
          text: job.text,
          metadata: job.metadata,
        });

        if (result.success) {
          job.status = EmailDeliveryStatus.SENT;
          job.providerMessageId = result.messageId;
          job.completedAt = new Date();
          job.error = undefined;
          job.isSimulated = !!result.simulated;
          if (result.simulated) {
            job.metadata = { ...(job.metadata || {}), simulated: true };
          }
          await job.save();
          successCount++;
        } else {
          failedCount++;
          job.error = result.error || 'Failed to dispatch email';

          // Classify failure: terminal if retry limit reached OR permanent rejection
          if (job.attempts >= job.maxAttempts || result.isRetryable === false) {
            job.status = EmailDeliveryStatus.DEAD_LETTER;
            this.logger.warn(
              `Email job ${job._id} transitioned to DEAD_LETTER (Attempts: ${job.attempts}/${job.maxAttempts}, Retryable: ${result.isRetryable})`,
            );
          } else {
            job.status = EmailDeliveryStatus.FAILED;

            // Bounded Exponential Backoff with Jitter: 30s * 2^(attempts-1) + [0..15s] jitter, capped at 1hr
            const baseSeconds = Math.min(3600, 30 * Math.pow(2, Math.max(0, job.attempts - 1)));
            const jitterSeconds = Math.floor(Math.random() * 15);
            const backoffMs = (baseSeconds + jitterSeconds) * 1000;

            job.nextAttemptAt = new Date(Date.now() + backoffMs);
            this.logger.log(
              `Email job ${job._id} failed transiently. Next retry scheduled in ${Math.round(backoffMs / 1000)}s (Attempt ${job.attempts}/${job.maxAttempts})`,
            );
          }
          await job.save();
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed: successCount + failedCount, success: successCount, failed: failedCount };
  }

  /**
   * Admin: List delivery jobs with filters
   */
  async adminGetDeliveries(query: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const filter: any = {};
    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    if (query.search) {
      filter.$or = [
        { recipientEmail: new RegExp(query.search, 'i') },
        { subject: new RegExp(query.search, 'i') },
        { template: new RegExp(query.search, 'i') },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.emailJobModel
        .find(filter)
        .populate('recipientId', 'fullName email username avatarUrl role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.emailJobModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Get single delivery job details
   */
  async adminGetDeliveryById(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery job ID format');
    }
    const job = await this.emailJobModel
      .findById(id)
      .populate('recipientId', 'fullName email username avatarUrl role')
      .populate('notificationId')
      .lean();

    if (!job) {
      throw new NotFoundException('Delivery job not found');
    }
    return job;
  }

  /**
   * Admin: Re-queue failed or dead-letter job
   */
  async adminRetryDelivery(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery job ID format');
    }
    const job = await this.emailJobModel.findById(id);
    if (!job) {
      throw new NotFoundException('Delivery job not found');
    }

    job.status = EmailDeliveryStatus.PENDING;
    job.nextAttemptAt = new Date();
    job.error = undefined;
    await job.save();

    setImmediate(() => {
      this.processNextBatch().catch(() => {});
    });

    return { success: true, message: 'Job re-queued successfully', jobId: job._id };
  }

  /**
   * Admin / Cron: Explicitly trigger queue processing batch
   */
  async adminProcessQueue(batchSize = 20): Promise<{ processed: number; success: number; failed: number }> {
    return this.processNextBatch(batchSize);
  }

  /**
   * Admin: Get delivery health metrics
   */
  async adminGetMetrics(): Promise<{
    total: number;
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    deadLetter: number;
    providerConfigured: boolean;
  }> {
    const [total, pending, processing, sent, failed, deadLetter] = await Promise.all([
      this.emailJobModel.countDocuments(),
      this.emailJobModel.countDocuments({ status: EmailDeliveryStatus.PENDING }),
      this.emailJobModel.countDocuments({ status: EmailDeliveryStatus.PROCESSING }),
      this.emailJobModel.countDocuments({ status: EmailDeliveryStatus.SENT }),
      this.emailJobModel.countDocuments({ status: EmailDeliveryStatus.FAILED }),
      this.emailJobModel.countDocuments({ status: EmailDeliveryStatus.DEAD_LETTER }),
    ]);

    return {
      total,
      pending,
      processing,
      sent,
      failed,
      deadLetter,
      providerConfigured: this.emailProvider.isConfigured(),
    };
  }

  /**
   * Admin: Send test email to destination
   */
  async adminSendTestEmail(to: string, subject?: string, message?: string): Promise<any> {
    const testSubject = subject || 'Brands & Creators — Operational Verification Test';
    const testMessage =
      message || 'This is a verified test email sent from the Brands & Creators Administration Portal.';

    return this.emailProvider.send({
      to,
      subject: testSubject,
      html: `<h2>Email Delivery Test</h2><p>${testMessage}</p>`,
      text: `Email Delivery Test: ${testMessage}`,
    });
  }
}
