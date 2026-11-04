import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreatorProfile, CreatorProfileDocument } from '../creators/schemas/creator.schema';
import { BrandProfile, BrandProfileDocument } from '../brands/schemas/brand.schema';
import { ProductionTeamProfile, ProductionTeamProfileDocument } from '../production-teams/schemas/production-team.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, UpdateMeDto } from './dto/auth.dto';
import { UserRole, UserStatus, AvailabilityStatus, ServiceMode, VerificationStatus } from '@brands-creators/types';
import { EmailQueueService } from '../notifications/email/email-queue.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(CreatorProfile.name) private readonly creatorModel: Model<CreatorProfileDocument>,
    @InjectModel(BrandProfile.name) private readonly brandModel: Model<BrandProfileDocument>,
    @InjectModel(ProductionTeamProfile.name) private readonly productionTeamModel: Model<ProductionTeamProfileDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const normalizedUsername = dto.username.toLowerCase().trim();

    // Check existing email
    const existingEmail = await this.userModel.findOne({ email: normalizedEmail });
    if (existingEmail) {
      throw new ConflictException('An account with this email address already exists.');
    }

    // Check existing username
    const existingUsername = await this.userModel.findOne({ username: normalizedUsername });
    if (existingUsername) {
      throw new ConflictException('This username is already taken. Please pick another.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Generate cryptographic verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user
    const newUser = new this.userModel({
      email: normalizedEmail,
      username: normalizedUsername,
      fullName: dto.fullName.trim(),
      passwordHash,
      roles: [dto.role],
      status: UserStatus.ACTIVE,
      isEmailVerified: false,
      emailVerificationTokenHash,
      emailVerificationExpiresAt,
      onboardingCompleted: false,
      phone: dto.phone?.trim(),
    });

    const savedUser = await newUser.save();

    // Auto-create initial profile based on role
    try {
      if (dto.role === UserRole.CREATOR) {
        // Find default category or create fallback
        let defaultCategory = await this.categoryModel.findOne({ isActive: true });
        if (!defaultCategory) {
          defaultCategory = await this.categoryModel.create({
            name: 'Content Creators & Influencers',
            slug: 'content-creators-influencers',
            description: 'Digital creators, social influencers, and UGC specialists',
            iconName: 'Sparkles',
            isActive: true,
          });
        }

        const creatorProfile = await this.creatorModel.create({
          userId: savedUser._id,
          slug: normalizedUsername,
          headline: `Creative Professional & ${dto.role}`,
          bio: `Hello! I am ${dto.fullName}. Welcome to my creative portfolio.`,
          primaryCategoryId: defaultCategory._id,
          subcategoryIds: [],
          skills: ['Content Creation', 'Storytelling'],
          location: {
            city: 'Mumbai',
            country: 'India',
          },
          languages: ['English', 'Hindi'],
          startingPrice: 5000,
          currency: 'INR',
          serviceMode: ServiceMode.HYBRID,
          availability: AvailabilityStatus.AVAILABLE_NOW,
          experienceYears: 1,
          verificationStatus: VerificationStatus.UNVERIFIED,
          averageRating: 5.0,
          reviewCount: 0,
        });

        savedUser.creatorProfileId = creatorProfile._id as Types.ObjectId;
        await savedUser.save();
      } else if (dto.role === UserRole.BRAND || dto.role === UserRole.AGENCY) {
        const brandProfile = await this.brandModel.create({
          userId: savedUser._id,
          companyName: dto.fullName,
          slug: normalizedUsername,
          tagline: dto.role === UserRole.AGENCY ? 'Creative & Talent Agency' : 'Leading Business & Brand',
          description: `Official profile for ${dto.fullName}.`,
          industry: dto.role === UserRole.AGENCY ? 'Media & Advertising Agency' : 'E-commerce & Consumer Goods',
          location: {
            city: 'Mumbai',
            country: 'India',
          },
          verificationStatus: VerificationStatus.UNVERIFIED,
        });

        savedUser.brandProfileId = brandProfile._id as Types.ObjectId;
        await savedUser.save();
      } else if (dto.role === UserRole.PRODUCTION_TEAM) {
        const prodProfile = await this.productionTeamModel.create({
          userId: savedUser._id,
          studioName: dto.fullName,
          slug: normalizedUsername,
          description: `Full-service production studio led by ${dto.fullName}.`,
          teamSize: 5,
          equipmentRoster: ['4K Cinema Camera', 'Drone', 'Studio Lighting'],
          specialties: ['Commercials', 'Ad Films', 'Brand Videos'],
          location: {
            city: 'Mumbai',
            country: 'India',
          },
          startingDayRate: 25000,
          currency: 'INR',
          verificationStatus: VerificationStatus.UNVERIFIED,
        });

        savedUser.productionTeamProfileId = prodProfile._id as Types.ObjectId;
        await savedUser.save();
      }
    } catch (profileErr) {
      this.logger.error(`Error creating profile shell for user ${savedUser._id}:`, profileErr);
    }

    const tokens = await this.generateTokens(savedUser);
    return {
      message: 'Account registered successfully. Please verify your email.',
      ...tokens,
      verificationToken,
    };
  }

  async login(dto: LoginDto) {
    const loginIdentifier = dto.login.toLowerCase().trim();

    const user = await this.userModel
      .findOne({
        $or: [{ email: loginIdentifier }, { username: loginIdentifier }],
      })
      .select('+passwordHash +refreshTokenHash')
      .exec();

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email/username or password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email/username or password.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);
    return {
      message: 'Logged in successfully',
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.userModel.findById(payload.sub).select('+refreshTokenHash').exec();
      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Invalid refresh session.');
      }

      const isTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isTokenValid) {
        throw new UnauthorizedException('Expired or invalid refresh token.');
      }

      const tokens = await this.generateTokens(user);
      return tokens;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash: null });
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') || '7d',
    });

    // Hash refresh token into database
    const salt = await bcrypt.genSalt(10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, salt);
    await this.userModel.findByIdAndUpdate(user._id, { refreshTokenHash });

    return {
      accessToken,
      refreshToken,
      user: {
        _id: user._id.toString(),
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        roles: user.roles,
        status: user.status,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        creatorProfileId: user.creatorProfileId?.toString(),
        brandProfileId: user.brandProfileId?.toString(),
        productionTeamProfileId: user.productionTeamProfileId?.toString(),
        createdAt: (user as any).createdAt,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email }).exec();

    // Constant response pattern prevents account enumeration attacks
    if (!user) {
      return {
        success: true,
        message: 'If the provided email is registered, a password reset link has been dispatched.',
        expiresIn: '15m',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute validity window

    user.passwordResetTokenHash = resetTokenHash;
    user.passwordResetExpiresAt = expiresAt;
    await user.save();

    this.logger.log(`Password reset token generated for user ${user._id} (${email})`);

    // Durable background queue dispatch
    try {
      await this.emailQueueService.enqueueJob({
        recipientId: user._id as Types.ObjectId,
        recipientEmail: email,
        recipientName: user.fullName || user.username,
        template: 'PASSWORD_RESET',
        subject: 'Reset Your Password — Brands & Creators',
        html: `<p>Hello ${user.fullName || user.username},</p><p>You requested a password reset. Click below to reset your credentials:</p><p><a href="http://localhost:3000/reset-password?token=${resetToken}">Reset Password</a></p><p>This link is single-use and will expire in 15 minutes.</p>`,
        text: `Reset your password: http://localhost:3000/reset-password?token=${resetToken}`,
        metadata: { userId: user._id.toString(), expiresIn: '15m' },
      });
    } catch (err: any) {
      this.logger.warn(`Could not enqueue password reset email: ${err.message}`);
    }

    const isDev = process.env.NODE_ENV !== 'production';
    return {
      success: true,
      message: 'If the provided email is registered, a password reset link has been dispatched.',
      expiresIn: '15m',
      ...(isDev ? { resetToken, resetUrl: `http://localhost:3000/reset-password?token=${resetToken}` } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const token = dto.token.trim();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userModel
      .findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .select('+passwordResetTokenHash +passwordHash')
      .exec();

    if (!user) {
      throw new BadRequestException('Password reset token is invalid or has expired.');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(dto.newPassword, salt);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.refreshTokenHash = undefined; // Invalidate all prior sessions
    await user.save();

    this.logger.log(`Password successfully reset for user ${user._id}`);
    return {
      success: true,
      message: 'Your password has been successfully updated. You may now log in.',
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.userModel.findById(userId).select('+passwordHash').exec();
    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to change password.');
      }
      const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Current password does not match.');
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(dto.newPassword, salt);
      user.refreshTokenHash = undefined; // Force re-authentication on other devices
    }

    if (dto.fullName) user.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone.trim();
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl.trim();

    await user.save();

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
      updatedAt: (user as any).updatedAt,
    };
  }

  async verifyEmail(token: string) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Verification token is required.');
    }
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = await this.userModel.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token.');
    }
    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    return {
      success: true,
      message: 'Email address verified successfully.',
      isEmailVerified: true,
      email: user.email,
    };
  }

  async resendVerification(email: string) {
    const user = await this.userModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return { success: true, message: 'If an account exists, a verification link has been sent.' };
    }
    if (user.isEmailVerified) {
      return { success: true, message: 'Email address is already verified.' };
    }
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    return {
      success: true,
      message: 'Verification email resent.',
      verificationToken,
    };
  }

  async completeOnboarding(userId: string, dto: any) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    user.onboardingCompleted = true;
    if (dto.selectedCategoryIds && Array.isArray(dto.selectedCategoryIds)) {
      user.selectedCategoryIds = dto.selectedCategoryIds
        .filter((id: string) => Types.ObjectId.isValid(id))
        .map((id: string) => new Types.ObjectId(id));
    }
    await user.save();

    // Update role profile if provided
    if (user.creatorProfileId && (dto.location || dto.headline || dto.customFieldValues)) {
      const update: any = {};
      if (dto.location) update.location = dto.location;
      if (dto.headline) update.headline = dto.headline;
      if (dto.bio) update.bio = dto.bio;
      if (dto.customFieldValues) update.customFieldValues = dto.customFieldValues;
      if (dto.selectedCategoryIds && dto.selectedCategoryIds.length > 0 && Types.ObjectId.isValid(dto.selectedCategoryIds[0])) {
        update.primaryCategoryId = new Types.ObjectId(dto.selectedCategoryIds[0]);
      }
      await this.creatorModel.findByIdAndUpdate(user.creatorProfileId, update);
    }

    if (user.brandProfileId && (dto.location || dto.companyName || dto.headline)) {
      const update: any = {};
      if (dto.location) update.location = dto.location;
      if (dto.companyName) update.companyName = dto.companyName;
      if (dto.headline) update.tagline = dto.headline;
      await this.brandModel.findByIdAndUpdate(user.brandProfileId, update);
    }

    if (user.productionTeamProfileId && (dto.location || dto.studioName || dto.headline)) {
      const update: any = {};
      if (dto.location) update.location = dto.location;
      if (dto.studioName) update.studioName = dto.studioName;
      if (dto.headline) update.tagline = dto.headline;
      await this.productionTeamModel.findByIdAndUpdate(user.productionTeamProfileId, update);
    }

    return {
      success: true,
      message: 'Onboarding completed successfully.',
      onboardingCompleted: true,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        onboardingCompleted: true,
        selectedCategoryIds: user.selectedCategoryIds,
      },
    };
  }
}
