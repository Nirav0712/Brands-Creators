/**
 * Phase 20: Master Profile Integration, Marketplace Consistency & Security Verification
 * Brands & Creators Marketplace SaaS
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE = 'http://localhost:4000/api/v1';
const WEB_BASE = 'http://localhost:3000';
const ADMIN_BASE = 'http://localhost:3001';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/brands_creators_dev';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✅ [PASS ${passCount}] ${message}`);
  } else {
    failCount++;
    console.error(`  ❌ [FAIL ${failCount}] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, token, headers = {}, baseUrl = API_BASE } = options;
  const reqHeaders = { ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

  let reqBody = body;
  if (body && typeof body === 'object' && !(body instanceof Buffer)) {
    reqHeaders['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(body);
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const start = Date.now();
  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: reqBody,
  });
  const duration = Date.now() - start;

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }

  return { status: res.status, headers: res.headers, data, duration };
}

// 1x1 valid PNG buffer
const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex',
);

// 1x1 valid JPEG buffer
const JPEG_1X1 = Buffer.from(
  'ffd8ffe000104a46494600010101006000600000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda0008010100003f007f00ffd9',
  'hex',
);

// 1x1 valid WebP buffer
const WEBP_1X1 = Buffer.from(
  '524946461a000000574542505650384c0d0000002f00000010071011118888fe0700',
  'hex',
);

function buildMultipart(filename, mimeType, buffer) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat([head, buffer, tail]),
  };
}

async function run() {
  console.log('\n================================================================');
  console.log('🚀 RUNNING PHASE 20: MASTER PROFILE INTEGRATION & VERIFICATION');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  let creatorToken, creatorUser, creatorProfile;
  let brandToken, brandUser, brandProfile;
  let adminToken, adminUser;
  let productionToken, productionUser, productionProfile;

  try {
    // -------------------------------------------------------------
    // MODULE 1: AUTHENTICATION & MULTI-ROLE PROFILE RETRIEVAL
    // -------------------------------------------------------------
    console.log('\n📋 MODULE 1: Multi-Role Authentication & Profile Retrieval');

    // 1.1 Super Admin Login
    const adminRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { login: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
    });
    assert(adminRes.status === 200, 'Admin login succeeds with 200');
    adminToken = adminRes.data?.data?.accessToken || adminRes.data?.accessToken;
    adminUser = adminRes.data?.data?.user || adminRes.data?.user;
    assert(Boolean(adminToken), 'Admin receives valid JWT access token');
    assert(
      adminUser.roles.includes('SUPER_ADMIN') || adminUser.roles.includes('ADMIN'),
      'Admin user has SUPER_ADMIN or ADMIN role',
    );

    // 1.2 Brand Login
    const brandRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { login: 'brand@demo.com', password: 'Password@123' },
    });
    assert(brandRes.status === 200, 'Brand login succeeds with 200');
    brandToken = brandRes.data?.data?.accessToken || brandRes.data?.accessToken;
    brandUser = brandRes.data?.data?.user || brandRes.data?.user;
    assert(Boolean(brandToken), 'Brand receives valid JWT access token');
    assert(brandUser.roles.includes('BRAND'), 'Brand user has BRAND role');

    // 1.3 Creator Login
    const creatorRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { login: 'creator@demo.com', password: 'Password@123' },
    });
    assert(creatorRes.status === 200, 'Creator login succeeds with 200');
    creatorToken = creatorRes.data?.data?.accessToken || creatorRes.data?.accessToken;
    creatorUser = creatorRes.data?.data?.user || creatorRes.data?.user;
    assert(Boolean(creatorToken), 'Creator receives valid JWT access token');
    assert(creatorUser.roles.includes('CREATOR'), 'Creator user has CREATOR role');

    // 1.4 Production Team Login / Registration Check
    let prodRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { login: 'production@demo.com', password: 'Password@123' },
    });
    if (prodRes.status !== 200) {
      // Register temporary production team if not present
      const regRes = await apiRequest('/auth/register', {
        method: 'POST',
        body: {
          email: 'production@demo.com',
          username: 'productiondemo',
          password: 'Password@123',
          fullName: 'Apex Cinema Works',
          role: 'PRODUCTION_TEAM',
        },
      });
      assert([200, 201].includes(regRes.status), 'Production team registered if missing');
      prodRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: { login: 'production@demo.com', password: 'Password@123' },
      });
    }
    assert(prodRes.status === 200, 'Production team login succeeds with 200');
    productionToken = prodRes.data?.data?.accessToken || prodRes.data?.accessToken;
    productionUser = prodRes.data?.data?.user || prodRes.data?.user;
    assert(Boolean(productionToken), 'Production team receives valid JWT access token');

    // 1.5 Verify /auth/me for all roles
    const meCreator = await apiRequest('/auth/me', { token: creatorToken });
    assert(meCreator.status === 200, 'GET /auth/me returns 200 for Creator');
    assert(meCreator.data?.data?.email === 'creator@demo.com', 'Creator email matches in /auth/me');

    const meBrand = await apiRequest('/auth/me', { token: brandToken });
    assert(meBrand.status === 200, 'GET /auth/me returns 200 for Brand');
    assert(meBrand.data?.data?.email === 'brand@demo.com', 'Brand email matches in /auth/me');

    const meAdmin = await apiRequest('/auth/me', { token: adminToken });
    assert(meAdmin.status === 200, 'GET /auth/me returns 200 for Admin');
    assert(meAdmin.data?.data?.email === 'admin@brandsandcreators.com', 'Admin email matches in /auth/me');

    // 1.6 Verify Role-Specific Profile Endpoints
    const cProfileRes = await apiRequest('/creators/me', { token: creatorToken });
    assert(cProfileRes.status === 200, 'GET /creators/me returns 200');
    creatorProfile = cProfileRes.data?.data || cProfileRes.data;
    assert(Boolean(creatorProfile), 'Creator profile returned with metadata');

    const bProfileRes = await apiRequest('/brands/me', { token: brandToken });
    assert(bProfileRes.status === 200, 'GET /brands/me returns 200');
    brandProfile = bProfileRes.data?.data || bProfileRes.data;
    assert(Boolean(brandProfile), 'Brand profile returned with metadata');

    const pProfileRes = await apiRequest('/production-teams/me', { token: productionToken });
    assert(pProfileRes.status === 200, 'GET /production-teams/me returns 200');
    productionProfile = pProfileRes.data?.data || pProfileRes.data;
    assert(Boolean(productionProfile), 'Production team profile returned with metadata');

    // -------------------------------------------------------------
    // MODULE 2: PROFILE UPDATE PERSISTENCE & FRESH DATABASE RELOAD
    // -------------------------------------------------------------
    console.log('\n💾 MODULE 2: Profile Update Persistence & Database Verification');

    const timestamp = Date.now();
    const newHeadline = `Commercial Filmmaker & Visionary DP ${timestamp}`;
    const newBio = `Cinematographer and creative director with over 8 years craft producing commercial campaigns. ${timestamp}`;
    const newStartingPrice = 45000;
    const newSkills = ['Cinema 8K', 'DaVinci Resolve', 'FPV Drones', 'Gimbal Rigging'];

    // 2.1 Update Creator Profile
    const updateCreatorRes = await apiRequest('/creators/me', {
      method: 'PATCH',
      token: creatorToken,
      body: {
        headline: newHeadline,
        bio: newBio,
        about: 'Detailed story of crafting visual spectacles for top automotive and luxury brands across Mumbai and global sets.',
        startingPrice: newStartingPrice,
        pricingModel: 'PER_PROJECT',
        skills: newSkills,
        languages: ['English', 'Hindi', 'Gujarati'],
        location: { city: 'Mumbai', country: 'India' },
        serviceAreas: ['Mumbai', 'Delhi NCR', 'Remote'],
      },
    });
    assert(updateCreatorRes.status === 200, 'PATCH /creators/me succeeds with 200');

    // 2.2 Verify Creator Profile via fresh API GET and direct MongoDB inspection
    const reloadedCreatorRes = await apiRequest('/creators/me', { token: creatorToken });
    const reloadedCreator = reloadedCreatorRes.data?.data || reloadedCreatorRes.data;
    assert(reloadedCreator.headline === newHeadline, 'Creator headline persisted in API');
    assert(reloadedCreator.bio === newBio, 'Creator bio persisted in API');
    assert(reloadedCreator.startingPrice === newStartingPrice, 'Creator startingPrice persisted in API');
    assert(reloadedCreator.skills?.includes('FPV Drones'), 'Creator skills array persisted in API');

    const dbCreator = await db.collection('creatorProfiles').findOne({
      userId: new mongoose.Types.ObjectId(creatorUser._id || creatorUser.id),
    });
    assert(Boolean(dbCreator), 'Creator profile found in MongoDB creatorProfiles');
    assert(dbCreator.headline === newHeadline, 'MongoDB creatorProfiles has exact matching headline');
    assert(dbCreator.startingPrice === newStartingPrice, 'MongoDB creatorProfiles has exact startingPrice');

    // 2.3 Update Brand Profile
    const newCompanyName = `Lumina Atelier ${timestamp}`;
    const newTagline = `Next-Gen Sustainable Apparel & Fashion Essentials ${timestamp}`;
    const newIndustry = 'Fashion & Luxury Apparel';

    const updateBrandRes = await apiRequest('/brands/me', {
      method: 'PATCH',
      token: brandToken,
      body: {
        companyName: newCompanyName,
        tagline: newTagline,
        description: 'Lumina Atelier is a premier direct-to-consumer apparel brand partnering with top creators worldwide.',
        industry: newIndustry,
        websiteUrl: 'https://lumina-atelier.example.com',
        companySize: '11-50 employees',
        foundedYear: 2022,
        location: { city: 'Bangalore', country: 'India' },
      },
    });
    assert(updateBrandRes.status === 200, 'PATCH /brands/me succeeds with 200');

    // 2.4 Verify Brand Profile via fresh API GET and direct MongoDB inspection
    const reloadedBrandRes = await apiRequest('/brands/me', { token: brandToken });
    const reloadedBrand = reloadedBrandRes.data?.data || reloadedBrandRes.data;
    assert(reloadedBrand.companyName === newCompanyName, 'Brand companyName persisted in API');
    assert(reloadedBrand.tagline === newTagline, 'Brand tagline persisted in API');
    assert(reloadedBrand.industry === newIndustry, 'Brand industry persisted in API');

    const dbBrand = await db.collection('brandProfiles').findOne({
      userId: new mongoose.Types.ObjectId(brandUser._id || brandUser.id),
    });
    assert(Boolean(dbBrand), 'Brand profile found in MongoDB brandProfiles');
    assert(dbBrand.companyName === newCompanyName, 'MongoDB brandProfiles has matching companyName');
    assert(dbBrand.tagline === newTagline, 'MongoDB brandProfiles has matching tagline');

    // 2.5 Update Production Team Profile
    const newStudioName = `Apex Horizon Studios ${timestamp}`;
    const newStudioTagline = `Turnkey Cinema & Commercial Ad Film Production ${timestamp}`;
    const updateProdRes = await apiRequest('/production-teams/me', {
      method: 'PATCH',
      token: productionToken,
      body: {
        studioName: newStudioName,
        tagline: newStudioTagline,
        description: 'Complete high-end cinema and commercial film production house with full ARRI and RED camera packages.',
        teamSize: 15,
        startingDayRate: 65000,
        specialties: ['Commercial TVC', 'Music Videos', 'Color Grading'],
        equipmentRoster: ['ARRI Alexa Mini LF', 'RED V-Raptor 8K', 'DJI Inspire 3'],
        location: { city: 'Mumbai', country: 'India' },
      },
    });
    assert(updateProdRes.status === 200, 'PATCH /production-teams/me succeeds with 200');

    const reloadedProd = (await apiRequest('/production-teams/me', { token: productionToken })).data?.data;
    assert(reloadedProd.studioName === newStudioName, 'Studio name persisted in API');
    assert(reloadedProd.startingDayRate === 65000, 'Studio starting day rate persisted in API');

    // 2.6 Update Core User Details
    const updateAccountRes = await apiRequest('/auth/me', {
      method: 'PATCH',
      token: creatorToken,
      body: {
        fullName: 'Rohan V. Kapoor (Verified)',
        phone: '+91 98765 43210',
      },
    });
    assert(updateAccountRes.status === 200, 'PATCH /auth/me succeeds with 200');
    const dbUser = await db.collection('users').findOne({
      _id: new mongoose.Types.ObjectId(creatorUser._id || creatorUser.id),
    });
    assert(dbUser.fullName === 'Rohan V. Kapoor (Verified)', 'User fullName persisted in MongoDB users');
    assert(dbUser.phone === '+91 98765 43210', 'User phone persisted in MongoDB users');

    // -------------------------------------------------------------
    // MODULE 3: PARTIAL UPDATES PRESERVING OMITTED FIELDS
    // -------------------------------------------------------------
    console.log('\n🧩 MODULE 3: Partial Updates & Field Preservation');

    const updatedPartialHeadline = `Master Colorist & Director ${timestamp}`;
    const partialRes = await apiRequest('/creators/me', {
      method: 'PATCH',
      token: creatorToken,
      body: {
        headline: updatedPartialHeadline,
      },
    });
    assert(partialRes.status === 200, 'Partial PATCH /creators/me succeeds with 200');

    const verifiedPartial = (await apiRequest('/creators/me', { token: creatorToken })).data?.data;
    assert(verifiedPartial.headline === updatedPartialHeadline, 'Updated headline took effect');
    assert(verifiedPartial.bio === newBio, 'Omitted bio was preserved and not wiped');
    assert(verifiedPartial.startingPrice === newStartingPrice, 'Omitted startingPrice was preserved');
    assert(verifiedPartial.skills?.length === newSkills.length, 'Omitted skills array was preserved');
    assert(verifiedPartial.location?.city === 'Mumbai', 'Omitted location object was preserved');

    // -------------------------------------------------------------
    // MODULE 4: DYNAMIC PROFILE COMPLETION SCORING
    // -------------------------------------------------------------
    console.log('\n📊 MODULE 4: Profile Completion Calculation & Score Verification');

    const completion = verifiedPartial.completion;
    assert(Boolean(completion), 'Profile completion object returned');
    assert(typeof completion.score === 'number', 'Profile completion score is a valid number');
    assert(completion.score >= 0 && completion.score <= 100, 'Completion score is within 0-100 range');
    assert(Array.isArray(completion.items), 'Completion items is an array of criteria');
    assert(completion.items.length >= 8, 'Completion tracks at least 8 profile quality criteria');

    const headlineBioItem = completion.items.find((i) => i.key === 'headline_bio');
    assert(headlineBioItem?.completed === true, 'Headline & Bio criteria marked completed');

    const skillsItem = completion.items.find((i) => i.key === 'category_skills');
    assert(Boolean(skillsItem), 'Category & Skills criteria tracked');

    // -------------------------------------------------------------
    // MODULE 5: PROFILE PHOTO LIFECYCLE & AVATAR MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n📸 MODULE 5: Profile Photo Lifecycle (Upload, Serve, Replace, Remove)');

    // 5.1 Upload valid PNG Avatar
    const pngUpload = buildMultipart('test-avatar.png', 'image/png', PNG_1X1);
    const uploadRes1 = await apiRequest('/media/avatar', {
      method: 'POST',
      token: creatorToken,
      headers: { 'Content-Type': pngUpload.contentType },
      body: pngUpload.body,
    });
    assert([200, 201].includes(uploadRes1.status), 'POST /media/avatar with PNG succeeds with 200/201');
    const avatarUrl1 = uploadRes1.data?.data?.avatarUrl || uploadRes1.data?.avatarUrl;
    assert(Boolean(avatarUrl1), 'Upload returns avatarUrl');
    assert(avatarUrl1.includes('/api/v1/media/avatars/avatar-'), 'avatarUrl matches standard pattern');

    // 5.2 Verify user document in DB updated with new avatarUrl
    const dbUserAfterUpload1 = await db.collection('users').findOne({
      _id: new mongoose.Types.ObjectId(creatorUser._id || creatorUser.id),
    });
    assert(dbUserAfterUpload1.avatarUrl === avatarUrl1, 'MongoDB user.avatarUrl updated with new path');

    // 5.3 Verify streaming via API directly
    const filename1 = path.basename(avatarUrl1);
    const streamRes = await apiRequest(`/media/avatars/${filename1}`);
    assert(streamRes.status === 200, 'GET /media/avatars/:filename returns 200');
    assert(streamRes.headers.get('content-type') === 'image/png', 'Returns correct image/png content-type');
    assert(
      streamRes.headers.get('x-content-type-options') === 'nosniff',
      'Returns X-Content-Type-Options: nosniff header',
    );

    // 5.4 Verify streaming via Next.js Web Proxy (Rewrites verification)
    const webProxyRes = await apiRequest(`/api/v1/media/avatars/${filename1}`, {
      baseUrl: WEB_BASE,
    });
    assert(webProxyRes.status === 200, 'Next.js Web proxy rewrite successfully streams avatar with 200');

    // 5.5 Verify streaming via Next.js Admin Proxy
    const adminProxyRes = await apiRequest(`/api/v1/media/avatars/${filename1}`, {
      baseUrl: ADMIN_BASE,
    });
    assert(adminProxyRes.status === 200, 'Next.js Admin proxy rewrite successfully streams avatar with 200');

    // 5.6 Upload replacement JPEG Avatar (Orphan cleanup verification)
    const uploadsDir = path.resolve(__dirname, '../uploads/avatars');
    const oldFilePath = path.join(uploadsDir, filename1);
    assert(fs.existsSync(oldFilePath), 'Original avatar file exists on disk before replacement');

    const jpegUpload = buildMultipart('new-avatar.jpg', 'image/jpeg', JPEG_1X1);
    const uploadRes2 = await apiRequest('/media/avatar', {
      method: 'POST',
      token: creatorToken,
      headers: { 'Content-Type': jpegUpload.contentType },
      body: jpegUpload.body,
    });
    assert([200, 201].includes(uploadRes2.status), 'POST /media/avatar with replacement JPEG succeeds with 200/201');
    const avatarUrl2 = uploadRes2.data?.data?.avatarUrl || uploadRes2.data?.avatarUrl;
    assert(avatarUrl2 !== avatarUrl1, 'New avatar URL has distinct filename');

    // Check old file was cleaned up (no orphan files left)
    const oldFileStillExists = fs.existsSync(oldFilePath);
    assert(!oldFileStillExists, 'Orphan avatar file cleanup confirmed: previous avatar unlinked from disk');

    const filename2 = path.basename(avatarUrl2);
    const newFilePath = path.join(uploadsDir, filename2);
    assert(fs.existsSync(newFilePath), 'New avatar file exists on disk');

    // 5.7 Remove Avatar via DELETE /media/avatar
    const deleteAvatarRes = await apiRequest('/media/avatar', {
      method: 'DELETE',
      token: creatorToken,
    });
    assert(deleteAvatarRes.status === 200, 'DELETE /media/avatar succeeds with 200');

    const dbUserAfterDelete = await db.collection('users').findOne({
      _id: new mongoose.Types.ObjectId(creatorUser._id || creatorUser.id),
    });
    assert(
      dbUserAfterDelete.avatarUrl === null || dbUserAfterDelete.avatarUrl === undefined,
      'MongoDB user.avatarUrl set to null/undefined after deletion',
    );
    assert(!fs.existsSync(newFilePath), 'Avatar file unlinked from disk upon DELETE /media/avatar');

    // -------------------------------------------------------------
    // MODULE 6: AVATAR SECURITY, MAGIC BYTES & SIZE LIMITS
    // -------------------------------------------------------------
    console.log('\n🛡️ MODULE 6: Magic Bytes Inspection & Security Controls');

    // 6.1 Reject text file renamed to .png (Magic bytes mismatch)
    const fakeTextPng = buildMultipart('spoof.png', 'image/png', Buffer.from('NOT A VALID PNG FILE CONTENTS'));
    const rejectFakeRes = await apiRequest('/media/avatar', {
      method: 'POST',
      token: creatorToken,
      headers: { 'Content-Type': fakeTextPng.contentType },
      body: fakeTextPng.body,
    });
    assert(
      rejectFakeRes.status === 400,
      'Rejects spoofed file with 400 Bad Request (Magic bytes validation failed)',
    );

    // 6.2 Reject executable / script disguised as image
    const phpPayload = Buffer.from('<?php echo "EXPLOIT"; ?>');
    const rejectPhpRes = await apiRequest('/media/avatar', {
      method: 'POST',
      token: creatorToken,
      headers: { 'Content-Type': buildMultipart('script.png', 'image/png', phpPayload).contentType },
      body: buildMultipart('script.png', 'image/png', phpPayload).body,
    });
    assert(rejectPhpRes.status === 400, 'Rejects PHP script disguised as PNG with 400');

    // 6.3 Reject file > 5MB
    const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0);
    // Write valid PNG header to big buffer so it passes mime check if size check fails
    PNG_1X1.copy(bigBuffer, 0, 0, PNG_1X1.length);
    const rejectBigRes = await apiRequest('/media/avatar', {
      method: 'POST',
      token: creatorToken,
      headers: { 'Content-Type': buildMultipart('huge.png', 'image/png', bigBuffer).contentType },
      body: buildMultipart('huge.png', 'image/png', bigBuffer).body,
    });
    assert(rejectBigRes.status === 400, 'Rejects file > 5MB with 400 Bad Request');

    // -------------------------------------------------------------
    // MODULE 7: PATH TRAVERSAL & INJECTION PREVENTION
    // -------------------------------------------------------------
    console.log('\n🔒 MODULE 7: Path Traversal & Injection Prevention');

    const traversalRes1 = await apiRequest('/media/avatars/..%2fpackage.json');
    assert([400, 404].includes(traversalRes1.status), 'Rejects ../ traversal attempt with 400 or 404');

    const traversalRes2 = await apiRequest('/media/avatars/%2e%2e%2f%2e%2e%2fpackage.json');
    assert([400, 404].includes(traversalRes2.status), 'Rejects encoded %2e%2e traversal with 400 or 404');

    const invalidCharRes = await apiRequest('/media/avatars/avatar-foo*bar.png');
    assert([400, 404].includes(invalidCharRes.status), 'Rejects filename with invalid characters (*)');

    const nonExistentRes = await apiRequest('/media/avatars/avatar-nonexistent-123456789.png');
    assert(nonExistentRes.status === 404, 'Returns 404 Not Found for non-existent avatar');

    // -------------------------------------------------------------
    // MODULE 8: CROSS-USER ISOLATION & AUTHORIZATION ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n🚪 MODULE 8: Cross-User Isolation & Authorization Enforcement');

    // 8.1 Creator attempts to update Brand profile
    const creatorTouchBrand = await apiRequest('/brands/me', {
      method: 'PATCH',
      token: creatorToken,
      body: { companyName: 'Hacked Brand' },
    });
    assert(
      [403, 404].includes(creatorTouchBrand.status),
      'Creator cannot PATCH /brands/me (rejection 403/404)',
    );

    // 8.2 Brand attempts to update Creator profile
    const brandTouchCreator = await apiRequest('/creators/me', {
      method: 'PATCH',
      token: brandToken,
      body: { headline: 'Hacked Creator' },
    });
    assert(
      [403, 404].includes(brandTouchCreator.status),
      'Brand cannot PATCH /creators/me (rejection 403/404)',
    );

    // 8.3 Unauthenticated avatar deletion
    const noAuthDelete = await apiRequest('/media/avatar', { method: 'DELETE' });
    assert(noAuthDelete.status === 401, 'Unauthenticated DELETE /media/avatar returns 401 Unauthorized');

    // 8.4 Unauthenticated profile update
    const noAuthPatch = await apiRequest('/creators/me', {
      method: 'PATCH',
      body: { headline: 'Unauthorized' },
    });
    assert(noAuthPatch.status === 401, 'Unauthenticated PATCH /creators/me returns 401 Unauthorized');

    // -------------------------------------------------------------
    // MODULE 9: LOGOUT & SESSION INVALIDATION VERIFICATION
    // -------------------------------------------------------------
    console.log('\n🔑 MODULE 9: Logout & Session Invalidation Mechanics');

    // Create a temporary user to test full logout and refresh token invalidation
    const testEmail = `logout-test-${Date.now()}@demo.com`;
    const testUsername = `logout${Date.now()}`;
    const tempReg = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        email: testEmail,
        username: testUsername,
        password: 'Password@123',
        fullName: 'Logout Test User',
        role: 'CREATOR',
      },
    });
    assert([200, 201].includes(tempReg.status), 'Temporary test user registered');

    const tempLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { login: testEmail, password: 'Password@123' },
    });
    assert(tempLogin.status === 200, 'Temporary user logged in');
    const tempAccess = tempLogin.data?.data?.accessToken || tempLogin.data?.accessToken;
    const tempRefresh = tempLogin.data?.data?.refreshToken || tempLogin.data?.refreshToken;
    const tempUserId = tempLogin.data?.data?.user?._id || tempLogin.data?.user?.id;

    // Verify refreshTokenHash is stored in MongoDB
    const userInDbBeforeLogout = await db.collection('users').findOne({
      _id: new mongoose.Types.ObjectId(tempUserId),
    });
    assert(
      Boolean(userInDbBeforeLogout.refreshTokenHash),
      'MongoDB stores refreshTokenHash for active session',
    );

    // Perform Logout via POST /auth/logout
    const logoutRes = await apiRequest('/auth/logout', {
      method: 'POST',
      token: tempAccess,
    });
    assert(logoutRes.status === 200, 'POST /auth/logout succeeds with 200');

    // Verify refreshTokenHash has been invalidated (set to null) in MongoDB
    const userInDbAfterLogout = await db.collection('users').findOne({
      _id: new mongoose.Types.ObjectId(tempUserId),
    });
    assert(
      userInDbAfterLogout.refreshTokenHash === null || userInDbAfterLogout.refreshTokenHash === undefined,
      'MongoDB refreshTokenHash is set to null upon logout',
    );

    // Attempting to use the invalidated refresh token must fail with 401
    const refreshAttempt = await apiRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: tempRefresh },
    });
    assert(
      refreshAttempt.status === 401,
      'POST /auth/refresh with invalidated refresh token is strictly rejected with 401',
    );

    // Clean up temporary user
    await db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(tempUserId) });
    await db.collection('creatorProfiles').deleteOne({ userId: new mongoose.Types.ObjectId(tempUserId) });

    // -------------------------------------------------------------
    // MODULE 10: PUBLIC MARKETPLACE PRIVACY & DATA LEAKAGE CHECKS
    // -------------------------------------------------------------
    console.log('\n🔍 MODULE 10: Public Marketplace Endpoint Privacy & Sanitization');

    // 10.1 Creator Public Profile Privacy
    const publicCreatorRes = await apiRequest(`/creators/${creatorProfile.slug || 'creator'}`);
    assert(publicCreatorRes.status === 200, 'GET /creators/:slug returns 200');
    const pubCreatorData = publicCreatorRes.data?.data || publicCreatorRes.data;

    assert(pubCreatorData.passwordHash === undefined, 'Public creator profile does NOT leak passwordHash');
    assert(pubCreatorData.refreshTokenHash === undefined, 'Public creator profile does NOT leak refreshTokenHash');
    assert(pubCreatorData.resetPasswordToken === undefined, 'Public creator profile does NOT leak resetPasswordToken');
    assert(
      pubCreatorData.emailVerificationToken === undefined,
      'Public creator profile does NOT leak emailVerificationToken',
    );

    if (pubCreatorData.userId && typeof pubCreatorData.userId === 'object') {
      assert(
        pubCreatorData.userId.passwordHash === undefined,
        'Populated userId in public creator profile does NOT leak passwordHash',
      );
      assert(
        pubCreatorData.userId.refreshTokenHash === undefined,
        'Populated userId does NOT leak refreshTokenHash',
      );
    }

    // 10.2 Brand Public Profile Privacy
    const publicBrandRes = await apiRequest(`/brands/${brandProfile.slug || 'brand'}`);
    assert(publicBrandRes.status === 200, 'GET /brands/:slug returns 200');
    const pubBrandData = publicBrandRes.data?.data || publicBrandRes.data;

    assert(pubBrandData.passwordHash === undefined, 'Public brand profile does NOT leak passwordHash');
    assert(pubBrandData.refreshTokenHash === undefined, 'Public brand profile does NOT leak refreshTokenHash');

    // -------------------------------------------------------------
    // MODULE 11: MARKETPLACE DATA CONSISTENCY & CARD INTEGRATION
    // -------------------------------------------------------------
    console.log('\n🌐 MODULE 11: Marketplace Data Consistency & Public Reflection');

    // Upload an avatar for Creator to verify it reflects across marketplace endpoints
    const avatarUploadForMarketplace = buildMultipart('mkt-avatar.png', 'image/png', PNG_1X1);
    const mktUploadRes = await apiRequest('/media/avatar', {
      method: 'POST',
      token: creatorToken,
      headers: { 'Content-Type': avatarUploadForMarketplace.contentType },
      body: avatarUploadForMarketplace.body,
    });
    assert([200, 201].includes(mktUploadRes.status), 'Uploaded fresh avatar for marketplace reflection check');
    const mktAvatarUrl = mktUploadRes.data?.data?.avatarUrl || mktUploadRes.data?.avatarUrl;

    // 11.1 Verify Creator Public Profile reflects latest updates
    const refreshedCreatorSlug = await apiRequest(`/creators/${creatorProfile.slug || 'creator'}`);
    const cSlugData = refreshedCreatorSlug.data?.data || refreshedCreatorSlug.data;
    assert(
      cSlugData.headline === updatedPartialHeadline,
      'Public creator profile reflects latest persisted headline',
    );
    assert(
      cSlugData.userId?.avatarUrl === mktAvatarUrl,
      'Public creator profile reflects newly uploaded avatar URL',
    );

    // 11.2 Verify Creators Explore Directory reflects latest updates
    const exploreRes = await apiRequest('/creators?limit=50');
    assert(exploreRes.status === 200, 'GET /creators returns 200');
    const exploreItems = exploreRes.data?.data?.items || exploreRes.data?.data || exploreRes.data || [];
    assert(Array.isArray(exploreItems) && exploreItems.length > 0, 'Creators explore directory has items');

    const matchedCreatorInList = exploreItems.find(
      (c) => c._id === creatorProfile._id || c.slug === creatorProfile.slug,
    );
    if (matchedCreatorInList) {
      assert(
        matchedCreatorInList.headline === updatedPartialHeadline,
        'Explore directory creator item reflects updated headline',
      );
      assert(
        matchedCreatorInList.userId?.avatarUrl === mktAvatarUrl,
        'Explore directory creator item reflects updated avatarUrl',
      );
    } else {
      console.log('  ℹ️ Creator published status check: verified via slug endpoint');
    }

    // 11.3 Verify Brand Public Profile reflects latest updates
    const refreshedBrandSlug = await apiRequest(`/brands/${brandProfile.slug || 'brand'}`);
    const bSlugData = refreshedBrandSlug.data?.data || refreshedBrandSlug.data;
    assert(
      bSlugData.companyName === newCompanyName,
      'Public brand profile reflects latest persisted companyName',
    );
    assert(
      bSlugData.tagline === newTagline,
      'Public brand profile reflects latest persisted tagline',
    );

    // Clean up created avatar file
    await apiRequest('/media/avatar', { method: 'DELETE', token: creatorToken });

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`🎉 PHASE 20 INTEGRATION TEST SUITE COMPLETED SUCCESSFULLY`);
    console.log(`   Passed: ${passCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ TEST RUN ABORTED WITH ERROR:\n', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
