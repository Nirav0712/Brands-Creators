/**
 * Phase 19: Complete User Profile Management & Authentication UX Suite
 * Brands & Creators Marketplace SaaS
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000/api/v1';
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
  const { method = 'GET', body, token, headers = {} } = options;
  const reqHeaders = { ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

  let reqBody = body;
  if (body && typeof body === 'object' && !(body instanceof Buffer)) {
    reqHeaders['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(body);
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
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

// 1x1 PNG buffer
const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex',
);

// 1x1 JPEG buffer
const JPEG_1X1 = Buffer.from(
  'ffd8ffe000104a46494600010101006000600000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda0008010100003f007f00ffd9',
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
  console.log('🚀 RUNNING PHASE 19 USER PROFILE & AUTHENTICATION UX SUITE');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const testRecords = {
    userIds: [],
  };

  try {
    // -------------------------------------------------------------
    // SECTION 1: Authentication, Token Lifecycles & Logout Invalidation
    // -------------------------------------------------------------
    console.log('▶ SECTION 1: Authentication, Token Lifecycles & Logout Invalidation');

    // Super Admin login
    const adminLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { login: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
    });
    assert(adminLogin.status === 200, 'Super Admin authenticated successfully');
    const adminToken = adminLogin.data?.data?.accessToken || adminLogin.data?.accessToken;
    assert(Boolean(adminToken), 'Admin received valid JWT access token');

    // Standard Demo Brand login
    const brandLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { login: 'brand@demo.com', password: 'Password@123' },
    });
    assert(brandLogin.status === 200, 'Standard demo brand logged in');
    const brandToken = brandLogin.data?.data?.accessToken || brandLogin.data?.accessToken;
    const brandRefreshToken = brandLogin.data?.data?.refreshToken || brandLogin.data?.refreshToken;
    assert(Boolean(brandToken), 'Brand received valid JWT access token');

    // Standard Demo Creator login
    const creatorLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { login: 'creator@demo.com', password: 'Password@123' },
    });
    assert(creatorLogin.status === 200, 'Standard demo creator logged in');
    const creatorToken = creatorLogin.data?.data?.accessToken || creatorLogin.data?.accessToken;
    const creatorRefreshToken = creatorLogin.data?.data?.refreshToken || creatorLogin.data?.refreshToken;
    assert(Boolean(creatorToken), 'Creator received valid JWT access token');

    // Create fresh disposable user for session invalidation test
    const randSuffix = Math.floor(100000 + Math.random() * 900000);
    const tempUserEmail = `profile_test_${randSuffix}@brandsandcreators.local`;
    const tempUsername = `user_${randSuffix}`;
    const registerRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        email: tempUserEmail,
        username: tempUsername,
        password: 'Password@123',
        fullName: 'Phase19 Test Persona',
        role: 'CREATOR',
      },
    });
    assert(registerRes.status === 201, 'Fresh test user registered');
    const tempAccessToken = registerRes.data?.data?.accessToken || registerRes.data?.accessToken;
    const tempRefreshToken = registerRes.data?.data?.refreshToken || registerRes.data?.refreshToken;
    assert(Boolean(tempAccessToken), 'Test user received access token');
    assert(Boolean(tempRefreshToken), 'Test user received refresh token');

    // Get user document in MongoDB
    const tempUserDoc = await db.collection('users').findOne({ email: tempUserEmail });
    assert(Boolean(tempUserDoc), 'Test user document confirmed in MongoDB');
    testRecords.userIds.push(tempUserDoc._id.toString());
    assert(Boolean(tempUserDoc.refreshTokenHash), 'User has hashed refresh token stored in MongoDB');

    // Perform explicit logout
    const logoutRes = await apiRequest('/auth/logout', {
      method: 'POST',
      token: tempAccessToken,
    });
    assert(logoutRes.status === 200, 'POST /auth/logout invalidates session');

    // Verify refresh token invalidated in MongoDB
    const postLogoutDoc = await db.collection('users').findOne({ _id: tempUserDoc._id });
    assert(
      postLogoutDoc.refreshTokenHash === null || postLogoutDoc.refreshTokenHash === undefined,
      'Refresh token hash strictly set to null in MongoDB upon logout',
    );

    // Attempt to use invalidated refresh token
    const refreshAttempt = await apiRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: tempRefreshToken },
    });
    assert(refreshAttempt.status === 401, 'Refresh attempt with invalidated token rejected with 401 Unauthorized');

    // Session isolation: Verify Brand session is still fully valid after another user logged out
    const brandMeRes = await apiRequest('/auth/me', { token: brandToken });
    assert(brandMeRes.status === 200, 'Brand session completely preserved (cross-user session isolation)');

    // -------------------------------------------------------------
    // SECTION 2: Role Profile Retrieval & Persistence
    // -------------------------------------------------------------
    console.log('\n▶ SECTION 2: Role Profile Retrieval & Persistence');

    // GET /auth/me for Creator
    const creatorMe = await apiRequest('/auth/me', { token: creatorToken });
    assert(creatorMe.status === 200, 'GET /auth/me returns 200 for Creator');
    assert(creatorMe.data?.data?.email === 'creator@demo.com', 'Creator email matches authenticated user');
    assert(creatorMe.data?.data?.roles?.includes('CREATOR'), 'Creator carries CREATOR role');

    // GET /creators/me
    const creatorProfileRes = await apiRequest('/creators/me', { token: creatorToken });
    assert(creatorProfileRes.status === 200, 'GET /creators/me returns 200');
    const creatorProfile = creatorProfileRes.data?.data || creatorProfileRes.data;
    assert(Boolean(creatorProfile?.userId), 'Creator profile linked to user ObjectId');
    assert(typeof creatorProfile?.completion?.score === 'number', 'Creator profile carries dynamic completion score');
    assert(Array.isArray(creatorProfile?.completion?.items), 'Creator profile carries completion checklist');

    // GET /auth/me for Brand
    const brandMe = await apiRequest('/auth/me', { token: brandToken });
    assert(brandMe.status === 200, 'GET /auth/me returns 200 for Brand');
    assert(brandMe.data?.data?.email === 'brand@demo.com', 'Brand email matches authenticated user');
    assert(brandMe.data?.data?.roles?.includes('BRAND'), 'Brand carries BRAND role');

    // GET /brands/me
    const brandProfileRes = await apiRequest('/brands/me', { token: brandToken });
    assert(brandProfileRes.status === 200, 'GET /brands/me returns 200');
    const brandProfile = brandProfileRes.data?.data || brandProfileRes.data;
    assert(Boolean(brandProfile?.companyName), 'Brand profile returns companyName');
    assert(Boolean(brandProfile?.industry), 'Brand profile returns industry');

    // GET /auth/me for Super Admin
    const adminMe = await apiRequest('/auth/me', { token: adminToken });
    assert(adminMe.status === 200, 'GET /auth/me returns 200 for Admin');
    assert(adminMe.data?.data?.roles?.includes('SUPER_ADMIN'), 'Admin carries SUPER_ADMIN role');

    // -------------------------------------------------------------
    // SECTION 3: Profile Updates & Boundary Checks
    // -------------------------------------------------------------
    console.log('\n▶ SECTION 3: Profile Updates & Boundary Checks');

    // Update basic user profile via PATCH /auth/me
    const updatedFullName = `Ananya Verma Updated ${randSuffix}`;
    const updateMeRes = await apiRequest('/auth/me', {
      method: 'PATCH',
      token: creatorToken,
      body: {
        fullName: updatedFullName,
        phone: '+91 99887 76655',
      },
    });
    assert(updateMeRes.status === 200, 'PATCH /auth/me updates basic profile details');
    assert(
      updateMeRes.data?.data?.fullName === updatedFullName,
      'Updated fullName returned in response',
    );

    // Verify persistence in MongoDB
    const verifiedUserDoc = await db.collection('users').findOne({ email: 'creator@demo.com' });
    assert(verifiedUserDoc.fullName === updatedFullName, 'Updated fullName persisted in MongoDB users collection');
    assert(verifiedUserDoc.phone === '+91 99887 76655', 'Updated phone persisted in MongoDB users collection');

    // Creator updates role-specific fields via PATCH /creators/me
    const updateCreatorRes = await apiRequest('/creators/me', {
      method: 'PATCH',
      token: creatorToken,
      body: {
        headline: 'Lead Commercial Cinematographer & Drone Pilot',
        bio: 'Award-winning visual storyteller with 7+ years of experience.',
        skills: ['Cinematography', 'Drone Piloting', 'Color Grading', 'DaVinci Resolve'],
        startingPrice: 15000,
        experienceYears: 7,
        experienceLevel: 'SENIOR',
        serviceMode: 'HYBRID',
        availability: 'AVAILABLE_NOW',
        location: {
          city: 'Bengaluru',
          country: 'India',
        },
      },
    });
    assert(updateCreatorRes.status === 200, 'PATCH /creators/me updates role-specific fields');

    // Verify creator persistence in MongoDB
    const verifiedCreatorDoc = await db.collection('creatorProfiles').findOne({ userId: verifiedUserDoc._id });
    assert(
      verifiedCreatorDoc.headline === 'Lead Commercial Cinematographer & Drone Pilot',
      'Creator headline persisted in MongoDB',
    );
    assert(verifiedCreatorDoc.startingPrice === 15000, 'Creator starting rate persisted in MongoDB');
    assert(verifiedCreatorDoc.skills.includes('Drone Piloting'), 'Creator skills list persisted in MongoDB');
    assert(verifiedCreatorDoc.location.city === 'Bengaluru', 'Creator location persisted in MongoDB');

    // Brand updates role-specific fields via PATCH /brands/me
    const updateBrandRes = await apiRequest('/brands/me', {
      method: 'PATCH',
      token: brandToken,
      body: {
        companyName: 'Acme Premium Consumer Brands Ltd',
        tagline: 'Leading Sustainable D2C Lifestyle & Wellness',
        description: 'Global brand producing ethically sourced lifestyle products.',
        industry: 'D2C Consumer Goods',
        companySize: '51-200',
        foundedYear: 2020,
        websiteUrl: 'https://acmebrands.example.com',
      },
    });
    assert(updateBrandRes.status === 200, 'PATCH /brands/me updates brand fields');

    // Verify brand persistence in MongoDB
    const verifiedBrandUser = await db.collection('users').findOne({ email: 'brand@demo.com' });
    const verifiedBrandDoc = await db.collection('brandProfiles').findOne({ userId: verifiedBrandUser._id });
    assert(
      verifiedBrandDoc.companyName === 'Acme Premium Consumer Brands Ltd',
      'Brand companyName persisted in MongoDB',
    );
    assert(verifiedBrandDoc.foundedYear === 2020, 'Brand foundedYear persisted in MongoDB');

    // TAMPER PROTECTION & PRIVILEGE ESCALATION REJECTION:
    // Attempt to modify protected role or verification status via PATCH /auth/me
    const tamperAuthRes = await apiRequest('/auth/me', {
      method: 'PATCH',
      token: creatorToken,
      body: {
        roles: ['SUPER_ADMIN'],
        status: 'SUSPENDED',
      },
    });
    // ValidationPipe with forbidNonWhitelisted: true rejects or strips extra properties
    assert(
      tamperAuthRes.status === 400 || (tamperAuthRes.status === 200 && !tamperAuthRes.data?.data?.roles?.includes('SUPER_ADMIN')),
      'Attempt to escalate role or status via PATCH /auth/me strictly prevented',
    );

    // Verify role in MongoDB is still CREATOR
    const postTamperDoc = await db.collection('users').findOne({ email: 'creator@demo.com' });
    assert(postTamperDoc.roles.includes('CREATOR') && !postTamperDoc.roles.includes('SUPER_ADMIN'), 'User role remains CREATOR in MongoDB');

    // Attempt to modify verificationStatus via PATCH /creators/me
    const tamperCreatorRes = await apiRequest('/creators/me', {
      method: 'PATCH',
      token: creatorToken,
      body: {
        verificationStatus: 'VERIFIED',
      },
    });
    assert(
      tamperCreatorRes.status === 400 || tamperCreatorRes.status === 200,
      'Attempt to self-verify handled safely',
    );
    const postTamperCreator = await db.collection('creatorProfiles').findOne({ userId: verifiedUserDoc._id });
    assert(
      postTamperCreator.verificationStatus !== 'VERIFIED' || verifiedCreatorDoc.verificationStatus === 'VERIFIED',
      'Creator verification status cannot be manipulated through profile editing',
    );

    // -------------------------------------------------------------
    // SECTION 4: Profile Image Upload & Media Validation
    // -------------------------------------------------------------
    console.log('\n▶ SECTION 4: Profile Image Upload & Media Validation');

    // 1. Upload valid 1x1 PNG image
    const validPngMultipart = buildMultipart('avatar_test.png', 'image/png', PNG_1X1);
    const uploadPngRes = await apiRequest('/media/avatar', {
      method: 'POST',
      token: creatorToken,
      headers: { 'Content-Type': validPngMultipart.contentType },
      body: validPngMultipart.body,
    });
    assert(uploadPngRes.status === 201, 'POST /media/avatar accepts valid PNG image (HTTP 201)');
    const savedAvatarUrl = uploadPngRes.data?.data?.avatarUrl || uploadPngRes.data?.avatarUrl;
    assert(Boolean(savedAvatarUrl), 'Response returns avatarUrl');
    assert(savedAvatarUrl.startsWith('/api/v1/media/avatars/'), 'Avatar URL points to /api/v1/media/avatars/');

    // Verify file exists on local disk
    const filename = path.basename(savedAvatarUrl);
    const diskPath = path.join(process.cwd(), 'uploads', 'avatars', filename);
    assert(fs.existsSync(diskPath), 'Avatar image file exists on local storage disk');

    // Verify avatar persisted in MongoDB
    const userWithAvatar = await db.collection('users').findOne({ email: 'creator@demo.com' });
    assert(userWithAvatar.avatarUrl === savedAvatarUrl, 'Avatar URL persisted in MongoDB user document');

    // 2. Stream avatar via GET /media/avatars/:filename
    const avatarRelativePath = savedAvatarUrl.replace('/api/v1', '');
    const streamAvatar = await apiRequest(avatarRelativePath);
    assert(streamAvatar.status === 200, 'GET /media/avatars/:filename returns HTTP 200');
    assert(
      streamAvatar.headers.get('content-type')?.includes('image/png'),
      'Avatar response Content-Type is image/png',
    );
    assert(
      streamAvatar.headers.get('x-content-type-options') === 'nosniff',
      'Avatar response includes X-Content-Type-Options: nosniff header',
    );

    // 3. Upload valid 1x1 JPEG image
    const validJpgMultipart = buildMultipart('avatar_test.jpg', 'image/jpeg', JPEG_1X1);
    const uploadJpgRes = await apiRequest('/media/avatar', {
      method: 'POST',
      token: creatorToken,
      headers: { 'Content-Type': validJpgMultipart.contentType },
      body: validJpgMultipart.body,
    });
    assert(uploadJpgRes.status === 201, 'POST /media/avatar accepts valid JPEG image (HTTP 201)');
    const newAvatarUrl = uploadJpgRes.data?.data?.avatarUrl || uploadJpgRes.data?.avatarUrl;
    assert(Boolean(newAvatarUrl), 'Updated avatar URL received');

    // Verify orphaned previous file was cleaned up from disk
    assert(!fs.existsSync(diskPath), 'Orphaned previous avatar file safely unlinked from disk');

    // 4. Reject invalid file format (magic bytes mismatch)
    const fakeImageBuffer = Buffer.from('NOT_AN_IMAGE_PAYLOAD_PLAIN_TEXT');
    const fakeMultipart = buildMultipart('fake.png', 'image/png', fakeImageBuffer);
    const badUploadRes = await apiRequest('/media/avatar', {
      method: 'POST',
      token: creatorToken,
      headers: { 'Content-Type': fakeMultipart.contentType },
      body: fakeMultipart.body,
    });
    assert(
      badUploadRes.status === 400,
      'Invalid file format with counterfeit header strictly rejected with 400 Bad Request',
    );

    // 5. Reject oversized file (> 5 MB)
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 0xff); // 6MB
    const largeMultipart = buildMultipart('oversized.jpg', 'image/jpeg', largeBuffer);
    const largeUploadRes = await apiRequest('/media/avatar', {
      method: 'POST',
      token: creatorToken,
      headers: { 'Content-Type': largeMultipart.contentType },
      body: largeMultipart.body,
    });
    assert(
      largeUploadRes.status === 400 || largeUploadRes.status === 413,
      'Oversized file (>5MB) strictly rejected with 400/413',
    );

    // 6. Directory traversal attempt on /media/avatars/:filename
    const traversalAttempt = await apiRequest('/media/avatars/..%2F..%2Fpackage.json');
    assert(
      traversalAttempt.status === 400 || traversalAttempt.status === 404,
      'Directory traversal path strictly rejected',
    );

    // 7. Remove avatar via DELETE /media/avatar
    const deleteAvatarRes = await apiRequest('/media/avatar', {
      method: 'DELETE',
      token: creatorToken,
    });
    assert(deleteAvatarRes.status === 200, 'DELETE /media/avatar returns HTTP 200');

    // Verify avatar is null in MongoDB
    const userAfterDelete = await db.collection('users').findOne({ email: 'creator@demo.com' });
    assert(
      userAfterDelete.avatarUrl === null || userAfterDelete.avatarUrl === undefined,
      'User avatarUrl reset in MongoDB upon removal',
    );

    // -------------------------------------------------------------
    // SECTION 5: Frontend Route Reachability
    // -------------------------------------------------------------
    console.log('\n▶ SECTION 5: Frontend Route Reachability');

    const webRoutes = [
      'http://localhost:3000/profile',
      'http://localhost:3000/profile?edit=1',
      'http://localhost:3000/dashboard/creator',
      'http://localhost:3000/dashboard/brand',
      'http://localhost:3000/login',
    ];

    for (const route of webRoutes) {
      const res = await fetch(route);
      assert(res.status === 200, `Web route ${new URL(route).pathname} reachable (HTTP 200)`);
    }

    const adminRes = await fetch('http://localhost:3001');
    assert(adminRes.status === 200, 'Admin backoffice dashboard reachable (HTTP 200)');

    // -------------------------------------------------------------
    // SECTION 6: Cleanup Disposable Test Entities
    // -------------------------------------------------------------
    console.log('\n▶ CLEANUP: Purging Disposable Test Entities');
    for (const uId of testRecords.userIds) {
      await db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(uId) });
      await db.collection('creatorProfiles').deleteOne({ userId: new mongoose.Types.ObjectId(uId) });
      await db.collection('brandProfiles').deleteOne({ userId: new mongoose.Types.ObjectId(uId) });
    }
    console.log('  ✅ Disposable test accounts cleanly purged from MongoDB.');

    console.log('\n================================================================');
    console.log(`🎉 ALL PHASE 19 TESTS PASSED: ${passCount}/${passCount} assertions`);
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
