import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { EmailQueueService } from './email/email-queue.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, AuditAction } from '@brands-creators/types';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import {
  AdminSendTestEmailDto,
  AdminAnnouncementDto,
  AdminDeliveryQueryDto,
} from './dto/admin-notification.dto';
import { PushSubscribeDto, PushUnsubscribeDto } from './dto/push-subscription.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdminOrCronGuard } from './guards/admin-or-cron.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated notifications and unread count for current user' })
  async getMyNotifications(
    @Request() req: any,
    @Query() query: NotificationQueryDto,
  ): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    return this.notificationsService.getForUser(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread notification count for current user' })
  async getUnreadCount(@Request() req: any): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllRead(@Request() req: any): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markRead(@Request() req: any, @Param('id') id: string): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    return this.notificationsService.markAsRead(userId, id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  async getPreferences(@Request() req: any): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    return this.notificationsService.getPreferences(userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences for current user' })
  async updatePreferences(
    @Request() req: any,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    return this.notificationsService.updatePreferences(userId, dto);
  }

  @Get('push/vapid-key')
  @ApiOperation({ summary: 'Get server public VAPID key or disabled configuration state' })
  async getVapidKey(): Promise<any> {
    return this.notificationsService.getVapidConfig();
  }

  @Post('push/subscribe')
  @ApiOperation({ summary: 'Opt-in to browser Web Push notifications' })
  async subscribePush(
    @Request() req: any,
    @Body() dto: PushSubscribeDto,
  ): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    return this.notificationsService.subscribePush(userId, dto);
  }

  @Post('push/unsubscribe')
  @ApiOperation({ summary: 'Opt-out of browser Web Push notifications' })
  async unsubscribePush(
    @Request() req: any,
    @Body() dto: PushUnsubscribeDto,
  ): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    return this.notificationsService.unsubscribePush(userId, dto.endpoint);
  }

  @Post('push/test')
  @ApiOperation({ summary: 'Send test Web Push notification to current user devices' })
  async testPush(@Request() req: any): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    return this.notificationsService.testPushNotification(userId);
  }
}

/**
 * Direct route alias for /api/v1/notification-preferences
 */
@ApiTags('Notification Preferences')
@Controller('notification-preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationPreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@Request() req: any): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    return this.notificationsService.getPreferences(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @Request() req: any,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<any> {
    const userId = req.user.sub || req.user.userId || req.user.id;
    return this.notificationsService.updatePreferences(userId, dto);
  }
}

/**
 * Admin Notifications & Delivery Queue Controller
 */
@ApiTags('Admin Notifications')
@Controller('admin/notifications')
@ApiBearerAuth()
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailQueueService: EmailQueueService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get delivery queue health metrics' })
  async getMetrics(): Promise<any> {
    return this.emailQueueService.adminGetMetrics();
  }

  @Get('deliveries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List email delivery jobs with status filters and search' })
  async getDeliveries(@Query() query: AdminDeliveryQueryDto): Promise<any> {
    return this.emailQueueService.adminGetDeliveries(query);
  }

  @Get('deliveries/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get single email delivery job details' })
  async getDeliveryById(@Param('id') id: string): Promise<any> {
    return this.emailQueueService.adminGetDeliveryById(id);
  }

  @Post('deliveries/:id/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retry a failed or dead-letter email delivery job' })
  async retryDelivery(@Request() req: any, @Param('id') id: string): Promise<any> {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    const adminName = req.user.fullName || req.user.email || 'Admin';

    const result = await this.emailQueueService.adminRetryDelivery(id);

    await this.auditLogsService.logAction(
      adminId,
      adminName,
      AuditAction.NOTIFICATION_RETRY,
      'EmailDeliveryJob',
      id,
      `Manually re-queued email delivery job ${id}`,
      req.ip,
    );

    return result;
  }

  @Post('queue/process')
  @UseGuards(AdminOrCronGuard)
  @ApiOperation({ summary: 'Trigger batch queue processing sweep (Admin JWT or x-cron-secret)' })
  async processQueue(@Request() req: any, @Query('limit') limit?: number): Promise<any> {
    const actorId = req.user?.sub || req.user?.userId || req.user?.id || 'cron-system';
    const actorName = req.user?.fullName || req.user?.email || (req.user?.isCron ? 'Hostinger Cron Scheduler' : 'Admin');
    const authType = req.user?.isCron ? 'CRON_SECRET' : 'ADMIN_JWT';

    const result = await this.emailQueueService.adminProcessQueue(limit ? Number(limit) : 20);

    await this.auditLogsService.logAction(
      actorId,
      actorName,
      AuditAction.QUEUE_PROCESSED,
      'EmailQueue',
      'batch',
      `Queue sweep triggered via ${authType}: processed=${result.processed}, success=${result.success}, failed=${result.failed}`,
      req.ip,
    );

    return {
      success: true,
      authType,
      ...result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('test-email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send test email to verified destination' })
  async sendTestEmail(@Request() req: any, @Body() dto: AdminSendTestEmailDto): Promise<any> {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    const adminName = req.user.fullName || req.user.email || 'Admin';

    const result = await this.emailQueueService.adminSendTestEmail(dto.to, dto.subject, dto.message);

    await this.auditLogsService.logAction(
      adminId,
      adminName,
      AuditAction.NOTIFICATION_RETRY,
      'TestEmailDelivery',
      dto.to,
      `Test email sent to destination: ${dto.to}`,
      req.ip,
    );

    return result;
  }

  @Post('announcement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Broadcast platform announcement notification to users' })
  async sendAnnouncement(@Request() req: any, @Body() dto: AdminAnnouncementDto): Promise<any> {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    const adminName = req.user.fullName || req.user.email || 'Admin';

    const result = await this.notificationsService.sendAnnouncement(dto.title, dto.message, dto.targetRole);

    await this.auditLogsService.logAction(
      adminId,
      adminName,
      AuditAction.ANNOUNCEMENT_BROADCAST,
      'PlatformAnnouncement',
      dto.targetRole || 'ALL_USERS',
      `Broadcast platform announcement: "${dto.title}" sent to ${result.sent} recipients`,
      req.ip,
    );

    return result;
  }
}
