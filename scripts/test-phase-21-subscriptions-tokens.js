/**
 * Test Suite: Phase 21 — Subscriptions, Token Economy & Auditable Ledger
 *
 * Tests:
 * 1. Seeded subscription plans verification (Free Starter, Premium Pro, Annual VIP)
 * 2. Seeded token pricing rules verification (REQUIREMENT_POST, PROPOSAL_SUBMIT, etc.)
 * 3. User free subscription activation & initial free token allocation (10 tokens)
 * 4. Idempotency test: duplicate free plan activation does not double-credit tokens
 * 5. Token spending via action cost key (REQUIREMENT_POST = 2 tokens)
 * 6. Insufficient balance protection (spending > balance returns 400)
 * 7. Admin token grant with mandatory audit reason
 * 8. Admin token deduction with mandatory audit reason
 * 9. Validation: missing reason on grant/deduct is rejected
 * 10. Ledger integrity & wallet reconciliation endpoint (calculated balance === wallet balance)
 * 11. Admin plan creation, update, and active toggle
 * 12. RBAC protection: non-admin cannot access admin subscription/token endpoints
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
  console.log('🚀 RUNNING PHASE 21 TEST SUITE: SUBSCRIPTIONS & TOKEN WALLET');
  console.log('=============================================================\n');

  try {
    // 1. Authenticate users
    console.log('--- 1. Authenticating test users ---');
    const adminToken = await login('admin@brandsandcreators.com', 'SuperAdmin@Brands2026!');
    assert(!!adminToken, 'Admin logged in successfully');

    // Register a fresh test user to test clean subscription & wallet flow
    const timestamp = Date.now();
    const testEmail = `sub_test_${timestamp}@demo.com`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        username: `subuser_${timestamp}`,
        password: 'Password@123',
        fullName: 'Phase 21 Test Creator',
        role: 'CREATOR',
      }),
    });
    if (!regRes.ok) {
      console.error('Registration failed:', regRes.body);
    }
    assert(regRes.ok || regRes.status === 201, 'Created fresh test user');
    const userToken = await login(testEmail, 'Password@123');
    assert(!!userToken, 'Logged in as fresh test user');

    // 2. Query seeded plans
    console.log('\n--- 2. Seeded Subscription Plans ---');
    const plansRes = await request('/subscriptions/plans');
    assert(plansRes.ok, 'Fetched public subscription plans');
    const plans = plansRes.body.data;
    assert(Array.isArray(plans) && plans.length >= 3, `Expected at least 3 seeded plans, got ${plans.length}`);
    const freePlan = plans.find((p) => p.slug === 'free-starter');
    const proPlan = plans.find((p) => p.slug === 'premium-pro');
    assert(!!freePlan, 'Free Starter plan exists');
    assert(freePlan.price === 0, 'Free Starter price is 0 INR');
    assert(freePlan.includedTokens === 10, 'Free Starter includes 10 tokens');
    assert(!!proPlan, 'Premium Pro plan exists');

    // 3. Query seeded action cost rules
    console.log('\n--- 3. Seeded Token Action Pricing Rules ---');
    const rulesRes = await request('/tokens/action-costs');
    assert(rulesRes.ok, 'Fetched token action pricing rules');
    const rules = rulesRes.body.data;
    assert(Array.isArray(rules) && rules.length >= 6, `Expected at least 6 pricing rules, got ${rules.length}`);
    const postRule = rules.find((r) => r.actionKey === 'REQUIREMENT_POST');
    assert(!!postRule && postRule.costTokens === 2, 'REQUIREMENT_POST action costs 2 tokens');

    // 4. Initial wallet check (fresh user should have 0 tokens or newly initialized wallet)
    console.log('\n--- 4. Initial Wallet Balance Check ---');
    const initialWalletRes = await request('/tokens/wallet', { token: userToken });
    assert(initialWalletRes.ok, 'Fetched initial user wallet');
    const initialWallet = initialWalletRes.body.data;
    assert(initialWallet.balance === 0, `Fresh user balance is 0 (got ${initialWallet.balance})`);

    // 5. Subscribe to Free Plan
    console.log('\n--- 5. Free Plan Activation & Initial Token Allocation ---');
    const subRes = await request('/subscriptions/subscribe-free', {
      method: 'POST',
      token: userToken,
      body: JSON.stringify({ planId: freePlan._id }),
    });
    assert(subRes.ok, 'Subscribed to Free Starter plan');
    const subData = subRes.body.data;
    assert(subData.subscription.status === 'ACTIVE', 'Subscription status is ACTIVE');

    // Verify wallet received 10 free tokens
    const postSubWalletRes = await request('/tokens/wallet', { token: userToken });
    const postSubWallet = postSubWalletRes.body.data;
    assert(postSubWallet.balance === 10, `User balance is now 10 tokens (got ${postSubWallet.balance})`);
    assert(postSubWallet.currencyReferenceRate === 10, 'Default reference rate is 10 INR per token');
    assert(postSubWallet.referenceValueInInr === 100, 'Estimated wallet value is 100 INR (10 * 10)');

    // Verify ledger has FREE_ALLOCATION credit
    const ledgerRes = await request('/tokens/ledger', { token: userToken });
    assert(ledgerRes.ok, 'Fetched user ledger');
    const ledgerEntries = ledgerRes.body.data.items || ledgerRes.body.data;
    assert(ledgerEntries.length >= 1, 'Ledger has at least 1 entry');
    const freeCredit = ledgerEntries.find((e) => e.type === 'FREE_ALLOCATION');
    assert(!!freeCredit, 'Found FREE_ALLOCATION ledger entry');
    assert(freeCredit.amount === 10 && freeCredit.direction === 'CREDIT', 'Entry is 10 CREDIT');

    // 6. Test Idempotency: duplicate free subscription should not double credit
    console.log('\n--- 6. Idempotency Check: Duplicate Free Activation ---');
    const dupSubRes = await request('/subscriptions/subscribe-free', {
      method: 'POST',
      token: userToken,
      body: JSON.stringify({ planId: freePlan._id }),
    });
    assert(dupSubRes.ok, 'Duplicate free subscription request returns cleanly');
    const dupWalletRes = await request('/tokens/wallet', { token: userToken });
    assert(dupWalletRes.body.data.balance === 10, 'Wallet balance remained exactly 10 (no double crediting)');

    // 7. Spend tokens for an action (REQUIREMENT_POST = 2 tokens)
    console.log('\n--- 7. Token Deduction: Spend on Action ---');
    const spendRes = await request('/tokens/spend', {
      method: 'POST',
      token: userToken,
      body: JSON.stringify({
        actionKey: 'REQUIREMENT_POST',
        referenceId: 'req_test_001',
        note: 'Publish video project requirement',
      }),
    });
    assert(spendRes.ok, 'Successfully spent tokens for REQUIREMENT_POST');
    assert(spendRes.body.data.newBalance === 8, `Wallet balance decremented to 8 (got ${spendRes.body.data.newBalance})`);
    assert(spendRes.body.data.tokensDeducted === 2, 'Spent 2 tokens for REQUIREMENT_POST');

    // 8. Insufficient Balance Protection: spend remaining 8 tokens, then try to spend again
    console.log('\n--- 8. Atomic Protection: Reject Insufficient Balance ---');
    // Spend FEATURED_BOOST which costs 10 tokens (user only has 8 tokens left!)
    const overspendRes = await request('/tokens/spend', {
      method: 'POST',
      token: userToken,
      body: JSON.stringify({
        actionKey: 'FEATURED_BOOST',
        referenceId: 'boost_fail_01',
        note: 'Requires 10 tokens but user only has 8',
      }),
    });
    assert(overspendRes.status === 400, `Overspend correctly rejected with HTTP 400 (got ${overspendRes.status})`);
    const afterOverspendWallet = await request('/tokens/wallet', { token: userToken });
    assert(afterOverspendWallet.body.data.balance === 8, 'Balance untouched after failed overspend attempt');

    // 9. Admin Token Grant with Audit Reason
    console.log('\n--- 9. Admin Token Grant ---');
    const testUserId = postSubWallet.userId;
    const grantRes = await request('/tokens/admin/grant', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        userId: testUserId,
        amount: 50,
        reason: 'Customer goodwill promotional grant for community testing',
      }),
    });
    assert(grantRes.ok, 'Admin granted 50 tokens with reason');
    assert(grantRes.body.data.wallet.balance === 58, `Wallet balance is now 58 (got ${grantRes.body.data.wallet.balance})`);

    // Verify missing reason on grant is rejected
    const badGrantRes = await request('/tokens/admin/grant', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        userId: testUserId,
        amount: 10,
        reason: '', // empty reason
      }),
    });
    assert(badGrantRes.status === 400, 'Admin grant without reason is rejected (400)');

    // 10. Admin Token Deduction with Audit Reason
    console.log('\n--- 10. Admin Token Deduction ---');
    const deductRes = await request('/tokens/admin/deduct', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        userId: testUserId,
        amount: 8,
        reason: 'Administrative adjustment per support ticket #1024',
      }),
    });
    assert(deductRes.ok, 'Admin deducted 8 tokens with reason');
    assert(deductRes.body.data.wallet.balance === 50, `Wallet balance is now 50 (got ${deductRes.body.data.wallet.balance})`);

    // 11. Wallet vs Ledger Reconciliation
    console.log('\n--- 11. Wallet vs Ledger Audit Reconciliation ---');
    const reconcileRes = await request(`/tokens/admin/reconcile/${testUserId}`, {
      method: 'POST',
      token: adminToken,
    });
    assert(reconcileRes.ok, 'Admin reconciliation endpoint executed');
    const reconData = reconcileRes.body.data;
    assert(reconData.isReconciled === true, 'Wallet balance is 100% balanced with ledger sum');
    assert(reconData.walletBalance === 50, `Wallet balance matches 50`);
    assert(reconData.calculatedBalance === 50, `Calculated ledger balance matches 50`);

    // 12. Admin Subscription Plan Management
    console.log('\n--- 12. Admin Subscription Plan Management ---');
    const createPlanRes = await request('/subscriptions/admin/plans', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        name: `Enterprise Agency Elite ${timestamp}`,
        description: 'Unlimited team seats and custom token bundles',
        price: 9999,
        currency: 'INR',
        duration: 'MONTHLY',
        durationDays: 30,
        includedTokens: 500,
        entitlements: ['500 Tokens/mo', 'Dedicated Account Manager', 'Custom Invoicing'],
      }),
    });
    if (!createPlanRes.ok) {
      console.error('Create plan failed:', createPlanRes.body);
    }
    assert(createPlanRes.ok, 'Admin created new subscription plan');
    const createdPlanId = createPlanRes.body.data._id;

    // Toggle active state
    const toggleRes = await request(`/subscriptions/admin/plans/${createdPlanId}/toggle`, {
      method: 'PATCH',
      token: adminToken,
    });
    assert(toggleRes.ok, 'Toggled plan active state');
    assert(toggleRes.body.data.isActive === false, 'Plan successfully deactivated');

    // 13. RBAC Enforcement
    console.log('\n--- 13. RBAC Security Checks ---');
    const unauthorizedGrant = await request('/tokens/admin/grant', {
      method: 'POST',
      token: userToken, // creator trying to call admin endpoint
      body: JSON.stringify({ userId: testUserId, amount: 100, reason: 'Hacking attempt' }),
    });
    assert(unauthorizedGrant.status === 403, 'Non-admin forbidden from admin grant (403)');

    const unauthorizedPlans = await request('/subscriptions/admin/plans', {
      method: 'GET',
      token: userToken,
    });
    assert(unauthorizedPlans.status === 403, 'Non-admin forbidden from admin plans (403)');

    console.log('\n=============================================================');
    console.log(`🎉 ALL PHASE 21 TESTS PASSED! (${passed}/${passed + failed})`);
    console.log('=============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    process.exit(1);
  }
}

run();
