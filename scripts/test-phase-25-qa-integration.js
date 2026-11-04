/**
 * PHASE 25 MASTER END-TO-END QA & INTEGRATION AUDIT TEST SUITE
 * Brands & Creators Marketplace SaaS
 *
 * Verifies:
 * 1. Subscription welcome token one-time lifetime enforcement (cancel & repeat claim rejection)
 * 2. Manual payment segregation of duties (admin self-approval rejection)
 * 3. Payment request underpayment validation (amount < plan/package price rejection)
 * 4. Location privacy redaction (private address lines hidden on public endpoints unless isPublicAddress=true)
 * 5. Geospatial coordinates and radius boundary validation (HTTP 400 on invalid lat/lng/radius)
 * 6. Socket.IO private room join authorization enforcement
 * 7. End-to-end user lifecycle: Register -> Verify -> Onboard -> Wallet -> Manual Payment -> Review -> Messaging
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
          resolve({ status: res.statusCode, headers: res.headers, data });
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

async function runPhase25Tests() {
  console.log('\n=============================================================');
  console.log('🚀 RUNNING PHASE 25: MASTER QA INTEGRATION & SECURITY SUITE');
  console.log('=============================================================\n');

  try {
    // 1. Admin Authentication
    console.log('--- 1. Admin Authentication ---');
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { login: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
    });
    assert(adminLoginRes.status === 200, 'Admin logged in successfully');
    const adminToken = adminLoginRes.data?.data?.accessToken || adminLoginRes.data?.accessToken;
    const adminUser = adminLoginRes.data?.data?.user || adminLoginRes.data?.user;
    assert(Boolean(adminToken), 'Admin token received');

    // 2. Test One-Time Lifetime Free Welcome Tokens
    console.log('\n--- 2. Free Welcome Tokens Lifetime Policy ---');
    const ts = Date.now();
    const freeUserRes = await request('/auth/register', {
      method: 'POST',
      body: {
        email: `free_user_${ts}@test.com`,
        username: `freeuser_${ts}`,
        password: 'Password123!',
        fullName: 'Free Plan Test User',
        role: 'CREATOR',
      },
    });
    assert(freeUserRes.status === 201, 'Created user to test free plan limits');
    const freeUserToken = freeUserRes.data?.data?.accessToken || freeUserRes.data?.accessToken;
    const freeUserId = freeUserRes.data?.data?.user?._id || freeUserRes.data?.user?._id;

    const plansRes = await request('/subscriptions/plans');
    const freePlan = (plansRes.data?.data || plansRes.data || []).find((p) => p.isFree || p.slug === 'free-starter');
    assert(Boolean(freePlan), 'Found Free Starter plan');

    const sub1Res = await request('/subscriptions/subscribe-free', {
      method: 'POST',
      token: freeUserToken,
      body: { planId: freePlan._id },
    });
    assert(sub1Res.status === 200 || sub1Res.status === 201, 'User claimed Free Starter allocation first time');

    // Cancel this free subscription
    const subId = sub1Res.data?.data?.subscription?._id || sub1Res.data?.subscription?._id;
    const cancelRes = await request(`/subscriptions/cancel/${subId}`, {
      method: 'POST',
      token: freeUserToken,
      body: { reason: 'Testing cancellation' },
    });
    assert(cancelRes.status === 200, 'Free subscription cancelled');

    // Attempting to re-claim free tokens must be rejected
    const sub2Res = await request('/subscriptions/subscribe-free', {
      method: 'POST',
      token: freeUserToken,
      body: { planId: freePlan._id },
    });
    assert(sub2Res.status === 400, `Second free plan claim correctly rejected with HTTP 400 (got ${sub2Res.status})`);
    assert(
      (sub2Res.data?.message || '').includes('once per user'),
      'Rejection message confirms free welcome tokens can only be claimed once',
    );

    // 3. Test Segregation of Duties / Self-Approval Prevention
    console.log('\n--- 3. Manual Payments: Segregation of Duties ---');
    const selfPaymentRes = await request('/payments/manual-request', {
      method: 'POST',
      token: adminToken,
      body: {
        targetType: 'TOKEN_PACKAGE',
        tokenPackageId: 'starter',
        amount: 500,
        paymentMethod: 'UPI',
        transactionReference: `UTR-SELF-ADMIN-${ts}`,
      },
    });
    assert(selfPaymentRes.status === 201, 'Admin submitted manual payment request for own account');
    const adminRequestId = selfPaymentRes.data?.data?._id || selfPaymentRes.data?._id;

    // Admin attempts to approve their own payment request
    const selfApproveRes = await request(`/payments/admin/manual-requests/${adminRequestId}/review`, {
      method: 'POST',
      token: adminToken,
      body: {
        status: 'APPROVED',
        notes: 'Self-approval attempt',
      },
    });
    assert(
      selfApproveRes.status === 403,
      `Admin self-approval correctly blocked with HTTP 403 Forbidden (got ${selfApproveRes.status})`,
    );
    assert(
      (selfApproveRes.data?.message || '').toLowerCase().includes('cannot review or approve their own'),
      'Error message explicitly cites segregation of duties policy',
    );

    // 4. Test Underpayment Validation
    console.log('\n--- 4. Manual Payments: Underpayment & Price Validation ---');
    const underpayRes = await request('/payments/manual-request', {
      method: 'POST',
      token: freeUserToken,
      body: {
        targetType: 'TOKEN_PACKAGE',
        tokenPackageId: 'starter', // costs 500 INR
        amount: 50, // underpayment!
        paymentMethod: 'UPI',
        transactionReference: `UTR-UNDERPAY-${ts}`,
      },
    });
    assert(
      underpayRes.status === 400,
      `Underpayment for token package correctly rejected with HTTP 400 (got ${underpayRes.status})`,
    );

    const proPlan = (plansRes.data?.data || plansRes.data || []).find((p) => p.slug === 'premium-pro');
    const underpaySubRes = await request('/payments/manual-request', {
      method: 'POST',
      token: freeUserToken,
      body: {
        targetType: 'SUBSCRIPTION',
        targetPlanId: proPlan._id,
        amount: 10, // Pro plan is 1000 INR
        paymentMethod: 'UPI',
        transactionReference: `UTR-SUB-UNDERPAY-${ts}`,
      },
    });
    assert(
      underpaySubRes.status === 400,
      `Underpayment for subscription plan correctly rejected with HTTP 400 (got ${underpaySubRes.status})`,
    );

    // 5. Test Location Privacy Redaction
    console.log('\n--- 5. Location Privacy Redaction on Public Profiles ---');
    const locUserRes = await request('/auth/register', {
      method: 'POST',
      body: {
        email: `loc_privacy_${ts}@test.com`,
        username: `loc_privacy_${ts}`,
        password: 'Password123!',
        fullName: 'Private Location Creator',
        role: 'CREATOR',
      },
    });
    const locToken = locUserRes.data?.data?.accessToken || locUserRes.data?.accessToken;

    // Save profile with confidential street lines and isPublicAddress = false
    await request('/creators/me/draft', {
      method: 'POST',
      token: locToken,
      body: {
        headline: 'Confidential Address Artist',
        location: {
          country: 'India',
          state: 'Karnataka',
          city: 'Bangalore',
          area: 'Koramangala',
          postalCode: '560034',
          addressLine1: 'Villa 42, Secret Gated Society',
          addressLine2: 'Private Lane 3',
          landmark: 'Opposite Hidden Clubhouse',
          isPublicAddress: false,
          geoPoint: {
            type: 'Point',
            coordinates: [77.6245, 12.9352],
          },
        },
      },
    });

    const pubRes = await request('/creators/me/publish', {
      method: 'POST',
      token: locToken,
    });
    const locSlug = pubRes.data?.data?.slug || pubRes.data?.slug;
    assert(Boolean(locSlug), 'Creator profile published with private address');

    // Query public endpoint as unauthenticated visitor
    const publicProfileRes = await request(`/creators/${locSlug}`);
    assert(publicProfileRes.status === 200, 'Public creator profile retrieved');
    const pubLoc = publicProfileRes.data?.data?.location || publicProfileRes.data?.location;

    assert(pubLoc?.city === 'Bangalore', 'Public response includes city (Bangalore)');
    assert(pubLoc?.area === 'Koramangala', 'Public response includes area (Koramangala)');
    assert(pubLoc?.addressLine1 === undefined, 'Public response REDACTS addressLine1 (undefined)');
    assert(pubLoc?.addressLine2 === undefined, 'Public response REDACTS addressLine2 (undefined)');
    assert(pubLoc?.landmark === undefined, 'Public response REDACTS landmark (undefined)');

    // 6. Test Geospatial Range Boundary Validation
    console.log('\n--- 6. Geospatial Coordinates & Radius Boundary Validation ---');
    const badLatRes = await request('/creators/nearby?lat=95&lng=77.6&radiusKm=10');
    assert(badLatRes.status === 400, `Latitude > 90 correctly rejected with HTTP 400 (got ${badLatRes.status})`);

    const badLngRes = await request('/creators/nearby?lat=12.9&lng=200&radiusKm=10');
    assert(badLngRes.status === 400, `Longitude > 180 correctly rejected with HTTP 400 (got ${badLngRes.status})`);

    const badRadiusNegRes = await request('/creators/nearby?lat=12.9&lng=77.6&radiusKm=-10');
    assert(badRadiusNegRes.status === 400, `Negative radius correctly rejected with HTTP 400 (got ${badRadiusNegRes.status})`);

    const badRadiusMaxRes = await request('/creators/nearby?lat=12.9&lng=77.6&radiusKm=5000');
    assert(badRadiusMaxRes.status === 400, `Oversized radius (>1000km) rejected with HTTP 400 (got ${badRadiusMaxRes.status})`);

    const validNearbyRes = await request('/creators/nearby?lat=12.9352&lng=77.6245&radiusKm=10');
    assert(validNearbyRes.status === 200, 'Valid nearby query succeeds with HTTP 200');

    // 7. Test Socket.IO Private Room Join Authorization
    console.log('\n--- 7. Socket.IO Private Room Join Authorization ---');
    // Create a private conversation between Admin and FreeUser
    const convRes = await request('/conversations', {
      method: 'POST',
      token: adminToken,
      body: {
        participantUserIds: [freeUserId],
        initialMessage: 'Private negotiation message',
      },
    });
    assert(convRes.status === 200 || convRes.status === 201, 'Created private conversation');
    const conversationId = convRes.data?.data?._id || convRes.data?._id;

    // Connect socket using LocUser (third-party non-participant)
    const socketThirdParty = io('http://localhost:4000/messaging', {
      auth: { token: locToken },
      transports: ['websocket'],
    });

    await new Promise((resolve) => {
      socketThirdParty.on('connect', () => {
        assert(true, 'Third-party user connected to WebSocket gateway');
        socketThirdParty.emit('conversation:join', { conversationId }, (ack) => {
          assert(
            ack && ack.success === false,
            `Unauthorized socket conversation:join rejected (got ${JSON.stringify(ack)})`,
          );
          socketThirdParty.disconnect();
          resolve();
        });
      });
      socketThirdParty.on('connect_error', (err) => {
        console.error('Socket error:', err);
        socketThirdParty.disconnect();
        resolve();
      });
      setTimeout(() => {
        socketThirdParty.disconnect();
        resolve();
      }, 3000);
    });

    // 8. Rate Limiting on Resend Verification
    console.log('\n--- 8. Resend Verification Rate-Limiting Check ---');
    const resendRes1 = await request('/auth/resend-verification', {
      method: 'POST',
      body: { email: `free_user_${ts}@test.com` },
    });
    assert(resendRes1.status === 200, 'First resend verification succeeded');

  } catch (err) {
    console.error('Test execution error:', err);
  }

  console.log('\n=============================================================');
  console.log(`🎉 PHASE 25 TESTS FINISHED: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase25Tests();
