# BRANDS & CREATORS — SYSTEM ARCHITECTURE DOCUMENTATION
**Version:** 1.0.0  
**Status:** Approved & Implemented Foundation  
**Target Environment:** Production SaaS (Vercel Frontend / Hostinger Node.js Backend / MongoDB Atlas / Cloudinary)

---

## 1. Executive Summary & Product Positioning

**Brands & Creators** is a modern B2B marketplace platform connecting brands and commercial businesses with creative professionals, influencers, UGC creators, cinematographers, production houses, marketing specialists, and agencies. 

Unlike single-purpose influencer platforms, **Brands & Creators** is an all-inclusive creative ecosystem spanning 30+ dynamic professional categories (from high-profile directors, VFX artists, and equipment rental teams to performance marketing directors, fashion stylists, and UGC talent).

### Core Marketplace Loop
```
[ Brand / Business ] 
        │ (Posts Requirement / Searches Talent)
        ▼
[ Discovery & Matching Engine ] ◄── (Dynamic Categories, Skills, Metrics, Location)
        │
        ▼
[ Creator / Production Team ]
        │ (Applies with Proposal / Direct Contact)
        ▼
[ Shortlisting & Evaluation ] ◄── (Portfolios, Verified Social Metrics, Reviews)
        │
        ▼
[ Communication & Milestone Project ]
        │
        ▼
[ Verified Review & Portfolio Showcase ]
```

---

## 2. Design Philosophy — Gemini Light Aesthetic

The visual language follows an original, premium **Gemini-inspired light aesthetic**:
- **Surfaces & Atmosphere:** Clean white (`#ffffff`) and soft tinted neutral backgrounds (`#f8fafc` / `#fbfcfe`), delicate frosted translucent glass elements (`backdrop-blur-md bg-white/80`), and micro-borders (`rgba(0,0,0,0.06)` or `#e2e8f0`).
- **Color Accents:** Vibrant yet refined gradients blending celestial indigo (`#4f46e5`), electric cyan (`#06b6d4`), and soft violet (`#8b5cf6`), paired with deep slate typography (`#0f172a`, `#334155`, `#64748b`).
- **Micro-Interactions & Physics:** Framer Motion spring curves, smooth card hover lifting (`translateY(-2px)` + soft layered shadow), skeleton shimmering, dynamic tab indicator sliding, and contextual tooltips.
- **Clarity & Spatial Rhythm:** Generous whitespace, scannable typographic hierarchy (Inter / Plus Jakarta Sans), explicit action affordances, and zero visual clutter.

---

## 3. Monorepo Architecture

```
brands-creators/
├── apps/
│   ├── web/                        # Next.js App Router (Public & Client Portal)
│   │   ├── app/                    # App Router routes (/, /explore, /requirements, /creators/[slug], /dashboard/...)
│   │   │   ├── (auth)/             # Login, Register, Forgot Password, Onboarding
│   │   │   ├── (public)/           # Landing, Explore Talent, Requirements Board, Categories
│   │   │   ├── (creator-portal)/   # Creator Dashboard, Portfolio Builder, Applications, Analytics
│   │   │   └── (brand-portal)/     # Brand Dashboard, Post Requirement, Talent Shortlists, Hires
│   │   ├── components/             # Reusable UI components (Gemini Light Design System)
│   │   ├── features/               # Feature-specific components and hooks
│   │   ├── hooks/                  # Custom React hooks (auth, query, media, debouncing)
│   │   ├── lib/                    # API clients, utils, animations, constants
│   │   └── types/                  # Local frontend types
│   │
│   ├── admin/                      # Next.js App Router (Admin & Moderator Panel)
│   │   ├── app/                    # Admin routes categorized into contextual domains
│   │   │   ├── (dashboard)/        # Metrics, growth charts, active pipelines
│   │   │   ├── marketplace/        # Requirements, Applications, Categories, Subcategories
│   │   │   ├── people/             # Creators, Brands, Production Teams, Verification Queue
│   │   │   ├── content/            # Portfolios, Media Moderation, Reports
│   │   │   ├── communication/      # Broadcasts, Notification Templates, System Logs
│   │   │   ├── business/           # Subscription Plans, Platform Fees, Payments
│   │   │   └── system/             # Admin Users, RBAC Roles, Audit Logs, Settings
│   │   ├── components/             # Admin-specific tables, filters, drawers, dialogs
│   │   └── lib/                    # Admin state, API clients, helpers
│   │
│   └── api/                        # NestJS REST API Server
│       ├── src/
│       │   ├── common/             # Filters, Interceptors, Guards, Decorators, Base DTOs
│       │   ├── config/             # Environment validation, database & JWT configuration
│       │   ├── database/           # Mongoose connection & plugin setup
│       │   └── modules/            # Domain-driven NestJS modules
│       │       ├── auth/           # JWT, Refresh Tokens, Password Hashing, Sessions
│       │       ├── users/          # User entities, statuses, base identities
│       │       ├── roles/          # RBAC (Super Admin, Admin, Moderator, Brand, Creator, Production, Agency)
│       │       ├── creators/       # Creator profile, experience, rates, skills
│       │       ├── brands/         # Company profile, team, industry, campaigns
│       │       ├── production-teams/# Equipment, crew sizes, specialized studio capabilities
│       │       ├── categories/     # Dynamic category & subcategory taxonomy engine
│       │       ├── portfolios/     # Multi-asset portfolio items, deliverables, client tags
│       │       ├── social/         # Social accounts abstraction, OAuth sync, metrics
│       │       ├── requirements/   # Project leads, budget ranges, deadlines, filtering
│       │       ├── applications/   # Proposals, quote bids, candidate evaluations
│       │       ├── shortlists/     # Brand bookmarking, talent lists, collaboration boards
│       │       ├── conversations/  # Messaging, direct threads, project chat channels
│       │       ├── projects/       # Milestones, delivery approvals, contract tracking
│       │       ├── reviews/        # Verified ratings, feedback, client testimonials
│       │       ├── notifications/  # In-app real-time alerts, email notification queue
│       │       ├── media/          # Cloudinary signed upload orchestration & optimization
│       │       ├── audit-logs/     # Immutable administrative action logging
│       │       ├── platform-settings/# Dynamic runtime SaaS configurations
│       │       └── admin/          # Admin analytics, batch operations, moderation queues
│       └── main.ts                 # Bootstrap with global validation, CORS, Swagger
│
├── packages/
│   ├── types/                      # Universal TypeScript DTOs, Enums, Contracts
│   └── config/                     # Shared ESLint, Prettier, and TS configurations
└── docs/                           # Architecture, Roadmap, API & Deployment guides
```

---

## 4. Database Architecture (MongoDB Atlas + Mongoose)

MongoDB Atlas is the single primary database, utilizing structured schemas, referenced foreign keys, and optimized compound indexes:

### Primary Collections & Schema Map
1. **`users`**: Authentication identity, hashed passwords, active roles, verification status, email tokens.
2. **`creatorProfiles`**: 1-to-1 with user. Title, bio, starting price, service mode (Remote/On-site), dynamic category references, verified badge, rating cache.
3. **`brandProfiles`**: Company name, logo, industry, company size, website, verified status.
4. **`productionTeamProfiles`**: Studio specifications, crew count, equipment roster, day rates.
5. **`categories` & `subCategories`**: Dynamic admin-managed taxonomy with slug, icon, metadata tags, and active status.
6. **`portfolioItems`**: Media assets, project title, role performed, client/brand, delivery date, metrics.
7. **`socialAccounts`**: Connected platforms (Instagram, YouTube, LinkedIn, X, TikTok), follower counts, sync status, OAuth tokens.
8. **`requirements`**: Project title, category, budget min/max, deliverables, dates, applicant count, status (`DRAFT`, `PUBLISHED`, `PAUSED`, `CLOSED`, `COMPLETED`).
9. **`applications`**: Proposal letter, price bid, estimated turnaround, status (`SUBMITTED`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`).
10. **`shortlists`**: Brand-created talent collections.
11. **`conversations` & `messages`**: Messaging threads linked to requirements or direct inquiries.
12. **`projects`**: Contracted assignments with milestone tracking and status transitions.
13. **`reviews`**: 5-star ratings, qualitative feedback, verified project references.
14. **`notifications`**: User alert items with read state and deeplink targets.
15. **`auditLogs`**: Complete history of admin and moderator actions (who, what, target, before/after snapshot).
16. **`platformSettings`**: Global marketplace controls (commission rates, feature flags, maintenance mode).

### Key Indexes
- `users`: `{ email: 1 }` (unique), `{ username: 1 }` (unique)
- `creatorProfiles`: `{ slug: 1 }` (unique), `{ primaryCategory: 1, location: 1, isAvailable: 1 }`, `{ averageRating: -1 }`
- `requirements`: `{ status: 1, category: 1, createdAt: -1 }`, `{ "budget.min": 1, "budget.max": 1 }`
- `applications`: `{ requirementId: 1, applicantId: 1 }` (unique compound)
- `socialAccounts`: `{ userId: 1, platform: 1 }` (unique compound)
- `auditLogs`: `{ createdAt: -1, adminUserId: 1, entityType: 1 }`

---

## 5. Security, RBAC & API Design

### Authentication Strategy
- Access Token (JWT, 15m expiration) + Refresh Token (HttpOnly Cookie / Secure Rotation, 7d expiration).
- Bcrypt password hashing (Salt Rounds: 12).
- RBAC hierarchy enforced via `@Roles(...)` decorator and `RolesGuard` in NestJS.

### Role Hierarchy
- `SUPER_ADMIN`: Complete platform authority, system configuration, audit access.
- `ADMIN`: Marketplace management, category curation, user moderation, dispute resolution.
- `MODERATOR`: Content verification, report handling, portfolio review.
- `BRAND`: Requirement posting, talent search, shortlisting, contract management.
- `CREATOR`: Profile builder, portfolio management, proposal submission, project execution.
- `PRODUCTION_TEAM`: Studio team management, collaborative bidding, heavy asset showcase.
- `AGENCY`: Multi-talent representation and brand campaign management.

---

## 6. Social Media Architecture (Zero Unauthorized Scraping)
A provider-agnostic interface (`ISocialProvider`) powers social metrics:
- **Manual Mode:** Validated public profile URL with verified badge state.
- **Official API Mode (OAuth2):** Authorized tokens for Instagram Graph API, YouTube Data API v3, and LinkedIn API.
- **Sync Engine:** Scheduled background sync worker with rate-limit compliance, storing verified subscriber counts, posts, and engagement ratios.

---

## 7. Media & CDN Architecture (Cloudinary)
- Direct-to-Cloudinary signed uploads to keep backend serverless and performant.
- Client requests pre-signed signature from `POST /media/sign-upload`.
- Client uploads asset directly to Cloudinary CDN with automatic WebP/AVIF transformations, thumbnail generation, and video streaming profiles.
- MongoDB stores only the secure asset URL, public_id, dimensions, duration, and asset metadata.

---

## 8. Deployment Target Map
- **Frontend (`apps/web` & `apps/admin`):** Vercel Edge/Serverless Next.js deployment.
- **Backend (`apps/api`):** Hostinger Node.js Web App / Containerized Node.js cluster.
- **Database:** MongoDB Atlas M0/M10+ Multi-region cluster.
- **Media:** Cloudinary Media Cloud.
