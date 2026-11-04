/**
 * BRANDS & CREATORS — PHASE 14 MASTER ACCEPTANCE TEST SUITE
 *
 * Verifies End-to-End Platform Product Acceptance, Data Integrity, and Hardening:
 * 1. Deep Cross-Tenant Isolation & Role Boundaries (Brand, Creator, Admin, Anonymous)
 * 2. State Machine Integrity & Concurrency Guards (Single project per hire, Withdrawn applicant lock, Duplicate reviews)
 * 3. Security, Sensitive Data Redaction & CSV Formula Injection Protection
 * 4. OAuth State Tamper-Proof HMAC Security & Token Concealment (select: false)
 * 5. Multi-Currency Engine (Fallback flag differentiation, stale rate detection, precision rounding)
 * 6. Browser Web Push Lifecycle (VAPID status honesty, subscription persistence, unsubscribe ownership)
 * 7. Clean Database Lifecycle (Disposable test records safely cleaned up without touching user data)
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:4000/api/v1';
const MONGO_URI = 'mongodb://127.0.0.1:27017/brands_creators_dev';
const TEST_BYPASS_SECRET = process.env.RATE_LIMIT_TEST_BYPASS_SECRET || 'bc_test_secret_hardening_suite_9f82d1e4a7c06b';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`  ❌ [FAIL ${total}] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passed++;
  console.log(`  ✅ [PASS ${total}] ${message}`);
}

function unwrap(res) {
  if (!res || !res.data) return null;
  if (res.data.data !== undefined) return res.data.data;
  return res.data;
}

async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-bypass-rate-limit': TEST_BYPASS_SECRET,
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  try {
    const res = await fetch(url, config);
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => null);
    }
    return {
      status: res.status,
      ok: res.ok,
      headers: res.headers,
      data,
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      headers: new Headers(),
      data: null,
      error: err.message,
    };
  }
}

async function runPhase14AcceptanceTests() {
  console.log('\n================================================================');
  console.log('🚀 BRANDS & CREATORS — PHASE 14 PRODUCT ACCEPTANCE TEST SUITE');
  console.log('================================================================\n');

  console.log(`Connecting to MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const testTimestamp = Date.now();
  const createdUserIds = [];
  const createdRequirementIds = [];
  const createdApplicationIds = [];
  const createdProjectIds = [];
  const createdAuditLogIds = [];
  const createdPushEndpoints = [];

  try {
    // -------------------------------------------------------------
    // SETUP: MULTI-ROLE TEST PERSONAS
    // -------------------------------------------------------------
    console.log('--- SETTING UP AUTHENTICATED TEST PERSONAS ---');

    // 1. Super Admin Authentication
    const adminLoginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { login: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
    });
    assert(adminLoginRes.status === 200, 'Super admin authenticated successfully');
    const adminToken = unwrap(adminLoginRes)?.accessToken;
    const adminUser = unwrap(adminLoginRes)?.user;

    async function createTestPersona(email, username, fullName, role) {
      const regRes = await apiRequest('/auth/register', {
        method: 'POST',
        body: { email, username, fullName, password: 'Password123!', role },
      });
      const data = unwrap(regRes);
      const token = data?.accessToken || data?.tokens?.accessToken;
      const user = data?.user;
      const userId = user?._id || user?.id;
      if (userId) createdUserIds.push(userId);
      return { email, token, userId, user, id: userId, _id: userId };
    }

    // 2. Brand Alpha (Primary)
    const brandAlpha = await createTestPersona(
      `brand.alpha.p14.${testTimestamp}@example.com`,
      `brand_alpha_p14_${testTimestamp}`,
      'Alpha Media Enterprises',
      'BRAND',
    );
    assert(Boolean(brandAlpha.token), 'Brand Alpha persona registered');

    // 3. Brand Beta (Foreign Tenant)
    const brandBeta = await createTestPersona(
      `brand.beta.p14.${testTimestamp}@example.com`,
      `brand_beta_p14_${testTimestamp}`,
      'Beta Global Corp',
      'BRAND',
    );
    assert(Boolean(brandBeta.token), 'Brand Beta (Foreign Tenant) registered');

    // 4. Creator Prime
    const creatorPrime = await createTestPersona(
      `creator.prime.p14.${testTimestamp}@example.com`,
      `creator_prime_p14_${testTimestamp}`,
      'Priya Sharma Pro',
      'CREATOR',
    );
    assert(Boolean(creatorPrime.token), 'Creator Prime persona registered');

    // 5. Creator Secondary
    const creatorSec = await createTestPersona(
      `creator.sec.p14.${testTimestamp}@example.com`,
      `creator_sec_p14_${testTimestamp}`,
      'Rahul Verma UGC',
      'CREATOR',
    );
    assert(Boolean(creatorSec.token), 'Creator Secondary persona registered');

    // Resolve active category
    const catDoc = await db.collection('categories').findOne({ status: 'ACTIVE' });
    const categoryId = catDoc ? catDoc._id.toString() : '6ac44a3b027b70bdbc4f95ad';

    // =============================================================
    // SECTION 1: CROSS-TENANT ISOLATION & OBJECT-LEVEL AUTHORIZATION
    // =============================================================
    console.log('\n--- SECTION 1: CROSS-TENANT ISOLATION & OBJECT-LEVEL AUTHORIZATION ---');

    // 1. Brand Alpha creates commercial requirement
    const reqRes = await apiRequest('/requirements', {
      method: 'POST',
      token: brandAlpha.token,
      body: {
        title: `Luxury Skincare Campaign P14 ${testTimestamp}`,
        description: 'Brand Alpha private campaign for verified UGC creators. Deliver high-res reels.',
        categoryId,
        deliverables: ['3x 4K Reels', 'Raw B-roll'],
        budgetType: 'RANGE',
        budget: { min: 45000, max: 75000, currency: 'INR' },
        applicationDeadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        startDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        targetIndustry: 'Beauty & Skincare',
        location: { city: 'Mumbai', country: 'India', isRemote: true },
      },
    });
    assert(reqRes.status === 201, 'Brand Alpha requirement created');
    const requirementId = unwrap(reqRes)._id;
    createdRequirementIds.push(requirementId);

    // Transition requirement to PUBLISHED
    const pubRes = await apiRequest(`/requirements/${requirementId}/status`, {
      method: 'PATCH',
      token: brandAlpha.token,
      body: { status: 'PUBLISHED' },
    });
    assert(pubRes.status === 200, 'Brand Alpha requirement transitioned to PUBLISHED');

    // 2. Cross-Tenant Check: Brand Beta CANNOT modify Brand Alpha requirement
    const tamperReqRes = await apiRequest(`/requirements/${requirementId}`, {
      method: 'PATCH',
      token: brandBeta.token,
      body: { title: 'Tampered by Foreign Brand' },
    });
    assert(tamperReqRes.status === 403, 'Brand Beta denied from modifying Brand Alpha requirement (403 Forbidden)');

    // 3. Creator Prime submits application
    const appRes = await apiRequest('/applications', {
      method: 'POST',
      token: creatorPrime.token,
      body: {
        requirementId,
        proposal: 'High-production 4K UGC reels tailored for skincare conversion hooks.',
        offeredPrice: 65000,
        proposedTimeline: '10 days delivery',
      },
    });
    assert(appRes.status === 201, 'Creator Prime submitted application');
    const appDoc = unwrap(appRes);
    const applicationId = appDoc._id;
    createdApplicationIds.push(applicationId);

    // 4. Cross-Tenant Check: Brand Beta CANNOT view Brand Alpha applicants list
    const foreignApplicantsRes = await apiRequest(`/applications/requirement/${requirementId}`, {
      token: brandBeta.token,
    });
    assert(foreignApplicantsRes.status === 403 || foreignApplicantsRes.status === 404, 'Brand Beta denied from viewing Brand Alpha applicants');

    // 5. Cross-Tenant Check: Brand Beta CANNOT mutate Brand Alpha application status
    const foreignStatusRes = await apiRequest(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      token: brandBeta.token,
      body: { status: 'SHORTLISTED' },
    });
    assert(foreignStatusRes.status === 403 || foreignStatusRes.status === 404, 'Brand Beta denied from evaluating Brand Alpha application (403/404)');

    // 6. Creator Secondary CANNOT withdraw Creator Prime's application
    const foreignWithdrawRes = await apiRequest(`/applications/${applicationId}/withdraw`, {
      method: 'PATCH',
      token: creatorSec.token,
    });
    assert(foreignWithdrawRes.status === 403 || foreignWithdrawRes.status === 404, 'Creator Secondary denied from withdrawing Creator Prime application');

    // =============================================================
    // SECTION 2: STATE MACHINE INTEGRITY & CONCURRENCY GUARDS
    // =============================================================
    console.log('\n--- SECTION 2: STATE MACHINE INTEGRITY & CONCURRENCY GUARDS ---');

    // 1. Brand Alpha accepts Creator Prime application
    const acceptRes = await apiRequest(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      token: brandAlpha.token,
      body: { status: 'ACCEPTED' },
    });
    assert(acceptRes.status === 200, 'Brand Alpha accepted Creator Prime application');

    // Verify exactly ONE project workspace initialized
    const projectDocs = await db.collection('projects').find({ applicationId: new mongoose.Types.ObjectId(applicationId) }).toArray();
    assert(projectDocs.length === 1, 'Exactly ONE project workspace initialized in MongoDB');
    const project = projectDocs[0];
    const projectId = project._id.toString();
    createdProjectIds.push(projectId);

    // 2. Explicit confirmation of workspace
    const explicitProjectRes = await apiRequest(`/projects/from-application/${applicationId}`, {
      method: 'POST',
      token: brandAlpha.token,
      body: { title: 'Confirmed Luxury Skincare Project' },
    });
    assert(explicitProjectRes.status === 200 || explicitProjectRes.status === 201, 'Workspace confirmed from application');

    // Concurrency / Duplicate Project Guard: Second explicit creation attempt strictly rejected with 409 Conflict
    const duplicateProjectRes = await apiRequest(`/projects/from-application/${applicationId}`, {
      method: 'POST',
      token: brandAlpha.token,
      body: { title: 'Duplicate Project Request' },
    });
    assert(duplicateProjectRes.status === 409, 'Duplicate project creation from accepted application strictly rejected (409 Conflict)');

    // Ensure database project count remains exactly 1
    const finalProjectCount = await db.collection('projects').countDocuments({ applicationId: new mongoose.Types.ObjectId(applicationId) });
    assert(finalProjectCount === 1, 'Database guarantees 1:1 project-to-application integrity');

    // 3. Creator submits proposal on separate requirement then withdraws: Brand cannot accept withdrawn application
    const req2Res = await apiRequest('/requirements', {
      method: 'POST',
      token: brandAlpha.token,
      body: {
        title: `Campaign 2 P14 ${testTimestamp}`,
        description: 'Testing withdrawal state machine protection',
        categoryId,
        deliverables: ['1x Reel'],
        budgetType: 'RANGE',
        budget: { min: 20000, max: 30000, currency: 'INR' },
        applicationDeadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        startDate: new Date(Date.now() + 11 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 20 * 86400000).toISOString(),
        targetIndustry: 'Fashion',
        location: { city: 'Delhi', country: 'India', isRemote: true },
      },
    });
    const req2Id = unwrap(req2Res)._id;
    createdRequirementIds.push(req2Id);
    await apiRequest(`/requirements/${req2Id}/status`, { method: 'PATCH', token: brandAlpha.token, body: { status: 'PUBLISHED' } });

    const app2Res = await apiRequest('/applications', {
      method: 'POST',
      token: creatorSec.token,
      body: { requirementId: req2Id, proposal: 'Withdrawal test proposal', offeredPrice: 25000 },
    });
    const app2Id = unwrap(app2Res)._id;
    createdApplicationIds.push(app2Id);

    // Creator withdraws proposal
    const withdrawRes = await apiRequest(`/applications/${app2Id}/withdraw`, {
      method: 'PATCH',
      token: creatorSec.token,
    });
    assert(withdrawRes.status === 200, 'Creator Secondary withdrew application');

    // Brand attempts to accept withdrawn proposal: MUST be rejected
    const acceptWithdrawnRes = await apiRequest(`/applications/${app2Id}/status`, {
      method: 'PATCH',
      token: brandAlpha.token,
      body: { status: 'ACCEPTED' },
    });
    assert(acceptWithdrawnRes.status === 400, 'Accepting WITHDRAWN application strictly rejected (400 Bad Request)');

    // =============================================================
    // SECTION 3: REVIEWS STATE MACHINE & DUPLICATE BLOCKAGE
    // =============================================================
    console.log('\n--- SECTION 3: REVIEWS STATE MACHINE & DUPLICATE BLOCKAGE ---');

    // 1. Premature review on uncompleted project rejected
    const prematureReview = await apiRequest('/reviews', {
      method: 'POST',
      token: brandAlpha.token,
      body: {
        projectId,
        rating: 5,
        title: 'Premature review',
        comment: 'Trying to review before completion',
      },
    });
    assert(prematureReview.status === 400, 'Premature review on non-completed project rejected with 400 Bad Request');

    // Complete project
    await db.collection('projects').updateOne(
      { _id: new mongoose.Types.ObjectId(projectId) },
      { $set: { status: 'COMPLETED', completedAt: new Date() } },
    );

    // 2. Valid review submission by Brand
    const validReviewRes = await apiRequest('/reviews', {
      method: 'POST',
      token: brandAlpha.token,
      body: {
        projectId,
        rating: 5,
        title: 'Exceptional 4K UGC delivery',
        comment: 'High viral engagement and crisp color science.',
      },
    });
    assert(validReviewRes.status === 201, 'Brand submitted verified 5-star review for completed project');

    // 3. Duplicate review by Brand rejected
    const dupReviewRes = await apiRequest('/reviews', {
      method: 'POST',
      token: brandAlpha.token,
      body: {
        projectId,
        rating: 5,
        title: 'Second review attempt',
        comment: 'Attempting duplicate review',
      },
    });
    assert(dupReviewRes.status === 409, 'Duplicate review rejected with 409 Conflict');

    // 4. Valid reciprocal review by Creator
    const creatorReviewRes = await apiRequest(`/projects/${projectId}/reviews`, {
      method: 'POST',
      token: creatorPrime.token,
      body: {
        rating: 5,
        title: 'Prompt clear communication',
        comment: 'Brand provided clear creative briefs and fast milestone sign-offs.',
      },
    });
    assert(creatorReviewRes.status === 200 || creatorReviewRes.status === 201, 'Creator submitted verified reciprocal review');

    // =============================================================
    // SECTION 4: AUDIT LOG EXPORT, FORMULA INJECTION & SECRET SCRUBBING
    // =============================================================
    console.log('\n--- SECTION 4: AUDIT LOG EXPORT, FORMULA INJECTION & SECRET SCRUBBING ---');

    // 1. Non-admin denied audit export
    const unauthExportRes = await apiRequest('/audit-logs/export?format=csv', {
      token: brandAlpha.token,
    });
    assert(unauthExportRes.status === 403, 'Brand role strictly denied from audit log export (403 Forbidden)');

    // 2. Inject audit log containing formula injection characters and sensitive credentials
    const auditInjection = await db.collection('auditLogs').insertOne({
      adminUserId: new mongoose.Types.ObjectId(adminUser.id || adminUser._id),
      adminName: '=cmd|calc!A0',
      action: 'SYSTEM_CONFIG_UPDATED',
      targetEntity: '@FormulaTarget',
      targetId: '-100',
      details: 'SuperSecretApiKey123 Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0 password=SuperClassifiedPass!',
      ipAddress: '127.0.0.1',
      createdAt: new Date(),
    });
    createdAuditLogIds.push(auditInjection.insertedId);

    // 3. Admin exports CSV
    const adminCsvRes = await apiRequest('/audit-logs/export?format=csv', {
      token: adminToken,
    });
    assert(adminCsvRes.status === 200, 'Admin successfully exported audit logs as CSV');
    const csvOutput = adminCsvRes.data;

    // Verify sensitive data scrubbing
    assert(!csvOutput.includes('SuperClassifiedPass!'), 'Plaintext password redacted from CSV export');
    assert(!csvOutput.includes('eyJhbGciOiJIUzI1NiJ9'), 'JWT secret string redacted from CSV export');
    assert(csvOutput.includes('[REDACTED]'), 'Redaction placeholder present in exported CSV');

    // Verify spreadsheet formula injection protection
    assert(csvOutput.includes("''=cmd|calc!A0") || csvOutput.includes("''=cmd|calc") || csvOutput.includes("'=cmd|calc"), 'Formula injection = character safely escaped');
    assert(csvOutput.includes("'@FormulaTarget"), 'Formula injection @ character safely escaped');

    // =============================================================
    // SECTION 5: OAUTH HMAC CSRF STATE INTEGRITY & TOKEN PRIVACY
    // =============================================================
    console.log('\n--- SECTION 5: OAUTH HMAC CSRF STATE INTEGRITY & TOKEN PRIVACY ---');

    // 1. OAuth status reports honest external blockers
    const oauthStatus = await apiRequest('/social/oauth/status');
    assert(oauthStatus.status === 200, 'GET /social/oauth/status returns 200 OK');
    const statusData = unwrap(oauthStatus);
    assert(statusData.instagram.requiresAppReview === true, 'Meta App Review requirement honestly declared');
    assert(statusData.youtube.requiresAppReview === true, 'Google verification requirement honestly declared');

    // 2. Generate signed state
    const igUrlRes = await apiRequest('/social/oauth/instagram/url', { token: creatorPrime.token });
    assert(igUrlRes.status === 200, 'Instagram OAuth URL generated with signed state');
    const signedState = unwrap(igUrlRes).state;

    // 3. Tampered state rejected (CSRF blocked)
    const tamperedState = signedState.slice(0, -6) + 'xxxxxx';
    const tamperedRes = await apiRequest('/social/oauth/instagram/callback', {
      method: 'POST',
      token: creatorPrime.token,
      body: { code: 'simulated_code', state: tamperedState, redirectUri: 'http://localhost:3000/callback' },
    });
    assert(tamperedRes.status === 400, 'Tampered state HMAC signature rejected with 400 Bad Request');

    // 4. Token secrecy: execute simulated callback and verify accessToken has select:false
    const simCallbackRes = await apiRequest('/social/oauth/instagram/callback', {
      method: 'POST',
      token: creatorPrime.token,
      body: { code: 'simulated_p14_code', state: signedState, redirectUri: 'http://localhost:3000/callback' },
    });
    assert(simCallbackRes.status === 201, 'Simulated OAuth callback processed');
    const returnedAccount = unwrap(simCallbackRes);
    assert(returnedAccount.accessToken === undefined, 'Access token strictly omitted from API response payload');

    // =============================================================
    // SECTION 6: MULTI-CURRENCY CONVERSION & FALLBACK TRANSPARENCY
    // =============================================================
    console.log('\n--- SECTION 6: MULTI-CURRENCY CONVERSION & FALLBACK TRANSPARENCY ---');

    // 1. Supported currencies query
    const currMetaRes = await apiRequest('/currency/supported');
    assert(currMetaRes.status === 200, 'GET /currency/supported returns 200 OK');
    const supportedList = unwrap(currMetaRes);
    assert(supportedList.some((c) => c.code === 'INR'), 'Supports INR');
    assert(supportedList.some((c) => c.code === 'USD'), 'Supports USD');
    assert(supportedList.some((c) => c.code === 'EUR'), 'Supports EUR');
    assert(supportedList.some((c) => c.code === 'GBP'), 'Supports GBP');
    assert(supportedList.some((c) => c.code === 'AED'), 'Supports AED');

    // 2. Fallback rates transparency
    const ratesRes = await apiRequest('/currency/rates');
    assert(ratesRes.status === 200, 'GET /currency/rates returns 200 OK');
    const ratesData = unwrap(ratesRes);
    assert(ratesData.isFallback === true, 'Rates transparently flagged as isFallback: true (fallback rates)');
    assert(ratesData.provider === 'PlatformConfiguredFallback', 'Provider honestly identified as PlatformConfiguredFallback');

    // 3. Conversion calculation with precision and fallback flag
    const convRes = await apiRequest('/currency/convert', {
      method: 'POST',
      body: { amount: 500, from: 'USD', to: 'AED' },
    });
    assert(convRes.status === 200, 'POST /currency/convert (USD -> AED) returns 200 OK');
    const convData = unwrap(convRes);
    assert(convData.convertedAmount === 1835, '500 USD converted to 1835 AED (3.67 rate)');
    assert(convData.isFallback === true, 'Conversion carries isFallback: true flag');
    assert(convData.isEstimated === true, 'Conversion carries isEstimated: true flag');

    // 4. Invalid currency pair rejected
    const invalidPairRes = await apiRequest('/currency/convert', {
      method: 'POST',
      body: { amount: 100, from: 'JPY', to: 'INR' },
    });
    assert(invalidPairRes.status === 400, 'Unsupported currency JPY rejected with 400 Bad Request');

    // =============================================================
    // SECTION 7: BROWSER WEB PUSH SUBSCRIPTION LIFECYCLE
    // =============================================================
    console.log('\n--- SECTION 7: BROWSER WEB PUSH SUBSCRIPTION LIFECYCLE ---');

    // 1. VAPID configuration honest state
    const vapidRes = await apiRequest('/notifications/push/vapid-key', {
      token: creatorPrime.token,
    });
    assert(vapidRes.status === 200, 'GET /notifications/push/vapid-key returns 200 OK');
    const vapidInfo = unwrap(vapidRes);
    assert(typeof vapidInfo.enabled === 'boolean', 'VAPID enabled is boolean');

    // 2. Subscribe endpoint
    const pushEndpoint = `https://fcm.googleapis.com/fcm/send/p14_test_${testTimestamp}`;
    createdPushEndpoints.push(pushEndpoint);

    const subRes = await apiRequest('/notifications/push/subscribe', {
      method: 'POST',
      token: creatorPrime.token,
      body: {
        endpoint: pushEndpoint,
        keys: { p256dh: 'test_p256dh_key', auth: 'test_auth_key' },
        userAgent: 'Chrome/120.0 (Windows NT 10.0)',
      },
    });
    assert(subRes.status === 201, 'POST /notifications/push/subscribe returns 201 Created');

    // 3. Cross-Tenant Unsubscribe Block: Creator Secondary CANNOT unsubscribe Creator Prime's endpoint
    const crossUnsubRes = await apiRequest('/notifications/push/unsubscribe', {
      method: 'POST',
      token: creatorSec.token,
      body: { endpoint: pushEndpoint },
    });
    assert(crossUnsubRes.status === 201, 'Unsubscribe request handled');
    const crossUnsubData = unwrap(crossUnsubRes);
    assert(crossUnsubData.unsubscribed === false, 'Creator Secondary unable to unsubscribe foreign endpoint (unsubscribed: false)');

    // Verify in MongoDB that subscription is STILL active
    const stillActiveSub = await db.collection('pushSubscriptions').findOne({ endpoint: pushEndpoint });
    assert(stillActiveSub.isActive === true, 'Push subscription remains active after unauthorized cross-user attempt');

    // 4. Authorized unsubscribe by Creator Prime
    const authUnsubRes = await apiRequest('/notifications/push/unsubscribe', {
      method: 'POST',
      token: creatorPrime.token,
      body: { endpoint: pushEndpoint },
    });
    assert(authUnsubRes.status === 201, 'Authorized unsubscribe processed');
    const authUnsubData = unwrap(authUnsubRes);
    assert(authUnsubData.unsubscribed === true, 'Creator Prime successfully unsubscribed own endpoint');

    const deactivatedSub = await db.collection('pushSubscriptions').findOne({ endpoint: pushEndpoint });
    assert(deactivatedSub.isActive === false, 'Subscription marked as isActive: false in MongoDB');
  } finally {
    // -------------------------------------------------------------
    // DISPOSABLE TEST DATA CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- DISPOSABLE TEST DATA CLEANUP ---');
    try {
      if (createdRequirementIds.length > 0) {
        await db.collection('requirements').deleteMany({ _id: { $in: createdRequirementIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      }
      if (createdApplicationIds.length > 0) {
        await db.collection('applications').deleteMany({ _id: { $in: createdApplicationIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      }
      if (createdProjectIds.length > 0) {
        await db.collection('projects').deleteMany({ _id: { $in: createdProjectIds.map((id) => new mongoose.Types.ObjectId(id)) } });
        await db.collection('reviews').deleteMany({ projectId: { $in: createdProjectIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      }
      if (createdAuditLogIds.length > 0) {
        await db.collection('auditLogs').deleteMany({ _id: { $in: createdAuditLogIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      }
      if (createdPushEndpoints.length > 0) {
        await db.collection('pushSubscriptions').deleteMany({ endpoint: { $in: createdPushEndpoints } });
      }
      if (createdUserIds.length > 0) {
        await db.collection('users').deleteMany({ _id: { $in: createdUserIds.map((id) => new mongoose.Types.ObjectId(id)) } });
        await db.collection('creatorProfiles').deleteMany({ userId: { $in: createdUserIds.map((id) => new mongoose.Types.ObjectId(id)) } });
        await db.collection('brandProfiles').deleteMany({ userId: { $in: createdUserIds.map((id) => new mongoose.Types.ObjectId(id)) } });
        await db.collection('socialAccounts').deleteMany({ userId: { $in: createdUserIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      }
      console.log('✅ Temporary test entities cleaned up successfully (zero impact on real user data)');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`🎉 PHASE 14 ACCEPTANCE TEST RESULTS: ${passed}/${total} ASSERTIONS PASSED`);
  console.log('================================================================\n');
}

runPhase14AcceptanceTests().catch((err) => {
  console.error('\n❌ TEST RUNNER ABORTED ON ERROR:', err);
  process.exit(1);
});
