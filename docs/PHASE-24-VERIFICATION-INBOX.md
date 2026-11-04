# Phase 24 — Email Verification, First-Time Onboarding & Internal Inbox Report

## Executive Summary

Phase 24 establishes critical user security, onboarding, and private messaging workflows across the Brands & Creators marketplace platform. It implements cryptographic SHA-256 token-based email verification, a guided multi-step onboarding wizard for freshly registered accounts, category-aware role routing, and a database-backed internal inbox powered by NestJS, Mongoose, and Socket.IO.

All features and tests run strictly in the local development environment.

---

## 1. Architectural Architecture & Data Models

### 1.1 Email Verification Workflow (`apps/api/src/modules/auth/`)
- **`User` Schema Additions**:
  - `isEmailVerified: boolean` (defaults to `false` on new registrations; pre-seeded accounts remain verified).
  - `emailVerificationTokenHash?: string` (SHA-256 hash stored in DB with `select: false` security).
  - `emailVerificationExpiresAt?: Date` (24-hour expiration window).
  - `onboardingCompleted: boolean` (defaults to `false` for new users).
  - `selectedCategoryIds?: Types.ObjectId[]` (stores the user's primary vertical categories).
- **Security & Idempotency**:
  - `POST /auth/register` creates a 32-byte cryptographically random token (`crypto.randomBytes(32)`), storing only the SHA-256 hash.
  - `POST /auth/verify-email` and `GET /auth/verify-email`: Validates token hash and unexpired timestamp, sets `isEmailVerified: true`, and clears the hash to prevent token reuse.
  - `POST /auth/resend-verification`: Generates a fresh verification token for unverified accounts.

### 1.2 First-Time User Onboarding (`apps/web/app/onboarding/page.tsx` & `apps/api/src/modules/auth/`)
- **Endpoint**: `POST /auth/onboarding/complete`
- **4-Step Wizard**:
  - **Step 1 (Persona)**: Confirms role (Creator, Production Team, or Brand) and headline/bio.
  - **Step 2 (Taxonomy)**: Selects active vertical categories.
  - **Step 3 (Location)**: Captures city, state, locality / neighborhood (e.g., Indiranagar), and PIN code.
  - **Step 4 (Custom Fields & Launch)**: Fills dynamic category specifications and sets `onboardingCompleted: true`.
- **Category-Aware Route Switcher (`apps/web/app/dashboard/page.tsx`)**:
  - Automatically routes unauthenticated users to `/login`.
  - Automatically routes users with `onboardingCompleted === false` to `/onboarding`.
  - Routes Brands to `/dashboard/brand` and Creators/Production Teams to `/dashboard/creator`.

### 1.3 Internal Database-Backed Inbox (`apps/web/app/inbox/page.tsx` & `apps/api/src/modules/conversations/`)
- **Split-Pane Architecture**:
  - Left pane: Conversation thread list with unread counter badges, last message previews, timestamps, and search.
  - Right pane: Full real-time message stream with sender avatars, status indicators (`SENT`, `DELIVERED`, `READ`), reply-to previews, and typing indicators.
- **Privacy & Participant Isolation**:
  - Endpoints (`GET /conversations/:conversationId/messages` and `POST /conversations/:conversationId/messages`) strictly verify that the requesting user is a member of `conversation.participantIds`. Third-party users attempting to inspect or post receive HTTP 403 Forbidden.

---

## 2. Test Verification Evidence

- Test script: `scripts/test-phase-24-verification-inbox.js`
- Test run results:
  - **Total Tests**: 29
  - **Passed**: 29
  - **Failed**: 0
  - **Pass Rate**: 100%
- Covered workflows:
  - Registration token generation with default unverified/not-onboarded flags.
  - Rejection of invalid verification tokens (HTTP 400).
  - Successful email verification via token.
  - Token single-use enforcement preventing replay attacks.
  - Resend verification token endpoint.
  - First-time onboarding submission with category, location, and custom field persistence.
  - Querying internal inbox conversations (`GET /conversations`).
  - Initiating conversation thread and sending messages with database persistence.
  - Thread retrieval by participant creator.
  - Privacy access control rejecting non-participant eavesdropping (HTTP 403).

