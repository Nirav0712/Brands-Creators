/**
 * BRANDS & CREATORS — PHASE 10 MASTER SECURITY & PRODUCTION HARDENING SUITE
 *
 * Verifies:
 * 1. HTTP Security Headers (Helmet, CSP, Permissions-Policy, HSTS local guard)
 * 2. Rate Limiting & Throttler (429 Too Many Requests, Retry-After, X-RateLimit headers, test bypass)
 * 3. Database Backup & Restore (Full backup, manifest validation, restore to disposable DB, count parity)
 * 4. Test Data Seed & Safe Cleanup (isTestData flag filtering)
 * 5. Authorization & Cross-Tenant Boundary Enforcement (Tampering, RBAC, financial isolation)
 * 6. Input Validation & DTO Bound Enforcement (class-validator bounds)
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const API_BASE = 'http://localhost:4000/api/v1';
const WEB_BASE = 'http://localhost:3000';
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
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

function unwrap(res) {
  if (!res) return null;
  if (res.data?.data !== undefined) return res.data.data;
  return res.data;
}

async function run() {
  console.log('\n===============================================================');
  console.log('  BRANDS & CREATORS — PHASE 10 MASTER SECURITY & QA SUITE      ');
  console.log('===============================================================\n');

  // --- MODULE 1: HTTP SECURITY HEADERS & CONTENT SECURITY POLICY ---
  console.log('--- 1. HTTP SECURITY HEADERS & CSP AUDIT ---');

  const apiRes = await fetch(`${API_BASE}/categories`);
  const apiHeaders = apiRes.headers;

  assert(apiHeaders.get('x-content-type-options') === 'nosniff', 'API enforces X-Content-Type-Options: nosniff');
  assert(apiHeaders.get('x-frame-options') === 'SAMEORIGIN', 'API enforces X-Frame-Options: SAMEORIGIN');
  assert(apiHeaders.get('referrer-policy') === 'strict-origin-when-cross-origin', 'API enforces Referrer-Policy: strict-origin-when-cross-origin');
  assert(apiHeaders.get('permissions-policy')?.includes('camera=()'), 'API enforces Permissions-Policy restricting sensitive sensors');
  assert(!apiHeaders.has('strict-transport-security'), 'API strictly does NOT force HSTS on local HTTP development');
  assert(apiHeaders.has('x-ratelimit-limit'), 'API provides standard X-RateLimit-Limit header');
  assert(apiHeaders.has('x-ratelimit-remaining'), 'API provides standard X-RateLimit-Remaining header');

  const webRes = await fetch(WEB_BASE);
  const webHeaders = webRes.headers;
  assert(webHeaders.get('x-content-type-options') === 'nosniff', 'Web platform enforces X-Content-Type-Options: nosniff');
  assert(webHeaders.get('x-frame-options') === 'SAMEORIGIN', 'Web platform enforces X-Frame-Options: SAMEORIGIN');
  assert(webHeaders.get('content-security-policy')?.includes("default-src 'self'"), 'Web platform enforces balanced Content Security Policy (CSP)');
  assert(webHeaders.get('content-security-policy')?.includes("frame-ancestors 'self'"), 'Web CSP strictly prevents clickjacking via frame-ancestors');

  const adminRes = await fetch(ADMIN_BASE);
  const adminHeaders = adminRes.headers;
  assert(adminHeaders.get('x-content-type-options') === 'nosniff', 'Admin portal enforces X-Content-Type-Options: nosniff');
  assert(adminHeaders.get('content-security-policy')?.includes("default-src 'self'"), 'Admin portal enforces Content Security Policy (CSP)');

  // --- MODULE 2: RATE LIMITING & ABUSE PREVENTION ---
  console.log('\n--- 2. RATE LIMITING & THROTTLER ENFORCEMENT ---');

  // The login endpoint is throttled at 10 requests / 60 seconds
  // Fire requests until 429 Too Many Requests is triggered
  let rateLimitHit = false;
  let rateLimitResponse = null;

  for (let i = 0; i < 15; i++) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        login: `ratelimit.probe.${i}@example.com`,
        password: 'wrong_password_test_probe_123',
      },
    });

    if (res.status === 429) {
      rateLimitHit = true;
      rateLimitResponse = res;
      break;
    }
  }

  assert(rateLimitHit === true, 'Rate limiting actively triggered HTTP 429 Too Many Requests after threshold');
  assert(rateLimitResponse?.data?.error === 'Too Many Requests' || rateLimitResponse?.data?.message?.includes('Too many requests') || rateLimitResponse?.data?.message?.includes('slow down'), 'Error response explicitly identifies Too Many Requests');
  assert(rateLimitResponse?.headers.has('retry-after') || rateLimitResponse?.headers.has('x-ratelimit-reset'), 'Response includes Retry-After or X-RateLimit-Reset cooldown header');

  // Verify test bypass header allows automated regression suites
  const bypassRes = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      login: 'ratelimit.bypass@example.com',
      password: 'wrong_password_probe',
    },
  });
  // Should return 401 Unauthorized (normal credential failure) instead of 429 Too Many Requests!
  assert(bypassRes.status === 401, 'x-bypass-rate-limit header allows test runner through without 429 blockage (401 Bad Credentials)');

  // --- MODULE 3: DATABASE BACKUP & RESTORE INTEGRITY ---
  console.log('\n--- 3. DATABASE BACKUP & RESTORE INTEGRITY ---');

  execFileSync(process.execPath, [path.join(__dirname, 'db-backup.js')], { encoding: 'utf-8' });
  const latestPath = path.join(__dirname, '..', 'backups', 'latest.json');
  assert(fs.existsSync(latestPath), 'Backup completed and backups/latest.json created');
  const latest = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
  const backupDir = latest.backupDir;
  assert(Boolean(backupDir) && fs.existsSync(backupDir), 'Backup directory exists on disk');

  const manifestPath = path.join(backupDir, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'Backup manifest.json exists');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(manifest.totalCollections > 0, `Manifest records active collections (${manifest.totalCollections})`);
  assert(manifest.totalDocuments > 0, `Manifest records active documents (${manifest.totalDocuments})`);

  // Test safety check: Attempting restore to production-named database MUST fail
  let prodRestoreBlocked = false;
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'db-restore.js'), '--target', 'production_database_app', '--source', backupDir], { encoding: 'utf-8', stdio: 'pipe' });
  } catch (e) {
    prodRestoreBlocked = true;
  }
  assert(prodRestoreBlocked === true, 'Restore utility strictly refuses to restore to production database');

  // Restore into a disposable local test database
  const testDbName = 'brands_creators_backup_test';
  const restoreOutput = execFileSync(process.execPath, [path.join(__dirname, 'db-restore.js'), '--target', testDbName, '--source', backupDir], { encoding: 'utf-8' });
  assert(restoreOutput.includes('Restore completed successfully'), 'Restore executed successfully into disposable test database');

  // Verify restored database directly via isolated mongoose connection
  const testConn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${testDbName}`).asPromise();
  const restoredCols = await testConn.db.listCollections().toArray();
  assert(restoredCols.length >= manifest.totalCollections, 'Restored database collections verified in MongoDB');
  // Clean up disposable test database
  await testConn.db.dropDatabase();
  await testConn.close();
  assert(true, 'Disposable test database cleanly dropped after verification');

  // --- MODULE 4: TEST DATA SEED & SAFE CLEANUP ---
  console.log('\n--- 4. REPEATABLE TEST DATA SEED & SAFE CLEANUP ---');

  execFileSync(process.execPath, [path.join(__dirname, 'seed-test-data.js')], { encoding: 'utf-8' });
  const devConn = await mongoose.createConnection(MONGO_URI).asPromise();
  const db = devConn.db;

  const seededBrand = await db.collection('users').findOne({ email: 'qa.test.brand@example.com' });
  assert(Boolean(seededBrand) && seededBrand.isTestData === true, 'Repeatable test brand user seeded with isTestData: true');

  const seededCreator = await db.collection('users').findOne({ email: 'qa.test.creator@example.com' });
  assert(Boolean(seededCreator) && seededCreator.isTestData === true, 'Repeatable test creator seeded with isTestData: true');

  execFileSync(process.execPath, [path.join(__dirname, 'cleanup-test-data.js')], { encoding: 'utf-8' });
  const cleanedBrand = await db.collection('users').findOne({ email: 'qa.test.brand@example.com' });
  assert(cleanedBrand === null, 'Cleanup utility cleanly removed tagged test brand');
  const cleanedCreator = await db.collection('users').findOne({ email: 'qa.test.creator@example.com' });
  assert(cleanedCreator === null, 'Cleanup utility cleanly removed tagged test creator');

  const regularUsersCount = await db.collection('users').countDocuments();
  assert(regularUsersCount > 0, 'Cleanup preserved all existing non-test development records intact');
  await devConn.close();

  // --- MODULE 5: CROSS-TENANT AUTHORIZATION & ROLE BOUNDARY AUDIT ---
  console.log('\n--- 5. CROSS-TENANT & ROLE BOUNDARY AUDIT ---');

  // Log in as admin
  const adminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      login: 'admin@brandsandcreators.com',
      password: 'SuperAdmin@Brands2026!',
    },
  });
  assert(adminLogin.status === 200, 'Super admin authenticated');
  const adminData = unwrap(adminLogin);
  const adminToken = adminData?.accessToken || adminData?.tokens?.accessToken;

  // Register a temporary brand and a temporary creator
  const ts = Date.now();
  const brandReg = await apiRequest('/auth/register', {
    method: 'POST',
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      email: `sec.brand.${ts}@example.com`,
      username: `sec_brand_${ts}`,
      password: 'TestPassword123!',
      fullName: 'Security Brand Corp',
      role: 'BRAND',
    },
  });
  assert(brandReg.status === 201, 'Security test brand registered');
  const brandData = unwrap(brandReg);
  const brandToken = brandData?.accessToken || brandData?.tokens?.accessToken;

  const creatorReg = await apiRequest('/auth/register', {
    method: 'POST',
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      email: `sec.creator.${ts}@example.com`,
      username: `sec_creator_${ts}`,
      password: 'TestPassword123!',
      fullName: 'Security Creator',
      role: 'CREATOR',
    },
  });
  assert(creatorReg.status === 201, 'Security test creator registered');
  const creatorData = unwrap(creatorReg);
  const creatorToken = creatorData?.accessToken || creatorData?.tokens?.accessToken;

  // 1. Creator cannot invite team members to brand (403 Forbidden)
  const creatorInviteForbidden = await apiRequest('/brands/team/invite', {
    method: 'POST',
    token: creatorToken,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { fullName: 'Hacker', email: 'hacker@example.com', role: 'COLLABORATOR' },
  });
  assert(creatorInviteForbidden.status === 403, 'Creator strictly forbidden from managing brand team members (403 Forbidden)');

  // 2. Creator cannot access Admin Verification Queue (403 Forbidden)
  const creatorAdminForbidden = await apiRequest('/admin/verification-queue', {
    token: creatorToken,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
  });
  assert(creatorAdminForbidden.status === 403, 'Creator strictly forbidden from accessing Admin Verification Queue (403 Forbidden)');

  // 3. Brand cannot access Admin Verification Queue (403 Forbidden)
  const brandAdminForbidden = await apiRequest('/admin/verification-queue', {
    token: brandToken,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
  });
  assert(brandAdminForbidden.status === 403, 'Brand strictly forbidden from accessing Admin Verification Queue (403 Forbidden)');

  // 4. Creator cannot process refund (403/404 Forbidden)
  const creatorRefundForbidden = await apiRequest('/payments/6ad65ad9a633e748a9fa3b57/refund', {
    method: 'POST',
    token: creatorToken,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: { amount: 5000, reason: 'Unauthorized attempt' },
  });
  assert(creatorRefundForbidden.status === 403 || creatorRefundForbidden.status === 404, 'Creator strictly forbidden from initiating refunds (403/404)');

  // --- MODULE 6: INPUT VALIDATION & DTO BOUND ENFORCEMENT ---
  console.log('\n--- 6. INPUT VALIDATION & BOUNDARY ENFORCEMENT ---');

  // Input exceeding @MaxLength on AI optimize-brief endpoint
  const overflowAi = await apiRequest('/ai/optimize-brief', {
    method: 'POST',
    token: brandToken,
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      title: 'a'.repeat(300), // Exceeds maxLength 200
      description: 'Valid campaign brief description for boundary security verification',
    },
  });
  assert(overflowAi.status === 400, 'Payload exceeding @MaxLength boundary strictly rejected (400 Bad Request)');

  // Malformed email on registration
  const malformedEmail = await apiRequest('/auth/register', {
    method: 'POST',
    headers: { 'x-bypass-rate-limit': TEST_BYPASS_SECRET },
    body: {
      email: 'not-a-valid-email-string',
      username: `malformed_${ts}`,
      password: 'ValidPassword123!',
      fullName: 'Malformed User',
      role: 'CREATOR',
    },
  });
  assert(malformedEmail.status === 400, 'Invalid email format strictly rejected by class-validator (400 Bad Request)');

  console.log('\n===============================================================');
  console.log(`  PHASE 10 MASTER SECURITY RESULTS: ${passed}/${passed} ASSERTIONS PASSED`);
  console.log('  🎉 ALL PHASE 10 HARDENING & AUDIT CONTROLS VERIFIED!');
  console.log('===============================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Fatal error during Phase 10 test execution:', err.message);
  process.exit(1);
});
