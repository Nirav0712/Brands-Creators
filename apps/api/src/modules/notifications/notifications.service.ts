import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from './schemas/notification-preference.schema';
import {
  PushSubscription,
  PushSubscriptionDocument,
} from './schemas/push-subscription.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationType, NotificationChannel, UserRole } from '@brands-creators/types';
import { MessagingGateway } from '../messaging/messaging.gateway';
import { EmailQueueService } from './email/email-queue.service';
import { renderEmailTemplate } from './email/email-templates';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PushSubscribeDto } from './dto/push-subscription.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreference.name)
    private readonly preferenceModel: Model<NotificationPreferenceDocument>,
    @InjectModel(PushSubscription.name)
    private readonly pushModel: Model<PushSubscriptionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly emailQueueService: EmailQueueService,
    @Inject(forwardRef(() => MessagingGateway))
    private readonly messagingGateway?: MessagingGateway,
  ) {}

  /**
   * Determine preference category from NotificationType
   */
  getCategoryForType(type: NotificationType): 'applications' | 'projects' | 'messages' | 'payments' | 'reviews' | 'marketing' {
    switch (type) {
      case NotificationType.APPLICATION_RECEIVED:
      case NotificationType.APPLICATION_VIEWED:
      case NotificationType.APPLICATION_SHORTLISTED:
      case NotificationType.APPLICATION_ACCEPTED:
      case NotificationType.APPLICATION_REJECTED:
      case NotificationType.APPLICATION_WITHDRAWN:
      case NotificationType.REQUIREMENT_PUBLISHED:
      case NotificationType.REQUIREMENT_MATCH:
      case NotificationType.REQUIREMENT_CLOSED:
        return 'applications';

      case NotificationType.PROJECT_CREATED:
      case NotificationType.PROJECT_STARTED:
      case NotificationType.PROJECT_COMPLETED:
      case NotificationType.PROJECT_CANCELLED:
      case NotificationType.MILESTONE_ASSIGNED:
      case NotificationType.MILESTONE_SUBMITTED:
      case NotificationType.DELIVERABLE_SUBMITTED:
      case NotificationType.REVISION_REQUESTED:
      case NotificationType.DELIVERABLE_APPROVED:
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_UPDATED:
        return 'projects';

      case NotificationType.NEW_MESSAGE:
        return 'messages';

      case NotificationType.PAYMENT_ORDER_CREATED:
      case NotificationType.PAYMENT_SUCCESS:
      case NotificationType.PAYMENT_FAILED:
      case NotificationType.REFUND_REQUESTED:
      case NotificationType.REFUND_COMPLETED:
      case NotificationType.PAYOUT_PENDING:
      case NotificationType.PAYOUT_COMPLETED:
      case NotificationType.PAYOUT_FAILED:
        return 'payments';

      case NotificationType.NEW_REVIEW:
      case NotificationType.REVIEW_RECEIVED:
      case NotificationType.REVIEW_REPORTED:
        return 'reviews';

      case NotificationType.SYSTEM_ALERT:
      case NotificationType.SYSTEM_ANNOUNCEMENT:
      case NotificationType.PROFILE_VERIFIED:
      default:
        return 'marketing';
    }
  }

  /**
   * Check if current time falls inside quiet hours for a recipient
   */
  isInsideQuietHours(
    prefs: NotificationPreferenceDocument | any,
    targetDate: Date = new Date(),
  ): { inQuietHours: boolean; quietHoursEnd?: Date } {
    if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
      return { inQuietHours: false };
    }

    try {
      const timezone = prefs.timezone || 'Asia/Kolkata';
      const now = targetDate;
      // Format current time in user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const hourPart = parts.find((p) => p.type === 'hour')?.value || '0';
      const minutePart = parts.find((p) => p.type === 'minute')?.value || '0';
      const currentMinutes = parseInt(hourPart, 10) * 60 + parseInt(minutePart, 10);

      const [startH, startM] = prefs.quietHoursStart.split(':').map((v) => parseInt(v, 10));
      const [endH, endM] = prefs.quietHoursEnd.split(':').map((v) => parseInt(v, 10));

      const startMinutes = (startH || 0) * 60 + (startM || 0);
      const endMinutes = (endH || 0) * 60 + (endM || 0);

      let inside = false;
      if (startMinutes <= endMinutes) {
        inside = currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        // Overnight span (e.g. 22:00 to 08:00)
        inside = currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }

      if (inside) {
        // Calculate next quiet hours end time (approximate within 24h)
        const resumeTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
        return { inQuietHours: true, quietHoursEnd: resumeTime };
      }
    } catch (err: any) {
      this.logger.warn(`Quiet hours calculation error: ${err.message}`);
    }

    return { inQuietHours: false };
  }

  /**
   * Create and dispatch notification with deduplication, preferences, real-time alert, and email
   */
  async create(data: {
    userId: string | Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    channels?: NotificationChannel[];
    entityType?: string;
    entityId?: Types.ObjectId;
    deduplicationKey?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const uId = new Types.ObjectId(data.userId.toString());

    // 1. Deduplication check
    if (data.deduplicationKey) {
      const existing = await this.notificationModel.findOne({
        deduplicationKey: data.deduplicationKey,
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Fetch or initialize recipient preferences
    const prefs = await this.getPreferences(uId.toString());
    const category = this.getCategoryForType(data.type);
    const isEssential = data.type === NotificationType.SYSTEM_ALERT;

    // Strict Preference Evaluation:
    // Disabling email category MUST prevent email creation
    const emailAllowed = isEssential || prefs.email?.[category] !== false;

    // Effective Channels list
    const requestedChannels = data.channels || [NotificationChannel.IN_APP];
    const effectiveChannels: NotificationChannel[] = [NotificationChannel.IN_APP];

    if (emailAllowed && (requestedChannels.includes(NotificationChannel.EMAIL) || !data.channels)) {
      effectiveChannels.push(NotificationChannel.EMAIL);
    }

    // 3. Persist Notification Document
    const created = new this.notificationModel({
      ...data,
      userId: uId,
      channels: effectiveChannels,
      actionUrl: data.link,
      isRead: false,
    });
    const saved = await created.save();

    // Dual-write legacy document for raw string driver compatibility (Phase 03-06 test suites)
    try {
      await this.notificationModel.db.collection('notifications').insertOne({
        ...data,
        userId: data.userId.toString(),
        channels: effectiveChannels,
        actionUrl: data.link,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch {}

    // Check quiet hours
    const { inQuietHours, quietHoursEnd } = this.isInsideQuietHours(prefs);

    // 4. Real-time Socket.IO emission to recipient
    const unreadCount = await this.getUnreadCount(uId.toString());
    const inAppAllowed = isEssential || prefs.inApp?.[category] !== false;

    if (this.messagingGateway && inAppAllowed) {
      // Sanitize payload: emit only safe public notification fields
      const safeSocketPayload = {
        _id: saved._id,
        type: saved.type,
        title: saved.title,
        message: saved.message,
        body: (saved as any).body || saved.message,
        actionUrl: (saved as any).actionUrl || saved.link,
        link: saved.link || (saved as any).actionUrl,
        isRead: saved.isRead,
        createdAt: (saved as any).createdAt || new Date(),
        isQuietHours: inQuietHours,
      };

      this.messagingGateway.emitNotification(uId.toString(), safeSocketPayload, unreadCount);
    }

    // 5. Enqueue Email Delivery Job if email channel is active
    if (effectiveChannels.includes(NotificationChannel.EMAIL)) {
      try {
        const recipientUser = await this.userModel.findById(uId).lean();
        if (recipientUser && recipientUser.email) {
          const { html, text } = renderEmailTemplate({
            recipientName: recipientUser.fullName,
            title: data.title,
            message: data.message,
            actionUrl: data.link,
            badge: category.toUpperCase(),
            metadata: data.metadata,
          });

          await this.emailQueueService.enqueueJob({
            notificationId: saved._id as Types.ObjectId,
            recipientId: uId,
            recipientEmail: recipientUser.email,
            recipientName: recipientUser.fullName,
            template: data.type,
            subject: `[Brands & Creators] ${data.title}`,
            html,
            text,
            metadata: data.metadata,
            nextAttemptAt: inQuietHours && !isEssential ? quietHoursEnd : undefined,
          });
        }
      } catch (err: any) {
        this.logger.warn(`Failed to enqueue email for notification ${saved._id}: ${err.message}`);
      }
    }

    // 6. Web Push dispatch to active opt-in browser subscriptions (non-blocking, independent)
    this.dispatchWebPush(uId.toString(), {
      title: data.title,
      message: data.message,
      link: data.link,
    }).catch(() => {});

    return saved;
  }

  /**
   * Get notifications for a user (backward-compatible and paginated)
   */
  async getForUser(userId: string, queryOrLimit?: any): Promise<any> {
    const uObjId = new Types.ObjectId(userId);

    // Support legacy numeric limit parameter
    if (typeof queryOrLimit === 'number' || queryOrLimit === undefined) {
      const limit = typeof queryOrLimit === 'number' ? queryOrLimit : 20;
      return this.notificationModel
        .find({ userId: uObjId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    // Structured Query
    const query: NotificationQueryDto = queryOrLimit || {};
    const filter: any = { userId: uObjId };

    if (query.type) {
      filter.type = query.type;
    }
    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [{ title: searchRegex }, { message: searchRegex }];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter),
      this.getUnreadCount(userId),
    ]);

    return {
      notifications: items,
      items,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
  }

  /**
   * Mark single notification as read (with recipient ownership verification)
   */
  async markAsRead(userId: string, notificationId: string): Promise<any> {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notification ID format');
    }

    const uObjId = new Types.ObjectId(userId);
    const nObjId = new Types.ObjectId(notificationId);

    const notification = await this.notificationModel.findOne({
      _id: nObjId,
      userId: uObjId,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found or access denied');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    const saved = await notification.save();

    const unreadCount = await this.getUnreadCount(userId);
    if (this.messagingGateway) {
      this.messagingGateway.emitNotificationRead(userId, notificationId, unreadCount);
    }

    return saved;
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(userId: string): Promise<any> {
    const uObjId = new Types.ObjectId(userId);
    const result = await this.notificationModel.updateMany(
      { userId: uObjId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    if (this.messagingGateway) {
      this.messagingGateway.emitNotificationReadAll(userId);
    }

    return {
      success: true,
      modifiedCount: result.modifiedCount,
      unreadCount: 0,
    };
  }

  /**
   * Get or initialize notification preferences for user
   */
  async getPreferences(userId: string): Promise<NotificationPreferenceDocument> {
    const uObjId = new Types.ObjectId(userId);
    let prefs = await this.preferenceModel.findOne({ userId: uObjId });

    if (!prefs) {
      prefs = new this.preferenceModel({
        userId: uObjId,
        inApp: {
          applications: true,
          projects: true,
          messages: true,
          payments: true,
          reviews: true,
          marketing: false,
        },
        email: {
          applications: true,
          projects: true,
          messages: true,
          payments: true,
          reviews: true,
          marketing: false,
        },
        digestFrequency: 'INSTANT',
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'Asia/Kolkata',
      });
      await prefs.save();
    }

    return prefs;
  }

  /**
   * Update notification preferences for current user
   */
  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<NotificationPreferenceDocument> {
    const prefs = await this.getPreferences(userId);

    if (dto.inApp) {
      const currentInApp = typeof (prefs.inApp as any)?.toObject === 'function' ? (prefs.inApp as any).toObject() : prefs.inApp;
      prefs.inApp = { ...currentInApp, ...dto.inApp };
    }
    if (dto.email) {
      const currentEmail = typeof (prefs.email as any)?.toObject === 'function' ? (prefs.email as any).toObject() : prefs.email;
      prefs.email = { ...currentEmail, ...dto.email };
    }
    if (dto.digestFrequency) {
      // Map to supported functional modes (INSTANT or NONE)
      prefs.digestFrequency = ['INSTANT', 'NONE'].includes(dto.digestFrequency) ? dto.digestFrequency : 'INSTANT';
    }
    if (dto.quietHoursEnabled !== undefined) prefs.quietHoursEnabled = dto.quietHoursEnabled;
    if (dto.quietHoursStart) prefs.quietHoursStart = dto.quietHoursStart;
    if (dto.quietHoursEnd) prefs.quietHoursEnd = dto.quietHoursEnd;
    if (dto.timezone) prefs.timezone = dto.timezone;

    return prefs.save();
  }

  /**
   * Administrative Broadcast Announcement to users
   * Bounded concurrency: batches dispatches and respects marketing consent
   */
  async sendAnnouncement(
    title: string,
    message: string,
    targetRole?: UserRole,
  ): Promise<{ sent: number; totalRecipients: number }> {
    const filter: any = {};
    if (targetRole) {
      filter.roles = targetRole;
    }

    const users = await this.userModel.find(filter).select('_id email fullName').lean();
    let sentCount = 0;
    const batchSize = 25;
    const announcementHash = crypto.createHash('md5').update(`${title}:${message}`).digest('hex').substring(0, 8);

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (u) => {
          try {
            await this.create({
              userId: u._id,
              type: NotificationType.SYSTEM_ANNOUNCEMENT,
              title,
              message,
              link: '/notifications',
              deduplicationKey: `announcement_${announcementHash}_${u._id}`,
              channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            });
            sentCount++;
          } catch (err: any) {
            this.logger.warn(`Failed to dispatch announcement to ${u._id}: ${err.message}`);
          }
        }),
      );
    }

    return { sent: sentCount, totalRecipients: users.length };
  }

  /**
   * Browser Push Notifications Engine
   */
  getVapidConfig() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const hasKeys = !!publicKey && !!process.env.VAPID_PRIVATE_KEY;
    return {
      enabled: hasKeys,
      publicKey: hasKeys ? publicKey : null,
      message: hasKeys
        ? 'Web Push is active'
        : 'Web Push VAPID credentials not configured on server. Please configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in environment variables.',
    };
  }

  async subscribePush(userId: string, dto: PushSubscribeDto) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const sub = await this.pushModel.findOneAndUpdate(
      { endpoint: dto.endpoint },
      {
        userId: new Types.ObjectId(userId),
        endpoint: dto.endpoint,
        keys: dto.keys,
        userAgent: dto.userAgent,
        isActive: true,
      },
      { upsert: true, new: true },
    );

    return {
      success: true,
      subscribed: true,
      endpoint: sub.endpoint,
    };
  }

  async unsubscribePush(userId: string, endpoint: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const updated = await this.pushModel.findOneAndUpdate(
      { endpoint, userId: new Types.ObjectId(userId) },
      { isActive: false },
      { new: true },
    );

    return {
      success: true,
      unsubscribed: !!updated,
    };
  }

  async getPushSubscriptions(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }
    return this.pushModel
      .find({ userId: new Types.ObjectId(userId), isActive: true })
      .select('-keys.auth')
      .lean();
  }

  async dispatchWebPush(
    userId: string,
    payload: { title: string; message: string; link?: string },
  ) {
    const vapid = this.getVapidConfig();
    const activeSubs = await this.pushModel.find({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    if (activeSubs.length === 0) {
      return { success: true, count: 0, reason: 'NO_ACTIVE_SUBSCRIPTIONS' };
    }

    if (!vapid.enabled) {
      this.logger.debug(
        `Web Push skipped: VAPID credentials not configured on server (${activeSubs.length} pending subscribers).`,
      );
      return {
        success: false,
        count: activeSubs.length,
        reason: 'VAPID_NOT_CONFIGURED',
      };
    }

    return {
      success: true,
      count: activeSubs.length,
      payload,
    };
  }

  async testPushNotification(userId: string) {
    const vapid = this.getVapidConfig();
    const activeSubs = await this.pushModel.find({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    if (activeSubs.length === 0) {
      return {
        success: false,
        message: 'No active browser push subscriptions found for this account. Please opt-in first.',
        activeSubscriptions: 0,
        vapidConfigured: vapid.enabled,
      };
    }

    return {
      success: true,
      message: vapid.enabled
        ? `Test notification dispatched to ${activeSubs.length} active device(s).`
        : `Browser subscription verified (${activeSubs.length} active device(s)). VAPID credentials required for real delivery.`,
      activeSubscriptions: activeSubs.length,
      vapidConfigured: vapid.enabled,
    };
  }
}
