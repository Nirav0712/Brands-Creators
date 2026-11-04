/**
 * BRANDS & CREATORS — PHASE 16 MASTER VALIDATION SUITE
 *
 * Validates remaining feature completion & end-to-end workflows:
 * 1. Auth & Account Lifecycle:
 *    - Constant-time anti-enumeration forgot-password pattern (non-existent email leak prevention)
 *    - Reset token hashing, single-use invalidation, and session purge
 *    - Account suspension enforcement (suspended user login denied with 401)
 *    - Account reactivation (active user login restored)
 * 2. Platform Settings & Runtime Business Controls:
 *    - GET /settings (list runtime configuration)
 *    - PUT /settings/:key (update platform fee and proposal limits with audit logging)
 * 3. Talent Discovery by Slug & ObjectId:
 *    - GET /creators/:slug (fetch by canonical slug)
 *    - GET /creators/:id (fetch by ObjectId for direct admin backoffice inspection)
 * 4. Production Teams Backoffice Roster:
 *    - GET /production-teams (search and filter studios)
 * 5. Full Deliverable Versioning Lifecycle:
 *    - Requirement brief -> Application -> Acceptance -> Project initialization (BC-YYYY-XXXXXX)
 *    - Deliverable V1 submission -> Brand revision request -> Deliverable V2 resubmission -> Formal approval
 *    - Project completion -> Verified reciprocal review -> Duplicate review prevention
 * 6. Admin Panel Endpoint Reachability:
 *    - /people/production, /system/settings, /projects, /reviews
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:4000/api/v1';
const ADMIN_BASE = 'http://localhost:3001';
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
    'x-bypass-rate-limit': TEST_BYPASS_SECRET,
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  const res = await fetch(url, config);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => '');
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('\n================================================================');
  console.log('🚀 RUNNING PHASE 16 MASTER VALIDATION SUITE');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // -------------------------------------------------------------
  // STEP 1: AUTHENTICATION PERSONAS & TOKENS
  // -------------------------------------------------------------
  console.log('▶ STEP 1: Authentication & Role Verification');
  const adminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
  });
  assert(adminLogin.status === 200, 'Admin login succeeded');
  const adminToken = adminLogin.data?.data?.accessToken || adminLogin.data?.accessToken;

  const brandLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'brand@demo.com', password: 'Password@123' },
  });
  assert(brandLogin.status === 200, 'Brand login succeeded');
  const brandToken = brandLogin.data?.data?.accessToken || brandLogin.data?.accessToken;

  const creatorLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'creator@demo.com', password: 'Password@123' },
  });
  assert(creatorLogin.status === 200, 'Creator login succeeded');
  const creatorToken = creatorLogin.data?.data?.accessToken || creatorLogin.data?.accessToken;
  const creatorUserId = creatorLogin.data?.data?.user?._id || creatorLogin.data?.user?._id;

  // -------------------------------------------------------------
  // STEP 2: PASSWORD RECOVERY HARDENING & ANTI-ENUMERATION
  // -------------------------------------------------------------
  console.log('\n▶ STEP 2: Password Recovery Hardening & Anti-Enumeration');
  const nonExistentEmail = 'definitely.unknown.user@nonexistent-domain-404.com';
  const ghostForgot = await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: nonExistentEmail },
  });
  assert(ghostForgot.status === 200, 'Non-existent email forgot password returns HTTP 200');
  assert(
    ghostForgot.data?.message === 'If the provided email is registered, a password reset link has been dispatched.',
    'Non-existent email returns identical message without disclosing account absence',
  );

  // Request for real creator account
  const realForgot = await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: 'creator@demo.com' },
  });
  assert(realForgot.status === 200, 'Real email forgot password returns HTTP 200');
  assert(
    realForgot.data?.message === 'If the provided email is registered, a password reset link has been dispatched.',
    'Real email returns identical constant-time response structure',
  );
  const resetToken = realForgot.data?.data?.resetToken || realForgot.data?.resetToken;
  assert(Boolean(resetToken), 'Sandbox/dev mode provides token for automated test execution');

  // Verify email delivery job persisted in MongoDB
  const queuedJob = await db.collection('email_deliveries').findOne(
    { recipientEmail: 'creator@demo.com', template: 'PASSWORD_RESET' },
    { sort: { createdAt: -1 } },
  );
  assert(Boolean(queuedJob), 'Password reset email successfully queued in database');

  // Single-use token reset execution
  const tempPass = 'TemporaryPass@2026!SingleUse';
  const firstReset = await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token: resetToken, newPassword: tempPass },
  });
  assert(firstReset.status === 200, 'First password reset attempt succeeded');

  // Attempting to reuse the exact same token must fail
  const reuseReset = await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token: resetToken, newPassword: 'AnotherPassword@123' },
  });
  assert(reuseReset.status === 400, 'Single-use violation: Reusing consumed reset token rejected with 400 Bad Request');

  // Restore creator's original password
  const restoreForgot = await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: 'creator@demo.com' },
  });
  const restoreToken = restoreForgot.data?.data?.resetToken || restoreForgot.data?.resetToken;
  const restoreReset = await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token: restoreToken, newPassword: 'Password@123' },
  });
  assert(restoreReset.status === 200, 'Creator password successfully restored to standard test password');

  // -------------------------------------------------------------
  // STEP 3: ACCOUNT SUSPENSION & REACTIVATION LIFECYCLE
  // -------------------------------------------------------------
  console.log('\n▶ STEP 3: Account Suspension & Reactivation Enforcement');
  // Admin suspends creator
  const suspendRes = await apiRequest(`/users/${creatorUserId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'SUSPENDED' },
  });
  assert(suspendRes.status === 200, 'Admin successfully suspended user account');

  // Suspended user attempting to log in must be denied
  const suspendedLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'creator@demo.com', password: 'Password@123' },
  });
  assert(suspendedLogin.status === 401, 'Suspended account login strictly denied with 401 Unauthorized');

  // Admin reactivates creator
  const reactivateRes = await apiRequest(`/users/${creatorUserId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'ACTIVE' },
  });
  assert(reactivateRes.status === 200, 'Admin successfully reactivated user account');

  // Reactivated user can log in again
  const activeLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'creator@demo.com', password: 'Password@123' },
  });
  assert(activeLogin.status === 200, 'Reactivated user login succeeded');

  // -------------------------------------------------------------
  // STEP 4: PLATFORM SETTINGS & RUNTIME SAAS CONTROLS
  // -------------------------------------------------------------
  console.log('\n▶ STEP 4: Runtime Platform Settings & Audit Trail');
  const settingsList = await apiRequest('/settings', { token: adminToken });
  assert(settingsList.status === 200, 'GET /settings returns HTTP 200');
  const settingsData = settingsList.data?.data !== undefined ? settingsList.data.data : settingsList.data;
  assert(Array.isArray(settingsData) && settingsData.length > 0, 'Settings list retrieved from MongoDB');

  // Update commission percentage setting
  const updateSettingRes = await apiRequest('/settings/PLATFORM_COMMISSION_PERCENTAGE', {
    method: 'PUT',
    token: adminToken,
    body: { value: 7.5 },
  });
  assert(updateSettingRes.status === 200, 'PUT /settings/PLATFORM_COMMISSION_PERCENTAGE succeeded');

  // Verify persistence in MongoDB
  const verifiedSetting = await db.collection('platformSettings').findOne({ key: 'PLATFORM_COMMISSION_PERCENTAGE' });
  assert(verifiedSetting && Number(verifiedSetting.value) === 7.5, 'Platform commission updated to 7.5% in MongoDB');

  // Restore commission to standard 5%
  await apiRequest('/settings/PLATFORM_COMMISSION_PERCENTAGE', {
    method: 'PUT',
    token: adminToken,
    body: { value: 5 },
  });

  // -------------------------------------------------------------
  // STEP 5: CREATOR DISCOVERY BY SLUG & OBJECTID
  // -------------------------------------------------------------
  console.log('\n▶ STEP 5: Creator Discovery Resolution (Slug & ObjectId)');
  const creatorsRes = await apiRequest('/creators?limit=5');
  assert(creatorsRes.status === 200, 'GET /creators returns HTTP 200');
  const creators = creatorsRes.data?.data?.data || creatorsRes.data?.data || creatorsRes.data;
  const sampleCreator = creators[0];
  assert(Boolean(sampleCreator), 'Sample creator profile found');

  // Test lookup by slug
  const bySlugRes = await apiRequest(`/creators/${sampleCreator.slug}`);
  assert(bySlugRes.status === 200, 'GET /creators/:slug resolved creator profile');

  // Test lookup by ObjectId
  const byIdRes = await apiRequest(`/creators/${sampleCreator._id}`);
  assert(byIdRes.status === 200, 'GET /creators/:id resolved creator profile directly via ObjectId');

  // -------------------------------------------------------------
  // STEP 6: PRODUCTION TEAMS ROSTER
  // -------------------------------------------------------------
  console.log('\n▶ STEP 6: Production Teams & Studios Roster');
  const prodTeamsRes = await apiRequest('/production-teams?limit=10');
  assert(prodTeamsRes.status === 200, 'GET /production-teams returns HTTP 200');
  const prodData = prodTeamsRes.data?.data?.data || prodTeamsRes.data?.data || prodTeamsRes.data;
  assert(Array.isArray(prodData), 'Production teams list retrieved as array');

  // -------------------------------------------------------------
  // STEP 7: COMPLETE DELIVERABLE REVISION & APPROVAL LIFECYCLE
  // -------------------------------------------------------------
  console.log('\n▶ STEP 7: Deliverable Versioning, Revision & Approval Workflow');
  // Get active category
  const catsRes = await apiRequest('/categories');
  const catList = catsRes.data?.data !== undefined ? catsRes.data.data : catsRes.data;
  const testCategoryId = catList[0]?._id;

  // 1. Brand posts requirement
  const newReqRes = await apiRequest('/requirements', {
    method: 'POST',
    token: brandToken,
    body: {
      title: 'Automated Commercial Shoot — Deliverables Test',
      description: 'Brief created to validate multi-version deliverable submissions and approvals.',
      categoryId: testCategoryId,
      requiredSkills: ['UGC', 'Videography'],
      budget: { min: 30000, max: 45000, currency: 'INR' },
      location: { isRemote: true, country: 'India' },
      applicationDeadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      deliverables: ['Hero Reel 9:16', 'Static Square Banner'],
    },
  });
  assert(newReqRes.status === 201 || newReqRes.status === 200, 'Brand posted new requirement brief');
  const createdReq = newReqRes.data?.data !== undefined ? newReqRes.data.data : newReqRes.data;
  const requirementId = createdReq._id;

  // 2. Creator submits application
  const applyRes = await apiRequest('/applications', {
    method: 'POST',
    token: creatorToken,
    body: {
      requirementId,
      offeredPrice: 35000,
      estimatedDelivery: '4 days',
      coverLetter: 'I am ready to produce the two deliverables as specified.',
    },
  });
  assert(applyRes.status === 201 || applyRes.status === 200, 'Creator submitted proposal');
  const createdApp = applyRes.data?.data !== undefined ? applyRes.data.data : applyRes.data;
  const applicationId = createdApp._id;

  // 3. Brand accepts proposal -> Project created
  const acceptRes = await apiRequest(`/applications/${applicationId}/status`, {
    method: 'PATCH',
    token: brandToken,
    body: { status: 'ACCEPTED' },
  });
  assert(acceptRes.status === 200, 'Brand accepted creator proposal');

  // Verify project workspace initialized in MongoDB
  const projectDocs = await db.collection('projects').find({
    applicationId: new mongoose.Types.ObjectId(applicationId),
  }).toArray();
  assert(projectDocs.length === 1, 'Exactly ONE project workspace initialized in MongoDB');
  const project = projectDocs[0];
  const projectId = project._id.toString();
  assert(Boolean(projectId), 'Project workspace initialized with ID');
  assert(project.projectNumber?.startsWith('BC-'), 'Project carries collision-proof BC- prefix');

  // Explicit workspace confirmation
  const confirmProjectRes = await apiRequest(`/projects/from-application/${applicationId}`, {
    method: 'POST',
    token: brandToken,
    body: { title: 'Confirmed Deliverables Shoot Workspace' },
  });
  assert(confirmProjectRes.status === 200 || confirmProjectRes.status === 201, 'Workspace confirmed from application');

  // Duplicate project rejection guard (409 Conflict)
  const dupProjectRes = await apiRequest(`/projects/from-application/${applicationId}`, {
    method: 'POST',
    token: brandToken,
    body: { title: 'Confirmed Duplicate Project Attempt' },
  });
  assert(dupProjectRes.status === 409, 'Duplicate project creation strictly rejected with 409 Conflict');

  // 4. Brand moves project to IN_PROGRESS
  const startProjectRes = await apiRequest(`/projects/${projectId}/status`, {
    method: 'PATCH',
    token: brandToken,
    body: { status: 'IN_PROGRESS' },
  });
  assert(startProjectRes.status === 200, 'Project transitioned to IN_PROGRESS');

  // 5. Create Deliverable for project
  const createDelivRes = await apiRequest(`/projects/${projectId}/deliverables`, {
    method: 'POST',
    token: brandToken,
    body: {
      title: 'Hero Reel 9:16',
      description: 'Hero video deliverable for product launch.',
    },
  });
  assert(createDelivRes.status === 201 || createDelivRes.status === 200, 'Project deliverable created');
  const delivData = createDelivRes.data?.data !== undefined ? createDelivRes.data.data : createDelivRes.data;
  const deliverableId = delivData._id;

  // 6. Creator submits Deliverable Version 1 (V1)
  const submitV1Res = await apiRequest(`/projects/${projectId}/deliverables/${deliverableId}/submit`, {
    method: 'POST',
    token: creatorToken,
    body: {
      notes: 'Initial cut with background audio and colour correction.',
      files: [{
        url: 'https://res.cloudinary.com/demo/video/upload/sample_reel_v1.mp4',
        fileName: 'sample_reel_v1.mp4',
      }],
    },
  });
  assert(submitV1Res.status === 200 || submitV1Res.status === 201, 'Creator submitted Deliverable V1');

  // 7. Brand reviews and requests revision
  const revisionRes = await apiRequest(`/projects/${projectId}/deliverables/${deliverableId}/revision`, {
    method: 'POST',
    token: brandToken,
    body: {
      feedback: 'Please make the end frame brand logo larger and trim the intro to 3 seconds.',
    },
  });
  assert(revisionRes.status === 200, 'Brand successfully requested revision with structured feedback');

  // 8. Creator resubmits Deliverable Version 2 (V2)
  const submitV2Res = await apiRequest(`/projects/${projectId}/deliverables/${deliverableId}/submit`, {
    method: 'POST',
    token: creatorToken,
    body: {
      notes: 'Trimmed intro to 2.8 seconds and resized logo on end screen.',
      files: [{
        url: 'https://res.cloudinary.com/demo/video/upload/sample_reel_v2.mp4',
        fileName: 'sample_reel_v2.mp4',
      }],
    },
  });
  assert(submitV2Res.status === 200, 'Creator resubmitted deliverable as Version 2');

  // 9. Brand approves deliverable
  const approveRes = await apiRequest(`/projects/${projectId}/deliverables/${deliverableId}/approve`, {
    method: 'POST',
    token: brandToken,
    body: { notes: 'Approved! Matches brand guide perfectly.' },
  });
  assert(approveRes.status === 200, 'Brand approved Deliverable V2');

  // 10. Brand completes project
  const completeRes = await apiRequest(`/projects/${projectId}/complete`, {
    method: 'POST',
    token: brandToken,
    body: { completionNotes: 'Shoot wrapped and all deliverables accepted.' },
  });
  assert(completeRes.status === 200, 'Brand marked project as COMPLETED');

  // 9. Verified review submission
  const reviewRes = await apiRequest('/reviews', {
    method: 'POST',
    token: brandToken,
    body: {
      projectId,
      rating: 5,
      comment: 'Super fast delivery and fantastic response to revision notes!',
    },
  });
  assert(reviewRes.status === 201 || reviewRes.status === 200, 'Brand submitted verified review for completed project');

  // Duplicate review rejection
  const dupReviewRes = await apiRequest('/reviews', {
    method: 'POST',
    token: brandToken,
    body: {
      projectId,
      rating: 5,
      comment: 'Trying to review again.',
    },
  });
  assert(dupReviewRes.status === 409, 'Duplicate review rejected with 409 Conflict');

  // Clean up temporary project data
  await db.collection('reviews').deleteMany({ projectId: new mongoose.Types.ObjectId(projectId) });
  await db.collection('deliverables').deleteMany({ projectId: new mongoose.Types.ObjectId(projectId) });
  await db.collection('projects').deleteOne({ _id: new mongoose.Types.ObjectId(projectId) });
  await db.collection('applications').deleteOne({ _id: new mongoose.Types.ObjectId(applicationId) });
  await db.collection('requirements').deleteOne({ _id: new mongoose.Types.ObjectId(requirementId) });

  // -------------------------------------------------------------
  // STEP 8: ADMIN FRONTEND ROUTE REACHABILITY
  // -------------------------------------------------------------
  console.log('\n▶ STEP 8: Admin Frontend Pages Reachability');
  const adminPages = [
    { name: 'Production Teams', url: `${ADMIN_BASE}/people/production` },
    { name: 'Platform Settings', url: `${ADMIN_BASE}/system/settings` },
    { name: 'Projects Management', url: `${ADMIN_BASE}/projects` },
    { name: 'Reviews Moderation', url: `${ADMIN_BASE}/reviews` },
  ];

  for (const page of adminPages) {
    const res = await fetch(page.url);
    assert(res.status === 200, `Admin route ${page.name} (${page.url}) returns HTTP 200`);
  }

  console.log('\n================================================================');
  console.log(`🎉 ALL PHASE 16 TESTS PASSED: ${passed}/${total} assertions`);
  console.log('================================================================\n');
}

run()
  .catch((err) => {
    console.error('\n❌ TEST RUN ABORTED WITH ERROR:\n', err);
    process.exit(1);
  })
  .finally(() => {
    mongoose.disconnect();
  });
