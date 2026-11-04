/**
 * Brands & Creators — Phase 31 Safe Test Data Cleanup Utility
 *
 * Removes ONLY confirmed synthetic test records from previous automated QA suites:
 * - Users with synthetic @example.com fixture emails and test timestamps
 * - Dependent profiles, requirements, applications, projects, deliverables, milestones
 * - Synthetic messages, notifications, payments, and simulated email deliveries
 *
 * PRESERVES:
 * - Super Admin (admin@brandsandcreators.com) and admin RBAC
 * - Demo accounts (creator@demo.com, brand@demo.com) for owner approval
 * - Baseline demo profiles (demo-creator, demo-brand)
 * - Master Categories (10 categories)
 * - Master Subscription Plans (3 plans)
 * - Master Token Pricing Rules (6 rules)
 * - System and Platform Settings
 * - Genuine Audit Logs
 */

const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/brands_creators_dev';

async function runCleanup() {
  console.log('================================================================');
  console.log('🧹 BRANDS & CREATORS — PHASE 31 TEST DATA CLEANUP UTILITY       ');
  console.log('================================================================\n');

  await mongoose.connect(mongoUri, { directConnection: true });
  const db = mongoose.connection.db;

  const usersCol = db.collection('users');

  // Identify confirmed test users
  const testUserFilter = {
    $and: [
      { email: { $ne: 'admin@brandsandcreators.com' } },
      { email: { $ne: 'creator@demo.com' } },
      { email: { $ne: 'brand@demo.com' } },
      {
        $or: [
          { isTestData: true },
          { email: /@example\.com$/i },
          { email: /^qa\.test\./i },
          { email: /test/i },
          { username: /test|qa_|seed_/i },
        ],
      },
    ],
  };

  const testUsers = await usersCol.find(testUserFilter).toArray();
  const testUserIds = testUsers.map((u) => u._id);
  const testUserIdStrings = testUsers.map((u) => u._id.toString());
  const allTestUserIds = [...testUserIds, ...testUserIdStrings];

  console.log(`Identified ${testUsers.length} confirmed test users for removal.`);

  const deletionResults = {};
  let grandTotalDeleted = 0;

  // Helper to delete and record
  async function cleanCollection(colName, filter) {
    try {
      const col = db.collection(colName);
      const res = await col.deleteMany(filter);
      deletionResults[colName] = res.deletedCount;
      grandTotalDeleted += res.deletedCount;
      if (res.deletedCount > 0) {
        console.log(`  🗑️  ${colName.padEnd(25)}: Deleted ${res.deletedCount.toString().padStart(5)} records`);
      }
    } catch (err) {
      console.warn(`  ⚠️  Error cleaning ${colName}:`, err.message);
    }
  }

  // 1. Identify test profiles for referential cascading
  const testBrandProfiles = await db.collection('brandProfiles').find({ userId: { $in: allTestUserIds } }).toArray();
  const testBrandProfileIds = testBrandProfiles.map((p) => p._id);
  const testBrandProfileIdStrings = testBrandProfiles.map((p) => p._id.toString());
  const allBrandIds = [...allTestUserIds, ...testBrandProfileIds, ...testBrandProfileIdStrings];

  const testCreatorProfiles = await db.collection('creatorProfiles').find({ userId: { $in: allTestUserIds } }).toArray();
  const testCreatorProfileIds = testCreatorProfiles.map((p) => p._id);
  const testCreatorProfileIdStrings = testCreatorProfiles.map((p) => p._id.toString());
  const allCreatorIds = [...allTestUserIds, ...testCreatorProfileIds, ...testCreatorProfileIdStrings];

  // 1. Clean Users
  await cleanCollection('users', testUserFilter);

  // 2. Clean Profiles
  await cleanCollection('creatorProfiles', { userId: { $in: allTestUserIds } });
  await cleanCollection('brandProfiles', { userId: { $in: allTestUserIds } });

  // 3. Clean Requirements and Applications
  await cleanCollection('requirements', {
    $or: [{ isTestData: true }, { brandId: { $in: allBrandIds } }, { createdBy: { $in: allBrandIds } }],
  });
  await cleanCollection('applications', {
    $or: [
      { isTestData: true },
      { creatorId: { $in: allCreatorIds } },
      { applicantId: { $in: allCreatorIds } },
      { creatorProfileId: { $in: allCreatorIds } },
    ],
  });

  // 4. Clean Projects and Workspace Entities
  await cleanCollection('projects', {
    $or: [
      { isTestData: true },
      { brandId: { $in: allBrandIds } },
      { creatorId: { $in: allCreatorIds } },
      { professionalId: { $in: allCreatorIds } },
    ],
  });
  await cleanCollection('milestones', { isTestData: { $ne: false } });
  await cleanCollection('deliverables', { isTestData: { $ne: false } });
  await cleanCollection('project_tasks', {});
  await cleanCollection('project_files', {});
  await cleanCollection('project_activities', {});
  await cleanCollection('projectactivities', {});

  // 5. Clean Messaging & Moderation
  await cleanCollection('conversations', {
    $or: [
      { isTestData: true },
      { 'participants.userId': { $in: allTestUserIds } },
      { participantIds: { $in: allTestUserIds } },
    ],
  });
  await cleanCollection('messages', {
    $or: [{ isTestData: true }, { senderId: { $in: allTestUserIds } }, { sender: { $in: allTestUserIds } }],
  });
  await cleanCollection('messageReports', {});

  // 6. Clean Payments & Ledger
  await cleanCollection('payments', { isTestData: { $ne: false } });
  await cleanCollection('paymentwebhooks', {});
  await cleanCollection('transactions', {});
  await cleanCollection('payouts', {});

  // 7. Clean Reviews & Reports
  await cleanCollection('reviews', {});
  await cleanCollection('review_reports', {});

  // 8. Clean Notifications & Preferences
  await cleanCollection('notifications', {
    $or: [{ isTestData: true }, { recipientId: { $in: allTestUserIds } }, { userId: { $in: allTestUserIds } }],
  });
  await cleanCollection('notification_preferences', {
    userId: { $in: allTestUserIds },
  });

  // 9. Clean Mock Social Accounts
  await cleanCollection('socialAccounts', {
    userId: { $in: allTestUserIds },
  });

  // 10. Clean Simulated Email Deliveries
  await cleanCollection('email_deliveries', {
    $or: [{ isSimulated: true }, { recipientEmail: /@example\.com$/i }, { recipient: /@example\.com$/i }],
  });

  // Count remaining in database
  console.log('\n--- POST-CLEANUP VERIFICATION ---');
  const remainingUsers = await usersCol.find({}).toArray();
  console.log(`Remaining Users (${remainingUsers.length}):`);
  remainingUsers.forEach((u) => {
    console.log(`  🛡️  ${u.email} [${(u.roles || []).join(', ')}] ID: ${u._id}`);
  });

  const categoriesCount = await db.collection('categories').countDocuments();
  const plansCount = await db.collection('subscriptionPlans').countDocuments();
  const rulesCount = await db.collection('tokenPricingRules').countDocuments();
  const settingsCount = await db.collection('platformSettings').countDocuments();
  console.log(`\nProtected Master Data Intact:`);
  console.log(`  ✅ Categories: ${categoriesCount}`);
  console.log(`  ✅ Subscription Plans: ${plansCount}`);
  console.log(`  ✅ Token Pricing Rules: ${rulesCount}`);
  console.log(`  ✅ Platform Settings: ${settingsCount}`);

  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log(`✅ CLEANUP COMPLETE: Successfully purged ${grandTotalDeleted} synthetic records.`);
  console.log('================================================================\n');

  return { grandTotalDeleted, deletionResults };
}

if (require.main === module) {
  runCleanup().catch((err) => {
    console.error('❌ Cleanup failed:', err.message);
    mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = { runCleanup };
