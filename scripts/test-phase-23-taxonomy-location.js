/**
 * Test Suite: Phase 23 — Dynamic Taxonomy, Custom Fields, Location & Geospatial Discovery
 *
 * Tests:
 * 1. Category hierarchy and tree querying (GET /categories/tree)
 * 2. Admin creates category with dynamic custom fields and supportedProfileTypes
 * 3. Role-based category discovery (GET /categories/for-role/:role)
 * 4. Structured location update with coordinates [lng, lat] and custom field values
 * 5. 2dsphere Geospatial discovery within 10 km radius (GET /creators/nearby)
 * 6. Exclusion check: creator is NOT returned when query center is in another city (Mumbai vs Bangalore)
 * 7. Verification of unified people directory data sources (creators, production-teams, brands)
 */

const API_BASE = 'http://localhost:4000/api/v1';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
  passed++;
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  return { status: res.status, ok: res.ok, body };
}

async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data ? res.body.data.accessToken : res.body.accessToken;
}

async function run() {
  console.log('\n=============================================================');
  console.log('🚀 RUNNING PHASE 23 TEST SUITE: TAXONOMY, CUSTOM FIELDS & LOCATION');
  console.log('=============================================================\n');

  try {
    // 1. Authenticate users
    console.log('--- 1. Authenticating test users ---');
    const adminToken = await login('admin@brandsandcreators.com', 'SuperAdmin@Brands2026!');
    assert(!!adminToken, 'Admin logged in successfully');

    const creatorToken = await login('creator@demo.com', 'Password@123');
    assert(!!creatorToken, 'Creator logged in successfully');

    // 2. Query Category Tree
    console.log('\n--- 2. Hierarchical Category Tree ---');
    const treeRes = await request('/categories/tree');
    assert(treeRes.ok, 'Fetched category tree');
    const tree = treeRes.body.data || treeRes.body;
    assert(Array.isArray(tree) && tree.length >= 1, `Category tree has ${tree.length} root categories`);

    // 3. Admin Creates Category with Custom Fields & Supported Profile Types
    console.log('\n--- 3. Admin Creates Dynamic Category with Custom Fields ---');
    const timestamp = Date.now();
    const catSlug = `drone-aerial-${timestamp}`;
    const createCatRes = await request('/categories', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        name: `Aerial & Drone Cinematography ${timestamp}`,
        slug: catSlug,
        description: 'FAA & DGCA certified commercial drone pilots and aerial cinematography units.',
        supportedProfileTypes: ['CREATOR', 'PRODUCTION_TEAM'],
        allowOtherOption: true,
        customFields: [
          {
            key: 'droneModel',
            label: 'Primary Drone Model',
            type: 'TEXT',
            required: true,
            placeholder: 'e.g. DJI Inspire 3 8K or Matrice 300',
            order: 1,
          },
          {
            key: 'dgcaCertified',
            label: 'DGCA Certified Pilot',
            type: 'BOOLEAN',
            required: true,
            order: 2,
          },
          {
            key: 'maxFlightAltitudeMeters',
            label: 'Certified Max Altitude (m)',
            type: 'NUMBER',
            required: false,
            order: 3,
          },
        ],
      }),
    });
    assert(createCatRes.ok, 'Admin created category with custom fields');
    const createdCat = createCatRes.body.data || createCatRes.body;
    assert(createdCat.slug === catSlug, 'Category slug matches');
    assert(createdCat.customFields.length === 3, `Category has 3 custom fields (got ${createdCat.customFields.length})`);
    assert(createdCat.supportedProfileTypes.includes('CREATOR'), 'Category supports CREATOR profile type');
    assert(createdCat.supportedProfileTypes.includes('PRODUCTION_TEAM'), 'Category supports PRODUCTION_TEAM profile type');

    // 4. Role-Based Category Discovery
    console.log('\n--- 4. Role-Based Category Discovery ---');
    const creatorCatsRes = await request('/categories/for-role/CREATOR');
    assert(creatorCatsRes.ok, 'Fetched categories for CREATOR role');
    const creatorCats = creatorCatsRes.body.data || creatorCatsRes.body;
    const hasDroneCat = creatorCats.some((c) => c.slug === catSlug);
    assert(hasDroneCat, 'Newly created category is present in CREATOR categories list');

    // 5. Update Creator Profile with Structured Location & Geospatial Point
    console.log('\n--- 5. Update Creator with Geospatial Coordinates (Indiranagar, Bangalore) ---');
    // Bangalore Center: [77.5946, 12.9716]
    // Indiranagar, Bangalore: [77.6412, 12.9784] (~5.1 km away)
    const updateProfileRes = await request('/creators/me/draft', {
      method: 'POST',
      token: creatorToken,
      body: JSON.stringify({
        location: {
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          area: 'Indiranagar',
          postalCode: '560038',
          addressLine1: '100ft Road, Defence Colony',
          isPublicAddress: false,
          geoPoint: {
            type: 'Point',
            coordinates: [77.6412, 12.9784], // [lng, lat]
          },
        },
        customFieldValues: {
          droneModel: 'DJI Inspire 3 8K',
          dgcaCertified: true,
          maxFlightAltitudeMeters: 400,
        },
      }),
    });
    assert(updateProfileRes.ok, 'Creator draft saved with structured location');

    // Publish profile so it is searchable
    const publishRes = await request('/creators/me/publish', {
      method: 'POST',
      token: creatorToken,
    });
    assert(publishRes.ok, 'Creator profile published to marketplace');

    // 6. Geospatial Nearby Discovery: Bangalore Center with 10 km radius
    console.log('\n--- 6. Geospatial Nearby Query within 10 km (Bangalore) ---');
    const nearbyRes = await request('/creators/nearby?lat=12.9716&lng=77.5946&radiusKm=10');
    assert(nearbyRes.ok, 'Nearby creators endpoint executed successfully');
    const nearbyList = nearbyRes.body.data || nearbyRes.body;
    assert(Array.isArray(nearbyList), 'Nearby result is an array');
    const foundCreator = nearbyList.find((c) => c.location && c.location.area === 'Indiranagar');
    assert(!!foundCreator, 'Creator in Indiranagar correctly discovered within 10 km of Bangalore Center');
    assert(foundCreator.location.city === 'Bangalore', 'Discovered creator has structured city "Bangalore"');

    // 7. Exclusion Check: Mumbai query should NOT return Bangalore creator
    console.log('\n--- 7. Geospatial Distance Exclusion Check (Mumbai vs Bangalore) ---');
    // Mumbai Coordinates: [72.8777, 19.0760] (~840 km from Bangalore)
    const mumbaiRes = await request('/creators/nearby?lat=19.0760&lng=72.8777&radiusKm=25');
    assert(mumbaiRes.ok, 'Mumbai nearby query executed successfully');
    const mumbaiList = mumbaiRes.body.data || mumbaiRes.body;
    const wronglyReturned = mumbaiList.find((c) => c.location && c.location.city === 'Bangalore');
    assert(!wronglyReturned, 'Bangalore creator correctly excluded from Mumbai 25 km radius');

    // 8. People Directory Data Sources Verification
    console.log('\n--- 8. People Directory Data Sources ---');
    const [creatorsRes, ptRes, brandsRes] = await Promise.all([
      request('/creators?limit=5'),
      request('/production-teams?limit=5'),
      request('/brands?limit=5'),
    ]);
    assert(creatorsRes.ok, 'Creators directory endpoint responsive');
    assert(ptRes.ok, 'Production teams directory endpoint responsive');
    assert(brandsRes.ok, 'Brands directory endpoint responsive');

    console.log('\n=============================================================');
    console.log(`🎉 ALL PHASE 23 TESTS PASSED! (${passed}/${passed + failed})`);
    console.log('=============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    process.exit(1);
  }
}

run();

