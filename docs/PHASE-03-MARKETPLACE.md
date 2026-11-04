# PHASE 03 — MARKETPLACE, REQUIREMENTS, LEADS, APPLICATIONS & DISCOVERY
## Production Implementation, Architecture & Verification Report

---

## 1. Executive Summary

Phase 03 transforms **Brands & Creators** into a complete two-sided creative B2B marketplace engine.

The marketplace now supports two interconnected workflows:
1. **Method A — Direct Talent Discovery**: Brands discover, filter, and shortlist creative professionals, cinematographers, and studios via `/explore` with dynamic category-aware filters.
2. **Method B — Requirements & Job Briefs**: Brands post commercial project briefs via an 8-step creation wizard → Relevant talent discovers opportunities via `/requirements` → Talent submits customized proposals and portfolio samples via the Apply Modal → Brands review candidates with deterministic match scores (0–100%) and shortlist/hire/reject applicants → Creators track live status updates via `/creator/applications`.

---

## 2. Requirement Architecture & Data Models

### 2.1 Requirement Lifecycle & Status Machine
```
[DRAFT]
   │  (Brand creates / autosaves brief)
   ▼
[PUBLISHED] ────► Visible in marketplace & eligible for applications
   │
   ├──► [PAUSED] ───► Temporarily hidden from receiving new proposals
   │
   ├──► [CLOSED] ───► Application deadline expired / hiring concluded
   │
   ├──► [COMPLETED] ─► Milestone deliverables finished
   │
   └──► [CANCELLED] ─► Opportunity withdrawn by brand
```

### 2.2 MongoDB Requirement Schema
- `brandId`: ObjectId (ref: `BrandProfile`, indexed)
- `title`: string (e.g. "High-Impact Direct Response UGC Videos for Skincare Launch")
- `slug`: string (unique, indexed, SEO-safe slug e.g. `direct-response-ugc-skincare-launch-mumbai`)
- `description`: string (detailed creative brief narrative)
- `categoryId`: ObjectId (ref: `Category`, indexed)
- `subcategoryId`: ObjectId (ref: `Category`)
- `subcategoryIds`: ObjectId[] (ref: `Category`)
- `location`: `{ city?: string; state?: string; country: string; isRemote: boolean; }`
- `serviceLocations`: string[]
- `remoteAllowed`: boolean
- `budgetType`: BudgetType (`FIXED`, `RANGE`, `NEGOTIABLE`, `CUSTOM_QUOTE`)
- `budget`: `{ min: number; max: number; currency: string; }` (indexed)
- `applicationDeadline`: Date (indexed)
- `startDate` / `endDate`: Date
- `professionalsRequired`: number
- `deliverables`: string[] (e.g. `['3x 9:16 UGC Videos (4K)', '2x Raw B-Roll Hooks']`)
- `requiredSkills`: string[] (indexed)
- `preferredExperience`: string (`ENTRY`, `MID_LEVEL`, `EXPERT`)
- `requiredLanguages`: string[] (`['English', 'Hindi']`)
- `targetPlatforms`: string[] (`['Instagram', 'Meta Ads', 'YouTube']`)
- `targetIndustry`: string
- `genderPreference`: string (optional, when relevant)
- `attachments`: Array<{ url: string; name: string; fileType?: string; sizeBytes?: number; }>
- `categorySpecificFields`: Record<string, any> (dynamic category-aware specifications)
- `status`: RequirementStatus (`DRAFT`, `PUBLISHED`, `PAUSED`, `CLOSED`, `COMPLETED`, `CANCELLED`, indexed)
- `visibility`: string (`PUBLIC`, `PRIVATE`)
- `featured`: boolean (indexed)
- `applicationCount`: number
- `publishedAt` / `closedAt`: Date

### 2.3 MongoDB Performance Indexes
```typescript
RequirementSchema.index({ status: 1, categoryId: 1, createdAt: -1 });
RequirementSchema.index({ 'location.city': 1, 'location.isRemote': 1 });
RequirementSchema.index({ 'budget.min': 1, 'budget.max': 1 });
RequirementSchema.index({ requiredSkills: 1 });
RequirementSchema.index({ applicationDeadline: 1 });
RequirementSchema.index({ slug: 1 }, { unique: true });
```

---

## 3. Application System & Data Integrity

### 3.1 MongoDB Application Schema
- `requirementId`: ObjectId (ref: `Requirement`, indexed)
- `applicantId`: ObjectId (ref: `User`, indexed)
- `creatorProfileId`: ObjectId (ref: `CreatorProfile`, indexed)
- `proposal`: string (creative pitch and execution approach)
- `offeredPrice`: number (proposed bid in INR)
- `currency`: string (default 'INR')
- `availability`: string (e.g. "Immediately Available")
- `estimatedDelivery`: string (e.g. "3-5 Business Days")
- `selectedPortfolioItems`: Array<{ title: string; mediaUrl: string; mediaType: string; coverImage?: string; clientBrand?: string; }>
- `additionalMessage`: string
- `status`: ApplicationStatus (`SUBMITTED`, `VIEWED`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`, indexed)
- `matchScore`: number (0–100%, indexed)
- `brandNotes`: string

### 3.2 Data Integrity & Anti-Duplicate Rules
- **Compound Unique Index**: `ApplicationSchema.index({ requirementId: 1, applicantId: 1 }, { unique: true });` guarantees no candidate can submit duplicate applications to the same opportunity.
- **Deadline Guard**: Applications are blocked if `applicationDeadline < Date.now()`.
- **Status Guard**: Applications are blocked if requirement status is not `PUBLISHED`.
- **Account Guard**: Applications are blocked if creator profile is `SUSPENDED` or unverified.

---

## 4. Deterministic Matching Engine (`MatchingService`)

The matching service calculates a compatibility score (0–100%) between a creative professional and a requirement opportunity:

$$\text{MatchScore} = \text{CategoryScore} (35) + \text{LocationScore} (20) + \text{SkillsScore} (20) + \text{PlatformScore} (15) + \text{AvailabilityScore} (10)$$

### Match Factor Breakdown:
1. **Category Alignment (up to 35 pts)**:
   - Primary discipline exact match: +25 pts
   - Secondary discipline match: +18 pts
   - Subcategory specialization match: +10 pts
2. **Location & Remote Fit (up to 20 pts)**:
   - Remote allowed on requirement: +20 pts
   - City exact match: +20 pts
   - Service area travel match: +16 pts
3. **Skills Intersection (up to 20 pts)**:
   - Proportional match of required skills in creator's verified skillset: $\frac{\text{matched}}{\text{required}} \times 20$
4. **Target Platform Fit (up to 15 pts)**:
   - Alignment with creator's connected channels and portfolio formats: +15 pts
5. **Availability Fit (up to 10 pts)**:
   - `AVAILABLE_NOW`: +10 pts
   - `BOOKING_NEXT_MONTH`: +6 pts

The service returns both the final score and human-readable explanation tags (e.g. *"Exact Discipline Match in Cinematography"*, *"Direct City Match in Mumbai"*, *"Matches 4/5 Required Skills"*).

---

## 5. Shortlist System

The platform supports two distinct shortlisting workflows:
1. **General Saved Talent**: Brands bookmark creative profiles directly from `/explore` into general lists.
2. **Requirement-Specific Shortlists**: Brands shortlist applicants directly during requirement candidate review, triggering immediate notifications to the creator.

---

## 6. In-App Notification System

Lightweight event-driven notifications alert users of marketplace transitions:
- `REQUIREMENT_PUBLISHED`: Brand is confirmed that their brief is live.
- `APPLICATION_RECEIVED`: Brand is notified when a new candidate applies with their match score %.
- `APPLICATION_SHORTLISTED`: Creator receives an alert: *"You have been shortlisted by [Brand Name]!"*
- `APPLICATION_ACCEPTED`: Creator receives an alert: *"Application Accepted! You have been hired by [Brand Name]."*
- `APPLICATION_REJECTED`: Creator is notified of the outcome gracefully.
- `REQUIREMENT_DEADLINE_APPROACHING`: Brand is alerted 24 hours before proposal intake closes.

---

## 7. Frontend User Experience & Routes

| User / Role | Route | Purpose & Key Features |
| :--- | :--- | :--- |
| **All Users** | `/requirements` | Public Opportunity Marketplace with category pills, search bar, city dropdown, budget range filter, remote toggle, and attractive `RequirementCard`s. |
| **All Users** | `/requirements/[slug]` | High-converting single requirement opportunity page with brief narrative, deliverables scope, budget, deadline, brand overview, and sticky proposal action box. |
| **Creators** | *Apply Modal* | Proposal pitch, offered quote, delivery timeline, and 1–5 relevant portfolio project picker. |
| **Brands** | `/requirements/create` | 8-step wizard with category-specific custom questions (Influencer vs Videographer vs Photographer vs Editor), live preview, autosave draft, and publishing. |
| **Brands** | `/brand/requirements` | Brand dashboard managing all posted opportunities (Published, Draft, Paused, Closed). |
| **Brands** | `/brand/requirements/[id]/applicants` | Candidate evaluation dashboard with Match Score % badges, proposal pitch review, rate comparison, portfolio viewer, and Shortlist / Accept / Reject / Contact actions. |
| **Creators** | `/creator/applications` | Tracking dashboard for submitted proposals, status updates, client notes, and withdrawal actions. |
| **Admin** | `/marketplace/requirements` | Moderation table to feature, approve, pause, or close requirements. |
| **Admin** | `/marketplace/applications` | Oversight table of all candidate submissions, match scores, and hiring actions. |

---

## 8. Verification & Test Results

| Test Suite / Area | Verification Command | Result |
| :--- | :--- | :--- |
| **Universal Types** (`@brands-creators/types`) | `tsc -p packages/types/tsconfig.json --noEmit` | **0 Errors (Passed)** |
| **NestJS Backend API** (`@brands-creators/api`) | `tsc -p apps/api/tsconfig.json --noEmit` | **0 Errors (Passed)** |
| **Web Marketplace** (`@brands-creators/web`) | `tsc -p apps/web/tsconfig.json --noEmit` | **0 Errors (Passed)** |
| **Admin Backoffice** (`@brands-creators/admin`) | `tsc -p apps/admin/tsconfig.json --noEmit` | **0 Errors (Passed)** |
| **Marketplace Opportunities** | `GET http://localhost:3000/requirements` | **HTTP 200 OK** |
| **Requirement Creation Wizard** | `GET http://localhost:3000/requirements/create` | **HTTP 200 OK** |
| **Single Requirement Page** | `GET http://localhost:3000/requirements/direct-response-ugc-skincare-launch-mumbai` | **HTTP 200 OK** |
| **Brand Requirements Dashboard** | `GET http://localhost:3000/brand/requirements` | **HTTP 200 OK** |
| **Brand Applicants Review** | `GET http://localhost:3000/brand/requirements/req-01/applicants` | **HTTP 200 OK** |
| **Creator Applications Tracker** | `GET http://localhost:3000/creator/applications` | **HTTP 200 OK** |
| **Admin Requirements Moderation** | `GET http://localhost:3001/marketplace/requirements` | **HTTP 200 OK** |
| **Admin Applications Oversight** | `GET http://localhost:3001/marketplace/applications` | **HTTP 200 OK** |

---

## 9. Known Limitations & Phase 04 Recommendations

- **Payments & Escrow**: Escrow deposits, milestone payments, and payout invoicing are intentionally deferred to Phase 05.
- **Real-Time Direct Messaging**: Socket.io real-time chat with attachment sharing is deferred to Phase 06.
- **AI Reranking**: Advanced neural embedding matching is deferred to Phase 07 (deterministic scoring foundation is fully in place).

---

## PHASE 03 STATUS: READY
