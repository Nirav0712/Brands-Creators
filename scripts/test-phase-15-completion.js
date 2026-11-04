/**
 * BRANDS & CREATORS — PHASE 15 COMPLETION VALIDATION SUITE
 *
 * Validates Phase 15 implementation:
 * 1. Health & System Integrity
 * 2. Password Reset Flow (Forgot -> Token -> Reset -> Login verification -> Restore)
 * 3. User Self Profile Update (PATCH /auth/me)
 * 4. Admin Applications Listing (GET /applications - RBAC protected)
 * 5. Admin Requirements Moderation & Deletion (PATCH /requirements/:id/status & DELETE /requirements/:id)
 * 6. Admin Brands & Creators APIs (GET /brands, GET /creators)
 * 7. Frontend Route Reachability (Web, Admin, Forgot-Password, Reset-Password, People & Marketplace pages)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:4000/api/v1';
const WEB_BASE = 'http://localhost:3000';
const ADMIN_BASE = 'http://localhost:3001';
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
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 15 COMPLETION VALIDATION SUITE');
  console.log('======================================================\n');

  // STEP 1: API & Server Health
  console.log('▶ STEP 1: Core System & Services Health');
  const healthRes = await apiRequest('/health');
  assert(healthRes.status === 200, 'GET /health returns HTTP 200');
  assert(healthRes.data?.data?.database === 'connected', 'Database reports "connected"');

  // STEP 2: Authenticate Admin & Brand & Creator
  console.log('\n▶ STEP 2: Session Authentication & RBAC Tokens');
  const adminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
  });
  assert(adminLogin.status === 200, 'Admin login succeeded');
  const adminToken = adminLogin.data?.data?.accessToken || adminLogin.data?.accessToken;
  assert(Boolean(adminToken), 'Admin JWT token received');

  const brandLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'brand@demo.com', password: 'Password@123' },
  });
  assert(brandLogin.status === 200, 'Brand login succeeded');
  const brandToken = brandLogin.data?.data?.accessToken || brandLogin.data?.accessToken;
  assert(Boolean(brandToken), 'Brand JWT token received');

  const creatorLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'creator@demo.com', password: 'Password@123' },
  });
  assert(creatorLogin.status === 200, 'Creator login succeeded');
  const creatorToken = creatorLogin.data?.data?.accessToken || creatorLogin.data?.accessToken;
  assert(Boolean(creatorToken), 'Creator JWT token received');

  // STEP 3: Password Reset Lifecycle
  console.log('\n▶ STEP 3: Forgot Password & Reset Password Flow');
  const forgotRes = await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: 'creator@demo.com' },
  });
  assert(forgotRes.status === 200, 'POST /auth/forgot-password returns HTTP 200');
  assert(forgotRes.data?.success === true, 'Forgot password response indicates success');
  const resetToken = forgotRes.data?.data?.resetToken;
  assert(Boolean(resetToken), 'Sandbox environment returns resetToken for verification');

  // Reset password to new password
  const newPass = 'NewPass@2026!Updated';
  const resetRes = await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token: resetToken, newPassword: newPass },
  });
  assert(resetRes.status === 200, 'POST /auth/reset-password returns HTTP 200');
  assert(resetRes.data?.success === true, 'Reset password response indicates success');

  // Verify login with new password works
  const newLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login: 'creator@demo.com', password: newPass },
  });
  assert(newLogin.status === 200, 'Login with new password succeeded');

  // Restore original password
  const restoreForgot = await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: 'creator@demo.com' },
  });
  const restoreToken = restoreForgot.data?.data?.resetToken;
  const restoreRes = await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token: restoreToken, newPassword: 'Password@123' },
  });
  assert(restoreRes.status === 200, 'Password restored to original test password');

  // STEP 4: Self Profile Update (PATCH /auth/me)
  console.log('\n▶ STEP 4: Self Profile Update (PATCH /auth/me)');
  const updateMeRes = await apiRequest('/auth/me', {
    method: 'PATCH',
    token: creatorToken,
    body: {
      fullName: 'Ananya Verma (Verified Creator)',
      phone: '+91 98765 43210',
    },
  });
  assert(updateMeRes.status === 200, 'PATCH /auth/me returns HTTP 200');
  assert(updateMeRes.data?.data?.fullName?.includes('Verified Creator'), 'User name successfully updated in DB');

  // STEP 5: Admin Applications Listing & RBAC
  console.log('\n▶ STEP 5: Admin Applications Listing (GET /applications)');
  const creatorAppAttempt = await apiRequest('/applications', { token: creatorToken });
  assert(creatorAppAttempt.status === 403, 'Creator receives 403 Forbidden on GET /applications');

  const adminAppRes = await apiRequest('/applications?limit=10', { token: adminToken });
  assert(adminAppRes.status === 200, 'Admin receives HTTP 200 on GET /applications');
  const appData = adminAppRes.data?.data !== undefined ? adminAppRes.data.data : adminAppRes.data;
  assert(Array.isArray(appData?.items), 'Admin applications endpoint returns items array');
  assert(appData.total >= 0, 'Admin applications total count is valid');

  // STEP 6: Admin Requirements Moderation & Deletion
  console.log('\n▶ STEP 6: Admin Requirements Moderation & Deletion');
  const allReqsRes = await apiRequest('/requirements?status=ALL&limit=10');
  assert(allReqsRes.status === 200, 'GET /requirements?status=ALL returns HTTP 200');
  const reqData = allReqsRes.data?.data !== undefined ? allReqsRes.data.data : allReqsRes.data;
  const reqItems = reqData?.items || [];
  assert(reqItems.length > 0, 'Requirements found in database');

  const targetReq = reqItems[0];
  const originalStatus = targetReq.status;
  const nextStatus = originalStatus === 'PUBLISHED' ? 'PAUSED' : 'PUBLISHED';

  // Admin toggles status
  const modRes = await apiRequest(`/requirements/${targetReq._id}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: nextStatus },
  });
  assert(modRes.status === 200, `Admin successfully updated requirement status to ${nextStatus}`);

  // Admin restores status
  const revertRes = await apiRequest(`/requirements/${targetReq._id}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: originalStatus },
  });
  assert(revertRes.status === 200, `Requirement status reverted back to ${originalStatus}`);

  // Test Requirement creation and deletion by Admin
  const draftReqRes = await apiRequest('/requirements', {
    method: 'POST',
    token: brandToken,
    body: {
      title: 'Temporary Test Requirement for Deletion Flow',
      description: 'This is a temporary draft requirement created to validate deletion capability.',
      categoryId: targetReq.categoryId?._id || targetReq.categoryId,
      requiredSkills: ['Drafting', 'Quality Assurance'],
      budget: { min: 10000, max: 20000, currency: 'INR' },
      location: { isRemote: true, country: 'India' },
      applicationDeadline: new Date(Date.now() + 86400000 * 7).toISOString(),
      deliverables: ['Test Deliverable 1', 'Test Deliverable 2'],
    },
  });
  assert(draftReqRes.status === 201 || draftReqRes.status === 200, 'Brand created temporary draft requirement');
  const tempReqId = draftReqRes.data?.data?._id || draftReqRes.data?._id;

  // Non-owner, non-admin creator cannot delete
  const forbidDelete = await apiRequest(`/requirements/${tempReqId}`, {
    method: 'DELETE',
    token: creatorToken,
  });
  assert(forbidDelete.status === 403, 'Unauthorized user cannot delete requirement (403)');

  // Admin deletes requirement
  const adminDelete = await apiRequest(`/requirements/${tempReqId}`, {
    method: 'DELETE',
    token: adminToken,
  });
  assert(adminDelete.status === 200, 'Admin successfully deleted requirement (200)');

  // STEP 7: Brands & Creators API Data Feed
  console.log('\n▶ STEP 7: Brands & Creators Listing Endpoints');
  const brandsRes = await apiRequest('/brands?limit=10');
  assert(brandsRes.status === 200, 'GET /brands returns HTTP 200');
  const brandList = brandsRes.data?.data?.data || brandsRes.data?.data || brandsRes.data;
  assert(Array.isArray(brandList) && brandList.length > 0, 'Brands list populated with valid entities');

  const creatorsRes = await apiRequest('/creators?limit=10');
  assert(creatorsRes.status === 200, 'GET /creators returns HTTP 200');
  const creatorList = creatorsRes.data?.data?.data || creatorsRes.data?.data || creatorsRes.data;
  assert(Array.isArray(creatorList) && creatorList.length > 0, 'Creators list populated with valid entities');

  // STEP 8: Frontend Server Reachability
  console.log('\n▶ STEP 8: Frontend Dev Server Endpoint Reachability');
  const webHome = await fetch(`${WEB_BASE}/`);
  assert(webHome.status === 200, `Next.js Web homepage reachable (HTTP ${webHome.status})`);

  const webForgot = await fetch(`${WEB_BASE}/forgot-password`);
  assert(webForgot.status === 200, `Next.js Web /forgot-password reachable (HTTP ${webForgot.status})`);

  const webReset = await fetch(`${WEB_BASE}/reset-password`);
  assert(webReset.status === 200, `Next.js Web /reset-password reachable (HTTP ${webReset.status})`);

  const adminHome = await fetch(`${ADMIN_BASE}/`);
  assert(adminHome.status === 200, `Next.js Admin homepage reachable (HTTP ${adminHome.status})`);

  const adminBrands = await fetch(`${ADMIN_BASE}/people/brands`);
  assert(adminBrands.status === 200, `Next.js Admin /people/brands reachable (HTTP ${adminBrands.status})`);

  const adminCreators = await fetch(`${ADMIN_BASE}/people/creators`);
  assert(adminCreators.status === 200, `Next.js Admin /people/creators reachable (HTTP ${adminCreators.status})`);

  const adminReqs = await fetch(`${ADMIN_BASE}/marketplace/requirements`);
  assert(adminReqs.status === 200, `Next.js Admin /marketplace/requirements reachable (HTTP ${adminReqs.status})`);

  const adminApps = await fetch(`${ADMIN_BASE}/marketplace/applications`);
  assert(adminApps.status === 200, `Next.js Admin /marketplace/applications reachable (HTTP ${adminApps.status})`);

  console.log('\n======================================================');
  console.log(`🎉 ALL PHASE 15 TESTS PASSED: ${passed}/${total} assertions`);
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('\n❌ TEST RUN ABORTED WITH ERROR:\n', err);
  process.exit(1);
});
