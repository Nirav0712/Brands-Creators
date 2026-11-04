import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BrandsService } from './brands.service';
import {
  BrandFilterDto,
  UpdateBrandProfileDto,
  InviteBrandTeamMemberDto,
  AcceptBrandTeamInvitationDto,
} from './dto/brand.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { UserRole, VerificationStatus } from '@brands-creators/types';

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter brand companies' })
  async getBrands(@Query() filter: BrandFilterDto) {
    return this.brandsService.findAll(filter);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged-in brand profile' })
  async getMyProfile(@CurrentUser() user: UserDocument): Promise<any> {
    return this.brandsService.findByUserId(user._id.toString());
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get live aggregated campaign analytics for authenticated brand' })
  async getAnalytics(@CurrentUser() user: UserDocument) {
    return this.brandsService.getBrandAnalytics(user._id.toString());
  }

  @Get('team')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List brand team members for enterprise collaboration' })
  async getTeamMembers(@CurrentUser() user: UserDocument) {
    return this.brandsService.getTeamMembers(user._id.toString());
  }

  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('team/invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.AGENCY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a collaborator to brand enterprise workspace' })
  async inviteTeamMember(@CurrentUser() user: UserDocument, @Body() dto: InviteBrandTeamMemberDto) {
    return this.brandsService.inviteTeamMember(user._id.toString(), dto);
  }

  @Get('team/invitation/:token')
  @ApiOperation({ summary: 'Preview team invitation details by token' })
  async getInvitation(@Param('token') token: string) {
    return this.brandsService.getInvitationByToken(token);
  }

  @Post('team/accept-invite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept team invitation and join brand workspace' })
  async acceptInvitation(
    @CurrentUser() user: UserDocument,
    @Body() dto: AcceptBrandTeamInvitationDto,
  ) {
    return this.brandsService.acceptInvitation(user._id.toString(), dto.inviteToken);
  }

  @Patch('team/:memberId/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a pending team invitation' })
  async revokeInvitation(@CurrentUser() user: UserDocument, @Param('memberId') memberId: string) {
    return this.brandsService.revokeTeamMember(user._id.toString(), memberId);
  }

  @Delete('team/:memberId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a team member from brand workspace' })
  async removeTeamMember(@CurrentUser() user: UserDocument, @Param('memberId') memberId: string) {
    return this.brandsService.removeTeamMember(user._id.toString(), memberId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get brand profile by slug' })
  async getBrandBySlug(@Param('slug') slug: string): Promise<any> {
    return this.brandsService.findBySlug(slug);
  }


  @Post('me/draft')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save brand onboarding draft progress' })
  async saveDraft(@CurrentUser() user: UserDocument, @Body() dto: Partial<UpdateBrandProfileDto>) {
    return this.brandsService.saveDraft(user._id.toString(), dto);
  }

  @Post('me/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish brand profile' })
  async publishProfile(@CurrentUser() user: UserDocument) {
    return this.brandsService.publishProfile(user._id.toString());
  }

  @Post('me/pause')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause brand profile' })
  async pauseProfile(@CurrentUser() user: UserDocument) {
    return this.brandsService.pauseProfile(user._id.toString());
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update brand company profile' })
  async updateProfile(@CurrentUser() user: UserDocument, @Body() dto: UpdateBrandProfileDto) {
    return this.brandsService.updateProfile(user._id.toString(), dto);
  }

  // Admin Moderation Routes
  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update brand verification status (Admin only)' })
  async updateVerification(
    @Param('id') id: string,
    @Body('status') status: VerificationStatus,
  ) {
    return this.brandsService.updateVerification(id, status);
  }

  @Patch(':id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend brand profile (Admin only)' })
  async suspendProfile(@Param('id') id: string) {
    return this.brandsService.suspendProfile(id);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore brand profile (Admin only)' })
  async restoreProfile(@Param('id') id: string) {
    return this.brandsService.restoreProfile(id);
  }
}

