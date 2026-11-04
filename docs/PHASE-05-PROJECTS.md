# BRANDS & CREATORS — PHASE 05
# PROJECTS, MILESTONES & COLLABORATION WORKSPACE ARCHITECTURE

**Status:** `PRODUCTION READY`  
**Version:** `1.0.0`  
**Coverage:** 62/62 Phase 05 Integration Tests Passed (100%) | 57/57 Phase 04 Regression Passed (100%) | 62/62 Phase 03 Regression Passed (100%)  

---

## 1. Overview & Core Architecture

Phase 05 establishes the execution backbone of the **Brands & Creators** marketplace. It converts accepted marketplace applications into full-featured, collaborative project workspaces.

### Full Marketplace-to-Project Lifecycle Flow:
```
Brand posts Requirement
         │
         ▼
Creator / Professional applies (offered price, estimated delivery)
         │
         ▼
Brand reviews & Shortlists / Accepts Application
         │
         ▼
Brand creates Project Workspace (BC-YYYY-XXXXXX)
         │
         ├───────────────────────────────────────────────────────┐
         ▼                                                       ▼
Phase 04 Project Conversation Linked                Initial Milestones Created
         │                                                       │
         ▼                                                       ▼
Project Execution & Status: CONFIRMED ──► IN_PROGRESS ──► (ON_HOLD) ──► IN_PROGRESS
         │
         ▼
Milestone Deliverable Workflow:
Professional Submits V1 ──► Brand Requests Revision (Feedback) ──► Professional Submits V2 ──► Brand Approves
         │
         ▼
Tasks Checklist Completed + Files Metadata Logged + Audit Activity Recorded
         │
         ▼
Deterministic Progress Calculation (100%) ──► Brand Completes Project ──► COMPLETED
```

---

## 2. Project State Machine & Lifecycle

The project lifecycle is enforced server-side using a strict deterministic state machine:

| Status | Allowed Next Statuses | Description | Constraints & Roles |
|---|---|---|---|
| `DRAFT` | `CONFIRMED`, `CANCELLED` | Preliminary project workspace draft | Brand / Admin only |
| `CONFIRMED` | `IN_PROGRESS`, `CANCELLED`, `ON_HOLD` | Application accepted and project initiated | Brand / Admin only |
| `IN_PROGRESS` | `ON_HOLD`, `IN_REVIEW`, `COMPLETED`, `CANCELLED`, `DISPUTED` | Active collaboration, milestone execution | Both parties interact |
| `ON_HOLD` | `IN_PROGRESS`, `CANCELLED` | Project temporarily suspended | Mandatory `holdReason` required |
| `IN_REVIEW` | `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `DISPUTED` | Final deliverables submitted for approval | Automatic or Brand driven |
| `COMPLETED` | *Terminal State* | All milestones & deliverables completed | Brand / Admin; records `completedAt`, `actualEndDate` |
| `CANCELLED` | *Terminal State* | Project cancelled with recorded rationale | Mandatory `cancellationReason` required |
| `DISPUTED` | `IN_PROGRESS`, `CANCELLED`, `COMPLETED` | Disputed project state for backoffice moderation | Admin moderation queue |

Arbitrary jumps between invalid states (such as `COMPLETED -> IN_PROGRESS` or `CANCELLED -> CONFIRMED`) are rejected with `400 Bad Request`.

---

## 3. MongoDB Schemas & Indexes

### 3.1 `ProjectSchema` (`projects` collection)
```typescript
export interface IProject {
  _id: string;
  projectNumber: string;         // Unique, immutable human identifier (e.g. BC-2026-000001)
  title: string;
  slug: string;                  // Unique URL-safe SEO slug
  description: string;
  status: ProjectStatus;
  brandId: string;               // Ref to Brand User / Profile
  professionalId: string;        // Ref to Creator / Team User / Profile
  professionalType: string;      // CREATOR | PRODUCTION_TEAM | AGENCY
  requirementId: string;         // Ref to Requirement
  applicationId: string;         // Ref to accepted Application (Unique compound guard)
  conversationId?: string;       // Ref to Phase 04 Conversation
  approvedBudget: number;        // Strictly derived from application.offeredPrice
  currency: string;
  startDate?: Date;
  endDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  progress: number;              // Deterministic 0-100% computed from milestones
  participants: IProjectParticipant[];
  holdReason?: string;
  cancellationReason?: string;
  completionNotes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}
```

**Indexes:**
- `{ projectNumber: 1 }` (unique)
- `{ slug: 1 }` (unique)
- `{ applicationId: 1 }` (unique constraint preventing duplicate projects)
- `{ brandId: 1, createdAt: -1 }`
- `{ professionalId: 1, createdAt: -1 }`
- `{ requirementId: 1 }`
- `{ status: 1, updatedAt: -1 }`

---

### 3.2 `MilestoneSchema` (`milestones` collection)
```typescript
export interface IMilestone {
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  order: number;
  status: MilestoneStatus; // PENDING | IN_PROGRESS | SUBMITTED | IN_REVIEW | REVISION_REQUIRED | APPROVED | COMPLETED | CANCELLED
  dueDate?: Date;
  completedAt?: Date;
  completedBy?: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `{ projectId: 1, order: 1 }`
- `{ projectId: 1, status: 1 }`

---

### 3.3 `DeliverableSchema` (`deliverables` collection)
```typescript
export interface IDeliverable {
  _id: string;
  projectId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  type: DeliverableType; // IMAGE | VIDEO | DOCUMENT | DESIGN | LINK | OTHER
  status: DeliverableStatus; // PENDING | SUBMITTED | IN_REVIEW | REVISION_REQUIRED | APPROVED | REJECTED
  submissionVersion: number; // 1, 2, 3...
  files: IDeliverableFile[];
  links: string[];
  notes?: string;
  submittedBy?: string;
  submittedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  feedback?: string; // Latest feedback from Brand
  versions: IDeliverableVersion[]; // Complete immutable version history
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `{ projectId: 1, createdAt: -1 }`
- `{ milestoneId: 1 }`
- `{ status: 1 }`

---

### 3.4 `ProjectTaskSchema` (`project_tasks` collection)
```typescript
export interface IProjectTask {
  _id: string;
  projectId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  assignedTo?: string;
  createdBy: string;
  priority: TaskPriority; // LOW | MEDIUM | HIGH | URGENT
  status: TaskStatus;     // TODO | IN_PROGRESS | BLOCKED | COMPLETED
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `{ projectId: 1, status: 1 }`
- `{ assignedTo: 1 }`

---

### 3.5 `ProjectFileSchema` (`project_files` collection)
```typescript
export interface IProjectFile {
  _id: string;
  projectId: string;
  milestoneId?: string;
  deliverableId?: string;
  uploadedBy: string;
  fileName: string;
  url: string;
  publicId?: string;
  mimeType: string;
  size: number;
  version?: number;
  createdAt: Date;
}
```

**Indexes:**
- `{ projectId: 1, createdAt: -1 }`

---

### 3.6 `ProjectActivitySchema` (`project_activities` collection)
```typescript
export interface IProjectActivity {
  _id: string;
  projectId: string;
  actorId: string;
  type: ProjectActivityType; // PROJECT_CREATED | PROJECT_STARTED | PROJECT_STATUS_CHANGED | MILESTONE_CREATED | MILESTONE_SUBMITTED | DELIVERABLE_SUBMITTED | REVISION_REQUESTED | DELIVERABLE_APPROVED | TASK_CREATED | TASK_COMPLETED | FILE_UPLOADED | PROJECT_COMPLETED | PROJECT_CANCELLED | PROJECT_ON_HOLD
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
```

**Indexes:**
- `{ projectId: 1, createdAt: -1 }`

---

## 4. REST API Reference

All endpoints are protected by `JwtAuthGuard` and RBAC ownership verification.

### Projects API
| Method | Endpoint | Description | Authorization |
|---|---|---|---|
| `GET` | `/projects` | Get user projects with pagination and status filters | Project Participant / Admin |
| `GET` | `/projects/:id` | Get project workspace details (ID or Slug) | Project Participant / Admin |
| `POST` | `/projects/from-application/:applicationId` | Create project from accepted application | Requirement Owner / Admin |
| `PATCH` | `/projects/:id/status` | Update project lifecycle state | Project Participant / Admin |
| `POST` | `/projects/:id/hold` | Place project on hold (requires reason) | Project Participant / Admin |
| `POST` | `/projects/:id/complete` | Mark project completed | Brand Owner / Admin |
| `POST` | `/projects/:id/cancel` | Cancel project (requires reason) | Project Participant / Admin |

### Milestones API
| Method | Endpoint | Description | Authorization |
|---|---|---|---|
| `GET` | `/projects/:projectId/milestones` | List project milestones in order | Project Participant |
| `POST` | `/projects/:projectId/milestones` | Create project milestone | Brand Owner / Admin |
| `PATCH` | `/milestones/:id` | Update milestone details | Brand Owner / Admin |
| `PATCH` | `/milestones/:id/status` | Update milestone status | Project Participant |

### Deliverables & Revisions API
| Method | Endpoint | Description | Authorization |
|---|---|---|---|
| `GET` | `/projects/:projectId/deliverables` | List project deliverables | Project Participant |
| `POST` | `/projects/:projectId/deliverables` | Create deliverable placeholder | Brand Owner / Admin |
| `POST` | `/deliverables/:id/submit` | Submit deliverable version (V1, V2...) | Assigned Professional |
| `POST` | `/deliverables/:id/revision` | Request revision with mandatory feedback | Brand Owner / Admin |
| `POST` | `/deliverables/:id/approve` | Approve deliverable version | Brand Owner / Admin |

### Tasks API
| Method | Endpoint | Description | Authorization |
|---|---|---|---|
| `GET` | `/projects/:projectId/tasks` | List project tasks | Project Participant |
| `POST` | `/projects/:projectId/tasks` | Create task | Project Participant |
| `PATCH` | `/tasks/:id` | Update task details / assignment | Project Participant |
| `PATCH` | `/tasks/:id/status` | Mark task TODO / COMPLETED | Project Participant |

### Files API
| Method | Endpoint | Description | Authorization |
|---|---|---|---|
| `GET` | `/projects/:projectId/files` | List project files metadata | Project Participant |
| `POST` | `/projects/:projectId/files` | Store project file metadata | Project Participant |
| `DELETE` | `/project-files/:id` | Delete project file | File Owner / Admin |

### Activity API
| Method | Endpoint | Description | Authorization |
|---|---|---|---|
| `GET` | `/projects/:projectId/activity` | Retrieve structured audit activity timeline | Project Participant |

---

## 5. Security & Authorization Model

1. **Strict Multi-Tenant Isolation:**
   - Brand A cannot access Brand B's project workspace (`403 Forbidden`).
   - Creator A cannot access Creator B's project workspace (`403 Forbidden`).
   - Anonymous users cannot access any project workspace (`401 Unauthorized`).
2. **Deliverable Governance & Fraud Prevention:**
   - A Creator cannot approve their own deliverable (`403 Forbidden`).
   - A Brand cannot submit deliverables pretending to be the assigned creator (`403 Forbidden`).
   - An unrelated user cannot upload files or mutate tasks on another project (`403 Forbidden`).
3. **Duplicate Project Prevention:**
   - Uniqueness constraint on `applicationId` prevents race conditions or duplicate submissions creating multiple active projects for the same application (`409 Conflict`).
4. **Budget Integrity:**
   - `approvedBudget` is strictly extracted from the accepted application's `offeredPrice` and cannot be modified arbitrarily by frontend requests.

---

## 6. Messaging & Realtime Integration

- **Conversation Linkage:** When a project is created, the system links the canonical Phase 04 conversation (`type: 'PROJECT'`) using `projectId = project.projectNumber`. Both Brand and Creator are enrolled and can open the chat directly from the workspace header.
- **In-App Notifications:** Realtime and persisted notifications are automatically dispatched to the counterparty for all key project events (`PROJECT_CREATED`, `DELIVERABLE_SUBMITTED`, `REVISION_REQUESTED`, `DELIVERABLE_APPROVED`, `PROJECT_COMPLETED`).

---

## 7. Frontend Workspaces

- **Main Collaboration Workspace (`/projects/[id]`):**
  - Interactive tabs: **OVERVIEW**, **MILESTONES**, **DELIVERABLES**, **TASKS**, **FILES**, **ACTIVITY**.
  - Dynamic primary action bar based on current project and user state ("Start Project", "Submit Deliverable", "Review Submission", "Request Revision", "Approve", "Complete Project").
  - Deliverable submission modal with Cloudinary file uploads and link attachments.
  - Revision request modal with structured feedback textarea.
  - "Open Project Conversation" direct link to `/inbox?conversationId=...`.
- **Role-Aware Dashboards:**
  - Brand Dashboard: `/brand/projects`
  - Creator Dashboard: `/creator/projects`
  - Admin Moderation & Oversight: `/projects` (on admin backoffice)
