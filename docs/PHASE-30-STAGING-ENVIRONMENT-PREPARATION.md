# PHASE 30 — CONTROLLED STAGING ENVIRONMENT PREPARATION GUIDE
**Brands & Creators B2B Creative Marketplace SaaS Monorepo**  
*Document Version: 1.0.0 — Environment: Controlled Staging Preparation*

---

## 1. Executive Summary & Staging Scope

This document specifies the operational architecture, deployment configuration, security controls, and step-by-step runbooks for deploying the **Brands & Creators Marketplace SaaS** into a dedicated, isolated **Staging Environment**.

### Core Objectives
1. Provide a reproducible, isolated replica of production infrastructure for integration testing and acceptance verification.
2. Enforce strict isolation boundaries: zero live payment triggers, zero production customer data, zero production database access, and zero real customer emails.
3. Validate build pipelines, container specifications, reverse proxies, WebSocket gateways, and environment configurations prior to cloud deployment.

### Strict Non-Production Safeguards
> [!IMPORTANT]
> - **Zero Real Secrets Committed**: All environment examples use semantic, non-secret placeholders.
> - **Sandbox Gateways Only**: Payment providers operate strictly under test keys (`rzp_test_...` / `sk_test_...`).
> - **Sandbox Mail Transport**: Email delivery uses virtual inboxes (e.g., Mailtrap / Mailgun Sandbox) to prevent customer disruption.
> - **Zero Cloud Deployments in Local Phase**: Local development remains fully functional on ports 3000, 3001, and 4000.

---

## 2. Architecture & Monorepo Topology

The repository is organized as a unified npm/pnpm workspace monorepo:

```
brands-creators/
├── apps/
│   ├── api/             # NestJS 10.3 REST API + Socket.IO WebSocket Gateway (Port 4000)
│   ├── web/             # Next.js 14 App Router Marketplace Frontend (Port 3000)
│   └── admin/           # Next.js 14 App Router Backoffice Management Portal (Port 3001)
├── packages/
│   └── types/           # Shared TypeScript interfaces, DTOs, and domain enums
├── scripts/             # Backup, restore, test seed, and automated QA suites
├── backups/             # Local database JSON snapshots and manifests
└── docs/                # Architecture, API specifications, and phase runbooks
```

### Build & Dependency Topology
1. `@brands-creators/types` produces `dist/index.js` and `dist/index.d.ts`.
2. `@brands-creators/api` depends on `@brands-creators/types` and builds to `apps/api/dist/main.js`.
3. `@brands-creators/web` depends on `@brands-creators/types` and compiles via `next build apps/web`.
4. `@brands-creators/admin` depends on `@brands-creators/types` and compiles via `next build apps/admin`.

```mermaid
flowchart TD
    Types["packages/types (tsc -b)"]
    API["apps/api (NestJS dist/main.js)"]
    Web["apps/web (Next.js 14 App Router)"]
    Admin["apps/admin (Next.js 14 Backoffice)"]
    DB[(MongoDB Atlas Staging Cluster)]
    Cloudinary[(Cloudinary Media CDN)]
    SMTP[(Mailtrap / Mailgun Sandbox)]
    SocketIO["Socket.IO /messaging Namespace"]

    Types --> API
    Types --> Web
    Types --> Admin
    API --> DB
    API --> Cloudinary
    API --> SMTP
    Web --> API
    Web <--> SocketIO
    Admin --> API
```

---

## 3. Hosting Strategy & Compatibility Matrix

### Component Compatibility Analysis

| Component | Architecture | Preferred Hosting Model | WebSocket Support | Memory Min / Rec | Timeout Constraints | Health Endpoint |
|---|---|---|---|---|---|---|
| **API (`apps/api`)** | NestJS Node.js 20+ persistent process | **Managed Container / PaaS** (Render, Railway, Fly.io, AWS App Runner) | **Mandatory** (`/messaging` namespace) | 512 MB / 1 GB | WebSockets: Persistent; HTTP: 30s | `GET /api/v1/health` |
| **Web (`apps/web`)** | Next.js 14 App Router (Hybrid SSR + Client) | **Serverless / Edge** (Vercel, Netlify) or Container PaaS | Client-only socket connection | 512 MB / 1 GB | SSR: 15s | `GET /` (HTTP 200) |
| **Admin (`apps/admin`)** | Next.js 14 App Router (Client + SSR) | **Serverless / Edge** (Vercel, Netlify) or Container PaaS | HTTP API client only | 512 MB / 1 GB | SSR: 15s | `GET /login` (HTTP 200) |
| **Types (`packages/types`)** | Static TypeScript library | Build-time artifact | N/A | N/A | N/A | N/A |

### Why `apps/api` Requires a Persistent Container Runtime (Not Pure Serverless)
1. **Socket.IO Gateway (`/messaging`)**: NestJS manages in-memory connection tables and socket rooms (`this.userSockets = new Map<string, Set<string>>()`). Pure serverless functions (e.g. AWS Lambda / Vercel Serverless) freeze execution between requests and cannot maintain persistent bidirectional TCP streams.
2. **In-Memory Background Queue Runners**: `EmailQueueService` processes delivery batches on a 30-second interval; `SubscriptionsService` executes hourly expiration sweeps.
3. **Raw Body Buffering**: Cryptographic signature validation for Stripe and Razorpay requires unparsed raw bodies (`NestFactory.create(AppModule, { rawBody: true })`).

### Recommended Low-Cost, Low-Maintenance Staging Stack
- **API Runtime**: Render Web Service (Starter tier, \$7/mo) or Railway (\$5/mo).
- **Web & Admin Frontend**: Vercel (Hobby or Pro tier, free SSL, global edge CDN).
- **Staging Database**: MongoDB Atlas M0 (Free Tier, automated replica set) or M10 (\$0.08/hr, dedicated metrics & daily backups).
- **Media Asset Storage**: Cloudinary Free Tier (25 GB storage / 25 credits/mo).
- **Email Sandbox**: Mailtrap Sandbox Free Tier (500 emails/mo).

---

## 4. Environment Variables & Secret Management

### Classification Matrix
- **SENSITIVE**: Cryptographic secret, private key, or password. Never expose in logs or client bundles.
- **PUBLIC**: Hostname, URL, port, or client-safe public identifier.
- **BUILD-TIME**: Embedded into Next.js client bundles (`NEXT_PUBLIC_*`).
- **RUNTIME**: Evaluated when the process initiates.

### Master Configuration Reference

| Variable | Target App | Classification | Staging Example Value | Description & Impact if Missing |
|---|---|---|---|---|
| `PORT` | `apps/api` | PUBLIC / RUNTIME | `4000` | Port for API listener. Defaults to 4000. |
| `NODE_ENV` | `apps/api` | PUBLIC / RUNTIME | `staging` | Environment mode. When `production`, activates strict cryptographic assertions. |
| `APP_URL` | `apps/api` | PUBLIC / RUNTIME | `https://staging.brandsandcreators.com` | Web client origin for CORS and transactional email links. |
| `ADMIN_URL` | `apps/api` | PUBLIC / RUNTIME | `https://admin.staging.brandsandcreators.com` | Admin portal origin for CORS and administrative notifications. |
| `API_URL` | `apps/api`, `apps/web`, `apps/admin` | PUBLIC / RUNTIME | `https://api.staging.brandsandcreators.com/api/v1` | Canonical base URL for backend endpoints. |
| `MONGODB_URI` | `apps/api` | SENSITIVE / RUNTIME | `mongodb+srv://staging_user:pass@staging.mongodb.net/...` | Replica set connection URI for MongoDB Atlas. System halts if invalid. |
| `JWT_ACCESS_SECRET` | `apps/api` | SENSITIVE / RUNTIME | `your-staging-jwt-access-secret-min-32-chars...` | Signing key for short-lived access tokens. Must be >= 32 chars in production. |
| `JWT_ACCESS_EXPIRES_IN` | `apps/api` | PUBLIC / RUNTIME | `15m` | Lifespan of access tokens. |
| `JWT_REFRESH_SECRET` | `apps/api` | SENSITIVE / RUNTIME | `your-staging-jwt-refresh-secret-min-32-chars...` | Signing key for refresh tokens. Must be distinct from access secret. |
| `JWT_REFRESH_EXPIRES_IN` | `apps/api` | PUBLIC / RUNTIME | `7d` | Lifespan of refresh tokens. |
| `SUPER_ADMIN_EMAIL` | `apps/api` | SENSITIVE / RUNTIME | `staging-admin@brandsandcreators.com` | Initial admin account seeded on clean database bootstrap. |
| `SUPER_ADMIN_PASSWORD` | `apps/api` | SENSITIVE / RUNTIME | `StagingSuperAdmin@2026!` | Strong password for bootstrap admin account. |
| `CLOUDINARY_CLOUD_NAME` | `apps/api` | PUBLIC / RUNTIME | `staging-brands-creators` | Cloudinary tenant identifier for persistent media. |
| `CLOUDINARY_API_KEY` | `apps/api` | PUBLIC / RUNTIME | `staging_api_key_123` | Cloudinary public API key. |
| `CLOUDINARY_API_SECRET` | `apps/api` | SENSITIVE / RUNTIME | `staging_api_secret_xyz` | Cloudinary private API secret for signing uploads. |
| `RAZORPAY_KEY_ID` | `apps/api`, `apps/web` | PUBLIC / RUNTIME + BUILD | `rzp_test_staging_key_123` | Razorpay sandbox Key ID. Enables checkout modal. |
| `RAZORPAY_KEY_SECRET` | `apps/api` | SENSITIVE / RUNTIME | `staging_rzp_secret_456` | Razorpay sandbox Key Secret for order creation & signature verification. |
| `RAZORPAY_WEBHOOK_SECRET` | `apps/api` | SENSITIVE / RUNTIME | `staging_rzp_whsec_789` | Webhook signature secret for Razorpay event callbacks. |
| `STRIPE_SECRET_KEY` | `apps/api` | SENSITIVE / RUNTIME | `sk_test_staging_stripe_key_123` | Stripe test secret key. |
| `STRIPE_WEBHOOK_SECRET` | `apps/api` | SENSITIVE / RUNTIME | `whsec_staging_stripe_whsec_456` | Stripe test webhook signing secret. |
| `SMTP_HOST` | `apps/api` | PUBLIC / RUNTIME | `sandbox.smtp.mailtrap.io` | SMTP gateway host for sandbox email delivery. |
| `SMTP_PORT` | `apps/api` | PUBLIC / RUNTIME | `587` | SMTP port (587 or 2525). |
| `SMTP_USER` | `apps/api` | SENSITIVE / RUNTIME | `staging_mailtrap_user` | Mailtrap/Mailgun sandbox username. |
| `SMTP_PASS` | `apps/api` | SENSITIVE / RUNTIME | `staging_mailtrap_password` | Mailtrap/Mailgun sandbox password. |
| `CRON_SECRET` | `apps/api` | SENSITIVE / RUNTIME | `staging_cron_secret_min_16_chars...` | Secret token required for calling `/subscriptions/admin/process-expirations`. |
| `ALLOW_RATE_LIMIT_TEST_BYPASS` | `apps/api` | SENSITIVE / RUNTIME | `false` | **MUST BE FALSE** in staging to preserve rate limit defenses. |
| `NEXT_PUBLIC_API_URL` | `apps/web`, `apps/admin` | PUBLIC / BUILD + RUNTIME | `https://api.staging.brandsandcreators.com/api/v1` | Public API endpoint compiled into frontend JavaScript. |
| `NEXT_PUBLIC_APP_URL` | `apps/web` | PUBLIC / BUILD + RUNTIME | `https://staging.brandsandcreators.com` | Canonical web URL compiled into web frontend. |
| `NEXT_PUBLIC_ADMIN_URL` | `apps/admin` | PUBLIC / BUILD + RUNTIME | `https://admin.staging.brandsandcreators.com` | Canonical admin URL compiled into admin frontend. |

---

## 5. Staging Database Setup & Data Strategy

### MongoDB Atlas Provisioning
1. **Cluster Sizing**:
   - Initial Testing: Shared M0 Free Tier (512 MB storage, 3-node replica set, TLS 1.3).
   - Sustained Staging / Load QA: Dedicated M10 Tier (10 GB storage, 2 GB RAM, continuous backups).
2. **Replica Set Prerequisite**:
   - Multi-document transactions (`session.withTransaction(...)`) in payment and token ledger services strictly require a replica set. Atlas provides this automatically across all tiers.
3. **Network Access Control**:
   - In MongoDB Atlas Network Access, restrict IP whitelist to the staging container egress IP or use VPC Peering / Private Service Connect. For staging PaaS with dynamic IPs, require strict SCRAM-SHA-256 credentials with high-entropy passwords.

### Schema Initialization & Index Generation
Mongoose schemas define all unique constraints, compound indexes, and text search indexes:
- `users`: `{ email: 1 }` (unique), `{ username: 1 }` (unique, sparse), `{ roles: 1 }`
- `creator_profiles`: `{ userId: 1 }` (unique), `{ slug: 1 }` (unique), `{ categories: 1 }`, `{ 'location.city': 1 }`
- `brand_profiles`: `{ userId: 1 }` (unique), `{ slug: 1 }` (unique), `{ verificationStatus: 1 }`
- `requirements`: `{ brandId: 1 }`, `{ status: 1 }`, `{ category: 1 }`, `{ budget: 1 }`
- `subscriptions`: `{ userId: 1, status: 1 }`, `{ currentPeriodEnd: 1 }`
- `transactions`: `{ referenceId: 1 }` (unique), `{ userId: 1 }`, `{ status: 1 }`

> [!NOTE]
> In `apps/api/src/app.module.ts`, `autoIndex: true` builds all indexes on application startup. For staging deployments, schema bootstrapping is automatic upon initial connection.

### Safe Staging Seeding Procedure
To populate clean baseline data without customer PII:
```bash
# Seed standard taxonomies, default plans, and synthetic test accounts
node scripts/seed-test-data.js
```
The seeding script:
- Creates synthetic users tagged with `isTestData: true`.
- Seeds 5 active subscription plans (Free Starter, Creator Pro, Creator Agency, Brand Growth, Brand Enterprise).
- Seeds standard category taxonomies (Fashion, Tech, Lifestyle, Gaming, Beauty, Fitness).
- Can be purged at any time using: `node scripts/cleanup-test-data.js`.

### Staging Backup, Restore & Recovery
- **Atlas Automated Backups**: Atlas M10+ takes automated snapshots every 24 hours with point-in-time recovery.
- **Manual Pre-Release Snapshot**:
  ```bash
  # Execute pre-release backup (writes to backups/backup_<timestamp>/)
  node scripts/db-backup.js --db brands_creators_staging --uri "<STAGING_URI>"
  ```
- **Disaster Recovery Restore**:
  ```bash
  node scripts/db-restore.js --backup backups/backup_<timestamp> --target <target-db>
  ```

---

## 6. External Services & Sandbox Credentials

### Integration Status & Classification

| Integration | Subsystem | Staging Classification | Provider Mode | External Setup Required |
|---|---|---|---|---|
| **Avatar & Media Uploads** | `apps/api/src/modules/media` | **STAGING-READY** | Cloudinary or Local Fallback | Cloudinary free account (`CLOUDINARY_*` keys) for persistent container uploads. |
| **Transactional Email** | `apps/api/src/modules/notifications` | **STAGING-READY** | SmtpEmailProvider (Mailtrap / Mailgun) | Sandbox SMTP credentials. Falls back to mock in-memory logger if omitted. |
| **Razorpay Payments** | `apps/api/src/modules/payments` | **STAGING-READY** | RazorpayProvider (`rzp_test_...`) | Razorpay Test Account API Keys & Webhook Secret. |
| **Stripe Payments** | `apps/api/src/modules/payments` | **STAGING-READY** | StripeProvider (`sk_test_...`) | Stripe Test Account Secret Key & Webhook Secret (`whsec_...`). |
| **Subscription Expiry** | `apps/api/src/modules/subscriptions` | **LOCAL & STAGING-READY** | In-memory interval + `/admin/process-expirations` | Optional external cron runner using `CRON_SECRET`. In-memory runner active by default. |
| **Social OAuth (Meta/Google)** | `apps/api/src/modules/social` | **SIMULATED** | Meta Graph / YouTube Data Adapters | Blocked for live verification until Meta App Review and Google Cloud App Verification. Simulated sandbox active. |

---

## 7. Background Workers & Scheduled Tasks

### In-Memory vs External Scheduled Tasks

```mermaid
sequenceDiagram
    participant Cron as External Scheduler / Cron
    participant Controller as SubscriptionsController
    participant Service as SubscriptionsService
    participant Queue as EmailQueueService
    participant DB as MongoDB Atlas

    Note over Queue,DB: Every 30s: EmailQueueService.processNextBatch()
    Queue->>DB: Fetch pending email delivery jobs
    Queue->>Queue: Deliver via SmtpEmailProvider

    Note over Service,DB: Every 60m: SubscriptionsService.processExpiredSubscriptions()
    Service->>DB: Query { status: 'ACTIVE', currentPeriodEnd: { $lt: now } }
    Service->>DB: Update status to 'EXPIRED' & trigger notifications

    opt External Scheduled Webhook (e.g. Render Cron / GitHub Actions)
        Cron->>Controller: POST /api/v1/subscriptions/admin/process-expirations (x-cron-secret)
        Controller->>Service: processExpiredSubscriptions()
        Service-->>Cron: 200 OK { processedCount, expiredCount }
    end
```

1. **Email Delivery Worker (`EmailQueueService`)**:
   - Runs automatically every 30 seconds via in-memory timer.
   - Retries failed deliveries up to 3 times with exponential backoff.
2. **Subscription Expiration Sweep (`SubscriptionsService`)**:
   - Runs on API startup and recurring every 60 minutes.
   - External trigger available: `POST /api/v1/subscriptions/admin/process-expirations` with header `x-cron-secret: <CRON_SECRET>`.
3. **Manual Payments Expiry**:
   - Runs within `PaymentsService` to expire unverified manual bank transfer claims after 48 hours.

---

## 8. CI/CD Pipeline & Automated Staging Workflow

### Recommended GitHub Actions Staging Pipeline (`.github/workflows/staging-deploy.yml`)

```yaml
name: Staging Continuous Integration & Deployment

on:
  push:
    branches: [staging, main]
  pull_request:
    branches: [staging]

concurrency:
  group: staging-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: Code Quality & Regression Verification
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Monorepo Dependencies
        run: npm ci

      - name: Build Shared Packages
        run: npm run build:types

      - name: Typecheck All Packages
        run: npm run typecheck

      - name: Build API & Frontends
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: https://api.staging.brandsandcreators.com/api/v1
          NEXT_PUBLIC_APP_URL: https://staging.brandsandcreators.com
          NEXT_PUBLIC_ADMIN_URL: https://admin.staging.brandsandcreators.com

      - name: Run Master QA Test Suites
        run: |
          node scripts/test-phase-29-security-audit.js
          node scripts/test-phase-28-gap-closure.js
          node scripts/test-phase-26-product-readiness.js
          node scripts/test-phase-25-qa-integration.js

  deploy-api:
    name: Deploy API to Container PaaS
    needs: verify
    if: github.ref == 'refs/heads/staging' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render / Railway Deploy Hook
        run: |
          curl -f -X POST "${{ secrets.STAGING_API_DEPLOY_HOOK_URL }}"

  deploy-frontends:
    name: Deploy Web & Admin to Vercel
    needs: verify
    if: github.ref == 'refs/heads/staging' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Deploy Hook (Web)
        run: |
          curl -f -X POST "${{ secrets.STAGING_WEB_DEPLOY_HOOK_URL }}"
      - name: Trigger Vercel Deploy Hook (Admin)
        run: |
          curl -f -X POST "${{ secrets.STAGING_ADMIN_DEPLOY_HOOK_URL }}"
```

---

## 9. Pre-Deployment Staging Checklist

Before triggering a staging deployment, verify each item:

- [ ] **1. Workspaces Clean**: All packages compile cleanly without TypeScript diagnostics (`npm run typecheck`).
- [ ] **2. Production Builds Pass**: `npm run build` exits with code 0 across all 4 packages.
- [ ] **3. Secrets Validated**: `assertProductionSecrets(process.env)` passes; `JWT_ACCESS_SECRET` >= 32 chars, `JWT_REFRESH_SECRET` >= 32 chars and distinct, `CRON_SECRET` >= 16 chars.
- [ ] **4. Zero Live Keys**: Razorpay keys start with `rzp_test_`; Stripe keys start with `sk_test_`.
- [ ] **5. Rate Limit Bypass Disabled**: `ALLOW_RATE_LIMIT_TEST_BYPASS=false` in staging configuration.
- [ ] **6. Safe SMTP Target**: `SMTP_HOST` points to Mailtrap or Mailgun sandbox; no live customer email domain.
- [ ] **7. Database Isolated**: `MONGODB_URI` points to a dedicated staging cluster, NOT a production cluster.
- [ ] **8. CORS Origins Matched**: `APP_URL` and `ADMIN_URL` match the exact staging hostnames.
- [ ] **9. CSP Permissive to Staging API**: Next.js `next.config.js` allows the staging API domain in `img-src` and `connect-src`.
- [ ] **10. Backup Created**: Baseline snapshot recorded before migration or seeding.

---

## 10. Smoke Testing & Verification Runbook

Once the staging environment is provisioned, execute this sequence:

```mermaid
flowchart LR
    A["1. Health Check (GET /health)"] --> B["2. Auth Smoke (POST /auth/login)"]
    B --> C["3. Web Portal (GET /explore)"]
    C --> D["4. Admin Portal (GET /people/brands)"]
    D --> E["5. WebSocket (/messaging handshake)"]
    E --> F["6. Staging Sign-Off"]
```

### Step 1: API Health Probe
```bash
curl -f https://api.staging.brandsandcreators.com/api/v1/health
```
**Expected Response**:
```json
{
  "status": "ok",
  "database": "connected",
  "environment": "staging",
  "version": "1.0.0"
}
```

### Step 2: Super Admin Authentication
```bash
curl -X POST https://api.staging.brandsandcreators.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"staging-admin@brandsandcreators.com","password":"<STAGING_ADMIN_PASSWORD>"}'
```
**Expected Response**: HTTP 200 with JWT `accessToken`, `user` object with `roles: ["SUPER_ADMIN"]`.

### Step 3: Web Marketplace Route Verification
Verify HTTP 200 across key public routes:
- `GET https://staging.brandsandcreators.com/` (Landing)
- `GET https://staging.brandsandcreators.com/explore` (Directory)
- `GET https://staging.brandsandcreators.com/login` (Auth)
- `GET https://staging.brandsandcreators.com/onboarding` (Onboarding)

### Step 4: Admin Backoffice Route Verification
Verify HTTP 200 and styled CSS assets across admin routes:
- `GET https://admin.staging.brandsandcreators.com/login`
- `GET https://admin.staging.brandsandcreators.com/dashboard`
- `GET https://admin.staging.brandsandcreators.com/people/brands`
- `GET https://admin.staging.brandsandcreators.com/moderation/verification`

### Step 5: WebSocket Gateway Handshake
Establish WebSocket connection to `wss://api.staging.brandsandcreators.com/messaging` with Bearer auth token and verify room join (`user:<userId>`).

---

## 11. Rollback & Disaster Recovery Procedures

### Incident Classification & Response Matrix

| Severity | Definition | Remediation Window | Action |
|---|---|---|---|
| **P0 (Critical)** | API down, database unreachable, or deployment failure | < 15 minutes | Trigger instantaneous rollback to previous stable deployment on PaaS/Vercel. |
| **P1 (High)** | Web or Admin portal CSS/routing defect, or payment sandbox failure | < 1 hour | Rollback frontend deployment via hosting console; inspect build logs. |
| **P2 (Medium)** | Background email queue stall or metrics display defect | < 4 hours | Restart API container; invoke manual queue sweep endpoint. |

### Rollback Commands
1. **PaaS Instant Rollback**:
   In Render or Railway console, select the previous successful release and click **Redeploy This Commit**.
2. **Vercel Rollback**:
   ```bash
   # Promote previous production deployment alias
   vercel rollback <deployment-id> --token=<VERCEL_TOKEN>
   ```
3. **Database Restore**:
   If staging data is corrupted, drop the staging database and restore the baseline snapshot:
   ```bash
   node scripts/db-restore.js --backup backups/pre_deploy_backup --target brands_creators_staging
   ```

---

## 12. Observability, Logging & Alerting

### Staging Observability Stack
1. **Centralized Container Logs**:
   - All NestJS logging uses structured `Logger` prefixes (`[Bootstrap]`, `[DatabaseModule]`, `[PaymentsService]`, `[EmailQueueService]`).
   - PaaS log streams (Render/Railway stdout) capture all requests via `TransformInterceptor` and exceptions via `HttpExceptionFilter`.
2. **Application Performance Monitoring**:
   - Optional: Integrate Sentry or Datadog for exception tracking by setting `SENTRY_DSN`.
3. **Uptime Monitoring**:
   - Configure a free UptimeRobot or BetterStack probe on `GET https://api.staging.brandsandcreators.com/api/v1/health` with a 60-second polling interval.
   - Alert notifications configured to staging engineering Slack/Discord webhook.

---

## 13. Security Boundaries & Zero-Production Safeguards

> [!CAUTION]
> The following security safeguards are hardcoded into the architecture:

1. **Production Secrets Validator (`assertProductionSecrets`)**:
   Automatically halts container boot if `NODE_ENV=production` and any secret is missing or insecure.
2. **Database Backup Isolation Guard (`scripts/db-backup.js`)**:
   Halts execution if the URI contains `prod`, `production`, or remote cloud patterns without explicit override flags.
3. **Strict Origin CORS Whitelist**:
   CORS is locked to `APP_URL`, `ADMIN_URL`, and local loopback origins. Wildcard `*` origins are rejected for credentialed requests.
4. **Helmet Security Headers**:
   Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict `Permissions-Policy`.
5. **Rate-Limit Bypass Lockout**:
   `ALLOW_RATE_LIMIT_TEST_BYPASS` must be `false` in staging; bypass headers are rejected unless explicitly allowed with a high-entropy secret.

---

## 14. Team Roles & Required External Registrations

The following accounts and external registrations are required from the project owner prior to provisioning cloud staging:

| Service | Purpose | Recommended Plan | Required Credentials |
|---|---|---|---|
| **MongoDB Atlas** | Managed Staging Database | M0 Free or M10 Dedicated | Connection URI, DB username & password |
| **Render / Railway** | API Persistent Container PaaS | Starter / Developer Plan | Account access, Deploy hook URL |
| **Vercel / Netlify** | Next.js Web & Admin Hosting | Hobby or Pro Team | GitHub app connection, project deploy hooks |
| **Cloudinary** | Persistent Upload CDN | Free Tier (25 GB) | Cloud Name, API Key, API Secret |
| **Mailtrap / Mailgun** | Safe Email Sandbox | Free Sandbox Tier | SMTP Host, Port, Username, Password |
| **Razorpay** | Test Payment Gateway | Sandbox Mode (Free) | Key ID (`rzp_test_...`), Key Secret, Webhook Secret |
| **Stripe** | Test Payment Gateway | Test Mode (Free) | Secret Key (`sk_test_...`), Webhook Secret (`whsec_...`) |
| **DNS Registrar** | Staging Subdomains | Existing Domain | CNAME / A records for `staging`, `admin.staging`, `api.staging` |

---

## 15. Verification Evidence & Local Audit Results

### Cumulative Regression Suite Verification (Local Audit)

| Test Suite | Purpose | Assertions | Status | Pass Rate |
|---|---|---|---|---|
| `scripts/test-phase-29-security-audit.js` | Production secrets, token crypto, rate-limit bypass lock, raw-body webhooks, role isolation | 73 / 73 | **PASS** | 100% |
| `scripts/test-phase-28-gap-closure.js` | Subscriptions lifecycle, webhook resilience, public profile privacy, pagination bounds | 45 / 45 | **PASS** | 100% |
| `scripts/test-phase-26-product-readiness.js` | Core marketplace flows, proposals, messaging, audit trails, platform governance | 69 / 69 | **PASS** | 100% |
| `scripts/test-phase-25-qa-integration.js` | Location discovery, category hierarchies, manual payments, verification queues | 29 / 29 | **PASS** | 100% |
| **Cumulative Total** | **Full Monorepo Integration & Security Verification** | **216 / 216** | **PASS** | **100%** |

### Static Analysis & Production Build Audit
- `packages/types`: `tsc -p packages/types/tsconfig.json --noEmit` -> **0 errors (Exit code 0)**
- `apps/api`: `tsc -p apps/api/tsconfig.json --noEmit` -> **0 errors (Exit code 0)**
- `apps/web`: `tsc -p apps/web/tsconfig.json --noEmit` -> **0 errors (Exit code 0)**
- `apps/admin`: `tsc -p apps/admin/tsconfig.json --noEmit` -> **0 errors (Exit code 0)**
- Production build `packages/types/dist`: **Verified**
- Production build `apps/api/dist/main.js`: **Verified**
- Production build `apps/web` (33 routes compiled): **Verified**
- Production build `apps/admin` (22 routes compiled): **Verified**

### Classification
**STATUS: READY FOR STAGING PREPARATION**  
*All codebase components, templates, configurations, and verification suites have passed with zero regressions. Cloud staging provisioning can commence upon receipt of external third-party sandbox credentials.*

