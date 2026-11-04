# BRANDS & CREATORS — PHASE 06 ARCHITECTURE SPECIFICATION
## Payments, Transactions, Reviews & Reputation

---

### 1. Payment Architecture
The commercial engine of Brands & Creators is built on a server-authoritative, idempotent, and provider-agnostic financial architecture. The backend enforces strict authorization, ensuring that frontend clients cannot declare or manipulate financial transactions or payment states.

#### Core Principles:
- **Zero Frontend Financial Authority:** Only backend services calculate amounts, taxes, platform commissions, and professional payouts. Frontend attempts to mutate payment amounts are strictly ignored.
- **Provider Abstraction:** Unified `IPaymentProvider` interface enables pluggable payment gateways (primary: Razorpay, prepared: Stripe).
- **Append-Oriented Financial Ledger:** Transactions are immutable financial ledger records. Financial mutations are never deleted or silently modified. (Note: This is an append-only transaction history and audit log; it is not double-entry general ledger accounting).
- **State Machine Integrity:** Payment orders follow a deterministic state machine: `PENDING` → `ORDER_CREATED` → `PAYMENT_PROCESSING` → `PAID`, with branching for `FAILED`, `CANCELLED`, `PARTIALLY_REFUNDED`, and `REFUNDED`.

---

### 2. Provider Abstraction
Located at `apps/api/src/modules/payments/payment-provider.interface.ts`:

```typescript
export interface IPaymentProvider {
  createOrder(params: CreateProviderOrderParams): Promise<ProviderOrderResult>;
  verifyPayment(params: VerifyProviderPaymentParams): Promise<boolean>;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean;
  processRefund(params: ProcessRefundParams): Promise<RefundResult>;
}
```

This interface guarantees that the business domain logic (`PaymentsService`) remains decoupled from gateway-specific APIs, SDKs, or response structures.

---

### 3. Razorpay Integration
Located at `apps/api/src/modules/payments/providers/razorpay.provider.ts`:
- **Server-Side Order Creation:** Orders are created with integer minor units (paise for INR: 1 INR = 100 paise) using official Razorpay APIs with deterministic order receipt mapping (`PAY-YYYY-XXXXXX`).
- **Signature Verification:** Uses Node.js `crypto.createHmac('sha256', keySecret)` with `crypto.timingSafeEqual`. A buffer length guard prevents timing attacks and prevents `RangeError` on mismatched signature lengths.
- **Order ID Validation:** Server strictly verifies that the order ID submitted for verification matches the `providerOrderId` registered on the server-side payment document. Mismatched order IDs are rejected.
- **Webhook Signature:** Webhook events verify `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET` with raw body support to prevent JSON serialization mutations.

---

### 4. Payment Lifecycle
1. **Order Initiation (`POST /payments/projects/:projectId/order`):**
   - Authorized Brand initiates payment order.
   - Backend derives authorized amount strictly from project approved budget (`project.budget.approvedAmount` or `offeredPrice`).
   - Platform commission (configured at 5%, bounded between 0% and 100%) and professional net amount (95%) are calculated deterministically.
   - Initial payment document created with status `ORDER_CREATED`.
2. **Provider Verification (`POST /payments/razorpay/verify`):**
   - Brand submits gateway payment ID, order ID, and signature.
   - Requesting user authorization verified (must be paying Brand or Admin).
   - Provider verifies signature cryptographically.
   - Payment status transitions to `PAID` with `paidAt` timestamp.
   - Payout record created for Creator in `PENDING` state.
   - Notifications and Project Activity logged.
3. **Webhook Reconciliation (`POST /payments/webhooks/razorpay`):**
   - Server-to-server gateway confirmation acts as the authoritative truth.
   - Handled with idempotency check against `paymentWebhooks` collection.
   - Pre-condition transitions verified: only transitions from `ORDER_CREATED`, `PENDING`, or `PAYMENT_PROCESSING`.
   - Amount consistency checked in minor units (paise).

---

### 5. Transaction Ledger
Located at `apps/api/src/modules/payments/schemas/transaction.schema.ts`:
- Every financial movement generates an immutable transaction in `transactions`.
- Human-readable sequential ID: `TXN-YYYY-XXXXXX`.
- Supports directions: `CREDIT` and `DEBIT`.
- Types:
  - `PAYMENT`: Brand project escrow capture.
  - `PLATFORM_FEE`: Marketplace commission.
  - `PROFESSIONAL_PAYOUT`: Creator earnings release.
  - `REFUND`: Brand refund credit.
  - `ADJUSTMENT`: Accounting reconciliations.
- **Nature of Ledger:** Append-only transaction audit trail. Not general ledger double-entry accounting with dual-sided asset/liability balancing.

---

### 6. Payout Model
Located at `apps/api/src/modules/payments/schemas/payout.schema.ts`:
- Sequential ID: `PO-YYYY-XXXXXX`.
- **Status Lifecycle:** `PENDING` → `PROCESSING` → `COMPLETED` / `FAILED` / `CANCELLED`.
- **Safety Rule:** Real money is NEVER automatically marked as completed unless an authorized, audited payout provider/banking gateway has settled the transfer. Initial settlement sets payout status to `PENDING`.
- **Earnings Isolation:** Creators can only view their own payouts and net earnings. Cross-tenant queries return 0 items.

---

### 7. Refund Architecture
Located at `POST /payments/:id/refund`:
- Authorized Brand or Admin can request full or partial refunds.
- Validation checks:
  - Payment must be in `PAID` or `PARTIALLY_REFUNDED` status.
  - Cumulative refunded amount cannot exceed captured total amount.
  - Failed or refunded payments cannot be refunded again.
  - Atomic conditional update (`$expr: { $lte: [{ $add: ['$refundAmount', refundAmount] }, '$totalAmount'] }`) guards against concurrent race conditions.
  - Provider refund execution verified before database persistence.
- Generates `REFUND` ledger transaction and updates payment status to `PARTIALLY_REFUNDED` or `REFUNDED`.

---

### 8. Commission Model
- Platform fee percentage is managed centrally via `PlatformSettings` service (`PLATFORM_COMMISSION_PERCENTAGE: 5`).
- Strictly bounded: `Math.min(100, Math.max(0, value))`.
- Never hardcoded on client or in ad-hoc calculations.
- Example:
  - Approved Project Budget: ₹85,000 (8,500,000 paise)
  - Platform Fee (5%): ₹4,250 (425,000 paise)
  - Professional Net Amount: ₹80,750 (8,075,000 paise)

---

### 9. Webhook Processing & 10. Idempotency
Located at `apps/api/src/modules/payments/schemas/payment-webhook.schema.ts`:
- Idempotency is enforced through MongoDB compound unique index on `{ provider: 1, eventId: 1 }`.
- Duplicate webhook payloads receive immediate `{ status: 'already_processed' }` without duplicating transactions, notifications, or payout records.

---

### 11. Security
- **Cross-Tenant Isolation:** Brands cannot view other brands' payments or transactions. Creators cannot access counterparty payout details.
- **Secret Redaction:** `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `STRIPE_SECRET_KEY` are never returned in REST responses or logged in audit records.
- **Timing-Safe Equivalence:** HMAC signature checks use `crypto.timingSafeEqual` with buffer length validation.

---

### 12. Review Architecture & 13. Reputation
Located at `apps/api/src/modules/reviews/`:
- **Eligibility:**
  - Project must have `status === COMPLETED`.
  - Reviewer and reviewee must be verified project participants (Brand ↔ Creator).
  - Self-reviews and unrelated third-party reviews are strictly rejected (403 Forbidden).
  - Unique compound index `{ projectId: 1, reviewerId: 1, revieweeId: 1 }` prevents duplicate reviews.
- **Verified Project Badge:** `verifiedProject: true` is server-enforced; cannot be submitted or altered by client.
- **Reputation Signals:**
  - `averageRating` (rounded to 1 decimal place, e.g. 5.0★)
  - `totalReviews` (published reviews count)
  - `verifiedReviews` count
  - `completedProjects` count
  - `ratingDistribution` breakdown (1-5 stars)
  - `criteriaBreakdown` (quality, communication, timeliness, professionalism, value)
  - Moderated reviews (`HIDDEN` or `REMOVED`) are strictly excluded from public rating and reputation counters.

---

### 14. Admin Financial Controls & Review Moderation
- **Routes:**
  - `GET /payments`: Global payments overview with status and date filtering.
  - `GET /transactions`: Global financial ledger audit.
  - `GET /payouts`: Payout ledger and settlement monitoring.
  - `GET /admin/reviews`: All marketplace reviews with moderation statuses.
  - `PATCH /admin/reviews/:id/status`: Admin moderation action (`PUBLISHED`, `HIDDEN`, `REMOVED`, `FLAGGED`).
  - `GET /admin/reviews/reports` & `PATCH /admin/reviews/reports/:id/resolve`: Dispute resolution workflow.
- **RBAC:** Regular users cannot access financial ledgers or review moderation endpoints (403 Forbidden).

---

### 15. MongoDB Indexes
- `payments`: `{ paymentNumber: 1 }` (unique), `{ projectId: 1 }`, `{ brandId: 1 }`, `{ professionalId: 1 }`, `{ status: 1 }`
- `transactions`: `{ transactionNumber: 1 }` (unique), `{ paymentId: 1 }`, `{ projectId: 1 }`, `{ status: 1 }`
- `payouts`: `{ payoutNumber: 1 }` (unique), `{ professionalId: 1 }`, `{ projectId: 1 }`, `{ status: 1 }`
- `paymentWebhooks`: `{ provider: 1, eventId: 1 }` (unique compound)
- `reviews`: `{ projectId: 1, reviewerId: 1, revieweeId: 1 }` (unique compound), `{ revieweeId: 1, status: 1 }`
- `reviewReports`: `{ reviewId: 1 }`, `{ status: 1 }`

---

### 16. Database Transaction & Recovery Strategy
- MongoDB multi-document transactions (`session.withTransaction()`) require a replica set topology.
- When running in single-node/standalone development modes where transactions are unsupported by the engine, consistency is maintained via:
  1. Atomic conditional updates (`findOneAndUpdate` with `$expr`).
  2. Sequential idempotent steps where retries produce deterministic states.
  3. Unique compound index constraints preventing duplicate entries.

---

### 17. Environment Variables
- `RAZORPAY_KEY_ID`: Razorpay API public key ID
- `RAZORPAY_KEY_SECRET`: Razorpay API secret key
- `RAZORPAY_WEBHOOK_SECRET`: Razorpay webhook signature secret
- `STRIPE_SECRET_KEY`: Stripe API secret key (future)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret (future)

---

### 18. Known Limitations & Gateway Testing Status
- **Live Provider Testing:** NOT VERIFIED with live financial transactions (Razorpay sandbox test mode utilized with simulated cryptographic HMAC-SHA256 signatures).
- **Automated Banking Payouts:** Bank account/UPI disbursements via RazorpayX or bank rails require live production business KYC. Payout records are staged in `PENDING` state on the marketplace ledger.
- **Stripe Provider:** Prepared via `IPaymentProvider` abstraction; live Stripe checkout requires live Stripe credentials in `.env`.
