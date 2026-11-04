# BRANDS & CREATORS — HOSTINGER BACKEND ENVIRONMENT VARIABLES SPECIFICATION

**Target Application:** Brands & Creators NestJS REST API (`apps/api`)  
**Deployment Platform:** Hostinger Node.js Web Application  
**Environment Target:** Production / Staging  
**Security Notice:** All example values provided herein are safe generic placeholders. Never commit actual production secrets, API keys, or database credentials to Git.

---

## 1. Variable Classification & Priority Groups

Environment variables for the backend are organized into five distinct operational tiers:

- **Tier A — Mandatory for API Startup:** Without these, the application triggers a fail-fast startup abort in `NODE_ENV=production`.
- **Tier B — Required for Core Feature Sets:** Necessary for media persistence, transactional emails, and admin seeding.
- **Tier C — Feature-Specific / Payment & Social Integrations:** Enabled when corresponding provider integrations (Stripe, Razorpay, Instagram, YouTube) are activated.
- **Tier D — Build-Time Variables:** Required or evaluated during `npm run build:api` or TypeScript compilation.
- **Tier E — Runtime Operational Variables:** Evaluated continuously during request execution.

---

## 2. Tier A: Mandatory for API Startup (Fail-Fast Production Requirements)

| Variable | Required? | Example Format (Placeholder) | Purpose | Where to Obtain |
| :--- | :---: | :--- | :--- | :--- |
| `NODE_ENV` | **YES** | `production` | Enables production mode, strict cryptographic validation, and production security headers. | Hostinger hPanel Environment configuration. |
| `PORT` | **YES** | `4000` *(or dynamic `$PORT`)* | TCP Port the NestJS HTTP server binds to. Hostinger reverse proxies incoming web traffic to this port. | Provided automatically by Hostinger Node.js manager, or set to `4000` / `3000`. |
| `MONGODB_URI` | **YES** | `mongodb+srv://<DB_USER>:<DB_PASSWORD>@<CLUSTER_HOST>/brands_creators_prod?retryWrites=true&w=majority` | Primary database connection string for MongoDB Atlas replica set. | MongoDB Atlas Dashboard $\rightarrow$ Connect $\rightarrow$ Drivers (Node.js). |
| `JWT_ACCESS_SECRET` | **YES** | `prod_jwt_access_entropy_256_bit_secure_32_chars_minimum_example` *(min 32 chars)* | High-entropy HMAC-SHA256 secret key for signing short-lived user authentication JWT tokens. | Generate via `openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `JWT_REFRESH_SECRET` | **YES** | `prod_jwt_refresh_entropy_256_bit_secure_32_chars_distinct_example` *(min 32 chars)* | High-entropy HMAC-SHA256 secret key for signing long-lived refresh tokens. Must be distinct from `JWT_ACCESS_SECRET`. | Generate via `openssl rand -hex 32` (must not match access secret). |
| `CRON_SECRET` | **YES** | `prod_cron_secret_high_entropy_32_chars_example` *(min 16 chars)* | Shared authorization token required to invoke scheduled email queue and subscription expiration endpoints. | Generate via `openssl rand -hex 24`. Used in Hostinger Cron Job `x-cron-secret` headers. |
| `APP_URL` | **YES** | `https://brandsandcreators.com` | Canonical URL of the public web marketplace. Configures CORS whitelist and email action links. | Your registered production marketplace domain. |
| `ADMIN_URL` | **YES** | `https://admin.brandsandcreators.com` | Canonical URL of the Admin Backoffice portal. Configures CORS whitelist for admin requests. | Your registered production admin subdomain. |

---

## 3. Tier B: Core Application & Platform Configuration

| Variable | Required? | Example Format (Placeholder) | Purpose | Where to Obtain |
| :--- | :---: | :--- | :--- | :--- |
| `API_URL` | Recommended | `https://api.brandsandcreators.com` | Public canonical base URL for the backend API. Used for Swagger documentation and absolute webhooks. | Your registered backend API subdomain. |
| `JWT_ACCESS_EXPIRES_IN` | Optional | `15m` | Lifetime of access tokens before refresh is required. Default: `15m`. | System design specification (e.g., `15m`, `30m`). |
| `JWT_REFRESH_EXPIRES_IN` | Optional | `7d` | Lifetime of refresh tokens before full re-login is required. Default: `7d`. | System design specification (e.g., `7d`, `30d`). |
| `SUPER_ADMIN_EMAIL` | Recommended | `admin@brandsandcreators.com` | Initial super admin account email seeded on fresh database bootstrap. | Organization administrator email. |
| `SUPER_ADMIN_PASSWORD` | Recommended | `SuperAdmin@Brands2026!SecureComplexPass` *(min 12 chars)* | Password for initial super admin bootstrap. In production, default development passwords are rejected. | Strong enterprise password (min 12 characters). |
| `SUPER_ADMIN_NAME` | Optional | `Brands & Creators Super Admin` | Display name of the initial super admin account. | Administrator display preference. |

---

## 4. Tier C: Storage, Email, Payments & Social Integrations

### Media Storage (Cloudinary)
*Local disk storage (`uploads/`) on cloud containers is ephemeral and wiped on redeployment. Cloudinary ensures persistent media delivery.*

| Variable | Required? | Example Format (Placeholder) | Purpose | Where to Obtain |
| :--- | :---: | :--- | :--- | :--- |
| `CLOUDINARY_CLOUD_NAME` | Conditional | `your-prod-cloudinary-cloud-name` | Cloudinary account identifier for image and asset hosting. | Cloudinary Console $\rightarrow$ Dashboard $\rightarrow$ Product Environment. |
| `CLOUDINARY_API_KEY` | Conditional | `123456789012345` | API Key used to generate secure upload signatures. | Cloudinary Console $\rightarrow$ Settings $\rightarrow$ Access Keys. |
| `CLOUDINARY_API_SECRET` | Conditional | `your-prod-cloudinary-api-secret` | API Secret used for server-side media signing and deletion. | Cloudinary Console $\rightarrow$ Settings $\rightarrow$ Access Keys. |

### Transactional Email (SMTP / Hostinger Titan Email)
*Required for user email verification, password reset, deliverable notifications, and contract alerts.*

| Variable | Required? | Example Format (Placeholder) | Purpose | Where to Obtain |
| :--- | :---: | :--- | :--- | :--- |
| `SMTP_HOST` | Conditional | `smtp.titan.email` *(or mail provider)* | SMTP Server hostname for transactional email delivery. | Hostinger hPanel $\rightarrow$ Emails $\rightarrow$ Connect Apps & Devices (or Titan Email). |
| `SMTP_PORT` | Conditional | `587` *(or `465`)* | SMTP port for TLS/SSL connection. | Hostinger Email Settings (587 for STARTTLS, 465 for SSL). |
| `SMTP_SECURE` | Conditional | `false` *(for port 587)* / `true` *(for 465)* | Indicates whether the connection uses direct SSL (`true`) or STARTTLS (`false`). | Match with `SMTP_PORT`. |
| `SMTP_USER` | Conditional | `notifications@brandsandcreators.com` | SMTP authentication username / full email account. | Hostinger hPanel $\rightarrow$ Emails $\rightarrow$ Email Accounts. |
| `SMTP_PASS` | Conditional | `your-secure-email-account-password` | SMTP authentication password. | Hostinger Email Account password. |
| `EMAIL_FROM` | Conditional | `"Brands & Creators" <notifications@brandsandcreators.com>` | Sender header displayed in outgoing user emails. | Registered business email address. |
| `EMAIL_REPLY_TO` | Optional | `support@brandsandcreators.com` | Destination address when recipients reply to automated emails. | Customer support email inbox. |

### Payment Gateways (Razorpay & Stripe)
*Required when processing real escrow transactions, subscriptions, and platform payouts.*

| Variable | Required? | Example Format (Placeholder) | Purpose | Where to Obtain |
| :--- | :---: | :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | Conditional | `rzp_live_PLACEHOLDER_KEY_ID` | Razorpay public Key ID for order creation and escrow charges. | Razorpay Dashboard $\rightarrow$ Settings $\rightarrow$ API Keys. |
| `RAZORPAY_KEY_SECRET` | Conditional | `your_live_razorpay_secret_key` | Razorpay private secret key for API verification. | Razorpay Dashboard $\rightarrow$ Settings $\rightarrow$ API Keys. |
| `RAZORPAY_WEBHOOK_SECRET`| Conditional | `your_razorpay_webhook_secret` | Webhook signature secret to verify incoming payment notifications. | Razorpay Dashboard $\rightarrow$ Settings $\rightarrow$ Webhooks. |
| `STRIPE_SECRET_KEY` | Conditional | `sk_live_PLACEHOLDER_STRIPE_KEY` | Stripe private key for international credit card payments. | Stripe Dashboard $\rightarrow$ Developers $\rightarrow$ API keys. |
| `STRIPE_WEBHOOK_SECRET` | Conditional | `whsec_your_stripe_webhook_secret` | Webhook signature secret to verify incoming Stripe events. | Stripe Dashboard $\rightarrow$ Developers $\rightarrow$ Webhooks. |

### Web Push Notifications (VAPID)
*Optional: Enables browser push notifications for real-time proposals and chat.*

| Variable | Required? | Example Format (Placeholder) | Purpose | Where to Obtain |
| :--- | :---: | :--- | :--- | :--- |
| `VAPID_PUBLIC_KEY` | Optional | `BEl62iUYgUivxIkv69yVi...` | Public VAPID key shared with client browsers for push subscription. | Generate via `npx web-push generate-vapid-keys`. |
| `VAPID_PRIVATE_KEY` | Optional | `your_vapid_private_key` | Private VAPID key used by the backend to sign web push messages. | Generate via `npx web-push generate-vapid-keys`. |

### Social Integrations & Creator Analytics (Meta & YouTube)
*Optional: Required only if creators link live Instagram / YouTube metrics.*

| Variable | Required? | Example Format (Placeholder) | Purpose | Where to Obtain |
| :--- | :---: | :--- | :--- | :--- |
| `INSTAGRAM_CLIENT_ID` / `META_APP_ID` | Optional | `123456789012345` | Meta / Instagram App ID for creator account linking. | Meta for Developers $\rightarrow$ Apps. |
| `INSTAGRAM_CLIENT_SECRET` / `META_APP_SECRET` | Optional | `your_meta_app_secret` | Meta App Secret for exchanging OAuth authorization codes. | Meta for Developers $\rightarrow$ App Settings $\rightarrow$ Basic. |
| `GOOGLE_CLIENT_ID` / `YOUTUBE_CLIENT_ID` | Optional | `123456789-abc.apps.googleusercontent.com` | Google Cloud OAuth Client ID for YouTube Data API. | Google Cloud Console $\rightarrow$ APIs & Services $\rightarrow$ Credentials. |
| `GOOGLE_CLIENT_SECRET` / `YOUTUBE_CLIENT_SECRET` | Optional | `GOCSPX-your_google_secret` | Google Cloud OAuth Client Secret. | Google Cloud Console $\rightarrow$ Credentials. |
| `JWT_SECRET` | Optional | `your_oauth_state_hmac_secret_32_chars` | HMAC secret for verifying social OAuth state parameters. | Generate via `openssl rand -hex 32`. |

---

## 5. Tier D & E: Build-Time vs Runtime Variable Mapping

| Variable Name | Evaluated at Build-Time? | Evaluated at Runtime? | Notes |
| :--- | :---: | :---: | :--- |
| `NODE_ENV` | Yes | Yes | Set to `production` during build and runtime. |
| `PORT` | No | Yes | Evaluated when `main.ts` listens. |
| `MONGODB_URI` | No | Yes | Evaluated when `MongooseCoreModule` connects. |
| `JWT_ACCESS_SECRET` | No | Yes | Evaluated by `assertProductionSecrets()` and `JwtModule`. |
| `JWT_REFRESH_SECRET` | No | Yes | Evaluated by `assertProductionSecrets()` and `AuthService`. |
| `CRON_SECRET` | No | Yes | Evaluated by `assertProductionSecrets()` and `AdminOrCronGuard`. |
| `APP_URL` / `ADMIN_URL` | No | Yes | Evaluated in `main.ts` for CORS origin array. |
| `SMTP_*` | No | Yes | Evaluated by `SmtpEmailProvider` upon startup. |
| `CLOUDINARY_*` | No | Yes | Evaluated by `MediaService` when signing URLs. |

---

## 6. Complete Hostinger Copy-Paste Production Template

Paste these into the Hostinger **Environment Variables** panel in hPanel (replace placeholder values with your verified production credentials):

```env
# Node.js Core Environment
NODE_ENV=production
PORT=4000
APP_URL=https://brandsandcreators.com
ADMIN_URL=https://admin.brandsandcreators.com
API_URL=https://api.brandsandcreators.com

# Database Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<DB_USER>:<DB_PASSWORD>@<CLUSTER_HOST>/brands_creators_prod?retryWrites=true&w=majority

# JWT Authentication Secrets (Must be distinct 32+ character strings)
JWT_ACCESS_SECRET=REPLACE_WITH_SECURE_RANDOM_32_CHAR_ACCESS_SECRET_KEY
JWT_REFRESH_SECRET=REPLACE_WITH_SECURE_RANDOM_32_CHAR_REFRESH_SECRET_KEY
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cron & Background Worker Secret (Min 16 characters)
CRON_SECRET=REPLACE_WITH_SECURE_RANDOM_24_CHAR_CRON_SECRET_KEY

# Super Admin Bootstrap Seed Account
SUPER_ADMIN_EMAIL=admin@brandsandcreators.com
SUPER_ADMIN_PASSWORD=REPLACE_WITH_STRONG_SUPER_ADMIN_PASSWORD_MIN_12_CHARS
SUPER_ADMIN_NAME="Brands & Creators Super Admin"

# Media Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Transactional Email (Hostinger Titan SMTP or External SMTP)
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@brandsandcreators.com
SMTP_PASS=YOUR_EMAIL_ACCOUNT_PASSWORD
EMAIL_FROM="Brands & Creators <notifications@brandsandcreators.com>"
EMAIL_REPLY_TO=support@brandsandcreators.com

# Payment Gateways (Optional: Enable when processing live money)
RAZORPAY_KEY_ID=rzp_live_PLACEHOLDER_KEY_ID
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
STRIPE_SECRET_KEY=sk_live_PLACEHOLDER_STRIPE_KEY
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
```

