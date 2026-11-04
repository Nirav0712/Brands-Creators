import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'RATE_LIMIT_OPTIONS';

export interface RateLimitOptions {
  limit: number;
  ttlSeconds: number;
  keyPrefix?: string;
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
