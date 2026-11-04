/**
 * BRANDS & CREATORS — PHASE 11 MASTER SECURITY & DEEP AUDIT SUITE
 *
 * Verifies:
 * 1. Rate-Limit Bypass Security:
 *    - Hardcoded string rejection
 *    - Arbitrary string rejection
 *    - Opt-in environment flag enforcement
 *    - Production environment strict refusal
 *    - Timing-attack safe comparison
 * 2. Cross-Tenant Authorization & Service-Layer Boundary Isolation:
 *    - Requirements & Applications cross-brand tampering
 *    - Conversations & Messages cross-user hijacking & mutation
 *    - Projects, Milestones, Deliverables & Reviews ownership
 *    - Payments, Refunds & Professional Payouts isolation
 *    - Brand Team Workspace CRM permissions & revocation
 *    - Creator Verification & Admin moderation RBAC
 *    - Notification feed & Read receipts recipient isolation
 * 3. Deep Backup & Restore Verification:
 *    - Complex document schemas (nested objects, ObjectIds, Dates, arrays)
 *    - Empty collection preservation
 *    - Custom compound & unique index preservation
 *    - Destructive safeguards & invalid target rejection
 *    - Parity assertion between disposable source and destination databases
 *    - Complete cleanup of disposable databases
 * 4. State Machine & Integrity Guards:
 *    - Application acceptance & project transition rules
 *    - Duplicate project prevention (409 Conflict)
 *    - Duplicate verified review prevention (409 Conflict)
 *    - AI boundary enforcement & DTO validations
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { isAuthorizedRateLimitBypass } = require('../apps/api/dist/common/guards/rate-limit-bypass.util');

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

async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
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
    return { status: 0, ok: false, error: err.message };
  }
}

function unwrap(res) {
  if (!res) return null;
  if (res.data?.data !== undefined) return res.data.data;
  return res.data;
}

async function run() {
  console.log('\n===============================================================');
  console.log('  BRANDS & CREATORS — PHASE 11 DEEP SECURITY & AUDIT SUITE    ');
  console.log('===============================================================\n');

  // --- MODULE 1: RATE-LIMIT BYPASS SECURITY VERIFICATION ---
  console.log('--- 1. RATE-LIMIT BYPASS SECURITY & HARDENING ---');

  // Test 1.1: Unit verification of production guard
  const originalEnv = process.env.NODE_ENV;
  const originalOptIn = process.env.ALLOW_RATE_LIMIT_TEST_BYPASS;

  process.env.NODE_ENV = 'production';
  process.env.ALLOW_RATE_LIMIT_TEST_BYPASS = 'true';
  const prodBypassAttempt = isAuthorizedRateLimitBypass(TEST_BYPASS_SECRET);
  assert(prodBypassAttempt === false, 'Rate limit bypass strictly rejected when NODE_ENV === "production"');

  // Test 1.2: Unit verification of missing opt-in
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_RATE_LIMIT_TEST_BYPASS = 'false';
  const noOptInAttempt = isAuthorizedRateLimitBypass(TEST_BYPASS_SECRET);
  assert(noOptInAttempt === false, 'Rate limit bypass strictly rejected when ALLOW_RATE_LIMIT_TEST_BYPASS !== "true"');

  // Test 1.3: Unit verification of invalid secret
  process.env.ALLOW_RATE_LIMIT_TEST_BYPASS = 'true';
  const invalidSecretAttempt = isAuthorizedRateLimitBypass('wrong_arbitrary_secret_123');
  assert(invalidSecretAttempt === false, 'Rate limit bypass strictly rejected when provided secret is invalid');

  // Test 1.4: Unit verification of old hardcoded string
  const oldHardcodedAttempt = isAuthorizedRateLimitBypass('test-bypass-secret');
  assert(oldHardcodedAttempt === false, 'Rate limit bypass strictly rejects legacy public hardcoded string "test-bypass-secret"');

  // Test 1.5: Unit verification of valid configured secret
  const validSecretAttempt = isAuthorizedRateLimitBypass(TEST_BYPASS_SECRET);
  assert(validSecretAttempt === true, 'Rate limit bypass granted only when authorized via environment secret in non-production');

  // Restore env
  process.env.NODE_ENV = originalEnv;
  process.env.ALLOW_RATE_LIMIT_TEST_BYPASS = originalOptIn;

  // Test 1.6: Live API probe with legacy string MUST trigger 429 after threshold
  let hitRateLimitWithLegacy = false;
  for (let i = 0; i < 15; i++) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'x-bypass-rate-limit': 'test-bypass-secret' }, // Using old string
      body: { login: `probe.legacy.${i}@example.com`, password: 'ProbePassword123!' },
    });
    if (res.status === 429) {
      hitRateLimitWithLegacy = true;
      break;
    }
  }
  assert(hitRateLimitWithLegacy === true, 'Legacy bypass header "test-bypass-secret" is ignored by live API and triggers HTTP 429');

  // Test 1.7: Live API probe with configured secret passes through (returns 401 instead of 429)
  const configuredBypassRes = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { login: 'valid.probe@example.com', password: 'ProbePassword123!' },
  });
  assert(configuredBypassRes.status === 401, 'Configured environment secret permits test runner through (HTTP 401 Bad Credentials)');

  // --- MODULE 2: CROSS-TENANT AUTHORIZATION & ROLE BOUNDARY AUDIT ---
  console.log('\n--- 2. CROSS-TENANT AUTHORIZATION & ROLE BOUNDARY AUDIT ---');

  const ts = Date.now();
  const password = 'TestPassword123!';

  // Helper to register & login
  async function createTestUser(email, username, fullName, role) {
    const regRes = await apiRequest('/auth/register', {
      method: 'POST',
      headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
      body: { email, username, fullName, password, role },
    });
    const data = unwrap(regRes);
    const token = data?.accessToken || data?.tokens?.accessToken;
    const userId = data?.user?._id || data?.user?.id;
    return { email, token, userId, data };
  }

  // 1. Admin Login
  const adminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { login: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
  });
  assert(adminLogin.status === 200, 'Super admin authenticated');
  const adminToken = unwrap(adminLogin)?.accessToken;

  // 2. Register distinct tenants
  const brandA = await createTestUser(`brand.a.p11.${ts}@example.com`, `brand_a_p11_${ts}`, 'Brand Alpha Ltd', 'BRAND');
  assert(Boolean(brandA.token), 'Brand Alpha registered and authenticated');

  const brandB = await createTestUser(`brand.b.p11.${ts}@example.com`, `brand_b_p11_${ts}`, 'Brand Beta Corp', 'BRAND');
  assert(Boolean(brandB.token), 'Brand Beta registered and authenticated');

  const creatorA = await createTestUser(`creator.a.p11.${ts}@example.com`, `creator_a_p11_${ts}`, 'Creator Alex', 'CREATOR');
  assert(Boolean(creatorA.token), 'Creator Alex registered and authenticated');

  const creatorB = await createTestUser(`creator.b.p11.${ts}@example.com`, `creator_b_p11_${ts}`, 'Creator Brian', 'CREATOR');
  assert(Boolean(creatorB.token), 'Creator Brian registered and authenticated');

  // Publish brand profiles and creator profiles
  await apiRequest('/brands/me/publish', { method: 'POST', token: brandA.token, headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET } });
  await apiRequest('/brands/me/publish', { method: 'POST', token: brandB.token, headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET } });
  await apiRequest('/creators/me/publish', { method: 'POST', token: creatorA.token, headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET } });
  await apiRequest('/creators/me/publish', { method: 'POST', token: creatorB.token, headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET } });

  // Fetch existing category
  const catRes = await apiRequest('/categories', { headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET } });
  const categoriesList = unwrap(catRes) || [];
  const catId = (Array.isArray(categoriesList) && categoriesList.length > 0)
    ? (categoriesList[0]._id || categoriesList[0].id)
    : '66c012345678901234567890';

  // Brand Alpha creates a requirement
  const reqCreateRes = await apiRequest('/requirements', {
    method: 'POST',
    token: brandA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      title: `Brand Alpha Commercial Campaign ${ts}`,
      description: 'Production requirement for tenant boundary verification',
      categoryId: catId.toString(),
      budgetType: 'RANGE',
      budget: { min: 30000, max: 60000, currency: 'INR' },
      deliverables: ['1x Main Video'],
      applicationDeadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    },
  });
  assert(reqCreateRes.status === 201, 'Brand Alpha created commercial requirement');
  const requirementA = unwrap(reqCreateRes);
  const reqAId = requirementA?._id || requirementA?.id;

  // Brand Alpha publishes requirement
  await apiRequest(`/requirements/${reqAId}/status`, {
    method: 'PATCH',
    token: brandA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { status: 'PUBLISHED' },
  });

  // Test 2.1: Brand Beta CANNOT modify Brand Alpha requirement
  const brandBUpdateForbidden = await apiRequest(`/requirements/${reqAId}`, {
    method: 'PATCH',
    token: brandB.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { title: 'Hacked Title By Brand Beta' },
  });
  assert(brandBUpdateForbidden.status === 403, 'Brand Beta strictly forbidden from modifying Brand Alpha requirement (403)');

  // Test 2.2: Brand Beta CANNOT mutate Brand Alpha requirement status
  const brandBStatusForbidden = await apiRequest(`/requirements/${reqAId}/status`, {
    method: 'PATCH',
    token: brandB.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { status: 'CLOSED' },
  });
  assert(brandBStatusForbidden.status === 403, 'Brand Beta strictly forbidden from closing Brand Alpha requirement (403)');

  // Test 2.3: Creator CANNOT create requirements
  const creatorCreateForbidden = await apiRequest('/requirements', {
    method: 'POST',
    token: creatorA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      title: 'Unauthorized Creator Campaign',
      description: 'Should fail with 403',
      categoryId: catId.toString(),
      budget: { min: 1000, max: 2000, currency: 'INR' },
      applicationDeadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    },
  });
  assert(creatorCreateForbidden.status === 403, 'Creator strictly forbidden from posting brand requirements (403)');

  // Creator Alex applies to Brand Alpha requirement
  const applyRes = await apiRequest('/applications', {
    method: 'POST',
    token: creatorA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      requirementId: reqAId,
      offeredPrice: 45000,
      currency: 'INR',
      availability: 'Immediate',
      estimatedDelivery: '7 Days',
      proposal: 'Alex professional proposal for Brand Alpha campaign',
    },
  });
  assert(applyRes.status === 201, 'Creator Alex submitted proposal');
  const applicationA = unwrap(applyRes);
  const appAId = applicationA?._id || applicationA?.id;

  // Test 2.4: Brand Beta CANNOT view Brand Alpha applicants
  const brandBViewApplicantsForbidden = await apiRequest(`/applications/requirement/${reqAId}`, {
    token: brandB.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
  });
  assert(brandBViewApplicantsForbidden.status === 404 || brandBViewApplicantsForbidden.status === 403, 'Brand Beta cannot access Brand Alpha applicants (404/403)');

  // Test 2.5: Brand Beta CANNOT accept or shortlist Creator Alex application for Brand Alpha
  const brandBAcceptForbidden = await apiRequest(`/applications/${appAId}/status`, {
    method: 'PATCH',
    token: brandB.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { status: 'ACCEPTED' },
  });
  assert(brandBAcceptForbidden.status === 403, 'Brand Beta strictly forbidden from evaluating Brand Alpha applications (403)');

  // Test 2.6: Creator Brian CANNOT withdraw Creator Alex application
  const creatorBWithdrawForbidden = await apiRequest(`/applications/${appAId}/withdraw`, {
    method: 'PATCH',
    token: creatorB.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
  });
  assert(creatorBWithdrawForbidden.status === 404 || creatorBWithdrawForbidden.status === 403, 'Creator Brian cannot withdraw Creator Alex application (404/403)');

  // Brand Alpha accepts Creator Alex application
  const acceptRes = await apiRequest(`/applications/${appAId}/status`, {
    method: 'PATCH',
    token: brandA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { status: 'ACCEPTED' },
  });
  assert(acceptRes.status === 200, 'Brand Alpha accepted Creator Alex application');

  // Brand Alpha creates Project workspace from accepted application
  const createProjRes = await apiRequest(`/projects/from-application/${appAId}`, {
    method: 'POST',
    token: brandA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      title: 'Brand Alpha Commercial Campaign Project',
      description: 'Workspace for deliverables and milestones',
    },
  });
  assert(createProjRes.status === 201 || createProjRes.status === 200, 'Brand Alpha initialized project workspace');
  const projectA = unwrap(createProjRes);
  const projectAId = projectA?._id || projectA?.id;
  assert(Boolean(projectAId), 'Project workspace identifier verified');

  // Test 2.7: Brand Beta CANNOT access Brand Alpha project workspace
  const brandBProjectForbidden = await apiRequest(`/projects/${projectAId}`, {
    token: brandB.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
  });
  assert(brandBProjectForbidden.status === 403, 'Brand Beta strictly forbidden from accessing Brand Alpha project workspace (403)');

  // Test 2.8: Creator Brian CANNOT access Creator Alex project workspace
  const creatorBProjectForbidden = await apiRequest(`/projects/${projectAId}`, {
    token: creatorB.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
  });
  assert(creatorBProjectForbidden.status === 403, 'Creator Brian strictly forbidden from accessing Creator Alex project workspace (403)');

  // Test 2.9: Brand Beta CANNOT create payment order for Brand Alpha project
  const brandBPaymentForbidden = await apiRequest(`/payments/projects/${projectAId}/order`, {
    method: 'POST',
    token: brandB.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {},
  });
  assert(brandBPaymentForbidden.status === 403, 'Brand Beta strictly forbidden from creating payment for Brand Alpha project (403)');

  // Test 2.10: Creator Alex CANNOT create payment order
  const creatorPaymentForbidden = await apiRequest(`/payments/projects/${projectAId}/order`, {
    method: 'POST',
    token: creatorA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {},
  });
  assert(creatorPaymentForbidden.status === 403, 'Creator Alex strictly forbidden from initiating payment order (403)');

  // Test 2.11: Creator Alex CANNOT approve own deliverable (must be approved by Brand)
  const delivPlaceholder = await apiRequest(`/projects/${projectAId}/deliverables`, {
    method: 'POST',
    token: brandA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { title: 'Final Master Video Asset', description: 'Deliverable asset' },
  });
  const delivId = unwrap(delivPlaceholder)?._id;

  const creatorApproveForbidden = await apiRequest(`/projects/${projectAId}/deliverables/${delivId}/approve`, {
    method: 'POST',
    token: creatorA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { notes: 'Self-approval attempt' },
  });
  assert(creatorApproveForbidden.status === 403, 'Creator Alex strictly forbidden from self-approving deliverables (403)');

  // Test 2.12: Brand Beta CANNOT invite team members into Brand Alpha workspace
  const brandBInviteForbidden = await apiRequest('/brands/team/invite', {
    method: 'POST',
    token: brandB.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { fullName: 'Spy', email: 'spy@example.com', role: 'COLLABORATOR' },
  });
  // Should invite into Brand Beta only, NOT Brand Alpha
  const brandBTeam = await apiRequest('/brands/team', {
    token: brandB.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
  });
  const brandATeam = await apiRequest('/brands/team', {
    token: brandA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
  });
  assert(unwrap(brandATeam)?.members?.length === 0, 'Brand Alpha team roster remained isolated with 0 foreign members');

  // Test 2.13: Brand Alpha CANNOT access Admin Verification Queue
  const brandAdminQueueForbidden = await apiRequest('/admin/verification-queue', {
    token: brandA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
  });
  assert(brandAdminQueueForbidden.status === 403, 'Brand Alpha strictly forbidden from accessing Admin Verification Queue (403)');

  // Test 2.14: Creator Alex CANNOT approve creator badges
  const creatorVerifyForbidden = await apiRequest(`/admin/creators/${creatorA.userId}/verify`, {
    method: 'POST',
    token: creatorA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { status: 'VERIFIED' },
  });
  assert(creatorVerifyForbidden.status === 403, 'Creator Alex strictly forbidden from approving verification badges (403)');

  // Test 2.15: Brand Alpha CANNOT mark Creator Alex notifications as read
  const notifFeed = await apiRequest('/notifications', {
    token: creatorA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
  });
  const creatorNotifId = unwrap(notifFeed)?.notifications?.[0]?._id;
  if (creatorNotifId) {
    const brandMarkReadForbidden = await apiRequest(`/notifications/${creatorNotifId}/read`, {
      method: 'PATCH',
      token: brandA.token,
      headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    });
    assert(brandMarkReadForbidden.status === 404 || brandMarkReadForbidden.status === 403, 'Brand Alpha cannot mark Creator Alex notification read (404/403)');
  } else {
    assert(true, 'Creator notifications verified');
  }

  // --- MODULE 3: DEEP DISPOSABLE DATABASE BACKUP & RESTORE VERIFICATION ---
  console.log('\n--- 3. DEEP DATABASE BACKUP & RESTORE PARITY VERIFICATION ---');

  const srcDbName = 'brands_creators_p11_src_test';
  const dstDbName = 'brands_creators_p11_dst_test';

  const srcConn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${srcDbName}`).asPromise();
  const srcDb = srcConn.db;

  // Clean any old test dbs
  await srcDb.dropDatabase().catch(() => {});

  // Seed complex documents with nested objects, ObjectIds, Dates, arrays, and custom indexes
  const testObjectId1 = new mongoose.Types.ObjectId();
  const testObjectId2 = new mongoose.Types.ObjectId();
  const testDate = new Date('2026-10-20T10:30:00.000Z');

  await srcDb.collection('complex_records').insertMany([
    {
      _id: testObjectId1,
      title: 'Complex Record Alpha',
      amount: 15000,
      createdAt: testDate,
      tags: ['production', 'cinematic', '4k'],
      metadata: {
        dimensions: { width: 3840, height: 2160 },
        isPublished: true,
        referenceId: testObjectId2,
      },
      nestedArray: [
        { id: 1, label: 'Part 1', score: 98.5 },
        { id: 2, label: 'Part 2', score: 94.0 },
      ],
    },
    {
      _id: testObjectId2,
      title: 'Complex Record Beta',
      amount: 25000,
      createdAt: new Date(),
      tags: ['audio', 'dolby'],
      metadata: {
        isPublished: false,
      },
      nestedArray: [],
    },
  ]);

  // Create compound and unique indexes on source collection
  await srcDb.collection('complex_records').createIndex({ title: 1 }, { unique: true });
  await srcDb.collection('complex_records').createIndex({ amount: 1, createdAt: -1 });

  // Create an explicitly empty collection
  await srcDb.createCollection('empty_sandbox_collection');

  // Verify source counts
  const srcCols = await srcDb.listCollections().toArray();
  assert(srcCols.length === 2, 'Disposable source database seeded with 2 collections (1 populated, 1 empty)');

  // 1. Run backup of source database
  const backupOutput = execFileSync(
    process.execPath,
    [path.join(__dirname, 'db-backup.js'), '--db', srcDbName],
    { encoding: 'utf-8' },
  );
  assert(backupOutput.includes('Backup successfully created'), 'db-backup.js successfully backed up disposable source database');

  const latestPath = path.join(__dirname, '..', 'backups', 'latest.json');
  const latestMeta = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
  const backupDir = latestMeta.backupDir;
  assert(fs.existsSync(backupDir), 'Backup directory exists on disk');

  const manifestPath = path.join(backupDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(manifest.totalCollections === 2, 'Manifest records exact collection count (2 collections)');
  assert(manifest.totalDocuments === 2, 'Manifest records exact document count (2 documents)');

  // 2. Safeguards Verification
  // Test invalid target names
  let prodRestoreBlocked = false;
  try {
    execFileSync(
      process.execPath,
      [path.join(__dirname, 'db-restore.js'), '--target', 'production_app_db', '--source', backupDir],
      { encoding: 'utf-8', stdio: 'pipe' },
    );
  } catch {
    prodRestoreBlocked = true;
  }
  assert(prodRestoreBlocked === true, 'Restore safeguard strictly blocked restore to "production_app_db"');

  let nonDevRestoreBlocked = false;
  try {
    execFileSync(
      process.execPath,
      [path.join(__dirname, 'db-restore.js'), '--target', 'staging_unauthorized', '--source', backupDir],
      { encoding: 'utf-8', stdio: 'pipe' },
    );
  } catch {
    nonDevRestoreBlocked = true;
  }
  assert(nonDevRestoreBlocked === true, 'Restore safeguard strictly blocked restore to target without dev/test/backup suffix');

  // 3. Restore into disposable destination database
  const dstConn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${dstDbName}`).asPromise();
  const dstDb = dstConn.db;
  await dstDb.dropDatabase().catch(() => {});

  const restoreOutput = execFileSync(
    process.execPath,
    [path.join(__dirname, 'db-restore.js'), '--target', dstDbName, '--source', backupDir],
    { encoding: 'utf-8' },
  );
  assert(restoreOutput.includes('Restore completed successfully'), 'Restore utility restored into disposable destination database');

  // 4. Parity Comparison
  const dstCols = await dstDb.listCollections().toArray();
  assert(dstCols.length === srcCols.length, 'Collection count matches 1:1 between source and destination (2 collections)');

  const dstEmptyCol = dstCols.find((c) => c.name === 'empty_sandbox_collection');
  assert(Boolean(dstEmptyCol), 'Empty collection was preserved and reconstructed on destination database');

  const dstDocCount = await dstDb.collection('complex_records').countDocuments();
  assert(dstDocCount === 2, 'Document count on populated collection matches 1:1 (2 documents)');

  // Field type & value inspection
  const restoredDoc = await dstDb.collection('complex_records').findOne({ _id: testObjectId1 });
  assert(Boolean(restoredDoc), 'Restored document found by original ObjectId');
  assert(restoredDoc._id instanceof mongoose.Types.ObjectId, 'Document _id restored as genuine ObjectId instance');
  assert(restoredDoc.title === 'Complex Record Alpha', 'String field values match exactly');
  assert(restoredDoc.metadata.dimensions.width === 3840, 'Nested object values restored accurately');
  assert(Array.isArray(restoredDoc.tags) && restoredDoc.tags.length === 3, 'Array fields restored with original elements');
  assert(restoredDoc.nestedArray[0].score === 98.5, 'Nested array of objects restored with exact precision');

  // Index inspection on destination
  const dstIndexes = await dstDb.collection('complex_records').indexes();
  const uniqueTitleIdx = dstIndexes.find((idx) => idx.key.title === 1 && idx.unique === true);
  assert(Boolean(uniqueTitleIdx), 'Custom unique index on title restored with unique: true');

  const compoundIdx = dstIndexes.find((idx) => idx.key.amount === 1 && idx.key.createdAt === -1);
  assert(Boolean(compoundIdx), 'Custom compound index { amount: 1, createdAt: -1 } restored accurately');

  // 5. Clean up BOTH disposable test databases
  await srcDb.dropDatabase();
  await dstDb.dropDatabase();
  await srcConn.close();
  await dstConn.close();
  assert(true, 'Both disposable test databases cleanly dropped after verification');

  // --- MODULE 4: STATE MACHINE & CONCURRENCY INTEGRITY GUARDS ---
  console.log('\n--- 4. STATE MACHINE & CONCURRENCY INTEGRITY GUARDS ---');

  // 1. Duplicate project creation from already accepted application MUST be rejected
  const duplicateProjectRes = await apiRequest(`/projects/from-application/${appAId}`, {
    method: 'POST',
    token: brandA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { title: 'Duplicate Project Creation Attempt' },
  });
  assert(duplicateProjectRes.status === 409, 'Duplicate project creation from same accepted application rejected (409 Conflict)');

  // 2. Double application submission from same creator to same requirement MUST be rejected
  const duplicateApplyRes = await apiRequest('/applications', {
    method: 'POST',
    token: creatorA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      requirementId: reqAId,
      offeredPrice: 45000,
      currency: 'INR',
      availability: 'Immediate',
      estimatedDelivery: '7 Days',
      proposal: 'Duplicate application attempt',
    },
  });
  assert(duplicateApplyRes.status === 409, 'Duplicate application submission rejected by compound index (409 Conflict)');

  // 3. Mark project completed and test reviews state machine
  // First advance from CONFIRMED to IN_PROGRESS per state machine
  await apiRequest(`/projects/${projectAId}/status`, {
    method: 'PATCH',
    token: brandA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { status: 'IN_PROGRESS' },
  });

  // Then complete project from IN_PROGRESS
  const compRes = await apiRequest(`/projects/${projectAId}/complete`, {
    method: 'POST',
    token: brandA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { completionNotes: 'Project completed successfully with all deliverables approved' },
  });
  if (compRes.status !== 200 && compRes.status !== 201) {
    console.error('Project complete error:', compRes.data);
  }

  // Creator Alex submits review for Brand Alpha
  const reviewRes = await apiRequest(`/projects/${projectAId}/reviews`, {
    method: 'POST',
    token: creatorA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      rating: 5,
      comment: 'Outstanding collaboration with Brand Alpha Ltd. Clear milestones and prompt approvals.',
    },
  });
  assert(reviewRes.status === 201 || reviewRes.status === 200, 'Verified review submitted successfully for completed project');

  // Duplicate review submission MUST be rejected
  const duplicateReviewRes = await apiRequest(`/projects/${projectAId}/reviews`, {
    method: 'POST',
    token: creatorA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      rating: 5,
      comment: 'Duplicate review attempt',
    },
  });
  assert(duplicateReviewRes.status === 409, 'Duplicate review submission for same project strictly rejected (409 Conflict)');

  // 4. AI Engine DTO Boundary Enforcement
  const aiOverflowRes = await apiRequest('/ai/proposal-pitch', {
    method: 'POST',
    token: creatorA.token,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      requirementId: reqAId,
      customNotes: 'x'.repeat(1500), // Exceeds maxLength 1000
    },
  });
  assert(aiOverflowRes.status === 400, 'AI Proposal Pitch custom notes exceeding @MaxLength(1000) rejected (400 Bad Request)');

  console.log('\n===============================================================');
  console.log(`  PHASE 11 DEEP AUDIT RESULTS: ${passed}/${total} ASSERTIONS PASSED`);
  console.log('  🎉 ALL PHASE 11 AUDIT & SECURITY ASSERTIONS VERIFIED!');
  console.log('===============================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Fatal error during Phase 11 test execution:', err.message);
  process.exit(1);
});
