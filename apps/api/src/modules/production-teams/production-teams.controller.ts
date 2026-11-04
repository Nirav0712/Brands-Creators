import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductionTeamsService } from './production-teams.service';
import { ProductionFilterDto, UpdateProductionProfileDto } from './dto/production-team.dto';
import { AddPortfolioItemDto } from '../creators/dto/creator.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { UserRole, VerificationStatus } from '@brands-creators/types';

@ApiTags('Production Teams')
@Controller('production-teams')
export class ProductionTeamsController {
  constructor(private readonly prodService: ProductionTeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter production houses, studios & crews' })
  async getProductionTeams(@Query() filter: ProductionFilterDto) {
    return this.prodService.findAll(filter);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged-in production team profile' })
  async getMyProfile(@CurrentUser() user: UserDocument) {
    return this.prodService.findByUserId(user._id.toString());
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get production team profile by slug' })
  async getProductionTeamBySlug(@Param('slug') slug: string) {
    return this.prodService.findBySlug(slug);
  }

  @Post('me/draft')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save production studio onboarding draft' })
  async saveDraft(@CurrentUser() user: UserDocument, @Body() dto: Partial<UpdateProductionProfileDto>) {
    return this.prodService.saveDraft(user._id.toString(), dto);
  }

  @Post('me/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish production studio profile' })
  async publishProfile(@CurrentUser() user: UserDocument) {
    return this.prodService.publishProfile(user._id.toString());
  }

  @Post('me/pause')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause production studio profile' })
  async pauseProfile(@CurrentUser() user: UserDocument) {
    return this.prodService.pauseProfile(user._id.toString());
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update production studio profile' })
  async updateProfile(@CurrentUser() user: UserDocument, @Body() dto: UpdateProductionProfileDto) {
    return this.prodService.updateProfile(user._id.toString(), dto);
  }

  @Post('me/portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add portfolio item to production studio profile' })
  async addPortfolio(@CurrentUser() user: UserDocument, @Body() dto: AddPortfolioItemDto) {
    return this.prodService.addPortfolioItem(user._id.toString(), dto);
  }

  @Delete('me/portfolio/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove portfolio item from production studio profile' })
  async removePortfolio(@CurrentUser() user: UserDocument, @Param('itemId') itemId: string) {
    return this.prodService.removePortfolioItem(user._id.toString(), itemId);
  }

  // Admin Moderation Routes
  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update production studio verification status (Admin only)' })
  async updateVerification(
    @Param('id') id: string,
    @Body('status') status: VerificationStatus,
  ) {
    return this.prodService.updateVerification(id, status);
  }

  @Patch(':id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend production studio profile (Admin only)' })
  async suspendProfile(@Param('id') id: string) {
    return this.prodService.suspendProfile(id);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore production studio profile (Admin only)' })
  async restoreProfile(@Param('id') id: string) {
    return this.prodService.restoreProfile(id);
  }
}

