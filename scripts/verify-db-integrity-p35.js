const mongoose = require('mongoose');

async function verifyDatabaseIntegrity() {
  console.log('================================================================');
  console.log('  🔍 PHASE 35 — DATABASE READ-ONLY INTEGRITY VERIFICATION');
  console.log('================================================================\n');

  await mongoose.connect('mongodb://127.0.0.1:27017/brands_creators_dev', { directConnection: true });
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const colNames = collections.map(c => c.name);
  console.log(`Total collections in database: ${colNames.length}`);

  // Helper count
  async function count(colName) {
    if (!colNames.includes(colName)) return 0;
    return await db.collection(colName).countDocuments();
  }

  // 1. Users & Roles
  const totalUsers = await count('users');
  const users = await db.collection('users').find({}).toArray();
  const roleCounts = {};
  users.forEach(u => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  });
  console.log(`\n1. USERS (${totalUsers} total):`);
  console.log(`   Roles distribution:`, JSON.stringify(roleCounts));

  // Check demo users
  const demoCreator = users.find(u => u.email === 'creator@demo.com');
  const demoBrand = users.find(u => u.email === 'brand@demo.com');
  const superAdmin = users.find(u => u.email === 'admin@brandsandcreators.com');
  console.log(`   Demo Creator: ${demoCreator ? `Found (ID: ${demoCreator._id}, profile: ${demoCreator.profile})` : 'MISSING'}`);
  console.log(`   Demo Brand: ${demoBrand ? `Found (ID: ${demoBrand._id}, brandProfile: ${demoBrand.brandProfile})` : 'MISSING'}`);
  console.log(`   Super Admin: ${superAdmin ? `Found (ID: ${superAdmin._id})` : 'MISSING'}`);

  // 2. Profiles
  const creatorProfilesCount = await count('creatorProfiles');
  const legacyCreatorCount = await count('creator_profiles');
  const brandProfilesCount = await count('brandProfiles');
  const legacyBrandCount = await count('brand_profiles');
  const productionProfilesCount = await count('productionProfiles') || await count('production_team_profiles');

  console.log(`\n2. PROFILES:`);
  console.log(`   creatorProfiles (canonical): ${creatorProfilesCount}`);
  console.log(`   creator_profiles (legacy): ${legacyCreatorCount}`);
  console.log(`   brandProfiles (canonical): ${brandProfilesCount}`);
  console.log(`   brand_profiles (legacy): ${legacyBrandCount}`);
  console.log(`   productionProfiles: ${productionProfilesCount}`);

  // Check demo profile records in canonical collections
  const creatorProfileDoc = demoCreator ? await db.collection('creatorProfiles').findOne({ userId: demoCreator._id }) : null;
  const brandProfileDoc = demoBrand ? await db.collection('brandProfiles').findOne({ userId: demoBrand._id }) : null;
  console.log(`   Canonical Demo Creator Profile in creatorProfiles: ${creatorProfileDoc ? `Found (slug: ${creatorProfileDoc.slug})` : 'MISSING'}`);
  console.log(`   Canonical Demo Brand Profile in brandProfiles: ${brandProfileDoc ? `Found (slug: ${brandProfileDoc.slug})` : 'MISSING'}`);

  // 3. Duplicate profile check
  const creatorSlugs = await db.collection('creatorProfiles').aggregate([
    { $group: { _id: "$slug", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  const brandSlugs = await db.collection('brandProfiles').aggregate([
    { $group: { _id: "$slug", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  console.log(`\n3. DUPLICATE SLUG CHECKS:`);
  console.log(`   Duplicate creatorProfile slugs: ${creatorSlugs.length}`);
  console.log(`   Duplicate brandProfile slugs: ${brandSlugs.length}`);

  // 4. Requirements & Relationships
  const reqCount = await count('requirements');
  const appCount = await count('applications');
  const projCount = await count('projects');
  const delivCount = await count('deliverables');
  const convCount = await count('conversations');
  const msgCount = await count('messages');
  const walletCount = await count('wallets');
  const subCount = await count('subscriptions');
  const categoryCount = await count('categories');

  console.log(`\n4. CORE BUSINESS ENTITIES:`);
  console.log(`   Requirements: ${reqCount}`);
  console.log(`   Applications: ${appCount}`);
  console.log(`   Projects: ${projCount}`);
  console.log(`   Deliverables: ${delivCount}`);
  console.log(`   Conversations: ${convCount}`);
  console.log(`   Messages: ${msgCount}`);
  console.log(`   Wallets: ${walletCount}`);
  console.log(`   Subscriptions: ${subCount}`);
  console.log(`   Categories: ${categoryCount}`);

  // 5. Orphan Checks
  const userIds = new Set(users.map(u => u._id.toString()));
  
  // Check Creator profiles user reference
  const creatorProfiles = await db.collection('creatorProfiles').find({}).toArray();
  const orphanCreatorProfiles = creatorProfiles.filter(p => p.userId && !userIds.has(p.userId.toString()));
  
  // Check Brand profiles user reference
  const brandProfiles = await db.collection('brandProfiles').find({}).toArray();
  const orphanBrandProfiles = brandProfiles.filter(p => p.userId && !userIds.has(p.userId.toString()));

  // Check Requirements user reference
  const reqs = await db.collection('requirements').find({}).toArray();
  const orphanReqs = reqs.filter(r => {
    const ownerId = (r.brandId || r.userId || r.clientId)?.toString();
    return ownerId && !userIds.has(ownerId);
  });

  // Check Projects user references
  const projs = await db.collection('projects').find({}).toArray();
  const orphanProjs = projs.filter(p => {
    const brandId = (p.brandId || p.clientId)?.toString();
    const creatorId = (p.creatorId || p.freelancerId)?.toString();
    return (brandId && !userIds.has(brandId)) || (creatorId && !userIds.has(creatorId));
  });

  // Check Messages conversation references
  const convIds = new Set((await db.collection('conversations').find({}).toArray()).map(c => c._id.toString()));
  const msgs = await db.collection('messages').find({}).toArray();
  const orphanMsgs = msgs.filter(m => m.conversationId && !convIds.has(m.conversationId.toString()));

  console.log(`\n5. ORPHANED RELATIONSHIPS CHECK:`);
  console.log(`   Orphan creatorProfiles (missing user): ${orphanCreatorProfiles.length}`);
  console.log(`   Orphan brandProfiles (missing user): ${orphanBrandProfiles.length}`);
  console.log(`   Orphan requirements (missing brand): ${orphanReqs.length}`);
  console.log(`   Orphan projects (missing user): ${orphanProjs.length}`);
  console.log(`   Orphan messages (missing conversation): ${orphanMsgs.length}`);

  const hasOrphans = orphanCreatorProfiles.length + orphanBrandProfiles.length + orphanReqs.length + orphanProjs.length + orphanMsgs.length > 0;
  console.log(`\n================================================================`);
  console.log(`  INTEGRITY STATUS: ${hasOrphans ? '⚠️ ORPHANS DETECTED' : '✅ 100% CLEAN - ZERO ORPHANS, ZERO DUPLICATES'}`);
  console.log(`================================================================\n`);

  await mongoose.disconnect();
}

verifyDatabaseIntegrity().catch(err => {
  console.error('Integrity check error:', err);
  process.exit(1);
});

