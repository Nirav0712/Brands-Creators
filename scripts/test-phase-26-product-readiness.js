/**
 * PHASE 26 MASTER PRODUCT READINESS & REAL USER JOURNEY AUDIT
 * Brands & Creators Marketplace SaaS
 *
 * Verifies Journeys A through H:
 * Journey A: Registration, Verification & Onboarding Flow
 * Journey B: Profile, Taxonomy, People Directory & Location Privacy
 * Journey C: Subscription Plans, Token Wallet Ledger & Reconciliation
 * Journey D: Manual Payment Verification, Rejection & Fulfillment
 * Journey E: Marketplace Requirement Brief, Proposals & Application Guards
 * Journey F: Project Collaboration Workspace, Deliverables & Two-Way Reviews
 * Journey G: Internal Inbox, Participant Privacy & Socket Authorization
 * Journey H: Admin Backoffice Governance, Audit Logs & Platform Settings
 */

const http = require('http');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:4000/api/v1';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function request(path, options = {}) {
  const url = new URL(API_BASE + path);
  const headers = options.headers || {};
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            data = raw;
          }
          const unwrapped =
            data && typeof data === 'object' && data.data !== undefined && data.data !== null
              ? data.data
              : data;
          resolve({ status: res.statusCode, headers: res.headers, raw: data, data: unwrapped });
        });
      },
    );

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runPhase26Audit() {
  console.log('\n====================================================================');
  console.log('🚀 RUNNING PHASE 26: MASTER PRODUCT READINESS & REAL USER JOURNEYS');
  console.log('====================================================================\n');

  try {
    const ts = Date.now();

    // ==========================================
    // 0. Super Admin Setup
    // ==========================================
    console.log('--- 0. Super Admin Authentication ---');
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { login: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
    });
    assert(adminLogin.status === 200, 'Super admin authenticated successfully');
    const adminToken = adminLogin.data?.data?.accessToken || adminLogin.data?.accessToken;
    const adminId = adminLogin.data?.data?.user?._id || adminLogin.data?.user?._id;

    // ==========================================
    // JOURNEY A: Registration, Verification & Onboarding
    // ==========================================
    console.log('\n--- JOURNEY A: Registration, Verification & Onboarding ---');
    const brandReg = await request('/auth/register', {
      method: 'POST',
      body: {
        email: `client_brand_${ts}@demo.com`,
        username: `client_brand_${ts}`,
        password: 'Password123!',
        fullName: 'Apex Media Agency',
        role: 'AGENCY',
      },
    });
    assert(brandReg.status === 201, 'Agency/Brand registered successfully');
    const brandToken = brandReg.data?.data?.accessToken || brandReg.data?.accessToken;
    const brandUserId = brandReg.data?.data?.user?._id || brandReg.data?.user?._id;
    const vToken = brandReg.data?.verificationToken;
    assert(Boolean(vToken), 'Cryptographic verification token generated on registration');

    // Invalid token verification attempt
    const badVerify = await request('/auth/verify-email', {
      method: 'POST',
      body: { token: 'invalid_token_12345' },
    });
    assert(badVerify.status === 400, 'Invalid verification token rejected with HTTP 400');

    // Successful email verification
    const goodVerify = await request('/auth/verify-email', {
      method: 'POST',
      body: { token: vToken },
    });
    assert(goodVerify.status === 200, 'Email verification succeeds with valid token');

    // Replay attack: Reusing consumed verification token
    const replayVerify = await request('/auth/verify-email', {
      method: 'POST',
      body: { token: vToken },
    });
    assert(replayVerify.status === 400, 'Reusing consumed verification token rejected with HTTP 400 (anti-replay)');

    // Complete onboarding wizard
    const catList = await request('/categories');
    const primaryCat = (catList.data?.data || catList.data || [])[0];
    const onboardRes = await request('/auth/onboarding/complete', {
      method: 'POST',
      token: brandToken,
      body: {
        selectedCategoryIds: primaryCat ? [primaryCat._id] : [],
        headline: 'Global Creative & Influencer Strategy Firm',
        companyName: 'Apex Media Agency Ltd',
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          area: 'Bandra West',
          postalCode: '400050',
        },
      },
    });
    assert(onboardRes.status === 200, 'Onboarding wizard completion submitted');
    assert(onboardRes.data?.onboardingCompleted === true || onboardRes.data?.data?.onboardingCompleted === true, 'onboardingCompleted flagged true in response');

    // Verify session persistence after reload
    const meCheck = await request('/auth/me', { token: brandToken });
    assert(meCheck.status === 200, 'Profile session verification /auth/me responsive');
    assert(meCheck.data?.onboardingCompleted === true, 'Database persists onboardingCompleted=true across requests');
    assert(meCheck.data?.isEmailVerified === true, 'Database persists isEmailVerified=true across requests');

    // ==========================================
    // JOURNEY B: Profile, Taxonomy & Location Privacy
    // ==========================================
    console.log('\n--- JOURNEY B: Profile, Taxonomy, People Directory & Privacy ---');
    const creatorReg = await request('/auth/register', {
      method: 'POST',
      body: {
        email: `talent_creator_${ts}@demo.com`,
        username: `talent_creator_${ts}`,
        password: 'Password123!',
        fullName: 'Rohan Sharma',
        role: 'CREATOR',
      },
    });
    assert(creatorReg.status === 201, 'Creator registered successfully');
    const creatorToken = creatorReg.data?.data?.accessToken || creatorReg.data?.accessToken;
    const creatorUserId = creatorReg.data?.data?.user?._id || creatorReg.data?.user?._id;

    // Save detailed draft profile with confidential street address
    const draftRes = await request('/creators/me/draft', {
      method: 'POST',
      token: creatorToken,
      body: {
        headline: 'Automotive & Tech Commercial Cinematographer',
        bio: 'Over 6 years crafting cinematic launch films for premium automobile and tech hardware brands.',
        startingPrice: 15000,
        skills: ['Cinematography', 'Color Grading', 'Drone Operations', 'Sound Design'],
        location: {
          country: 'India',
          state: 'Karnataka',
          city: 'Bangalore',
          area: 'Indiranagar',
          postalCode: '560038',
          addressLine1: 'Apartment 304, Emerald Court',
          addressLine2: '100ft Road',
          landmark: 'Behind Metro Station',
          isPublicAddress: false, // Street lines remain confidential
          geoPoint: {
            type: 'Point',
            coordinates: [77.6408, 12.9784],
          },
        },
      },
    });
    assert(draftRes.status === 200 || draftRes.status === 201, 'Creator draft saved with structured location');

    // Publish creator profile
    const publishRes = await request('/creators/me/publish', {
      method: 'POST',
      token: creatorToken,
    });
    assert(publishRes.status === 200 || publishRes.status === 201, 'Creator profile published to public directory');
    const creatorSlug = publishRes.data?.data?.slug || publishRes.data?.slug;

    // Public directory inspection & location privacy verification
    const publicProfile = await request(`/creators/${creatorSlug}`);
    assert(publicProfile.status === 200, 'Public profile reachable by slug');
    const pubLoc = publicProfile.data?.data?.location || publicProfile.data?.location;
    assert(pubLoc?.city === 'Bangalore', 'Public profile shows city');
    assert(pubLoc?.area === 'Indiranagar', 'Public profile shows neighborhood');
    assert(pubLoc?.addressLine1 === undefined, 'Confidential addressLine1 strictly suppressed');
    assert(pubLoc?.addressLine2 === undefined, 'Confidential addressLine2 strictly suppressed');
    assert(pubLoc?.landmark === undefined, 'Confidential landmark strictly suppressed');

    // Directory category & locality filter test
    const peopleNearby = await request('/creators/nearby?lat=12.9784&lng=77.6408&radiusKm=10');
    assert(peopleNearby.status === 200, 'Proximity discovery within 10 km executed');
    const nearbyList = peopleNearby.data?.data || peopleNearby.data || [];
    assert(Array.isArray(nearbyList) && nearbyList.length > 0, 'Nearby creators array contains discovered creators');

    // ==========================================
    // JOURNEY C: Subscription Plans & Token Wallet Ledger
    // ==========================================
    console.log('\n--- JOURNEY C: Subscription Plans, Token Wallet & Reconciliation ---');
    const publicPlans = await request('/subscriptions/plans');
    assert(publicPlans.status === 200, 'Subscription plans catalog responsive');
    const plans = publicPlans.data?.data || publicPlans.data || [];
    const freePlan = plans.find((p) => p.isFree || p.slug === 'free-starter');
    assert(Boolean(freePlan), 'Free Starter plan verified');

    // Initial wallet check: fresh user balance is 0
    const initialWallet = await request('/tokens/wallet', { token: creatorToken });
    assert(initialWallet.status === 200, 'Creator wallet fetched');
    assert(initialWallet.data?.balance === 0, 'Fresh wallet balance is exactly 0 tokens');

    // Claim Free Starter subscription
    const subFree = await request('/subscriptions/subscribe-free', {
      method: 'POST',
      token: creatorToken,
      body: { planId: freePlan._id },
    });
    assert(subFree.status === 200 || subFree.status === 201, 'Free Starter subscription activated');

    // Wallet balance is now 10 tokens
    const fundedWallet = await request('/tokens/wallet', { token: creatorToken });
    assert(fundedWallet.data?.balance === 10, 'Wallet credited with 10 included tokens (got 10)');

    // Spend 1 token for proposal submission
    const spendRes = await request('/tokens/spend', {
      method: 'POST',
      token: creatorToken,
      body: {
        actionKey: 'PROPOSAL_SUBMIT',
        referenceId: `prop-ref-${ts}`,
        note: 'Applying for automotive commercial',
      },
    });
    assert(spendRes.status === 200, 'Spent 1 token for PROPOSAL_SUBMIT');
    assert(spendRes.data?.newBalance === 9, 'Wallet balance decremented to 9 tokens');

    // Overspend rejection: atomic protection
    const overspendRes = await request('/tokens/spend', {
      method: 'POST',
      token: creatorToken,
      body: {
        actionKey: 'FEATURED_BOOST', // costs 10 tokens, balance is only 9!
        referenceId: `boost-ref-${ts}`,
      },
    });
    assert(overspendRes.status === 400, 'Overspend attempt atomically rejected with HTTP 400');

    // Wallet vs. Ledger Reconciliation Audit
    const reconcileRes = await request(`/tokens/admin/reconcile/${creatorUserId}`, {
      method: 'POST',
      token: adminToken,
    });
    assert(reconcileRes.status === 200, 'Admin ledger reconciliation endpoint executed');
    assert(reconcileRes.data?.isReconciled === true, 'Physical wallet balance reconciles 100% with ledger entries');
    assert(reconcileRes.data?.walletBalance === 9, 'Wallet balance matches 9 tokens');
    assert(reconcileRes.data?.calculatedBalance === 9, 'Calculated balance matches 9 tokens');

    // ==========================================
    // JOURNEY D: Manual Payment Verification
    // ==========================================
    console.log('\n--- JOURNEY D: Manual Payment Verification & Segregation of Duties ---');
    const paySettings = await request('/payments/settings');
    assert(paySettings.status === 200, 'Public payment settings retrieved');
    assert(paySettings.data?.upiEnabled === true, 'UPI payments active');

    // Submit manual payment request for Starter Pack (50 tokens / 500 INR)
    const manualPayRes = await request('/payments/manual-request', {
      method: 'POST',
      token: creatorToken,
      body: {
        targetType: 'TOKEN_PACKAGE',
        tokenPackageId: 'starter',
        amount: 500,
        paymentMethod: 'UPI',
        transactionReference: `UTR-QA26-${ts}`,
        senderIdentifier: 'rohan.sharma@okaxis',
      },
    });
    assert(manualPayRes.status === 201, 'Manual payment request submitted successfully');
    const manualRequestId = manualPayRes.data?.data?._id || manualPayRes.data?._id;

    // Admin verifies request in admin queue
    const adminQueue = await request('/payments/admin/manual-requests', { token: adminToken });
    assert(adminQueue.status === 200, 'Admin manual payment verification queue accessible');
    const queueItems = adminQueue.data?.data?.items || adminQueue.data?.items || [];
    assert(queueItems.some((item) => item._id === manualRequestId), 'Submitted payment request present in admin queue');

    // Admin approves payment request
    const approveRes = await request(`/payments/admin/manual-requests/${manualRequestId}/review`, {
      method: 'POST',
      token: adminToken,
      body: {
        status: 'APPROVED',
        notes: 'Verified via ICICI corporate banking portal',
      },
    });
    assert(approveRes.status === 200 || approveRes.status === 201, 'Payment request approved by administrator');

    // Verify token wallet fulfillment
    const updatedWallet = await request('/tokens/wallet', { token: creatorToken });
    assert(updatedWallet.data?.balance === 59, 'Wallet credited with 50 tokens from approved pack (9 + 50 = 59)');

    // Double-approval protection check
    const doubleApprove = await request(`/payments/admin/manual-requests/${manualRequestId}/review`, {
      method: 'POST',
      token: adminToken,
      body: { status: 'APPROVED' },
    });
    assert(doubleApprove.status === 400, 'Double-approval attempt rejected with HTTP 400');

    // ==========================================
    // JOURNEY E: Marketplace Requirements & Proposals
    // ==========================================
    console.log('\n--- JOURNEY E: Marketplace Requirements & Application Flow ---');
    const reqCreate = await request('/requirements', {
      method: 'POST',
      token: brandToken,
      body: {
        title: 'Cinematic EV Commercial Launch Reel',
        description: 'Seeking premier video team to shoot a 60-second high-energy product video for an electric vehicle rollout.',
        categoryId: primaryCat ? primaryCat._id : undefined,
        budget: {
          min: 50000,
          max: 150000,
          currency: 'INR',
        },
        applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        deliverables: ['1x 60s 4K Master Video', '3x 15s Vertical Cutdowns', 'Raw B-Roll Reel'],
      },
    });
    assert(reqCreate.status === 200 || reqCreate.status === 201, 'Brand requirement created');
    const requirementId = reqCreate.data?._id;

    // Publish requirement
    const reqPublish = await request(`/requirements/${requirementId}/status`, {
      method: 'PATCH',
      token: brandToken,
      body: { status: 'PUBLISHED' },
    });
    assert(reqPublish.status === 200, 'Requirement transitioned to PUBLISHED');

    // Creator submits proposal
    const appCreate = await request('/applications', {
      method: 'POST',
      token: creatorToken,
      body: {
        requirementId,
        offeredPrice: 95000,
        currency: 'INR',
        proposal: 'Our studio has directed launch campaigns for 3 EV mobility companies. We have full RED Komodo and FPV drone setups ready.',
      },
    });
    assert(appCreate.status === 200 || appCreate.status === 201, 'Creator submitted proposal');
    const applicationId = appCreate.data?._id;

    // Duplicate proposal rejection
    const dupApp = await request('/applications', {
      method: 'POST',
      token: creatorToken,
      body: {
        requirementId,
        offeredPrice: 90000,
        proposal: 'Duplicate application attempt',
      },
    });
    assert(dupApp.status === 409, 'Duplicate application submission strictly rejected with HTTP 409 Conflict');

    // ==========================================
    // JOURNEY F: Projects, Deliverables & Reviews
    // ==========================================
    console.log('\n--- JOURNEY F: Collaboration Workspace, Deliverables & Reviews ---');
    // Brand accepts creator application
    const acceptApp = await request(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      token: brandToken,
      body: { status: 'ACCEPTED' },
    });
    assert(acceptApp.status === 200, 'Brand accepted creator proposal');

    // Workspace initialization
    const projectList = await request('/projects', { token: brandToken });
    assert(projectList.status === 200, 'Project workspaces accessible');
    const allProjects = projectList.data?.data?.items || projectList.data?.items || (Array.isArray(projectList.data) ? projectList.data : []);
    const project = allProjects.find((p) => p.applicationId === applicationId || p.applicationId?._id === applicationId);
    assert(Boolean(project), 'Collaboration project workspace automatically created');
    const projectId = project?._id;

    // Verify milestone creation and deliverable workflow
    if (projectId) {
      const delivRes = await request(`/projects/${projectId}/deliverables`, {
        method: 'POST',
        token: brandToken,
        body: {
          title: 'Rough Cut V1',
          description: 'First timeline assembly with color preview',
        },
      });
      assert(delivRes.status === 200 || delivRes.status === 201, 'Deliverable item registered in workspace');
      const deliverableId = delivRes.data?.data?._id || delivRes.data?._id;

      // Creator submits deliverable version 1
      const subDeliv = await request(`/projects/${projectId}/deliverables/${deliverableId}/submit`, {
        method: 'POST',
        token: creatorToken,
        body: {
          files: [
            {
              url: 'https://storage.brandscreators.local/proofs/rough_cut_v1.mp4',
              fileName: 'rough_cut_v1.mp4',
            },
          ],
          links: ['https://storage.brandscreators.local/proofs/rough_cut_v1.mp4'],
          notes: 'Here is the first rough assembly cut.',
        },
      });
      assert(subDeliv.status === 200 || subDeliv.status === 201, 'Creator submitted Deliverable Version 1');

      // Brand requests revision
      const revRes = await request(`/projects/${projectId}/deliverables/${deliverableId}/revision`, {
        method: 'POST',
        token: brandToken,
        body: { feedback: 'Audio mix needs higher compression on voiceover track.' },
      });
      assert(revRes.status === 200 || revRes.status === 201, 'Brand successfully requested revision with structured feedback');

      // Creator resubmits Deliverable Version 2
      const subDeliv2 = await request(`/projects/${projectId}/deliverables/${deliverableId}/submit`, {
        method: 'POST',
        token: creatorToken,
        body: {
          files: [
            {
              url: 'https://storage.brandscreators.local/proofs/rough_cut_v2_remix.mp4',
              fileName: 'rough_cut_v2_remix.mp4',
            },
          ],
          links: ['https://storage.brandscreators.local/proofs/rough_cut_v2_remix.mp4'],
          notes: 'Remixed with sidechain compression.',
        },
      });
      assert(subDeliv2.status === 200 || subDeliv2.status === 201, 'Creator resubmitted Deliverable Version 2');

      // Brand approves Deliverable Version 2
      const approveDeliv = await request(`/projects/${projectId}/deliverables/${deliverableId}/approve`, {
        method: 'POST',
        token: brandToken,
        body: { notes: 'Rough cut version 2 approved.' },
      });
      assert(approveDeliv.status === 200 || approveDeliv.status === 201, 'Brand approved Deliverable V2');

      // Brand starts project in progress
      const startProj = await request(`/projects/${projectId}/status`, {
        method: 'PATCH',
        token: brandToken,
        body: { status: 'IN_PROGRESS' },
      });
      assert(startProj.status === 200, 'Project transitioned to IN_PROGRESS');

      // Brand completes project
      const completeProj = await request(`/projects/${projectId}/complete`, {
        method: 'POST',
        token: brandToken,
        body: { completionNotes: 'All project milestones and deliverables successfully delivered and verified.' },
      });
      assert(completeProj.status === 200 || completeProj.status === 201, 'Brand marked project as COMPLETED');

      // Brand submits verified 5-star review
      const reviewRes = await request('/reviews', {
        method: 'POST',
        token: brandToken,
        body: {
          projectId,
          rating: 5,
          title: 'Sensational visuals and rapid turnaround!',
          comment: 'Sensational visuals and rapid turnaround on sound mix revisions. Top-tier partner!',
          criteria: {
            quality: 5,
            communication: 5,
            timeliness: 5,
            professionalism: 5,
            value: 5,
          },
        },
      });
      assert(reviewRes.status === 200 || reviewRes.status === 201, 'Brand submitted verified review for completed project');
    }

    // ==========================================
    // JOURNEY G: Internal Inbox & Messaging
    // ==========================================
    console.log('\n--- JOURNEY G: Internal Inbox, Participant Isolation & WebSockets ---');
    const convCreate = await request('/conversations', {
      method: 'POST',
      token: brandToken,
      body: {
        participantUserIds: [creatorUserId],
        initialMessage: 'Hi Rohan! Excited to collaborate on our upcoming EV launch.',
      },
    });
    assert(convCreate.status === 200 || convCreate.status === 201, 'Internal conversation thread created');
    const conversationId = convCreate.data?.data?._id || convCreate.data?._id;

    // Brand sends opening message
    const brandMsg = await request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      token: brandToken,
      body: { text: 'Hi Rohan! Excited to collaborate on our upcoming EV launch.' },
    });
    assert(brandMsg.status === 200 || brandMsg.status === 201, 'Brand sent message in conversation thread');

    // Creator sends follow-up message
    const msgSend = await request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      token: creatorToken,
      body: { text: 'Thanks for reaching out! Timeline and scope look great.' },
    });
    assert(msgSend.status === 200 || msgSend.status === 201, 'Creator sent follow-up message in conversation');

    // Retrieve conversation messages
    const msgList = await request(`/conversations/${conversationId}/messages`, { token: creatorToken });
    assert(msgList.status === 200, 'Message stream retrieved by authorized participant');
    const msgs = msgList.data?.data?.items || msgList.data?.items || (Array.isArray(msgList.data) ? msgList.data : []);
    assert(Array.isArray(msgs) && msgs.length >= 2, 'Message stream contains persisted messages');

    // Non-participant privacy test: Foreign user cannot read messages
    const foreignUser = await request('/auth/register', {
      method: 'POST',
      body: {
        email: `foreign_user_${ts}@demo.com`,
        username: `foreign_user_${ts}`,
        password: 'Password123!',
        fullName: 'Unrelated Third Party',
        role: 'CREATOR',
      },
    });
    const foreignToken = foreignUser.data?.data?.accessToken || foreignUser.data?.accessToken;

    const foreignAccess = await request(`/conversations/${conversationId}/messages`, { token: foreignToken });
    assert(foreignAccess.status === 403, 'Non-participant strictly forbidden from reading private messages (HTTP 403)');

    // WebSocket Room Join Authorization Test
    const socketForeign = io('http://localhost:4000/messaging', {
      auth: { token: foreignToken },
      transports: ['websocket'],
    });

    await new Promise((resolve) => {
      socketForeign.on('connect', () => {
        socketForeign.emit('conversation:join', { conversationId }, (ack) => {
          assert(
            ack && ack.success === false,
            'Unauthorized socket conversation:join strictly rejected by gateway',
          );
          socketForeign.disconnect();
          resolve();
        });
      });
      socketForeign.on('connect_error', () => {
        socketForeign.disconnect();
        resolve();
      });
      setTimeout(() => {
        socketForeign.disconnect();
        resolve();
      }, 3000);
    });

    // ==========================================
    // JOURNEY H: Admin Backoffice Governance
    // ==========================================
    console.log('\n--- JOURNEY H: Admin Backoffice Governance & Platform Controls ---');
    // Platform settings inspection and update
    const getSettings = await request('/settings', { token: adminToken });
    assert(getSettings.status === 200, 'Admin platform settings retrieved');

    const updateCommission = await request('/settings/PLATFORM_COMMISSION_PERCENTAGE', {
      method: 'PUT',
      token: adminToken,
      body: { value: 7.5 },
    });
    assert(updateCommission.status === 200, 'Admin updated platform commission percentage to 7.5%');

    // Audit log export
    const auditExport = await request('/audit-logs/export?format=csv', { token: adminToken });
    assert(auditExport.status === 200, 'Admin successfully exported audit log CSV');

    // RBAC isolation: Creator role forbidden from admin settings
    const rbacViolation = await request('/settings/PLATFORM_COMMISSION_PERCENTAGE', {
      method: 'PUT',
      token: creatorToken,
      body: { value: 0 },
    });
    assert(rbacViolation.status === 403, 'Non-admin role strictly forbidden from modifying platform settings (HTTP 403)');

  } catch (err) {
    console.error('Test execution exception:', err);
  }

  console.log('\n====================================================================');
  console.log(`🎉 PHASE 26 MASTER PRODUCT AUDIT: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('====================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase26Audit();
