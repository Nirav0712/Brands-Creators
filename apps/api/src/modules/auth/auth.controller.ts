import { Controller, Post, Patch, Body, Get, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateMeDto,
  VerifyEmailDto,
  ResendVerificationDto,
  CompleteOnboardingDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account (Brand, Creator, Production Team, Agency)' })
  @SwaggerResponse({ status: 201, description: 'User successfully registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email or username and password' })
  @SwaggerResponse({ status: 200, description: 'Authentication successful with tokens' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh expired access token with valid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile details of the currently authenticated user' })
  async getCurrentUser(@CurrentUser() user: UserDocument) {
    return {
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      roles: user.roles,
      status: user.status,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified,
      onboardingCompleted: user.onboardingCompleted,
      selectedCategoryIds: user.selectedCategoryIds,
      creatorProfileId: user.creatorProfileId?.toString(),
      brandProfileId: user.brandProfileId?.toString(),
      productionTeamProfileId: user.productionTeamProfileId?.toString(),
      createdAt: (user as any).createdAt,
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using verification token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address via URL query link' })
  async verifyEmailQuery(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('onboarding/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete first-time onboarding wizard setup' })
  async completeOnboarding(@CurrentUser() user: UserDocument, @Body() dto: CompleteOnboardingDto) {
    return this.authService.completeOnboarding(user._id.toString(), dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out current session and invalidate refresh token' })
  async logout(@CurrentUser() user: UserDocument) {
    return this.authService.logout(user._id.toString());
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset token and dispatch instructions' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile and credentials of the authenticated user' })
  async updateMe(@CurrentUser() user: UserDocument, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(user._id.toString(), dto);
  }
}
