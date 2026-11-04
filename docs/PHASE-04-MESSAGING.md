# BRANDS & CREATORS — PHASE 04
# UNIFIED INBOX, CONVERSATIONS & MESSAGING INFRASTRUCTURE ARCHITECTURE

**Status:** `PRODUCTION READY`  
**Version:** `1.0.0`  
**Coverage:** 57/57 Phase 04 Integration Tests Passed | 62/62 Phase 03 Regression Tests Passed  

---

## 1. Overview & Architecture

Phase 04 transforms **Brands & Creators** into a collaborative platform where Brands, Creators, Production Teams, and Agencies can communicate securely in real-time. The messaging infrastructure supports contextual conversations (Application-specific, Direct B2B, Project-specific, and Group chats) while maintaining strict RBAC isolation, data privacy, in-app notification triggers, and persistent MongoDB audit trails.

### Core Data Flow
```
Brand posts Requirement
      │
      ▼
Creator submits Application
      │
      ▼
Brand reviews Proposal ──► Click "Message Creator" (or Creator clicks "Message Brand")
      │                                       │
      ▼                                       ▼
Platform resolves/creates Canonical Application Conversation (1:1)
      │
      ├───────────────────────┬───────────────────────┐
      ▼                       ▼                       ▼
REST API (CRUD)       WebSocket Gateway       Notification Engine
- Auth verification    - Real-time emit        - In-App alert
- Ownership check      - Presence / Typing     - Unread counter update
- MongoDB persistence  - Room isolation
```

---

## 2. Conversation Model & Schema

Conversations are stored in the MongoDB collection `conversations` with the following schema:

```typescript
export interface IConversation {
  _id: string;
  type: 'DIRECT' | 'APPLICATION' | 'PROJECT' | 'GROUP';
  title?: string;
  avatar?: string;
  participants: Array<{
    userId: string;
    role: 'BRAND' | 'CREATOR' | 'AGENCY' | 'PRODUCTION_TEAM' | 'ADMIN';
    joinedAt: Date;
    lastReadAt: Date;
    muted?: boolean;
    archived?: boolean;
  }>;
  createdBy: string;
  requirementId?: string;
  applicationId?: string;
  projectId?: string;
  lastMessageId?: string;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  messageCount: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'CLOSED';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Uniqueness & Canonical Mapping
Application conversations enforce a strict canonical mapping:
`{ applicationId: ObjectId, type: 'APPLICATION' }` is indexed and resolved deterministically. Whether Brand or Creator initiates contact, both participants land in the **exact same conversation**.

---

## 3. Message Model & Schema

Messages are stored in the MongoDB collection `messages` with support for rich text, attachments, replies, editing, and soft deletion:

```typescript
export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'LINK' | 'SYSTEM';
  text: string;
  attachments?: Array<{
    url: string;
    publicId?: string;
    type: 'image' | 'video' | 'file' | 'document';
    mimeType: string;
    fileName: string;
    size: number;
    width?: number;
    height?: number;
    duration?: number;
  }>;
  replyToMessageId?: string;
  replyToMessage?: Partial<IMessage>;
  metadata?: Record<string, any>;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'DELETED' | 'EDITED';
  readBy?: Array<{ userId: string; readAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
  deletedBy?: string;
}
```

---

## 4. API Endpoints

### Conversations API (`/conversations`)
| Method | Endpoint | Description | Guard / RBAC |
|---|---|---|---|
| `GET` | `/conversations` | Get user inbox conversations (filters: `type`, `status`, `search`) | `JwtAuthGuard` |
| `GET` | `/conversations/unread-count` | Get total unread conversation count | `JwtAuthGuard` |
| `GET` | `/conversations/:id` | Get specific conversation details | `JwtAuthGuard` + Participant Check |
| `POST` | `/conversations` | Create direct / project conversation | `JwtAuthGuard` + Role Validation |
| `POST` | `/conversations/application/:applicationId` | Get or create canonical application conversation | `JwtAuthGuard` + Application Participant |
| `POST` | `/conversations/:id/read` | Mark all messages in conversation as read for user | `JwtAuthGuard` + Participant Check |
| `PATCH` | `/conversations/:id` | Update metadata (title, archive, mute) | `JwtAuthGuard` + Participant Check |

### Messages API (`/conversations/:conversationId/messages` & `/messages`)
| Method | Endpoint | Description | Guard / RBAC |
|---|---|---|---|
| `GET` | `/conversations/:id/messages` | Cursor-paginated message history (`before`, `limit`) | `JwtAuthGuard` + Participant Check |
| `POST` | `/conversations/:id/messages` | Send message (text, attachments, replyTo) | `JwtAuthGuard` + Participant Check |
| `PATCH` | `/messages/:id` | Edit own message text | `JwtAuthGuard` + Sender Ownership |
| `DELETE` | `/messages/:id` | Soft delete own message | `JwtAuthGuard` + Sender Ownership |
| `POST` | `/messages/:id/report` | Submit abuse / harassment / scam report | `JwtAuthGuard` + Auth User |
| `GET` | `/messages/reports/admin` | List message reports for moderation | `JwtAuthGuard` + `ADMIN` Role |
| `PATCH` | `/messages/reports/:id/resolve` | Resolve moderation report (`RESOLVED`, `DISMISSED`) | `JwtAuthGuard` + `ADMIN` Role |

---

## 5. Authorization & Security Model

1. **Strict Membership Validation:**
   Every conversation and message endpoint queries the authenticated user's `userId` inside `conversation.participants.userId`. If not present, it immediately rejects with `403 Forbidden`.
2. **Cross-Tenant Isolation:**
   - Brand A cannot access conversations belonging to Brand B.
   - Creator A cannot access conversations belonging to Creator B.
   - Non-participants cannot view messages or send replies.
3. **Sender Ownership Mutation Enforcers:**
   - Message edits require `message.senderId == req.user.userId`.
   - Message soft deletions require `message.senderId == req.user.userId`.
4. **XSS & Content Sanitization:**
   - Messages are sanitized and rendered as safe text content on the frontend without `dangerouslySetInnerHTML`.
   - Links are safely validated and rendered with `rel="noreferrer noopener"`.
5. **Anti-Spam & Rate Limiting:**
   - Endpoints are protected by NestJS `ThrottlerGuard` and server-side empty-body payload validators.

---

## 6. Realtime Architecture & WebSockets

The WebSocket gateway is mounted on the `/messaging` namespace using Socket.IO:
- **Authentication:** Validates JWT bearer token on connection handshake.
- **Room Joining:** Clients emit `conversation:join` with `{ conversationId }`. The gateway verifies database membership before joining the socket room.
- **Events Emitted:**
  - `message:new` — Broadcasted when a new message is persisted.
  - `message:updated` — Broadcasted on message edit.
  - `message:deleted` — Broadcasted on message soft-deletion.
  - `message:read` — Broadcasted when counterparty reads messages.
  - `typing:start` / `typing:stop` — Ephemeral typing notifications (not persisted to MongoDB).

---

## 7. Read State & Unread Calculations

- **Read Marker:** When a user opens a conversation or posts to `/conversations/:id/read`, their `participant.lastReadAt` is updated to `new Date()`.
- **Accurate Count:** Unread count is calculated as messages created after `participant.lastReadAt` where `senderId != currentUserId` and `status != DELETED`.
- **Global Badge:** `/conversations/unread-count` sums unread conversations across all active chats for navbar notification badges.

---

## 8. Database Indexes

Compound indexes configured on MongoDB collections:
- `conversations`:
  - `{ 'participants.userId': 1, updatedAt: -1 }`
  - `{ applicationId: 1, type: 1 }`
  - `{ requirementId: 1 }`
  - `{ projectId: 1 }`
  - `{ status: 1 }`
- `messages`:
  - `{ conversationId: 1, createdAt: -1 }`
  - `{ conversationId: 1, _id: -1 }`
  - `{ senderId: 1 }`
  - `{ replyToMessageId: 1 }`
- `messageReports`:
  - `{ status: 1, createdAt: -1 }`
  - `{ messageId: 1 }`

---

## 9. Future Integration Points (Phase 05 Ready)

The messaging module contains clean, isolated extension interfaces for external channels:
- **WhatsApp Business API:** Webhook ingestion into `MessagesService.createExternalMessage()`.
- **Instagram Direct Messenger:** Graph API webhook routing via conversation `metadata.externalPlatform = 'INSTAGRAM'`.
- **Email Inbound Parsing:** SendGrid / Postmark inbound parse webhook into application threads.
- **AI-Assisted Replies:** Hooks in `MessagesService` for pre-drafting responses based on requirement deliverables.
