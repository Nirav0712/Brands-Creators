import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';
import { UserSubscription, UserSubscriptionDocument } from './schemas/user-subscription.schema';
import { TokensService } from '../tokens/tokens.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  SubscriptionStatus,
  SubscriptionPlanDuration,
  UserRole,
  TokenLedgerType,
  NotificationType,
} from '@brands-creators/types';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/subscriptions.dto';

@Injectable()
export class SubscriptionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionsService.name);
  private expiryCheckInterval?: NodeJS.Timeout;

  constructor(
    @InjectModel(SubscriptionPlan.name) private readonly planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(UserSubscription.name) private readonly userSubModel: Model<UserSubscriptionDocument>,
    private readonly tokensService: TokensService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService?: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPlans();
    // Run initial expiration sweep
    await this.processExpiredSubscriptions().catch((err) => {
      this.logger.error(`Initial subscription expiration sweep error: ${err.message}`);
    });

    // Schedule hourly recurring check (unref'd to prevent keeping node alive on exit)
    this.expiryCheckInterval = setInterval(() => {
      this.processExpiredSubscriptions().catch((err) => {
        this.logger.error(`Periodic subscription expiry runner error: ${err.message}`);
      });
    }, 3600000);

    if (this.expiryCheckInterval.unref) {
      this.expiryCheckInterval.unref();
    }
  }

  onModuleDestroy() {
    if (this.expiryCheckInterval) {
      clearInterval(this.expiryCheckInterval);
    }
  }

  private async seedDefaultPlans() {
    const defaultPlans = [
      {
        name: 'Free Starter Plan',
        slug: 'free-starter',
        description: 'Perfect for getting started. Explore the marketplace and try out collaboration features.',
        price: 0,
        currency: 'INR',
        duration: SubscriptionPlanDuration.MONTHLY,
        durationDays: 30,
        includedTokens: 10,
        entitlements: [
          'Marketplace Exploration & Search',
          '10 Initial Welcome Tokens',
          'Standard Project Workspaces',
          'Direct In-App Messaging',
        ],
        allowedRoles: [UserRole.CREATOR, UserRole.BRAND, UserRole.PRODUCTION_TEAM],
        isFree: true,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Premium Pro Creator & Brand',
        slug: 'premium-pro',
        description: 'Unlock maximum marketplace reach, 100 included monthly tokens, and priority discovery.',
        price: 1000,
        currency: 'INR',
        duration: SubscriptionPlanDuration.MONTHLY,
        durationDays: 30,
        includedTokens: 100,
        entitlements: [
          'Priority Search & Explore Placement',
          '100 Monthly Included Tokens',
          'Verified Pro Badge Spotlight',
          'Unlimited In-App Messaging',
          'Express Milestone Payouts',
        ],
        allowedRoles: [UserRole.CREATOR, UserRole.BRAND, UserRole.PRODUCTION_TEAM],
        isFree: false,
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'Annual VIP Growth Suite',
        slug: 'annual-vip',
        description: 'Complete annual subscription with 1,200 tokens, priority matching, and VIP support.',
        price: 9500,
        currency: 'INR',
        duration: SubscriptionPlanDuration.YEARLY,
        durationDays: 365,
        includedTokens: 1200,
        entitlements: [
          'All Premium Pro Benefits',
          '1,200 Annual Included Tokens',
          'Featured Homepage Spotlight',
          'Dedicated Concierge Support',
          'Custom Legal Contract Vault',
        ],
        allowedRoles: [UserRole.CREATOR, UserRole.BRAND, UserRole.PRODUCTION_TEAM],
        isFree: false,
        isActive: true,
        sortOrder: 3,
      },
    ];

    for (const plan of defaultPlans) {
      const exists = await this.planModel.findOne({ slug: plan.slug });
      if (!exists) {
        await this.planModel.create(plan);
      }
    }
    this.logger.log('Default subscription plans seeded.');
  }

  async getActivePlans(role?: UserRole): Promise<SubscriptionPlanDocument[]> {
    const query: any = { isActive: true };
    if (role) {
      query.allowedRoles = role;
    }
    return this.planModel.find(query).sort({ sortOrder: 1, price: 1 }).exec();
  }

  async getAllPlans(): Promise<SubscriptionPlanDocument[]> {
    return this.planModel.find().sort({ sortOrder: 1, price: 1 }).exec();
  }

  async getPlanById(id: string): Promise<SubscriptionPlanDocument> {
    const plan = await this.planModel.findById(id);
    if (!plan) {
      throw new NotFoundException(`Subscription plan '${id}' not found.`);
    }
    return plan;
  }

  async createPlan(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlanDocument> {
    const slug = dto.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const existing = await this.planModel.findOne({ slug });
    if (existing) {
      throw new ConflictException(`A plan with slug '${slug}' already exists.`);
    }

    let durationDays = dto.durationDays;
    if (!durationDays) {
      if (dto.duration === SubscriptionPlanDuration.MONTHLY) durationDays = 30;
      else if (dto.duration === SubscriptionPlanDuration.YEARLY) durationDays = 365;
      else if (dto.duration === SubscriptionPlanDuration.LIFETIME) durationDays = 3650;
      else durationDays = 30;
    }

    return this.planModel.create({
      ...dto,
      slug,
      durationDays,
      isFree: dto.price === 0 || Boolean(dto.isFree),
    });
  }

  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlanDocument> {
    const plan = await this.getPlanById(id);

    if (dto.name && dto.name !== plan.name) {
      const newSlug = dto.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      const existing = await this.planModel.findOne({ slug: newSlug, _id: { $ne: plan._id } });
      if (existing) {
        throw new ConflictException(`A plan with slug '${newSlug}' already exists.`);
      }
      plan.slug = newSlug;
    }

    Object.assign(plan, dto);
    if (dto.price !== undefined) {
      plan.isFree = dto.price === 0 || Boolean(dto.isFree);
    }
    return plan.save();
  }

  async togglePlanStatus(id: string): Promise<SubscriptionPlanDocument> {
    const plan = await this.getPlanById(id);
    plan.isActive = !plan.isActive;
    return plan.save();
  }

  async getUserActiveSubscription(userId: string): Promise<any> {
    const uId = new Types.ObjectId(userId);
    let sub = await this.userSubModel
      .findOne({ userId: uId, status: SubscriptionStatus.ACTIVE })
      .populate('planId')
      .exec();

    // Check if expired
    if (sub && sub.expiresAt && new Date() > sub.expiresAt) {
      sub.status = SubscriptionStatus.EXPIRED;
      await sub.save();
      sub = null;
    }

    return sub;
  }

  async subscribeFreePlan(userId: string, planId: string) {
    const plan = await this.getPlanById(planId);
    if (!plan.isActive) {
      throw new BadRequestException('Selected plan is not currently active.');
    }
    if (!plan.isFree && plan.price > 0) {
      throw new BadRequestException('This plan requires payment. Please select manual payment option.');
    }

    const uId = new Types.ObjectId(userId);

    // Free welcome tier can only be claimed once per user account
    if (plan.isFree) {
      const priorFreeSub = await this.userSubModel.findOne({ userId: uId, planId: plan._id });
      if (priorFreeSub) {
        if (priorFreeSub.status === SubscriptionStatus.ACTIVE) {
          const wallet = await this.tokensService.getWallet(userId);
          return {
            message: 'You already have an active subscription to this plan.',
            subscription: priorFreeSub,
            wallet,
          };
        }
        throw new BadRequestException('Free tier welcome tokens can only be claimed once per user account.');
      }
    }

    // Prevent duplicate activation if user already has an active subscription to this free plan
    const activeSub = await this.getUserActiveSubscription(userId);
    if (activeSub && (activeSub.planId?._id?.toString() === plan._id.toString() || activeSub.planId?.toString() === plan._id.toString())) {
      const wallet = await this.tokensService.getWallet(userId);
      return {
        message: 'You already have an active subscription to this plan.',
        subscription: activeSub,
        wallet,
      };
    }

    // Deactivate previous active subscription if upgrading/switching
    if (activeSub) {
      activeSub.status = SubscriptionStatus.CANCELLED;
      activeSub.cancelledAt = new Date();
      await activeSub.save();
    }

    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + (plan.durationDays || 30) * 24 * 60 * 60 * 1000);

    const userSub = await this.userSubModel.create({
      userId: uId,
      planId: plan._id,
      status: SubscriptionStatus.ACTIVE,
      startsAt,
      expiresAt,
      isAutoRenew: false,
      grantedTokensCount: plan.includedTokens,
    });

    // Grant included tokens to wallet
    let wallet = null;
    if (plan.includedTokens > 0) {
      const result = await this.tokensService.creditTokens({
        userId,
        amount: plan.includedTokens,
        type: TokenLedgerType.FREE_ALLOCATION,
        reason: `Included tokens for ${plan.name}`,
        sourceRefId: userSub._id.toString(),
        idempotencyKey: `sub-free-${userSub._id}`,
      });
      wallet = result.wallet;
    } else {
      wallet = await this.tokensService.getOrCreateWallet(userId);
    }

    return {
      message: `Successfully subscribed to ${plan.name}.`,
      subscription: await userSub.populate('planId'),
      wallet,
    };
  }

  async activatePaidSubscription(userId: string, planId: string, paymentRequestId: string) {
    const plan = await this.getPlanById(planId);
    const uId = new Types.ObjectId(userId);

    // Idempotency check: has this payment request already activated a subscription?
    const existing = await this.userSubModel.findOne({ paymentRequestId });
    if (existing) {
      return existing.populate('planId');
    }

    // Deactivate prior active subscription
    const currentActive = await this.getUserActiveSubscription(userId);
    if (currentActive) {
      currentActive.status = SubscriptionStatus.CANCELLED;
      currentActive.cancelledAt = new Date();
      await currentActive.save();
    }

    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + (plan.durationDays || 30) * 24 * 60 * 60 * 1000);

    const userSub = await this.userSubModel.create({
      userId: uId,
      planId: plan._id,
      status: SubscriptionStatus.ACTIVE,
      startsAt,
      expiresAt,
      isAutoRenew: false,
      grantedTokensCount: plan.includedTokens,
      paymentRequestId,
    });

    // Grant tokens exactly once
    if (plan.includedTokens > 0) {
      await this.tokensService.creditTokens({
        userId,
        amount: plan.includedTokens,
        type: TokenLedgerType.SUBSCRIPTION_GRANT,
        reason: `Tokens granted from paid subscription: ${plan.name}`,
        sourceRefId: paymentRequestId,
        idempotencyKey: `sub-paid-${paymentRequestId}`,
      });
    }

    return userSub.populate('planId');
  }

  async cancelSubscription(userId: string, subscriptionId: string, reason = 'User requested cancellation') {
    const sub = await this.userSubModel.findOne({
      _id: new Types.ObjectId(subscriptionId),
      userId: new Types.ObjectId(userId),
    });
    if (!sub) {
      throw new NotFoundException('Subscription record not found.');
    }
    sub.status = SubscriptionStatus.CANCELLED;
    sub.cancelledAt = new Date();
    sub.metadata = { ...sub.metadata, cancellationReason: reason };
    return sub.save();
  }

  async adminRevokeSubscription(subscriptionId: string, adminUserId: string, reason: string) {
    const sub = await this.userSubModel.findById(subscriptionId);
    if (!sub) {
      throw new NotFoundException('Subscription record not found.');
    }
    sub.status = SubscriptionStatus.REVOKED;
    sub.cancelledAt = new Date();
    sub.metadata = { ...sub.metadata, revokedBy: adminUserId, revocationReason: reason };
    return sub.save();
  }

  async getSubscribers(filter: {
    planId?: string;
    status?: SubscriptionStatus;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    if (filter.planId && Types.ObjectId.isValid(filter.planId)) {
      query.planId = new Types.ObjectId(filter.planId);
    }
    if (filter.status) {
      query.status = filter.status;
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.userSubModel
        .find(query)
        .populate('userId', 'fullName email username roles')
        .populate('planId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userSubModel.countDocuments(query),
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
   * Proactively sweep and expire active subscriptions whose expiresAt date has passed.
   * Also sends 3-day renewal reminders for active subscriptions expiring soon.
   */
  async processExpiredSubscriptions(): Promise<{
    processed: number;
    expiredCount: number;
    remindedCount: number;
    timestamp: Date;
  }> {
    const now = new Date();
    let expiredCount = 0;
    let remindedCount = 0;

    // 1. Find all active subscriptions where expiresAt <= now
    const expiredSubs = await this.userSubModel
      .find({
        status: SubscriptionStatus.ACTIVE,
        expiresAt: { $lte: now },
      })
      .populate('planId')
      .exec();

    for (const sub of expiredSubs) {
      sub.status = SubscriptionStatus.EXPIRED;
      sub.metadata = {
        ...sub.metadata,
        expiredAt: now.toISOString(),
        expiredByWorker: true,
      };
      await sub.save();
      expiredCount++;

      // Notify subscriber
      if (this.notificationsService) {
        try {
          const planName = (sub.planId as any)?.name || 'Subscription';
          await this.notificationsService.create({
            userId: sub.userId as Types.ObjectId,
            type: NotificationType.SYSTEM_ALERT,
            title: 'Subscription Expired',
            message: `Your ${planName} subscription has expired. Renew your plan to continue enjoying pro benefits.`,
            link: '/subscriptions',
            metadata: { subscriptionId: sub._id },
          });
        } catch (notifErr: any) {
          this.logger.warn(`Failed to dispatch expiration notification for user ${sub.userId}: ${notifErr.message}`);
        }
      }
    }

    // 2. Find subscriptions expiring within 3 days that haven't received reminder
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringSoonSubs = await this.userSubModel
      .find({
        status: SubscriptionStatus.ACTIVE,
        expiresAt: { $gt: now, $lte: threeDaysLater },
        'metadata.expiryReminderSent': { $ne: true },
      })
      .populate('planId')
      .exec();

    for (const sub of expiringSoonSubs) {
      sub.metadata = {
        ...sub.metadata,
        expiryReminderSent: true,
        reminderSentAt: now.toISOString(),
      };
      await sub.save();
      remindedCount++;

      if (this.notificationsService) {
        try {
          const planName = (sub.planId as any)?.name || 'Subscription';
          const daysRemaining = Math.max(1, Math.ceil((sub.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
          await this.notificationsService.create({
            userId: sub.userId as Types.ObjectId,
            type: NotificationType.SYSTEM_ALERT,
            title: 'Subscription Expiring Soon',
            message: `Your ${planName} subscription will expire in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Renew now to keep your active tokens and spotlight placement.`,
            link: '/subscriptions',
            metadata: { subscriptionId: sub._id, daysRemaining },
          });
        } catch (notifErr: any) {
          this.logger.warn(`Failed to dispatch renewal reminder for user ${sub.userId}: ${notifErr.message}`);
        }
      }
    }

    this.logger.log(
      `Subscription expiry sweep completed: ${expiredCount} expired, ${remindedCount} renewal reminders sent.`,
    );

    return {
      processed: expiredCount + remindedCount,
      expiredCount,
      remindedCount,
      timestamp: now,
    };
  }
}

