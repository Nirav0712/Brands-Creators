/**
 * Brands & Creators — Production Secrets Validation & Fail-Fast Guard
 *
 * Enforces cryptographic strength and presence of critical secrets
 * when running in production (NODE_ENV=production).
 *
 * In development and test environments, local default fallbacks are permitted
 * to enable zero-configuration local setup.
 *
 * CRITICAL SECURITY RULES:
 * 1. Never print secret values in logs, stdout, or error messages.
 * 2. Fail with clear error naming the invalid/missing variable only.
 * 3. Never silently generate or hardcode production credentials.
 */

export const INSECURE_DEV_DEFAULTS = new Set([
  'dev_jwt_access_secret_brands_creators_2026',
  'dev_jwt_refresh_secret_brands_creators_2026',
  'dev_cron_secret_brands_creators_2026',
  'dev_session_secret_brands_creators_2026',
  'SuperAdmin@Brands2026!',
  'secret',
  'password',
  'changeme',
  '12345678',
  'admin',
  'test',
]);

export interface SecretValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateProductionSecrets(
  env: Record<string, string | undefined> = process.env,
): SecretValidationResult {
  const errors: string[] = [];

  const nodeEnv = (env.NODE_ENV || 'development').toLowerCase().trim();
  const isProduction = nodeEnv === 'production';

  // In non-production environments, secrets validation passes with dev fallbacks permitted
  if (!isProduction) {
    return { isValid: true, errors: [] };
  }

  // 1. JWT Access Secret: Mandatory in production, minimum 32 chars (256-bit entropy)
  const accessSecret = (env.JWT_ACCESS_SECRET || '').trim();
  if (!accessSecret) {
    errors.push('JWT_ACCESS_SECRET is required in production but is missing or empty');
  } else if (INSECURE_DEV_DEFAULTS.has(accessSecret)) {
    errors.push('JWT_ACCESS_SECRET is set to an insecure known development default');
  } else if (accessSecret.length < 32) {
    errors.push('JWT_ACCESS_SECRET must be at least 32 characters in length for cryptographic security');
  }

  // 2. JWT Refresh Secret: Mandatory in production, minimum 32 chars
  const refreshSecret = (env.JWT_REFRESH_SECRET || '').trim();
  if (!refreshSecret) {
    errors.push('JWT_REFRESH_SECRET is required in production but is missing or empty');
  } else if (INSECURE_DEV_DEFAULTS.has(refreshSecret)) {
    errors.push('JWT_REFRESH_SECRET is set to an insecure known development default');
  } else if (refreshSecret.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters in length for cryptographic security');
  } else if (accessSecret && refreshSecret === accessSecret) {
    errors.push('JWT_REFRESH_SECRET must not be identical to JWT_ACCESS_SECRET');
  }

  // 3. Cron Secret: Mandatory in production for secure cron/worker endpoints, minimum 16 chars
  const cronSecret = (env.CRON_SECRET || '').trim();
  if (!cronSecret) {
    errors.push('CRON_SECRET is required in production for scheduled task security but is missing or empty');
  } else if (INSECURE_DEV_DEFAULTS.has(cronSecret)) {
    errors.push('CRON_SECRET is set to an insecure known development default');
  } else if (cronSecret.length < 16) {
    errors.push('CRON_SECRET must be at least 16 characters in length');
  }

  // 4. Session Secret: If configured or used in production, minimum 32 chars
  const sessionSecret = (env.SESSION_SECRET || '').trim();
  if (sessionSecret) {
    if (INSECURE_DEV_DEFAULTS.has(sessionSecret)) {
      errors.push('SESSION_SECRET is set to an insecure known development default');
    } else if (sessionSecret.length < 32) {
      errors.push('SESSION_SECRET must be at least 32 characters in length');
    }
  }

  // 5. Super Admin Password: If configured in production, must not be default development password
  const adminPassword = (env.SUPER_ADMIN_PASSWORD || '').trim();
  if (adminPassword) {
    if (INSECURE_DEV_DEFAULTS.has(adminPassword) || adminPassword === 'SuperAdmin@Brands2026!') {
      errors.push('SUPER_ADMIN_PASSWORD is set to a known development/demo default password');
    } else if (adminPassword.length < 12) {
      errors.push('SUPER_ADMIN_PASSWORD must be at least 12 characters in length in production');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function assertProductionSecrets(
  env: Record<string, string | undefined> = process.env,
): void {
  const result = validateProductionSecrets(env);
  if (!result.isValid) {
    const header = '══════════════════════════════════════════════════════════════════════════════';
    const message = [
      '',
      header,
      '🚨 [FATAL CONFIGURATION ERROR] PRODUCTION SECRETS VALIDATION FAILED',
      header,
      'The application cannot start in production mode due to missing or weak secrets:',
      ...result.errors.map((err) => `  ❌ ${err}`),
      '',
      'Remediation:',
      '  Set cryptographically strong environment variables in your deployment environment.',
      '  Never commit production secret values to version control.',
      header,
      '',
    ].join('\n');

    throw new Error(message);
  }
}
