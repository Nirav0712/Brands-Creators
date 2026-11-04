import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  ISocialOAuthAdapter,
  OAuthInitResult,
  OAuthTokens,
  OfficialProfileData,
} from './social-oauth-adapter.interface';

@Injectable()
export class YouTubeDataAdapter implements ISocialOAuthAdapter {
  private readonly logger = new Logger(YouTubeDataAdapter.name);

  private readonly clientId = process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '';
  private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '';

  getProviderName(): string {
    return 'YouTube Data API v3';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  getBlockerReason(): string | null {
    if (!this.isConfigured()) {
      return (
        'Google Cloud Console OAuth 2.0 Client credentials and YouTube Data API v3 Quota approval required. ' +
        'Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables to enable live OAuth.'
      );
    }
    return null;
  }

  generateAuthUrl(userId: string, redirectUri: string, state: string): OAuthInitResult {
    const configured = this.isConfigured();
    if (!configured) {
      return {
        authUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=SIMULATED_GOOGLE_CLIENT_ID&redirect_uri=${encodeURIComponent(
          redirectUri,
        )}&response_type=code&scope=${encodeURIComponent(
          'https://www.googleapis.com/auth/youtube.readonly',
        )}&access_type=offline&prompt=consent&state=${state}`,
        state,
        configured: false,
        requiresAppReview: true,
        blockerReason: this.getBlockerReason() || undefined,
        isSimulated: true,
      };
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&response_type=code&scope=${encodeURIComponent(
      'https://www.googleapis.com/auth/youtube.readonly',
    )}&access_type=offline&prompt=consent&state=${state}`;

    return {
      authUrl,
      state,
      configured: true,
      requiresAppReview: true,
      isSimulated: false,
    };
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    // Simulated sandbox flow when real Google credentials are not yet approved by Google verification
    if (code.startsWith('simulated_') || !this.isConfigured()) {
      return {
        accessToken: `simulated_yt_access_${Date.now()}`,
        refreshToken: `simulated_yt_refresh_${Date.now()}`,
        expiresIn: 3600,
        tokenType: 'bearer',
      };
    }

    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('client_id', this.clientId);
      bodyParams.append('client_secret', this.clientSecret);
      bodyParams.append('code', code);
      bodyParams.append('grant_type', 'authorization_code');
      bodyParams.append('redirect_uri', redirectUri);

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error_description || `Google token exchange failed with HTTP ${res.status}`);
      }

      const tokenData = await res.json();
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type,
      };
    } catch (err: any) {
      this.logger.warn(`YouTube token exchange failed: ${err.message}`);
      throw new BadRequestException(`Google OAuth 2.0 token exchange failed: ${err.message}`);
    }
  }

  async fetchProfileData(accessToken: string): Promise<OfficialProfileData> {
    const isSimulated = accessToken.startsWith('simulated_');

    if (isSimulated || !this.isConfigured()) {
      return {
        platformUserId: `yt_channel_${Date.now()}`,
        handle: '@creator_youtube',
        profileUrl: 'https://youtube.com/@creator_youtube',
        metrics: {
          subscribers: 45000,
          postsCount: 82,
          followers: 45000,
        },
        isSimulated: true,
        rawVerificationDetails:
          'SIMULATED_INTEGRATION: Official Google Cloud verification pending OAuth Consent Screen approval.',
      };
    }

    try {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!res.ok) {
        throw new Error(`YouTube Data API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const channel = data.items?.[0];
      if (!channel) {
        throw new Error('No YouTube channel found for this authenticated Google account');
      }

      const stats = channel.statistics || {};
      const customUrl = channel.snippet?.customUrl ? `@${channel.snippet.customUrl.replace(/^@/, '')}` : `@channel_${channel.id}`;

      return {
        platformUserId: channel.id,
        handle: customUrl,
        profileUrl: `https://youtube.com/${channel.snippet?.customUrl || `channel/${channel.id}`}`,
        metrics: {
          subscribers: Number(stats.subscriberCount) || 0,
          postsCount: Number(stats.videoCount) || 0,
          followers: Number(stats.subscriberCount) || 0,
        },
        isSimulated: false,
        rawVerificationDetails: `OFFICIAL_YOUTUBE_DATA_V3: channelId=${channel.id}`,
      };
    } catch (err: any) {
      this.logger.warn(`YouTube Data API channel fetch failed: ${err.message}`);
      throw new BadRequestException(`Failed to retrieve official YouTube channel data: ${err.message}`);
    }
  }

  async revokeToken(accessToken: string): Promise<boolean> {
    if (accessToken.startsWith('simulated_')) {
      return true;
    }
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return true;
    } catch {
      return false;
    }
  }
}
