/**
 * Brands & Creators — Repeatable Test Seed Data Utility
 *
 * Seeds isolated, tagged test records with `isTestData: true` for QA and validation.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/brands_creators_dev';

async function runSeed() {
  console.log('--- SEEDING REPEATABLE TEST DATA ---');
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  const usersCollection = db.collection('users');
  const creatorsCollection = db.collection('creator_profiles');
  const brandsCollection = db.collection('brand_profiles');
  const reqsCollection = db.collection('requirements');

  const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

  // 1. Seed Test Brand User
  const brandEmail = 'qa.test.brand@example.com';
  let brandUser = await usersCollection.findOne({ email: brandEmail });
  if (!brandUser) {
    const insertRes = await usersCollection.insertOne({
      email: brandEmail,
      username: 'qa_test_brand',
      passwordHash: hashedPassword,
      fullName: 'QA Staging Brand Ltd',
      roles: ['BRAND'],
      status: 'ACTIVE',
      isEmailVerified: true,
      isTestData: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    brandUser = { _id: insertRes.insertedId };
  }

  // 2. Seed Brand Profile
  await brandsCollection.updateOne(
    { userId: brandUser._id },
    {
      $set: {
        userId: brandUser._id,
        companyName: 'QA Staging Brand Ltd',
        slug: 'qa-staging-brand',
        tagline: 'Leading Technical Apparel',
        description: 'Verified test brand for automated and staging validation.',
        industry: 'Fashion & Apparel',
        verificationStatus: 'VERIFIED',
        isTestData: true,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  // 3. Seed Test Creator User
  const creatorEmail = 'qa.test.creator@example.com';
  let creatorUser = await usersCollection.findOne({ email: creatorEmail });
  if (!creatorUser) {
    const insertRes = await usersCollection.insertOne({
      email: creatorEmail,
      username: 'qa_test_creator',
      passwordHash: hashedPassword,
      fullName: 'QA Test Creator',
      roles: ['CREATOR'],
      status: 'ACTIVE',
      isEmailVerified: true,
      isTestData: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    creatorUser = { _id: insertRes.insertedId };
  }

  // 4. Seed Creator Profile
  await creatorsCollection.updateOne(
    { userId: creatorUser._id },
    {
      $set: {
        userId: creatorUser._id,
        headline: 'Cinematic Video Specialist',
        slug: 'qa-test-creator',
        bio: 'Automated test creator profile for verified QA benchmarks.',
        startingPrice: 15000,
        currency: 'INR',
        skills: ['Cinematography', 'UGC Video', 'Color Grading'],
        verificationStatus: 'VERIFIED',
        averageRating: 5.0,
        reviewCount: 3,
        isTestData: true,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  // 5. Seed Requirement
  await reqsCollection.updateOne(
    { slug: 'qa-test-commercial-reel-requirement' },
    {
      $set: {
        title: 'QA Test Commercial Reel Campaign',
        slug: 'qa-test-commercial-reel-requirement',
        description: 'High-production test campaign requirement for staging checks.',
        brandId: brandUser._id,
        budgetType: 'FIXED',
        budget: { min: 40000, max: 40000, currency: 'INR' },
        status: 'PUBLISHED',
        deliverables: ['1x 4K Master Video'],
        requiredSkills: ['Cinematography', 'Color Grading'],
        isTestData: true,
        applicationDeadline: new Date(Date.now() + 14 * 86400000),
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  await mongoose.disconnect();
  console.log('✅ Repeatable test data successfully seeded and tagged with isTestData: true.');
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('❌ Seeding failed:', err.message);
    mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = { runSeed };
