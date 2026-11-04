import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminOrCronGuard } from '../notifications/guards/admin-or-cron.guard';
import { UserRole, SubscriptionStatus } from '@brands-creators/types';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscribeFreeDto,
} from './dto/subscriptions.dto';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get active marketplace subscription plans' })
  async getActivePlans(@Query('role') role?: UserRole) {
    return this.subscriptionsService.getActivePlans(role);
  }

  @Get('my-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current active subscription of authenticated user' })
  async getMySubscription(@CurrentUser() user: any) {
    return this.subscriptionsService.getUserActiveSubscription(user._id.toString());
  }

  @Post('subscribe-free')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to a free plan without payment' })
  async subscribeFree(@CurrentUser() user: any, @Body() dto: SubscribeFreeDto) {
    return this.subscriptionsService.subscribeFreePlan(user._id.toString(), dto.planId);
  }

  @Post('cancel/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel active subscription' })
  async cancelMySubscription(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.subscriptionsService.cancelSubscription(user._id.toString(), id, reason);
  }

  // ================= ADMIN ENDPOINTS =================

  @Get('admin/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all subscription plans including drafts (Admin)' })
  async getAdminPlans() {
    return this.subscriptionsService.getAllPlans();
  }

  @Post('admin/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new subscription plan (Admin)' })
  async createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Patch('admin/plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription plan details (Admin)' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Patch('admin/plans/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate or deactivate subscription plan (Admin)' })
  async togglePlan(@Param('id') id: string) {
    return this.subscriptionsService.togglePlanStatus(id);
  }

  @Get('admin/subscribers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query subscriber history and active assignments (Admin)' })
  async getSubscribers(
    @Query('planId') planId?: string,
    @Query('status') status?: SubscriptionStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.subscriptionsService.getSubscribers({
      planId,
      status,
      page,
      limit,
    });
  }

  @Post('admin/revoke/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke user subscription with recorded administrative reason (Admin)' })
  async revokeSubscription(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.subscriptionsService.adminRevokeSubscription(id, admin._id.toString(), reason);
  }

  @Post('admin/process-expirations')
  @UseGuards(AdminOrCronGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger automated subscription expiration check and renewal reminders (Admin or Cron)' })
  async triggerProcessExpirations() {
    return this.subscriptionsService.processExpiredSubscriptions();
  }
}

