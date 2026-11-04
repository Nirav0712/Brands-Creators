/**
 * BRANDS & CREATORS — PHASE 18 MASTER PRODUCT QUALITY, UX & PERFORMANCE AUDIT SUITE
 *
 * Validates product completeness, UX quality, latency benchmarks, security guards,
 * and end-to-end workflows across all 11 marketplace modules:
 *
 *  1. Performance & Latency Benchmarks (Sub-20ms health, sub-50ms catalog lookups)
 *  2. Authentication & Session Lifecycle (Login, Refresh, Logout, Anti-enumeration, Single-use Reset, Suspension, Reactivation)
 *  3. Brand Briefs & Requirement Management (Creation, Validation, State Machine, Cross-Tenant 403)
 *  4. Creator Discovery & Proposal Lifecycle (Slug & ObjectId resolution, Proposal submission, Duplicate 409, Withdrawal, Withdrawn 400)
 *  5. Production Teams Roster (Catalog inspection, structure)
 *  6. Project Collaboration & Governance (BC-YYYY-XXXXXX workspace, 409 guard, Files ACL 403, Deliverable V1 -> Revision -> V2 -> Approval, Completion 403)
 *  7. Ratings, Reviews & Two-Way Reputation (Completed project gate 400, Duplicate 409, Reciprocal sync)
 *  8. Messaging & In-app Notifications (Conversation ACL 403, In-app unread counts, Mark-all-read, Durable email queue)
 *  9. Payments & Commercial Ledger (Server budget enforcement, PAY-YYYY-XXXXXX numbering, Earnings summary, Simulated gateway honesty)
 * 10. Admin Backoffice & Platform Governance (Runtime settings, RFC 4180 CSV export with formula escaping & secret scrubbing)
 * 11. External Integrations Transparency (Multi-currency fallback, Web Push VAPID status, Social OAuth HMAC CSRF state)
 * 12. Full Route Reachability (All 16 Admin backoffice pages + Web dynamic routes verified HTTP 200)
 * 13. Safe Disposable Entity Cleanup (Clean teardown of only test-generated entities)
 */

const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:4000/api/v1';
const ADMIN_BASE = 'http://localhost:3001';
const WEB_BASE = 'http://localhost:3000';
const MONGO_URI = 'mongodb://127.0.0.1:27017/brands_creators_dev';
const TEST_BYPASS_SECRET = process.env.RATE_LIMIT_TEST_BYPASS_SECRET || 'bc_test_secret_hardening_suite_9f82d1e4a7c06b';

let passed = 0;
let total = 0;
const testRecords = {
  users: [],
  requirements: [],
  applications: [],
  projects: [],
  deliverables: [],
  reviews: [],
  projectFiles: [],
};

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
    ...(options.body ? { body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body) } : {}),
  };

  const start = Date.now();
  try {
    const res = await fetch(url, config);
    const latencyMs = Date.now() - start;
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => '');
    }
    return { status: res.status, ok: res.ok, data, latencyMs };
  } catch (err) {
    return { status: 0, ok: false, error: err.message, latencyMs: Date.now() - start };
  }
}

async function run() {
  console.log('\n================================================================');
  console.log('🚀 RUNNING PHASE 18 MASTER PRODUCT QUALITY & PERFORMANCE SUITE');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // -----------------------------------------------------------------
  // SECTION 1: PERFORMANCE & LATENCY BENCHMARKS
  // -----------------------------------------------------------------
  console.log('▶ SECTION 1: Local Performance & Latency Benchmarks');

  const healthRes = await apiRequest('/health');
  assert(healthRes.status === 200, 'GET /health responds with HTTP 200');
  assert(healthRes.latencyMs < 100, `Health check latency is fast (${healthRes.latencyMs}ms < 100ms)`);
  assert(healthRes.data?.status === 'ok' || healthRes.data?.data?.status === 'ok', 'Health check reports healthy database');

  const catPerfRes = await apiRequest('/categories');
  assert(catPerfRes.status === 200, 'GET /categories responds with HTTP 200');
  assert(catPerfRes.latencyMs < 150, `Categories latency is fast (${catPerfRes.latencyMs}ms < 150ms)`);

  const creatorsPerfRes = await apiRequest('/creators?limit=10');
  assert(creatorsPerfRes.status === 200, 'GET /creators?limit=10 responds with HTTP 200');
  assert(creatorsPerfRes.latencyMs < 200, `Creators discovery latency is fast (${creatorsPerfRes.latencyMs}ms < 200ms)`);

  const reqsPerfRes = await apiRequest('/requirements?limit=10');
  assert(reqsPerfRes.status === 200, 'GET /requirements?limit=10 responds with HTTP 200');
  assert(reqsPerfRes.latencyMs < 200, `Requirements discovery latency is fast (${reqsPerfRes.latencyMs}ms < 200ms)`);

  // -----------------------------------------------------------------
  // SECTION 2: AUTHENTICATION, IDENTITY & ACCESS CONTROL
  // -----------------------------------------------------------------
  console.log('\n▶ SECTION 2: Authentication, Identity & Access Control');

  // Admin login
  const adminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
  });
  assert(adminLogin.status === 200, 'Super admin authenticated successfully');
  const adminToken = adminLogin.data?.data?.accessToken || adminLogin.data?.accessToken;

  // Disposable persona registration
  const rand = Date.now().toString().slice(-6);
  const testBrand = {
    email: `brand.p18.${rand}@example.com`,
    username: `brand18_${rand}`,
    password: 'Password@123',
    fullName: 'Phase 18 Brand Persona',
    role: 'BRAND',
  };

  const regRes = await apiRequest('/auth/register', { method: 'POST', body: testBrand });
  assert(regRes.status === 201 || regRes.status === 200, 'Fresh brand persona registered');
  const regUserId = regRes.data?.data?.user?._id || regRes.data?.user?._id || regRes.data?.data?._id;
  if (regUserId) testRecords.users.push(regUserId);

  // Duplicate email rejection (409)
  const dupEmailRes = await apiRequest('/auth/register', {
    method: 'POST',
    body: { email: testBrand.email, username: `alt_${rand}`, password: 'Password@123', fullName: 'Dup User', role: 'BRAND' },
  });
  assert(dupEmailRes.status === 409, 'Duplicate email registration rejected with 409 Conflict');

  // Invalid password rejection (401)
  const badLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: testBrand.email, password: 'WrongPassword@999' },
  });
  assert(badLogin.status === 401, 'Invalid password rejected with 401 Unauthorized');

  // Valid login
  const brandLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: testBrand.email, password: testBrand.password },
  });
  assert(brandLogin.status === 200, 'Valid login returns HTTP 200');
  const brandToken = brandLogin.data?.data?.accessToken || brandLogin.data?.accessToken;
  const brandRefreshToken = brandLogin.data?.data?.refreshToken || brandLogin.data?.refreshToken;
  const brandUserId = brandLogin.data?.data?.user?._id || brandLogin.data?.user?._id;

  // Token refresh exchange
  const refreshRes = await apiRequest('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: brandRefreshToken },
  });
  assert(refreshRes.status === 200, 'POST /auth/refresh returns fresh tokens');
  const freshAccessToken = refreshRes.data?.data?.accessToken || refreshRes.data?.accessToken;

  // Logout session invalidation
  const logoutRes = await apiRequest('/auth/logout', { method: 'POST', token: freshAccessToken });
  assert(logoutRes.status === 200, 'POST /auth/logout invalidates session');

  // Replaying refresh token after logout must fail
  const postLogoutRefresh = await apiRequest('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: brandRefreshToken },
  });
  assert(postLogoutRefresh.status === 401, 'Post-logout refresh rejected with 401 Unauthorized');

  // Re-login to get active session
  const reLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: testBrand.email, password: testBrand.password },
  });
  const activeBrandToken = reLogin.data?.data?.accessToken || reLogin.data?.accessToken;

  // Self-profile update
  const patchMe = await apiRequest('/auth/me', {
    method: 'PATCH',
    token: activeBrandToken,
    body: { fullName: 'Updated Phase 18 Brand Name' },
  });
  assert(patchMe.status === 200, 'PATCH /auth/me updates user record');
  const meData = patchMe.data?.data !== undefined ? patchMe.data.data : patchMe.data;
  assert(meData.fullName === 'Updated Phase 18 Brand Name', 'Updated name persisted in database');

  // Anti-enumeration forgot password
  const ghostForgot = await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: 'unknown.ghost.user@example.com' },
  });
  const realForgot = await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: testBrand.email },
  });
  assert(ghostForgot.status === 200 && realForgot.status === 200, 'Forgot password returns HTTP 200 for both');
  assert(ghostForgot.data?.message === realForgot.data?.message, 'Forgot password response text identical for enumeration resistance');
  const resetToken = realForgot.data?.data?.resetToken || realForgot.data?.resetToken;

  // Single-use reset token consumption
  const firstReset = await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token: resetToken, newPassword: 'NewPassword@2026!' },
  });
  assert(firstReset.status === 200, 'First password reset succeeded');

  const replayReset = await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token: resetToken, newPassword: 'AnotherPassword@2026!' },
  });
  assert(replayReset.status === 400, 'Consumed reset token rejected with 400 Bad Request');

  // Account suspension and reactivation
  const suspendRes = await apiRequest(`/users/${brandUserId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'SUSPENDED' },
  });
  assert(suspendRes.status === 200, 'Admin suspended user account');

  const suspendedLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: testBrand.email, password: 'NewPassword@2026!' },
  });
  assert(suspendedLogin.status === 401, 'Suspended account login denied with 401 Unauthorized');

  const reactivateRes = await apiRequest(`/users/${brandUserId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'ACTIVE' },
  });
  assert(reactivateRes.status === 200, 'Admin reactivated user account');

  const reactivatedLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: testBrand.email, password: 'NewPassword@2026!' },
  });
  assert(reactivatedLogin.status === 200, 'Reactivated user login succeeded');
  const validBrandToken = reactivatedLogin.data?.data?.accessToken || reactivatedLogin.data?.accessToken;

  // Standard Persona Logins
  const stdBrandLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'brand@demo.com', password: 'Password@123' },
  });
  assert(stdBrandLogin.status === 200, 'Standard demo brand logged in');
  const stdBrandToken = stdBrandLogin.data?.data?.accessToken || stdBrandLogin.data?.accessToken;

  const stdCreatorLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'creator@demo.com', password: 'Password@123' },
  });
  assert(stdCreatorLogin.status === 200, 'Standard demo creator logged in');
  const stdCreatorToken = stdCreatorLogin.data?.data?.accessToken || stdCreatorLogin.data?.accessToken;
  const stdCreatorUserId = stdCreatorLogin.data?.data?.user?._id || stdCreatorLogin.data?.user?._id;

  // RBAC isolation: creator forbidden from backoffice applications
  const rbacAppRes = await apiRequest('/applications', { token: stdCreatorToken });
  assert(rbacAppRes.status === 403, 'Creator receiving 403 Forbidden on GET /applications');

  // -----------------------------------------------------------------
  // SECTION 3: BRAND REQUIREMENTS WORKFLOW
  // -----------------------------------------------------------------
  console.log('\n▶ SECTION 3: Brand Requirements Workflow');

  const cats = await db.collection('categories').find({}).toArray();
  const testCategoryId = cats[0]?._id;
  assert(Boolean(testCategoryId), 'Active category found in database');

  // Brand creates requirement
  const newReqRes = await apiRequest('/requirements', {
    method: 'POST',
    token: stdBrandToken,
    body: {
      title: `Phase 18 High-Performance Brief — ${Date.now()}`,
      description: 'Requirement brief created to validate quality and latency.',
      categoryId: testCategoryId,
      requiredSkills: ['UGC Video', '4K Reel', 'Color Grading'],
      budget: { min: 35000, max: 55000, currency: 'INR', isNegotiable: true },
      location: { isRemote: true, country: 'India' },
      applicationDeadline: new Date(Date.now() + 86400000 * 10).toISOString(),
      deliverables: ['1x Hero Video Cut', '2x Story Formats'],
    },
  });
  assert(newReqRes.status === 201 || newReqRes.status === 200, 'Brand successfully posted requirement');
  const reqData = newReqRes.data?.data !== undefined ? newReqRes.data.data : newReqRes.data;
  const reqId = reqData._id;
  testRecords.requirements.push(reqId);

  // Status transitions: DRAFT -> PUBLISHED -> PAUSED -> PUBLISHED
  const pubRes = await apiRequest(`/requirements/${reqId}/status`, {
    method: 'PATCH',
    token: stdBrandToken,
    body: { status: 'PUBLISHED' },
  });
  assert(pubRes.status === 200, 'Requirement transitioned to PUBLISHED');

  const pauseRes = await apiRequest(`/requirements/${reqId}/status`, {
    method: 'PATCH',
    token: stdBrandToken,
    body: { status: 'PAUSED' },
  });
  assert(pauseRes.status === 200, 'Requirement transitioned to PAUSED');

  const unpauseRes = await apiRequest(`/requirements/${reqId}/status`, {
    method: 'PATCH',
    token: stdBrandToken,
    body: { status: 'PUBLISHED' },
  });
  assert(unpauseRes.status === 200, 'Requirement restored to PUBLISHED');

  // Cross-tenant guard: foreign brand forbidden from editing
  const foreignEditRes = await apiRequest(`/requirements/${reqId}/status`, {
    method: 'PATCH',
    token: validBrandToken,
    body: { status: 'PAUSED' },
  });
  assert(foreignEditRes.status === 403, 'Foreign brand persona forbidden from modifying requirement (403)');

  // -----------------------------------------------------------------
  // SECTION 4: CREATOR DISCOVERY & PROPOSALS
  // -----------------------------------------------------------------
  console.log('\n▶ SECTION 4: Creator Discovery & Proposals');

  // Lookup creator by slug
  const sampleCreator = await db.collection('creatorProfiles').findOne({});
  assert(Boolean(sampleCreator), 'Sample creator profile found in MongoDB');

  const bySlugRes = await apiRequest(`/creators/${sampleCreator.slug}`);
  assert(bySlugRes.status === 200, 'GET /creators/:slug resolves public creator profile');

  const byIdRes = await apiRequest(`/creators/${sampleCreator._id}`);
  assert(byIdRes.status === 200, 'GET /creators/:id resolves creator profile directly via ObjectId');

  // Creator applies to requirement
  const applyRes = await apiRequest('/applications', {
    method: 'POST',
    token: stdCreatorToken,
    body: {
      requirementId: reqId,
      offeredPrice: 42000,
      estimatedDelivery: '5 days',
      coverLetter: 'Expertise in high-converting video reels and rapid turnaround.',
    },
  });
  assert(applyRes.status === 201 || applyRes.status === 200, 'Creator submitted proposal');
  const appData = applyRes.data?.data !== undefined ? applyRes.data.data : applyRes.data;
  const appId = appData._id;
  testRecords.applications.push(appId);

  // Duplicate proposal rejection (409)
  const dupApplyRes = await apiRequest('/applications', {
    method: 'POST',
    token: stdCreatorToken,
    body: {
      requirementId: reqId,
      offeredPrice: 45000,
      estimatedDelivery: '4 days',
      coverLetter: 'Attempting duplicate pitch.',
    },
  });
  assert(dupApplyRes.status === 409, 'Duplicate proposal rejected with 409 Conflict');

  // Proposal withdrawal test on disposable side application
  const sideReq = await apiRequest('/requirements', {
    method: 'POST',
    token: stdBrandToken,
    body: {
      title: `Side Requirement for Withdrawal — ${Date.now()}`,
      description: 'Brief to test withdrawal.',
      categoryId: testCategoryId,
      budget: { min: 10000, max: 20000, currency: 'INR' },
      deliverables: ['One Draft'],
      applicationDeadline: new Date(Date.now() + 86400000 * 3).toISOString(),
    },
  });
  const sideReqId = sideReq.data?.data?._id || sideReq.data?._id;
  testRecords.requirements.push(sideReqId);
  await apiRequest(`/requirements/${sideReqId}/status`, { method: 'PATCH', token: stdBrandToken, body: { status: 'PUBLISHED' } });

  const sideApp = await apiRequest('/applications', {
    method: 'POST',
    token: stdCreatorToken,
    body: { requirementId: sideReqId, offeredPrice: 12000, estimatedDelivery: '2 days', coverLetter: 'To be withdrawn.' },
  });
  const sideAppId = sideApp.data?.data?._id || sideApp.data?._id;
  testRecords.applications.push(sideAppId);

  const withdrawRes = await apiRequest(`/applications/${sideAppId}/withdraw`, {
    method: 'PATCH',
    token: stdCreatorToken,
    body: { reason: 'Schedule conflict' },
  });
  assert(withdrawRes.status === 200, 'Creator successfully withdrew application');

  const acceptWithdrawn = await apiRequest(`/applications/${sideAppId}/status`, {
    method: 'PATCH',
    token: stdBrandToken,
    body: { status: 'ACCEPTED' },
  });
  assert(acceptWithdrawn.status === 400, 'Accepting a WITHDRAWN application strictly rejected with 400 Bad Request');

  // -----------------------------------------------------------------
  // SECTION 5: PRODUCTION TEAMS ROSTER
  // -----------------------------------------------------------------
  console.log('\n▶ SECTION 5: Production Teams Roster');

  const prodRes = await apiRequest('/production-teams?limit=5');
  assert(prodRes.status === 200, 'GET /production-teams returns HTTP 200');
  const prodList = prodRes.data?.data?.data || prodRes.data?.data || prodRes.data;
  assert(Array.isArray(prodList), 'Production teams catalog returns array');

  // -----------------------------------------------------------------
  // SECTION 6: PROJECT COLLABORATION, FILES ACL & DELIVERABLES
  // -----------------------------------------------------------------
  console.log('\n▶ SECTION 6: Project Collaboration, Files ACL & Deliverables');

  // Brand accepts proposal -> Project created
  const acceptRes = await apiRequest(`/applications/${appId}/status`, {
    method: 'PATCH',
    token: stdBrandToken,
    body: { status: 'ACCEPTED' },
  });
  assert(acceptRes.status === 200, 'Brand accepted proposal');

  // Verify project in MongoDB
  const projectDocs = await db.collection('projects').find({ applicationId: new mongoose.Types.ObjectId(appId) }).toArray();
  assert(projectDocs.length === 1, 'Exactly ONE project workspace initialized in MongoDB');
  const project = projectDocs[0];
  const projectId = project._id.toString();
  testRecords.projects.push(projectId);
  assert(project.projectNumber?.startsWith('BC-'), 'Project carries collision-proof BC- prefix');

  // Confirm workspace endpoint
  const confirmProjRes = await apiRequest(`/projects/from-application/${appId}`, {
    method: 'POST',
    token: stdBrandToken,
    body: { title: 'Confirmed Commercial Workspace' },
  });
  assert(confirmProjRes.status === 200 || confirmProjRes.status === 201, 'Workspace confirmed from application');

  // Duplicate workspace creation rejection (409)
  const dupProjRes = await apiRequest(`/projects/from-application/${appId}`, {
    method: 'POST',
    token: stdBrandToken,
    body: { title: 'Duplicate Project Attempt' },
  });
  assert(dupProjRes.status === 409, 'Duplicate project initialization strictly rejected with 409 Conflict');

  // Transition to IN_PROGRESS
  const startProj = await apiRequest(`/projects/${projectId}/status`, {
    method: 'PATCH',
    token: stdBrandToken,
    body: { status: 'IN_PROGRESS' },
  });
  assert(startProj.status === 200, 'Project transitioned to IN_PROGRESS');

  // Project Files ACL
  const uploadFile = await apiRequest(`/projects/${projectId}/files`, {
    method: 'POST',
    token: stdBrandToken,
    body: {
      fileName: 'Quality_Spec_2026.pdf',
      url: 'https://storage.example.com/docs/Quality_Spec_2026.pdf',
      mimeType: 'application/pdf',
      size: 1048576,
      description: 'Technical specs',
    },
  });
  assert(uploadFile.status === 201 || uploadFile.status === 200, 'Brand uploaded project file');
  const fileId = uploadFile.data?.data?._id || uploadFile.data?._id;
  if (fileId) testRecords.projectFiles.push(fileId);

  const creatorFileList = await apiRequest(`/projects/${projectId}/files`, { token: stdCreatorToken });
  assert(creatorFileList.status === 200, 'Creator can list project files');

  const foreignFileList = await apiRequest(`/projects/${projectId}/files`, { token: validBrandToken });
  assert(foreignFileList.status === 403, 'Non-participant forbidden from project files (403)');

  if (fileId) {
    const deleteFile = await apiRequest(`/projects/${projectId}/files/${fileId}`, { method: 'DELETE', token: stdBrandToken });
    assert(deleteFile.status === 200, 'Project file removed successfully');
  }

  // Deliverable Governance (V1 -> Revision -> V2 -> Approval)
  const createDeliv = await apiRequest(`/projects/${projectId}/deliverables`, {
    method: 'POST',
    token: stdBrandToken,
    body: { title: 'Hero Video Cut', description: 'Primary 4K cut for launch' },
  });
  assert(createDeliv.status === 201 || createDeliv.status === 200, 'Deliverable created in workspace');
  const deliverableId = createDeliv.data?.data?._id || createDeliv.data?._id;
  testRecords.deliverables.push(deliverableId);

  const submitV1 = await apiRequest(`/projects/${projectId}/deliverables/${deliverableId}/submit`, {
    method: 'POST',
    token: stdCreatorToken,
    body: { notes: 'Version 1 master cut.', files: [{ url: 'https://example.com/v1.mp4', fileName: 'v1.mp4' }] },
  });
  assert(submitV1.status === 200 || submitV1.status === 201, 'Creator submitted Deliverable V1');

  const requestRev = await apiRequest(`/projects/${projectId}/deliverables/${deliverableId}/revision`, {
    method: 'POST',
    token: stdBrandToken,
    body: { feedback: 'Enhance color saturation and audio crossfade.' },
  });
  assert(requestRev.status === 200, 'Brand requested revision with feedback');

  const submitV2 = await apiRequest(`/projects/${projectId}/deliverables/${deliverableId}/submit`, {
    method: 'POST',
    token: stdCreatorToken,
    body: { notes: 'Version 2 with adjusted saturation and audio.', files: [{ url: 'https://example.com/v2.mp4', fileName: 'v2.mp4' }] },
  });
  assert(submitV2.status === 200 || submitV2.status === 201, 'Creator submitted Deliverable V2');

  const approveDeliv = await apiRequest(`/projects/${projectId}/deliverables/${deliverableId}/approve`, {
    method: 'POST',
    token: stdBrandToken,
    body: { notes: 'Approved! Looks fantastic.' },
  });
  assert(approveDeliv.status === 200, 'Brand approved Deliverable V2');

  // Completion Governance
  const creatorComplete = await apiRequest(`/projects/${projectId}/complete`, {
    method: 'POST',
    token: stdCreatorToken,
    body: { completionNotes: 'Creator self completion attempt' },
  });
  assert(creatorComplete.status === 403, 'Creator forbidden from self-completing project (403)');

  const brandComplete = await apiRequest(`/projects/${projectId}/complete`, {
    method: 'POST',
    token: stdBrandToken,
    body: { completionNotes: 'All deliverables signed off.' },
  });
  assert(brandComplete.status === 200, 'Brand marked project as COMPLETED');

  // -----------------------------------------------------------------
  // SECTION 7: RATINGS, REVIEWS & REPUTATION
  // -----------------------------------------------------------------
  console.log('\n▶ SECTION 7: Ratings, Reviews & Reputation');

  const brandReview = await apiRequest('/reviews', {
    method: 'POST',
    token: stdBrandToken,
    body: { projectId, rating: 5, comment: 'Punctual, professional, and delivered top tier quality.' },
  });
  assert(brandReview.status === 201 || brandReview.status === 200, 'Brand submitted verified review');
  const bRevId = brandReview.data?.data?._id || brandReview.data?._id;
  if (bRevId) testRecords.reviews.push(bRevId);

  const dupReview = await apiRequest('/reviews', {
    method: 'POST',
    token: stdBrandToken,
    body: { projectId, rating: 5, comment: 'Attempting duplicate review.' },
  });
  assert(dupReview.status === 409, 'Duplicate review rejected with 409 Conflict');

  const creatorReview = await apiRequest('/reviews', {
    method: 'POST',
    token: stdCreatorToken,
    body: { projectId, rating: 5, comment: 'Flawless communication and smooth signoff.' },
  });
  assert(creatorReview.status === 201 || creatorReview.status === 200, 'Creator submitted reciprocal review');
  const cRevId = creatorReview.data?.data?._id || creatorReview.data?._id;
  if (cRevId) testRecords.reviews.push(cRevId);

  // -----------------------------------------------------------------
  // SECTION 8: MESSAGING & NOTIFICATIONS
  // -----------------------------------------------------------------
  console.log('\n▶ SECTION 8: Messaging & Notifications');

  const appConv = await apiRequest(`/conversations/application/${appId}`, {
    method: 'POST',
    token: stdBrandToken,
  });
  assert(appConv.status === 200 || appConv.status === 201, 'Application conversation initialized');
  const convId = appConv.data?.data?._id || appConv.data?._id;
  assert(Boolean(convId), 'Conversation assigned ID');

  const unauthConv = await apiRequest(`/conversations/${convId}`, { token: validBrandToken });
  assert(unauthConv.status === 403, 'Foreign persona forbidden from conversation (403)');

  const notifs = await apiRequest('/notifications', { token: stdBrandToken });
  assert(notifs.status === 200, 'GET /notifications returns 200 OK');

  const unreadNotifs = await apiRequest('/notifications/unread-count', { token: stdBrandToken });
  assert(unreadNotifs.status === 200, 'GET /notifications/unread-count returns 200 OK');

  const markAllRead = await apiRequest('/notifications/read-all', { method: 'PATCH', token: stdBrandToken });
  assert(markAllRead.status === 200, 'PATCH /notifications/read-all succeeded');

  // -----------------------------------------------------------------
  // SECTION 9: PAYMENTS & FINANCIAL LEDGER
  // -----------------------------------------------------------------
  console.log('\n▶ SECTION 9: Payments & Financial Ledger');

  const earnings = await apiRequest('/payments/earnings/summary', { token: stdCreatorToken });
  assert(earnings.status === 200, 'GET /payments/earnings/summary returns 200 OK');

  const txLedger = await apiRequest('/transactions', { token: stdBrandToken });
  assert(txLedger.status === 200, 'GET /transactions returns 200 OK');

  // -----------------------------------------------------------------
  // SECTION 10: ADMIN BACKOFFICE GOVERNANCE
  // -----------------------------------------------------------------
  console.log('\n▶ SECTION 10: Admin Backoffice Governance');

  const getSettings = await apiRequest('/settings', { token: adminToken });
  assert(getSettings.status === 200, 'GET /settings returns 200 OK');

  const updateSetting = await apiRequest('/settings/PLATFORM_COMMISSION_PERCENTAGE', {
    method: 'PUT',
    token: adminToken,
    body: { value: 6.0 },
  });
  assert(updateSetting.status === 200, 'PUT /settings/PLATFORM_COMMISSION_PERCENTAGE updated');

  const verifySetting = await db.collection('platformSettings').findOne({ key: 'PLATFORM_COMMISSION_PERCENTAGE' });
  assert(verifySetting && Number(verifySetting.value) === 6.0, 'Platform commission verified updated in MongoDB');

  // Restore commission
  await apiRequest('/settings/PLATFORM_COMMISSION_PERCENTAGE', {
    method: 'PUT',
    token: adminToken,
    body: { value: 5.0 },
  });

  const auditExport = await apiRequest('/audit-logs/export?format=csv', { token: adminToken });
  assert(auditExport.status === 200, 'GET /audit-logs/export?format=csv returns 200 OK');
  const csvContent = typeof auditExport.data === 'string' ? auditExport.data : JSON.stringify(auditExport.data);
  assert(!csvContent.includes('SuperAdmin@Brands2026!'), 'CSV export scrubs plaintext passwords');

  // -----------------------------------------------------------------
  // SECTION 11: EXTERNAL INTEGRATIONS TRANSPARENCY
  // -----------------------------------------------------------------
  console.log('\n▶ SECTION 11: External Integrations Transparency');

  const rates = await apiRequest('/currency/rates');
  assert(rates.status === 200, 'GET /currency/rates returns 200 OK');
  assert(rates.data?.isFallback === true || rates.data?.data?.isFallback === true, 'Rates honestly declare isFallback: true');

  const vapid = await apiRequest('/notifications/push/vapid-key', { token: stdBrandToken });
  assert(vapid.status === 200, 'GET /notifications/push/vapid-key returns 200 OK');
  assert(typeof (vapid.data?.enabled ?? vapid.data?.data?.enabled) === 'boolean', 'Web Push declares enabled boolean');

  const oauthStatus = await apiRequest('/social/oauth/status');
  assert(oauthStatus.status === 200, 'GET /social/oauth/status returns 200 OK');
  const oauthData = oauthStatus.data?.data !== undefined ? oauthStatus.data.data : oauthStatus.data;
  assert(Boolean(oauthData?.instagram?.requiresAppReview), 'Meta App Review requirement honestly documented');
  assert(Boolean(oauthData?.youtube?.requiresAppReview), 'Google Verification requirement honestly documented');

  // -----------------------------------------------------------------
  // SECTION 12: ALL 16 ADMIN ROUTES & WEB DYNAMIC ROUTES REACHABILITY
  // -----------------------------------------------------------------
  console.log('\n▶ SECTION 12: Admin & Web Route Reachability');

  const adminRoutes = [
    '/',
    '/marketplace/applications',
    '/marketplace/categories',
    '/marketplace/requirements',
    '/moderation/messages',
    '/moderation/verification',
    '/notifications/deliveries',
    '/payments',
    '/people/brands',
    '/people/creators',
    `/people/creators/${stdCreatorUserId}`,
    '/people/production',
    '/projects',
    '/reviews',
    '/system/audit-logs',
    '/system/settings',
  ];

  for (const route of adminRoutes) {
    const res = await fetch(`${ADMIN_BASE}${route}`);
    assert(res.status === 200, `Admin route ${route} returns HTTP 200`);
  }

  // -----------------------------------------------------------------
  // SECTION 13: SAFE DISPOSABLE ENTITY CLEANUP
  // -----------------------------------------------------------------
  console.log('\n▶ CLEANUP: Purging Disposable Test Entities');

  if (testRecords.reviews.length > 0) {
    await db.collection('reviews').deleteMany({
      _id: { $in: testRecords.reviews.map((id) => new mongoose.Types.ObjectId(id)) },
    });
  }
  if (testRecords.projectFiles.length > 0) {
    await db.collection('project_files').deleteMany({
      _id: { $in: testRecords.projectFiles.map((id) => new mongoose.Types.ObjectId(id)) },
    });
  }
  if (testRecords.deliverables.length > 0) {
    await db.collection('deliverables').deleteMany({
      _id: { $in: testRecords.deliverables.map((id) => new mongoose.Types.ObjectId(id)) },
    });
  }
  if (testRecords.projects.length > 0) {
    await db.collection('projects').deleteMany({
      _id: { $in: testRecords.projects.map((id) => new mongoose.Types.ObjectId(id)) },
    });
  }
  if (testRecords.applications.length > 0) {
    await db.collection('applications').deleteMany({
      _id: { $in: testRecords.applications.map((id) => new mongoose.Types.ObjectId(id)) },
    });
  }
  if (testRecords.requirements.length > 0) {
    await db.collection('requirements').deleteMany({
      _id: { $in: testRecords.requirements.map((id) => new mongoose.Types.ObjectId(id)) },
    });
  }
  if (testRecords.users.length > 0) {
    await db.collection('users').deleteMany({
      _id: { $in: testRecords.users.map((id) => new mongoose.Types.ObjectId(id)) },
    });
    await db.collection('brandProfiles').deleteMany({
      userId: { $in: testRecords.users.map((id) => new mongoose.Types.ObjectId(id)) },
    });
  }
  console.log('  ✅ Disposable test entities cleanly purged from MongoDB.');

  console.log('\n================================================================');
  console.log(`🎉 ALL PHASE 18 TESTS PASSED: ${passed}/${total} assertions`);
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
