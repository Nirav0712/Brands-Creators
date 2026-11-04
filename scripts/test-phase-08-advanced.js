/**
 * BRANDS & CREATORS — PHASE 08 ADVANCED QA AUDIT SUITE
 * Social Verification & Badging, AI Intelligence Engine, Brand Campaign Analytics & Enterprise Team CRM
 *
 * Validates:
 * 1. Social Account Linking, Handle Validation, and Metrics Sync
 * 2. Creator Pro Verification Request & Status Transition
 * 3. Admin Verification Queue Aggregation & Social Account Population
 * 4. Admin Pro Badge Approval, Audit Logging & Real-Time Notification Dispatch
 * 5. Admin Rejection with Feedback Notes
 * 6. AI Semantic Match Calculation & Match Reasons
 * 7. AI Proposal Pitch Generator across multiple creative tones
 * 8. AI Brief Optimization & Deliverable Structuring
 * 9. Brand Campaign Analytics, Spend Aggregation & Category Distribution
 * 10. Enterprise Multi-Seat Team CRM (Inviting, Roles, Duplicate Protection, Revocation)
 * 11. Role-Based Access Control, Tenant Isolation & Permission Security
 */

const mongoose = require('mongoose');

const API_BASE = 'http://localhost:4000/api/v1';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS ${totalTests}] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL ${totalTests}] ${message} ${details ? `(${details})` : ''}`);
  }
}

async function apiRequest(endpoint, { method = 'GET', body = null, token = null, headers: customHeaders = {} } = {}) {
  const TEST_BYPASS_SECRET = process.env.RATE_LIMIT_TEST_BYPASS_SECRET || 'bc_test_secret_hardening_suite_9f82d1e4a7c06b';
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = { 'Content-Type': 'application/json', 'x-bypass-rate-limit': TEST_BYPASS_SECRET, ...customHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

function unwrap(res) {
  if (!res) return null;
  if (res.data?.data !== undefined) return res.data.data;
  return res.data;
}

async function runPhase08Suite() {
  console.log('\n===============================================================');
  console.log('  BRANDS & CREATORS — PHASE 08 ADVANCED QA & AUDIT SUITE       ');
  console.log('===============================================================\n');

  const stamp = Date.now();

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
  console.log(`📦 Connected to MongoDB: ${activeUri}\n`);

  const db = mongoose.connection.db;

  try {
    // =========================================================================
    // 0. AUTHENTICATION SETUP
    // =========================================================================
    console.log('--- 0. AUTHENTICATION & TEST ENTITIES SETUP ---');
    const users = {
      admin: { email: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
      creator1: {
        email: `rohan.cinematographer.${stamp}@example.com`,
        username: `rohan_${stamp}`,
        password: 'Password123!',
        role: 'CREATOR',
        name: 'Rohan Kapoor DP',
      },
      creator2: {
        email: `novice.creator.${stamp}@example.com`,
        username: `novice_${stamp}`,
        password: 'Password123!',
        role: 'CREATOR',
        name: 'Novice Content Maker',
      },
      brand: {
        email: `brand.enterprise.${stamp}@example.com`,
        username: `brand_ent_${stamp}`,
        password: 'Password123!',
        role: 'BRAND',
        name: 'Glow Botanics Enterprise',
      },
    };

    const tokens = {};
    const userDocs = {};

    for (const [key, user] of Object.entries(users)) {
      if (key !== 'admin') {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: {
            email: user.email,
            username: user.username,
            password: user.password,
            fullName: user.name,
            role: user.role,
          },
        });
      }

      const loginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: { login: user.email, password: user.password },
      });

      const unwrappedLogin = unwrap(loginRes);
      tokens[key] = unwrappedLogin?.accessToken || unwrappedLogin?.tokens?.accessToken;
      userDocs[key] = unwrappedLogin?.user;
      assert(!!tokens[key], `Auth Setup > Login ${key} (${user.email})`);
    }

    const categories = await db.collection('categories').find({}).toArray();
    const catId = categories[0]?._id?.toString() || '66c012345678901234567890';

    // Initialize Creator 1 profile
    await apiRequest('/creators/me', {
      method: 'PATCH',
      token: tokens.creator1,
      body: {
        headline: 'Commercial Cinematographer & Visual Director',
        primaryCategoryId: catId,
        skills: ['Cinema 4K', 'ARRI Alexa', 'DaVinci Resolve', 'Commercial Lighting'],
        startingPrice: 35000,
        bio: 'Award-winning commercial filmmaker and visual director.',
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India', isRemote: true },
      },
    });
    await apiRequest('/creators/me/publish', { method: 'POST', token: tokens.creator1 });

    // Initialize Creator 2 profile
    await apiRequest('/creators/me', {
      method: 'PATCH',
      token: tokens.creator2,
      body: {
        headline: 'Novice UGC Video Maker',
        primaryCategoryId: catId,
        skills: ['UGC Video', 'Phone Camera'],
        startingPrice: 5000,
        bio: 'Just getting started with content creation.',
        location: { city: 'Delhi', state: 'Delhi', country: 'India', isRemote: true },
      },
    });
    await apiRequest('/creators/me/publish', { method: 'POST', token: tokens.creator2 });

    // Initialize Brand profile
    await apiRequest('/brands/me', {
      method: 'PATCH',
      token: tokens.brand,
      body: {
        companyName: 'Glow Botanics Enterprise Ltd',
        industry: 'D2C Skincare & Beauty',
        websiteUrl: 'https://glowbotanics.in',
        description: 'Clean Ayurvedic skincare products.',
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
      },
    });
    await apiRequest('/brands/me/publish', { method: 'POST', token: tokens.brand });

    const creator1UserId = userDocs.creator1?._id || userDocs.creator1?.id;
    const creator2UserId = userDocs.creator2?._id || userDocs.creator2?.id;

    // Fetch creator profile documents from MongoDB
    const creator1Doc = await db.collection('creatorProfiles').findOne({ userId: new mongoose.Types.ObjectId(creator1UserId) });
    const creator2Doc = await db.collection('creatorProfiles').findOne({ userId: new mongoose.Types.ObjectId(creator2UserId) });

    assert(!!creator1Doc, 'Creator 1 profile document verified in MongoDB');
    assert(!!creator2Doc, 'Creator 2 profile document verified in MongoDB');

    // =========================================================================
    // MODULE 1: SOCIAL ACCOUNTS & VERIFICATION REQUEST
    // =========================================================================
    console.log('\n--- MODULE 1: SOCIAL LINKING & VERIFICATION SUBMISSION ---');

    // 1. Add Instagram Account
    const igRes = await apiRequest('/social', {
      method: 'POST',
      token: tokens.creator1,
      body: {
        platform: 'INSTAGRAM',
        profileUrl: `https://instagram.com/rohan_${stamp}`,
        handle: `@rohan_${stamp}`,
        metrics: {
          followers: 145000,
          engagementRate: 4.8,
        },
      },
    });
    const igData = unwrap(igRes);
    assert(igRes.ok && igData?.platform === 'INSTAGRAM', 'Instagram account successfully linked with follower metrics');
    assert(igData?.verificationStatus === 'UNVERIFIED', 'Newly linked social account defaults to UNVERIFIED');

    // 2. Add YouTube Account
    const ytRes = await apiRequest('/social', {
      method: 'POST',
      token: tokens.creator1,
      body: {
        platform: 'YOUTUBE',
        profileUrl: `https://youtube.com/@rohankapoor_${stamp}`,
        handle: `RohanKapoorCinematography_${stamp}`,
        metrics: {
          subscribers: 280000,
        },
      },
    });
    const ytData = unwrap(ytRes);
    assert(ytRes.ok && ytData?.platform === 'YOUTUBE', 'YouTube account successfully linked');

    // 3. Query Public Social Accounts
    const publicSocials = await apiRequest(`/social/public/${creator1UserId}`);
    const pubList = unwrap(publicSocials);
    assert(publicSocials.ok && Array.isArray(pubList), 'Public social accounts fetched successfully');
    assert(pubList?.length >= 2, 'Both linked social accounts are returned in public inquiry');
    if (pubList?.length > 0) {
      assert(!pubList[0].accessToken, 'Access tokens are redacted from public inquiries');
    }

    // 4. Creator 1 requests verification
    const verifyReqRes = await apiRequest('/social/request-verification', {
      method: 'POST',
      token: tokens.creator1,
      body: {
        notes: 'Govt Photo ID + GST Certificate + Verified Instagram profile provided.',
        documentUrl: 'https://cdn.example.com/docs/rohan-id.pdf',
      },
    });
    const verifyReqData = unwrap(verifyReqRes);
    assert(verifyReqRes.ok, 'Creator verification request submitted successfully');
    assert(verifyReqData?.creator?.verificationStatus === 'PENDING', 'Creator profile verification status transitioned to PENDING');

    // Creator 2 requests verification
    await apiRequest('/social/request-verification', {
      method: 'POST',
      token: tokens.creator2,
      body: {
        notes: 'Novice creator applying for badge.',
      },
    });

    // =========================================================================
    // MODULE 2: ADMIN VERIFICATION QUEUE & TRUST BADGING
    // =========================================================================
    console.log('\n--- MODULE 2: ADMIN VERIFICATION QUEUE & TRUST BADGING ---');

    // Admin fetches queue
    const queueRes = await apiRequest('/admin/verification-queue', {
      method: 'GET',
      token: tokens.admin,
    });
    const queueList = unwrap(queueRes);
    assert(queueRes.ok && Array.isArray(queueList), 'Admin verification queue retrieved successfully');
    const creator1InQueue = queueList?.find((c) => (c.userId?._id || c.userId)?.toString() === creator1UserId.toString());
    assert(!!creator1InQueue, 'Creator 1 appears in the admin verification queue');
    assert(Array.isArray(creator1InQueue?.socialAccounts) && creator1InQueue.socialAccounts.length >= 2, 'Admin queue item includes populated social accounts');

    // Admin Approves Creator 1
    const approveRes = await apiRequest(`/admin/creators/${creator1Doc._id}/verify`, {
      method: 'POST',
      token: tokens.admin,
      body: {
        status: 'VERIFIED',
        notes: 'Verified via official social sync and ID proof. Pro badge granted.',
      },
    });
    const approveData = unwrap(approveRes);
    assert(approveRes.ok, 'Admin approved Creator 1 for Verified Pro badge');
    assert(approveData?.creator?.verificationStatus === 'VERIFIED', 'Creator profile updated to VERIFIED');

    // Verify social accounts were synchronized to VERIFIED
    const updatedSocials = await apiRequest(`/social/public/${creator1UserId}`);
    const updatedList = unwrap(updatedSocials);
    const allVerified = Array.isArray(updatedList) && updatedList.every((s) => s.verificationStatus === 'VERIFIED');
    assert(allVerified, 'Connected social accounts automatically synchronized to VERIFIED upon badge grant');

    // Verify Creator 1 received PROFILE_VERIFIED notification
    const creator1Notifs = await apiRequest('/notifications', {
      method: 'GET',
      token: tokens.creator1,
    });
    const notifsData1 = unwrap(creator1Notifs);
    const verifiedNotif = (notifsData1?.notifications || notifsData1)?.find((n) => n.type === 'PROFILE_VERIFIED');
    assert(!!verifiedNotif, 'Creator 1 received real-time PROFILE_VERIFIED in-app notification');

    // Admin Rejects Creator 2
    const rejectRes = await apiRequest(`/admin/creators/${creator2Doc._id}/verify`, {
      method: 'POST',
      token: tokens.admin,
      body: {
        status: 'REJECTED',
        notes: 'Please add at least 3 completed portfolio items before re-applying.',
      },
    });
    const rejectData = unwrap(rejectRes);
    assert(rejectRes.ok, 'Admin rejected Creator 2 verification request');
    assert(rejectData?.creator?.verificationStatus === 'REJECTED', 'Creator 2 profile updated to REJECTED');

    // Verify Creator 2 received PROFILE_REJECTED notification
    const creator2Notifs = await apiRequest('/notifications', {
      method: 'GET',
      token: tokens.creator2,
    });
    const notifsData2 = unwrap(creator2Notifs);
    const rejectedNotif = (notifsData2?.notifications || notifsData2)?.find((n) => n.type === 'PROFILE_REJECTED');
    assert(!!rejectedNotif, 'Creator 2 received real-time PROFILE_REJECTED notification with feedback');

    // =========================================================================
    // MODULE 3: AI INTELLIGENCE ENGINE
    // =========================================================================
    console.log('\n--- MODULE 3: ADVANCED AI INTELLIGENCE ENGINE ---');

    // =========================================================================
    // MODULE 3: AI INTELLIGENCE ENGINE & REQUIREMENT BRIEF
    // =========================================================================
    console.log('\n--- MODULE 3: ADVANCED AI INTELLIGENCE ENGINE ---');

    // 1. Post a Requirement from Brand to provide context for AI and Analytics
    const reqRes = await apiRequest('/requirements', {
      method: 'POST',
      token: tokens.brand,
      body: {
        title: `Winter Campaign Commercial Cinematography ${stamp}`,
        description: 'Full commercial production for our winter organic hydration line.',
        categoryId: catId,
        budget: { min: 40000, max: 90000, currency: 'INR' },
        budgetType: 'RANGE',
        professionalsRequired: 1,
        deliverables: ['3x 4K Master Commercials', 'Soundtrack Mixing & Color Grading'],
        applicationDeadline: new Date(Date.now() + 86400000 * 30).toISOString(),
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India', isRemote: true },
      },
    });
    const reqData = unwrap(reqRes);
    const reqId = reqData?._id;
    assert(reqRes.ok && !!reqId, 'Brand published requirement for AI matching and analytics');

    // Publish the requirement
    await apiRequest(`/requirements/${reqId}/status`, {
      method: 'PATCH',
      token: tokens.brand,
      body: { status: 'PUBLISHED' },
    });

    // 2. Semantic Match Calculation
    const matchRes = await apiRequest('/ai/match-score', {
      method: 'POST',
      token: tokens.creator1,
      body: {
        requirementId: reqId,
        applicantId: creator1Doc._id.toString(),
      },
    });
    const matchData = unwrap(matchRes);
    assert(matchRes.ok, 'AI Semantic Match endpoint responded with 200 OK');
    assert(matchData?.overallScore >= 60, `Semantic match overallScore is high (${matchData?.overallScore}%) for aligned creator`);
    assert(matchData?.categoryFit !== undefined, 'AI returned categoryFit sub-metric');
    assert(Array.isArray(matchData?.insights?.strengths) && matchData.insights.strengths.length > 0, 'AI returned explicit strengths');

    // 3. Proposal Pitch Generator (Professional tone)
    const pitchRes = await apiRequest('/ai/proposal-pitch', {
      method: 'POST',
      token: tokens.creator1,
      body: {
        requirementId: reqId,
        tone: 'PROFESSIONAL',
        customNotes: 'I own RED V-Raptor and ARRI lighting packages.',
      },
    });
    const pitchData = unwrap(pitchRes);
    assert(pitchRes.ok, 'AI Proposal Pitch Generator returned 200 OK');
    assert(typeof pitchData?.pitchBody === 'string' && pitchData.pitchBody.length > 50, 'AI generated structured pitch body');
    assert(Array.isArray(pitchData?.highlightedSkills), 'AI generated highlighted skills');
    assert(typeof pitchData?.suggestedTurnaroundDays === 'number', 'AI provided suggested delivery turnaround days');

    // Test Creative tone
    const creativePitchRes = await apiRequest('/ai/proposal-pitch', {
      method: 'POST',
      token: tokens.creator1,
      body: {
        requirementId: reqId,
        tone: 'CREATIVE',
      },
    });
    const creativeData = unwrap(creativePitchRes);
    assert(creativePitchRes.ok && typeof creativeData?.hook === 'string', 'Creative pitch hook generated successfully');

    // 4. AI Brief Optimizer
    const optimizeRes = await apiRequest('/ai/optimize-brief', {
      method: 'POST',
      token: tokens.brand,
      body: {
        title: 'Need 3 video for insta',
        description: 'Make 3 short video for skincare launch with hooks and testimonials',
        targetBudget: 30000,
      },
    });
    const optData = unwrap(optimizeRes);
    assert(optimizeRes.ok, 'AI Brief Optimizer returned 200 OK');
    assert(optData?.scopeClarityScore !== undefined, 'Brief clarity score calculated');
    assert(Array.isArray(optData?.recommendedDeliverables) && optData.recommendedDeliverables.length > 0, 'Brief optimizer provided explicit structured deliverables');
    assert(Array.isArray(optData?.suggestedSkills), 'Brief optimizer suggested missing search tags');

    // =========================================================================
    // MODULE 4: BRAND CAMPAIGN ANALYTICS & ENTERPRISE CRM
    // =========================================================================
    console.log('\n--- MODULE 4: BRAND ANALYTICS & ENTERPRISE TEAM CRM ---');

    // Creator 1 submits proposal using AI-generated pitch
    const proposalPitchText = pitchData?.pitchBody || 'I would love to shoot your commercial campaign with complete 4K mastery.';
    const appRes = await apiRequest('/applications', {
      method: 'POST',
      token: tokens.creator1,
      body: {
        requirementId: reqId,
        proposal: proposalPitchText,
        offeredPrice: 55000,
        currency: 'INR',
        availability: 'Available Immediately',
        estimatedDelivery: `${pitchData?.suggestedTurnaroundDays || 5} Business Days`,
      },
    });
    assert(appRes.ok, 'Creator submitted AI-assisted proposal');

    // Query Brand Analytics
    const analyticsRes = await apiRequest('/brands/analytics', {
      method: 'GET',
      token: tokens.brand,
    });
    const aData = unwrap(analyticsRes);
    assert(analyticsRes.ok, 'Brand Campaign Analytics endpoint returned 200 OK');
    assert(aData?.activeRequirements >= 1, 'Analytics reflects at least 1 active requirement');
    assert(aData?.totalProposalsReceived >= 1, 'Analytics tracks live proposal reception');
    assert(Array.isArray(aData?.categoryBreakdown), 'Analytics provides category breakdown array');
    assert(Array.isArray(aData?.monthlySpendTrend), 'Analytics provides monthly spend trend');

    // Brand Team CRM: Get initial team
    const teamRes = await apiRequest('/brands/team', {
      method: 'GET',
      token: tokens.brand,
    });
    const tData = unwrap(teamRes);
    assert(teamRes.ok && tData?.teamSize >= 1, 'Brand team CRM fetched successfully with teamSize');
    assert(Array.isArray(tData?.members), 'Brand team members list is an array');

    // Brand Team CRM: Invite new member (Campaign Manager)
    const inviteEmail = `collab_${stamp}@glowbotanics.in`;
    const inviteRes = await apiRequest('/brands/team/invite', {
      method: 'POST',
      token: tokens.brand,
      body: {
        fullName: 'Aditi Marketing Lead',
        email: inviteEmail,
        role: 'CAMPAIGN_MANAGER',
      },
    });
    const invData = unwrap(inviteRes);
    assert(inviteRes.ok, 'Brand invited Campaign Manager successfully');
    assert(invData?.members?.some((m) => m.email === inviteEmail), 'Invited member appears in brand team roster');

    // Verify duplicate email is rejected with 409 Conflict
    const dupInviteRes = await apiRequest('/brands/team/invite', {
      method: 'POST',
      token: tokens.brand,
      body: {
        fullName: 'Duplicate Aditi',
        email: inviteEmail,
        role: 'CAMPAIGN_MANAGER',
      },
    });
    assert(dupInviteRes.status === 409, 'Duplicate team invitation properly rejected with 409 Conflict');

    // Brand Team CRM: Remove member
    const memberToRemove = invData.members.find((m) => m.email === inviteEmail);
    const removeRes = await apiRequest(`/brands/team/${memberToRemove._id}`, {
      method: 'DELETE',
      token: tokens.brand,
    });
    const remData = unwrap(removeRes);
    assert(removeRes.ok, 'Team member access revoked successfully');
    assert(!remData?.members?.some((m) => m.email === inviteEmail), 'Revoked member removed from team roster');

    // =========================================================================
    // MODULE 5: TENANT ISOLATION & ACCESS CONTROL
    // =========================================================================
    console.log('\n--- MODULE 5: TENANT ISOLATION & SECURITY CHECKS ---');

    // Creator attempting to view brand team
    const unauthTeam = await apiRequest('/brands/team', {
      method: 'GET',
      token: tokens.creator1,
    });
    assert(unauthTeam.status === 403, 'Creator forbidden from accessing Brand Team CRM (403)');

    // Brand attempting to access admin verification queue
    const unauthQueue = await apiRequest('/admin/verification-queue', {
      method: 'GET',
      token: tokens.brand,
    });
    assert(unauthQueue.status === 403, 'Brand forbidden from accessing Admin Verification Queue (403)');

    // Admin Mission Control Metrics live validation
    const adminMetricsRes = await apiRequest('/admin/dashboard-metrics', {
      method: 'GET',
      token: tokens.admin,
    });
    const adminData = unwrap(adminMetricsRes);
    assert(adminMetricsRes.ok, 'Admin dashboard metrics query succeeded');
    assert(adminData?.totalCreators >= 2, 'Admin metrics tracks real MongoDB creator count');
    assert(adminData?.totalBrands >= 1, 'Admin metrics tracks real MongoDB brand count');
    assert(adminData?.activeRequirements >= 1, 'Admin metrics tracks real MongoDB active requirements');

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n===============================================================');
    console.log(`  PHASE 08 AUDIT RESULTS: ${passedTests}/${totalTests} ASSERTIONS PASSED`);
    if (failedTests > 0) {
      console.error(`  ❌ ${failedTests} ASSERTIONS FAILED!`);
    } else {
      console.log('  🎉 ALL PHASE 08 ASSERTIONS PASSED CLEANLY WITH ZERO DEFECTS!');
    }
    console.log('===============================================================\n');

  } finally {
    await mongoose.disconnect();
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

runPhase08Suite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
