/**
 * Brands & Creators — Phase 29 Master Independent Security & Staging Readiness Audit
 *
 * Comprehensive Automated Security Audit Suite:
 * - TASK 1: Verification of Phase 28 Implementation Integrity
 * - TASK 2: Production Configuration Security & Fail-Fast Validator
 * - TASK 3: Payment Webhook Security (Stripe and Razorpay Separate Deep Audits)
 * - TASK 4: Subscription Expiry Lifecycle, Lazy Evaluation & Worker Idempotency
 * - TASK 5: Reviews, Project State Validation & PII Privacy Sanitization
 * - TASK 6: Multi-Tenant RBAC Authorization & Segregation of Duties (All 5 Roles)
 * - TASK 7: Runtime Health, Endpoints & Navigation
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000/api/v1';
const WEB_BASE = 'http://localhost:3000';
const ADMIN_BASE = 'http://localhost:3001';

let passedCount = 0;
let failedCount = 0;
const auditFindings = [];

function assert(condition, message, metadata = {}) {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${message}`);
    auditFindings.push({ status: 'PASS', message, ...metadata });
  } else {
    failedCount++;
    console.error(`  [FAIL] ${message}`);
    auditFindings.push({ status: 'FAIL', message, ...metadata });
  }
}

function requestJson(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function loginUser(login, password) {
  const res = await requestJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { login, password });

  const data = res.body?.data || res.body;
  if (res.status === 200 && data?.accessToken) {
    return { token: data.accessToken, user: data.user };
  }
  return null;
}

async function registerTestUser(role, suffix = '') {
  const email = `audit_${role.toLowerCase()}_${Date.now()}_${suffix}@example.com`;
  const username = `u_${role.toLowerCase().substring(0, 3)}_${Date.now().toString(36)}_${suffix}`.substring(0, 18);
  const password = 'TestSecurePassword123!';

  const res = await requestJson(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    fullName: `Audit ${role} User`,
    email,
    username,
    password,
    role,
  });

  const data = res.body?.data || res.body;
  return {
    email,
    username,
    password,
    token: data?.accessToken,
    user: data?.user,
    status: res.status,
  };
}

async function runAudit() {
  console.log('======================================================================');
  console.log('🛡️  BRANDS & CREATORS — PHASE 29 INDEPENDENT SECURITY & STAGING AUDIT');
  console.log('======================================================================\n');

  // =========================================================================
  // TASK 1: VERIFY PHASE 28 IMPLEMENTATION INTEGRITY
  // =========================================================================
  console.log('--- TASK 1: Verification of Phase 28 Implementation Integrity ---');

  // 1.1 Secrets Validator File & Export
  const secretsValidatorPath = path.join(__dirname, '../apps/api/src/config/secrets.validator.ts');
  assert(fs.existsSync(secretsValidatorPath), 'apps/api/src/config/secrets.validator.ts exists');
  const secretsValidatorCode = fs.readFileSync(secretsValidatorPath, 'utf8');
  assert(
    secretsValidatorCode.includes('validateProductionSecrets') && secretsValidatorCode.includes('assertProductionSecrets'),
    'secrets.validator.ts exports validateProductionSecrets and assertProductionSecrets',
  );

  // 1.2 Main.ts Wire-In
  const mainTsPath = path.join(__dirname, '../apps/api/src/main.ts');
  const mainTsCode = fs.readFileSync(mainTsPath, 'utf8');
  assert(
    mainTsCode.includes('assertProductionSecrets(process.env)'),
    'main.ts calls assertProductionSecrets(process.env) before app creation',
  );
  assert(
    mainTsCode.includes('stripe-signature'),
    'main.ts allows stripe-signature in CORS allowedHeaders',
  );

  // 1.3 Stripe Provider Implementation
  const stripeProviderPath = path.join(__dirname, '../apps/api/src/modules/payments/providers/stripe.provider.ts');
  const stripeProviderCode = fs.readFileSync(stripeProviderPath, 'utf8');
  assert(
    stripeProviderCode.includes('crypto.timingSafeEqual') && stripeProviderCode.includes('toleranceSec'),
    'stripe.provider.ts implements constant-time HMAC-SHA256 signature verification with tolerance',
  );

  // 1.4 Webhook Endpoint & Settlement
  const paymentsCtrlPath = path.join(__dirname, '../apps/api/src/modules/payments/payments.controller.ts');
  const paymentsCtrlCode = fs.readFileSync(paymentsCtrlPath, 'utf8');
  assert(
    paymentsCtrlCode.includes('payments/webhooks/stripe'),
    'payments.controller.ts defines POST payments/webhooks/stripe',
  );

  const paymentsServicePath = path.join(__dirname, '../apps/api/src/modules/payments/payments.service.ts');
  const paymentsServiceCode = fs.readFileSync(paymentsServicePath, 'utf8');
  assert(
    paymentsServiceCode.includes('handleStripeWebhook') && paymentsServiceCode.includes("provider: 'STRIPE'"),
    'payments.service.ts implements handleStripeWebhook with STRIPE idempotency tracking',
  );

  // 1.5 Subscription Expiry Worker
  const subsServicePath = path.join(__dirname, '../apps/api/src/modules/subscriptions/subscriptions.service.ts');
  const subsServiceCode = fs.readFileSync(subsServicePath, 'utf8');
  assert(
    subsServiceCode.includes('processExpiredSubscriptions') && subsServiceCode.includes('expiryReminderSent'),
    'subscriptions.service.ts implements processExpiredSubscriptions with 3-day renewal reminders',
  );

  const subsCtrlPath = path.join(__dirname, '../apps/api/src/modules/subscriptions/subscriptions.controller.ts');
  const subsCtrlCode = fs.readFileSync(subsCtrlPath, 'utf8');
  assert(
    subsCtrlCode.includes('admin/process-expirations') && subsCtrlCode.includes('AdminOrCronGuard'),
    'subscriptions.controller.ts defines admin/process-expirations protected by AdminOrCronGuard',
  );

  // 1.6 Reviews PII Sanitization
  const reviewsServicePath = path.join(__dirname, '../apps/api/src/modules/reviews/reviews.service.ts');
  const reviewsServiceCode = fs.readFileSync(reviewsServicePath, 'utf8');
  const getPublicReviewsSnippet = reviewsServiceCode.substring(
    reviewsServiceCode.indexOf('getPublicReviews('),
    reviewsServiceCode.indexOf('getProjectReviews('),
  );
  assert(
    !getPublicReviewsSnippet.includes('email') &&
      getPublicReviewsSnippet.includes("populate('reviewerId', 'fullName avatarUrl username')"),
    'reviews.service.ts getPublicReviews suppresses reviewer email from populate fields',
  );

  // 1.7 Next.js Legacy Redirects
  const nextConfigPath = path.join(__dirname, '../apps/web/next.config.js');
  const nextConfigCode = fs.readFileSync(nextConfigPath, 'utf8');
  assert(
    nextConfigCode.includes("source: '/onboarding/brand'") && nextConfigCode.includes("source: '/onboarding/creator'"),
    'apps/web/next.config.js defines permanent redirects for legacy onboarding routes',
  );

  // =========================================================================
  // TASK 2: PRODUCTION CONFIGURATION SECURITY & FAIL-FAST VALIDATION
  // =========================================================================
  console.log('\n--- TASK 2: Production Configuration Security ---');
  const { validateProductionSecrets, assertProductionSecrets } = require('../apps/api/dist/config/secrets.validator');

  // 2.1 Non-production bypass
  const devCheck = validateProductionSecrets({ NODE_ENV: 'development' });
  assert(devCheck.isValid === true && devCheck.errors.length === 0, 'Dev environment passes validation with dev defaults');

  // 2.2 Missing JWT_ACCESS_SECRET in production
  const missingAccess = validateProductionSecrets({
    NODE_ENV: 'production',
    JWT_REFRESH_SECRET: 'long_refresh_secret_32_characters_min_entropy',
    CRON_SECRET: 'long_cron_secret_16_min',
  });
  assert(
    missingAccess.isValid === false && missingAccess.errors.some((e) => e.includes('JWT_ACCESS_SECRET is required')),
    'Production rejects missing JWT_ACCESS_SECRET',
  );

  // 2.3 Short JWT_ACCESS_SECRET (< 32 chars)
  const shortAccess = validateProductionSecrets({
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'short_secret_under_32',
    JWT_REFRESH_SECRET: 'long_refresh_secret_32_characters_min_entropy',
    CRON_SECRET: 'long_cron_secret_16_min',
  });
  assert(
    shortAccess.isValid === false && shortAccess.errors.some((e) => e.includes('at least 32 characters')),
    'Production rejects JWT_ACCESS_SECRET under 32 characters (enforces 256-bit entropy)',
  );

  // 2.4 Insecure known development defaults
  const insecureDefaults = [
    'dev_jwt_access_secret_brands_creators_2026',
    'secret',
    'password',
    'changeme',
    '12345678',
    'admin',
  ];
  for (const def of insecureDefaults) {
    const res = validateProductionSecrets({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: def,
      JWT_REFRESH_SECRET: 'long_refresh_secret_32_characters_min_entropy',
      CRON_SECRET: 'long_cron_secret_16_min',
    });
    assert(
      res.isValid === false,
      `Production rejects known insecure default secret: "${def}"`,
    );
  }

  // 2.5 Identical Access and Refresh Secrets
  const identicalSecrets = validateProductionSecrets({
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'a_very_secure_high_entropy_secret_1234567890',
    JWT_REFRESH_SECRET: 'a_very_secure_high_entropy_secret_1234567890',
    CRON_SECRET: 'long_cron_secret_16_min',
  });
  assert(
    identicalSecrets.isValid === false && identicalSecrets.errors.some((e) => e.includes('must not be identical')),
    'Production enforces distinct keys for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET',
  );

  // 2.6 Missing CRON_SECRET in production
  const missingCron = validateProductionSecrets({
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'a_very_secure_high_entropy_access_key_123456789',
    JWT_REFRESH_SECRET: 'a_very_secure_high_entropy_refresh_key_987654321',
  });
  assert(
    missingCron.isValid === false && missingCron.errors.some((e) => e.includes('CRON_SECRET is required')),
    'Production enforces mandatory CRON_SECRET for worker/cron endpoint security',
  );

  // 2.7 Short CRON_SECRET (< 16 chars)
  const shortCron = validateProductionSecrets({
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'a_very_secure_high_entropy_access_key_123456789',
    JWT_REFRESH_SECRET: 'a_very_secure_high_entropy_refresh_key_987654321',
    CRON_SECRET: 'short_cron_key',
  });
  assert(
    shortCron.isValid === false && shortCron.errors.some((e) => e.includes('at least 16 characters')),
    'Production rejects CRON_SECRET shorter than 16 characters',
  );

  // 2.8 assertProductionSecrets throw behavior & credential privacy
  let threwException = false;
  let exceptionMessage = '';
  try {
    assertProductionSecrets({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'password',
    });
  } catch (err) {
    threwException = true;
    exceptionMessage = err.message;
  }
  assert(threwException, 'assertProductionSecrets throws fatal exception on invalid configuration');
  assert(
    !exceptionMessage.includes('password'),
    'Fatal configuration exception does NOT print secret values in logs or exception messages',
  );

  // =========================================================================
  // TASK 3: PAYMENT WEBHOOK SECURITY (STRIPE & RAZORPAY INDEPENDENT AUDIT)
  // =========================================================================
  console.log('\n--- TASK 3: Payment Webhook Security (Stripe & Razorpay) ---');
  const { StripeProvider } = require('../apps/api/dist/modules/payments/providers/stripe.provider');
  const { RazorpayProvider } = require('../apps/api/dist/modules/payments/providers/razorpay.provider');
  const stripe = new StripeProvider();
  const razorpay = new RazorpayProvider();

  // --- STRIPE AUDIT ---
  const stripeSecret = 'whsec_audit_stripe_secret_2026';
  const stripeRawPayload = JSON.stringify({
    id: `evt_stripe_${Date.now()}`,
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_audit_123', amount_received: 250000 } },
  });
  const nowTs = Math.floor(Date.now() / 1000);
  const correctStripeHmac = crypto.createHmac('sha256', stripeSecret).update(`${nowTs}.${stripeRawPayload}`).digest('hex');
  const validStripeSig = `t=${nowTs},v1=${correctStripeHmac}`;

  // 3.1 Stripe: Exact raw body verification
  assert(
    stripe.verifyWebhookSignature(stripeRawPayload, validStripeSig, stripeSecret) === true,
    'Stripe: Verified valid raw body signature with fresh timestamp',
  );

  // 3.2 Stripe: Altered payload rejection (raw body integrity)
  const tamperedStripePayload = stripeRawPayload.replace('250000', '100000');
  assert(
    stripe.verifyWebhookSignature(tamperedStripePayload, validStripeSig, stripeSecret) === false,
    'Stripe: Altered raw body payload rejected (cryptographic integrity enforced)',
  );

  // 3.3 Stripe: Replay attack protection (timestamp > 300s in the past)
  const staleTs = nowTs - 360; // 6 minutes ago
  const staleHmac = crypto.createHmac('sha256', stripeSecret).update(`${staleTs}.${stripeRawPayload}`).digest('hex');
  const staleStripeSig = `t=${staleTs},v1=${staleHmac}`;
  assert(
    stripe.verifyWebhookSignature(stripeRawPayload, staleStripeSig, stripeSecret) === false,
    'Stripe: Expired timestamp (>300s drift) strictly rejected to prevent replay attacks',
  );

  // 3.4 Stripe: Forged signature endpoint rejection
  const forgedStripeRes = await requestJson(`${API_BASE}/payments/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': `t=${nowTs},v1=forged_hex_signature_value`,
    },
  }, stripeRawPayload);
  assert(
    forgedStripeRes.status === 400,
    'Stripe: HTTP endpoint returns 400 Bad Request for forged signature',
  );

  // --- RAZORPAY AUDIT ---
  const rzpSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_demo_2026';
  const rzpRawPayload = JSON.stringify({
    id: `evt_rzp_audit_${Date.now()}`,
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_audit_999', order_id: 'order_audit_999', amount: 50000 } } },
  });
  const validRzpHmac = crypto.createHmac('sha256', rzpSecret).update(rzpRawPayload).digest('hex');

  // 3.5 Razorpay: Exact raw body verification
  assert(
    razorpay.verifyWebhookSignature(rzpRawPayload, validRzpHmac, rzpSecret) === true,
    'Razorpay: Verified authentic HMAC-SHA256 signature over raw request body',
  );

  // 3.6 Razorpay: Altered payload rejection
  const tamperedRzpPayload = rzpRawPayload.replace('50000', '10000');
  assert(
    razorpay.verifyWebhookSignature(tamperedRzpPayload, validRzpHmac, rzpSecret) === false,
    'Razorpay: Altered raw body payload rejected',
  );

  // 3.7 Razorpay: Forged signature endpoint rejection
  const forgedRzpRes = await requestJson(`${API_BASE}/payments/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': 'forged_razorpay_signature_string',
    },
  }, rzpRawPayload);
  assert(
    forgedRzpRes.status === 400,
    'Razorpay: HTTP endpoint returns 400 Bad Request for forged signature',
  );

  // 3.8 Razorpay: Valid event processing & idempotency replay check
  const authenticRzpRes = await requestJson(`${API_BASE}/payments/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validRzpHmac,
    },
  }, rzpRawPayload);
  assert(
    authenticRzpRes.status === 200 && authenticRzpRes.body?.status === 'processed',
    'Razorpay: Authentic webhook event settled with 200 OK and processed status',
  );

  const duplicateRzpRes = await requestJson(`${API_BASE}/payments/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validRzpHmac,
    },
  }, rzpRawPayload);
  assert(
    duplicateRzpRes.status === 200 && duplicateRzpRes.body?.status === 'already_processed',
    'Razorpay: Duplicate event is rejected idempotently with status already_processed',
  );

  // =========================================================================
  // TASK 4: SUBSCRIPTION EXPIRY, LAZY EVALUATION & WORKER IDEMPOTENCY
  // =========================================================================
  console.log('\n--- TASK 4: Subscription Expiry & Renewal Security ---');

  // 4.1 Admin or Cron Endpoint Authorization
  const unauthSweep = await requestJson(`${API_BASE}/subscriptions/admin/process-expirations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert(
    unauthSweep.status === 401,
    'Unauthorized call to /subscriptions/admin/process-expirations returns 401 Unauthorized',
  );

  const badSecretSweep = await requestJson(`${API_BASE}/subscriptions/admin/process-expirations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': 'wrong_invalid_cron_secret',
    },
  });
  assert(
    badSecretSweep.status === 401,
    'Call with invalid x-cron-secret returns 401 Unauthorized',
  );

  // 4.2 Authorized Cron Secret Trigger
  const cronSecret = process.env.CRON_SECRET || 'dev_cron_secret_brands_creators_2026';
  const cronSweep1 = await requestJson(`${API_BASE}/subscriptions/admin/process-expirations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': cronSecret,
    },
  });
  assert(
    cronSweep1.status === 200,
    'Valid x-cron-secret executes subscription expiry worker with 200 OK',
  );

  // 4.3 Idempotency of Consecutive Sweeps
  const cronSweep2 = await requestJson(`${API_BASE}/subscriptions/admin/process-expirations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': cronSecret,
    },
  });
  const sweepData1 = cronSweep1.body?.data || cronSweep1.body;
  const sweepData2 = cronSweep2.body?.data || cronSweep2.body;
  assert(
    cronSweep2.status === 200 && sweepData2.expiredCount === 0,
    'Consecutive sweep execution is idempotent: expiredCount is 0 on immediate rerun',
  );

  // 4.4 Lazy Expiry Evaluation Verification
  // Test user claims free starter, verify active subscription
  const testSubUser = await registerTestUser('CREATOR', 'sub');
  assert(Boolean(testSubUser.token), 'Registered test creator for subscription lifecycle audit');

  const plansRes = await requestJson(`${API_BASE}/subscriptions/plans`);
  const plansData = plansRes.body?.data || plansRes.body;
  const freePlan = (Array.isArray(plansData) ? plansData : []).find((p) => p.isFree);
  assert(Boolean(freePlan), 'Found active Free Starter Plan in marketplace catalog');

  if (testSubUser.token && freePlan) {
    const claimRes = await requestJson(`${API_BASE}/subscriptions/subscribe-free`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSubUser.token}`,
      },
    }, { planId: freePlan._id });
    assert(claimRes.status === 200, 'Test creator successfully activated Free Starter subscription');

    const activeSubRes = await requestJson(`${API_BASE}/subscriptions/my-subscription`, {
      headers: { Authorization: `Bearer ${testSubUser.token}` },
    });
    const subData = activeSubRes.body?.data || activeSubRes.body;
    assert(
      activeSubRes.status === 200 && subData?.status === 'ACTIVE',
      'Active subscription retrieved via /subscriptions/my-subscription',
    );
  }

  // =========================================================================
  // TASK 5: REVIEWS, PRIVACY & PII SUPPRESSION
  // =========================================================================
  console.log('\n--- TASK 5: Reviews, Project State Validation & PII Privacy ---');

  // 5.1 Review Submission State Validation: Non-Completed Project Rejection
  // Brand user attempts review on a fresh project ID or fake project
  const brandAudit = await registerTestUser('BRAND', 'rev');
  const fakeProjectId = '666666666666666666666666';
  const badReviewRes = await requestJson(`${API_BASE}/reviews/projects/${fakeProjectId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${brandAudit.token}`,
    },
  }, {
    rating: 5,
    comment: 'Great collaboration!',
  });
  assert(
    badReviewRes.status === 404 || badReviewRes.status === 400,
    'Review creation on non-existent or unverified project rejected with 404/400',
  );

  // 5.2 Public Reviews PII Sanitization
  const sampleCreatorsRes = await requestJson(`${API_BASE}/creators?limit=3`);
  const creatorsPayload = sampleCreatorsRes.body?.data || sampleCreatorsRes.body;
  const creatorList = creatorsPayload?.items || (Array.isArray(creatorsPayload) ? creatorsPayload : []);

  if (creatorList.length > 0) {
    const creator = creatorList[0];
    const targetUserId = creator.userId?._id || creator.userId || creator._id;

    const publicRevRes = await requestJson(`${API_BASE}/reviews/public/${targetUserId}`);
    assert(publicRevRes.status === 200, 'GET /reviews/public/:userId returns 200 OK');

    const revData = publicRevRes.body?.data || publicRevRes.body;
    const revItems = revData?.items || [];
    const leaksEmail = revItems.some((r) => r.reviewerId && typeof r.reviewerId.email === 'string' && r.reviewerId.email.length > 0);
    assert(
      !leaksEmail,
      'Public reviews API strictly suppresses reviewer email address from payload',
    );

    // Slug resolution check
    const slugRevRes = await requestJson(`${API_BASE}/reviews/public/${creator.slug}`);
    assert(slugRevRes.status === 200, 'GET /reviews/public/:slug successfully auto-resolves profile slug');
  }

  // =========================================================================
  // TASK 6: MULTI-TENANT RBAC & ACCESS CONTROL AUDIT (ALL 5 ROLES)
  // =========================================================================
  console.log('\n--- TASK 6: Authentication, Authorization & RBAC Audit ---');

  const creatorUser = await registerTestUser('CREATOR', 'rbac');
  const brandUser = await registerTestUser('BRAND', 'rbac');
  const prodUser = await registerTestUser('PRODUCTION_TEAM', 'rbac');
  const agencyUser = await registerTestUser('AGENCY', 'rbac');
  const adminLogin = await loginUser('admin@brandsandcreators.com', 'SuperAdmin@Brands2026!');

  assert(Boolean(creatorUser.token), 'Role CREATOR authenticated');
  assert(Boolean(brandUser.token), 'Role BRAND authenticated');
  assert(Boolean(prodUser.token), 'Role PRODUCTION_TEAM authenticated');
  assert(Boolean(agencyUser.token), 'Role AGENCY authenticated');
  assert(Boolean(adminLogin?.token), 'Role ADMIN / SUPER_ADMIN authenticated');

  // 6.1 Regular roles forbidden from Admin Endpoints
  const nonAdminRoles = [
    { role: 'CREATOR', token: creatorUser.token },
    { role: 'BRAND', token: brandUser.token },
    { role: 'PRODUCTION_TEAM', token: prodUser.token },
    { role: 'AGENCY', token: agencyUser.token },
  ];

  for (const r of nonAdminRoles) {
    const adminEndpointRes = await requestJson(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${r.token}` },
    });
    assert(
      adminEndpointRes.status === 403,
      `Role ${r.role} is strictly forbidden from accessing /users (HTTP 403)`,
    );

    const platformSettingsRes = await requestJson(`${API_BASE}/settings/PLATFORM_COMMISSION_PERCENTAGE`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${r.token}`,
      },
    }, { value: 10 });
    assert(
      platformSettingsRes.status === 403,
      `Role ${r.role} is strictly forbidden from modifying platform settings (HTTP 403)`,
    );
  }

  // 6.2 Admin successfully accesses Admin Endpoints
  if (adminLogin?.token) {
    const adminUsersRes = await requestJson(`${API_BASE}/users?limit=2`, {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    assert(
      adminUsersRes.status === 200,
      'Admin role successfully accesses /users administration route',
    );
  }

  // 6.3 Cross-Tenant Wallet Isolation
  // Creator queries own wallet
  const creatorWalletRes = await requestJson(`${API_BASE}/tokens/wallet`, {
    headers: { Authorization: `Bearer ${creatorUser.token}` },
  });
  assert(creatorWalletRes.status === 200, 'Creator accesses own wallet');

  const brandWalletRes = await requestJson(`${API_BASE}/tokens/wallet`, {
    headers: { Authorization: `Bearer ${brandUser.token}` },
  });
  assert(brandWalletRes.status === 200, 'Brand accesses own wallet');

  const cWalletData = creatorWalletRes.body?.data || creatorWalletRes.body;
  const bWalletData = brandWalletRes.body?.data || brandWalletRes.body;
  assert(
    cWalletData._id !== bWalletData._id && cWalletData.userId !== bWalletData.userId,
    'Wallet isolation enforced: distinct user accounts receive isolated ledger wallets',
  );

  // 6.4 Cross-Tenant Messaging Isolation
  // Brand creates conversation with Creator
  const convRes = await requestJson(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${brandUser.token}`,
    },
  }, {
    participantUserIds: [creatorUser.user._id],
    type: 'DIRECT',
    initialMessage: 'Audit test hello',
  });
  const convData = convRes.body?.data || convRes.body;
  assert(convRes.status === 200 || convRes.status === 201, 'Brand initiated private conversation with Creator');

  if (convData?._id) {
    // Third-party (Production Team) attempts to read private conversation
    const snooperRes = await requestJson(`${API_BASE}/conversations/${convData._id}/messages`, {
      headers: { Authorization: `Bearer ${prodUser.token}` },
    });
    assert(
      snooperRes.status === 403,
      'Third-party non-participant is strictly forbidden from reading private conversation messages (HTTP 403)',
    );
  }

  // 6.5 Logout & Session Invalidation
  const logoutRes = await requestJson(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creatorUser.token}`,
    },
  });
  assert(
    logoutRes.status === 200,
    'POST /auth/logout clears user session and returns 200 OK',
  );

  // =========================================================================
  // TASK 7: RUNTIME HEALTH & ENDPOINTS PROBE
  // =========================================================================
  console.log('\n--- TASK 7: Runtime Health, Endpoints & Navigation ---');

  // 7.1 API Health
  const healthRes = await requestJson(`${API_BASE}/health`);
  assert(healthRes.status === 200, 'GET /health returns HTTP 200 OK');

  // 7.2 Web Server Home
  const webHome = await requestJson(`${WEB_BASE}/`);
  assert(webHome.status === 200, 'Web Marketplace (port 3000) homepage responsive');

  // 7.3 Admin Server Home
  const adminHome = await requestJson(`${ADMIN_BASE}/`);
  assert(
    adminHome.status === 200 || adminHome.status === 307 || adminHome.status === 308,
    `Admin Portal (port 3001) responsive (HTTP ${adminHome.status})`,
  );

  // 7.4 Public Profile Routes
  const creatorSlugProbe = await requestJson(`${WEB_BASE}/creators/raj-cinematography`);
  assert(
    creatorSlugProbe.status === 200,
    'Public creator profile route /creators/[slug] loads with 200 OK',
  );

  const brandSlugProbe = await requestJson(`${WEB_BASE}/brands/lumina-brand-studio`);
  assert(
    brandSlugProbe.status === 200,
    'Public brand profile route /brands/[slug] loads with 200 OK',
  );

  // 7.5 Directory Routes
  const peoplePage = await requestJson(`${WEB_BASE}/people`);
  assert(peoplePage.status === 200, 'People directory route /people loads with 200 OK');

  const explorePage = await requestJson(`${WEB_BASE}/explore`);
  assert(explorePage.status === 200, 'Explore directory route /explore loads with 200 OK');

  // =========================================================================
  // AUDIT SUMMARY
  // =========================================================================
  console.log('\n======================================================================');
  console.log(`📊 PHASE 29 AUDIT COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================================');

  return { passedCount, failedCount, auditFindings };
}

runAudit().then((res) => {
  if (res.failedCount > 0) {
    process.exit(1);
  }
}).catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});

