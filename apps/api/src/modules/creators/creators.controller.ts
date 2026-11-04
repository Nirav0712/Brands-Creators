import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreatorsService } from './creators.service';
import {
  CreatorFilterDto,
  UpdateCreatorProfileDto,
  AddPortfolioItemDto,
  AddCollaborationDto,
} from './dto/creator.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { UserRole, VerificationStatus } from '@brands-creators/types';

@ApiTags('Creators')
@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get()
  @ApiOperation({ summary: 'Search and filter creative professionals, influencers & talent' })
  async getCreators(@Query() filter: CreatorFilterDto) {
    return this.creatorsService.findAll(filter);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged-in creator profile with completion score' })
  async getMyProfile(@CurrentUser() user: UserDocument): Promise<any> {
    return this.creatorsService.findByUserId(user._id.toString());
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find creators nearby specified geospatial coordinates or city' })
  async getNearbyCreators(
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('radiusKm') radiusKm?: number,
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('limit') limit?: number,
  ) {
    return this.creatorsService.findNearby({
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
      category,
      city,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get public creator profile by slug' })
  async getCreatorBySlug(@Param('slug') slug: string): Promise<any> {
    return this.creatorsService.findBySlug(slug);
  }


  @Post('me/draft')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save onboarding draft progress (autosave)' })
  async saveDraft(@CurrentUser() user: UserDocument, @Body() dto: Partial<UpdateCreatorProfileDto>) {
    return this.creatorsService.saveDraft(user._id.toString(), dto);
  }

  @Post('me/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish creator profile to public directory' })
  async publishProfile(@CurrentUser() user: UserDocument) {
    return this.creatorsService.publishProfile(user._id.toString());
  }

  @Post('me/pause')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause creator profile visibility' })
  async pauseProfile(@CurrentUser() user: UserDocument) {
    return this.creatorsService.pauseProfile(user._id.toString());
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current creator profile' })
  async updateProfile(@CurrentUser() user: UserDocument, @Body() dto: UpdateCreatorProfileDto) {
    return this.creatorsService.updateProfile(user._id.toString(), dto);
  }

  @Post('me/portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add portfolio item to creator profile' })
  async addPortfolio(@CurrentUser() user: UserDocument, @Body() dto: AddPortfolioItemDto) {
    return this.creatorsService.addPortfolioItem(user._id.toString(), dto);
  }

  @Patch('me/portfolio/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder portfolio items' })
  async reorderPortfolio(@CurrentUser() user: UserDocument, @Body('itemIds') itemIds: string[]) {
    return this.creatorsService.reorderPortfolio(user._id.toString(), itemIds);
  }

  @Patch('me/portfolio/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update portfolio item' })
  async updatePortfolio(
    @CurrentUser() user: UserDocument,
    @Param('itemId') itemId: string,
    @Body() dto: Partial<AddPortfolioItemDto>,
  ) {
    return this.creatorsService.updatePortfolioItem(user._id.toString(), itemId, dto);
  }

  @Delete('me/portfolio/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove portfolio item from creator profile' })
  async removePortfolio(@CurrentUser() user: UserDocument, @Param('itemId') itemId: string) {
    return this.creatorsService.removePortfolioItem(user._id.toString(), itemId);
  }

  @Post('me/collaborations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add previous brand collaboration' })
  async addCollaboration(@CurrentUser() user: UserDocument, @Body() dto: AddCollaborationDto) {
    return this.creatorsService.addCollaboration(user._id.toString(), dto);
  }

  @Delete('me/collaborations/:collabId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove brand collaboration' })
  async removeCollaboration(@CurrentUser() user: UserDocument, @Param('collabId') collabId: string) {
    return this.creatorsService.removeCollaboration(user._id.toString(), collabId);
  }

  // Admin Moderation Routes
  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update verification status (Admin only)' })
  async updateVerification(
    @Param('id') id: string,
    @Body('status') status: VerificationStatus,
  ) {
    return this.creatorsService.updateVerification(id, status);
  }

  @Patch(':id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend creator profile (Admin only)' })
  async suspendProfile(@Param('id') id: string) {
    return this.creatorsService.suspendProfile(id);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore creator profile (Admin only)' })
  async restoreProfile(@Param('id') id: string) {
    return this.creatorsService.restoreProfile(id);
  }

  @Patch(':id/feature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle featured status (Admin only)' })
  async toggleFeatured(@Param('id') id: string) {
    return this.creatorsService.toggleFeatured(id);
  }
}

