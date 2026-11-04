# Phase 34 — Agency Product Architecture Review & Strategy Comparison

**Project:** Brands & Creators B2B Creative Marketplace SaaS  
**Document Version:** 1.0.0 — **Date:** 2026-11-04  
**Author:** Quality Assurance & System Architecture Engineering  
**Scope:** Architectural Evaluation of Agency Role vs Brand Archetype  

---

## 1. Context & Motivation

During Phase 33 QA audit, the investigation of the `UserRole.AGENCY` role identified that while `AGENCY` exists as an enum value in `@brands-creators/types` and is selectable on the registration interface (`/(auth)/register`), backend authentication (`auth.service.ts`) currently maps agency accounts directly into the `brandProfiles` collection with:
- `tagline: 'Creative & Talent Agency'`
- `industry: 'Media & Advertising Agency'`
- Routing to `/dashboard/brand`
- Governance via `/people/brands` in Admin Portal

This review provides a rigorous comparative analysis between:
- **Option A:** Agency as an Enterprise Brand Hiring Archetype (Current baseline with enhanced enterprise tooling).
- **Option B:** Agency as a Dedicated Standalone Account Type (Separate `agencyProfiles` collection, dedicated multi-sided dashboard, creator roster management, and multi-client governance).

> [!IMPORTANT]
> **Governance Note:** In accordance with Phase 34 Critical Execution Rules, **neither option is implemented in code during this phase**. This document serves as the formal technical decision matrix for engineering leadership and product stakeholder review.

---

## 2. Option Comparison Matrix

| Architectural Dimension | Option A: Enterprise Brand Archetype (Current) | Option B: Dedicated Standalone Role (`agencyProfiles`) |
|---|---|---|
| **Core Concept** | Agency is a specialized brand client managing larger advertising budgets and multiple internal team members. | Agency is a two-sided entity managing both client campaigns (demand) and creator rosters (supply). |
| **Database Collections** | Stored in `brandProfiles` with `industry: 'Media & Advertising Agency'`. | Stored in dedicated `agencyProfiles` collection. |
| **User Schema Reference** | `User.brandProfileId` | `User.agencyProfileId` (new schema field) |
| **Onboarding Route** | `/onboarding` (unified multi-step wizard) | Dedicated `/onboarding/agency` or customized steps |
| **Dashboard Route** | `/dashboard/brand` | Dedicated `/dashboard/agency` |
| **Admin Management** | Moderated under `/people/brands` with industry badge | Dedicated `/people/agencies` backoffice governance module |
| **Talent Representation** | Hires talent through marketplace briefs only | Can represent a roster of creators and pitch on their behalf |
| **Client Management** | Internal team members invited via `BrandTeamMember` | Multi-client workspace with sub-accounts or client branding |
| **RBAC Complexity** | **Low**: Shared role guards (`@Roles(BRAND, AGENCY)`) | **High**: Distinct permission matrix for Agency Admins, Agents, and Talent |
| **Escrow & Payments** | Standard brand escrow & token purchases | Complex split disbursements, agent commission retention, pass-through billing |
| **Estimated Dev Effort** | 1–2 sprints (polish enterprise team features) | 4–6 sprints (complete multi-sided platform architecture) |
| **Breaking Changes** | None. 100% backward compatible. | High: Schema migrations, routing updates, role refactoring. |

---

## 3. Deep Architectural Breakdown

### Option A: Agency as an Enterprise Brand Account

#### 3.1 Architectural Concept
In Option A, an Agency is modeled as a power-user brand. In commercial reality, many creative agencies hire freelance directors, cinematographers, influencers, and editors on behalf of their end clients. Functionally, their workflow on Brands & Creators is identical to an enterprise brand:
1. Publish campaign briefs (`/requirements/create`).
2. Review creator pitches and match scores (`/brand/requirements/[id]/applicants`).
3. Accept proposals and fund project escrow (`/projects/[id]`).
4. Review and approve deliverables.
5. Invite team members (e.g. Campaign Managers, Art Directors, Account Leads).

#### 3.2 Required Changes (Minor Enhancement)
- **Backend:** Add a virtual property or query filter in `brands.service.ts` to allow filtering brands by `isAgency: boolean` or `industry === 'Media & Advertising Agency'`.
- **Admin UI:** Add an "Agency Only" filter toggle on `:3001/people/brands`.
- **Database:** Zero breaking changes. `brandProfiles` continues as the canonical collection.

#### 3.3 Pros & Cons
- **Pros:**
  - Stable, battle-tested, immediately operational with 0 migrations.
  - Zero risk of regression to existing users or test suites.
  - Simplified RBAC boundaries and payment processing.
- **Cons:**
  - Agencies cannot represent exclusive creators on the supply side.
  - Cannot white-label client approvals directly to an external client without inviting them as a brand team member.

---

### Option B: Agency as a Dedicated Multi-Sided Role

#### 3.4 Architectural Concept
In Option B, an Agency is elevated to a first-class marketplace participant bridging demand and supply:
- **Supply Side (Talent Agency / Management):** Manages a roster of exclusive creator profiles, receives inquiry briefs, submits proposals on behalf of represented talent, and collects commissions.
- **Demand Side (Media / Creative Agency):** Posts requirements for multiple corporate client accounts with separated billing and approval workflows.

#### 3.5 Detailed Technical Impact Matrix
1. **Database Changes:**
   - Create new Mongoose schema `AgencyProfile` in `agencyProfiles` collection:
     - Fields: `agencyName`, `slug`, `rosterCreatorIds: ObjectId[]`, `clientAccounts: ObjectId[]`, `commissionFeePercent`, `billingEntities`.
   - Update `User` schema: Add `agencyProfileId?: Types.ObjectId;`.
   - Update `Application` schema: Add `submittedByAgencyId?: Types.ObjectId;` to allow agency bid submission.
2. **Backend Changes:**
   - Create new NestJS module: `apps/api/src/modules/agencies/` (`agencies.controller.ts`, `agencies.service.ts`).
   - Update `auth.service.ts` to provision `AgencyProfile` upon registration with `UserRole.AGENCY`.
   - Update project collaboration controllers (`projects`, `milestones`, `escrow`) to route permissions through agency representatives.
3. **Frontend Changes:**
   - Create dedicated dashboard at `apps/web/app/dashboard/agency/page.tsx`.
   - Create creator roster management view at `apps/web/app/agency/roster/page.tsx`.
   - Create client campaign manager at `apps/web/app/agency/clients/page.tsx`.
4. **Admin Portal Changes:**
   - Create dedicated backoffice management page at `apps/admin/app/people/agencies/page.tsx`.
   - Add Agency KPI counters to Admin Mission Control.
5. **Impact on Existing Data:**
   - Any historical or test accounts registered with `UserRole.AGENCY` currently linked to `brandProfiles` would require a data migration script to decouple from `brandProfiles` and seed into `agencyProfiles`.

#### 3.6 Pros & Cons
- **Pros:**
  - True representation of elite talent agencies (e.g. CAA, WME model for creator economy).
  - Unlocks higher-ticket agency subscriptions and enterprise B2B licensing.
- **Cons:**
  - Substantial development complexity (4–6 sprints).
  - High risk of edge cases in project escrow, deliverable review, and dual-party dispute resolution.
  - Requires extensive frontend UX design, onboarding flows, and regression testing.

---

## 4. Architectural Recommendation & Staging Roadmap

### Quality Engineering Recommendation: **Phase-Staged Hybrid Approach**

1. **For Immediate Staging & Production Launch (Current Release):**
   - **Retain Option A.**
   - Formally document in product guidelines that Agency accounts currently operate as **Enterprise Brand Client Archetypes** with collaborative multi-member campaign management.
   - Clarify role badge on UI: Display "Creative Agency" badge on profiles and directories.
   - Maintain stability and zero breaking changes for the current production readiness milestone.

2. **For Post-Launch Roadmap (v2.0 Milestone):**
   - Evaluate customer demand from enterprise agencies during staging/beta.
   - If exclusive talent roster management is required by signing partners, plan Option B as an isolated feature release with dedicated RFC, schema versioning, and staged migration scripts.

---

## 5. Stakeholder Decision Gate

| Stakeholder Role | Recommended Sign-Off | Decision |
|---|---|---|
| **Product Lead** | Option A for v1.0 Launch; Option B for v2.0 Roadmap | `PENDING STAKEHOLDER APPROVAL` |
| **Lead Architect** | Approve Option A as low-risk, maintain backward compatibility | `RECOMMENDED` |
| **QA Lead** | Verify Option A RBAC and team collaboration tests pass | `VERIFIED PASS` |

