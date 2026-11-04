/**
 * Brands & Creators — Phase 34 Controlled Profile Migration Utility
 *
 * Resolves Creator & Brand profile collection mismatch by migrating demo accounts:
 * - creator@demo.com -> creatorProfiles
 * - brand@demo.com   -> brandProfiles
 *
 * Rules:
 * - Exports affected documents to backups/pre-migration-profiles-export.json before writing.
 * - Preserves original document IDs and ownership relationships.
 * - Updates User.creatorProfileId and User.brandProfileId.
 * - Keeps legacy collections intact (no drops/deletions).
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/brands_creators_dev';

async function migrateDemoProfiles() {
  console.log('================================================================');
  console.log('🔄 PHASE 34 — CONTROLLED DEMO PROFILE MIGRATION UTILITY         ');
  console.log('================================================================\n');

  if (mongoUri.includes('mongodb.net') || mongoUri.toLowerCase().includes('prod')) {
    console.error('❌ SAFETY ABORT: Refusing to run against non-local database.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { directConnection: true });
  const db = mongoose.connection.db;

  // 1. Export legacy profiles first
  const legacyCreatorProfile = await db.collection('creator_profiles').findOne({ slug: 'demo-creator' });
  const legacyBrandProfile = await db.collection('brand_profiles').findOne({ slug: 'demo-brand' });

  const exportPath = path.join(__dirname, '..', 'backups', 'pre-migration-profiles-export.json');
  fs.writeFileSync(
    exportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        legacyCreatorProfile,
        legacyBrandProfile,
      },
      null,
      2,
    ),
    'utf-8',
  );
  console.log(`📦 Pre-migration profiles exported to: ${exportPath}`);

  // 2. Fetch demo users
  const creatorUser = await db.collection('users').findOne({ email: 'creator@demo.com' });
  const brandUser = await db.collection('users').findOne({ email: 'brand@demo.com' });

  if (!creatorUser || !brandUser) {
    throw new Error('❌ Demo users not found in users collection!');
  }
  console.log(`✅ Demo creator user verified: ${creatorUser._id}`);
  console.log(`✅ Demo brand user verified: ${brandUser._id}`);

  // 3. Get Category for Influencers
  const influencerCat = await db.collection('categories').findOne({
    $or: [{ slug: 'influencers' }, { name: 'INFLUENCERS' }],
  });
  if (!influencerCat) {
    throw new Error('❌ INFLUENCERS category not found!');
  }
  console.log(`✅ Influencers category verified: ${influencerCat._id}`);

  // 4. Check for existing canonical records
  const existingCreator = await db.collection('creatorProfiles').findOne({
    $or: [{ userId: creatorUser._id }, { slug: 'demo-creator' }, { _id: legacyCreatorProfile._id }],
  });

  if (existingCreator) {
    console.log(`ℹ️ Canonical CreatorProfile already exists in creatorProfiles (${existingCreator._id})`);
  } else {
    const newCreatorDoc = {
      _id: legacyCreatorProfile._id,
      userId: creatorUser._id,
      slug: 'demo-creator',
      headline: 'Creative Professional & Influencer',
      bio: legacyCreatorProfile.bio || 'Professional creator for live platform demonstrations.',
      primaryCategoryId: influencerCat._id,
      additionalCategoryIds: [],
      subcategoryIds: [],
      skills: ['Content Creation', 'Storytelling', 'Short-Form Video', 'UGC'],
      location: {
        city: 'Mumbai',
        country: 'India',
        isPublicAddress: false,
      },
      serviceAreas: ['Pan-India', 'Remote'],
      languages: ['English', 'Hindi'],
      pricingModel: 'PER_PROJECT',
      startingPrice: 5000,
      currency: 'INR',
      serviceMode: 'HYBRID',
      availability: 'AVAILABLE_NOW',
      experienceLevel: 'MID_LEVEL',
      experienceYears: 3,
      verificationStatus: legacyCreatorProfile.verificationStatus || 'VERIFIED',
      visibilityStatus: 'PUBLISHED',
      completionPercentage: 85,
      completionChecklist: [],
      averageRating: legacyCreatorProfile.rating || 4.9,
      reviewCount: legacyCreatorProfile.reviewCount || 5,
      featured: true,
      totalFollowers: 125000,
      portfolio: [],
      services: [],
      brandCollaborations: [],
      createdAt: legacyCreatorProfile.createdAt ? new Date(legacyCreatorProfile.createdAt) : new Date(),
      updatedAt: new Date(),
      __v: 0,
    };

    await db.collection('creatorProfiles').insertOne(newCreatorDoc);
    console.log(`✅ Successfully migrated demo-creator to creatorProfiles (_id: ${newCreatorDoc._id})`);
  }

  // 5. Check for existing canonical Brand record
  const existingBrand = await db.collection('brandProfiles').findOne({
    $or: [{ userId: brandUser._id }, { slug: 'demo-brand' }, { _id: legacyBrandProfile._id }],
  });

  if (existingBrand) {
    console.log(`ℹ️ Canonical BrandProfile already exists in brandProfiles (${existingBrand._id})`);
  } else {
    const newBrandDoc = {
      _id: legacyBrandProfile._id,
      userId: brandUser._id,
      companyName: legacyBrandProfile.companyName || 'Demo Brand Studio',
      slug: 'demo-brand',
      tagline: 'Leading Business & Brand',
      description: 'Official brand profile for Demo Brand Studio.',
      industry: legacyBrandProfile.industry || 'Fashion & Apparel',
      companySize: '11-50 employees',
      location: {
        city: 'Mumbai',
        country: 'India',
        isPublicAddress: false,
      },
      serviceAreas: ['Global', 'India'],
      verificationStatus: legacyBrandProfile.verificationStatus || 'VERIFIED',
      visibilityStatus: 'PUBLISHED',
      teamSize: 1,
      activeRequirementsCount: 0,
      previousCampaigns: [],
      teamMembers: [],
      createdAt: legacyBrandProfile.createdAt ? new Date(legacyBrandProfile.createdAt) : new Date(),
      updatedAt: new Date(),
      __v: 0,
    };

    await db.collection('brandProfiles').insertOne(newBrandDoc);
    console.log(`✅ Successfully migrated demo-brand to brandProfiles (_id: ${newBrandDoc._id})`);
  }

  // 6. Update User profile references
  await db.collection('users').updateOne(
    { _id: creatorUser._id },
    { $set: { creatorProfileId: legacyCreatorProfile._id, onboardingCompleted: true } },
  );
  console.log(`✅ Updated User creator@demo.com creatorProfileId -> ${legacyCreatorProfile._id}`);

  await db.collection('users').updateOne(
    { _id: brandUser._id },
    { $set: { brandProfileId: legacyBrandProfile._id, onboardingCompleted: true } },
  );
  console.log(`✅ Updated User brand@demo.com brandProfileId -> ${legacyBrandProfile._id}`);

  console.log('\n================================================================');
  console.log('🎉 TASK 1 MIGRATION COMPLETE — PROFILES SYNCHRONIZED');
  console.log('================================================================\n');

  await mongoose.disconnect();
}

migrateDemoProfiles().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

