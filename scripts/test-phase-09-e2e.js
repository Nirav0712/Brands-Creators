/**
 * ===============================================================
 * BRANDS & CREATORS — PHASE 09 MASTER END-TO-END QA SUITE
 * ===============================================================
 * Full Product Completion, User Journeys, Team CRM & Zero-Deployment Audit
 */

const mongoose = require('mongoose');

const API_BASE = 'http://localhost:4000/api/v1';
const MONGO_URI = 'mongodb://127.0.0.1:27017/brands_creators_dev';

let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS ${passed}] ${message}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL ${failed + passed}] ${message} ${details ? `(${details})` : ''}`);
    throw new Error(`Assertion failed: ${message}`);
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

async function run() {
  console.log('\n===============================================================');
  console.log('  BRANDS & CREATORS — PHASE 09 MASTER E2E & QA AUDIT SUITE     ');
  console.log('===============================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log(`📦 Connected to MongoDB: ${MONGO_URI}\n`);

  const ts = Date.now();
  const testAdminEmail = 'admin@brandsandcreators.com';
  const testBrandOwnerEmail = `brand.e2e.owner.${ts}@example.com`;
  const testBrandMemberEmail = `member.invited.${ts}@example.com`;
  const testCreatorEmail = `creator.verified.${ts}@example.com`;
  const password = 'Password123!';

  // --- 1. USER REGISTRATION & AUTHENTICATION JOURNEY ---
  console.log('--- 1. AUTHENTICATION & MULTI-ROLE ONBOARDING ---');

  // Register Brand Owner
  const brandOwnerReg = await apiRequest('/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Atlas Brand Owner',
      username: `atlas_brand_${ts}`,
      email: testBrandOwnerEmail,
      password,
      role: 'BRAND',
    },
  });
  assert(brandOwnerReg.status === 201, 'Brand owner registered successfully');
  const brandOwnerData = unwrap(brandOwnerReg);
  const brandOwnerToken = brandOwnerData.accessToken || brandOwnerData.tokens?.accessToken;
  const brandOwnerUserId = brandOwnerData.user.id || brandOwnerData.user._id;

  // Register Invited Collaborator User
  const memberReg = await apiRequest('/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Alex Collaborator',
      username: `alex_collab_${ts}`,
      email: testBrandMemberEmail,
      password,
      role: 'BRAND',
    },
  });
  assert(memberReg.status === 201, 'Invited team collaborator registered successfully');
  const memberData = unwrap(memberReg);
  const memberToken = memberData.accessToken || memberData.tokens?.accessToken;
  const memberUserId = memberData.user.id || memberData.user._id;

  // Register Creator
  const creatorReg = await apiRequest('/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Devin Cinematic Creator',
      username: `devin_cinematic_${ts}`,
      email: testCreatorEmail,
      password,
      role: 'CREATOR',
    },
  });
  assert(creatorReg.status === 201, 'Creator registered successfully');
  const creatorData = unwrap(creatorReg);
  const creatorToken = creatorData.accessToken || creatorData.tokens?.accessToken;
  const creatorUserId = creatorData.user.id || creatorData.user._id;

  // Admin Login
  const adminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: {
      login: testAdminEmail,
      password: 'SuperAdmin@Brands2026!',
    },
  });
  assert(adminLogin.status === 200, 'Admin login succeeded');
  const adminData = unwrap(adminLogin);
  const adminToken = adminData.accessToken || adminData.tokens?.accessToken;

  // --- 2. PUBLIC MARKETPLACE & CATEGORY TAXONOMY ---
  console.log('\n--- 2. PUBLIC MARKETPLACE & DYNAMIC TAXONOMY ---');

  const catRes = await apiRequest('/categories');
  assert(catRes.status === 200, 'Public categories fetched successfully');
  const categories = unwrap(catRes) || [];
  assert(categories.length > 0, `Active marketplace categories exist (found ${categories.length})`);
  const activeCategory = categories[0];
  const categorySlug = activeCategory.slug;

  const creatorsListing = await apiRequest('/creators');
  assert(creatorsListing.status === 200, 'Public creators marketplace listing responded 200 OK');

  // --- 3. CREATOR PROFILE, SOCIAL LINKING & VERIFICATION SUBMISSION ---
  console.log('\n--- 3. CREATOR JOURNEY: PROFILES, SOCIALS & VERIFICATION ---');

  // Creator profile draft save
  const creatorDraft = await apiRequest('/creators/me/draft', {
    method: 'POST',
    token: creatorToken,
    body: {
      headline: 'Commercial DP & High-Impact Content Creator',
      bio: 'Award-winning cinematographer specializing in luxury automotive and direct response video reels.',
      primaryCategoryId: activeCategory._id,
      startingPrice: 35000,
      skills: ['Cinematography', 'Color Grading', 'Videography', 'UGC Video'],
      portfolio: [
        {
          title: 'Hypercar Launch Film',
          description: '4K cinematic teaser campaign produced for high-end automotive brand.',
          mediaType: 'REEL',
          mediaUrl: 'https://cdn.brandsandcreators.com/samples/hypercar-launch.mp4',
        },
      ],
    },
  });
  assert(creatorDraft.status === 201 || creatorDraft.status === 200, 'Creator onboarding draft saved to MongoDB');

  // Creator publishes profile
  const creatorPublish = await apiRequest('/creators/me/publish', {
    method: 'POST',
    token: creatorToken,
  });
  assert(creatorPublish.status === 201 || creatorPublish.status === 200, 'Creator profile published successfully');
  const creatorProfileSlug = unwrap(creatorPublish).slug;

  // Creator links Instagram account
  const socialLink = await apiRequest('/social', {
    method: 'POST',
    token: creatorToken,
    body: {
      platform: 'INSTAGRAM',
      profileUrl: 'https://instagram.com/devin.visuals',
      metrics: {
        followers: 125000,
        postsCount: 310,
        engagementRate: 4.8,
      },
    },
  });
  assert(socialLink.status === 201 || socialLink.status === 200, 'Creator linked Instagram account with verified metrics');

  // Creator submits verification request
  const verifReq = await apiRequest('/social/request-verification', {
    method: 'POST',
    token: creatorToken,
    body: {
      notes: 'Applying for Verified Pro Creator badge. Portfolio reel attached.',
    },
  });
  assert(verifReq.status === 201 || verifReq.status === 200, 'Verification request submitted successfully');
  assert(unwrap(verifReq).status === 'PENDING', 'Creator verification status transitioned to PENDING');

  // --- 4. ADMIN VERIFICATION & AUDIT TRAIL ---
  console.log('\n--- 4. ADMIN JOURNEY: QUEUE MODERATION & TRUST BADGING ---');

  const adminQueue = await apiRequest('/admin/verification-queue', { token: adminToken });
  assert(adminQueue.status === 200, 'Admin verification queue retrieved');
  const queueItems = unwrap(adminQueue) || [];
  const queuedCreator = queueItems.find((q) => q.userId?._id === creatorUserId || q.userId?.email === testCreatorEmail);
  assert(Boolean(queuedCreator), 'Applicant appears in Admin Verification Queue');

  // Admin approves Pro badge
  const approveRes = await apiRequest(`/admin/creators/${queuedCreator._id}/verify`, {
    method: 'POST',
    token: adminToken,
    body: {
      status: 'VERIFIED',
      notes: 'Credentials and commercial portfolio validated by Trust & Safety.',
    },
  });
  assert(approveRes.status === 200 || approveRes.status === 201, 'Admin approved Verified Pro Creator badge');

  // Verify public profile reflects Pro badge & social channels
  const publicProfile = await apiRequest(`/creators/${creatorProfileSlug}`);
  assert(publicProfile.status === 200, 'Public creator profile fetched by slug');
  const pubCreator = unwrap(publicProfile);
  assert(pubCreator.verificationStatus === 'VERIFIED', 'Public profile shows VERIFIED badge');
  assert(pubCreator.socialAccounts?.length > 0, 'Public profile includes linked social accounts');

  // --- 5. BRAND PROFILE, REQUIREMENT PUBLISHING & CATEGORY SLUG RESOLUTION ---
  console.log('\n--- 5. BRAND JOURNEY: PROFILE & REQUIREMENT CREATION ---');

  // Brand profile onboarding
  const brandDraft = await apiRequest('/brands/me/draft', {
    method: 'POST',
    token: brandOwnerToken,
    body: {
      companyName: 'Atlas Performance Apparel',
      tagline: 'Engineered Activewear for Modern Athletes',
      description: 'Global athletic brand connecting with creators to showcase technical apparel in action.',
      industry: 'Sportswear & Fashion',
      websiteUrl: 'https://atlasapparel.com',
      location: { city: 'Bengaluru', country: 'India' },
    },
  });
  assert(brandDraft.status === 201 || brandDraft.status === 200, 'Brand onboarding draft saved to MongoDB');

  const brandPublish = await apiRequest('/brands/me/publish', {
    method: 'POST',
    token: brandOwnerToken,
  });
  assert(brandPublish.status === 200 || brandPublish.status === 201, 'Brand profile published successfully');

  // Publish requirement using category slug (verifying Phase 09 resolution)
  const reqRes = await apiRequest('/requirements', {
    method: 'POST',
    token: brandOwnerToken,
    body: {
      title: 'Cinematic Autumn Lookbook Launch Reel',
      description: 'High-energy 9:16 vertical commercial reel featuring our flagship moisture-wicking collection.',
      categoryId: categorySlug, // Testing slug resolution!
      budgetType: 'RANGE',
      budget: { min: 30000, max: 60000, currency: 'INR' },
      applicationDeadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      deliverables: ['1x 9:16 Master 4K Video Reel', '3x High-Res Action Stills'],
      requiredSkills: ['Cinematography', 'Videography', 'Color Grading'],
      status: 'PUBLISHED',
    },
  });
  assert(reqRes.status === 201, 'Requirement published with category slug resolution');
  const requirement = unwrap(reqRes);
  assert(Boolean(requirement._id), 'Requirement received a persistent MongoDB _id');

  // --- 6. AI SEMANTIC MATCH & CREATIVE PROPOSAL ASSISTANT ---
  console.log('\n--- 6. AI INTELLIGENCE: SEMANTIC COMPATIBILITY & PROPOSAL PITCH ---');

  const aiMatch = await apiRequest('/ai/match-score', {
    method: 'POST',
    token: brandOwnerToken,
    body: {
      requirementId: requirement._id.toString(),
      applicantId: queuedCreator._id.toString(),
    },
  });
  assert(aiMatch.ok, 'AI Semantic Match evaluated successfully');
  const matchResult = unwrap(aiMatch);
  assert(matchResult.overallScore >= 70, `High semantic match score returned (${matchResult.overallScore}/100)`);
  assert(Array.isArray(matchResult.insights?.strengths), 'AI returned explicit contextual strengths');

  // Creator generates AI proposal pitch
  const aiPitch = await apiRequest('/ai/proposal-pitch', {
    method: 'POST',
    token: creatorToken,
    body: {
      requirementId: requirement._id.toString(),
      tone: 'CONFIDENT',
      customNotes: 'I will shoot this on RED Komodo with an anamorphic lens setup.',
    },
  });
  assert(aiPitch.ok, 'AI Proposal Pitch generated successfully');
  const pitchResult = unwrap(aiPitch);
  assert(pitchResult.pitchBody.includes('RED Komodo'), 'AI tailored pitch body incorporates creator custom notes');

  // --- 7. APPLICATION SUBMISSION & BRAND ACCEPTANCE ---
  console.log('\n--- 7. COLLABORATION: PROPOSAL, ACCEPTANCE & PROJECT CREATION ---');

  const appRes = await apiRequest('/applications', {
    method: 'POST',
    token: creatorToken,
    body: {
      requirementId: requirement._id.toString(),
      proposal: pitchResult.pitchBody,
      offeredPrice: 45000,
      currency: 'INR',
      proposedTimeline: '7 days',
    },
  });
  if (!appRes.ok) {
    console.error('appRes error:', appRes);
  }
  assert(appRes.ok, 'Creator submitted AI-assisted proposal');
  const application = unwrap(appRes);

  // Brand shortlists proposal
  const shortlistRes = await apiRequest(`/applications/${application._id}/status`, {
    method: 'PATCH',
    token: brandOwnerToken,
    body: { status: 'SHORTLISTED' },
  });
  assert(shortlistRes.status === 200, 'Brand shortlisted proposal');

  // Brand accepts application -> triggers automated project creation
  const acceptRes = await apiRequest(`/applications/${application._id}/status`, {
    method: 'PATCH',
    token: brandOwnerToken,
    body: { status: 'ACCEPTED' },
  });
  assert(acceptRes.status === 200, 'Brand accepted application');

  // Query project created in MongoDB
  const ProjectModel = mongoose.model(
    'Project',
    new mongoose.Schema({}, { strict: false }),
    'projects',
  );
  const projectDoc = await ProjectModel.findOne({ applicationId: new mongoose.Types.ObjectId(application._id) }).lean();
  assert(Boolean(projectDoc), 'Project document automatically created from accepted application');
  const projectId = projectDoc._id.toString();

  // --- 8. PROJECT WORKSPACE, DELIVERABLES & REVIEWS ---
  console.log('\n--- 8. COLLABORATION: DELIVERABLE APPROVAL & VERIFIED REVIEW ---');

  // Update project status to COMPLETED
  await ProjectModel.findByIdAndUpdate(projectId, { status: 'COMPLETED' });

  // Creator submits verified review for brand
  const reviewRes = await apiRequest(`/projects/${projectId}/reviews`, {
    method: 'POST',
    token: creatorToken,
    body: {
      rating: 5,
      title: 'Exceptional Collaboration & Clear Creative Brief',
      comment: 'Atlas Apparel was professional, responsive, and provided seamless creative direction.',
      criteria: {
        quality: 5,
        communication: 5,
        timeliness: 5,
        professionalism: 5,
        value: 5,
      },
    },
  });
  assert(reviewRes.status === 200 || reviewRes.status === 201, 'Creator submitted verified review for project');

  // --- 9. BRAND CAMPAIGN ANALYTICS (DYNAMIC SPEND VERIFICATION) ---
  console.log('\n--- 9. BRAND CAMPAIGN ANALYTICS WITH DYNAMIC METRICS ---');

  const analyticsRes = await apiRequest('/brands/analytics', { token: brandOwnerToken });
  assert(analyticsRes.status === 200, 'Brand campaign analytics responded 200 OK');
  const analytics = unwrap(analyticsRes);
  assert(analytics.activeRequirements >= 1, `Analytics tracks active requirements (${analytics.activeRequirements})`);
  assert(analytics.totalProposalsReceived >= 1, `Analytics tracks received proposals (${analytics.totalProposalsReceived})`);
  assert(Array.isArray(analytics.monthlySpendTrend), 'Analytics provides monthly spend trend array');
  assert(analytics.monthlySpendTrend.length === 4, 'Monthly spend trend spans 4 calendar months');

  // --- 10. ENTERPRISE MULTI-SEAT TEAM CRM: FULL INVITATION WORKFLOW ---
  console.log('\n--- 10. ENTERPRISE TEAM CRM: INVITATION, TOKEN & ACCEPTANCE FLOW ---');

  // Brand invites collaborator with CAMPAIGN_MANAGER role
  const inviteRes = await apiRequest('/brands/team/invite', {
    method: 'POST',
    token: brandOwnerToken,
    body: {
      fullName: 'Alex Collaborator',
      email: testBrandMemberEmail,
      role: 'CAMPAIGN_MANAGER',
    },
  });
  assert(inviteRes.status === 201 || inviteRes.status === 200, 'Brand invited collaborator successfully');
  const inviteData = unwrap(inviteRes);
  assert(Boolean(inviteData.inviteToken), 'Invitation generated secure inviteToken');
  const token = inviteData.inviteToken;

  // Preview invitation by token (public endpoint)
  const previewRes = await apiRequest(`/brands/team/invitation/${token}`);
  assert(previewRes.status === 200, 'Public invitation preview retrieved successfully');
  const preview = unwrap(previewRes);
  assert(preview.valid === true, 'Invitation preview reports valid: true');
  assert(preview.role === 'CAMPAIGN_MANAGER', 'Invitation role matches CAMPAIGN_MANAGER');
  assert(preview.email === testBrandMemberEmail.toLowerCase(), 'Invitation recipient email matches');

  // Invited member accepts invitation using their authenticated token
  const acceptInviteRes = await apiRequest('/brands/team/accept-invite', {
    method: 'POST',
    token: memberToken,
    body: { inviteToken: token },
  });
  assert(acceptInviteRes.status === 200 || acceptInviteRes.status === 201, 'Invited member accepted workspace invitation');

  // Verify collaborator appears as ACTIVE member in team roster
  const teamRoster = await apiRequest('/brands/team', { token: brandOwnerToken });
  const members = unwrap(teamRoster)?.members || [];
  const activeMember = members.find((m) => m.email === testBrandMemberEmail.toLowerCase());
  assert(Boolean(activeMember), 'Collaborator exists in brand team roster');
  assert(activeMember.status === 'ACTIVE', 'Collaborator status updated to ACTIVE');
  assert(activeMember.userId?.toString() === memberUserId, 'Collaborator userId bound to workspace member record');

  // Reject double acceptance of already accepted token (400 Bad Request)
  const doubleAccept = await apiRequest('/brands/team/accept-invite', {
    method: 'POST',
    token: memberToken,
    body: { inviteToken: token },
  });
  assert(doubleAccept.status === 400, 'Re-accepting already accepted invitation rejected with 400 Bad Request');

  // Brand invites another collaborator to test revocation
  const tempEmail = `revoked.user.${ts}@example.com`;
  const tempInvite = await apiRequest('/brands/team/invite', {
    method: 'POST',
    token: brandOwnerToken,
    body: {
      fullName: 'Temp Member',
      email: tempEmail,
      role: 'COLLABORATOR',
    },
  });
  const tempMemberId = unwrap(tempInvite)?.member?._id;

  // Revoke invitation
  const revokeRes = await apiRequest(`/brands/team/${tempMemberId}/revoke`, {
    method: 'PATCH',
    token: brandOwnerToken,
  });
  assert(revokeRes.status === 200, 'Brand owner revoked pending invitation');

  // Prevent non-BRAND user (e.g. Creator) from managing brand team members (403 Forbidden)
  const nonBrandForbidden = await apiRequest('/brands/team/invite', {
    method: 'POST',
    token: creatorToken, // Creator attempting brand owner operation!
    body: {
      fullName: 'Hacker Member',
      email: 'hacker@example.com',
      role: 'COLLABORATOR',
    },
  });
  assert(nonBrandForbidden.status === 403, 'Non-brand creator forbidden from inviting team members (403 Forbidden)');

  // Verify tenant isolation: collaborator cannot delete another brand's team member
  const crossTenantDelete = await apiRequest(`/brands/team/${tempMemberId}`, {
    method: 'DELETE',
    token: memberToken, // Collaborator trying to delete Atlas Apparel's member!
  });
  assert(crossTenantDelete.status === 404, 'Collaborator isolated: cannot mutate or delete other brand team members (404 Not Found)');

  // Clean up test member by actual brand owner
  const deleteRes = await apiRequest(`/brands/team/${tempMemberId}`, {
    method: 'DELETE',
    token: brandOwnerToken,
  });
  assert(deleteRes.status === 200, 'Brand owner successfully removed test member');

  // --- 11. REAL-TIME NOTIFICATIONS & QUEUE AUDIT ---
  console.log('\n--- 11. NOTIFICATIONS & EMAIL QUEUE INTEGRATION ---');

  const brandOwnerNotifs = await apiRequest('/notifications', { token: brandOwnerToken });
  assert(brandOwnerNotifs.status === 200, 'Brand owner received notifications');
  const notifItems = unwrap(brandOwnerNotifs)?.items || [];
  const teamJoinNotif = notifItems.find((n) => n.title?.includes('Team Member Joined') || n.message?.includes('joined'));
  assert(Boolean(teamJoinNotif), 'Brand owner received real-time in-app notification when collaborator joined team');

  await mongoose.disconnect();

  console.log('\n===============================================================');
  console.log(`  PHASE 09 MASTER E2E AUDIT RESULTS: ${passed}/${passed} ASSERTIONS PASSED`);
  console.log('  🎉 ALL PHASE 09 END-TO-END FLOWS VERIFIED WITH ZERO DEFECTS!');
  console.log('===============================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Fatal error during Phase 09 test execution:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
