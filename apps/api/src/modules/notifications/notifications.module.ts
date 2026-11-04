import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from './schemas/notification-preference.schema';
import {
  EmailDeliveryJob,
  EmailDeliveryJobSchema,
} from './schemas/email-delivery.schema';
import {
  PushSubscription,
  PushSubscriptionSchema,
} from './schemas/push-subscription.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NotificationsService } from './notifications.service';
import {
  NotificationsController,
  NotificationPreferencesController,
  AdminNotificationsController,
} from './notifications.controller';
import { EmailQueueService } from './email/email-queue.service';
import { SmtpEmailProvider } from './email/providers/smtp.provider';
import { MessagingModule } from '../messaging/messaging.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { JwtModule } from '@nestjs/jwt';
import { AdminOrCronGuard } from './guards/admin-or-cron.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
      { name: EmailDeliveryJob.name, schema: EmailDeliveryJobSchema },
      { name: PushSubscription.name, schema: PushSubscriptionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => MessagingModule),
    AuditLogsModule,
    JwtModule,
  ],
  controllers: [
    NotificationsController,
    NotificationPreferencesController,
    AdminNotificationsController,
  ],
  providers: [
    NotificationsService,
    EmailQueueService,
    SmtpEmailProvider,
    AdminOrCronGuard,
  ],
  exports: [
    NotificationsService,
    EmailQueueService,
    SmtpEmailProvider,
    AdminOrCronGuard,
  ],
})
export class NotificationsModule {}
