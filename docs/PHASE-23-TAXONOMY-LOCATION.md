# Phase 23 — Dynamic Taxonomy, Custom Fields, People Directory & Location Discovery Report

## Executive Summary

Phase 23 delivers dynamic marketplace taxonomies, configurable custom fields, a unified multi-role People Directory, and MongoDB `2dsphere` geospatial proximity discovery.

These capabilities allow the marketplace to handle diverse creative disciplines (from micro-influencers to high-end drone units and corporate brands) with role-targeted fields, precise locality filters, and proximity radius calculations.

All features were implemented and tested strictly in the local development environment.

---

## 1. Architectural Implementation & Data Models

### 1.1 Category Hierarchy & Custom Fields (`apps/api/src/modules/categories/`)
- **`CategoryCustomField` Sub-schema**:
  - `key`: Identifier string.
  - `label`: Human-readable input title.
  - `type`: `CustomFieldType` (`TEXT`, `LONG_TEXT`, `NUMBER`, `BOOLEAN`, `SELECT`, `MULTI_SELECT`, `URL`, `DATE`).
  - `options`: Optional array of selectable values.
  - `required`: Validation flag.
  - `placeholder`: Input helper text.
  - `order`: Rendering sort index.
  - `defaultValue`: Optional initial value.
- **`Category` Schema Enhancements**:
  - `supportedProfileTypes`: Array of `UserRole` enums designating which personas (e.g. `CREATOR`, `PRODUCTION_TEAM`, `BRAND`) can classify under this category.
  - `customFields`: Array of `CategoryCustomField` objects.
  - `allowOtherOption`: Boolean allowing users to specify bespoke niches outside predefined subcategories.
- **Role-Based Endpoints**:
  - `GET /categories/for-role/:role`: Returns categories applicable to a designated role.

### 1.2 Structured Location & Geospatial Indexes (`apps/api/src/modules/creators/`)
- **`location` Schema**:
  - `country`: string (defaults to 'India')
  - `state`: string (e.g. 'Karnataka')
  - `city`: string (e.g. 'Bangalore')
  - `area`: locality / neighborhood (e.g. 'Indiranagar')
  - `postalCode`: string PIN code (e.g. '560038')
  - `addressLine1` & `addressLine2`: detailed street address.
  - `isPublicAddress`: boolean (defaults to `false`, shielding private street addresses from public cards).
  - `geoPoint`: GeoJSON object `{ type: 'Point', coordinates: [lng, lat] }`.
- **Geospatial Index**:
  - `CreatorProfileSchema.index({ 'location.geoPoint': '2dsphere' }, { sparse: true });`
- **Nearby Proximity Query**:
  - `GET /creators/nearby?lat=...&lng=...&radiusKm=...&category=...`
  - Utilizes MongoDB `$geoWithin` with `$centerSphere: [[lng, lat], radiusInRadians]` to accurately discover creators within an exact distance envelope.

---

## 2. UI Components & Directory Views

- **Unified People Directory (`apps/web/app/people/page.tsx`)**:
  - Multi-persona navigation tabs: All People, Creators & Talent, Production Teams, Brands & Clients.
  - Dynamic category pill bar driven by active categories.
  - Proximity radius selector (10km, 25km, 50km, 100km).
  - One-click "Find Nearby Talent" browser geolocation toggle with coordinate matching.
  - Rich cards displaying verified status, locality badges, client ratings, starting rates, and direct profile links.
- **Main Navigation Integration (`apps/web/components/navbar.tsx`)**:
  - Direct top-level navigation link to the People Directory (`/people`).

---

## 3. Test Verification Evidence

- Test script: `scripts/test-phase-23-taxonomy-location.js`
- Test run results:
  - **Total Tests**: 22
  - **Passed**: 22
  - **Failed**: 0
  - **Pass Rate**: 100%
- Covered workflows:
  - Querying the 10-master-category hierarchical tree (`GET /categories/tree`).
  - Administrator creation of a specialized category (`Aerial & Drone Cinematography`) with 3 custom fields (Text, Boolean, Number) and role restrictions (`CREATOR`, `PRODUCTION_TEAM`).
  - Role-specific category filtering (`GET /categories/for-role/CREATOR`).
  - Updating creator profile with structured Indiranagar location and geospatial coordinates `[77.6412, 12.9784]`.
  - Proximity search centered on Bangalore (`12.9716, 77.5946`) with 10 km radius successfully discovering the creator at 5.1 km.
  - Negative exclusion check proving Mumbai search (`19.0760, 72.8777`) excludes the Bangalore creator from a 25 km envelope.
  - People directory source responsiveness for creators, production teams, and brands.

