# PHASE 27 — BUSINESS REQUIREMENTS GAP ANALYSIS

**Project:** Brands & Creators Marketplace SaaS  
**Date:** November 2026  
**Auditor:** Independent Product & Architecture Audit  
**Scope:** Complete Monorepo (`apps/web`, `apps/admin`, `apps/api`, `packages/types`, `docs`, `scripts`)  
**Status:** Audit & Planning Exercise (Strict Isolation: Zero Remote Deployments, Zero Live Dispatches)  

---

## 1. Executive Summary

Phase 27 delivers an independent, evidence-based business requirements gap analysis of the Brands & Creators platform. Evaluating the actual source code, database models, API controllers, and frontend routes against the original architectural specifications reveals:

1. **Core Marketplace Completeness**: The core B2B marketplace loop (authentication, dynamic taxonomies, creator profiles, location discovery, brief posting, proposal submission, workspace auto-creation, deliverable revisions, project completion, and two-way verified reviews) is **fully implemented and verified** in the local environment.
2. **Token Economy & Manual Payments**: The hybrid subscription tier and token economy is operational with strict conditional atomic balance deductions, an immutable directional transaction ledger, administrative reconciliation, segregation of duties, and UTR duplicate prevention.
3. **Intentional Development Boundaries**: Certain third-party integrations (live Razorpay/Stripe webhooks, live external SMTP dispatch, production S3/Cloudinary buckets, Meta/Google OAuth production apps) remain in sandbox/simulated mode as planned.
4. **Targeted Product Gaps Identified**:
   - **Subscription Expiry**: Currently lazy-evaluated on query rather than driven by an active background worker or cron job.
   - **UI Fallbacks**: Falsy checks on public creator profiles (`averageRating || 4.9`, `reviewCount || 24`) cause unreviewed creators to display mock statistics rather than zero/unrated states.
   - **Legacy Onboarding Routes**: Legacy routes (`/onboarding/brand` and `/onboarding/creator`) exist alongside the unified `/onboarding` wizard.

---

## 2. Requirement Traceability Matrix

| # | Business Requirement | Existing Implementation | Relevant Frontend Route | Relevant API Endpoint | Database Model | Evidence / Verification | Status | Remaining Work | Priority |
|---|---|---|---|---|---|---|---|---|---|
| **1** | User Registration & Role Assignment | Multi-role registration supporting `CREATOR`, `BRAND`, `PRODUCTION_TEAM`, `AGENCY`, `ADMIN` | `/register` | `POST /auth/register` | `User`, `CreatorProfile`, `BrandProfile` | `scripts/test-phase-26-product-readiness.js` (Journey A) | **COMPLETE** | None in local development | P1 |
| **2** | Cryptographic Email Verification | Single-use SHA-256 token generation, anti-replay consumption, rate-limited resend | `/verify-email` | `POST /auth/verify-email`, `POST /auth/resend-verification` | `User` (`emailVerificationToken`) | `test-phase-24-verification-inbox.js` | **COMPLETE** | Live SMTP delivery deferred to staging | P1 |
| **3** | Secure Password Recovery | Constant-time anti-enumeration response, single-use token consumption, bcrypt update | `/forgot-password`, `/reset-password` | `POST /auth/forgot-password`, `POST /auth/reset-password` | `User` (`passwordResetTokenHash`) | `test-phase-16-validation.js`, `test-phase-17-product-audit.js` | **COMPLETE** | Live email transport in production | P1 |
| **4** | First-Time User Onboarding | 4-step wizard saving vertical category, headline, company/studio name, structured locality | `/onboarding` | `POST /auth/onboarding/complete` | `User` (`onboardingCompleted`, `selectedCategoryIds`) | `test-phase-26-product-readiness.js` (Journey A) | **COMPLETE** | Deprecate legacy sub-routes | P2 |
| **5** | Unified User Profile Management | Role-specific profile forms (Creator, Brand, Studio, Admin) with partial update preservation | `/profile` | `GET /auth/me`, `PATCH /creators/me`, `PATCH /brands/me`, `PATCH /production-teams/me` | `User`, `CreatorProfile`, `BrandProfile`, `ProductionTeamProfile` | `test-phase-20-profile-integration.js`, `test-phase-26-browser-qa.js` | **COMPLETE** | Fix falsy rating fallback | P2 |
| **6** | Profile Avatar & Media Lifecycle | Local upload, magic bytes inspection (JPEG/PNG/WebP), orphan cleanup, streaming proxy | `/profile` modal | `POST /media/avatar`, `GET /media/avatars/:filename`, `DELETE /media/avatar` | `User` (`avatarUrl`), local disk `uploads/avatars` | `test-phase-20-profile-integration.js` (110 asserts) | **COMPLETE** | S3/Cloudinary bucket toggle in production | P2 |
| **7** | Dynamic Hierarchical Categories | Multi-tier category tree, dynamic custom fields, role targeting via `supportedProfileTypes` | `/categories`, `/marketplace/categories` (admin) | `GET /categories`, `GET /categories/for-role/:role`, `POST /categories` | `Category`, `SubCategory` | `test-phase-23-taxonomy-location.js` | **COMPLETE** | None | P1 |
| **8** | People Directory & Proximity Search | Directory tabs (All, Creators, Studios, Brands), MongoDB `2dsphere` `$nearSphere` proximity | `/people`, `/explore` | `GET /creators/nearby`, `GET /creators`, `GET /production-teams`, `GET /brands` | `CreatorProfile` (`location.geoPoint`), `ProductionTeamProfile` | `test-phase-26-product-readiness.js` (Journey B) | **COMPLETE** | None | P1 |
| **9** | Location Privacy Redaction | Confidential street address lines (`addressLine1`, `addressLine2`, `landmark`) suppressed | `/creators/[slug]`, `/explore` | `GET /creators/:slug`, `GET /creators/nearby` | `CreatorProfile` (`location.isPublicAddress`) | `test-phase-25-qa-integration.js` | **COMPLETE** | None | P0 |
| **10** | Brand Requirements & Campaign Briefs | Brief posting wizard with category ID, budget range, deadlines, deliverables list | `/requirements/new`, `/requirements/create`, `/requirements/[slug]` | `POST /requirements`, `GET /requirements`, `PATCH /requirements/:id/status` | `Requirement` | `test-phase-26-product-readiness.js` (Journey E) | **COMPLETE** | None | P1 |
| **11** | Applications, Proposals & Match Scoring | Structured proposal submission, offered price, 5-factor match score, duplicate guard | `/requirements/[slug]`, `/creator/applications`, `/brand/requirements/[id]/applicants` | `POST /applications`, `GET /applications`, `PATCH /applications/:id/status` | `Application` (`matchScore`) | `test-phase-26-product-readiness.js` (Journey E) | **COMPLETE** | None | P1 |
| **12** | Automatic Project Workspace Creation | Auto-creates collaboration workspace `BC-YYYY-XXXXXX` when proposal is marked ACCEPTED | `/projects/[id]`, `/brand/projects`, `/creator/projects` | `GET /projects`, `GET /projects/:id` | `Project`, `Milestone` | `test-phase-26-product-readiness.js` (Journey F) | **COMPLETE** | None | P1 |
| **13** | Deliverables Versioning & Revision Workflow | Multi-version deliverable submissions (V1, V2), brand revision requests, formal approvals | `/projects/[id]` (Deliverables tab) | `POST /projects/:id/deliverables`, `POST /.../deliverables/:id/submit`, `POST /.../revision`, `POST /.../approve` | `Deliverable` (`versions`) | `test-phase-26-product-readiness.js` (Journey F) | **COMPLETE** | None | P1 |
| **14** | Project Lifecycle & Sign-Off | State machine: `CONFIRMED` -> `IN_PROGRESS` -> `COMPLETED`. Non-brand completion blocked | `/projects/[id]` | `PATCH /projects/:id/status`, `POST /projects/:id/complete` | `Project` (`status`, `completedAt`) | `test-phase-26-product-readiness.js` (Journey F) | **COMPLETE** | None | P1 |
| **15** | Two-Way Verified Reviews | 5-star ratings, qualitative review, multi-criteria ratings, completed project link | `/reviews` (admin) | `POST /reviews`, `GET /reviews` | `Review` | `test-phase-26-product-readiness.js` (Journey F) | **COMPLETE** | Display verified reviews on public profile | P2 |
| **16** | Subscription Plans Catalog & Management | Free Starter (10 tokens), Premium Pro (100 tokens), VIP (1200 tokens). Admin plan editor | `/wallet`, `/subscriptions/plans` (admin) | `GET /subscriptions/plans`, `POST /subscriptions/plans`, `PATCH /subscriptions/plans/:id` | `SubscriptionPlan` | `test-phase-21-subscriptions-tokens.js` | **COMPLETE** | None | P1 |
| **17** | Free Welcome Token Lifetime Limit | One-time claim per account. Repeated claims after cancellation or expiry rejected (400) | `/wallet` | `POST /subscriptions/subscribe-free` | `UserSubscription` | `test-phase-25-qa-integration.js`, `test-phase-26-product-readiness.js` | **COMPLETE** | None | P1 |
| **18** | Token Wallet & Directional Ledger | Real-time balance, atomic conditional spend, single-party directional ledger tracking | `/wallet`, `/tokens` (admin) | `GET /tokens/wallet`, `POST /tokens/spend`, `GET /tokens/ledger` | `TokenWallet`, `TokenLedgerEntry` | `test-phase-21-subscriptions-tokens.js` | **COMPLETE** | None | P1 |
| **19** | Token Valuation & Action Pricing Rules | Configurable reference value (₹10/token) and action costs (`REQUIREMENT_POST`, etc.) | `/tokens` (admin) | `PATCH /tokens/admin/reference-rate`, `PUT /tokens/admin/action-costs` | `TokenPricingRule`, `PlatformSettings` | `test-phase-25-qa-integration.js` | **COMPLETE** | None | P1 |
| **20** | Add-On Token Packages | 4 independent packages (`starter`, `growth`, `power`, `ultimate`) purchasable offline | `/wallet` | `GET /payments/token-packages`, `POST /payments/manual-request` | `TokenWallet`, `ManualPaymentRequest` | `test-phase-22-categories-payments.js` | **COMPLETE** | None | P1 |
| **21** | Manual Payment Verification Queue | Admin review queue for UPI/Bank transfer UTRs, segregation of duties, fulfillment | `/payments/manual-requests` (admin) | `POST /payments/manual-request`, `POST /payments/admin/manual-requests/:id/review` | `ManualPaymentRequest` | `test-phase-26-product-readiness.js` (Journey D) | **COMPLETE** | None | P0 |
| **22** | Subscription Expiry & Renewal | Expiry lazy-checked on query. No proactive background cron worker | `/wallet` | `GET /subscriptions/user/active` | `UserSubscription` (`status`, `expiresAt`) | `subscriptions.service.ts` line 196 | **PARTIAL** | Implement proactive background expiry cron | P1 |
| **23** | Internal Inbox & Message Stream | Split-pane inbox UI, chronological message stream, unread counts, cursor pagination | `/inbox` | `GET /conversations`, `POST /conversations`, `GET /conversations/:id/messages`, `POST /.../messages` | `Conversation`, `Message` | `test-phase-26-product-readiness.js` (Journey G) | **COMPLETE** | None | P1 |
| **24** | Conversation & Room Authorization | Non-participants blocked via REST (403) and WebSocket room join rejected by gateway | `/inbox` | `/messaging` namespace, `/conversations/:id/messages` | `Conversation` (`participants.userId`) | `test-phase-25-qa-integration.js`, `test-phase-26-product-readiness.js` | **COMPLETE** | None | P0 |
| **25** | In-App Notification Center | Real-time notifications over Socket.IO, read tracking, preferences | `/notifications`, `/settings/notifications` | `GET /notifications`, `PATCH /notifications/:id/read` | `Notification` | `test-phase-14-acceptance.js` | **COMPLETE** | None | P2 |
| **26** | Admin Backoffice Governance | User management, categories, payments queue, settings, RFC 4180 CSV audit export | Port 3001 (`/dashboard`, `/system/*`) | `GET /settings`, `PUT /settings/:key`, `GET /audit-logs/export?format=csv` | `PlatformSettings`, `AuditLog` | `test-phase-26-product-readiness.js` (Journey H) | **COMPLETE** | None | P1 |
| **27** | Live Payment Gateway Integration | Razorpay / Stripe providers return simulated order IDs (`order_mock_*`) locally | `/brand/payments` | `POST /payments/create-order`, `POST /payments/verify` | `Payment`, `PaymentWebhook` | Code inspect in `payments/providers/` | **MOCKED / DEFERRED** | Live merchant keys and webhook secret in prod | P2 |
| **28** | Live Social OAuth Sync | Adapters support Instagram Graph API and YouTube Data API v3; report sandbox status | `/profile` (Social tab) | `GET /social/oauth/:platform/url`, `POST /social/oauth/:platform/callback` | `SocialAccount` | Code inspect in `social/adapters/` | **DEFERRED** | Meta & Google developer app review approval | P3 |
| **29** | External SMTP Email Delivery | Durable queue stores records in `email_deliveries`; dispatch is logged to console | `/notifications/deliveries` (admin) | `POST /notifications/cron/deliver` | `EmailDelivery` | Code inspect in `notifications.service.ts` | **DEFERRED** | Configure production SMTP credentials | P1 |
| **30** | Cloud Object Storage CDN | Avatar and deliverable files stored on local disk with reverse-proxy streaming | `/profile`, `/projects/[id]` | `POST /media/avatar`, `GET /media/avatars/:filename` | Disk storage `uploads/avatars` | Code inspect in `media.controller.ts` | **DEFERRED** | Connect AWS S3 / Cloudinary in staging | P2 |

---

## 3. Review of Core Business Rules

### 1. Subscription & Token Configuration Rules
- **Can administrators configure the number of tokens included in each plan?**  
  **YES.** `CreateSubscriptionPlanDto` and `UpdateSubscriptionPlanDto` include `@IsInt() @Min(0) includedTokens: number`. Admin UI (`/subscriptions/plans`) exposes this field directly.
- **Is the token reference value configurable?**  
  **YES.** Admin endpoint `PATCH /tokens/admin/reference-rate` allows updating the INR reference valuation (default ₹10/token).
- **Are add-on tokens independent of subscriptions?**  
  **YES.** Token packages (`starter`, `growth`, `power`, `ultimate`) are purchased via manual payment requests with `targetType: TOKEN_PACKAGE`. They credit tokens directly via `TokenLedgerType.PURCHASE` without requiring an active paid subscription or altering subscription dates.
- **Are token allocations and deductions consistent?**  
  **YES.** All credit and debit mutations pass through `TokensService.creditTokens` and `TokensService.spendTokens`, generating an immutable `TokenLedgerEntry` record with before/after balances.
- **Are subscription expiry and renewal rules explicitly defined?**  
  **PARTIALLY.** While `UserSubscription` defines `startsAt`, `expiresAt`, `durationDays`, and `isAutoRenew: false`, expiry is currently **lazy-evaluated** when a user queries their subscription. An automated background worker (cron) to proactively mark subscriptions `EXPIRED` upon reaching their expiration timestamp is missing.
- **Can payment settings be edited safely?**  
  **YES.** Admin endpoint `PUT /payments/settings` updates UPI ID, bank account details, and display names. It is restricted to `ADMIN` and `SUPER_ADMIN` and validates inputs with DTO constraints.
- **Is manual payment fulfillment idempotent?**  
  **YES.** Review endpoint checks `request.status === PENDING_VERIFICATION`. Approved requests are marked `APPROVED` with `fulfillmentRefId` and cannot be re-reviewed. Token credits pass unique idempotency keys (`man-pay-${requestId}`).
- **Are payment amounts validated against the selected product?**  
  **YES.** `PaymentsService.createManualPaymentRequest` rejects submissions where `amount < plan.price` for subscriptions or `amount < expectedAmount` for token packages (HTTP 400 Bad Request).
- **Are free-plan allocations protected against repeated claims?**  
  **YES.** `SubscriptionsService.subscribeFreePlan` inspects prior user subscription history. If a user previously claimed the free plan and cancelled it, re-claiming throws HTTP 400: *"Free tier welcome tokens can only be claimed once per user account."*

---

## 4. User Experience & Frontend Audit

### 1. Navigation Integrity
- **Marketplace Navbar (`apps/web/components/navbar.tsx`)**: All primary links (`/explore`, `/people`, `/requirements`, `/projects`, `/inbox`) match existing, compiling Next.js routes.
- **User Account Menu (`apps/web/components/user-account-menu.tsx`)**: Renders user avatar, full name, role badge, `/profile`, `/profile?edit=1`, `/dashboard/creator` or `/dashboard/brand`, and Logout.
- **Admin Sidebar (`apps/admin/components/admin-sidebar.tsx`)**: All 16 backoffice links correspond to active routes.

### 2. Form Validation & Data Handling
- **Dynamic Profile Editing (`apps/web/app/profile/page.tsx`)**: Successfully renders role-specific inputs. Saves via `PATCH /creators/me`, `PATCH /brands/me`, or `PATCH /production-teams/me`.
- **Requirement Wizard (`apps/web/app/requirements/create/page.tsx`)**: Multi-step brief creation validates title, budget, categories, deliverables, and deadlines. `/requirements/new` acts as an alias.
- **Application Modal (`apps/web/components/apply-modal.tsx`)**: Validates proposal pitch and offered price; displays truthful server-side error banners.

### 3. Identified UX Defects & Inconsistencies
1. **Falsy Statistics Fallback on Public Profile (`apps/web/app/creators/[slug]/page.tsx`)**:
   - *Issue*: Lines 97–98 declare `averageRating: profileData?.averageRating || 4.9` and `reviewCount: profileData?.reviewCount || 24`.
   - *Impact*: For fresh creators with 0 reviews (`reviewCount === 0`, which is falsy in JavaScript), the page erroneously renders a fake 4.9-star rating with 24 reviews instead of displaying "No reviews yet".
2. **Redundant Legacy Onboarding Sub-Routes**:
   - *Issue*: Routes `/onboarding/brand` and `/onboarding/creator` exist alongside the unified 4-step wizard at `/onboarding`.
   - *Impact*: While compiling, they represent dead code that should be redirected to `/onboarding`.
3. **Empty State Formatting**:
   - *Status*: Most pages feature clear empty states with CTAs. However, `/people` and `/explore` should display a "Clear filters" quick action when search yields 0 results.

---

## 5. Production-Readiness Dependencies Checklist

The following technical dependencies must be addressed prior to any remote staging or production deployment:

### 1. Secrets Management & Environment Configuration
- [ ] Replace default JWT secrets (`jwt.accessSecret`, `jwt.refreshSecret`) with cryptographically secure 256-bit environment variables.
- [ ] Enforce backend fail-fast assertion at startup: prevent boot if running with `NODE_ENV=production` and fallback secret strings.
- [ ] Configure `SESSION_SECRET`, `CRON_SECRET`, and `ADMIN_API_KEY`.

### 2. Database Infrastructure
- [ ] Migrate from local `mongodb://127.0.0.1:27017` to MongoDB Atlas M10+ replica set.
- [ ] Enforce TLS 1.3, SCRAM-SHA-256 authentication, VPC peering, and IP allowlisting.
- [ ] Verify production compound indexes (`users`, `creatorProfiles`, `requirements`, `applications`, `tokenWallets`, `auditLogs`).
- [ ] Configure automated daily Atlas snapshots and Point-in-Time Recovery (PITR).

### 3. External Service Providers
- [ ] **Email Delivery**: Integrate transactional SMTP provider (Postmark / SendGrid / Amazon SES) into `EmailQueueService`. Configure SPF, DKIM, and DMARC DNS records.
- [ ] **Payment Gateways**: Obtain live merchant credentials for Razorpay and Stripe. Configure HTTPS webhook endpoints and capture raw request buffers for HMAC-SHA256 signature verification.
- [ ] **Media & Storage**: Configure production Cloudinary account or AWS S3 / Cloudflare R2 bucket with signed upload policies to offload media from local disk.
- [ ] **Push Notifications**: Generate production VAPID key pairs for Web Push notifications.

### 4. Operational & Observability Controls
- [ ] Structure application logging (Pino/Winston) for ingestion into Datadog, Grafana Loki, or AWS CloudWatch.
- [ ] Integrate Sentry for client-side and server-side exception tracking.
- [ ] Deploy Cloudflare Edge WAF in front of Next.js and NestJS domains for DDoS absorption and global caching.
- [ ] Set up uptime monitoring and synthetic health check probes on `/api/v1/health`.

---

## 6. Prioritized Remaining Work (P0 through P3)

### Priority P0 — Critical Security & Integrity (Pre-Deployment Blocker)
- **P0.1: Production Secret Fail-Fast Guard**: Add an application bootstrap check in `apps/api/src/main.ts` ensuring the API will not boot in production if default dev secret strings are detected.
- **P0.2: Webhook Raw-Body Verification**: Ensure NestJS preserves raw request buffers on webhook endpoints (`/payments/webhook/*`) to guarantee HMAC signature verification integrity.

### Priority P1 — Required Core Marketplace Capabilities
- **P1.1: Automated Subscription Expiry Background Worker**: Implement a scheduled task (`@Cron('0 * * * *')`) or external cron hook to transition subscriptions with `expiresAt < now` from `ACTIVE` to `EXPIRED` and trigger user notifications.
- **P1.2: Production SMTP Transport Integration**: Connect a real Nodemailer SMTP transport to `EmailQueueService` for external delivery of verification and password reset emails.
- **P1.3: Verified Reviews Showcase on Public Profiles**: Render verified project reviews directly on public creator profiles (`/creators/[slug]`) and brand profiles (`/brands/[slug]`).

### Priority P2 — Usability & Operational Improvements
- **P2.1: Fix Falsy Rating Fallbacks**: In `apps/web/app/creators/[slug]/page.tsx`, check `typeof profileData?.reviewCount === 'number'` rather than using falsy `|| 24` fallbacks.
- **P2.2: Redirect Legacy Onboarding Sub-Routes**: Have `/onboarding/brand` and `/onboarding/creator` redirect cleanly to `/onboarding`.
- **P2.3: People Directory Filter Reset Affordance**: Add a one-click "Reset all filters" button on `/people` and `/explore` when query results are empty.

### Priority P3 — Optional Enhancements & Long-Term Integrations
- **P3.1: Social OAuth App Review Verification**: Complete Meta Developer App Review and Google Cloud OAuth verification for automated live social metrics sync.
- **P3.2: Direct Cloud Storage Upload Toggle**: Add an environment toggle allowing direct client-to-S3/Cloudinary pre-signed uploads.

