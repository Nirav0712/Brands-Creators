# Phase 22 — Manual Payments & Payment Gateway Readiness Report

## Executive Summary

Phase 22 implements full support for manual payment processing (UPI, QR Codes, and Direct Institutional Bank Transfers) alongside a pluggable Payment Gateway Adapter architecture for future automated payment processor integrations (e.g., Razorpay, Stripe, Cashfree, PhonePe).

This completes the marketplace's commercial checkout loop, allowing users to upgrade subscriptions and purchase token packages offline while providing administrators with a secure, auditable verification queue with anti-fraud protections.

All operations were developed and tested strictly in the local environment.

---

## 1. Core Architecture & Schemas

### 1.1 Payment Settings (`apps/api/src/modules/payments/schemas/payment-settings.schema.ts`)
- **Collection**: `paymentSettings` (Singleton document)
- **Fields**:
  - `upiEnabled`: boolean toggle for UPI payments.
  - `upiId`: string (e.g. `'pay.brandscreators@icici'`).
  - `upiDisplayName`: string (e.g. `'Brands & Creators Marketplace Media Pvt Ltd'`).
  - `qrCodeUrl`: optional URL or asset path to static payment QR code.
  - `bankTransferEnabled`: boolean toggle for NEFT / RTGS / IMPS payments.
  - `bankAccountHolder`: corporate account holder name.
  - `bankName`: corporate bank name (e.g. `'HDFC Bank'`).
  - `accountNumber`: corporate bank account number.
  - `ifscCode`: bank IFSC code.
  - `branchName`: bank branch location.
  - `paymentInstructions`: user guidance shown during checkout.
  - `verificationPolicy`: anti-fraud verification guidelines.
  - `updatedBy`: administrator ID who last updated settings.

### 1.2 Manual Payment Requests (`apps/api/src/modules/payments/schemas/manual-payment-request.schema.ts`)
- **Collection**: `manualPaymentRequests`
- **Fields**:
  - `orderNumber`: Human-readable identifier formatted as `MAN-{TIMESTAMP}-{RANDOM}`.
  - `userId`: ObjectId reference to submitting user.
  - `targetType`: `SUBSCRIPTION` | `TOKEN_PACKAGE`.
  - `targetPlanId`: ObjectId reference to `SubscriptionPlan` (when subscribing).
  - `tokenPackageQuantity`: Number of tokens included or purchased.
  - `targetTitle`: Name of item being purchased.
  - `amount`: Transaction amount in INR.
  - `currency`: Defaults to `'INR'`.
  - `paymentMethod`: `UPI` | `BANK_TRANSFER`.
  - `transactionReference`: UTR / UPI Reference ID. Unique across pending and approved requests.
  - `senderIdentifier`: Optional sender UPI ID or bank account name.
  - `proofImageUrl`: Optional receipt or transfer confirmation screenshot.
  - `status`: `PENDING_VERIFICATION` | `APPROVED` | `REJECTED`.
  - `reviewedBy`: ObjectId reference to reviewer admin.
  - `reviewedAt`: Date of approval/rejection.
  - `rejectionReason`: Mandatory documentation when request is rejected.
  - `fulfillmentRefId`: Subscription ID or Token Ledger Entry ID created upon approval.
  - `idempotencyKey`: Unique sparse index preventing double submission.

### 1.3 Add-on Token Packages (`apps/api/src/modules/payments/token-packages.constant.ts`)
- Pre-configured catalog:
  - **Starter Pack**: 50 tokens @ ₹500
  - **Growth Pack**: 150 tokens @ ₹1,350 (10% bonus)
  - **Power Pack**: 500 tokens @ ₹4,000 (20% bonus)
  - **Ultimate VIP Pack**: 1,500 tokens @ ₹10,500 (30% bonus)

### 1.4 Pluggable Payment Gateway Adapter (`apps/api/src/modules/payments/adapters/payment-gateway.adapter.ts`)
- Defines standard interfaces (`InitiatePaymentParams`, `InitiatePaymentResult`, `PaymentVerificationParams`, `PaymentVerificationResult`, and `PaymentGatewayAdapter`) ensuring future third-party payment gateways can be activated with zero changes to commercial ledger business logic.

---

## 2. Fulfillment Workflows & Security Controls

1. **Anti-Fraud Duplicate UTR Prevention**:
   - Submitting an already used `transactionReference` (UTR) for an active or approved payment immediately rejects with HTTP 409 Conflict.
2. **Atomic Status Progression**:
   - Approvals and rejections strictly verify `status === PENDING_VERIFICATION`. Subsequent attempts to review an already processed order fail with HTTP 400 Bad Request.
3. **Automated End-to-End Fulfillment on Approval**:
   - For `SUBSCRIPTION`: Calls `subscriptionsService.activatePaidSubscription()`, updating the user's active tier and crediting the tier's included tokens.
   - For `TOKEN_PACKAGE`: Calls `tokensService.creditTokens()` with type `PURCHASE`, updating wallet balance and appending an immutable ledger entry.
4. **Mandatory Rejection Documentation**:
   - Administrators cannot reject payments without an explicit `rejectionReason`.
5. **RBAC Isolation**:
   - Non-administrators attempting to modify payment settings or review requests receive HTTP 403 Forbidden.

---

## 3. UI Interfaces

- **Web Marketplace (`apps/web/app/wallet/page.tsx`)**:
  - Interactive "Direct Manual Settlement" modal with UPI / Bank Transfer tab toggles.
  - Live display of platform UPI ID and Bank Account details with one-click copy buttons.
  - Instant submission of UTR reference and optional sender details.
- **Admin Portal (`apps/admin/app/payments/settings/page.tsx`)**:
  - Configuration dashboard for UPI credentials, display names, QR code URLs, and bank account parameters.
- **Admin Portal (`apps/admin/app/payments/manual-requests/page.tsx`)**:
  - Comprehensive verification queue with filters for All, Pending, Approved, and Rejected requests.
  - Search by Order Number or UTR.
  - One-click Approval action and Rejection modal with required reason capture.
- **Admin Sidebar (`apps/admin/components/admin-sidebar.tsx`)**:
  - Direct links to Manual Payments Queue (`/payments/manual-requests`) and Payment Settings (`/payments/settings`).

---

## 4. Test Verification Evidence

- Test script: `scripts/test-phase-22-categories-payments.js`
- Test run results:
  - **Total Tests**: 42
  - **Passed**: 42
  - **Failed**: 0
  - **Pass Rate**: 100%
- Covered workflows:
  - Public payment settings retrieval and default values.
  - Token packages querying.
  - Admin payment settings updates and persistence.
  - Subscription manual payment request submission with UTR tracking.
  - Duplicate UTR conflict prevention (409 Conflict).
  - Token package manual payment request submission.
  - User manual payment requests query.
  - Rejection validation (fails without reason, succeeds with reason).
  - Approval of subscription payment activating plan and crediting 100 tokens.
  - Approval of token package payment crediting 150 tokens with `PURCHASE` ledger entry.
  - Atomic double review rejection.
  - RBAC security checks.

