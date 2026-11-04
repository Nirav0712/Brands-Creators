# Brands & Creators — Phase 08 Implementation Specification
## Social Verification, AI Intelligence, Enterprise CRM & Real-Time Dashboards

---

## 1. Executive Summary & Objective

Phase 08 elevates **Brands & Creators** from an operational transaction marketplace into an intelligent, enterprise-ready, trust-certified creative network.

### Core Objectives:
1. **Verified Pro & Social Proof Engine**:
   - Creator social channels linking with automatic handle extraction and validation.
   - Creator verification request workflow transitioning profile to `PENDING`.
   - Admin Trust & Safety verification queue (`/moderation/verification`) wired to real MongoDB records, approving/rejecting verification badges with audit logging and instant Socket.IO notifications.
   - Public Creator Profile (`/creators/[slug]`) dynamically displaying verified platform badges, live follower metrics, and authentic channel links.
2. **Advanced AI Intelligence Engine**:
   - **Semantic Compatibility Matching**: Multi-dimensional compatibility scoring (0–100%) between creator portfolios/rates/skills and brand requirements, providing structured strengths and hiring recommendations.
   - **AI Proposal Pitch Assistant**: Dynamic assistant for creators that analyzes the brief and generates tailored, compelling proposals with suggested milestone breakdowns.
   - **AI Requirement Brief Optimizer**: Real-time brief analysis for brands that recommends market budget tiers, target skill tags, and standard deliverables.
3. **Brand Campaign Analytics & Enterprise Multi-Seat CRM**:
   - Real-time aggregated campaign analytics: pipeline conversion rates, average bids, budget utilization, and category distribution.
   - Enterprise multi-seat team management: brand owners can invite collaborators with contextual roles (`CAMPAIGN_MANAGER`, `FINANCE_REVIEWER`, `COLLABORATOR`).
4. **Real-Time Live Web Experience ("Rel-Time Working")**:
   - Creator Dashboard (`/dashboard/creator`): Real MongoDB statistics, live proposal tracking, real-time unread counts, and Socket.IO event listeners for live dynamic updates without manual refresh.
   - Brand Dashboard (`/dashboard/brand`): Real MongoDB metrics, active requirements listing, and live applicant notifications.
   - Admin Mission Control (`/admin`): Real database counters and active queue feeds.

---

## 2. Architecture & Data Models

### 2.1 Brand Team Member Subdocument
Integrated into `BrandProfile` schema:
```typescript
@Schema({ _id: true, timestamps: true })
export class BrandTeamMember {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ type: String, enum: BrandTeamRole, default: BrandTeamRole.COLLABORATOR })
  role: BrandTeamRole;

  @Prop({ type: String, enum: ['INVITED', 'ACTIVE', 'REVOKED'], default: 'INVITED' })
  status: string;

  @Prop({ default: Date.now })
  invitedAt: Date;

  @Prop()
  joinedAt?: Date;
}
```

### 2.2 Social Account Schema Enhancements
Existing `socialAccounts` collection leveraged with:
- `verificationStatus`: `UNVERIFIED` | `PENDING` | `VERIFIED` | `REJECTED`
- `metrics`: `{ followers, subscribers, postsCount, engagementRate }`
- `verificationRequestedAt`: Timestamp when creator submitted profile for badging.

---

## 3. API Reference & Endpoints

### 3.1 Social & Verification APIs
- `GET /api/v1/social/my`: Creator's connected social channels.
- `POST /api/v1/social`: Add/update social channel link.
- `DELETE /api/v1/social/:id`: Remove social channel.
- `POST /api/v1/social/:id/sync`: Sync/refresh metrics.
- `GET /api/v1/social/public/:userId`: Verified public social metrics for profile showcase.
- `POST /api/v1/social/request-verification`: Creator submits verification request.
- `GET /api/v1/admin/verification-queue`: Admin queue of creators awaiting badge review.
- `POST /api/v1/admin/creators/:id/verify`: Admin decision (`VERIFIED` or `REJECTED`).

### 3.2 AI Intelligence APIs
- `POST /api/v1/ai/match-score`: Semantic compatibility analysis between creator and requirement.
- `POST /api/v1/ai/proposal-pitch`: AI proposal draft assistant for creators.
- `POST /api/v1/ai/optimize-brief`: AI campaign brief optimizer for brands.

### 3.3 Brand Analytics & Enterprise CRM APIs
- `GET /api/v1/brands/analytics`: Real-time aggregated campaign and financial analytics.
- `GET /api/v1/brands/team`: List brand team members.
- `POST /api/v1/brands/team/invite`: Invite new team collaborator.
- `DELETE /api/v1/brands/team/:memberId`: Revoke team member access.

---

## 4. Frontend Implementation & Real-Time Flow

- **Creator Studio (`/dashboard/creator`)**:
  - Live API fetch for proposals, earnings summary, and profile stats.
  - Socket.IO listener for `notification:new`, `application:updated`, and `message:new`.
- **Brand Hub (`/dashboard/brand`)**:
  - Live API fetch for active briefs, total applicants, and project statuses.
  - Socket.IO listener for new application submissions.
- **Admin Verification Queue (`/moderation/verification`)**:
  - Live queue loaded from `/admin/verification-queue`.
  - Approve & Reject actions with instant status updates and real MongoDB mutation.
- **AI Proposal Generator in Proposal Modal / Apply Page**:
  - Interactive "Generate with AI" button that drafts a proposal matching the requirement brief.
- **Public Creator Profile (`/creators/[slug]`)**:
  - Dynamic social tab rendering verified channel links and follower statistics.
