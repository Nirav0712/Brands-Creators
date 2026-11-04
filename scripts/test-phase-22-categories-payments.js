/**
 * Test Suite: Phase 22 — Manual Payments & Payment Gateway Readiness
 *
 * Tests:
 * 1. Default payment settings verification (UPI, Bank Transfer, QR)
 * 2. Token packages catalog query (Starter, Growth, Power, Ultimate)
 * 3. Admin settings update (PUT /payments/admin/settings)
 * 4. User manual payment request creation for Subscription (target: premium-pro)
 * 5. Duplicate UTR conflict prevention (409 Conflict)
 * 6. User manual payment request creation for Token Package (target: growth pack)
 * 7. User list of manual payment requests (GET /payments/manual-requests)
 * 8. Admin manual payment requests queue (GET /payments/admin/manual-requests)
 * 9. Admin rejection workflow (mandatory rejection reason required)
 * 10. Admin approval workflow for Subscription:
 *     - Activates user subscription
 *     - Grants plan-included tokens to user wallet
 * 11. Admin approval workflow for Token Package:
 *     - Credits package tokens to user wallet with PURCHASE type
 * 12. Atomic status safety: prevents double approval / review of processed request
 * 13. RBAC security: non-admin forbidden from admin settings and review endpoints
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
  console.log('🚀 RUNNING PHASE 22 TEST SUITE: MANUAL PAYMENTS & GATEWAY READINESS');
  console.log('=============================================================\n');

  try {
    // 1. Authenticate test users
    console.log('--- 1. Authenticating test users ---');
    const adminToken = await login('admin@brandsandcreators.com', 'SuperAdmin@Brands2026!');
    assert(!!adminToken, 'Admin logged in successfully');

    const timestamp = Date.now();
    const testEmail = `pay_test_${timestamp}@demo.com`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        username: `payuser_${timestamp}`,
        password: 'Password@123',
        fullName: 'Phase 22 Test Creator',
        role: 'CREATOR',
      }),
    });
    assert(regRes.ok || regRes.status === 201, 'Created fresh test user');
    const userToken = await login(testEmail, 'Password@123');
    assert(!!userToken, 'Logged in as fresh test user');

    // 2. Query default payment settings
    console.log('\n--- 2. Public Payment Settings ---');
    const settingsRes = await request('/payments/settings');
    if (!settingsRes.ok) {
      console.error('Settings response:', settingsRes.status, settingsRes.body);
    }
    assert(settingsRes.ok, 'Fetched public payment settings');
    const settings = settingsRes.body.data;
    assert(settings.upiEnabled === true, 'UPI is enabled by default');
    assert(!!settings.upiId, `UPI ID is configured (${settings.upiId})`);
    assert(settings.bankTransferEnabled === true, 'Bank transfer is enabled by default');
    assert(!!settings.accountNumber && !!settings.ifscCode, 'Bank account number and IFSC are present');

    // 3. Query Token Packages
    console.log('\n--- 3. Token Packages Catalog ---');
    const pkgsRes = await request('/payments/token-packages');
    assert(pkgsRes.ok, 'Fetched token packages catalog');
    const packages = pkgsRes.body.data;
    assert(Array.isArray(packages) && packages.length >= 4, `Expected at least 4 token packages, got ${packages.length}`);
    const growthPkg = packages.find((p) => p.id === 'growth');
    assert(!!growthPkg && growthPkg.tokensCount === 150 && growthPkg.priceInr === 1350, 'Growth pack (150 tokens / 1350 INR) verified');

    // 4. Admin Updates Payment Settings
    console.log('\n--- 4. Admin Payment Settings Update ---');
    const updateSettingsRes = await request('/payments/admin/settings', {
      method: 'PUT',
      token: adminToken,
      body: JSON.stringify({
        upiId: 'escrow.marketplace@icici',
        upiDisplayName: 'Brands & Creators India Escrow',
        bankName: 'HDFC Corporate Banking',
      }),
    });
    assert(updateSettingsRes.ok, 'Admin successfully updated payment settings');
    const updatedSettings = updateSettingsRes.body.data;
    assert(updatedSettings.upiId === 'escrow.marketplace@icici', 'Updated UPI ID verified');
    assert(updatedSettings.upiDisplayName === 'Brands & Creators India Escrow', 'Updated display name verified');

    // 5. Get available Subscription Plans to target Premium Pro
    console.log('\n--- 5. Preparing Subscription Target ---');
    const plansRes = await request('/subscriptions/plans');
    const proPlan = plansRes.body.data.find((p) => p.slug === 'premium-pro');
    assert(!!proPlan, 'Found Premium Pro plan');

    // 6. User submits Manual Payment for Subscription
    console.log('\n--- 6. User Submits Manual Payment for Subscription ---');
    const subUtr = `UTR-SUB-${timestamp}`;
    const subPayRes = await request('/payments/manual-request', {
      method: 'POST',
      token: userToken,
      body: JSON.stringify({
        targetType: 'SUBSCRIPTION',
        targetPlanId: proPlan._id,
        amount: proPlan.price,
        paymentMethod: 'UPI',
        transactionReference: subUtr,
        senderIdentifier: 'user.creator@okaxis',
        notes: 'Paid via Google Pay for monthly Pro subscription',
      }),
    });
    assert(subPayRes.ok, 'Manual payment for subscription submitted successfully');
    const subPayOrder = subPayRes.body.data;
    assert(subPayOrder.status === 'PENDING_VERIFICATION', 'Status is PENDING_VERIFICATION');
    assert(subPayOrder.orderNumber.startsWith('MAN-'), `Generated order number: ${subPayOrder.orderNumber}`);
    assert(subPayOrder.tokenPackageQuantity === proPlan.includedTokens, `Tokens included: ${subPayOrder.tokenPackageQuantity}`);

    // 7. Duplicate UTR Conflict Check
    console.log('\n--- 7. Duplicate UTR Conflict Prevention ---');
    const dupUtrRes = await request('/payments/manual-request', {
      method: 'POST',
      token: userToken,
      body: JSON.stringify({
        targetType: 'SUBSCRIPTION',
        targetPlanId: proPlan._id,
        amount: proPlan.price,
        paymentMethod: 'UPI',
        transactionReference: subUtr, // duplicate!
      }),
    });
    assert(dupUtrRes.status === 409, `Duplicate UTR correctly rejected with 409 Conflict (got ${dupUtrRes.status})`);

    // 8. User submits Manual Payment for Token Package
    console.log('\n--- 8. User Submits Manual Payment for Token Package ---');
    const pkgUtr = `UTR-PKG-${timestamp}`;
    const pkgPayRes = await request('/payments/manual-request', {
      method: 'POST',
      token: userToken,
      body: JSON.stringify({
        targetType: 'TOKEN_PACKAGE',
        tokenPackageId: 'growth',
        amount: 1350,
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: pkgUtr,
        senderIdentifier: 'Acme Creator Studio IMPS',
      }),
    });
    assert(pkgPayRes.ok, 'Manual payment for token package submitted successfully');
    const pkgPayOrder = pkgPayRes.body.data;
    assert(pkgPayOrder.status === 'PENDING_VERIFICATION', 'Status is PENDING_VERIFICATION');
    assert(pkgPayOrder.tokenPackageQuantity === 150, 'Token quantity is 150');

    // 9. User queries their manual payments
    console.log('\n--- 9. User Queries Manual Payment Requests ---');
    const userPaymentsRes = await request('/payments/manual-requests', { token: userToken });
    assert(userPaymentsRes.ok, 'User fetched their manual payment requests');
    const userOrders = userPaymentsRes.body.data.items || userPaymentsRes.body.data;
    assert(userOrders.length >= 2, `User has at least 2 requests (got ${userOrders.length})`);

    // 10. Admin Rejection Workflow (with validation)
    console.log('\n--- 10. Admin Rejection Workflow ---');
    // Create a 3rd payment request to test rejection
    const rejectUtr = `UTR-REJ-${timestamp}`;
    const rejCreateRes = await request('/payments/manual-request', {
      method: 'POST',
      token: userToken,
      body: JSON.stringify({
        targetType: 'TOKEN_PACKAGE',
        tokenPackageId: 'starter',
        amount: 500,
        paymentMethod: 'UPI',
        transactionReference: rejectUtr,
      }),
    });
    assert(rejCreateRes.ok, 'Created payment request to test rejection');
    const rejOrderId = rejCreateRes.body.data._id;

    // Test rejection without reason fails
    const badRejectRes = await request(`/payments/admin/manual-requests/${rejOrderId}/review`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ status: 'REJECTED', rejectionReason: '' }),
    });
    assert(badRejectRes.status === 400, 'Rejection without reason is rejected (400)');

    // Reject with documented reason
    const goodRejectRes = await request(`/payments/admin/manual-requests/${rejOrderId}/review`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        status: 'REJECTED',
        rejectionReason: 'UTR reference not found in ICICI bank feed after 2 business hours.',
      }),
    });
    assert(goodRejectRes.ok, 'Admin rejected payment with reason');
    assert(goodRejectRes.body.data.status === 'REJECTED', 'Status updated to REJECTED');

    // 11. Admin Approval Workflow for Subscription
    console.log('\n--- 11. Admin Approval Workflow: Subscription Activation ---');
    const initialWallet = await request('/tokens/wallet', { token: userToken });
    const initialBalance = initialWallet.body.data.balance;

    const approveSubRes = await request(`/payments/admin/manual-requests/${subPayOrder._id}/review`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ status: 'APPROVED', notes: 'Verified in bank portal' }),
    });
    assert(approveSubRes.ok, 'Admin approved subscription payment request');
    assert(approveSubRes.body.data.status === 'APPROVED', 'Status updated to APPROVED');

    // Verify user subscription is ACTIVE
    const mySubRes = await request('/subscriptions/my-subscription', { token: userToken });
    assert(mySubRes.ok, 'Fetched user active subscription');
    const activeSub = mySubRes.body.data;
    assert(activeSub.status === 'ACTIVE', 'Subscription status is ACTIVE');
    assert(activeSub.planId.slug === 'premium-pro', 'Active plan is Premium Pro');

    // Verify user received 100 plan-included tokens
    const afterSubWallet = await request('/tokens/wallet', { token: userToken });
    assert(
      afterSubWallet.body.data.balance === initialBalance + proPlan.includedTokens,
      `Wallet credited with ${proPlan.includedTokens} tokens (balance now ${afterSubWallet.body.data.balance})`,
    );

    // 12. Admin Approval Workflow for Token Package
    console.log('\n--- 12. Admin Approval Workflow: Token Package Fulfillment ---');
    const prePkgBalance = afterSubWallet.body.data.balance;

    const approvePkgRes = await request(`/payments/admin/manual-requests/${pkgPayOrder._id}/review`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ status: 'APPROVED', notes: 'Verified IMPS transfer' }),
    });
    assert(approvePkgRes.ok, 'Admin approved token package payment request');
    assert(approvePkgRes.body.data.status === 'APPROVED', 'Status updated to APPROVED');

    // Verify user received 150 package tokens
    const afterPkgWallet = await request('/tokens/wallet', { token: userToken });
    assert(
      afterPkgWallet.body.data.balance === prePkgBalance + 150,
      `Wallet credited with 150 package tokens (balance now ${afterPkgWallet.body.data.balance})`,
    );

    // Verify ledger entry has PURCHASE type
    const ledgerRes = await request('/tokens/ledger', { token: userToken });
    const entries = ledgerRes.body.data.items || ledgerRes.body.data;
    const purchaseEntry = entries.find((e) => e.type === 'PURCHASE');
    assert(!!purchaseEntry && purchaseEntry.amount === 150, 'Ledger recorded 150 PURCHASE credit');

    // 13. Atomic Double Review Prevention
    console.log('\n--- 13. Atomic Double Review Prevention ---');
    const doubleApproveRes = await request(`/payments/admin/manual-requests/${subPayOrder._id}/review`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    assert(doubleApproveRes.status === 400, `Re-approving already approved request rejected with 400 (got ${doubleApproveRes.status})`);

    // 14. RBAC Protection
    console.log('\n--- 14. RBAC Security Checks ---');
    const unauthSettings = await request('/payments/admin/settings', {
      method: 'GET',
      token: userToken, // Creator calling admin endpoint
    });
    assert(unauthSettings.status === 403, 'Non-admin forbidden from admin settings (403)');

    const unauthReview = await request(`/payments/admin/manual-requests/${pkgPayOrder._id}/review`, {
      method: 'POST',
      token: userToken,
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    assert(unauthReview.status === 403, 'Non-admin forbidden from reviewing payments (403)');

    console.log('\n=============================================================');
    console.log(`🎉 ALL PHASE 22 TESTS PASSED! (${passed}/${passed + failed})`);
    console.log('=============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    process.exit(1);
  }
}

run();
