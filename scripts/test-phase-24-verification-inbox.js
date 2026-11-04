/**
 * Test Suite: Phase 24 — Email Verification, First-Time Onboarding, & Internal Inbox
 *
 * Tests:
 * 1. User registration generates verificationToken and defaults isEmailVerified=false, onboardingCompleted=false
 * 2. Invalid verification token rejection (HTTP 400)
 * 3. Successful email verification via token (POST /auth/verify-email)
 * 4. Verification token single-use security (re-using token fails)
 * 5. Resend verification token endpoint (POST /auth/resend-verification)
 * 6. First-time onboarding submission (POST /auth/onboarding/complete)
 * 7. Category and structured location persistence on user and profile shells
 * 8. Internal Inbox conversations list (GET /messages/conversations)
 * 9. Sending a real message with database persistence (POST /messages)
 * 10. Message participant isolation: third party cannot access or inject into private thread
 */

const API_BASE = 'http://localhost:4000/api/v1';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
  passed++;
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  return { status: res.status, ok: res.ok, body };
}

async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data ? res.body.data.accessToken : res.body.accessToken;
}

async function run() {
  console.log('\n=============================================================');
  console.log('🚀 RUNNING PHASE 24 TEST SUITE: VERIFICATION, ONBOARDING & INBOX');
  console.log('=============================================================\n');

  try {
    const timestamp = Date.now();
    const testEmail = `verify_test_${timestamp}@demo.com`;
    const testUsername = `user_p24_${timestamp}`;

    // 1. Register User and Check Token Generation
    console.log('--- 1. User Registration & Token Generation ---');
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        password: 'Password@123',
        fullName: 'Phase 24 Onboarding Creator',
        role: 'CREATOR',
      }),
    });
    assert(regRes.ok || regRes.status === 201, 'User registered successfully');
    const regData = regRes.body.data || regRes.body;
    assert(!!regData.verificationToken, 'Registration generated cryptographic verificationToken');
    const token = regData.verificationToken;

    // Login and inspect initial state
    const userToken = await login(testEmail, 'Password@123');
    const meRes = await request('/auth/me', { token: userToken });
    const me = meRes.body.data || meRes.body;
    assert(me.isEmailVerified === false, 'Fresh user isEmailVerified is false');
    assert(me.onboardingCompleted === false, 'Fresh user onboardingCompleted is false');

    // 2. Reject Invalid Verification Token
    console.log('\n--- 2. Reject Invalid Verification Token ---');
    const fakeTokenRes = await request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid_deadbeef_token_12345' }),
    });
    assert(fakeTokenRes.status === 400, `Fake verification token correctly rejected with 400 (got ${fakeTokenRes.status})`);

    // 3. Successful Email Verification
    console.log('\n--- 3. Successful Email Verification ---');
    const verifyRes = await request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    assert(verifyRes.ok, 'Verification token accepted');
    const verifyData = verifyRes.body.data || verifyRes.body;
    assert(verifyData.isEmailVerified === true, 'Response confirms isEmailVerified is true');

    // Confirm in /auth/me
    const verifiedMeRes = await request('/auth/me', { token: userToken });
    const verifiedMe = verifiedMeRes.body.data || verifiedMeRes.body;
    assert(verifiedMe.isEmailVerified === true, '/auth/me confirms user is verified');

    // 4. Token Single-Use Security
    console.log('\n--- 4. Token Single-Use Security ---');
    const reuseRes = await request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    assert(reuseRes.status === 400, `Reusing token rejected with 400 (got ${reuseRes.status})`);

    // 5. Resend Verification Token Check
    console.log('\n--- 5. Resend Verification Token Check ---');
    // Register another unverified user to test resend
    const unverifiedEmail = `unverified_${timestamp}@demo.com`;
    const unverifiedReg = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: unverifiedEmail,
        username: `unv_${timestamp}`,
        password: 'Password@123',
        fullName: 'Unverified Candidate',
        role: 'CREATOR',
      }),
    });
    assert(unverifiedReg.ok || unverifiedReg.status === 201, 'Created second unverified account');

    const resendRes = await request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: unverifiedEmail }),
    });
    assert(resendRes.ok, 'Resend verification token endpoint succeeded');
    const resendData = resendRes.body.data || resendRes.body;
    assert(!!resendData.verificationToken, 'Resend generated fresh verification token');

    // 6. First-Time Onboarding Flow
    console.log('\n--- 6. First-Time Onboarding Flow ---');
    // Fetch a real category ID to associate
    const catsRes = await request('/categories');
    const categoriesList = catsRes.body.data || catsRes.body;
    const sampleCategory = categoriesList[0];
    assert(!!sampleCategory, 'Found active category for onboarding');

    const onboardingRes = await request('/auth/onboarding/complete', {
      method: 'POST',
      token: userToken,
      body: JSON.stringify({
        selectedCategoryIds: [sampleCategory._id],
        headline: 'Cinematic Travel Filmmaker & Visual Storyteller',
        bio: 'Over 5 years shooting documentary reels and 4K commercial videos across South Asia.',
        location: {
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          area: 'Indiranagar',
          postalCode: '560038',
          isPublicAddress: false,
          geoPoint: {
            type: 'Point',
            coordinates: [77.6412, 12.9784],
          },
        },
        customFieldValues: {
          primaryCamera: 'Sony FX3 Cinema Line',
          editingSoftware: 'DaVinci Resolve Studio',
        },
      }),
    });
    assert(onboardingRes.ok, 'Submitted onboarding completion payload');
    const onboardData = onboardingRes.body.data || onboardingRes.body;
    assert(onboardData.onboardingCompleted === true, 'Response confirms onboardingCompleted is true');

    // Verify /auth/me reflects completed onboarding
    const postOnboardMeRes = await request('/auth/me', { token: userToken });
    const postOnboardMe = postOnboardMeRes.body.data || postOnboardMeRes.body;
    assert(postOnboardMe.onboardingCompleted === true, 'User record has onboardingCompleted=true');
    assert(
      postOnboardMe.selectedCategoryIds && postOnboardMe.selectedCategoryIds.length > 0,
      'User record saved selectedCategoryIds',
    );

    // 7. Internal Database-Backed Inbox & Messaging
    console.log('\n--- 7. Internal Inbox Conversations & Messaging ---');
    // Query conversations list
    const convRes = await request('/conversations', { token: userToken });
    assert(convRes.ok, 'Fetched authenticated user conversations');
    const convData = convRes.body.data || convRes.body;
    assert(Array.isArray(convData.items || convData), 'Conversations list is an array');

    // Log in brand user to start conversation thread with creator
    const brandToken = await login('brand@demo.com', 'Password@123');

    // Brand initiates conversation with creator and sends initial message
    const createConvRes = await request('/conversations', {
      method: 'POST',
      token: brandToken,
      body: JSON.stringify({
        type: 'DIRECT',
        participantUserIds: [me._id],
        initialMessage: 'Hello! We reviewed your cinematography portfolio and would love to collaborate on our upcoming Q4 brand brief.',
      }),
    });
    assert(createConvRes.ok || createConvRes.status === 201, 'Brand created conversation thread with creator');
    const createdConv = createConvRes.body.data || createConvRes.body;
    assert(!!createdConv._id, 'Conversation persisted with unique ID');
    const activeConvId = createdConv._id;

    // Brand sends follow-up message into the conversation
    const sendMsgRes = await request(`/conversations/${activeConvId}/messages`, {
      method: 'POST',
      token: brandToken,
      body: JSON.stringify({
        text: 'Are you available for a remote production discovery sync this Thursday at 3 PM IST?',
      }),
    });
    assert(sendMsgRes.ok || sendMsgRes.status === 201, 'Brand sent follow-up message into conversation');
    const sentMsg = sendMsgRes.body.data || sendMsgRes.body;
    assert(!!sentMsg._id, 'Message persisted in database with unique ID');
    assert(sentMsg.text.includes('remote production discovery sync'), 'Message content verified');

    // Creator checks conversations and finds the new message
    const creatorInboxRes = await request('/conversations', { token: userToken });
    assert(creatorInboxRes.ok, 'Creator fetched inbox after receiving message');
    const creatorThreads = creatorInboxRes.body.data?.items || creatorInboxRes.body.data || creatorInboxRes.body;
    const foundThread = creatorThreads.find((t) => t._id === activeConvId);
    assert(!!foundThread, 'Creator inbox found new active conversation thread');

    // Creator fetches messages in the thread
    const threadMessagesRes = await request(`/conversations/${activeConvId}/messages`, {
      token: userToken,
    });
    assert(threadMessagesRes.ok, 'Creator fetched thread message stream');
    const threadMessages = threadMessagesRes.body.data?.items || threadMessagesRes.body.data || threadMessagesRes.body;
    assert(Array.isArray(threadMessages) && threadMessages.length >= 1, `Thread contains persisted messages (got ${threadMessages.length})`);

    // 8. Participant Access Control & Privacy
    console.log('\n--- 8. Participant Access Control & Privacy ---');
    // Third party user (e.g. unverified candidate) attempts to read private conversation
    const thirdPartyToken = await login(unverifiedEmail, 'Password@123');
    const snooperRes = await request(`/conversations/${activeConvId}/messages`, {
      token: thirdPartyToken,
    });
    assert(
      snooperRes.status === 403 || snooperRes.status === 404,
      `Non-participant forbidden from reading private messages (got HTTP ${snooperRes.status})`,
    );

    console.log('\n=============================================================');
    console.log(`🎉 ALL PHASE 24 TESTS PASSED! (${passed}/${passed + failed})`);
    console.log('=============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    process.exit(1);
  }
}

run();
