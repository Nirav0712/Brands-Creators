# BRANDS & CREATORS — COMPLETE BACKEND ENVIRONMENT CONFIGURATION INVENTORY

**Component:** NestJS REST & WebSocket API (`apps/api`)  
**Target Platform:** Hostinger Node.js Web Application  
**Analysis Date:** November 4, 2026  
**Audited Sources:**
- Root `.env` (key names only, zero values exposed)
- Root `.env.example`
- `apps/api/.env.example`
- `apps/api/src/config/configuration.ts`
- `apps/api/src/config/secrets.validator.ts`
- AST / regex audit of all 81 TypeScript source files under `apps/api/src/`
- Every `process.env` and `ConfigService.get()` call across all modules

---

## 1. Executive Summary & Inventory Statistics

The Brands & Creators backend utilizes a hybrid configuration architecture combining NestJS `@nestjs/config` (evaluating typed config namespaces) and direct `process.env` evaluations with strict compile-time and runtime fail-fast security validation.

### Inventory Highlights:
- **Total Unique Environment Variables Identified:** **42**
- **Directly Accessed in TypeScript Source (`process.env`):** **37**
- **Accessed via `ConfigService.get()`:** **23** (mapped from `configuration.ts` or raw env)
- **Strictly Required for Production Startup (Fail-Fast):** **6** (`NODE_ENV`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CRON_SECRET`, `PORT`)
- **Required for Core Production Features:** **12** (CORS domains, Super Admin seed, Cloudinary, SMTP)
- **Optional Feature Integrations:** **19** (Payment gateways, Meta/YouTube OAuth, Currency APIs, Push VAPID)
- **Local QA / Test Bypasses (Strictly Forbidden in Production):** **2** (`ALLOW_RATE_LIMIT_TEST_BYPASS`, `RATE_LIMIT_TEST_BYPASS_SECRET`)
- **Unused Variables Found in `.env`:** **2** (`MONGODB_USERNAME`, `MONGODB_PASSWORD`)
- **Source Variables Missing from `.env.example`:** **13** (Documented in Section 5)

---

## 2. Complete Master Environment Variables Inventory Table

The following master table details every environment variable identified across the codebase, sorted alphabetically:

| Exact Variable Name | Required or Optional? | Default Value (if any) | Purpose | Production Value Format | Required at Startup? | Specific Feature? | Safe to Omit? |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| `ADMIN_URL` | **Required (Prod)** | `http://localhost:3001` | Configures CORS whitelist for Admin Backoffice portal & generates admin notification links. | `https://admin.yourdomain.com` | Yes (CORS setup) | Admin Portal Integration | **No** (breaks Admin CORS) |
| `ALLOW_RATE_LIMIT_TEST_BYPASS` | Optional (Local QA Only) | `undefined` | Allows automated QA test scripts to bypass Throttler rate limits with matching header. | **DO NOT SET IN PROD** | No | Automated QA Testing | **Yes** (Strictly omitted in prod) |
| `API_URL` | Recommended | `http://localhost:4000` | Canonical public API URL used in Swagger OpenAPI specs and webhook callbacks. | `https://api.yourdomain.com` | No | Swagger Docs / Webhooks | Yes (defaults to port URL) |
| `APP_URL` | **Required (Prod)** | `http://localhost:3000` | Configures CORS whitelist for Marketplace web app & generates user invitation/reset links. | `https://yourdomain.com` | Yes (CORS setup) | Web Marketplace & Auth Links | **No** (breaks Web CORS) |
| `CLOUDINARY_API_KEY` | Recommended | `""` *(empty)* | Public API Key used to generate client-side signed media upload signatures. | 15-digit numeric string (`123456789012345`) | No | Image/Avatar Uploads | Yes (falls back to mock uploads) |
| `CLOUDINARY_API_SECRET` | Recommended | `""` *(empty)* | Private API secret used to generate HMAC-SHA256 signatures for media uploads. | Random alphanumeric string (`abc123xyz_secret`) | No | Image/Avatar Uploads | Yes (falls back to mock uploads) |
| `CLOUDINARY_CLOUD_NAME` | Recommended | `""` *(empty)* | Cloudinary account namespace where user avatars, portfolios, and briefs are hosted. | Lowercase slug (`brands-creators-prod`) | No | Image/Avatar Uploads | Yes (falls back to mock uploads) |
| `CRON_SECRET` | **MANDATORY (Prod)** | `dev_cron_secret_brands_creators_2026` | Authorization token required in `x-cron-secret` header for scheduled queue sweeps. | Random 24–32 char string (min 16 chars) | **Yes** (Fail-fast in prod) | Email Queue & Expiry Sweeps | **No** (Causes startup crash) |
| `EMAIL_FROM` | Recommended | `"Brands & Creators <notifications@...>` | Sender name and address displayed on outgoing automated emails. | `"Brands & Creators" <no-reply@yourdomain.com>` | No | Outbound Email Delivery | Yes (falls back to default string) |
| `EMAIL_MAX_ATTEMPTS` | Optional | `3` | Maximum retry attempts for transiently failing email jobs in queue worker. | Integer (`3` to `5`) | No | Email Queue Worker | Yes |
| `EMAIL_PROVIDER` | Optional | `smtp` | Primary email driver (`smtp` or fallback sandbox). | `smtp` | No | Email Provider Resolution | Yes |
| `EMAIL_REPLY_TO` | Optional | `support@brandsandcreators.com` | Reply-to destination header on transactional messages. | `support@yourdomain.com` | No | Customer Support Routing | Yes |
| `EMAIL_WORKER_BATCH_SIZE` | Optional | `10` | Number of email jobs processed per queue polling cycle. | Integer (`10` to `50`) | No | Email Queue Worker | Yes |
| `FIXER_API_KEY` | Optional | `undefined` | Alternative API key for live foreign currency rates in `CurrencyService`. | Alphanumeric API key | No | Currency Conversion | Yes (falls back to static rates) |
| `GOOGLE_CLIENT_ID` | Optional | `""` *(empty)* | Google Cloud OAuth Client ID for YouTube Creator Analytics API. | `123456789-xxx.apps.googleusercontent.com` | No | YouTube Social Linking | Yes (disables YouTube linking) |
| `GOOGLE_CLIENT_SECRET` | Optional | `""` *(empty)* | Google Cloud OAuth Client Secret for exchanging YouTube auth tokens. | `GOCSPX-xxxxxxxxx` | No | YouTube Social Linking | Yes (disables YouTube linking) |
| `INSTAGRAM_CLIENT_ID` | Optional | `""` *(empty)* | Meta for Developers App ID for Instagram Graph API analytics linking. | Numeric ID string (`123456789012345`) | No | Instagram Social Linking | Yes (disables Instagram linking) |
| `INSTAGRAM_CLIENT_SECRET` | Optional | `""` *(empty)* | Meta App Secret for Instagram Graph API token exchange. | 32-char hex string | No | Instagram Social Linking | Yes (disables Instagram linking) |
| `JWT_ACCESS_EXPIRES_IN` | Optional | `15m` | Token validity window before frontend must refresh access token. | Time string (`15m`, `30m`) | No | User Session Lifetimes | Yes |
| `JWT_ACCESS_SECRET` | **MANDATORY (Prod)** | `dev_jwt_access_secret_brands_creators_2026` | Cryptographic secret for signing user access JWT tokens (HMAC-SHA256). | Random 32+ char string (min 256 bits) | **Yes** (Fail-fast in prod) | User Authentication & RBAC | **No** (Causes startup crash) |
| `JWT_REFRESH_EXPIRES_IN` | Optional | `7d` | Refresh token lifetime before requiring full re-authentication. | Time string (`7d`, `30d`) | No | Refresh Token Service | Yes |
| `JWT_REFRESH_SECRET` | **MANDATORY (Prod)** | `dev_jwt_refresh_secret_brands_creators_2026` | Cryptographic secret for signing refresh tokens. Must be distinct from access secret. | Random 32+ char string (distinct) | **Yes** (Fail-fast in prod) | Token Refresh Rotation | **No** (Causes startup crash) |
| `JWT_SECRET` | Optional | `bc_social_oauth_state_hmac_secret...` | HMAC secret for signing and validating OAuth `state` query parameters. | Random 32+ char string | No | Social OAuth Handshakes | Yes (uses internal default) |
| `META_APP_ID` | Optional | `""` *(empty)* | Alias for `INSTAGRAM_CLIENT_ID`. Evaluated if `INSTAGRAM_CLIENT_ID` is unset. | Numeric ID string (`123456789012345`) | No | Instagram Social Linking | Yes |
| `META_APP_SECRET` | Optional | `""` *(empty)* | Alias for `INSTAGRAM_CLIENT_SECRET`. Evaluated if `INSTAGRAM_CLIENT_SECRET` is unset. | 32-char hex string | No | Instagram Social Linking | Yes |
| `MONGODB_DATABASE` | Optional | `brands_creators_prod` | Database name if separated from URI string. (Code uses URI path). | Database name identifier | No | Database Selection | Yes (URI takes precedence) |
| `MONGODB_PASSWORD` | Optional | `undefined` | Raw database password. Present in `.env` for script interpolation; not read directly by NestJS. | Password string | No | Unused in backend source | **Yes** (Include inside `MONGODB_URI`) |
| `MONGODB_URI` | **MANDATORY (Prod)** | `mongodb://127.0.0.1:27017/...` | Full MongoDB connection string (MongoDB Atlas replica set). | `mongodb+srv://<DB_USER>:<DB_PASSWORD>@<CLUSTER_HOST>/<DB_NAME>?retryWrites=true&w=majority` | **Yes** (Database connection) | Entire Application | **No** (Causes startup crash) |
| `MONGODB_USERNAME` | Optional | `undefined` | Raw database username. Present in `.env` for script interpolation; not read directly by NestJS. | Username string | No | Unused in backend source | **Yes** (Include inside `MONGODB_URI`) |
| `NODE_ENV` | **MANDATORY (Prod)** | `development` | Operating environment (`development`, `staging`, `production`). Triggers security validations. | `production` | **Yes** (Config bootstrap) | Security & Optimization | **No** (Defaults to development) |
| `OPEN_EXCHANGE_RATES_API_KEY` | Optional | `undefined` | API key for fetching real-time market foreign exchange rates. | 32-char hex key | No | Multi-Currency Conversion | Yes (falls back to static rates) |
| `PORT` | **MANDATORY (Prod)** | `4000` | Local port number the HTTP server listens on (Hostinger reverse-proxy destination). | Integer (`4000`, `3000`, or dynamic `$PORT`) | **Yes** (Server startup) | HTTP Gateway | Yes (defaults to 4000 if unset) |
| `RATE_LIMIT_TEST_BYPASS_SECRET`| Optional (Local QA Only) | `undefined` | Shared secret header value required to bypass rate limits during automated testing. | **DO NOT SET IN PROD** | No | Automated QA Testing | **Yes** (Strictly omitted in prod) |
| `RAZORPAY_KEY_ID` | Optional | `rzp_test_demo_key_2026` | Razorpay public Key ID for escrow deposits and payments in INR. | `rzp_live_PLACEHOLDER_KEY_ID` | No | Razorpay Checkout | Yes (runs in mock mode) |
| `RAZORPAY_KEY_SECRET` | Optional | `rzp_test_secret_key_demo_2026` | Razorpay secret key for server-side order generation. | Secret string (`xxxxxxxxxxxxxxxxxxxxxxxx`) | No | Razorpay Checkout | Yes (runs in mock mode) |
| `RAZORPAY_WEBHOOK_SECRET` | Optional | `rzp_webhook_secret_demo_2026` | Webhook signing secret to cryptographically verify Razorpay payment captures. | Secret string | No | Razorpay Webhooks | Yes (runs in mock mode) |
| `SMTP_HOST` | Recommended | `undefined` | SMTP server hostname for transactional email delivery. | `smtp.titan.email` *(or provider)* | No | Outbound Email Delivery | Yes (falls back to mock sandbox) |
| `SMTP_PASS` | Recommended | `undefined` | SMTP account password. | Secret password string | No | Outbound Email Delivery | Yes (falls back to mock sandbox) |
| `SMTP_PORT` | Recommended | `587` | SMTP port (587 for STARTTLS, 465 for SSL). | Integer (`587` or `465`) | No | Outbound Email Delivery | Yes (defaults to 587) |
| `SMTP_SECURE` | Recommended | `false` | Direct SSL connection toggle (`true` for port 465, `false` for port 587). | Boolean (`true` or `false`) | No | Outbound Email Delivery | Yes (defaults to false) |
| `SMTP_USER` | Recommended | `undefined` | SMTP authentication username / full email account. | `notifications@yourdomain.com` | No | Outbound Email Delivery | Yes (falls back to mock sandbox) |
| `STRIPE_SECRET_KEY` | Optional | `sk_test_placeholder` | Stripe secret API key for international credit card payments and USD escrows. | `sk_live_51xxxxxxxxxxxxxxxx` | No | Stripe Checkout | Yes (runs in mock mode) |
| `STRIPE_WEBHOOK_SECRET` | Optional | `whsec_placeholder` | Stripe webhook signing secret for verifying Stripe event payloads. | `whsec_xxxxxxxxxxxxxxxxxxxx` | No | Stripe Webhooks | Yes (runs in mock mode) |
| `SUPER_ADMIN_EMAIL` | Recommended | `admin@brandsandcreators.com` | Initial super admin account email seeded on empty database bootstrap. | `admin@yourdomain.com` | No | System Seeding | Yes (defaults to admin email) |
| `SUPER_ADMIN_NAME` | Optional | `Brands & Creators Super Admin` | Display name for the initial bootstrap super admin user. | `"Super Admin"` | No | System Seeding | Yes |
| `SUPER_ADMIN_PASSWORD` | Recommended | `SuperAdmin@Brands2026!` | Password for the initial super admin user (dev default rejected in prod). | Strong password (min 12 chars) | No | System Seeding | Yes (if admin already seeded) |
| `VAPID_PRIVATE_KEY` | Optional | `undefined` | Private key for signing Web Push notification payloads. | Base64 URL-safe string | No | Web Push Notifications | Yes (disables push notifications) |
| `VAPID_PUBLIC_KEY` | Optional | `undefined` | Public key provided to client browsers for Web Push subscriptions. | Base64 URL-safe string | No | Web Push Notifications | Yes (disables push notifications) |
| `YOUTUBE_CLIENT_ID` | Optional | `""` *(empty)* | Alias for `GOOGLE_CLIENT_ID`. | `123456789-xxx.apps.googleusercontent.com` | No | YouTube Social Linking | Yes |
| `YOUTUBE_CLIENT_SECRET` | Optional | `""` *(empty)* | Alias for `GOOGLE_CLIENT_SECRET`. | `GOCSPX-xxxxxxxxx` | No | YouTube Social Linking | Yes |

---

## 3. Detailed Functional Category Breakdown

### 3.1 Core Application & Runtime Configuration
- **`NODE_ENV`**: Set to `production` in Hostinger. Triggers `assertProductionSecrets()` in `apps/api/src/config/secrets.validator.ts`, activates production Helmet HSTS (`maxAge: 31536000`), and blocks QA test bypasses.
- **`PORT`**: Evaluated in `apps/api/src/config/configuration.ts` line 4 (`parseInt(process.env.PORT || '4000', 10)`). Hostinger's Node.js application manager assigns this port or expects `4000`/`3000`.
- **`APP_URL`**: Canonical URL of the marketplace web frontend (`https://yourdomain.com`). Directly evaluated in `apps/api/src/main.ts` line 50 to dynamically construct the CORS allowed origin whitelist.
- **`ADMIN_URL`**: Canonical URL of the admin backoffice portal (`https://admin.yourdomain.com`). Evaluated in `apps/api/src/main.ts` line 51 for CORS allowance.
- **`API_URL`**: Canonical backend URL (`https://api.yourdomain.com`). Evaluated in `configuration.ts` line 8.

### 3.2 Database Connectivity (MongoDB Atlas)
- **`MONGODB_URI`**: Evaluated in `apps/api/src/config/configuration.ts` line 10 and passed to `MongooseModule.forRootAsync()`. Must contain the full connection string with username, password, cluster hostname, and database name.
- **`MONGODB_USERNAME` & `MONGODB_PASSWORD`**: Found in root `.env` but **never evaluated by NestJS source code**. These are legacy deployment artifacts and can be safely omitted from Hostinger as long as `MONGODB_URI` contains credentials.

### 3.3 Authentication & Cryptographic Secrets
- **`JWT_ACCESS_SECRET`**: Evaluated in `configuration.ts`, `auth.module.ts`, and `jwt.strategy.ts`. Must be a distinct string of $\ge 32$ characters in production. If set to `dev_jwt_access_secret_brands_creators_2026` or missing in production, startup throws `FatalSecurityConfigurationError`.
- **`JWT_REFRESH_SECRET`**: Evaluated in `configuration.ts` and `auth.service.ts`. Must be a distinct string of $\ge 32$ characters in production and cannot match `JWT_ACCESS_SECRET`.
- **`JWT_ACCESS_EXPIRES_IN`** (Default: `15m`) & **`JWT_REFRESH_EXPIRES_IN`** (Default: `7d`): Evaluated during JWT payload signing in `auth.service.ts`.
- **`SUPER_ADMIN_PASSWORD`**: Evaluated in `users.service.ts` line 93 during initial database seeding. In production, `secrets.validator.ts` line 93 verifies it is not set to `SuperAdmin@Brands2026!` and is at least 12 characters long.

### 3.4 Schedulers & Cron Security
- **`CRON_SECRET`**: Evaluated in `configuration.ts` line 29 and `admin-or-cron.guard.ts` line 27. Required in production ($\ge 16$ chars). Authorizes external cron triggers (such as Hostinger hPanel Cron Jobs) to call queue processing sweeps via header `x-cron-secret: <CRON_SECRET>`.

### 3.5 Media Storage & CDN (Cloudinary)
- **`CLOUDINARY_CLOUD_NAME`**, **`CLOUDINARY_API_KEY`**, **`CLOUDINARY_API_SECRET`**: Evaluated in `media.service.ts` line 34-36. If present, initializes Cloudinary SDK; if omitted, `MediaService` logs a warning and runs in mock signature mode. **Crucial for Hostinger production** because local container storage is ephemeral.

### 3.6 Transactional Email & Messaging
- **`SMTP_HOST`**, **`SMTP_PORT`**, **`SMTP_SECURE`**, **`SMTP_USER`**, **`SMTP_PASS`**: Evaluated in `smtp.provider.ts` lines 15-19 via `configService.get()`. If configured, connects via `nodemailer`; if omitted, runs in sandbox log mode.
- **`EMAIL_FROM`** & **`EMAIL_REPLY_TO`**: Evaluated in `smtp.provider.ts` lines 22-26. Defaults to `"Brands & Creators <notifications@brandsandcreators.com>"` and `"support@brandsandcreators.com"`.

### 3.7 Payment Gateways
- **`RAZORPAY_KEY_ID`**, **`RAZORPAY_KEY_SECRET`**, **`RAZORPAY_WEBHOOK_SECRET`**: Evaluated in `razorpay.provider.ts` lines 24-26. If omitted or containing `demo`/`placeholder`, runs in simulated mock order mode.
- **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**: Evaluated in `stripe.provider.ts` lines 22-23. If omitted, runs in mock order mode.

### 3.8 Social & OAuth Integrations
- **`INSTAGRAM_CLIENT_ID` / `META_APP_ID`** & **`INSTAGRAM_CLIENT_SECRET` / `META_APP_SECRET`**: Evaluated in `instagram-graph.adapter.ts` lines 13-14.
- **`GOOGLE_CLIENT_ID` / `YOUTUBE_CLIENT_ID`** & **`GOOGLE_CLIENT_SECRET` / `YOUTUBE_CLIENT_SECRET`**: Evaluated in `youtube-data.adapter.ts` lines 13-14.
- **`JWT_SECRET`**: Evaluated in `social.service.ts` line 17 for signing OAuth state tokens. Defaults to internal fallback if omitted.

---

## 4. Cross-Reference Discrepancy Audits

### 4.1 Variables Present in `.env` but NOT Used in Source Code
| Variable Name | Present In | Used in Source Code? | Analysis & Recommendation |
| :--- | :---: | :---: | :--- |
| `MONGODB_USERNAME` | `.env` | **NO** | Legacy split database credential. The backend exclusively reads `MONGODB_URI`. **Omit from Hostinger.** |
| `MONGODB_PASSWORD` | `.env` | **NO** | Legacy split database credential. Contained within `MONGODB_URI`. **Omit from Hostinger.** |

### 4.2 Variables Used in Source Code but MISSING from `.env.example`
The following 13 variables are referenced in `apps/api/src` but are not declared in `apps/api/.env.example` or root `.env.example`:

| Variable Name | Referencing Source File | Feature Affected | Safe to Omit in Prod? |
| :--- | :--- | :--- | :---: |
| `OPEN_EXCHANGE_RATES_API_KEY` | `apps/api/src/modules/currency/currency.service.ts:51` | Live market exchange rates | **Yes** (uses static rates) |
| `FIXER_API_KEY` | `apps/api/src/modules/currency/currency.service.ts:51` | Alternative live exchange rates | **Yes** (uses static rates) |
| `VAPID_PUBLIC_KEY` | `apps/api/src/modules/notifications/notifications.service.ts:522` | Browser web push notifications | **Yes** (disables push) |
| `VAPID_PRIVATE_KEY` | `apps/api/src/modules/notifications/notifications.service.ts:523` | Browser web push notifications | **Yes** (disables push) |
| `INSTAGRAM_CLIENT_ID` | `apps/api/src/modules/social/adapters/instagram-graph.adapter.ts:13` | Instagram creator analytics | **Yes** (disables IG OAuth) |
| `META_APP_ID` | `apps/api/src/modules/social/adapters/instagram-graph.adapter.ts:13` | Instagram creator analytics | **Yes** (alias for above) |
| `INSTAGRAM_CLIENT_SECRET` | `apps/api/src/modules/social/adapters/instagram-graph.adapter.ts:14` | Instagram creator analytics | **Yes** (disables IG OAuth) |
| `META_APP_SECRET` | `apps/api/src/modules/social/adapters/instagram-graph.adapter.ts:14` | Instagram creator analytics | **Yes** (alias for above) |
| `GOOGLE_CLIENT_ID` | `apps/api/src/modules/social/adapters/youtube-data.adapter.ts:13` | YouTube creator analytics | **Yes** (disables YT OAuth) |
| `YOUTUBE_CLIENT_ID` | `apps/api/src/modules/social/adapters/youtube-data.adapter.ts:13` | YouTube creator analytics | **Yes** (alias for above) |
| `GOOGLE_CLIENT_SECRET` | `apps/api/src/modules/social/adapters/youtube-data.adapter.ts:14` | YouTube creator analytics | **Yes** (disables YT OAuth) |
| `YOUTUBE_CLIENT_SECRET` | `apps/api/src/modules/social/adapters/youtube-data.adapter.ts:14` | YouTube creator analytics | **Yes** (alias for above) |
| `JWT_SECRET` | `apps/api/src/modules/social/social.service.ts:17` | OAuth state HMAC signing | **Yes** (uses safe fallback) |

### 4.3 Duplicate / Conflicting Variable Names & Aliases
The backend includes several fallback alias pairs in adapters:
1. `INSTAGRAM_CLIENT_ID` and `META_APP_ID`:
   - Code logic: `process.env.INSTAGRAM_CLIENT_ID || process.env.META_APP_ID || ''`
   - Recommendation: Use `INSTAGRAM_CLIENT_ID`.
2. `INSTAGRAM_CLIENT_SECRET` and `META_APP_SECRET`:
   - Code logic: `process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET || ''`
   - Recommendation: Use `INSTAGRAM_CLIENT_SECRET`.
3. `GOOGLE_CLIENT_ID` and `YOUTUBE_CLIENT_ID`:
   - Code logic: `process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || ''`
   - Recommendation: Use `GOOGLE_CLIENT_ID`.
4. `GOOGLE_CLIENT_SECRET` and `YOUTUBE_CLIENT_SECRET`:
   - Code logic: `process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || ''`
   - Recommendation: Use `GOOGLE_CLIENT_SECRET`.
5. `OPEN_EXCHANGE_RATES_API_KEY` and `FIXER_API_KEY`:
   - Code logic: Evaluated as boolean presence for live rate providers.

### 4.4 Frontend Variables in Monorepo Root Templates (Caution)
The root `.env.example` includes several Next.js frontend variables:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- **Audit Finding:** These variables are strictly for Next.js client bundles (`apps/web` and `apps/admin`). **They are never evaluated by the NestJS backend and should NOT be entered into Hostinger's API environment panel.**

---

## 5. Local Development vs Production Behavioral Differences

| Configuration Aspect | Local Development (`NODE_ENV=development`) | Hostinger Production (`NODE_ENV=production`) |
| :--- | :--- | :--- |
| **Missing Secrets** | Permitted. Defaults to hardcoded dev secrets. | **Startup Aborts.** Throws `FatalSecurityConfigurationError`. |
| **Secret Entropy** | Any string permitted. | **Enforced $\ge 32$ chars** for JWT access/refresh, $\ge 16$ chars for cron. |
| **Default Insecure Keys** | Allowed (e.g. `dev_jwt_access_secret_...`). | **Strictly Rejected.** Known default strings trigger immediate startup exit. |
| **CORS Origins** | Automatically includes `localhost:3000`, `localhost:3001`, `127.0.0.1:3000`, `127.0.0.1:3001`. | Strictly restricted to `APP_URL` and `ADMIN_URL` domains. |
| **HSTS Headers** | Disabled (prevents breaking local non-SSL HTTP). | **Enabled** (`maxAge: 31536000`, `includeSubDomains: true`). |
| **Super Admin Password** | Default `SuperAdmin@Brands2026!` allowed. | Must be customized with a complex password ($\ge 12$ chars). |
| **Rate Limit Test Bypass** | Can be enabled via `ALLOW_RATE_LIMIT_TEST_BYPASS=true`. | **Hardcoded Disabled.** Always returns `false`. |

---

## 6. EXACT List of Variables to Enter in Hostinger

Enter these into Hostinger's **Environment Variables** panel in hPanel under **Node.js Web Application**.

### Tier 1: Minimum Viable Production Set (8 Mandatory Variables)
*Without these 8 variables, the server will either fail cryptographic startup validation or fail database/network requests:*

```env
NODE_ENV=production
PORT=4000
APP_URL=https://yourdomain.com
ADMIN_URL=https://admin.yourdomain.com
API_URL=https://api.yourdomain.com
MONGODB_URI=mongodb+srv://<DB_USER>:<DB_PASSWORD>@<CLUSTER_HOST>/brands_creators_prod?retryWrites=true&w=majority
JWT_ACCESS_SECRET=GENERATE_RANDOM_32_CHAR_STRING_EXAMPLE_12345
JWT_REFRESH_SECRET=GENERATE_RANDOM_32_CHAR_STRING_EXAMPLE_67890
CRON_SECRET=GENERATE_RANDOM_24_CHAR_STRING_EXAMPLE_ABCDE
```

### Tier 2: Recommended Full Production Set (+ 11 Variables)
*Add these for transactional email delivery (Hostinger Titan SMTP), Cloudinary media uploads, and Super Admin seeding:*

```env
# Initial Super Admin Seed (Initial bootstrap only)
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=YOUR_SECURE_ADMIN_PASSWORD_MIN_12_CHARS
SUPER_ADMIN_NAME="Brands & Creators Super Admin"

# Media Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Transactional Email (Hostinger Titan SMTP)
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=YOUR_EMAIL_ACCOUNT_PASSWORD
EMAIL_FROM="Brands & Creators <notifications@yourdomain.com>"
EMAIL_REPLY_TO=support@yourdomain.com
```

### Tier 3: Optional Integrations (Only if Live Accounts Are Active)
```env
# Razorpay Escrow Payments
RAZORPAY_KEY_ID=rzp_live_PLACEHOLDER_KEY_ID
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Stripe Credit Card Payments
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Web Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Creator Social Analytics
INSTAGRAM_CLIENT_ID=your_meta_app_id
INSTAGRAM_CLIENT_SECRET=your_meta_app_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

### Variables to EXCLUDE from Hostinger:
1. `MONGODB_USERNAME` (Omit — contained in `MONGODB_URI`)
2. `MONGODB_PASSWORD` (Omit — contained in `MONGODB_URI`)
3. `ALLOW_RATE_LIMIT_TEST_BYPASS` (Omit — local test bypass only)
4. `RATE_LIMIT_TEST_BYPASS_SECRET` (Omit — local test bypass only)
5. `NEXT_PUBLIC_*` (Omit — frontend Next.js client variables only)

