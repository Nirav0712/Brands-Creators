# Phase 34 — Orphaned Records Relational Investigation & Audit Analysis

**Project:** Brands & Creators B2B SaaS Monorepo  
**Date:** 2026-11-04 — **Environment:** Local Development (`brands_creators_dev`)  
**Status:** COMPLETE & DOCUMENTED  

---

## 1. Executive Summary

During Phase 33 and Phase 34 forensic database audits, 209 historical records were identified that reference obsolete User ObjectIDs from automated QA test phases (Phases 04 through Phase 32). In earlier phases, automated test runners created synthetic users, executed transactions, and cleaned up test users via regular expressions or boolean flags. However, dependent records created during those test runs remained without active parent user references.

### Summary of Orphaned Records

| Collection | Total Count | Classification | Parent / Relational Status |
|---|---|---|---|
| **requirements** | 12 | CONFIRMED_TEST_DATA | References purged test brand users; 0 active proposals/applications |
| **projects** | 30 | REFERENCED_BY_OTHER_RECORDS / CONFIRMED_TEST_DATA | References purged test brands/creators; linked to 30 orphaned conversations |
| **conversations** | 65 | REFERENCED_BY_OTHER_RECORDS / CONFIRMED_TEST_DATA | 30 linked to projects, 35 standalone test chats; linked to 85 messages |
| **messages** | 85 | CONFIRMED_TEST_DATA | All 85 belong to orphaned conversations; contain synthetic QA test strings & XSS assertions |
| **creatorProfiles** | 10 | CONFIRMED_TEST_DATA | Slugs contain timestamped fixtures (e.g. `creator_p12_1792483311593`) |
| **brandProfiles** | 5 | CONFIRMED_TEST_DATA | Slugs contain timestamped fixtures (e.g. `brand_p12_1792483311593`) |
| **productionTeamProfiles** | 2 | CONFIRMED_TEST_DATA | Slugs contain Phase 32 test fixtures (`qa_p32_p_...`) |
| **tokenWallets** | 4 | CONFIRMED_TEST_DATA | Zero balance wallets for purged Phase 32 test users |
| **notification_preferences** | 92 | CONFIRMED_TEST_DATA | Orphaned preferences for purged historical test users |

---

## 2. Classification Policy

- **CONFIRMED_TEST_DATA**: Synthetically generated records created exclusively during automated QA execution suites with explicit test timestamps, mock payloads, or synthetic slug conventions. Recommended action: SAFE_CLEANUP.
- **REFERENCED_BY_OTHER_RECORDS**: Orphaned records that are still pointed to by other dependent orphaned records (e.g., a project referenced by an orphaned conversation). Recommended action: CASCADE_CLEANUP_IN_ORDER (Messages -> Conversations -> Projects -> Requirements).
- **HISTORICAL_BUSINESS_DATA**: Real business contracts, customer inquiries, genuine financial records. (Audit finding: ZERO records in this category. All genuine records belong to Super Admin, Demo Creator, or Demo Brand).
- **UNKNOWN_OWNERSHIP**: Records where ownership cannot be definitively verified. (Audit finding: ZERO records in this category. All IDs map directly to deleted QA user patterns).

---

## 3. Detailed Per-Record Analysis Matrix

### A. Requirements (12 Records)

| Document ID | Title | Missing Brand/User Ref | Status | Created At | Classification | Recommended Action |
|---|---|---|---|---|---|---|
| `6ae43da8585c72e9e307d113` | Premium Summer Fashion Campaign 2026 (Updated) | `6ae43da4585c72e9e307d0a0` | PUBLISHED | 2026-10-30T06:48:08.982Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae43da9585c72e9e307d1a6` | Zenith Tech Product Launch Commercial | `6ae43da5585c72e9e307d0ac` | PUBLISHED | 2026-10-30T06:48:09.411Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae43da9585c72e9e307d1df` | Lifecycle State Machine Test Opportunity | `6ae43da4585c72e9e307d0a0` | COMPLETED | 2026-10-30T06:48:09.670Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae43da9585c72e9e307d20b` | Expired Deadline Opportunity for Validation | `6ae43da4585c72e9e307d0a0` | PUBLISHED | 2026-10-30T06:48:09.889Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae43daa585c72e9e307d22e` | Category Dynamic Fields Influencer Campaign | `6ae43da4585c72e9e307d0a0` | PUBLISHED | 2026-10-30T06:48:10.031Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae43db5585c72e9e307d28a` | Phase 04 Messaging Campaign 1793342901519 | `6ae43da4585c72e9e307d0a0` | PUBLISHED | 2026-10-30T06:48:21.530Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae43dc2585c72e9e307d3c5` | Phase 05 Project Campaign 1793342914627 | `6ae43da4585c72e9e307d0a0` | PUBLISHED | 2026-10-30T06:48:34.643Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae43dcf585c72e9e307d58d` | Phase 06 Commercial Project 1793342927481 | `6ad609a762a4a18f0cd14176` | PUBLISHED | 2026-10-30T06:48:47.502Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae43dd0585c72e9e307d648` | Failure Test Campaign 1793342928377 | `6ad609a762a4a18f0cd14176` | PUBLISHED | 2026-10-30T06:48:48.407Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae43dd1585c72e9e307d750` | P2 Campaign 1793342928998 | `6ad609a762a4a18f0cd14176` | PUBLISHED | 2026-10-30T06:48:49.015Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae43df0585c72e9e307d91f` | Winter Campaign Commercial Cinematography 1793342954069 | `6ae43def585c72e9e307d8b9` | PUBLISHED | 2026-10-30T06:49:20.700Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae43dfa585c72e9e307d9f4` | Cinematic Autumn Lookbook Launch Reel | `6ae43df8585c72e9e307d987` | PUBLISHED | 2026-10-30T06:49:30.921Z | CONFIRMED_TEST_DATA | PURGE_SAFE |

### B. Projects (30 Records)

| Document ID | Project Number | Title | Missing Brand / Creator | Status | Linked Conv ID | Classification | Recommended Action |
|---|---|---|---|---|---|---|---|
| `6ad611186f85eac190541bac` | BC-2026-000010 | Skincare Launch Commercial Video Project | Brand: `6ad611146f85eac190541b2c` / Creator: `none` | COMPLETED | `6ad611186f85eac190541baa` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad611386f85eac190541e53` | BC-2026-000011 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad611316f85eac190541d95` / Creator: `none` | CONFIRMED | `6ad611386f85eac190541e51` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad611786f85eac190541fc7` | BC-2026-000012 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad611706f85eac190541f09` / Creator: `none` | CONFIRMED | `6ad611786f85eac190541fc5` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad611f10f5f0740409d6642` | BC-2026-000013 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad611ea0f5f0740409d6584` / Creator: `none` | CONFIRMED | `6ad611f10f5f0740409d6640` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad6120c0f5f0740409d682c` | BC-2026-000014 | Skincare Launch Commercial Video Project | Brand: `6ad611ea0f5f0740409d6584` / Creator: `none` | COMPLETED | `6ad6120c0f5f0740409d682a` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad6127b0f5f0740409d6d74` | BC-2026-000020 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad612740f5f0740409d6cb6` / Creator: `none` | CONFIRMED | `6ad6127b0f5f0740409d6d72` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad612980f5f0740409d6f5e` | BC-2026-000021 | Skincare Launch Commercial Video Project | Brand: `6ad612740f5f0740409d6cb6` / Creator: `none` | COMPLETED | `6ad612980f5f0740409d6f5c` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad61e20daf06a2e57e241ab` | BC-2026-000028 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad61e1bdaf06a2e57e240ed` / Creator: `none` | CONFIRMED | `6ad61e20daf06a2e57e241a9` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad61e38daf06a2e57e24395` | BC-2026-000029 | Skincare Launch Commercial Video Project | Brand: `6ad61e1bdaf06a2e57e240ed` / Creator: `none` | COMPLETED | `6ad61e38daf06a2e57e24393` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad624edead1651a328266ee` | BC-2026-000033 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad624e8ead1651a32826614` / Creator: `none` | CONFIRMED | `6ad624edead1651a328266ec` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad62504ead1651a32826964` | BC-2026-000034 | Skincare Launch Commercial Video Project | Brand: `6ad624e8ead1651a32826614` / Creator: `none` | COMPLETED | `6ad62504ead1651a32826962` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad62df3e230e6e10781d34a` | BC-2026-000038 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad62defe230e6e10781d270` / Creator: `none` | CONFIRMED | `6ad62df3e230e6e10781d348` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad62e08e230e6e10781d5c1` | BC-2026-000039 | Skincare Launch Commercial Video Project | Brand: `6ad62defe230e6e10781d270` / Creator: `none` | COMPLETED | `6ad62e08e230e6e10781d5bf` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad635a439bd821e7d663b21` | BC-2026-000043 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad635a039bd821e7d663a47` / Creator: `none` | CONFIRMED | `6ad635a439bd821e7d663b1f` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad635bc39bd821e7d663d97` | BC-2026-000044 | Skincare Launch Commercial Video Project | Brand: `6ad635a039bd821e7d663a47` / Creator: `none` | COMPLETED | `6ad635bc39bd821e7d663d95` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad644cdf1106b92e39b9229` | BC-2026-000051 | Skincare Launch Commercial Video Project | Brand: `6ad635a039bd821e7d663a47` / Creator: `none` | COMPLETED | `6ad644cdf1106b92e39b9227` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad644f1f1106b92e39b959e` | BC-2026-000052 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad644eaf1106b92e39b94c4` / Creator: `none` | CONFIRMED | `6ad644f1f1106b92e39b959c` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad65aaaa633e748a9fa3729` | BC-2026-000057 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad65aa2a633e748a9fa364e` / Creator: `none` | CONFIRMED | `6ad65aaaa633e748a9fa3727` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad65ac9a633e748a9fa39a0` | BC-2026-000058 | Skincare Launch Commercial Video Project | Brand: `6ad65aa2a633e748a9fa364e` / Creator: `none` | COMPLETED | `6ad65ac9a633e748a9fa399e` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad70c0d2b7d585ecaec6bd3` | BC-2026-000063 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad70bfc2b7d585ecaec6af8` / Creator: `none` | CONFIRMED | `6ad70c0d2b7d585ecaec6bd1` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad70c892b7d585ecaec6e4d` | BC-2026-000064 | Skincare Launch Commercial Video Project | Brand: `6ad70bfc2b7d585ecaec6af8` / Creator: `none` | COMPLETED | `6ad70c892b7d585ecaec6e4b` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad714ae346ec918a49d7fc3` | BC-2026-000071 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad714a6346ec918a49d7ee9` / Creator: `none` | CONFIRMED | `6ad714ae346ec918a49d7fc1` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad714d2346ec918a49d823a` | BC-2026-000072 | Skincare Launch Commercial Video Project | Brand: `6ad714a6346ec918a49d7ee9` / Creator: `none` | COMPLETED | `6ad714d2346ec918a49d8238` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad720000dd8f3cde8b02aae` | BC-2026-000083 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad71ffc0dd8f3cde8b029d5` / Creator: `none` | CONFIRMED | `6ad71ff10dd8f3cde8b0290e` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad720150dd8f3cde8b02d21` | BC-2026-000084 | Skincare Launch Commercial Video Project | Brand: `6ad71ffc0dd8f3cde8b029d5` / Creator: `none` | COMPLETED | `6ad720150dd8f3cde8b02d1f` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad85805e97f41dc38ef6526` | BC-2026-000090 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad85801e97f41dc38ef644a` / Creator: `none` | CONFIRMED | `6ad720910dd8f3cde8b035d5` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad85827e97f41dc38ef67ab` | BC-2026-000091 | Skincare Launch Commercial Video Project | Brand: `6ad85801e97f41dc38ef644a` / Creator: `none` | COMPLETED | `6ad85827e97f41dc38ef67a9` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad85dadf4fb01572a1803ec` | BC-2026-000098 | Campaign 2 P14 1792564650263 | Brand: `6ad85dabf4fb01572a1802f0` / Creator: `none` | CONFIRMED | `6ad85dadf4fb01572a1803ea` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad85f6e177dd4cb5c657024` | BC-2026-000099 | Premium Summer Fashion Campaign 2026 (Updated) | Brand: `6ad85f59177dd4cb5c656f46` / Creator: `none` | CONFIRMED | `6ad85f0a177dd4cb5c656d48` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |
| `6ad85fb1177dd4cb5c6572ab` | BC-2026-000100 | Skincare Launch Commercial Video Project | Brand: `6ad85f59177dd4cb5c656f46` / Creator: `none` | COMPLETED | `6ad85fb1177dd4cb5c6572a9` | REFERENCED_BY_OTHER_RECORDS | PURGE_CASCADE |

### C. Creator Profiles (10 Orphaned Records)

| Document ID | Slug | Headline | Missing User Ref | Created At | Classification | Recommended Action |
|---|---|---|---|---|---|---|
| `6ad71ff00dd8f3cde8b02872` | `creator_p12_1792483311593` | Creative Professional & CREATOR | `6ad71ff00dd8f3cde8b02865` | 2026-10-20T08:01:52.985Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad71ff10dd8f3cde8b02886` | `unrelated_p12_1792483311593` | Creative Professional & CREATOR | `6ad71ff10dd8f3cde8b02879` | 2026-10-20T08:01:53.482Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad720900dd8f3cde8b03539` | `creator_p12_1792483470812` | Creative Professional & CREATOR | `6ad720900dd8f3cde8b0352c` | 2026-10-20T08:04:32.199Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad720900dd8f3cde8b0354d` | `unrelated_p12_1792483470812` | Creative Professional & CREATOR | `6ad720900dd8f3cde8b03540` | 2026-10-20T08:04:32.680Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad846490dd8f3cde8b036fe` | `creator_p12_1792558664216` | Creative Professional & CREATOR | `6ad846490dd8f3cde8b036f1` | 2026-10-21T04:57:45.606Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad8464a0dd8f3cde8b03712` | `unrelated_p12_1792558664216` | Creative Professional & CREATOR | `6ad8464a0dd8f3cde8b03705` | 2026-10-21T04:57:46.100Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad85896e97f41dc38ef6ffc` | `creator_p12_1792563349318` | Creative Professional & CREATOR | `6ad85896e97f41dc38ef6fef` | 2026-10-21T06:15:50.845Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad85897e97f41dc38ef7010` | `unrelated_p12_1792563349318` | Creative Professional & CREATOR | `6ad85897e97f41dc38ef7003` | 2026-10-21T06:15:51.353Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad860a0177dd4cb5c657b08` | `creator_p12_1792565402959` | Creative Professional & CREATOR | `6ad860a0177dd4cb5c657afb` | 2026-10-21T06:50:08.601Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad860a3177dd4cb5c657b1c` | `unrelated_p12_1792565402959` | Creative Professional & CREATOR | `6ad860a3177dd4cb5c657b0f` | 2026-10-21T06:50:11.429Z | CONFIRMED_TEST_DATA | PURGE_SAFE |

### D. Brand Profiles (5 Orphaned Records)

| Document ID | Slug | Company Name | Missing User Ref | Created At | Classification | Recommended Action |
|---|---|---|---|---|---|---|
| `6ad71ff00dd8f3cde8b0285e` | `brand_p12_1792483311593` | Lumina Brand India | `6ad71ff00dd8f3cde8b0285c` | 2026-10-20T08:01:52.504Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad7208f0dd8f3cde8b03525` | `brand_p12_1792483470812` | Lumina Brand India | `6ad7208f0dd8f3cde8b03523` | 2026-10-20T08:04:31.707Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad846490dd8f3cde8b036ea` | `brand_p12_1792558664216` | Lumina Brand India | `6ad846490dd8f3cde8b036e8` | 2026-10-21T04:57:45.120Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad85896e97f41dc38ef6fe8` | `brand_p12_1792563349318` | Lumina Brand India | `6ad85896e97f41dc38ef6fe6` | 2026-10-21T06:15:50.322Z | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ad8609e177dd4cb5c657af4` | `brand_p12_1792565402959` | Lumina Brand India | `6ad8609e177dd4cb5c657af2` | 2026-10-21T06:50:06.734Z | CONFIRMED_TEST_DATA | PURGE_SAFE |

### E. Production Team Profiles (2 Orphaned Records)

| Document ID | Slug | Studio Name | Missing User Ref | Created At | Classification | Recommended Action |
|---|---|---|---|---|---|---|
| `6ae976b00460b8515ff330cc` | `qa_p32_p_1793685150682` | Phase 32 Cine Studios | `6ae976b00460b8515ff330ca` | Tue Nov 03 2026 11:22:48 GMT+0530 (India Standard Time) | CONFIRMED_TEST_DATA | PURGE_SAFE |
| `6ae978820460b8515ff331f7` | `qa_p32_p_1793685617892` | Phase 32 Cine Studios | `6ae978820460b8515ff331f5` | Tue Nov 03 2026 11:30:34 GMT+0530 (India Standard Time) | CONFIRMED_TEST_DATA | PURGE_SAFE |

### F. Conversations (65 Records) & Messages (85 Records)

- **Total Conversations:** 65 (30 linked to Projects, 35 standalone test thread simulations).
- **Total Messages:** 85 (All 85 linked to the 65 orphaned conversations).
- **Observed Message Content:** Synthetic QA fixtures, e.g. `<script>alert("xss")</script>`, mock shoot schedules, sample negotiations from automated test suites.
- **Classification:** All 65 conversations and 85 messages are `CONFIRMED_TEST_DATA` with `REFERENCED_BY_OTHER_RECORDS` between conversations and messages.
- **Recommended Action:** Cascade deletion (delete messages first, then conversations).

### G. Auxiliary Collections

- **tokenWallets (4 Orphaned Records):** User IDs `6ae976ac0460b8515ff330a0`, `6ae9769f0460b8515ff33057`, `6ae9787f0460b8515ff331cb`, `6ae978720460b8515ff33181` (Phase 32 test run accounts with 0 balance). Preserved demo creator wallet (`6ae438999298720ec4102df0`) remains active.
- **notification_preferences (91 Orphaned Records):** Preferences for purged historical test users. Preserved demo creator preference remains active.
- **platformsettings duplicate (1 Record):** Legacy unindexed document in lowercase `platformsettings` (`PLATFORM_COMMISSION_PERCENTAGE: 5`). The canonical collection `platformSettings` contains 4 comprehensive system settings.

---

## 5. Remediation Cleanup Plan & Safeguards

1. **Full Database Backup:** Verified at `backups/backup_2026-11-04T03-44-40-932Z` (Restore verified 100% PASS).
2. **Isolated Orphan Export:** Verified at `backups/orphaned-test-data-export-2026-11-04.json`.
3. **Execution Safety Policy:** In accordance with Phase 34 instructions, **no destructive deletion of orphaned records will occur without explicit documentation and user sign-off**.
4. **Execution Script Prepared:** `scripts/cleanup-orphaned-data-p34.js` is prepared with strict dry-run and atomic deletion operations.

