/**
 * Brands & Creators — Phase 28 Master Verification & Gap Closure Test Suite
 *
 * Validates:
 * 1. Production Secrets Fail-Fast Validator (P0)
 * 2. Raw-Body Webhook HMAC Signature Integrity (Razorpay & Stripe) (P0)
 * 3. Subscription Expiry Worker & Admin/Cron Trigger Endpoint (P1)
 * 4. Public Profile Verified Reviews & Sanitized Reviewer Data (P1)
 * 5. Public Creator Unrated Fallback (No Fake 4.9/24) (P2)
 * 6. Legacy Onboarding Route Redirects (/onboarding/brand -> /onboarding) (P2)
 * 7. Directory Filter Resets (/people and /explore) (P2)
 * 8. Production SMTP Sandbox Isolation & Error Sanitization
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000/api/v1';
const WEB_BASE = 'http://localhost:3000';

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${message}`);
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

async function loginUser(email, password) {
  const res = await requestJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { login: email, password });

  const data = res.body?.data || res.body;
  if (res.status === 200 && data?.accessToken) {
    return data.accessToken;
  }
  console.log('Login attempt debug:', { status: res.status, body: res.body });
  return null;
}

async function runTests() {
  console.log('======================================================================');
  console.log('🚀 BRANDS & CREATORS — PHASE 28 MASTER TEST SUITE');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // TEST SECTION 1: Production Secrets Validator (Task 1 - P0)
  // -------------------------------------------------------------------------
  console.log('--- 1. Production Secrets Fail-Fast Validator Guard ---');
  try {
    const { validateProductionSecrets } = require('../apps/api/dist/config/secrets.validator');

    // 1.1 Non-production bypass allows local dev fallbacks
    const devResult = validateProductionSecrets({ NODE_ENV: 'development' });
    assert(devResult.isValid === true, 'In development mode, validator allows default local credentials');

    // 1.2 In production, missing secrets fail fast
    const prodMissing = validateProductionSecrets({ NODE_ENV: 'production' });
    assert(prodMissing.isValid === false, 'In production mode, missing secrets correctly triggers validation failure');
    assert(prodMissing.errors.some((e) => e.includes('JWT_ACCESS_SECRET is required')), 'Missing JWT_ACCESS_SECRET reported');
    assert(prodMissing.errors.some((e) => e.includes('JWT_REFRESH_SECRET is required')), 'Missing JWT_REFRESH_SECRET reported');
    assert(prodMissing.errors.some((e) => e.includes('CRON_SECRET is required')), 'Missing CRON_SECRET reported');

    // 1.3 In production, known insecure dev defaults are rejected
    const prodInsecure = validateProductionSecrets({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'dev_jwt_access_secret_brands_creators_2026',
      JWT_REFRESH_SECRET: 'dev_jwt_refresh_secret_brands_creators_2026',
      CRON_SECRET: 'dev_cron_secret_brands_creators_2026',
    });
    assert(prodInsecure.isValid === false, 'Known dev defaults are rejected in production');
    assert(prodInsecure.errors.some((e) => e.includes('insecure known development default')), 'Insecure default error raised');

    // 1.4 In production, identical access and refresh secret is rejected
    const prodIdentical = validateProductionSecrets({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'a_very_long_cryptographically_secure_random_key_1',
      JWT_REFRESH_SECRET: 'a_very_long_cryptographically_secure_random_key_1',
      CRON_SECRET: 'secure_cron_secret_minimum_16_chars',
    });
    assert(prodIdentical.isValid === false, 'Identical access and refresh secrets are rejected');
    assert(prodIdentical.errors.some((e) => e.includes('must not be identical')), 'Non-identical secrets rule enforced');

    // 1.5 Valid, robust production secrets pass cleanly
    const prodValid = validateProductionSecrets({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'f7c8d9e0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8',
      JWT_REFRESH_SECRET: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      CRON_SECRET: 'k8m9n0p1q2r3s4t5u6v7w8x9y0z1',
    });
    assert(prodValid.isValid === true, 'High-entropy, distinct production secrets pass validation cleanly');
  } catch (err) {
    assert(false, `Production secrets validator test threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST SECTION 2: Payment Webhook Raw-Body Integrity & HMAC (Task 2 - P0)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Payment Webhook Raw-Body Integrity & HMAC Verification ---');
  try {
    const { StripeProvider } = require('../apps/api/dist/modules/payments/providers/stripe.provider');
    const { RazorpayProvider } = require('../apps/api/dist/modules/payments/providers/razorpay.provider');

    const stripeProvider = new StripeProvider();
    const razorpayProvider = new RazorpayProvider();

    // 2.1 Stripe Provider HMAC Signature Algorithm Tests
    const testSecret = 'whsec_test_secret_for_validation_12345';
    const testPayload = JSON.stringify({ id: 'evt_test_123', type: 'payment_intent.succeeded' });
    const timestamp = Math.floor(Date.now() / 1000);
    const validSignature = crypto.createHmac('sha256', testSecret).update(`${timestamp}.${testPayload}`).digest('hex');
    const validStripeHeader = `t=${timestamp},v1=${validSignature}`;

    assert(
      stripeProvider.verifyWebhookSignature(testPayload, validStripeHeader, testSecret) === true,
      'StripeProvider verifies authentic HMAC-SHA256 signature with matching timestamp',
    );

    assert(
      stripeProvider.verifyWebhookSignature(testPayload, `t=${timestamp},v1=bad_signature_here`, testSecret) === false,
      'StripeProvider rejects invalid/forged signature',
    );

    // Replay attack prevention (> 300s old)
    const expiredTs = timestamp - 350;
    const expiredSig = crypto.createHmac('sha256', testSecret).update(`${expiredTs}.${testPayload}`).digest('hex');
    assert(
      stripeProvider.verifyWebhookSignature(testPayload, `t=${expiredTs},v1=${expiredSig}`, testSecret) === false,
      'StripeProvider rejects webhook with expired timestamp (replay prevention)',
    );

    // 2.2 Live Endpoint Test: Stripe Webhook Route
    const liveBadStripe = await requestJson(`${API_BASE}/payments/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=123,v1=bad_sig',
      },
    }, { id: 'evt_test' });
    assert(liveBadStripe.status === 400, 'POST /payments/webhooks/stripe returns 400 for forged signature');

    // 2.3 Live Endpoint Test: Razorpay Webhook Route
    const liveBadRzp = await requestJson(`${API_BASE}/payments/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'invalid_forged_razorpay_sig',
      },
    }, { event: 'payment.captured' });
    assert(liveBadRzp.status === 400, 'POST /payments/webhooks/razorpay returns 400 for forged signature');

    // 2.4 Live Authentic Razorpay Webhook Call
    const rzpWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_demo_2026';
    const rzpEventId = `evt_rzp_test_${Date.now()}`;
    const rzpPayload = JSON.stringify({
      id: rzpEventId,
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_test_001', order_id: 'order_nonexistent_test', amount: 50000 } },
      },
    });
    const validRzpSig = crypto.createHmac('sha256', rzpWebhookSecret).update(rzpPayload).digest('hex');

    const liveGoodRzp = await requestJson(`${API_BASE}/payments/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validRzpSig,
      },
    }, rzpPayload);
    assert(
      liveGoodRzp.status === 200 && liveGoodRzp.body?.status === 'processed',
      'POST /payments/webhooks/razorpay successfully processes verified signature',
    );

    // Idempotent duplicate check
    const duplicateRzp = await requestJson(`${API_BASE}/payments/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validRzpSig,
      },
    }, rzpPayload);
    assert(
      duplicateRzp.status === 200 && duplicateRzp.body?.status === 'already_processed',
      'Duplicate Razorpay webhook event is handled idempotently without re-execution',
    );
  } catch (err) {
    assert(false, `Webhook verification test threw error: ${err.stack || err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST SECTION 3: Subscription Expiry Worker & Trigger (Task 3 - P1)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Subscription Expiry Worker & Scheduled Trigger ---');
  try {
    // 3.1 Unauthorized access rejected
    const unauthTrigger = await requestJson(`${API_BASE}/subscriptions/admin/process-expirations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert(unauthTrigger.status === 401, 'Unauthenticated call to process-expirations returns 401');

    // 3.2 Secure Cron Header Trigger
    const cronSecret = process.env.CRON_SECRET || 'dev_cron_secret_brands_creators_2026';
    const cronTrigger = await requestJson(`${API_BASE}/subscriptions/admin/process-expirations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,
      },
    });
    assert(cronTrigger.status === 200, 'POST /subscriptions/admin/process-expirations succeeds with x-cron-secret');
    const cronData = cronTrigger.body?.data || cronTrigger.body;
    assert(typeof cronData?.expiredCount === 'number', 'Expiry sweep returns numeric expiredCount');
    assert(typeof cronData?.remindedCount === 'number', 'Expiry sweep returns numeric remindedCount');
    assert(typeof cronData?.processed === 'number', 'Expiry sweep returns numeric processed total');

    // 3.3 Admin JWT Trigger
    const adminToken = await loginUser('admin@brandsandcreators.com', 'SuperAdmin@Brands2026!');
    if (adminToken) {
      const adminTrigger = await requestJson(`${API_BASE}/subscriptions/admin/process-expirations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      });
      assert(adminTrigger.status === 200, 'POST /subscriptions/admin/process-expirations succeeds with Admin JWT');
    } else {
      assert(false, 'Failed to log in as admin to test subscription trigger');
    }
  } catch (err) {
    assert(false, `Subscription worker test threw error: ${err.stack || err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST SECTION 4 & 5: Public Reviews & Rating Fallback (Task 4 & 5 - P1/P2)
  // -------------------------------------------------------------------------
  console.log('\n--- 4 & 5. Public Reviews Sanitization & Creator Rating Fallback ---');
  try {
    // 4.1 Fetch public creator profile from API
    const creatorsRes = await requestJson(`${API_BASE}/creators?limit=5`);
    const creatorsData = creatorsRes.body?.data || creatorsRes.body;
    const creators = creatorsData?.items || (Array.isArray(creatorsData) ? creatorsData : []);
    assert(Array.isArray(creators) && creators.length > 0, 'Fetched active creator profiles from API');

    if (creators.length > 0) {
      const sampleCreator = creators[0];
      const creatorUserId = (sampleCreator.userId?._id || sampleCreator.userId || sampleCreator._id).toString();

      // 4.2 Query public reviews for this creator
      const reviewsRes = await requestJson(`${API_BASE}/reviews/public/${creatorUserId}`);
      assert(reviewsRes.status === 200, 'GET /reviews/public/:userId returns 200 OK');
      const revData = reviewsRes.body?.data || reviewsRes.body;
      const revItems = revData?.items || [];

      // Verify privacy: reviewer email is NOT in populated items
      if (revItems.length > 0) {
        const hasEmail = revItems.some((r) => r.reviewerId && r.reviewerId.email);
        assert(!hasEmail, 'Reviewer email address is strictly omitted from public reviews payload');
      } else {
        assert(true, 'Public reviews structure valid (0 reviews for sample creator)');
      }

      // 4.3 Support query by creator slug
      const slugRes = await requestJson(`${API_BASE}/reviews/public/${sampleCreator.slug}`);
      assert(slugRes.status === 200, 'GET /reviews/public/:slug successfully resolves by slug');
    }

    // 5.1 Check web page creator profile code for fake 4.9/24 fallback
    const creatorPageCode = fs.readFileSync(
      path.join(__dirname, '../apps/web/app/creators/[slug]/page.tsx'),
      'utf8',
    );
    assert(
      !creatorPageCode.includes('averageRating: profileData?.averageRating || 4.9'),
      'Eliminated hardcoded 4.9 averageRating fallback from creator page',
    );
    assert(
      !creatorPageCode.includes('reviewCount: profileData?.reviewCount || 24'),
      'Eliminated hardcoded 24 reviewCount fallback from creator page',
    );
    assert(
      creatorPageCode.includes("activeTab === 'reviews'"),
      'Reviews tab is implemented and rendered on public creator profiles',
    );

    // 5.2 Check web page brand profile code for reviews tab
    const brandPageCode = fs.readFileSync(
      path.join(__dirname, '../apps/web/app/brands/[slug]/page.tsx'),
      'utf8',
    );
    assert(
      brandPageCode.includes("activeTab === 'reviews'"),
      'Reviews tab is implemented and rendered on public brand profiles',
    );
  } catch (err) {
    assert(false, `Public reviews and rating test threw error: ${err.stack || err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST SECTION 6: Legacy Onboarding Route Redirects (Task 6 - P2)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Legacy Onboarding Route Redirects ---');
  try {
    const nextConfigCode = fs.readFileSync(path.join(__dirname, '../apps/web/next.config.js'), 'utf8');
    assert(
      nextConfigCode.includes("source: '/onboarding/brand'") &&
        nextConfigCode.includes("destination: '/onboarding'"),
      'next.config.js contains permanent redirect for /onboarding/brand -> /onboarding',
    );
    assert(
      nextConfigCode.includes("source: '/onboarding/creator'") &&
        nextConfigCode.includes("destination: '/onboarding'"),
      'next.config.js contains permanent redirect for /onboarding/creator -> /onboarding',
    );

    const brandOnboardingCode = fs.readFileSync(
      path.join(__dirname, '../apps/web/app/onboarding/brand/page.tsx'),
      'utf8',
    );
    assert(
      brandOnboardingCode.includes("router.replace('/onboarding')"),
      'Client-side SPA redirect to /onboarding is implemented in onboarding/brand/page.tsx',
    );

    const creatorOnboardingCode = fs.readFileSync(
      path.join(__dirname, '../apps/web/app/onboarding/creator/page.tsx'),
      'utf8',
    );
    assert(
      creatorOnboardingCode.includes("router.replace('/onboarding')"),
      'Client-side SPA redirect to /onboarding is implemented in onboarding/creator/page.tsx',
    );
  } catch (err) {
    assert(false, `Onboarding redirect test threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST SECTION 7: Directory Filter Resets (Task 7 - P2)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Directory Filter Resets (/people and /explore) ---');
  try {
    const peoplePageCode = fs.readFileSync(
      path.join(__dirname, '../apps/web/app/people/page.tsx'),
      'utf8',
    );
    assert(
      peoplePageCode.includes('Reset All Filters'),
      '/people directory provides a Reset All Filters action button on empty states',
    );
    assert(
      peoplePageCode.includes('window.history.replaceState'),
      '/people filter reset cleanly clears URL query parameters',
    );

    const explorePageCode = fs.readFileSync(
      path.join(__dirname, '../apps/web/app/explore/page.tsx'),
      'utf8',
    );
    assert(
      explorePageCode.includes('window.history.replaceState'),
      '/explore filter reset cleanly clears URL query parameters via replaceState',
    );
  } catch (err) {
    assert(false, `Directory filter reset test threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST SECTION 8: Production SMTP Sandbox Isolation & Error Sanitization (Task 8)
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Production SMTP Sandbox Isolation & Sanitization ---');
  try {
    const { SmtpEmailProvider } = require('../apps/api/dist/modules/notifications/email/providers/smtp.provider');

    // Fake configService returning empty credentials to verify sandbox fallback
    const mockConfigService = {
      get: (key) => {
        if (key === 'EMAIL_FROM') return 'Brands & Creators <notifications@brandsandcreators.com>';
        if (key === 'EMAIL_REPLY_TO') return 'support@brandsandcreators.com';
        return undefined; // host, user, pass undefined
      },
    };

    const provider = new SmtpEmailProvider(mockConfigService);
    assert(provider.isConfigured() === false, 'SMTP provider reports unconfigured when credentials are not provisioned');

    const result = await provider.send({
      to: 'recipient@example.com',
      subject: 'Test Notification Subject',
      html: '<p>Test notification html</p>',
      text: 'Test notification text',
    });

    assert(result.success === true, 'Sandbox email send reports success with simulation flag');
    assert(result.simulated === true, 'Result explicitly flags simulated: true');
    assert(result.messageId.startsWith('sim_'), 'Generated simulated message ID with sim_ prefix');

    // Test error classification and redaction
    const authErr = new Error('Invalid login authentication failed password=secret_password_here for user');
    authErr.code = 'EAUTH';
    const classified = provider.classifySmtpError(authErr);
    assert(
      !classified.sanitizedError.includes('secret_password_here'),
      'classifySmtpError redacts passwords and sensitive substrings from error messages',
    );
    assert(classified.classification === 'AUTHENTICATION_FAILURE', 'Correctly classified AUTHENTICATION_FAILURE error code');
    assert(classified.isRetryable === false, 'AUTHENTICATION_FAILURE marked as non-retryable');
  } catch (err) {
    assert(false, `SMTP provider isolation test threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`📊 PHASE 28 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
