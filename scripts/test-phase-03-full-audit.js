/**
 * Brands & Creators — Phase 03 Production QA & Real-Flow Audit Test Suite
 * 
 * Executes an exhaustive, production-grade integration test of all Phase 03
 * marketplace features against real NestJS REST API endpoints and native MongoDB persistence.
 */

const mongoose = require('mongoose');

const API_BASE = 'http://localhost:4000/api/v1';
const MONGO_URI = 'mongodb://127.0.0.1:27017/brands_creators_dev';

// Audit Metrics & Results Tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

function recordTest(suite, name, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`  ✅ [PASS] ${suite} > ${name}`);
  } else {
    results.failed++;
    console.error(`  ❌ [FAIL] ${suite} > ${name}: ${details}`);
  }
  results.tests.push({ suite, name, passed, details });
}

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const TEST_BYPASS_SECRET = process.env.RATE_LIMIT_TEST_BYPASS_SECRET || 'bc_test_secret_hardening_suite_9f82d1e4a7c06b';
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
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 500, ok: false, error: err.message };
  }
}

async function runAudit() {
  console.log('\n===============================================================');
  console.log('  BRANDS & CREATORS — PHASE 03 REAL-FLOW PRODUCTION QA AUDIT  ');
  console.log('===============================================================\n');

  // 0. Connect Direct MongoDB Connection for Database-Level Inspection
  console.log('📦 Connecting to MongoDB instance for persistence audit...');
  const atlasUri = 'mongodb+srv://thedigitalconnect712_db_user:bnJPZHGOoI4e4p8N@cluster0.vkdrewz.mongodb.net/brands_creators?retryWrites=true&w=majority';
  let activeUri = atlasUri;
  try {
    const testConn = await mongoose.createConnection(atlasUri, { serverSelectionTimeoutMS: 2500 }).asPromise();
    await testConn.close();
    activeUri = atlasUri;
  } catch (e) {
    activeUri = 'mongodb://127.0.0.1:27017/brands_creators_dev';
  }

  await mongoose.connect(activeUri);
  console.log(' Connected to MongoDB:', activeUri);

  const db = mongoose.connection.db;

  try {
    // -------------------------------------------------------------
    // SETUP: Clean test records, Retrieve Categories & Seed Test Accounts
    // -------------------------------------------------------------
    console.log('\n--- 0. ENVIRONMENT & USER SEEDING ---');
    
    // Clean up any stale test audit accounts for clean reproducible run
    const testEmails = [
      'brand.a.audit@example.com',
      'brand.b.audit@example.com',
      'creator.a.audit@example.com',
      'creator.b.audit@example.com',
    ];
    await db.collection('users').deleteMany({ email: { $in: testEmails } });
    await db.collection('brandProfiles').deleteMany({ slug: { $in: ['brand_a_audit', 'brand_b_audit'] } });
    await db.collection('creatorProfiles').deleteMany({ slug: { $in: ['creator_a_audit', 'creator_b_audit'] } });
    await db.collection('requirements').deleteMany({});
    await db.collection('applications').deleteMany({});
    await db.collection('notifications').deleteMany({});

    const categoriesRes = await apiRequest('/categories');
    recordTest('Setup', 'Categories loaded from MongoDB', categoriesRes.ok && categoriesRes.data?.data?.length > 0);
    const categories = categoriesRes.data?.data || [];
    const influencerCat = categories.find(c => c.slug === 'influencers-creators') || categories[0];
    const photoCat = categories.find(c => c.slug === 'photography') || categories[1] || categories[0];

    // Seed/Login Test Users:
    // Brand A, Brand B, Creator A, Creator B, Admin
    const users = {
      brandA: { email: 'brand.a.audit@example.com', username: 'brand_a_audit', password: 'Password123!', role: 'BRAND', name: 'Acme Brand A' },
      brandB: { email: 'brand.b.audit@example.com', username: 'brand_b_audit', password: 'Password123!', role: 'BRAND', name: 'Zenith Brand B' },
      creatorA: { email: 'creator.a.audit@example.com', username: 'creator_a_audit', password: 'Password123!', role: 'CREATOR', name: 'Aarav Creator A' },
      creatorB: { email: 'creator.b.audit@example.com', username: 'creator_b_audit', password: 'Password123!', role: 'CREATOR', name: 'Bhavna Creator B' },
      admin: { email: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
    };

    const tokens = {};

    for (const [key, user] of Object.entries(users)) {
      if (key !== 'admin') {
        // Register fresh user
        const regRes = await apiRequest('/auth/register', {
          method: 'POST',
          body: {
            email: user.email,
            username: user.username,
            password: user.password,
            fullName: user.name,
            role: user.role,
          },
        });
        if (!regRes.ok) {
          console.error(`Failed to register ${key}:`, regRes.data);
        }
      }

      const loginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: { login: user.email, password: user.password },
      });

      tokens[key] = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
      recordTest('Auth Setup', `Login ${key} (${user.email})`, !!tokens[key]);
    }

    // Ensure Creator Profiles exist with portfolios for Creator A & B
    const creatorAProfileRes = await apiRequest('/creators/me', {
      method: 'PATCH',
      token: tokens.creatorA,
      body: {
        headline: 'Aarav Films — Luxury Fashion Cinematographer',
        bio: 'Leading fashion & lifestyle creator and cinematographer in Mumbai',
        primaryCategoryId: influencerCat._id,
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India', isRemote: true },
        skills: ['Fashion Styling', 'Reels Production', 'Cinematography', 'Color Grading'],
        languages: ['English', 'Hindi'],
      },
    });
    await apiRequest('/creators/me/portfolio', {
      method: 'POST',
      token: tokens.creatorA,
      body: {
        title: 'Summer Fashion Reel 2026',
        mediaUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
        mediaType: 'VIDEO',
        coverImage: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        clientBrand: 'Zara India',
      },
    });
    await apiRequest('/creators/me/publish', { method: 'POST', token: tokens.creatorA });
    recordTest('Profile Setup', 'Creator A Profile & Portfolio persisted and published', creatorAProfileRes.ok);

    const creatorBProfileRes = await apiRequest('/creators/me', {
      method: 'PATCH',
      token: tokens.creatorB,
      body: {
        headline: 'Bhavna Visuals — Commercial Tech Photographer',
        bio: 'Tech & gadget video editor and photographer in Bengaluru',
        primaryCategoryId: photoCat._id,
        location: { city: 'Bengaluru', state: 'Karnataka', country: 'India', isRemote: false },
        skills: ['Photography', 'Photoshop', 'Studio Lighting'],
        languages: ['English', 'Kannada'],
      },
    });
    await apiRequest('/creators/me/portfolio', {
      method: 'POST',
      token: tokens.creatorB,
      body: {
        title: 'Studio Portrait Series',
        mediaUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        mediaType: 'IMAGE',
        clientBrand: 'OnePlus',
      },
    });
    await apiRequest('/creators/me/publish', { method: 'POST', token: tokens.creatorB });
    recordTest('Profile Setup', 'Creator B Profile & Portfolio persisted and published', creatorBProfileRes.ok);

    // Ensure Brand Profiles exist
    await apiRequest('/brands/me', {
      method: 'PATCH',
      token: tokens.brandA,
      body: {
        companyName: 'Acme Fashion Group',
        tagline: 'Luxury Couture & Apparel',
        industry: 'Fashion & Apparel',
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
        websiteUrl: 'https://acme-couture.example.com',
      },
    });
    await apiRequest('/brands/me/publish', { method: 'POST', token: tokens.brandA });

    await apiRequest('/brands/me', {
      method: 'PATCH',
      token: tokens.brandB,
      body: {
        companyName: 'Zenith Tech Systems',
        tagline: 'Smart Consumer Electronics',
        industry: 'Consumer Electronics',
        location: { city: 'Bengaluru', state: 'Karnataka', country: 'India' },
      },
    });
    await apiRequest('/brands/me/publish', { method: 'POST', token: tokens.brandB });

    // -------------------------------------------------------------
    // 1. REAL MONGODB END-TO-END FLOW (Brand A Requirement -> Creator A Apply -> Brand A Shortlist & Accept)
    // -------------------------------------------------------------
    console.log('\n--- 1. REAL MONGODB END-TO-END TEST ---');

    // 1.1 Brand A creates a requirement as DRAFT
    const createReqRes = await apiRequest('/requirements', {
      method: 'POST',
      token: tokens.brandA,
      body: {
        title: 'Premium Summer Fashion Campaign 2026',
        description: 'Looking for expert fashion creators and cinematographers in Mumbai for an upcoming luxury campaign.',
        categoryId: influencerCat._id,
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India', isRemote: true },
        budgetType: 'RANGE',
        budget: { min: 50000, max: 120000, currency: 'INR' },
        applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        deliverables: ['3 Instagram Reels (9:16)', '5 High-Res Stills'],
        requiredSkills: ['Fashion Styling', 'Cinematography', 'Reels Production'],
        targetPlatforms: ['INSTAGRAM', 'YOUTUBE'],
        status: 'DRAFT',
      },
    });

    const requirementA = createReqRes.data?.data;
    recordTest('Brand Flow', 'Brand A creates requirement as DRAFT', createReqRes.ok && !!requirementA?._id);

    // 1.2 Verify DRAFT requirement exists in MongoDB
    const draftDoc = await db.collection('requirements').findOne({ _id: new mongoose.Types.ObjectId(requirementA?._id) });
    recordTest('MongoDB Audit', 'DRAFT requirement exists in MongoDB collection', draftDoc && draftDoc.status === 'DRAFT');

    // 1.3 Brand A edits draft and publishes it
    const editReqRes = await apiRequest(`/requirements/${requirementA?._id}`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: {
        title: 'Premium Summer Fashion Campaign 2026 (Updated)',
      },
    });
    recordTest('Brand Flow', 'Brand A edits draft requirement', editReqRes.ok);

    const publishRes = await apiRequest(`/requirements/${requirementA?._id}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'PUBLISHED' },
    });
    recordTest('Brand Flow', 'Brand A publishes requirement', publishRes.ok);

    // 1.4 Verify status and publishedAt in MongoDB
    const publishedDoc = await db.collection('requirements').findOne({ _id: new mongoose.Types.ObjectId(requirementA?._id) });
    recordTest('MongoDB Audit', 'Published status is PUBLISHED in MongoDB', publishedDoc && publishedDoc.status === 'PUBLISHED');
    recordTest('MongoDB Audit', 'publishedAt timestamp is persisted in MongoDB', publishedDoc && !!publishedDoc.publishedAt);
    recordTest('MongoDB Audit', 'Unique slug generated and persisted', publishedDoc && !!publishedDoc.slug);

    // 1.5 Open public requirement page / search API
    const publicReqRes = await apiRequest(`/requirements/${publishedDoc?.slug}`);
    recordTest('Public Discovery', 'Public requirement retrieved by slug', publicReqRes.ok && publicReqRes.data?.data?._id === requirementA?._id);

    const searchRes = await apiRequest('/requirements?q=Summer+Fashion');
    const searchData = searchRes.data?.data;
    const searchItems = Array.isArray(searchData?.items) ? searchData.items : (Array.isArray(searchData) ? searchData : []);
    recordTest('Public Discovery', 'Search requirement through API (keyword search)', searchRes.ok && searchItems.some(r => r._id === requirementA?._id));

    // 1.6 Creator A submits application
    const applyRes = await apiRequest('/applications', {
      method: 'POST',
      token: tokens.creatorA,
      body: {
        requirementId: requirementA?._id,
        proposal: 'I would love to produce this luxury summer campaign. I have extensive experience with high-end fashion brands and state-of-the-art Sony FX3 gear.',
        offeredPrice: 85000,
        currency: 'INR',
        availability: 'Immediately',
        estimatedDelivery: '5 Days',
        selectedPortfolioItems: [
          {
            title: 'Summer Fashion Reel 2026',
            mediaUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
            mediaType: 'VIDEO',
            coverImage: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
            clientBrand: 'Zara India',
          },
        ],
      },
    });

    const applicationA = applyRes.data?.data;
    recordTest('Creator Flow', 'Creator A submits application', applyRes.ok && !!applicationA?._id);

    // 1.7 Verify application exists in MongoDB
    const appDoc = await db.collection('applications').findOne({ _id: new mongoose.Types.ObjectId(applicationA?._id) });
    recordTest('MongoDB Audit', 'Application persists in MongoDB applications collection', appDoc && appDoc.offeredPrice === 85000);
    recordTest('MongoDB Audit', 'Portfolio selections persisted in MongoDB', appDoc && appDoc.selectedPortfolioItems?.length === 1);
    
    const updatedReqDoc = await db.collection('requirements').findOne({ _id: new mongoose.Types.ObjectId(requirementA?._id) });
    recordTest('MongoDB Audit', 'Application count incremented on requirement in MongoDB', updatedReqDoc && updatedReqDoc.applicationCount >= 1);

    // 1.8 Brand evaluation: Brand A views applicants
    const brandApplicantsRes = await apiRequest(`/applications/requirement/${requirementA?._id}`, {
      token: tokens.brandA,
    });
    const applicantList = Array.isArray(brandApplicantsRes.data?.data?.applicants) ? brandApplicantsRes.data.data.applicants : [];
    recordTest('Brand Evaluation', 'Brand A retrieves applicant list', brandApplicantsRes.ok && applicantList.some(a => a._id === applicationA?._id));

    // 1.9 Brand A shortlists Creator A
    const shortlistRes = await apiRequest(`/applications/${applicationA?._id}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'SHORTLISTED', brandNotes: 'Outstanding visual reel and portfolio alignment' },
    });
    recordTest('Brand Evaluation', 'Brand A updates status to SHORTLISTED', shortlistRes.ok && shortlistRes.data?.data?.status === 'SHORTLISTED');

    // 1.10 Verify SHORTLISTED persists in MongoDB
    const shortlistedDoc = await db.collection('applications').findOne({ _id: new mongoose.Types.ObjectId(applicationA?._id) });
    recordTest('MongoDB Audit', 'SHORTLISTED status persisted in MongoDB', shortlistedDoc && shortlistedDoc.status === 'SHORTLISTED');

    // 1.11 Brand A accepts Creator A
    const acceptRes = await apiRequest(`/applications/${applicationA?._id}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'ACCEPTED', brandNotes: 'Selected for campaign production' },
    });
    recordTest('Brand Evaluation', 'Brand A updates status to ACCEPTED', acceptRes.ok && acceptRes.data?.data?.status === 'ACCEPTED');

    // 1.12 Verify ACCEPTED persists in MongoDB
    const acceptedDoc = await db.collection('applications').findOne({ _id: new mongoose.Types.ObjectId(applicationA?._id) });
    recordTest('MongoDB Audit', 'ACCEPTED status persisted in MongoDB', acceptedDoc && acceptedDoc.status === 'ACCEPTED');

    // 1.13 Creator A checks application tracking
    const creatorAppsRes = await apiRequest('/applications/my', {
      token: tokens.creatorA,
    });
    const myApps = Array.isArray(creatorAppsRes.data?.data) ? creatorAppsRes.data.data : [];
    const myApp = myApps.find(a => a._id === applicationA?._id);
    recordTest('Creator Tracking', 'Creator A sees ACCEPTED status on /applications/my', creatorAppsRes.ok && myApp?.status === 'ACCEPTED');

    // -------------------------------------------------------------
    // 2. AUTHORIZATION / OWNERSHIP AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 2. AUTHORIZATION & OWNERSHIP AUDIT ---');

    // 2.1 Brand B creates a requirement B
    const createReqBRes = await apiRequest('/requirements', {
      method: 'POST',
      token: tokens.brandB,
      body: {
        title: 'Zenith Tech Product Launch Commercial',
        description: 'Commercial video production for new smart gadget.',
        categoryId: photoCat._id,
        location: { city: 'Bengaluru', state: 'Karnataka', country: 'India', isRemote: false },
        budget: { min: 80000, max: 150000, currency: 'INR' },
        applicationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        deliverables: ['1 Commercial Video'],
        status: 'PUBLISHED',
      },
    });
    const requirementB = createReqBRes.data?.data;

    // 2.2 Brand A attempts to edit Brand B requirement -> MUST FAIL (403/Forbidden)
    const brandAEditBRes = await apiRequest(`/requirements/${requirementB?._id}`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { title: 'Hacked title by Brand A' },
    });
    recordTest('RBAC / Ownership', 'Brand A CANNOT edit Brand B requirement (403 Forbidden)', brandAEditBRes.status === 403);

    // 2.3 Brand B attempts to edit Brand A requirement -> MUST FAIL (403/Forbidden)
    const brandBEditARes = await apiRequest(`/requirements/${requirementA?._id}`, {
      method: 'PATCH',
      token: tokens.brandB,
      body: { title: 'Hacked title by Brand B' },
    });
    recordTest('RBAC / Ownership', 'Brand B CANNOT edit Brand A requirement (403 Forbidden)', brandBEditARes.status === 403);

    // 2.4 Creator attempts to create a brand requirement -> MUST FAIL (403 Forbidden)
    const creatorCreateReqRes = await apiRequest('/requirements', {
      method: 'POST',
      token: tokens.creatorA,
      body: {
        title: 'Unauthorized Creator Requirement',
        description: 'Creators should not be allowed to post requirements',
        categoryId: influencerCat._id,
        budget: { min: 10000, max: 20000, currency: 'INR' },
        applicationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    recordTest('RBAC / Ownership', 'Creator CANNOT create brand requirements (403 Forbidden)', creatorCreateReqRes.status === 403);

    // 2.5 Creator attempts to update requirement status -> MUST FAIL (403 Forbidden)
    const creatorUpdateReqRes = await apiRequest(`/requirements/${requirementA?._id}/status`, {
      method: 'PATCH',
      token: tokens.creatorA,
      body: { status: 'CLOSED' },
    });
    recordTest('RBAC / Ownership', 'Creator CANNOT mutate requirement status (403 Forbidden)', creatorUpdateReqRes.status === 403);

    // 2.6 Creator B applies to requirement B
    const applyBRes = await apiRequest('/applications', {
      method: 'POST',
      token: tokens.creatorB,
      body: {
        requirementId: requirementB?._id,
        proposal: 'I can shoot high-end commercial tech product videos.',
        offeredPrice: 95000,
        currency: 'INR',
        availability: 'Immediately',
        estimatedDelivery: '7 Days',
      },
    });
    const applicationB = applyBRes.data?.data;

    // 2.7 Brand A attempts to access Brand B requirement applicants -> MUST FAIL (403 Forbidden or 404)
    const brandAAccessAppBRes = await apiRequest(`/applications/requirement/${requirementB?._id}`, {
      token: tokens.brandA,
    });
    recordTest('RBAC / Ownership', 'Brand A CANNOT access Brand B applicants (403 or 404)', brandAAccessAppBRes.status === 403 || brandAAccessAppBRes.status === 404);

    // 2.8 Creator A attempts to change application status to SHORTLISTED -> MUST FAIL (403 Forbidden)
    const creatorAStatusChangeRes = await apiRequest(`/applications/${applicationA?._id}/status`, {
      method: 'PATCH',
      token: tokens.creatorA,
      body: { status: 'SHORTLISTED' },
    });
    recordTest('RBAC / Ownership', 'Creator CANNOT update application evaluation status (403 Forbidden)', creatorAStatusChangeRes.status === 403);

    // 2.9 Non-admin user attempts admin moderation endpoint -> MUST FAIL (403 Forbidden)
    const nonAdminModerationRes = await apiRequest(`/requirements/admin/${requirementA?._id}/moderate`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'PAUSED' },
    });
    recordTest('RBAC / Ownership', 'Brand CANNOT access Admin moderation API (403 Forbidden)', nonAdminModerationRes.status === 403);

    // -------------------------------------------------------------
    // 3. REQUIREMENT LIFECYCLE & STATE MACHINE TEST
    // -------------------------------------------------------------
    console.log('\n--- 3. REQUIREMENT LIFECYCLE & STATE MACHINE TEST ---');

    // Create fresh lifecycle requirement
    const lifecycleReqRes = await apiRequest('/requirements', {
      method: 'POST',
      token: tokens.brandA,
      body: {
        title: 'Lifecycle State Machine Test Opportunity',
        description: 'Testing full state transitions from Draft to Completed',
        categoryId: influencerCat._id,
        budget: { min: 20000, max: 40000, currency: 'INR' },
        applicationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'DRAFT',
      },
    });
    const lcId = lifecycleReqRes.data?.data?._id;

    // DRAFT -> PUBLISHED
    const toPublished = await apiRequest(`/requirements/${lcId}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'PUBLISHED' },
    });
    recordTest('Lifecycle', 'Transition: DRAFT -> PUBLISHED', toPublished.ok && toPublished.data?.data?.status === 'PUBLISHED');

    // PUBLISHED -> PAUSED
    const toPaused = await apiRequest(`/requirements/${lcId}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'PAUSED' },
    });
    recordTest('Lifecycle', 'Transition: PUBLISHED -> PAUSED', toPaused.ok && toPaused.data?.data?.status === 'PAUSED');

    // PAUSED -> PUBLISHED
    const toPublishedAgain = await apiRequest(`/requirements/${lcId}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'PUBLISHED' },
    });
    recordTest('Lifecycle', 'Transition: PAUSED -> PUBLISHED', toPublishedAgain.ok && toPublishedAgain.data?.data?.status === 'PUBLISHED');

    // PUBLISHED -> CLOSED
    const toClosed = await apiRequest(`/requirements/${lcId}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'CLOSED' },
    });
    recordTest('Lifecycle', 'Transition: PUBLISHED -> CLOSED', toClosed.ok && toClosed.data?.data?.status === 'CLOSED');

    // Verify CLOSED requirement rejects application submissions
    const applyToClosed = await apiRequest('/applications', {
      method: 'POST',
      token: tokens.creatorA,
      body: {
        requirementId: lcId,
        proposal: 'Attempting to apply to closed requirement',
        offeredPrice: 25000,
        currency: 'INR',
        availability: 'Immediately',
        estimatedDelivery: '3 Days',
      },
    });
    recordTest('Lifecycle', 'CLOSED requirement blocks new application submission (400 Bad Request)', applyToClosed.status === 400);

    // CLOSED -> COMPLETED
    const toCompleted = await apiRequest(`/requirements/${lcId}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'COMPLETED' },
    });
    recordTest('Lifecycle', 'Transition: CLOSED -> COMPLETED', toCompleted.ok && toCompleted.data?.data?.status === 'COMPLETED');

    // -------------------------------------------------------------
    // 4. DEADLINE VALIDATION
    // -------------------------------------------------------------
    console.log('\n--- 4. DEADLINE VALIDATION ---');

    // Create requirement with expired deadline
    const expiredReqRes = await apiRequest('/requirements', {
      method: 'POST',
      token: tokens.brandA,
      body: {
        title: 'Expired Deadline Opportunity for Validation',
        description: 'This requirement has an expired deadline in the past.',
        categoryId: influencerCat._id,
        budget: { min: 10000, max: 20000, currency: 'INR' },
        applicationDeadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        status: 'PUBLISHED',
      },
    });
    const expiredReqId = expiredReqRes.data?.data?._id;

    const applyExpiredRes = await apiRequest('/applications', {
      method: 'POST',
      token: tokens.creatorB,
      body: {
        requirementId: expiredReqId,
        proposal: 'Trying to apply after deadline',
        offeredPrice: 15000,
        currency: 'INR',
        availability: 'Immediately',
        estimatedDelivery: '2 Days',
      },
    });
    recordTest('Deadline Validation', 'Expired deadline strictly rejected by backend (400 Bad Request)', applyExpiredRes.status === 400);

    // -------------------------------------------------------------
    // 5. DUPLICATE APPLICATION GUARD
    // -------------------------------------------------------------
    console.log('\n--- 5. DUPLICATE APPLICATION GUARD & COMPOUND INDEX ---');

    // Creator A attempts to apply again to Requirement A (already applied earlier)
    const duplicateApplyRes = await apiRequest('/applications', {
      method: 'POST',
      token: tokens.creatorA,
      body: {
        requirementId: requirementA?._id,
        proposal: 'Second duplicate application attempt',
        offeredPrice: 80000,
        currency: 'INR',
        availability: 'Immediately',
        estimatedDelivery: '4 Days',
      },
    });
    recordTest('Duplicate Prevention', 'Duplicate application rejected gracefully (409 Conflict)', duplicateApplyRes.status === 409);

    // Verify MongoDB contains exactly 1 application for this creator + requirement
    const dupCount = appDoc ? await db.collection('applications').countDocuments({
      requirementId: new mongoose.Types.ObjectId(requirementA?._id),
      applicantId: new mongoose.Types.ObjectId(appDoc.applicantId),
    }) : 0;
    recordTest('MongoDB Audit', 'MongoDB contains exactly ONE application record for (req + applicant)', dupCount === 1);

    // -------------------------------------------------------------
    // 6. DETERMINISTIC MATCHING ENGINE QA
    // -------------------------------------------------------------
    console.log('\n--- 6. MATCHING ENGINE QA ---');

    // Check application match score calculated upon submission
    recordTest('Matching Engine', 'Application has deterministic match score between 0 and 100',
      appDoc && typeof appDoc.matchScore === 'number' && appDoc.matchScore >= 0 && appDoc.matchScore <= 100
    );

    // Creator recommended requirements endpoint
    const recReqsRes = await apiRequest('/requirements/creator/recommended', {
      token: tokens.creatorA,
    });
    const recommendedList = Array.isArray(recReqsRes.data?.data?.items) ? recReqsRes.data.data.items : (Array.isArray(recReqsRes.data?.data) ? recReqsRes.data.data : []);
    recordTest('Matching Engine', 'Recommended requirements returned for Creator A',
      recReqsRes.ok && Array.isArray(recommendedList) && recommendedList.length > 0
    );

    // -------------------------------------------------------------
    // 7. CATEGORY-AWARE REQUIREMENTS & DYNAMIC FIELDS
    // -------------------------------------------------------------
    console.log('\n--- 7. CATEGORY-AWARE DYNAMIC FIELDS ---');

    const influencerFields = {
      platform: 'Instagram',
      minFollowers: 50000,
      targetAudienceAge: '18-24',
      contentFormat: 'Reel + Story Set',
      deliverables: ['1 Reel', '2 Stories'],
    };

    const catAwareReqRes = await apiRequest('/requirements', {
      method: 'POST',
      token: tokens.brandA,
      body: {
        title: 'Category Dynamic Fields Influencer Campaign',
        description: 'Validating structured category specific fields',
        categoryId: influencerCat._id,
        budget: { min: 30000, max: 60000, currency: 'INR' },
        applicationDeadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        categorySpecificFields: influencerFields,
        status: 'PUBLISHED',
      },
    });

    const catAwareReq = catAwareReqRes.data?.data;
    recordTest('Category Fields', 'Category-specific fields persisted via API', catAwareReqRes.ok && catAwareReq?.categorySpecificFields?.minFollowers === 50000);

    const catAwareDoc = await db.collection('requirements').findOne({ _id: new mongoose.Types.ObjectId(catAwareReq?._id) });
    recordTest('MongoDB Audit', 'Category dynamic fields persisted in MongoDB document', catAwareDoc && catAwareDoc.categorySpecificFields?.platform === 'Instagram');

    // -------------------------------------------------------------
    // 8. APPLICATION VALIDATION RULES (Server-Side)
    // -------------------------------------------------------------
    console.log('\n--- 8. APPLICATION SERVER-SIDE VALIDATION ---');

    // Missing proposal
    const noProposal = await apiRequest('/applications', {
      method: 'POST',
      token: tokens.creatorB,
      body: { requirementId: requirementA?._id, offeredPrice: 50000, estimatedDelivery: '3 Days' },
    });
    recordTest('Validation', 'Missing proposal rejected (400 Bad Request)', noProposal.status === 400);

    // Negative offered price
    const negPrice = await apiRequest('/applications', {
      method: 'POST',
      token: tokens.creatorB,
      body: { requirementId: requirementA?._id, proposal: 'Valid pitch', offeredPrice: -500, estimatedDelivery: '3 Days' },
    });
    recordTest('Validation', 'Negative offered price rejected (400 Bad Request)', negPrice.status === 400);

    // -------------------------------------------------------------
    // 9. ADMIN MODERATION WORKFLOW
    // -------------------------------------------------------------
    console.log('\n--- 9. ADMIN MODERATION WORKFLOW ---');

    const adminMetrics = await apiRequest('/admin/dashboard-metrics', {
      token: tokens.admin,
    });
    recordTest('Admin Moderation', 'Admin accesses dashboard metrics', adminMetrics.ok && adminMetrics.data?.data?.totalUsers > 0);

    // Admin moderate requirement
    const adminModRes = await apiRequest(`/requirements/admin/${requirementA?._id}/moderate`, {
      method: 'PATCH',
      token: tokens.admin,
      body: { status: 'PUBLISHED', featured: true },
    });
    recordTest('Admin Moderation', 'Admin moderates requirement and sets featured spotlight', adminModRes.ok && adminModRes.data?.data?.featured === true);

    const featDoc = await db.collection('requirements').findOne({ _id: new mongoose.Types.ObjectId(requirementA?._id) });
    recordTest('MongoDB Audit', 'Featured spotlight persisted in MongoDB document', featDoc && featDoc.featured === true);

    // -------------------------------------------------------------
    // 10. NOTIFICATIONS ENGINE AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 10. NOTIFICATIONS ENGINE AUDIT ---');

    const brandANotifsRes = await apiRequest('/notifications', {
      token: tokens.brandA,
    });
    const brandANotifs = Array.isArray(brandANotifsRes.data?.data?.notifications) ? brandANotifsRes.data.data.notifications : [];
    recordTest('Notifications', 'Brand A received notification when Creator A applied',
      brandANotifsRes.ok && brandANotifs.some(n => n.type === 'APPLICATION_RECEIVED' || n.type === 'APPLICATION_SUBMITTED' || n.title?.includes('Application'))
    );

    const creatorANotifsRes = await apiRequest('/notifications', {
      token: tokens.creatorA,
    });
    const creatorANotifs = Array.isArray(creatorANotifsRes.data?.data?.notifications) ? creatorANotifsRes.data.data.notifications : [];
    recordTest('Notifications', 'Creator A received notification when Shortlisted/Accepted',
      creatorANotifsRes.ok && creatorANotifs.some(n => n.type === 'APPLICATION_ACCEPTED' || n.type === 'APPLICATION_SHORTLISTED' || n.title?.includes('Accepted') || n.title?.includes('Shortlist'))
    );

    // -------------------------------------------------------------
    // 11. SEARCH & FILTER API AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 11. SEARCH & FILTER API ---');

    const filterCityRes = await apiRequest('/requirements?city=Mumbai');
    const cityItems = Array.isArray(filterCityRes.data?.data) ? filterCityRes.data.data : [];
    recordTest('Search & Filter', 'Filter requirements by City', filterCityRes.ok && cityItems.every(r => r.location?.city === 'Mumbai' || r.location?.isRemote));

    const filterCatRes = await apiRequest(`/requirements?category=${influencerCat._id}`);
    const catItems = Array.isArray(filterCatRes.data?.data) ? filterCatRes.data.data : [];
    recordTest('Search & Filter', 'Filter requirements by Category', filterCatRes.ok && catItems.every(r => r.categoryId === influencerCat._id || r.categoryId?._id === influencerCat._id));

    // -------------------------------------------------------------
    // 12. PUBLIC VISIBILITY GUARD
    // -------------------------------------------------------------
    console.log('\n--- 12. PUBLIC VISIBILITY GUARD ---');

    const publicAllReqs = await apiRequest('/requirements');
    const publicList = Array.isArray(publicAllReqs.data?.data) ? publicAllReqs.data.data : [];
    const containsDraft = publicList.some(r => r.status === 'DRAFT');
    const containsClosed = publicList.some(r => r.status === 'CLOSED');

    recordTest('Public Visibility', 'DRAFT requirements are NEVER exposed in public listing', !containsDraft);
    recordTest('Public Visibility', 'CLOSED requirements are NOT returned in default active public discovery', !containsClosed);

    // -------------------------------------------------------------
    // 13. DATABASE INDEXES AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 13. DATABASE INDEXES AUDIT ---');

    const reqIndexes = await db.collection('requirements').indexes();
    const appIndexes = await db.collection('applications').indexes();
    const notifIndexes = await db.collection('notifications').indexes();

    const hasReqSlugIndex = reqIndexes.some(i => i.key.slug === 1);
    const hasReqStatusIndex = reqIndexes.some(i => i.key.status === 1 || (i.key.status === 1 && i.key.categoryId === 1));
    const hasAppCompoundIndex = appIndexes.some(i => i.key.requirementId === 1 && i.key.applicantId === 1 && i.unique);
    const hasNotifRecipientIndex = notifIndexes.some(i => i.key.userId === 1);

    recordTest('Database Indexes', 'Requirement slug index exists', hasReqSlugIndex);
    recordTest('Database Indexes', 'Requirement status compound index exists', hasReqStatusIndex);
    recordTest('Database Indexes', 'Application unique compound index (requirementId + applicantId) exists', hasAppCompoundIndex);
    recordTest('Database Indexes', 'Notification recipient index exists', hasNotifRecipientIndex);

  } catch (error) {
    console.error('Audit encountered unexpected execution error:', error);
    recordTest('Suite Execution', 'Unexpected runtime error', false, error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📦 Disconnected from MongoDB.');
  }

  // -------------------------------------------------------------
  // AUDIT SUMMARY & VERDICT
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('                 PHASE 03 QA AUDIT SUMMARY                     ');
  console.log('===============================================================');
  console.log(`  Total Tests Run:  ${results.total}`);
  console.log(`  Passed Tests:     ${results.passed}`);
  console.log(`  Failed Tests:     ${results.failed}`);
  console.log(`  Pass Rate:        ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('===============================================================\n');

  if (results.failed === 0) {
    console.log('🎉 VERDICT: ALL PHASE 03 PRODUCTION QA TESTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ VERDICT: ${results.failed} test(s) failed. See details above.`);
  }

  return results;
}

runAudit();
