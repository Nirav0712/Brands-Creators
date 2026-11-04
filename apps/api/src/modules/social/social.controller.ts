import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { AddSocialAccountDto } from './dto/social.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Social')
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('oauth/status')
  @ApiOperation({ summary: 'Get configuration and approval status of official social OAuth providers' })
  getOAuthStatus() {
    return this.socialService.getOAuthProvidersStatus();
  }

  @Get('oauth/:platform/url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate official OAuth redirect URL with signed state' })
  getOAuthUrl(
    @CurrentUser() user: UserDocument,
    @Param('platform') platform: string,
    @Query('redirectUri') redirectUri?: string,
  ) {
    const fallbackRedirect = `${process.env.APP_URL || 'http://localhost:3000'}/settings/social/callback`;
    return this.socialService.getOAuthUrl(
      user._id.toString(),
      platform,
      redirectUri || fallbackRedirect,
    );
  }

  @Post('oauth/:platform/callback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Handle official OAuth redirect callback and securely link tokens' })
  handleOAuthCallback(
    @CurrentUser() user: UserDocument,
    @Param('platform') platform: string,
    @Body() dto: OAuthCallbackDto,
  ) {
    return this.socialService.handleOAuthCallback(user._id.toString(), platform, dto);
  }

  @Post('oauth/:platform/disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke and disconnect official OAuth integration' })
  disconnectOAuth(
    @CurrentUser() user: UserDocument,
    @Param('platform') platform: string,
  ) {
    return this.socialService.disconnectOAuth(user._id.toString(), platform);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get connected social accounts for logged in user' })
  async getMySocialAccounts(@CurrentUser() user: UserDocument) {
    return this.socialService.getUserSocialAccounts(user._id.toString());
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add or update social account link' })
  async addSocialAccount(@CurrentUser() user: UserDocument, @Body() dto: AddSocialAccountDto) {
    return this.socialService.addOrUpdateAccount(user._id.toString(), dto);
  }

  @Post('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add or update social account link (alias)' })
  async addSocialAccountAlias(@CurrentUser() user: UserDocument, @Body() dto: AddSocialAccountDto) {
    return this.socialService.addOrUpdateAccount(user._id.toString(), dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove social account' })
  async removeSocialAccount(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.socialService.removeAccount(user._id.toString(), id);
  }

  @Post(':id/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger synchronization for social metrics' })
  async syncSocialMetrics(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.socialService.syncMetrics(user._id.toString(), id);
  }

  @Post('request-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request profile and social channels verification' })
  async requestVerification(
    @CurrentUser() user: UserDocument,
    @Body() body: { notes?: string; documentUrl?: string },
  ) {
    return this.socialService.requestVerification(user._id.toString(), body.notes, body.documentUrl);
  }

  @Get('public/:userId')
  @ApiOperation({ summary: 'Get verified public social accounts for a user/creator profile' })
  async getPublicAccounts(@Param('userId') userId: string) {
    return this.socialService.getPublicSocialAccounts(userId);
  }
}
