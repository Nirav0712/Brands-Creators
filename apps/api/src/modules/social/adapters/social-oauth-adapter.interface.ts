export interface OAuthInitResult {
  authUrl: string;
  state: string;
  configured: boolean;
  requiresAppReview: boolean;
  blockerReason?: string;
  isSimulated?: boolean;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface OfficialProfileData {
  platformUserId: string;
  handle: string;
  profileUrl: string;
  metrics: {
    followers?: number;
    subscribers?: number;
    postsCount?: number;
    following?: number;
    engagementRate?: number;
  };
  isSimulated: boolean;
  rawVerificationDetails: string;
}

export interface ISocialOAuthAdapter {
  getProviderName(): string;
  isConfigured(): boolean;
  getBlockerReason(): string | null;
  generateAuthUrl(userId: string, redirectUri: string, state: string): OAuthInitResult;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>;
  fetchProfileData(accessToken: string): Promise<OfficialProfileData>;
  revokeToken(accessToken: string): Promise<boolean>;
}
