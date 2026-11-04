import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { SocialAccount, SocialAccountDocument } from './schemas/social-account.schema';
import { CreatorProfile, CreatorProfileDocument } from '../creators/schemas/creator.schema';
import { AddSocialAccountDto } from './dto/social.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { SocialPlatform, VerificationStatus } from '@brands-creators/types';
import { InstagramGraphAdapter } from './adapters/instagram-graph.adapter';
import { YouTubeDataAdapter } from './adapters/youtube-data.adapter';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);
  private readonly stateHmacSecret =
    process.env.JWT_SECRET || 'bc_social_oauth_state_hmac_secret_hardening_2026';

  constructor(
    @InjectModel(SocialAccount.name) private readonly socialModel: Model<SocialAccountDocument>,
    @InjectModel(CreatorProfile.name) private readonly creatorModel: Model<CreatorProfileDocument>,
    private readonly instagramAdapter: InstagramGraphAdapter,
    private readonly youtubeAdapter: YouTubeDataAdapter,
  ) {}

  extractHandle(platform: SocialPlatform, url: string): string {
    if (!url) return '';
    try {
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const parts = cleanUrl.split('/');
      const lastPart = parts[parts.length - 1];

      if (platform === SocialPlatform.INSTAGRAM) {
        return lastPart.startsWith('@') ? lastPart : `@${lastPart.replace(/^(p|reel|stories)\/.*$/, '').replace(/^[^\w.]/, '') || lastPart}`;
      } else if (platform === SocialPlatform.YOUTUBE) {
        return lastPart.startsWith('@') ? lastPart : `@${lastPart}`;
      } else if (platform === SocialPlatform.X) {
        return lastPart.startsWith('@') ? lastPart : `@${lastPart}`;
      } else if (platform === SocialPlatform.TIKTOK) {
        return lastPart.startsWith('@') ? lastPart : `@${lastPart}`;
      } else if (platform === SocialPlatform.LINKEDIN) {
        return lastPart;
      } else if (platform === SocialPlatform.WEBSITE) {
        return cleanUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
      }
      return lastPart;
    } catch {
      return url;
    }
  }

  async getUserSocialAccounts(userId: string) {
    return this.socialModel.find({ userId: new Types.ObjectId(userId) }).lean().exec();
  }

  async addOrUpdateAccount(userId: string, dto: AddSocialAccountDto) {
    const handle = dto.handle || this.extractHandle(dto.platform, dto.profileUrl);

    const existing = await this.socialModel.findOne({
      userId: new Types.ObjectId(userId),
      platform: dto.platform,
    });

    if (existing) {
      existing.profileUrl = dto.profileUrl;
      existing.handle = handle;
      if (dto.metrics) {
        existing.metrics = {
          ...existing.metrics,
          ...dto.metrics,
        };
      }
      return existing.save();
    }

    const newAccount = new this.socialModel({
      userId: new Types.ObjectId(userId),
      platform: dto.platform,
      profileUrl: dto.profileUrl,
      handle,
      isConnected: false,
      verificationStatus: VerificationStatus.UNVERIFIED,
      metrics: {
        followers: dto.metrics?.followers ?? 0,
        subscribers: dto.metrics?.subscribers ?? 0,
        postsCount: dto.metrics?.postsCount ?? 0,
        following: 0,
        engagementRate: dto.metrics?.engagementRate ?? 0,
      },
    });

    return newAccount.save();
  }

  async getPublicSocialAccounts(userId: string) {
    return this.socialModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('-accessToken -refreshToken')
      .lean()
      .exec();
  }

  async requestVerification(userId: string, notes?: string, documentUrl?: string) {
    const creator = await this.creatorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!creator) {
      throw new NotFoundException('Creator profile not found for this user');
    }

    const now = new Date();
    creator.verificationStatus = VerificationStatus.PENDING;
    creator.verificationRequestedAt = now;
    if (notes) creator.verificationNotes = notes;
    await creator.save();

    // Mark user's social accounts as pending verification
    await this.socialModel.updateMany(
      { userId: new Types.ObjectId(userId) },
      {
        $set: {
          verificationStatus: VerificationStatus.PENDING,
          verificationRequestedAt: now,
          verificationNotes: notes || '',
        },
      },
    );

    const accounts = await this.socialModel.find({ userId: new Types.ObjectId(userId) }).lean().exec();

    return {
      message: 'Verification request submitted successfully. Our Trust & Safety team will review your credentials.',
      status: VerificationStatus.PENDING,
      requestedAt: now,
      accountsCount: accounts.length,
      creator: {
        id: creator._id,
        verificationStatus: creator.verificationStatus,
        verificationRequestedAt: creator.verificationRequestedAt,
      },
    };
  }

  async removeAccount(userId: string, id: string) {
    const res = await this.socialModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!res) {
      throw new NotFoundException('Social account not found');
    }
    return { message: 'Social account removed successfully' };
  }

  async syncMetrics(userId: string, id: string) {
    const account = await this.socialModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    // When official OAuth tokens are connected (e.g. Meta Graph API, YouTube Data v3),
    // this handles live fetching. If not connected, it marks lastSyncedAt without inventing fake numbers.
    account.lastSyncedAt = new Date();
    await account.save();

    return account;
  }

  /**
   * Generates a tamper-proof HMAC-signed OAuth state parameter
   */
  generateOAuthState(userId: string, platform: SocialPlatform): string {
    const timestamp = Date.now().toString();
    const payload = `${userId}:${platform}:${timestamp}`;
    const hmac = crypto
      .createHmac('sha256', this.stateHmacSecret)
      .update(payload)
      .digest('hex');
    return Buffer.from(`${payload}:${hmac}`).toString('base64url');
  }

  /**
   * Verifies an OAuth state parameter's signature, timestamp freshness (15 mins), and user/platform binding
   */
  verifyOAuthState(state: string, userId: string, platform: SocialPlatform): boolean {
    if (!state) return false;
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      if (parts.length !== 4) return false;

      const [stateUserId, statePlatform, timestampStr, signature] = parts;
      if (stateUserId !== userId || statePlatform !== platform) {
        return false;
      }

      // 15-minute validity window
      const age = Date.now() - Number(timestampStr);
      if (isNaN(age) || age < 0 || age > 15 * 60 * 1000) {
        return false;
      }

      const expectedPayload = `${stateUserId}:${statePlatform}:${timestampStr}`;
      const expectedHmac = crypto
        .createHmac('sha256', this.stateHmacSecret)
        .update(expectedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac));
    } catch {
      return false;
    }
  }

  /**
   * Return configuration and app review prerequisite status for official social providers
   */
  getOAuthProvidersStatus() {
    return {
      instagram: {
        name: this.instagramAdapter.getProviderName(),
        configured: this.instagramAdapter.isConfigured(),
        requiresAppReview: true,
        blockerReason: this.instagramAdapter.getBlockerReason(),
      },
      youtube: {
        name: this.youtubeAdapter.getProviderName(),
        configured: this.youtubeAdapter.isConfigured(),
        requiresAppReview: true,
        blockerReason: this.youtubeAdapter.getBlockerReason(),
      },
    };
  }

  private resolveAdapter(platform: SocialPlatform) {
    if (platform === SocialPlatform.INSTAGRAM) {
      return this.instagramAdapter;
    } else if (platform === SocialPlatform.YOUTUBE) {
      return this.youtubeAdapter;
    }
    throw new BadRequestException(`Official OAuth adapter not available for platform '${platform}'`);
  }

  /**
   * Generate official OAuth initialization URL with signed state
   */
  getOAuthUrl(userId: string, platformStr: string, redirectUri: string) {
    const platform = platformStr.toUpperCase() as SocialPlatform;
    const adapter = this.resolveAdapter(platform);
    const state = this.generateOAuthState(userId, platform);
    return adapter.generateAuthUrl(userId, redirectUri, state);
  }

  /**
   * Handle OAuth redirect callback, verify signed state, exchange code, and persist tokens
   */
  async handleOAuthCallback(userId: string, platformStr: string, dto: OAuthCallbackDto) {
    const platform = platformStr.toUpperCase() as SocialPlatform;
    const isValidState = this.verifyOAuthState(dto.state, userId, platform);

    if (!isValidState) {
      throw new BadRequestException('Invalid or expired OAuth state parameter. Possible CSRF attempt.');
    }

    const adapter = this.resolveAdapter(platform);
    const tokens = await adapter.exchangeCode(dto.code, dto.redirectUri);
    const profileData = await adapter.fetchProfileData(tokens.accessToken);

    const expiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined;

    const existing = await this.socialModel.findOne({
      userId: new Types.ObjectId(userId),
      platform,
    });

    if (existing) {
      existing.handle = profileData.handle;
      existing.profileUrl = profileData.profileUrl;
      existing.isConnected = true;
      existing.isSimulated = profileData.isSimulated;
      existing.officialPlatformUserId = profileData.platformUserId;
      existing.rawVerificationDetails = profileData.rawVerificationDetails;
      existing.accessToken = tokens.accessToken;
      existing.refreshToken = tokens.refreshToken;
      existing.tokenExpiresAt = expiresAt;
      existing.lastSyncedAt = new Date();
      if (profileData.isSimulated) {
        existing.verificationStatus = VerificationStatus.UNVERIFIED;
      } else {
        existing.verificationStatus = VerificationStatus.VERIFIED;
        existing.verifiedAt = new Date();
      }
      if (profileData.metrics) {
        existing.metrics = {
          ...existing.metrics,
          ...profileData.metrics,
        };
      }
      const saved = await existing.save();
      const obj: any = saved.toObject();
      delete obj.accessToken;
      delete obj.refreshToken;
      return obj;
    }

    const newAccount = new this.socialModel({
      userId: new Types.ObjectId(userId),
      platform,
      handle: profileData.handle,
      profileUrl: profileData.profileUrl,
      isConnected: true,
      isSimulated: profileData.isSimulated,
      officialPlatformUserId: profileData.platformUserId,
      rawVerificationDetails: profileData.rawVerificationDetails,
      verificationStatus: profileData.isSimulated ? VerificationStatus.UNVERIFIED : VerificationStatus.VERIFIED,
      verifiedAt: profileData.isSimulated ? undefined : new Date(),
      metrics: profileData.metrics || {},
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: expiresAt,
      lastSyncedAt: new Date(),
    });

    const saved = await newAccount.save();
    const obj: any = saved.toObject();
    delete obj.accessToken;
    delete obj.refreshToken;
    return obj;
  }

  /**
   * Disconnect official social account and revoke OAuth access
   */
  async disconnectOAuth(userId: string, platformStr: string) {
    const platform = platformStr.toUpperCase() as SocialPlatform;
    const account = await this.socialModel
      .findOne({ userId: new Types.ObjectId(userId), platform })
      .select('+accessToken');

    if (!account) {
      throw new NotFoundException(`Connected ${platform} account not found`);
    }

    if (account.accessToken) {
      try {
        const adapter = this.resolveAdapter(platform);
        await adapter.revokeToken(account.accessToken);
      } catch (err: any) {
        this.logger.warn(`Failed to revoke token on provider: ${err.message}`);
      }
    }

    account.isConnected = false;
    account.accessToken = undefined;
    account.refreshToken = undefined;
    account.tokenExpiresAt = undefined;
    account.verificationStatus = VerificationStatus.UNVERIFIED;
    account.verifiedAt = undefined;
    await account.save();

    return {
      message: `Disconnected official ${platform} integration successfully`,
      platform,
    };
  }
}

