# PHASE 02 — DYNAMIC CATEGORIES & ADVANCED PROFILES
## Production Implementation, Architecture & Verification Report

---

## 1. Executive Summary

Phase 02 establishes the foundational **Identity, Taxonomy & Discovery Layer** for the **Brands & Creators** creative SaaS marketplace.

It implements a flexible, multi-disciplinary profile engine that natively supports:
- **CREATORS & TALENT** (Influencers, UGC creators, Models, Actors, Voice Artists, Dancers, Choreographers)
- **PRODUCTION & POST-PRODUCTION** (Production Houses, Commercial DPs, Video Editors, Reel Editors, VFX & Motion Graphics Studios, Drone Operators)
- **PHOTOGRAPHY & DESIGN** (Commercial/Fashion/Product Photographers, Brand & Packaging Designers, UI/UX Studios)
- **BEAUTY & STYLING** (Makeup Artists, Hair Stylists, Fashion Stylists, Wardrobe Designers)
- **MARKETING & AGENCIES** (Social Media, Performance Ads, SEO, PR, Integrated Creative Agencies)
- **BRANDS & BUSINESSES** (D2C, Enterprise, Agency Clients posting requirements and hiring talent)
- **STUDIOS & RENTALS** (Sound Stages, Cyclorama Studios, Cinema Camera & Lighting Rental Houses)

---

## 2. Dynamic Category & Taxonomy Architecture

### 2.1 Core Product Principles
Categories are **100% dynamic, database-driven, and hierarchical**. No hardcoded taxonomies exist in the frontend UI or backend controllers.

### 2.2 Hierarchical Structure
```
Level 0: Master Category (e.g., PRODUCTION)
  └── Level 1: Subcategory (e.g., Cinematography)
        └── Level 2: Optional Specialization (e.g., Car Rigs & High Speed)
```

### 2.3 Initial Seeded Master Taxonomy (10 Disciplines + 60+ Subcategories)

| Master Discipline | Slug | Key Subcategories |
| :--- | :--- | :--- |
| **INFLUENCERS** | `influencers` | Food, Fashion, Beauty, Fitness, Travel, Lifestyle, Technology, Finance, Parenting, Local/City |
| **PRODUCTION** | `production` | Production House, Video Production, Cinematography, Direction, Video Editing, Reel Editing, Motion Graphics, VFX, Drone |
| **PHOTOGRAPHY** | `photography` | Fashion, Product, Food, Commercial, Lifestyle, Event |
| **TALENT** | `talent` | Model, Actor, Child Artist, Anchor, Voice Artist, Presenter |
| **DESIGN** | `design` | Graphic Design, Brand Design, UI/UX, Illustration, Packaging |
| **BEAUTY & FASHION** | `beauty-fashion` | Makeup Artist, Hair Stylist, Fashion Stylist, Costume Designer |
| **PERFORMERS** | `performers` | Dancer, Choreographer, Dance Group, Performer |
| **MARKETING** | `marketing` | Social Media, SEO, Google Ads, Meta Ads, Content Marketing, Copywriting, PR |
| **AGENCIES** | `agencies` | Digital Marketing Agency, Social Media Agency, Influencer Marketing Agency, Creative Agency, Production Agency |
| **STUDIOS & RENTALS** | `studios-rentals` | Photo Studio, Video Studio, Equipment Rental, Camera Rental, Lighting Rental, Sound Rental |

### 2.4 MongoDB Category Schema
- `name`: string (e.g., "PRODUCTION")
- `slug`: string (indexed, unique, lowercase URL-safe)
- `description`: string (discipline overview)
- `icon`: string (Lucide icon identifier)
- `parentId`: ObjectId (ref to parent category or null for root)
- `level`: number (0 = Master, 1 = Subcategory, 2 = Specialization)
- `type`: CategoryType enum (`CREATOR`, `BRAND`, `PRODUCTION`, `AGENCY`, `GENERAL`)
- `status`: CategoryStatus enum (`ACTIVE`, `INACTIVE`, `ARCHIVED`)
- `featured`: boolean (highlighted on homepage & discovery)
- `sortOrder`: number (draggable / sequential display order)
- `seoTitle`: string (dynamic OpenGraph / meta title)
- `seoDescription`: string (search engine snippet)
- `createdAt` / `updatedAt`: Timestamps

---

## 3. Professional Profile System Architecture

### 3.1 Profile Structure
All creative professional types share a unified, normalized base profile schema extended with domain-specific sub-documents:

```
Base Profile (User, Slug, Verification, Visibility, Rating, Location, Service Areas)
  ├── Professional Type (CREATOR | PRODUCTION_TEAM | BRAND | AGENCY)
  ├── Taxonomy (Primary Category, Secondary Categories, Subcategories)
  ├── Services & Skills (Rate Cards, Pricing Models, Verified Skills)
  ├── Portfolio (Behance-Grade Projects, Images, 4K Videos, Reels, Case Studies)
  ├── Brand Collaborations (Previous Client Work, Logos, Campaign Roles)
  ├── Official Social Channels (Safe Handles, Follower Metrics, Engagement Rates)
  └── Profile Completion Engine (0–100% Calculator with Recommendations)
```

### 3.2 Pricing Models
Professionals have full flexibility to define transparent rate cards without forced constraints:
- `PER_HOUR`: Hourly consulting / edit sessions
- `PER_DAY`: Commercial shoot day rates / sound stage bookings
- `PER_SHOOT`: Fixed-scope photography / reel production
- `PER_PROJECT`: Turnkey commercial films / brand identity projects
- `MONTHLY`: Retainer contracts / ongoing creator brand ambassadorships
- `CUSTOM_QUOTE`: "Contact for pricing" without forcing arbitrary numbers

---

## 4. Multi-Step Onboarding Wizards

### 4.1 Creator 8-Step Onboarding (`/onboarding/creator`)
1. **Choose Professional Type**: Creator, Cinematographer, Editor, Photographer, Designer, Performer.
2. **Basic Information**: Profile photo, cover banner, display name, professional headline, bio story, multiple service locations & languages.
3. **Category & Skills**: Dynamic master discipline selection, subcategory chips, verified skill tags.
4. **Services & Pricing**: Rate cards, starting rate, pricing models, detailed package add-ons.
5. **Portfolio Projects**: Visual uploads, Behance-style project titles, 4K video URLs, client credits, tags.
6. **Social Channels**: Safe Instagram, YouTube, LinkedIn, X profiles with regex handle parsing.
7. **Availability & Operations**: Available Now vs Booking Next Month, remote/on-site willingness.
8. **Review & Publish**: Live profile completion score calculator (80%+ threshold for Instant Pro badge).

### 4.2 Brand 7-Step Onboarding (`/onboarding/brand`)
1. **Company Information**: Company legal name, trade name, logo, banner.
2. **Industry Domain**: D2C, Fashion, Tech, FMCG, Agency, Entertainment.
3. **HQ & Service Locations**: Headquarters city, state, operating countries.
4. **Website & Social**: Official website URL, LinkedIn company page, Instagram brand handle.
5. **Company Description**: Brand narrative, mission, creative requirements scale.
6. **Team & Sizing**: Employee tier (1-10, 11-50, 51-200, 200+), founded year.
7. **Review & Publish**: Direct publishing to brand directory.

---

## 5. Public Profiles & URL Architecture

All public URLs are strictly SEO-friendly, clean, and never expose MongoDB ObjectIds:

| Entity | URL Format | Example |
| :--- | :--- | :--- |
| **Creator Profile** | `/creators/[slug]` | `http://localhost:3000/creators/rohan-kapoor` |
| **Brand Profile** | `/brands/[slug]` | `http://localhost:3000/brands/glow-botanics` |
| **Production Studio** | `/production/[slug]` | `http://localhost:3000/production/lumina-studios` |
| **Discovery Directory** | `/explore` | `http://localhost:3000/explore` |

---

## 6. Social Media Architecture & Metrics Policy

### Safe Social Integration Principles:
- **No Unauthorized Scraping**: We never scrape Instagram or TikTok without authorization.
- **Safe Regex Parsing**: Handles are extracted safely from full profile URLs (e.g. `https://instagram.com/rohankapoor` → `@rohankapoor`).
- **Graceful Fallbacks**: When official OAuth API metrics are pending, the UI displays *"Verified sync on connection"* or exact creator-provided metrics rather than inventing fake data.
- **Zero Credential Requests**: Passwords and private credentials are never collected.

---

## 7. Admin Backoffice Capabilities

### 7.1 Dynamic Category Manager (`/marketplace/categories`)
- **Hierarchical Tree View**: Expandable/collapsible view of all 10 master disciplines and subcategories.
- **Interactive Modals**: Add Master Category, Add Subcategory, Edit Category, Configure SEO Metadata.
- **Reordering Controls**: Up/down sequential sortOrder adjustments.
- **Status & Featured Toggles**: Instant active/disabled state and homepage spotlight toggles.
- **Reset / Seed Button**: One-click restoration of the default 10-master taxonomy hierarchy.

### 7.2 Contextual Profile Editor (`/people/creators/[id]`)
Equipped with 6 dedicated tabs:
1. **Overview**: Health score (0–100%), quick status badges, moderation actions (Verify Pro, Feature, Suspend, Restore).
2. **Profile & Rates**: Basic info, headline, bio, experience level, service areas, rate cards, pricing models.
3. **Portfolio**: Visual grid of projects with client credits, tags, and featured status.
4. **Social**: Connected Instagram, YouTube, LinkedIn handles and follower statistics.
5. **Verification & Badges**: Pro verification approval workflow and badge assignment.
6. **Activity & Audit Log**: Immutable record of past admin actions (Created, Verified, Pricing Updated, Suspended) with reviewer, action, timestamp, and notes.

---

## 8. Testing & Verification Results

| Test Suite / Area | Verification Command | Result |
| :--- | :--- | :--- |
| **Universal Types** (`@brands-creators/types`) | `tsc -p packages/types/tsconfig.json --noEmit` | **0 Errors (Passed)** |
| **NestJS Backend API** (`@brands-creators/api`) | `tsc -p apps/api/tsconfig.json --noEmit` | **0 Errors (Passed)** |
| **Web Marketplace** (`@brands-creators/web`) | `tsc -p apps/web/tsconfig.json --noEmit` | **0 Errors (Passed)** |
| **Admin Backoffice** (`@brands-creators/admin`) | `tsc -p apps/admin/tsconfig.json --noEmit` | **0 Errors (Passed)** |
| **Next.js Marketplace Dev Server** | `GET http://localhost:3000/explore` | **HTTP 200 OK** |
| **Creator Public Profile** | `GET http://localhost:3000/creators/rohan-kapoor` | **HTTP 200 OK** |
| **Brand Public Profile** | `GET http://localhost:3000/brands/glow-botanics` | **HTTP 200 OK** |
| **Production Public Profile** | `GET http://localhost:3000/production/lumina-studios` | **HTTP 200 OK** |
| **Creator Onboarding Flow** | `GET http://localhost:3000/onboarding/creator` | **HTTP 200 OK** |
| **Brand Onboarding Flow** | `GET http://localhost:3000/onboarding/brand` | **HTTP 200 OK** |
| **Admin Category Manager** | `GET http://localhost:3001/marketplace/categories` | **HTTP 200 OK** |
| **Admin Creator Roster** | `GET http://localhost:3001/people/creators` | **HTTP 200 OK** |
| **Admin Production Roster** | `GET http://localhost:3001/people/production` | **HTTP 200 OK** |
| **Admin Profile Contextual Editor** | `GET http://localhost:3001/people/creators/cr-01` | **HTTP 200 OK** |

---

## 9. Known Limitations & Deferred to Later Phases

- **Payments & Escrow**: Escrow deposits, milestone payments, and payout invoicing are scheduled for Phase 05.
- **Real-Time Direct Messaging**: Socket.io real-time chat with file attachments is scheduled for Phase 06.
- **AI Matching**: Semantic creator-requirement recommendation engine is scheduled for Phase 07.

---

## PHASE 02 STATUS: READY
