import * as crypto from 'crypto';

/**
 * Validates whether the incoming request is permitted to bypass rate limiting.
 *
 * Security Requirements:
 * 1. STRICTLY FORBIDDEN in production: If NODE_ENV === 'production', always returns false.
 * 2. Requires explicit opt-in: ALLOW_RATE_LIMIT_TEST_BYPASS must be 'true'.
 * 3. Requires safe secret: RATE_LIMIT_TEST_BYPASS_SECRET must be configured and at least 16 chars.
 * 4. Timing-attack safe: Compares candidate header against secret with crypto.timingSafeEqual.
 */
export function isAuthorizedRateLimitBypass(headerValue: unknown): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  if (process.env.ALLOW_RATE_LIMIT_TEST_BYPASS !== 'true') {
    return false;
  }

  const configuredSecret = process.env.RATE_LIMIT_TEST_BYPASS_SECRET;
  if (!configuredSecret || configuredSecret.length < 16) {
    return false;
  }

  if (typeof headerValue !== 'string' || headerValue.length !== configuredSecret.length) {
    return false;
  }

  try {
    const bufProvided = Buffer.from(headerValue, 'utf-8');
    const bufSecret = Buffer.from(configuredSecret, 'utf-8');
    return crypto.timingSafeEqual(bufProvided, bufSecret);
  } catch {
    return false;
  }
}
