import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { UserRole, VerificationStatus } from '@brands-creators/types';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard-metrics')
  @ApiOperation({ summary: 'Get overview metrics and system counters for Admin Panel' })
  async getDashboardMetrics() {
    return this.adminService.getDashboardMetrics();
  }

  @Get('verification-queue')
  @ApiOperation({ summary: 'Get creator profiles awaiting identity and skill verification' })
  async getVerificationQueue(): Promise<any> {
    return this.adminService.getVerificationQueue();
  }

  @Post('creators/:id/verify')
  @ApiOperation({ summary: 'Approve or reject creator verification' })
  async verifyCreator(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() body: { status: VerificationStatus; notes?: string },
  ) {
    return this.adminService.verifyCreator(user, id, body.status, body.notes);
  }
}
