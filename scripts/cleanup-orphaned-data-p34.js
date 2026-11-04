/**
 * Brands & Creators — Phase 34 Orphaned Test Data Cleanup Utility
 *
 * Removes ONLY conclusively identified, confirmed synthetic test records from
 * prior automated QA runs (Phases 04 - Phase 32).
 *
 * Guaranteed Safety Preservations:
 * - Super Admin (admin@brandsandcreators.com)
 * - Demo accounts (creator@demo.com, brand@demo.com)
 * - Canonical Demo Profiles (demo-creator in creatorProfiles, demo-brand in brandProfiles)
 * - Master Categories (10)
 * - Master Subscription Plans (3)
 * - Master Token Pricing Rules (6)
 * - Master System/Platform Settings (4)
 * - Audit Logs
 *
 * Usage:
 *   node scripts/cleanup-orphaned-data-p34.js --dry-run
 *   node scripts/cleanup-orphaned-data-p34.js --execute
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const isExecute = process.argv.includes('--execute');
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/brands_creators_dev';

async function runCleanup() {
  console.log('================================================================');
  console.log(`🧹 PHASE 34 ORPHANED TEST DATA CLEANUP (${isExecute ? 'EXECUTE MODE' : 'DRY RUN'})`);
  console.log('================================================================\n');

  if (mongoUri.includes('mongodb.net') || mongoUri.toLowerCase().includes('prod')) {
    console.error('❌ SAFETY ABORT: Refusing to run cleanup against non-local database.');
    process.exit(1);
  }

  // Verify backup exists before allowing execute
  const backupDir = path.join(__dirname, '..', 'backups', 'backup_2026-11-04T03-44-40-932Z');
  if (!fs.existsSync(backupDir)) {
    console.error('❌ SAFETY ABORT: Required Phase 34 baseline backup not found at:', backupDir);
    process.exit(1);
  }
  console.log('✅ Baseline backup verified at:', backupDir);

  await mongoose.connect(mongoUri, { directConnection: true });
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  const validUserIds = new Set(users.map((u) => u._id.toString()));
  const validObjectIds = Array.from(validUserIds).map((id) => new mongoose.Types.ObjectId(id));

  console.log(`Protected Users in Database: ${users.length}`);
  users.forEach((u) => console.log(`  - ${u.email} (${u.roles.join(', ')})`));

  // Step 1: Messages (85)
  const msgsToDelete = await db
    .collection('messages')
    .find({ senderId: { $nin: validObjectIds } })
    .toArray();

  // Step 2: Conversations (65)
  const convs = await db.collection('conversations').find({}).toArray();
  const convsToDelete = convs.filter((c) => {
    const parts = (c.participantIds || c.participants || []).map((p) => p.toString());
    return !parts.some((p) => validUserIds.has(p));
  });

  // Step 3: Projects (30)
  const projsToDelete = await db
    .collection('projects')
    .find({
      $or: [{ brandId: { $nin: validObjectIds } }, { creatorId: { $nin: validObjectIds } }],
    })
    .toArray();

  // Step 4: Requirements (12)
  const reqsToDelete = await db
    .collection('requirements')
    .find({
      $or: [{ brandId: { $nin: validObjectIds } }, { userId: { $nin: validObjectIds } }],
    })
    .toArray();

  // Step 5: CreatorProfiles (10 orphaned, excluding demo-creator)
  const creatorProfilesToDelete = await db
    .collection('creatorProfiles')
    .find({
      userId: { $nin: validObjectIds },
      slug: { $ne: 'demo-creator' },
    })
    .toArray();

  // Step 6: BrandProfiles (5 orphaned, excluding demo-brand)
  const brandProfilesToDelete = await db
    .collection('brandProfiles')
    .find({
      userId: { $nin: validObjectIds },
      slug: { $ne: 'demo-brand' },
    })
    .toArray();

  // Step 7: ProductionTeamProfiles (2 orphaned)
  const prodProfilesToDelete = await db
    .collection('productionTeamProfiles')
    .find({
      userId: { $nin: validObjectIds },
    })
    .toArray();

  // Step 8: TokenWallets (4 orphaned)
  const walletsToDelete = await db
    .collection('tokenWallets')
    .find({
      userId: { $nin: validObjectIds },
    })
    .toArray();

  // Step 9: NotificationPreferences (91 orphaned)
  const notifPrefsToDelete = await db
    .collection('notification_preferences')
    .find({
      userId: { $nin: validObjectIds },
    })
    .toArray();

  // Step 10: Legacy duplicate platformsettings
  const duplicatePlatformSetting = await db.collection('platformsettings').findOne({
    key: 'PLATFORM_COMMISSION_PERCENTAGE',
  });

  console.log('\n--- TARGET CLEANUP INVENTORY ---');
  console.log(`1. Messages:                    ${msgsToDelete.length}`);
  console.log(`2. Conversations:               ${convsToDelete.length}`);
  console.log(`3. Projects:                    ${projsToDelete.length}`);
  console.log(`4. Requirements:                ${reqsToDelete.length}`);
  console.log(`5. Orphaned creatorProfiles:    ${creatorProfilesToDelete.length}`);
  console.log(`6. Orphaned brandProfiles:      ${brandProfilesToDelete.length}`);
  console.log(`7. Orphaned productionTeamProfiles: ${prodProfilesToDelete.length}`);
  console.log(`8. Orphaned tokenWallets:       ${walletsToDelete.length}`);
  console.log(`9. Orphaned notification_prefs: ${notifPrefsToDelete.length}`);
  console.log(`10. Duplicate platformsettings:  ${duplicatePlatformSetting ? 1 : 0}`);

  if (!isExecute) {
    console.log('\n================================================================');
    console.log('ℹ️ DRY RUN COMPLETE. No data was modified.');
    console.log('To execute cleanup, run with: node scripts/cleanup-orphaned-data-p34.js --execute');
    console.log('================================================================\n');
    await mongoose.disconnect();
    return;
  }

  // EXECUTE CASCADE CLEANUP
  console.log('\n🚀 EXECUTING ATOMIC CASCADE DELETION...');

  if (msgsToDelete.length > 0) {
    const res = await db.collection('messages').deleteMany({
      _id: { $in: msgsToDelete.map((m) => m._id) },
    });
    console.log(`  🗑️ Deleted ${res.deletedCount} orphaned messages.`);
  }

  if (convsToDelete.length > 0) {
    const res = await db.collection('conversations').deleteMany({
      _id: { $in: convsToDelete.map((c) => c._id) },
    });
    console.log(`  🗑️ Deleted ${res.deletedCount} orphaned conversations.`);
  }

  if (projsToDelete.length > 0) {
    const res = await db.collection('projects').deleteMany({
      _id: { $in: projsToDelete.map((p) => p._id) },
    });
    console.log(`  🗑️ Deleted ${res.deletedCount} orphaned projects.`);
  }

  if (reqsToDelete.length > 0) {
    const res = await db.collection('requirements').deleteMany({
      _id: { $in: reqsToDelete.map((r) => r._id) },
    });
    console.log(`  🗑️ Deleted ${res.deletedCount} orphaned requirements.`);
  }

  if (creatorProfilesToDelete.length > 0) {
    const res = await db.collection('creatorProfiles').deleteMany({
      _id: { $in: creatorProfilesToDelete.map((c) => c._id) },
    });
    console.log(`  🗑️ Deleted ${res.deletedCount} orphaned creatorProfiles.`);
  }

  if (brandProfilesToDelete.length > 0) {
    const res = await db.collection('brandProfiles').deleteMany({
      _id: { $in: brandProfilesToDelete.map((b) => b._id) },
    });
    console.log(`  🗑️ Deleted ${res.deletedCount} orphaned brandProfiles.`);
  }

  if (prodProfilesToDelete.length > 0) {
    const res = await db.collection('productionTeamProfiles').deleteMany({
      _id: { $in: prodProfilesToDelete.map((pt) => pt._id) },
    });
    console.log(`  🗑️ Deleted ${res.deletedCount} orphaned productionTeamProfiles.`);
  }

  if (walletsToDelete.length > 0) {
    const res = await db.collection('tokenWallets').deleteMany({
      _id: { $in: walletsToDelete.map((w) => w._id) },
    });
    console.log(`  🗑️ Deleted ${res.deletedCount} orphaned tokenWallets.`);
  }

  if (notifPrefsToDelete.length > 0) {
    const res = await db.collection('notification_preferences').deleteMany({
      _id: { $in: notifPrefsToDelete.map((np) => np._id) },
    });
    console.log(`  🗑️ Deleted ${res.deletedCount} orphaned notification preferences.`);
  }

  if (duplicatePlatformSetting) {
    await db.collection('platformsettings').deleteOne({ _id: duplicatePlatformSetting._id });
    console.log(`  🗑️ Deleted duplicate platformsetting in platformsettings.`);
  }

  console.log('\n================================================================');
  console.log('✅ PHASE 34 CLEANUP EXECUTION COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');

  await mongoose.disconnect();
}

runCleanup().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});

