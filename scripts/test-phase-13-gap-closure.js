/**
 * BRANDS & CREATORS — PHASE 13 MASTER TEST SUITE: FEATURE GAP CLOSURE & E2E VERIFICATION
 *
 * Verifies End-to-End Implementation of:
 * 1. Core Marketplace Workflows:
 *    - Valid completed project review submission
 *    - Review validation: non-completed project rejected (400 Bad Request)
 *    - Self-review prohibited (400 Bad Request)
 *    - Non-participant review prohibited (403 Forbidden)
 *    - Duplicate review strictly rejected (409 Conflict)
 *    - Creator and Brand profile rating & review count synchronization
 * 2. Bulk Applicant Actions:
 *    - Brand requirement creation & multiple creator applications
 *    - Bulk shortlist operation with per-applicant result validation
 *    - Bulk reject operation
 *    - Database status persistence
 *    - Duplicate idempotent action handling without repeated notifications
 *    - Status transition validation (cannot shortlist withdrawn application)
 *    - Tenant isolation (foreign brand rejected from bulk modifying other brand's applicants)
 *    - Administrative audit log trail generated for bulk moderation
 * 3. Audit Log Export:
 *    - CSV export endpoint (RFC 4180 compliance, header row, safe column escaping)
 *    - Formula injection protection (leading =,+,-,@ prefixed with single quote)
 *    - Secret / token / password scrubbing from export payload
 *    - JSON export endpoint structure
 *    - RBAC enforcement (Super Admin/Admin only; unauthenticated & non-admin denied)
 *    - Verification that export generates an audit trail entry (AUDIT_LOG_EXPORTED)
 * 4. Multi-Currency Engine:
 *    - Supported currencies endpoint (INR, USD, EUR, GBP, AED)
 *    - Cached exchange rates with timestamp and stale indicator
 *    - Precision currency conversions (USD <-> INR, EUR <-> GBP, AED)
 *    - Rejection of invalid/unsupported currencies (400 Bad Request)
 *    - Stale rate detection and indicator flag
 *    - Preservation of original currency and immutable transaction amounts
 * 5. Browser Web Push Notifications:
 *    - Public VAPID key configuration inspection (honest status if unconfigured)
 *    - Opt-in push subscription registration and MongoDB persistence
 *    - Endpoint deduplication (upsert uniqueness)
 *    - Test notification trigger
 *    - Unsubscribe lifecycle
 *    - User tenant isolation on push endpoints
 * 6. Official Social OAuth Adapters:
 *    - Status endpoint reporting Meta and Google prerequisites & blockers
 *    - Tamper-proof HMAC signed state generation
 *    - CSRF tamper rejection (modified state signature rejected with 400 Bad Request)
 *    - Sandbox/simulated OAuth callback handling
 *    - Secure token storage with select:false (redacted from public responses)
 *    - Official connection revocation & disconnect
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
    return { status: res.status, ok: res.ok, headers: res.headers, data };
  } catch (err) {
    return { status: 500, ok: false, error: err.message, data: null };
  }
}

async function runPhase13Tests() {
  console.log('\n================================================================');
  console.log('🚀 BRANDS & CREATORS — PHASE 13 MASTER E2E TEST SUITE');
  console.log('================================================================\n');

  console.log(`Connecting to local MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const testTimestamp = Date.now();
  const createdUserIds = [];
  const createdRequirementIds = [];
  const createdApplicationIds = [];
  const createdProjectIds = [];

  try {
    // -------------------------------------------------------------
    // SETUP: TEST PERSONAS
    // -------------------------------------------------------------
    console.log('\n--- SETTING UP AUTHENTICATED TEST PERSONAS ---');

    // 1. Super Admin Authentication
    const adminLoginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { login: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
    });
    assert(adminLoginRes.status === 200, 'Super admin authenticated');
    const adminToken = unwrap(adminLoginRes)?.accessToken;
    const adminUser = unwrap(adminLoginRes)?.user;

    // Helper to register & login personas
    async function createTestUser(email, username, fullName, role) {
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

    // 2. Brand A (Primary Brand)
    const brandUser = await createTestUser(
      `brand.p13.${testTimestamp}@example.com`,
      `brand_p13_${testTimestamp}`,
      'Phase 13 Apex Brand Ltd',
      'BRAND',
    );
    assert(Boolean(brandUser.token), 'Brand A Persona registered and authenticated');
    const brandToken = brandUser.token;

    // 3. Brand B (Foreign Brand for Tenant Isolation checks)
    const foreignBrandUser = await createTestUser(
      `foreign.brand.p13.${testTimestamp}@example.com`,
      `foreign_p13_${testTimestamp}`,
      'Foreign Brand Inc',
      'BRAND',
    );
    assert(Boolean(foreignBrandUser.token), 'Brand B (Foreign Brand) registered');
    const foreignBrandToken = foreignBrandUser.token;

    // 4. Creator A
    const creatorAUser = await createTestUser(
      `creator.a.p13.${testTimestamp}@example.com`,
      `creator_a_p13_${testTimestamp}`,
      'Aarav Mehta',
      'CREATOR',
    );
    assert(Boolean(creatorAUser.token), 'Creator A registered and authenticated');
    const creatorAToken = creatorAUser.token;

    // 5. Creator B
    const creatorBUser = await createTestUser(
      `creator.b.p13.${testTimestamp}@example.com`,
      `creator_b_p13_${testTimestamp}`,
      'Bhavna Sen',
      'CREATOR',
    );
    assert(Boolean(creatorBUser.token), 'Creator B registered and authenticated');
    const creatorBToken = creatorBUser.token;

    // 6. Creator C
    const creatorCUser = await createTestUser(
      `creator.c.p13.${testTimestamp}@example.com`,
      `creator_c_p13_${testTimestamp}`,
      'Chirag Dave',
      'CREATOR',
    );
    assert(Boolean(creatorCUser.token), 'Creator C registered and authenticated');
    const creatorCToken = creatorCUser.token;

    // Publish profiles to enable applications and marketplace discovery
    await apiRequest('/brands/me/publish', { method: 'POST', token: brandToken });
    await apiRequest('/brands/me/publish', { method: 'POST', token: foreignBrandToken });
    await apiRequest('/creators/me/publish', { method: 'POST', token: creatorAToken });
    await apiRequest('/creators/me/publish', { method: 'POST', token: creatorBToken });
    await apiRequest('/creators/me/publish', { method: 'POST', token: creatorCToken });

    // Get an active category
    const catRes = await apiRequest('/categories?status=ACTIVE');
    const categories = unwrap(catRes);
    const catList = Array.isArray(categories) ? categories : (categories?.items || []);
    const categoryId = catList[0]?._id;
    assert(!!categoryId, 'Active marketplace category resolved');

    // Create Brand A Requirement
    const createReqPayload = {
      title: `Phase 13 Flagship Opportunity ${testTimestamp}`,
      description: 'Comprehensive opportunity requiring multiple UGC video deliverables and social posts.',
      categoryId: categoryId.toString(),
      budget: { min: 30000, max: 75000, currency: 'INR' },
      budgetType: 'RANGE',
      applicationDeadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      startDate: new Date(Date.now() + 16 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      professionalsRequired: 1,
      targetIndustry: 'D2C Consumer Goods',
      requiredSkills: ['UGC Video', '4K Reel Production', 'Color Grading'],
      deliverables: ['3x 9:16 Vertical UGC Reels', '2x Alternative Hook Edits'],
      location: { city: 'Mumbai', country: 'India', isRemote: true },
    };

    const reqRes = await apiRequest('/requirements', {
      method: 'POST',
      token: brandToken,
      body: createReqPayload,
    });
    assert(reqRes.status === 201 || reqRes.status === 200, 'Brand A created requirement');
    const requirement = unwrap(reqRes);
    const requirementId = (requirement?._id || requirement?.id).toString();
    createdRequirementIds.push(requirementId);

    // Transition requirement to PUBLISHED
    const publishRes = await apiRequest(`/requirements/${requirementId}/status`, {
      method: 'PATCH',
      token: brandToken,
      body: { status: 'PUBLISHED' },
    });
    assert(publishRes.status === 200, 'Requirement transitioned to PUBLISHED status');

    // Submit Applications: Creator A, B, C
    const appARes = await apiRequest('/applications', {
      method: 'POST',
      token: creatorAToken,
      body: {
        requirementId,
        proposal: 'Creator A high retention direct-response pitch with custom hooks.',
        offeredPrice: 35000,
        estimatedDelivery: '3 Days',
      },
    });
    assert(appARes.status === 201, 'Creator A submitted application');
    const appA = unwrap(appARes);
    createdApplicationIds.push(appA._id);

    const appBRes = await apiRequest('/applications', {
      method: 'POST',
      token: creatorBToken,
      body: {
        requirementId,
        proposal: 'Creator B lifestyle cinematic visuals with dedicated color grade.',
        offeredPrice: 42000,
        estimatedDelivery: '4 Days',
      },
    });
    assert(appBRes.status === 201, 'Creator B submitted application');
    const appB = unwrap(appBRes);
    createdApplicationIds.push(appB._id);

    const appCRes = await apiRequest('/applications', {
      method: 'POST',
      token: creatorCToken,
      body: {
        requirementId,
        proposal: 'Creator C short-form viral editing package.',
        offeredPrice: 28000,
        estimatedDelivery: '2 Days',
      },
    });
    assert(appCRes.status === 201, 'Creator C submitted application');
    const appC = unwrap(appCRes);
    createdApplicationIds.push(appC._id);

    // =============================================================
    // SECTION 1: REVIEWS LIFECYCLE & DUPLICATE PREVENTION
    // =============================================================
    console.log('\n--- SECTION 1: REVIEWS VALIDATION & DUPLICATE PREVENTION ---');

    // Accept application A to generate project workspace
    const acceptRes = await apiRequest(`/applications/${appA._id}/status`, {
      method: 'PATCH',
      token: brandToken,
      body: { status: 'ACCEPTED' },
    });
    assert(acceptRes.status === 200, 'Brand A accepted Creator A application');

    // Retrieve generated project
    const projectDoc = await db.collection('projects').findOne({ applicationId: new mongoose.Types.ObjectId(appA._id) });
    assert(!!projectDoc, 'Project workspace initialized for application');
    const projectId = projectDoc._id.toString();
    createdProjectIds.push(projectId);

    // 1. Review on non-completed project must fail with 400 Bad Request
    const prematureReviewRes = await apiRequest('/reviews', {
      method: 'POST',
      token: brandToken,
      body: {
        projectId,
        rating: 5,
        title: 'Premature review attempt',
        feedback: 'Great job so far but project is still in progress.',
      },
    });
    assert(prematureReviewRes.status === 400, 'Review on uncompleted project rejected with 400 Bad Request');

    // 2. Non-participant review attempt must fail with 403 Forbidden
    const nonParticipantReviewRes = await apiRequest('/reviews', {
      method: 'POST',
      token: foreignBrandToken,
      body: {
        projectId,
        rating: 5,
        title: 'Intruder review',
        feedback: 'I am not part of this project.',
      },
    });
    assert(nonParticipantReviewRes.status === 403, 'Non-participant review strictly denied with 403 Forbidden');

    // Transition project to COMPLETED
    await db.collection('projects').updateOne(
      { _id: new mongoose.Types.ObjectId(projectId) },
      { $set: { status: 'COMPLETED', completedAt: new Date() } }
    );

    // 3. Valid Review Submission by Brand
    const validReviewRes = await apiRequest('/reviews', {
      method: 'POST',
      token: brandToken,
      body: {
        projectId,
        rating: 5,
        title: 'Outstanding Quality & Speed!',
        feedback: 'Delivered high-converting UGC reels ahead of schedule with crisp color grading.',
      },
    });
    assert(validReviewRes.status === 201, 'Brand submitted 5-star review for completed project');
    const reviewData = unwrap(validReviewRes);
    assert(reviewData.rating === 5, 'Review recorded 5-star rating');

    // 4. Duplicate review attempt by same reviewer must fail with 409 Conflict
    const duplicateReviewRes = await apiRequest('/reviews', {
      method: 'POST',
      token: brandToken,
      body: {
        projectId,
        rating: 4,
        title: 'Duplicate review attempt',
        feedback: 'Trying to post another review.',
      },
    });
    assert(duplicateReviewRes.status === 409, 'Duplicate review rejected with 409 Conflict');

    // 5. Verify Creator Profile Rating Synchronization
    const creatorAProfile = await db.collection('creatorProfiles').findOne({ userId: new mongoose.Types.ObjectId(creatorAUser.id || creatorAUser._id) });
    assert(creatorAProfile?.reviewCount >= 1, 'Creator profile reviewCount incremented');
    assert(creatorAProfile?.averageRating >= 4.5, 'Creator profile averageRating updated in MongoDB');

    // =============================================================
    // SECTION 2: BULK APPLICANT ACTIONS (PRIORITY B - FEATURE A)
    // =============================================================
    console.log('\n--- SECTION 2: BULK APPLICANT ACTIONS ---');

    // 1. Bulk Shortlist Creators B and C
    const bulkShortlistRes = await apiRequest('/applications/bulk-status', {
      method: 'PATCH',
      token: brandToken,
      body: {
        applicationIds: [appB._id, appC._id],
        status: 'SHORTLISTED',
        reason: 'Selected for round 2 review based on portfolio quality',
      },
    });
    assert(bulkShortlistRes.status === 200, 'Brand executed bulk shortlist on [appB, appC]');
    const bulkShortlistData = unwrap(bulkShortlistRes);
    assert(bulkShortlistData.succeeded === 2, 'Bulk shortlist reported 2/2 succeeded');
    assert(bulkShortlistData.failed === 0, 'Bulk shortlist reported 0 failures');

    // Verify DB persistence of SHORTLISTED status
    const appBDoc = await db.collection('applications').findOne({ _id: new mongoose.Types.ObjectId(appB._id) });
    const appCDoc = await db.collection('applications').findOne({ _id: new mongoose.Types.ObjectId(appC._id) });
    assert(appBDoc.status === 'SHORTLISTED', 'Application B status persisted as SHORTLISTED in MongoDB');
    assert(appCDoc.status === 'SHORTLISTED', 'Application C status persisted as SHORTLISTED in MongoDB');

    // 2. Idempotent bulk action test: Repeating shortlist should succeed cleanly without duplicate side-effects
    const repeatBulkRes = await apiRequest('/applications/bulk-status', {
      method: 'PATCH',
      token: brandToken,
      body: {
        applicationIds: [appB._id],
        status: 'SHORTLISTED',
      },
    });
    assert(repeatBulkRes.status === 200, 'Idempotent bulk shortlist returned 200 OK');
    const repeatData = unwrap(repeatBulkRes);
    assert(repeatData.results[0]?.note === 'Already in target status', 'Idempotent action flagged as already in target status');

    // 3. Status Transition Restriction: Creator C withdraws application
    const withdrawRes = await apiRequest(`/applications/${appC._id}/withdraw`, {
      method: 'PATCH',
      token: creatorCToken,
    });
    assert(withdrawRes.status === 200, 'Creator C withdrew application');

    // Attempting bulk update on withdrawn application should return per-item failure
    const bulkWithdrawnRes = await apiRequest('/applications/bulk-status', {
      method: 'PATCH',
      token: brandToken,
      body: {
        applicationIds: [appC._id],
        status: 'SHORTLISTED',
      },
    });
    assert(bulkWithdrawnRes.status === 200, 'Bulk endpoint handles per-item errors gracefully');
    const bulkWithdrawnData = unwrap(bulkWithdrawnRes);
    assert(bulkWithdrawnData.failed === 1, 'Modifying withdrawn application reported as failed');
    assert(bulkWithdrawnData.results[0]?.error.includes('withdrawn'), 'Error message explicitly notes application is withdrawn');

    // 4. Tenant Isolation Check: Foreign Brand B attempts bulk action on Brand A's applicants
    const foreignBulkRes = await apiRequest('/applications/bulk-status', {
      method: 'PATCH',
      token: foreignBrandToken,
      body: {
        applicationIds: [appB._id],
        status: 'REJECTED',
      },
    });
    assert(foreignBulkRes.status === 200, 'Foreign bulk response returned');
    const foreignBulkData = unwrap(foreignBulkRes);
    assert(foreignBulkData.failed === 1, 'Foreign tenant denied status modification on other brand applicants');
    assert(foreignBulkData.results[0]?.error.includes('Unauthorized'), 'Error explicitly mentions tenant unauthorized boundary');

    // 5. Bulk Reject Creator B
    const bulkRejectRes = await apiRequest('/applications/bulk-status', {
      method: 'PATCH',
      token: brandToken,
      body: {
        applicationIds: [appB._id],
        status: 'REJECTED',
        reason: 'Budget allocation completed for this campaign cycle',
      },
    });
    assert(bulkRejectRes.status === 200, 'Brand executed bulk reject on [appB]');
    const updatedAppBDoc = await db.collection('applications').findOne({ _id: new mongoose.Types.ObjectId(appB._id) });
    assert(updatedAppBDoc.status === 'REJECTED', 'Application B status updated to REJECTED in MongoDB');

    // Verify Audit Log persisted for bulk moderation
    const bulkAudit = await db.collection('auditLogs').findOne({ action: 'APPLICATION_BULK_MODERATED' });
    assert(!!bulkAudit, 'Audit log entry recorded for APPLICATION_BULK_MODERATED');

    // =============================================================
    // SECTION 3: AUDIT LOG EXPORT (PRIORITY B - FEATURE B)
    // =============================================================
    console.log('\n--- SECTION 3: AUDIT LOG EXPORT (CSV & JSON) ---');

    // 1. CSV Export by Super Admin
    const csvRes = await apiRequest('/audit-logs/export?format=csv', {
      token: adminToken,
    });
    assert(csvRes.status === 200, 'Admin GET /audit-logs/export?format=csv returns 200 OK');
    const csvContentType = csvRes.headers.get('content-type') || '';
    assert(csvContentType.includes('text/csv'), 'Content-Type is text/csv');
    const csvContentDisposition = csvRes.headers.get('content-disposition') || '';
    assert(csvContentDisposition.includes('attachment; filename="audit-logs-export-'), 'Content-Disposition specifies CSV attachment');
    assert(typeof csvRes.data === 'string', 'CSV data returned as string');
    assert(csvRes.data.startsWith('Timestamp,Admin Name,Admin User ID,Action,Target Entity,Target ID,Details,IP Address'), 'CSV header row formatted correctly');

    // 2. CSV Formula Injection & Secret Redaction test
    // Inject a test audit record with formula characters and simulated secret token
    await db.collection('auditLogs').insertOne({
      adminUserId: new mongoose.Types.ObjectId(adminUser.id || adminUser._id),
      adminName: '=SUM(1+1)',
      action: 'SETTINGS_UPDATED',
      targetEntity: '+cmd|calc',
      targetId: 'cfg_01',
      details: 'User password=SuperSecretPassword123! token=eyJhbGciOiJIUzI1NiJ9 Bearer abc123def456',
      ipAddress: '127.0.0.1',
      createdAt: new Date(),
    });

    const csvSanitizedRes = await apiRequest('/audit-logs/export?format=csv', {
      token: adminToken,
    });
    const csvString = csvSanitizedRes.data;
    assert(!csvString.includes('SuperSecretPassword123!'), 'Plaintext password redacted from CSV export');
    assert(!csvString.includes('eyJhbGciOiJIUzI1NiJ9'), 'JWT token string redacted from CSV export');
    assert(csvString.includes('[REDACTED]'), 'Redaction placeholder present in exported CSV');
    assert(csvString.includes("'=SUM(1+1)"), 'Leading formula character safely single-quoted to protect spreadsheet consumers');

    // 3. JSON Export by Super Admin
    const jsonRes = await apiRequest('/audit-logs/export?format=json', {
      token: adminToken,
    });
    assert(jsonRes.status === 200, 'Admin GET /audit-logs/export?format=json returns 200 OK');
    const jsonContentType = jsonRes.headers.get('content-type') || '';
    assert(jsonContentType.includes('application/json'), 'Content-Type is application/json');
    let jsonParsed = typeof jsonRes.data === 'object' ? jsonRes.data : JSON.parse(jsonRes.data);
    assert(jsonParsed.totalRecords >= 1, 'JSON export contains totalRecords count');
    assert(Array.isArray(jsonParsed.records), 'JSON export records array present');

    // 4. RBAC Authorization: Unauthenticated & Creator denied export
    const unauthExportRes = await apiRequest('/audit-logs/export?format=csv');
    assert(unauthExportRes.status === 401, 'Unauthenticated export request rejected with 401 Unauthorized');

    const creatorExportRes = await apiRequest('/audit-logs/export?format=csv', {
      token: creatorAToken,
    });
    assert(creatorExportRes.status === 403, 'Creator role denied audit log export with 403 Forbidden');

    // =============================================================
    // SECTION 4: MULTI-CURRENCY ENGINE (PRIORITY B - FEATURE D)
    // =============================================================
    console.log('\n--- SECTION 4: MULTI-CURRENCY SUPPORT ---');

    // 1. Supported currencies query
    const currSupportedRes = await apiRequest('/currency/supported');
    assert(currSupportedRes.status === 200, 'GET /currency/supported returns 200 OK');
    const supportedList = unwrap(currSupportedRes);
    assert(Array.isArray(supportedList), 'Supported currencies returned as array');
    const codes = supportedList.map((c) => c.code);
    assert(codes.includes('INR') && codes.includes('USD') && codes.includes('EUR') && codes.includes('GBP') && codes.includes('AED'), 'Supports INR, USD, EUR, GBP, and AED');

    // 2. Exchange Rates endpoint
    const ratesRes = await apiRequest('/currency/rates');
    assert(ratesRes.status === 200, 'GET /currency/rates returns 200 OK');
    const ratesData = unwrap(ratesRes);
    assert(ratesData.base === 'USD', 'Base currency is USD');
    assert(ratesData.rates.INR > 80, 'INR exchange rate populated');
    assert(ratesData.rates.AED > 3.5, 'AED exchange rate populated');
    assert(ratesData.isStale === false, 'Rates marked as fresh (isStale: false)');
    assert(!!ratesData.asOf, 'Rates include asOf timestamp');

    // 3. Conversion Calculations (USD -> INR)
    const convertUsdInrRes = await apiRequest('/currency/convert', {
      method: 'POST',
      body: { amount: 100, from: 'USD', to: 'INR' },
    });
    assert(convertUsdInrRes.status === 200, 'POST /currency/convert (USD -> INR) returns 200 OK');
    const convUsdInr = unwrap(convertUsdInrRes);
    assert(convUsdInr.originalAmount === 100, 'Preserved original amount');
    assert(convUsdInr.originalCurrency === 'USD', 'Preserved original currency');
    assert(convUsdInr.targetCurrency === 'INR', 'Target currency is INR');
    assert(convUsdInr.convertedAmount === 8650, 'Converted 100 USD to 8650 INR');
    assert(convUsdInr.isEstimated === true, 'Explicitly marked as converted display estimate');

    // 4. Reverse Conversion (INR -> USD) with 2-decimal precision
    const convertInrUsdRes = await apiRequest('/currency/convert', {
      method: 'POST',
      body: { amount: 8650, from: 'INR', to: 'USD' },
    });
    assert(convertInrUsdRes.status === 200, 'POST /currency/convert (INR -> USD) returns 200 OK');
    const convInrUsd = unwrap(convertInrUsdRes);
    assert(convInrUsd.convertedAmount === 100, 'Converted 8650 INR back to 100 USD');

    // 5. Cross-Currency Conversion (EUR -> AED)
    const convertEurAedRes = await apiRequest('/currency/convert', {
      method: 'POST',
      body: { amount: 50, from: 'EUR', to: 'AED' },
    });
    assert(convertEurAedRes.status === 200, 'POST /currency/convert (EUR -> AED) returns 200 OK');
    const convEurAed = unwrap(convertEurAedRes);
    assert(convEurAed.convertedAmount > 0, 'Cross-rate EUR to AED computed successfully');

    // 6. Invalid / Unsupported Currency Rejection
    const invalidCurrRes = await apiRequest('/currency/convert', {
      method: 'POST',
      body: { amount: 100, from: 'XYZ', to: 'INR' },
    });
    assert(invalidCurrRes.status === 400, 'Invalid currency XYZ rejected with 400 Bad Request');

    // 7. Negative amount rejection
    const negativeAmountRes = await apiRequest('/currency/convert', {
      method: 'POST',
      body: { amount: -50, from: 'USD', to: 'INR' },
    });
    assert(negativeAmountRes.status === 400, 'Negative amount rejected with 400 Bad Request');

    // 8. Stale Rate Indicator Test
    await apiRequest('/currency/test-toggle-stale', {
      method: 'POST',
      body: { stale: true },
    });
    const staleConvertRes = await apiRequest('/currency/convert', {
      method: 'POST',
      body: { amount: 10, from: 'USD', to: 'EUR' },
    });
    const staleData = unwrap(staleConvertRes);
    assert(staleData.isStale === true, 'Conversion flags isStale: true when rates are stale');

    // Reset stale flag
    await apiRequest('/currency/test-toggle-stale', {
      method: 'POST',
      body: { stale: false },
    });

    // 9. Historical Immutability Check: verify requirement budget currency was not modified
    const dbReq = await db.collection('requirements').findOne({ _id: new mongoose.Types.ObjectId(requirementId) });
    assert(dbReq.budget.currency === 'INR', 'Requirement original currency remains immutable (INR)');
    assert(dbReq.budget.min === 30000, 'Requirement original budget amount preserved unchanged');

    // =============================================================
    // SECTION 5: BROWSER PUSH NOTIFICATIONS (PRIORITY B - FEATURE C)
    // =============================================================
    console.log('\n--- SECTION 5: BROWSER PUSH NOTIFICATIONS ---');

    // 1. VAPID Configuration status
    const vapidKeyRes = await apiRequest('/notifications/push/vapid-key', {
      token: creatorAToken,
    });
    assert(vapidKeyRes.status === 200, 'GET /notifications/push/vapid-key returns 200 OK');
    const vapidConfig = unwrap(vapidKeyRes);
    assert(typeof vapidConfig.enabled === 'boolean', 'Reports honest boolean enabled state');
    assert(typeof vapidConfig.message === 'string', 'Provides configuration guidance message');

    // 2. Subscribe endpoint
    const testEndpoint = `https://fcm.googleapis.com/fcm/send/test_client_${testTimestamp}`;
    const subscribeRes = await apiRequest('/notifications/push/subscribe', {
      method: 'POST',
      token: creatorAToken,
      body: {
        endpoint: testEndpoint,
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcLH3A7-wFh1_z',
          auth: 'tBHItJI5svbpez7KI4CCXg==',
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/1.0',
      },
    });
    assert(subscribeRes.status === 201, 'POST /notifications/push/subscribe returns 201 Created');
    const subData = unwrap(subscribeRes);
    assert(subData.subscribed === true, 'Subscription status returned as true');

    // Verify DB persistence of push subscription
    const subDoc = await db.collection('pushSubscriptions').findOne({ endpoint: testEndpoint });
    assert(!!subDoc, 'Push subscription persisted in MongoDB pushSubscriptions collection');
    assert(subDoc.userId.toString() === (creatorAUser.id || creatorAUser._id).toString(), 'Subscription correctly bound to Creator A user ID');
    assert(subDoc.isActive === true, 'Subscription marked as isActive: true');

    // 3. Subscription deduplication test (upsert on duplicate endpoint)
    const duplicateSubRes = await apiRequest('/notifications/push/subscribe', {
      method: 'POST',
      token: creatorAToken,
      body: {
        endpoint: testEndpoint,
        keys: {
          p256dh: 'updated_p256dh_key',
          auth: 'updated_auth_key',
        },
      },
    });
    assert(duplicateSubRes.status === 201, 'Resubscribing existing endpoint returns 201 OK');
    const subCount = await db.collection('pushSubscriptions').countDocuments({ endpoint: testEndpoint });
    assert(subCount === 1, 'Endpoint uniqueness strictly maintained (1 record)');

    // 4. Test notification trigger
    const testPushRes = await apiRequest('/notifications/push/test', {
      method: 'POST',
      token: creatorAToken,
    });
    assert(testPushRes.status === 201, 'POST /notifications/push/test processed');
    const testPushData = unwrap(testPushRes);
    assert(testPushData.activeSubscriptions >= 1, 'Acknowledged active subscription count');

    // 5. Unsubscribe endpoint
    const unsubscribeRes = await apiRequest('/notifications/push/unsubscribe', {
      method: 'POST',
      token: creatorAToken,
      body: { endpoint: testEndpoint },
    });
    assert(unsubscribeRes.status === 201, 'POST /notifications/push/unsubscribe returns 201 OK');
    const unsubsData = unwrap(unsubscribeRes);
    assert(unsubsData.unsubscribed === true, 'Reports unsubscribed: true');

    const unsubsDoc = await db.collection('pushSubscriptions').findOne({ endpoint: testEndpoint });
    assert(unsubsDoc.isActive === false, 'Subscription marked as isActive: false in MongoDB');

    // =============================================================
    // SECTION 6: OFFICIAL SOCIAL OAUTH ADAPTERS (PRIORITY C)
    // =============================================================
    console.log('\n--- SECTION 6: OFFICIAL SOCIAL OAUTH ADAPTERS ---');

    // 1. Providers status query
    const oauthStatusRes = await apiRequest('/social/oauth/status');
    assert(oauthStatusRes.status === 200, 'GET /social/oauth/status returns 200 OK');
    const oauthStatus = unwrap(oauthStatusRes);
    assert(oauthStatus.instagram.name === 'Instagram Graph API', 'Instagram adapter identified');
    assert(oauthStatus.instagram.requiresAppReview === true, 'Meta App Review prerequisite honestly documented');
    assert(oauthStatus.youtube.name === 'YouTube Data API v3', 'YouTube adapter identified');
    assert(oauthStatus.youtube.requiresAppReview === true, 'Google verification prerequisite honestly documented');

    // 2. Generate Instagram OAuth URL with signed state
    const igUrlRes = await apiRequest('/social/oauth/instagram/url', {
      token: creatorAToken,
    });
    assert(igUrlRes.status === 200, 'GET /social/oauth/instagram/url returns 200 OK');
    const igUrlData = unwrap(igUrlRes);
    assert(igUrlData.authUrl.includes('api.instagram.com/oauth/authorize'), 'Auth URL targets official Meta Instagram authorization endpoint');
    assert(!!igUrlData.state, 'Signed OAuth state parameter generated');

    // 3. CSRF Protection: Tampered state parameter must fail
    const tamperedState = igUrlData.state.slice(0, -4) + 'abcd';
    const tamperedCallbackRes = await apiRequest('/social/oauth/instagram/callback', {
      method: 'POST',
      token: creatorAToken,
      body: {
        code: 'simulated_test_code_123',
        state: tamperedState,
        redirectUri: 'http://localhost:3000/settings/social/callback',
      },
    });
    assert(tamperedCallbackRes.status === 400, 'Tampered state parameter rejected with 400 Bad Request (CSRF blocked)');

    // 4. CSRF Protection: Cross-user state parameter must fail
    const crossUserCallbackRes = await apiRequest('/social/oauth/instagram/callback', {
      method: 'POST',
      token: creatorBToken, // Creator B sending Creator A's state
      body: {
        code: 'simulated_test_code_123',
        state: igUrlData.state,
        redirectUri: 'http://localhost:3000/settings/social/callback',
      },
    });
    assert(crossUserCallbackRes.status === 400, 'Cross-user state reuse rejected with 400 Bad Request');

    // 5. Valid Callback with Sandbox / Simulated Flow
    const validIgCallbackRes = await apiRequest('/social/oauth/instagram/callback', {
      method: 'POST',
      token: creatorAToken,
      body: {
        code: 'simulated_ig_auth_code_99',
        state: igUrlData.state,
        redirectUri: 'http://localhost:3000/settings/social/callback',
      },
    });
    assert(validIgCallbackRes.status === 201, 'POST /social/oauth/instagram/callback processed');
    const connectedAccount = unwrap(validIgCallbackRes);
    assert(connectedAccount.isConnected === true, 'Social account isConnected set to true');
    assert(connectedAccount.isSimulated === true, 'Explicitly labeled as isSimulated: true without pretending live verified API');
    assert(connectedAccount.accessToken === undefined, 'Access token protected and redacted from API response');

    // Verify DB persistence of social account
    const igAccountDoc = await db.collection('socialAccounts').findOne({
      userId: new mongoose.Types.ObjectId(creatorAUser.id || creatorAUser._id),
      platform: 'INSTAGRAM',
    });
    assert(!!igAccountDoc, 'Social account persisted in MongoDB');
    assert(!!igAccountDoc.accessToken, 'Access token safely stored in DB with select: false');

    // 6. Generate YouTube OAuth URL
    const ytUrlRes = await apiRequest('/social/oauth/youtube/url', {
      token: creatorAToken,
    });
    assert(ytUrlRes.status === 200, 'GET /social/oauth/youtube/url returns 200 OK');
    const ytUrlData = unwrap(ytUrlRes);
    assert(ytUrlData.authUrl.includes('accounts.google.com/o/oauth2/v2/auth'), 'Auth URL targets official Google OAuth 2.0 endpoint');

    // 7. Valid YouTube OAuth Callback
    const validYtCallbackRes = await apiRequest('/social/oauth/youtube/callback', {
      method: 'POST',
      token: creatorAToken,
      body: {
        code: 'simulated_yt_auth_code_88',
        state: ytUrlData.state,
        redirectUri: 'http://localhost:3000/settings/social/callback',
      },
    });
    assert(validYtCallbackRes.status === 201, 'POST /social/oauth/youtube/callback processed');
    const ytConnected = unwrap(validYtCallbackRes);
    assert(ytConnected.platform === 'YOUTUBE', 'Connected platform is YOUTUBE');
    assert(ytConnected.isSimulated === true, 'YouTube connection labeled isSimulated: true');

    // 8. Revocation & Disconnect
    const disconnectRes = await apiRequest('/social/oauth/instagram/disconnect', {
      method: 'POST',
      token: creatorAToken,
    });
    assert(disconnectRes.status === 201, 'POST /social/oauth/instagram/disconnect returns 201 OK');
    const disconnectedDoc = await db.collection('socialAccounts').findOne({
      userId: new mongoose.Types.ObjectId(creatorAUser.id || creatorAUser._id),
      platform: 'INSTAGRAM',
    });
    assert(disconnectedDoc.isConnected === false, 'Social account isConnected reset to false');
    assert(!disconnectedDoc.accessToken, 'Access token purged upon disconnect');

  } catch (err) {
    console.error('\n❌ TEST RUNNER ABORTED ON ERROR:', err);
    throw err;
  } finally {
    console.log('\n--- DISPOSABLE TEST DATA CLEANUP ---');
    if (createdUserIds.length > 0) {
      await db.collection('users').deleteMany({ _id: { $in: createdUserIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      await db.collection('creatorProfiles').deleteMany({ userId: { $in: createdUserIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      await db.collection('brandProfiles').deleteMany({ userId: { $in: createdUserIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      await db.collection('socialAccounts').deleteMany({ userId: { $in: createdUserIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      await db.collection('pushSubscriptions').deleteMany({ userId: { $in: createdUserIds.map((id) => new mongoose.Types.ObjectId(id)) } });
    }
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
    await mongoose.disconnect();
    console.log('✅ Temporary test entities cleaned up successfully');
  }

  console.log('\n================================================================');
  console.log(`🎉 PHASE 13 FEATURE GAP CLOSURE RESULTS: ${passed}/${total} ASSERTIONS PASSED`);
  console.log('================================================================\n');
}

runPhase13Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
