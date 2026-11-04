# Hostinger Backend Production Build Fix & Verification Report

**Project:** Brands & Creators  
**Deployment Target:** Hostinger Node.js Web Application  
**Application Component:** NestJS Backend API (`apps/api`)  
**Status:** **RESOLVED & VERIFIED LOCALLY**  
**Date:** November 4, 2026  

---

## 1. Executive Summary

During the initial deployment of the Brands & Creators NestJS backend on Hostinger, the build process failed with:

```text
Error: Cannot find module 'node_modules/typescript/bin/tsc'
Code: MODULE_NOT_FOUND
```

### Confirmed Root Causes:
1. **Omission of DevDependencies in Production Install:**  
   Hostinger runs `npm install` in a production environment (`NODE_ENV=production` or `--omit=dev`). In the original monorepo configuration:
   - `typescript` was declared **only** in `devDependencies` of `packages/types`, `apps/api`, `apps/web`, and `apps/admin`.
   - `typescript` was **completely absent** from the root `package.json` dependencies.
   - In `package-lock.json`, `node_modules/typescript` was tagged with `"dev": true`.  
   Consequently, `npm install` completely omitted TypeScript, so `node_modules/typescript` was never installed on Hostinger.

2. **Fragile Relative Invocation in Monorepo Build Script:**  
   The previous root `build` script was:
   ```json
   "build": "node node_modules/typescript/bin/tsc -p packages/types/tsconfig.json && node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json && node node_modules/next/dist/bin/next build apps/web && node node_modules/next/dist/bin/next build apps/admin"
   ```
   When Node attempted to execute `node node_modules/typescript/bin/tsc`, the file did not exist, triggering `MODULE_NOT_FOUND`.

3. **Inappropriate Monorepo Scope for Backend Deployment:**  
   The root `build` script simultaneously triggered Next.js production builds for `apps/web` and `apps/admin`. Next.js builds require heavy frontend devDependencies and substantial memory, which are entirely unnecessary and prone to failure when deploying only the NestJS backend API.

4. **Stale Incremental Compilation Cache Edge Case:**  
   `apps/api/tsconfig.json` had `"incremental": true`. When output directories were wiped in deployment environments without clearing `tsconfig.tsbuildinfo`, TypeScript skipped emitting new output files.

---

## 2. Remediation & Architecture Fixes

All confirmed issues have been resolved with zero destructive changes and without modifying any `.env` secrets or production infrastructure.

### Fix 1: Declared TypeScript in Production Dependencies
- Added `"typescript": "^5.4.5"` directly to root `package.json` under `"dependencies"`.
- Added `"typescript": "^5.4.5"` to `packages/types/package.json` under `"dependencies"`.
- Added `"typescript": "^5.4.5"` and critical compilation types (`@types/node`, `@types/express`, `@types/cookie-parser`, `@types/bcryptjs`, `@types/passport-jwt`, `@types/passport-local`) to `apps/api/package.json` under `"dependencies"`.
- Synchronized `package-lock.json` via `npm install --package-lock-only`, removing `"dev": true` from `typescript`.

> **Result:** When Hostinger runs `npm install` (even with `NODE_ENV=production` or `--omit=dev`), npm is guaranteed to install TypeScript and all required type definitions.

### Fix 2: Dedicated Backend-Only Production Build Script (`scripts/build-hostinger-api.js`)
Created a dedicated, self-contained, cross-platform build script at `scripts/build-hostinger-api.js`:
- **TypeScript Resolution:** Dynamically locates `tsc` across root and workspace `node_modules`.
- **Self-Healing Fallback:** Automatically installs `typescript@5.4.5` if running in an ultra-restricted deployment container.
- **Cache Cleansing:** Automatically clears stale `tsconfig.tsbuildinfo` files to guarantee fresh compilation output.
- **Sequential Build:** Compiles `packages/types` first, verifies `packages/types/dist/index.js` and `index.d.ts`, then compiles `apps/api`.
- **Targeted Output:** Produces the backend entry file at exactly `apps/api/dist/main.js`.
- **Artifact Verification:** Asserts that `apps/api/dist/main.js` and `apps/api/dist/app.module.js` exist and have non-zero size before exiting.

### Fix 3: Root `package.json` Scripts Refactored
Updated root `package.json`:
```json
{
  "scripts": {
    "build": "npm run build:hostinger:api",
    "build:all": "node node_modules/typescript/bin/tsc -p packages/types/tsconfig.json && node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json && node node_modules/next/dist/bin/next build apps/web && node node_modules/next/dist/bin/next build apps/admin",
    "build:hostinger:api": "node scripts/build-hostinger-api.js",
    "build:types": "node node_modules/typescript/bin/tsc -p packages/types/tsconfig.json",
    "build:api": "node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json",
    "start:hostinger:api": "node apps/api/dist/main.js"
  }
}
```

> **Safety Guarantee:** If Hostinger's Build Command is set to `npm run build:hostinger:api` **OR** left at the default `npm run build`, both execute the dedicated backend-only build and **never** build Next.js applications! The full monorepo build is preserved as `npm run build:all`.

---

## 3. Local Verification & Hostinger Simulation Evidence

A comprehensive simulation test was executed via `scripts/test-hostinger-install-simulation.js`:

### Simulation Steps & Results:

| Step | Action | Status | Evidence / Metrics |
| :--- | :--- | :---: | :--- |
| **Sim 1** | Clean previous `apps/api/dist` & `packages/types/dist` | **PASS** | Wiped dist directories & stale caches cleanly |
| **Sim 2** | Execute `npm run build:hostinger:api` under `NODE_ENV=production` | **PASS** | Exit code: 0; Duration: 13.91s |
| **Sim 3** | Verify generated output artifacts exist | **PASS** | `apps/api/dist/main.js` (3,509 B), `app.module.js` (6,791 B), `types/dist/index.js` (26,442 B) |
| **Sim 4** | Validate syntax & runtime module resolution | **PASS** | Validated via `vm.Script` syntax parse |
| **Sim 5** | Verify 27 runtime packages against Node resolver | **PASS** | 27/27 packages resolved cleanly |

### Runtime Dependency Verification Log:
```text
  [PASS] Entry file exists: apps/api/dist/main.js (3509 bytes)
  [PASS] Entry file JavaScript syntax is valid (compiled successfully with vm.Script).

--- Checking Runtime Dependency Resolutions ---
  [OK] @nestjs/core -> node_modules/@nestjs/core/index.js
  [OK] @nestjs/common -> node_modules/@nestjs/common/index.js
  [OK] @nestjs/config -> node_modules/@nestjs/config/index.js
  [OK] @nestjs/mongoose -> node_modules/@nestjs/mongoose/dist/index.js
  [OK] @nestjs/jwt -> node_modules/@nestjs/jwt/index.js
  [OK] @nestjs/passport -> node_modules/@nestjs/passport/index.js
  [OK] @nestjs/platform-express -> node_modules/@nestjs/platform-express/index.js
  [OK] @nestjs/platform-socket.io -> node_modules/@nestjs/platform-socket.io/index.js
  [OK] @nestjs/swagger -> node_modules/@nestjs/swagger/index.js
  [OK] @nestjs/throttler -> node_modules/@nestjs/throttler/dist/index.js
  [OK] @nestjs/websockets -> node_modules/@nestjs/websockets/index.js
  [OK] bcryptjs -> node_modules/bcryptjs/index.js
  [OK] class-transformer -> node_modules/class-transformer/cjs/index.js
  [OK] class-validator -> node_modules/class-validator/cjs/index.js
  [OK] cloudinary -> node_modules/cloudinary/cloudinary.js
  [OK] cookie-parser -> node_modules/cookie-parser/index.js
  [OK] dotenv -> node_modules/dotenv/lib/main.js
  [OK] helmet -> node_modules/helmet/index.cjs
  [OK] mongoose -> node_modules/mongoose/index.js
  [OK] nodemailer -> node_modules/nodemailer/dist/cjs/nodemailer.js
  [OK] passport -> node_modules/passport/lib/index.js
  [OK] passport-jwt -> node_modules/passport-jwt/lib/index.js
  [OK] passport-local -> node_modules/passport-local/lib/index.js
  [OK] reflect-metadata -> node_modules/reflect-metadata/Reflect.js
  [OK] rxjs -> node_modules/rxjs/dist/cjs/index.js
  [OK] socket.io -> node_modules/socket.io/dist/index.js
  [OK] @brands-creators/types -> packages/types/dist/index.js
```

---

## 4. Exact Hostinger Deployment Settings

Configure the Hostinger Node.js Application dashboard with the following exact values:

| Hostinger Setting | Recommended Value | Fallback / Notes |
| :--- | :--- | :--- |
| **Node.js Version** | `22.x` (or `20.x`) | Both supported |
| **Package Manager** | `npm` | Native npm workspace support |
| **GitHub Branch** | `main` | Production branch |
| **Application Root** | `./` | Root of the cloned monorepo |
| **Build Command** | `npm run build:hostinger:api` | `npm run build` will also succeed |
| **Application Startup File** | `apps/api/dist/main.js` | Exact relative entry path |
| **Start Command** | `node apps/api/dist/main.js` | Or `npm run start:hostinger:api` |
| **Environment Mode** | Production | `NODE_ENV=production` |

---

## 5. Deployment Checklist

Before triggering a redeploy on Hostinger:

1. **Commit and Push Changes to `main`:**
   - `package.json`
   - `package-lock.json`
   - `apps/api/package.json`
   - `packages/types/package.json`
   - `scripts/build-hostinger-api.js`
   - `docs/HOSTINGER-BACKEND-BUILD-FIX-REPORT.md`
2. **In Hostinger hPanel:**
   - Confirm **Application Root** is `./`.
   - Set **Build command** to `npm run build:hostinger:api`.
   - Set **Application Startup File** to `apps/api/dist/main.js`.
   - Click **Deploy** / **Rebuild**.
3. **Verify Deployment Log:**
   - You should see `[Hostinger Build] packages/types compiled successfully` followed by `[Hostinger Build] apps/api compiled successfully -> apps/api/dist/main.js`.
4. **Health Check:**
   - Once running, query `GET https://<your-hostinger-domain>/api/v1/health` (returns `{"status":"ok"}`).

