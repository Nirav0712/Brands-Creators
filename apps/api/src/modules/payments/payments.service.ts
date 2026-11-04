import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { PaymentWebhook, PaymentWebhookDocument } from './schemas/payment-webhook.schema';
import { Payout, PayoutDocument } from './schemas/payout.schema';
import { PaymentSettings, PaymentSettingsDocument } from './schemas/payment-settings.schema';
import { ManualPaymentRequest, ManualPaymentRequestDocument } from './schemas/manual-payment-request.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { TransactionsService } from './transactions.service';
import { PayoutsService } from './payouts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { ProjectsService } from '../projects/projects.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TokensService } from '../tokens/tokens.service';
import { TOKEN_PACKAGES } from './token-packages.constant';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { CreateManualPaymentDto } from './dto/create-manual-payment.dto';
import { ReviewManualPaymentDto } from './dto/review-manual-payment.dto';
import {
  PaymentProviderType,
  PaymentStatus,
  PaymentType,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  ProjectStatus,
  ProjectRole,
  ProjectActivityType,
  NotificationType,
  UserRole,
  ManualPaymentMethod,
  ManualPaymentStatus,
  ManualPaymentTargetType,
  TokenLedgerType,
} from '@brands-creators/types';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(PaymentWebhook.name)
    private readonly webhookModel: Model<PaymentWebhookDocument>,
    @InjectModel(Payout.name)
    private readonly payoutModel: Model<PayoutDocument>,
    @InjectModel(PaymentSettings.name)
    private readonly paymentSettingsModel: Model<PaymentSettingsDocument>,
    @InjectModel(ManualPaymentRequest.name)
    private readonly manualPaymentModel: Model<ManualPaymentRequestDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly stripeProvider: StripeProvider,
    private readonly transactionsService: TransactionsService,
    private readonly payoutsService: PayoutsService,
    private readonly notificationsService: NotificationsService,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly projectsService: ProjectsService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptionsService: SubscriptionsService,
    @Inject(forwardRef(() => TokensService))
    private readonly tokensService: TokensService,
  ) {}

  /**
   * Helper to get configured platform commission percentage (default 5%)
   */
  private async getPlatformCommissionPercentage(): Promise<number> {
    try {
      const setting = await this.platformSettingsService.getSetting('PLATFORM_COMMISSION_PERCENTAGE');
      if (setting && typeof setting.value === 'number' && !isNaN(setting.value)) {
        return Math.min(100, Math.max(0, setting.value));
      }
    } catch {
      // Fallback default
    }
    return 5;
  }

  /**
   * Create server-authoritative payment order for a project
   */
  async createProjectOrder(
    projectId: string,
    dto: CreatePaymentOrderDto,
    requestingUser: any,
  ): Promise<any> {
    const reqUserId = (requestingUser.userId || requestingUser._id?.toString() || requestingUser.id).toString();
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    const project = await this.projectsService.verifyProjectAccess(projectId, reqUserId, requestingUser.roles?.[0]);

    const isBrand =
      project.brandId.toString() === reqUserId ||
      project.participants?.some((p) => p.userId.toString() === reqUserId && (p.role === ProjectRole.OWNER || p.role === ProjectRole.CLIENT));

    if (!isBrand && !isAdmin) {
      throw new ForbiddenException('Only the Brand client or an Admin can initiate payment for this project');
    }

    if (project.status === ProjectStatus.CANCELLED) {
      throw new BadRequestException('Cannot initiate payment for a cancelled project');
    }

    // Check if project is already fully paid or settled
    const existingPaid = await this.paymentModel.findOne({
      projectId: project._id,
      status: { $in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] },
    });
    if (existingPaid) {
      throw new ConflictException('This project is already paid or settled');
    }

    // Check for existing pending order (Idempotency)
    const existingPending = await this.paymentModel.findOne({
      projectId: project._id,
      status: { $in: [PaymentStatus.PENDING, PaymentStatus.ORDER_CREATED] },
    });

    // Derive financial amounts strictly server-side from project approvedBudget
    const baseAmount = Number(project.approvedBudget) || 0;
    if (baseAmount <= 0) {
      throw new BadRequestException('Project has no payable approved budget');
    }

    const platformFeePercentage = await this.getPlatformCommissionPercentage();
    // Money safety: integer math in paise (minor units)
    const platformFee = Math.round(baseAmount * (platformFeePercentage / 100) * 100) / 100;
    const taxPercentage = 0;
    const taxAmount = 0;
    const totalAmount = baseAmount;
    const professionalAmount = Math.round((totalAmount - platformFee - taxAmount) * 100) / 100;
    const currency = project.currency || 'INR';

    const providerType = dto?.provider || PaymentProviderType.RAZORPAY;
    const provider = providerType === PaymentProviderType.STRIPE ? this.stripeProvider : this.razorpayProvider;

    // If an active order exists, reuse it if amount matches
    if (existingPending && existingPending.totalAmount === totalAmount) {
      return {
        paymentId: existingPending._id,
        paymentNumber: existingPending.paymentNumber,
        provider: existingPending.provider,
        providerOrderId: existingPending.providerOrderId,
        amount: existingPending.totalAmount,
        currency: existingPending.currency,
        keyId: this.razorpayProvider.getKeyId(),
        projectTitle: project.title,
        professionalAmount: existingPending.professionalAmount,
        platformFee: existingPending.platformFee,
      };
    }

    // Generate Unique Payment Number
    const year = new Date().getFullYear();
    const latestPayment = await this.paymentModel
      .findOne({ paymentNumber: new RegExp(`^PAY-${year}-`) })
      .sort({ paymentNumber: -1 })
      .lean();

    let seq = 1;
    if (latestPayment && latestPayment.paymentNumber) {
      const match = latestPayment.paymentNumber.match(/^PAY-\d{4}-(\d+)/);
      if (match && match[1]) {
        seq = parseInt(match[1], 10) + 1;
      }
    } else {
      const count = await this.paymentModel.countDocuments();
      seq = count + 1;
    }

    let paymentNumber = `PAY-${year}-${String(seq).padStart(6, '0')}`;
    while (await this.paymentModel.exists({ paymentNumber })) {
      seq++;
      paymentNumber = `PAY-${year}-${String(seq).padStart(6, '0')}`;
    }

    // Create Order with Gateway Provider
    const orderResult = await provider.createOrder({
      amount: totalAmount,
      currency,
      receipt: paymentNumber,
      notes: {
        projectId: project._id.toString(),
        projectNumber: project.projectNumber,
        brandId: project.brandId.toString(),
        professionalId: project.professionalId.toString(),
      },
    });

    const payment = new this.paymentModel({
      paymentNumber,
      projectId: project._id,
      applicationId: project.applicationId,
      requirementId: project.requirementId,
      milestoneId: dto?.milestoneId ? new Types.ObjectId(dto.milestoneId) : undefined,
      brandId: project.brandId,
      professionalId: project.professionalId,
      amount: baseAmount,
      currency,
      platformFeePercentage,
      platformFee,
      taxPercentage,
      taxAmount,
      totalAmount,
      professionalAmount,
      provider: providerType,
      providerOrderId: orderResult.orderId,
      status: PaymentStatus.ORDER_CREATED,
      paymentType: PaymentType.PROJECT_PAYMENT,
      createdBy: new Types.ObjectId(reqUserId),
      metadata: {
        idempotencyKey: dto?.idempotencyKey,
        projectTitle: project.title,
        projectNumber: project.projectNumber,
      },
    });

    const savedPayment = await payment.save();

    // Log Project Activity
    await this.projectsService.logActivity(
      project._id as Types.ObjectId,
      new Types.ObjectId(reqUserId),
      ProjectActivityType.PROJECT_STATUS_CHANGED,
      `Payment order created: ${paymentNumber} for amount ${currency} ${totalAmount.toLocaleString()}`,
      { paymentId: savedPayment._id, paymentNumber, totalAmount },
    );

    // Notify Brand
    await this.notificationsService.create({
      userId: project.brandId,
      type: NotificationType.PAYMENT_ORDER_CREATED,
      title: 'Payment Order Created',
      message: `Payment order ${paymentNumber} generated for "${project.title}".`,
      link: `/projects/${project._id}`,
      metadata: { projectId: project._id, paymentId: savedPayment._id },
    });

    return {
      paymentId: savedPayment._id,
      paymentNumber: savedPayment.paymentNumber,
      provider: savedPayment.provider,
      providerOrderId: orderResult.orderId,
      amount: savedPayment.totalAmount,
      currency: savedPayment.currency,
      keyId: this.razorpayProvider.getKeyId(),
      projectTitle: project.title,
      professionalAmount: savedPayment.professionalAmount,
      platformFee: savedPayment.platformFee,
    };
  }

  /**
   * Verify Razorpay Payment Signature and Settle Payment State Server-Side
   */
  async verifyRazorpayPayment(dto: VerifyPaymentDto, requestingUser: any): Promise<any> {
    const payment = await this.paymentModel.findOne({
      $or: [
        { _id: Types.ObjectId.isValid(dto.paymentId) ? new Types.ObjectId(dto.paymentId) : null },
        { paymentNumber: dto.paymentId },
        { providerOrderId: dto.razorpay_order_id },
      ].filter(Boolean),
    });

    if (!payment) {
      throw new NotFoundException('Payment order not found');
    }

    const reqUserId = (requestingUser.userId || requestingUser._id?.toString() || requestingUser.id).toString();
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);
    const isBrand = payment.brandId.toString() === reqUserId;
    if (!isBrand && !isAdmin) {
      throw new ForbiddenException('Only the paying Brand or an Admin can verify this payment');
    }

    if (payment.providerOrderId && dto.razorpay_order_id && payment.providerOrderId !== dto.razorpay_order_id) {
      throw new BadRequestException('Razorpay order ID does not match server payment record');
    }

    // Idempotency: If already paid, return existing success state
    if (payment.status === PaymentStatus.PAID) {
      return {
        success: true,
        message: 'Payment already verified and confirmed',
        paymentNumber: payment.paymentNumber,
        status: payment.status,
        paidAt: payment.paidAt,
      };
    }

    // Server-Side Signature Verification
    const isValid = await this.razorpayProvider.verifyPayment({
      orderId: dto.razorpay_order_id,
      paymentId: dto.razorpay_payment_id,
      signature: dto.razorpay_signature,
    });

    if (!isValid) {
      payment.status = PaymentStatus.FAILED;
      payment.failedAt = new Date();
      payment.failureReason = 'Invalid payment signature from gateway';
      await payment.save();

      throw new BadRequestException('Payment signature verification failed');
    }

    // Update Payment State to PAID
    payment.status = PaymentStatus.PAID;
    payment.providerPaymentId = dto.razorpay_payment_id;
    payment.providerSignature = dto.razorpay_signature;
    payment.paidAt = new Date();

    // 1. Create Transaction for Payment
    const paymentTxn = await this.transactionsService.createEntry({
      paymentId: payment._id as Types.ObjectId,
      projectId: payment.projectId,
      brandId: payment.brandId,
      professionalId: payment.professionalId,
      type: TransactionType.PAYMENT,
      direction: TransactionDirection.CREDIT,
      amount: payment.totalAmount,
      currency: payment.currency,
      status: TransactionStatus.CAPTURED,
      provider: payment.provider,
      providerTransactionId: dto.razorpay_payment_id,
      reference: payment.paymentNumber,
      capturedAt: new Date(),
    });

    // 2. Create Transaction for Platform Fee
    if (payment.platformFee > 0) {
      await this.transactionsService.createEntry({
        paymentId: payment._id as Types.ObjectId,
        projectId: payment.projectId,
        brandId: payment.brandId,
        professionalId: payment.professionalId,
        type: TransactionType.PLATFORM_FEE,
        direction: TransactionDirection.DEBIT,
        amount: payment.platformFee,
        currency: payment.currency,
        status: TransactionStatus.CAPTURED,
        provider: payment.provider,
        reference: `FEE-${payment.paymentNumber}`,
        capturedAt: new Date(),
      });
    }

    // 3. Create Payout Record for Professional
    const payout = await this.payoutsService.createPayout({
      projectId: payment.projectId,
      paymentId: payment._id as Types.ObjectId,
      professionalId: payment.professionalId,
      amount: payment.professionalAmount,
      currency: payment.currency,
      platformFee: payment.platformFee,
      provider: 'MANUAL',
    });

    payment.transactionId = paymentTxn._id as Types.ObjectId;
    payment.payoutId = payout._id as Types.ObjectId;
    await payment.save();

    // 4. Log Project Activity
    await this.projectsService.logActivity(
      payment.projectId,
      payment.brandId,
      ProjectActivityType.PROJECT_STATUS_CHANGED,
      `Payment received (${payment.paymentNumber}): ${payment.currency} ${payment.totalAmount.toLocaleString()} paid successfully.`,
      { paymentId: payment._id, transactionId: paymentTxn._id, totalAmount: payment.totalAmount },
    );

    // 5. Send Notifications
    await Promise.all([
      this.notificationsService.create({
        userId: payment.brandId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Payment Successful',
        message: `Your payment of ${payment.currency} ${payment.totalAmount.toLocaleString()} (${payment.paymentNumber}) was confirmed.`,
        link: `/projects/${payment.projectId}`,
        metadata: { paymentId: payment._id, projectId: payment.projectId },
      }),
      this.notificationsService.create({
        userId: payment.professionalId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Project Payment Received',
        message: `Brand deposited ${payment.currency} ${payment.totalAmount.toLocaleString()} for your project. Payout is pending completion.`,
        link: `/projects/${payment.projectId}`,
        metadata: { paymentId: payment._id, projectId: payment.projectId, payoutId: payout._id },
      }),
    ]);

    return {
      success: true,
      message: 'Payment verified and settled successfully',
      paymentNumber: payment.paymentNumber,
      status: payment.status,
      paidAt: payment.paidAt,
      transactionNumber: paymentTxn.transactionNumber,
    };
  }

  /**
   * Process incoming Razorpay Webhook with idempotency and signature validation
   */
  async handleRazorpayWebhook(rawBody: string | Buffer, signature: string, payload: any): Promise<any> {
    // 1. Signature Verification
    const isValid = this.razorpayProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Razorpay webhook signature verification failed');
      throw new BadRequestException('Invalid webhook signature');
    }

    const eventId = payload?.id || payload?.event_id || `evt_${Date.now()}`;
    const eventType = payload?.event || 'unknown';

    // 2. Webhook Idempotency Check
    const existingWebhook = await this.webhookModel.findOne({
      provider: 'RAZORPAY',
      eventId,
    });
    if (existingWebhook && existingWebhook.processed) {
      return { status: 'already_processed', eventId };
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const payloadHash = crypto.createHash('sha256').update(bodyString).digest('hex');

    const webhookDoc =
      existingWebhook ||
      new this.webhookModel({
        eventId,
        provider: 'RAZORPAY',
        eventType,
        payloadHash,
        rawPayload: payload,
      });

    // 3. Process Event
    try {
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        const orderId = payload?.payload?.payment?.entity?.order_id || payload?.payload?.order?.entity?.id;
        const paymentId = payload?.payload?.payment?.entity?.id;

        if (orderId) {
          const payment = await this.paymentModel.findOne({ providerOrderId: orderId });
          const allowedTransitions = [
            PaymentStatus.ORDER_CREATED,
            PaymentStatus.PENDING,
            PaymentStatus.PAYMENT_PROCESSING,
          ];
          if (payment && allowedTransitions.includes(payment.status)) {
            // Verify amount consistency if present (in minor units / paise)
            const payloadPaise = payload?.payload?.payment?.entity?.amount;
            if (payloadPaise !== undefined) {
              const expectedPaise = Math.round(payment.totalAmount * 100);
              if (payloadPaise !== expectedPaise) {
                this.logger.warn(`Webhook amount mismatch: expected ${expectedPaise} paise, received ${payloadPaise} paise`);
                throw new BadRequestException('Webhook payload amount does not match payment record');
              }
            }

            payment.status = PaymentStatus.PAID;
            payment.providerPaymentId = paymentId;
            payment.paidAt = new Date();
            await payment.save();

            // Settle transaction if not exists
            const existingTxn = await this.transactionsService.findAll(
              { roles: [UserRole.ADMIN] },
              { projectId: payment.projectId.toString() },
            );
            if (!existingTxn.items.some((t: any) => t.paymentId?.toString() === payment._id.toString())) {
              await this.transactionsService.createEntry({
                paymentId: payment._id as Types.ObjectId,
                projectId: payment.projectId,
                brandId: payment.brandId,
                professionalId: payment.professionalId,
                type: TransactionType.PAYMENT,
                direction: TransactionDirection.CREDIT,
                amount: payment.totalAmount,
                currency: payment.currency,
                status: TransactionStatus.CAPTURED,
                provider: payment.provider,
                providerTransactionId: paymentId,
                reference: payment.paymentNumber,
                capturedAt: new Date(),
              });
            }
          }
        }
      } else if (eventType === 'payment.failed') {
        const orderId = payload?.payload?.payment?.entity?.order_id;
        if (orderId) {
          await this.paymentModel.findOneAndUpdate(
            { providerOrderId: orderId, status: { $ne: PaymentStatus.PAID } },
            {
              status: PaymentStatus.FAILED,
              failedAt: new Date(),
              failureReason: payload?.payload?.payment?.entity?.error_description || 'Payment failed at gateway',
            },
          );
        }
      }

      webhookDoc.processed = true;
      webhookDoc.processedAt = new Date();
      await webhookDoc.save();

      return { status: 'processed', eventId };
    } catch (err) {
      this.logger.error(`Error processing webhook ${eventId}: ${err.message}`);
      await webhookDoc.save();
      throw err;
    }
  }

  /**
   * Process incoming Stripe Webhook with raw body HMAC verification and idempotency
   */
  async handleStripeWebhook(rawBody: string | Buffer, signature: string, payload: any): Promise<any> {
    // 1. Signature Verification
    const isValid = this.stripeProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Stripe webhook signature verification failed');
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    const eventId = payload?.id || `evt_stripe_${Date.now()}`;
    const eventType = payload?.type || 'unknown';

    // 2. Webhook Idempotency Check
    const existingWebhook = await this.webhookModel.findOne({
      provider: 'STRIPE',
      eventId,
    });
    if (existingWebhook && existingWebhook.processed) {
      return { status: 'already_processed', eventId };
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const payloadHash = crypto.createHash('sha256').update(bodyString).digest('hex');

    const webhookDoc =
      existingWebhook ||
      new this.webhookModel({
        eventId,
        provider: 'STRIPE',
        eventType,
        payloadHash,
        rawPayload: payload,
      });

    // 3. Process Event
    try {
      if (eventType === 'payment_intent.succeeded' || eventType === 'checkout.session.completed') {
        const objectData = payload?.data?.object;
        const paymentIntentId = objectData?.id;
        const providerOrderId = objectData?.metadata?.providerOrderId || paymentIntentId;

        const payment = await this.paymentModel.findOne({
          $or: [
            { providerOrderId },
            { providerPaymentId: paymentIntentId },
            { 'metadata.stripe_intent_id': paymentIntentId },
          ].filter(Boolean),
        });

        const allowedTransitions = [
          PaymentStatus.ORDER_CREATED,
          PaymentStatus.PENDING,
          PaymentStatus.PAYMENT_PROCESSING,
        ];

        if (payment && allowedTransitions.includes(payment.status)) {
          // Verify amount if available (in minor currency units e.g. cents)
          const amountReceived = objectData?.amount_received || objectData?.amount;
          if (amountReceived !== undefined) {
            const expectedMinor = Math.round(payment.totalAmount * 100);
            if (amountReceived !== expectedMinor) {
              this.logger.warn(
                `Stripe webhook amount mismatch: expected ${expectedMinor}, received ${amountReceived}`,
              );
              throw new BadRequestException('Webhook payload amount does not match payment record');
            }
          }

          payment.status = PaymentStatus.PAID;
          payment.providerPaymentId = paymentIntentId;
          payment.paidAt = new Date();
          await payment.save();

          // Settle transaction if not exists
          const existingTxn = await this.transactionsService.findAll(
            { roles: [UserRole.ADMIN] },
            { projectId: payment.projectId.toString() },
          );
          if (!existingTxn.items.some((t: any) => t.paymentId?.toString() === payment._id.toString())) {
            await this.transactionsService.createEntry({
              paymentId: payment._id as Types.ObjectId,
              projectId: payment.projectId,
              brandId: payment.brandId,
              professionalId: payment.professionalId,
              type: TransactionType.PAYMENT,
              direction: TransactionDirection.CREDIT,
              amount: payment.totalAmount,
              currency: payment.currency,
              status: TransactionStatus.CAPTURED,
              provider: payment.provider || PaymentProviderType.STRIPE,
              providerTransactionId: paymentIntentId,
              reference: payment.paymentNumber,
              capturedAt: new Date(),
            });
          }
        }
      } else if (eventType === 'payment_intent.payment_failed') {
        const paymentIntentId = payload?.data?.object?.id;
        if (paymentIntentId) {
          await this.paymentModel.findOneAndUpdate(
            {
              $or: [{ providerOrderId: paymentIntentId }, { providerPaymentId: paymentIntentId }],
              status: { $ne: PaymentStatus.PAID },
            },
            {
              status: PaymentStatus.FAILED,
              failedAt: new Date(),
              failureReason: payload?.data?.object?.last_payment_error?.message || 'Payment failed at Stripe gateway',
            },
          );
        }
      }

      webhookDoc.processed = true;
      webhookDoc.processedAt = new Date();
      await webhookDoc.save();

      return { status: 'processed', eventId };
    } catch (err) {
      this.logger.error(`Error processing Stripe webhook ${eventId}: ${err.message}`);
      await webhookDoc.save();
      throw err;
    }
  }

  /**
   * Process Controlled Refund for a Payment
   */
  async processRefund(paymentId: string, dto: RefundPaymentDto, requestingUser: any): Promise<any> {
    const reqUserId = (requestingUser.userId || requestingUser._id?.toString() || requestingUser.id).toString();
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    const isBrand = payment.brandId.toString() === reqUserId;
    if (!isBrand && !isAdmin) {
      throw new ForbiddenException('Only the paying Brand or an Admin can initiate refunds');
    }

    if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new BadRequestException(`Cannot refund a payment with status: ${payment.status}`);
    }

    const alreadyRefunded = payment.refundAmount || 0;
    const remainingToRefund = payment.totalAmount - alreadyRefunded;
    const refundAmount = dto.amount ? Number(dto.amount) : remainingToRefund;

    if (refundAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }
    if (refundAmount > remainingToRefund) {
      throw new BadRequestException(
        `Refund amount (${refundAmount}) exceeds maximum refundable amount (${remainingToRefund})`,
      );
    }

    const provider = payment.provider === PaymentProviderType.STRIPE ? this.stripeProvider : this.razorpayProvider;
    const refundResult = await provider.processRefund({
      paymentId: payment.providerPaymentId || payment.paymentNumber,
      amount: refundAmount,
      reason: dto.reason,
    });

    if (!refundResult || refundResult.status !== 'processed') {
      throw new BadRequestException('Refund could not be processed with payment gateway');
    }

    // Atomic conditional update to guard against concurrent race conditions
    const updatedPayment = await this.paymentModel.findOneAndUpdate(
      {
        _id: payment._id,
        status: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] },
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ['$refundAmount', 0] }, refundAmount] },
            '$totalAmount',
          ],
        },
      },
      {
        $inc: { refundAmount: refundAmount },
        $set: {
          refundReason: dto.reason,
          refundedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updatedPayment) {
      throw new ConflictException(
        'Concurrent refund detected or refundable balance exceeded',
      );
    }

    updatedPayment.status =
      updatedPayment.refundAmount >= updatedPayment.totalAmount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;
    await updatedPayment.save();

    // Create Refund Transaction Entry
    const refundTxn = await this.transactionsService.createEntry({
      paymentId: payment._id as Types.ObjectId,
      projectId: payment.projectId,
      brandId: payment.brandId,
      professionalId: payment.professionalId,
      type: TransactionType.REFUND,
      direction: TransactionDirection.DEBIT,
      amount: refundAmount,
      currency: payment.currency,
      status: TransactionStatus.REFUNDED,
      provider: payment.provider,
      providerTransactionId: refundResult.refundId,
      reference: `REFUND-${payment.paymentNumber}`,
      refundedAt: new Date(),
    });

    // Log Activity
    await this.projectsService.logActivity(
      payment.projectId,
      new Types.ObjectId(reqUserId),
      ProjectActivityType.PROJECT_STATUS_CHANGED,
      `Refund processed: ${payment.currency} ${refundAmount.toLocaleString()} (${updatedPayment.status}). Reason: ${dto.reason}`,
      { paymentId: payment._id, refundAmount, refundTxnId: refundTxn._id },
    );

    // Send Notification
    await this.notificationsService.create({
      userId: payment.brandId,
      type: NotificationType.REFUND_COMPLETED,
      title: 'Refund Processed',
      message: `Refund of ${payment.currency} ${refundAmount.toLocaleString()} has been processed for ${payment.paymentNumber}.`,
      link: `/projects/${payment.projectId}`,
      metadata: { paymentId: payment._id, refundAmount },
    });

    return {
      success: true,
      message: 'Refund processed successfully',
      paymentId: payment._id,
      refundAmount,
      status: updatedPayment.status,
      refundTransaction: refundTxn.transactionNumber,
    };
  }

  /**
   * List payments with search, role-based filtering, and pagination
   */
  async findAll(requestingUser: any, query: QueryPaymentsDto): Promise<any> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    const filter: any = {};
    if (!isAdmin) {
      const uObjId = new Types.ObjectId(reqUserId);
      filter.$or = [{ brandId: uObjId }, { professionalId: uObjId }];
    }

    if (query.status) {
      filter.status = query.status;
    }
    if (query.provider) {
      filter.provider = query.provider;
    }
    if (query.projectId && Types.ObjectId.isValid(query.projectId)) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.brandId && Types.ObjectId.isValid(query.brandId)) {
      filter.brandId = new Types.ObjectId(query.brandId);
    }
    if (query.professionalId && Types.ObjectId.isValid(query.professionalId)) {
      filter.professionalId = new Types.ObjectId(query.professionalId);
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        ...(filter.$or || []),
        { paymentNumber: searchRegex },
        { providerOrderId: searchRegex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .populate('projectId', 'title projectNumber slug status')
        .populate('brandId', 'fullName email username avatarUrl')
        .populate('professionalId', 'fullName email username avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.paymentModel.countDocuments(filter),
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
   * Get single payment by ID or paymentNumber
   */
  async findById(id: string, requestingUser: any): Promise<any> {
    const reqUserId = requestingUser.userId || requestingUser._id?.toString() || requestingUser.id;
    const isAdmin = requestingUser.roles?.includes(UserRole.ADMIN) || requestingUser.roles?.includes(UserRole.SUPER_ADMIN);

    const query = Types.ObjectId.isValid(id) ? { _id: new Types.ObjectId(id) } : { paymentNumber: id };
    const payment = await this.paymentModel
      .findOne(query)
      .populate('projectId', 'title projectNumber slug status approvedBudget')
      .populate('brandId', 'fullName email username avatarUrl')
      .populate('professionalId', 'fullName email username avatarUrl')
      .lean();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const isBrand = payment.brandId?._id?.toString() === reqUserId || payment.brandId?.toString() === reqUserId;
    const isProfessional = payment.professionalId?._id?.toString() === reqUserId || payment.professionalId?.toString() === reqUserId;

    if (!isBrand && !isProfessional && !isAdmin) {
      throw new ForbiddenException('Access denied to this payment record');
    }

    return payment;
  }

  /**
   * Get earnings summary for a professional
   */
  async getEarningsSummary(userId: string): Promise<any> {
    const uObjId = new Types.ObjectId(userId);

    const payments = await this.paymentModel.find({
      professionalId: uObjId,
      status: PaymentStatus.PAID,
    }).lean();

    const payouts = await this.payoutModel.find({
      professionalId: uObjId,
    }).lean();

    const totalProjectValue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalPlatformFees = payments.reduce((acc, p) => acc + (p.platformFee || 0), 0);
    const totalNetEarnings = payments.reduce((acc, p) => acc + (p.professionalAmount || 0), 0);

    const completedPayouts = payouts
      .filter((po) => po.status === 'COMPLETED')
      .reduce((acc, po) => acc + (po.amount || 0), 0);
    const pendingPayouts = payouts
      .filter((po) => po.status === 'PENDING' || po.status === 'PROCESSING')
      .reduce((acc, po) => acc + (po.amount || 0), 0);

    return {
      totalEarnings: totalNetEarnings,
      totalProjectValue,
      totalPlatformFees,
      totalNetEarnings,
      completedPayouts,
      pendingPayouts,
      availableBalance: Math.max(0, totalNetEarnings - completedPayouts),
      currency: 'INR',
    };
  }

  // ==========================================
  // PHASE 22: MANUAL PAYMENTS & SETTINGS
  // ==========================================

  async getPaymentSettings(): Promise<PaymentSettingsDocument> {
    let settings = await this.paymentSettingsModel.findOne();
    if (!settings) {
      settings = await this.paymentSettingsModel.create({});
    }
    return settings;
  }

  async updatePaymentSettings(adminId: string, dto: UpdatePaymentSettingsDto): Promise<PaymentSettingsDocument> {
    let settings = await this.paymentSettingsModel.findOne();
    if (!settings) {
      settings = await this.paymentSettingsModel.create({ ...dto, updatedBy: adminId });
    } else {
      Object.assign(settings, dto);
      settings.updatedBy = adminId;
      await settings.save();
    }
    return settings;
  }

  getTokenPackages() {
    return TOKEN_PACKAGES;
  }

  async createManualPaymentRequest(userId: string, dto: CreateManualPaymentDto): Promise<ManualPaymentRequestDocument> {
    const uId = new Types.ObjectId(userId);

    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.manualPaymentModel.findOne({ idempotencyKey: dto.idempotencyKey });
      if (existing) {
        return existing;
      }
    }

    // Duplicate UTR check
    const existingRef = await this.manualPaymentModel.findOne({
      transactionReference: dto.transactionReference.trim(),
      status: { $in: [ManualPaymentStatus.PENDING_VERIFICATION, ManualPaymentStatus.APPROVED] },
    });
    if (existingRef) {
      throw new ConflictException(
        'This transaction reference (UTR) has already been submitted and is currently being processed or approved.',
      );
    }

    let targetTitle = '';
    let tokensAllocated = 0;
    let targetPlanObjectId: Types.ObjectId | undefined = undefined;

    if (dto.targetType === ManualPaymentTargetType.SUBSCRIPTION) {
      if (!dto.targetPlanId) {
        throw new BadRequestException('targetPlanId is required for subscription manual payments.');
      }
      const plan = await this.subscriptionsService.getPlanById(dto.targetPlanId);
      if (dto.amount < plan.price) {
        throw new BadRequestException(
          `Submitted payment amount (${dto.amount}) is less than required subscription price (${plan.price} ${plan.currency}).`,
        );
      }
      targetTitle = `Subscription: ${plan.name}`;
      tokensAllocated = plan.includedTokens || 0;
      targetPlanObjectId = new Types.ObjectId(plan._id.toString());
    } else if (dto.targetType === ManualPaymentTargetType.TOKEN_PACKAGE) {
      const pkg = TOKEN_PACKAGES.find((p) => p.id === dto.tokenPackageId);
      if (!pkg) {
        throw new BadRequestException('Invalid token package specified.');
      }
      const qty = dto.tokenPackageQuantity || 1;
      const expectedAmount = pkg.priceInr * qty;
      if (dto.amount < expectedAmount) {
        throw new BadRequestException(
          `Submitted payment amount (${dto.amount}) is less than package cost (${expectedAmount} INR).`,
        );
      }
      targetTitle = `${pkg.name} (${pkg.tokensCount * qty} Tokens)`;
      tokensAllocated = pkg.tokensCount * qty;
    }

    const orderNumber = `MAN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const request = await this.manualPaymentModel.create({
      orderNumber,
      userId: uId,
      targetType: dto.targetType,
      targetPlanId: targetPlanObjectId,
      tokenPackageQuantity: tokensAllocated,
      targetTitle,
      amount: dto.amount,
      currency: dto.currency || 'INR',
      paymentMethod: dto.paymentMethod,
      transactionReference: dto.transactionReference.trim(),
      senderIdentifier: dto.senderIdentifier,
      proofImageUrl: dto.proofImageUrl,
      notes: dto.notes,
      idempotencyKey: dto.idempotencyKey,
      status: ManualPaymentStatus.PENDING_VERIFICATION,
    });

    this.logger.log(`Manual payment request created: ${orderNumber} by user ${userId} for ${dto.amount} INR`);
    return request;
  }

  async getUserManualPayments(userId: string, page = 1, limit = 20) {
    const uId = new Types.ObjectId(userId);
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.manualPaymentModel
        .find({ userId: uId })
        .populate('targetPlanId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .lean()
        .exec(),
      this.manualPaymentModel.countDocuments({ userId: uId }),
    ]);

    return {
      items,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    };
  }

  async getAdminManualPayments(filter: {
    status?: ManualPaymentStatus;
    targetType?: ManualPaymentTargetType;
    paymentMethod?: ManualPaymentMethod;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    if (filter.status) query.status = filter.status;
    if (filter.targetType) query.targetType = filter.targetType;
    if (filter.paymentMethod) query.paymentMethod = filter.paymentMethod;

    if (filter.search) {
      const term = filter.search.trim();
      query.$or = [
        { orderNumber: { $regex: term, $options: 'i' } },
        { transactionReference: { $regex: term, $options: 'i' } },
        { senderIdentifier: { $regex: term, $options: 'i' } },
      ];
    }

    const p = Math.max(1, Number(filter.page) || 1);
    const l = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.manualPaymentModel
        .find(query)
        .populate('userId', 'fullName email role phone username')
        .populate('reviewedBy', 'fullName email')
        .populate('targetPlanId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .lean()
        .exec(),
      this.manualPaymentModel.countDocuments(query),
    ]);

    return {
      items,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    };
  }

  async reviewManualPayment(adminId: string, requestId: string, dto: ReviewManualPaymentDto) {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new BadRequestException('Invalid request ID');
    }

    const request = await this.manualPaymentModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Manual payment request not found');
    }

    if (request.status !== ManualPaymentStatus.PENDING_VERIFICATION) {
      throw new BadRequestException(
        `This manual payment request has already been ${request.status.toLowerCase()} and cannot be reviewed again.`,
      );
    }

    if (request.userId.toString() === adminId.toString()) {
      throw new ForbiddenException(
        'Segregation of duties violation: Administrators cannot review or approve their own payment requests. Another administrator must review this submission.',
      );
    }

    const adminObjectId = new Types.ObjectId(adminId);

    if (dto.status === ManualPaymentStatus.APPROVED) {
      let fulfillmentRefId = '';

      if (request.targetType === ManualPaymentTargetType.SUBSCRIPTION && request.targetPlanId) {
        const sub = await this.subscriptionsService.activatePaidSubscription(
          request.userId.toString(),
          request.targetPlanId.toString(),
          request._id.toString(),
        );
        fulfillmentRefId = sub._id.toString();
      } else if (request.targetType === ManualPaymentTargetType.TOKEN_PACKAGE) {
        const { entry } = await this.tokensService.creditTokens({
          userId: request.userId.toString(),
          amount: request.tokenPackageQuantity || 0,
          type: TokenLedgerType.PURCHASE,
          reason: `Manual payment verified: ${request.targetTitle} (Order ${request.orderNumber})`,
          sourceRefId: request._id.toString(),
          idempotencyKey: `man-pay-${request._id.toString()}`,
        });
        fulfillmentRefId = entry._id.toString();
      }

      request.status = ManualPaymentStatus.APPROVED;
      request.reviewedBy = adminObjectId;
      request.reviewedAt = new Date();
      request.fulfillmentRefId = fulfillmentRefId;
      if (dto.notes) request.notes = dto.notes;

      await request.save();
      this.logger.log(`Manual payment request ${request.orderNumber} APPROVED by admin ${adminId}`);
    } else if (dto.status === ManualPaymentStatus.REJECTED) {
      if (!dto.rejectionReason) {
        throw new BadRequestException('A reason is required when rejecting a manual payment request.');
      }

      request.status = ManualPaymentStatus.REJECTED;
      request.rejectionReason = dto.rejectionReason;
      request.reviewedBy = adminObjectId;
      request.reviewedAt = new Date();
      if (dto.notes) request.notes = dto.notes;

      await request.save();
      this.logger.log(`Manual payment request ${request.orderNumber} REJECTED by admin ${adminId}`);
    } else {
      throw new BadRequestException('Invalid review status. Must be APPROVED or REJECTED.');
    }

    return request;
  }
}
