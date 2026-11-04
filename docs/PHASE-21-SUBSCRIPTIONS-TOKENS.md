# Phase 21 — Subscription & Token Economy Validation Report

## Executive Summary

Phase 21 introduces an end-to-end subscription model and token economy to the Brands & Creators marketplace SaaS monorepo. It implements subscription tier management, an atomic token wallet ledger, action-based spend policies, and admin auditing tools across backend services, admin control panels, and the marketplace web interface.

All operations were implemented and tested strictly in the local development environment against local MongoDB and development daemons.

---

## 1. Architectural Architecture & Data Models

### 1.1 Subscription Models (`apps/api/src/modules/subscriptions/`)
- **SubscriptionPlan (`subscriptionPlans` collection)**:
  - `name`, `slug`, `description`, `price`, `currency`, `duration` (`MONTHLY` / `YEARLY`), `durationDays`, `includedTokens`, `entitlements`, `allowedRoles`, `isFree`, `isActive`, `sortOrder`.
  - Auto-seeded with 3 primary tiers:
    1. **Free Starter Plan**: 0 INR, 10 included welcome tokens, 30-day term.
    2. **Premium Pro Creator & Brand**: ₹1,000/mo, 100 included monthly tokens, priority discovery.
    3. **Annual VIP Growth Suite**: ₹9,500/yr, 1,200 included tokens, featured spotlight, VIP concierge.
- **UserSubscription (`userSubscriptions` collection)**:
  - `userId`, `planId`, `status` (`ACTIVE`, `EXPIRED`, `CANCELLED`, `PENDING_PAYMENT`), `startDate`, `expiresAt`, `autoRenew`, `tokensGrantedTotal`, `renewalCount`, `paymentReferenceId`.

### 1.2 Token Wallet & Auditable Ledger (`apps/api/src/modules/tokens/`)
- **TokenWallet (`tokenWallets` collection)**:
  - `userId` (unique index), `balance` (must never drop below zero), `totalReceived`, `totalSpent`, `currencyReferenceRate` (default ₹10/token), `lastTransactionAt`.
- **TokenLedgerEntry (`tokenLedgerEntries` collection)**:
  - `userId`, `amount`, `direction` (`CREDIT` / `DEBIT`), `type` (`PURCHASE`, `SUBSCRIPTION_INCLUDED`, `FREE_ALLOCATION`, `SPEND`, `REFUND`, `ADMIN_BONUS`, `ADJUSTMENT`), `balanceAfter`, `reason`, `sourceRefId`, `performedBy`, `idempotencyKey` (unique sparse index), `metadata`.
- **TokenPricingRule (`tokenPricingRules` collection)**:
  - Maps marketplace actions to token costs:
    - `REQUIREMENT_POST`: 2 tokens
    - `PROPOSAL_SUBMIT`: 1 token
    - `DIRECT_MESSAGE`: 1 token
    - `CONTACT_UNLOCK`: 5 tokens
    - `FEATURED_BOOST`: 10 tokens
    - `PORTFOLIO_EXPANSION`: 3 tokens

---

## 2. Concurrency Safety & Financial Controls

1. **Atomic Conditional Updates**:
   - Token deductions are executed with atomic Mongoose query conditions:
     ```ts
     const updatedWallet = await this.walletModel.findOneAndUpdate(
       { userId: uId, balance: { $gte: amount } },
       { $inc: { balance: -amount, totalSpent: amount }, $set: { lastTransactionAt: new Date() } },
       { new: true }
     );
     ```
   - If a concurrent process consumes tokens such that `balance < amount`, the operation atomically fails with `BadRequestException('Insufficient token balance')` before touching ledger records.
2. **Strict Idempotency**:
   - Both credit and debit operations support unique `idempotencyKey` values. Re-executing an operation returns the original recorded transaction without double-charging or double-crediting.
3. **Wallet vs. Ledger Reconciliation**:
   - Admin reconciliation endpoint (`POST /api/v1/tokens/admin/reconcile/:userId`) recalculates net balance from the entire transaction history (`sum(CREDIT) - sum(DEBIT)`) and compares it against `wallet.balance`, certifying 100% financial integrity.
4. **Mandatory Admin Audit Reasons**:
   - Admin grants (`POST /api/v1/tokens/admin/grant`) and deductions (`POST /api/v1/tokens/admin/deduct`) reject calls where `reason` is empty, logging `performedBy` for security compliance.

---

## 3. UI Interfaces

- **Marketplace Web App (`apps/web/app/wallet/page.tsx`)**:
  - Displays token balance, INR equivalent valuation, active subscription tier, and validity badge.
  - Interactive Subscription Plans showcase with one-click free plan activation and plan upgrade paths.
  - Quick top-up packages card with instant token calculations.
  - Paginated transaction ledger table detailing dates, descriptions, transaction types, and debit/credit color tags.
- **Admin Portal (`apps/admin/app/subscriptions/plans/page.tsx`)**:
  - Plan inventory management with active/inactive status toggles, pricing details, and modal for creating custom subscription tiers.
- **Admin Portal (`apps/admin/app/tokens/page.tsx`)**:
  - Real-time user wallet table with search and pagination.
  - Complete marketplace audit ledger table.
  - Interactive Action Cost Rules editor for adjusting marketplace token prices.
  - Manual Token Grant & Deduct modal enforcing documented reasons.
  - One-click Wallet Reconciliation check with live discrepancy detection.

---

## 4. Test Verification Evidence

- Test script: `scripts/test-phase-21-subscriptions-tokens.js`
- Test run results:
  - **Total Tests**: 44
  - **Passed**: 44
  - **Failed**: 0
  - **Pass Rate**: 100%
- Covered workflows:
  - Seeded plans and pricing rules validation.
  - User registration, login, and initial zero-balance wallet creation.
  - Free Starter subscription activation granting 10 tokens.
  - Idempotency validation preventing duplicate token allocation on repeated plan activation.
  - Spending tokens on `REQUIREMENT_POST` (2 tokens deducted, balance 8).
  - Insufficient balance rejection when attempting to spend 10 tokens on `FEATURED_BOOST` with 8 tokens available.
  - Admin grant (+50 tokens) and deduction (-8 tokens) with mandatory audit reason verification.
  - Ledger reconciliation confirming wallet balance strictly equals ledger sum (50 tokens).
  - Admin subscription plan creation and active toggling.
  - RBAC verification preventing creators from calling admin endpoints.

