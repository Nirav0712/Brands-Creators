const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, '..', 'backups', 'backup_2026-11-03T03-47-42-503Z');
const manifestFile = path.join(backupDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));

console.log('=== COLLECTION AUDIT VIA BACKUP ARTIFACT ===\n');

const inventory = {};
const testUserIds = new Set();
const confirmedTestIdsByCol = {};
const ambiguousIdsByCol = {};
const protectedIdsByCol = {};

// 1. First Pass: Users
const usersMeta = manifest.collections['users'];
const users = JSON.parse(fs.readFileSync(path.join(backupDir, usersMeta.file), 'utf-8'));

const confirmedTestUsers = [];
const protectedUsers = [];
const ambiguousUsers = [];

for (const user of users) {
  const isSuperAdmin = user.roles && (user.roles.includes('SUPER_ADMIN') || user.roles.includes('ADMIN'));
  const isProtectedEmail = user.email === 'admin@brandsandcreators.com';
  
  if (isSuperAdmin || isProtectedEmail) {
    protectedUsers.push(user);
    continue;
  }

  const isExplicitTest = user.isTestData === true;
  const isTestEmail = /test|qa|demo|dummy|synthetic/i.test(user.email) || user.email.endsWith('@example.com');
  const isTestUsername = /test|qa|demo|dummy/i.test(user.username || '');

  if (isExplicitTest || (isTestEmail && isTestUsername)) {
    confirmedTestUsers.push(user);
    testUserIds.add(user._id);
  } else if (isTestEmail || isTestUsername) {
    ambiguousUsers.push(user);
  } else {
    // Looks like a real or protected user
    protectedUsers.push(user);
  }
}

console.log(`Users Analysis (${users.length} total):`);
console.log(`  - Protected Users: ${protectedUsers.length}`);
console.log(`  - Confirmed Test Users: ${confirmedTestUsers.length}`);
console.log(`  - Ambiguous Users: ${ambiguousUsers.length}`);

// Print details of protected & ambiguous users
console.log('\nProtected Users:');
protectedUsers.forEach((u) => console.log(`  * ${u.email} [${(u.roles || []).join(',')}] (${u._id})`));

console.log('\nAmbiguous Users:');
ambiguousUsers.forEach((u) => console.log(`  * ${u.email} [${(u.roles || []).join(',')}] (${u._id})`));

// 2. Second Pass: All Collections
for (const [colName, meta] of Object.entries(manifest.collections)) {
  const filePath = path.join(backupDir, meta.file);
  const docs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  confirmedTestIdsByCol[colName] = [];
  ambiguousIdsByCol[colName] = [];
  protectedIdsByCol[colName] = [];

  for (const doc of docs) {
    // Check if configuration / master data
    if (['categories', 'platformsettings', 'platformSettings', 'subscriptionPlans', 'tokenPricingRules', 'paymentSettings'].includes(colName)) {
      protectedIdsByCol[colName].push(doc._id || doc.key || doc.name);
      continue;
    }

    const isExplicitTest = doc.isTestData === true;
    const matchesTestUser = doc.userId && testUserIds.has(doc.userId);
    const matchesCreatedBy = doc.createdBy && testUserIds.has(doc.createdBy);
    const matchesSender = doc.senderId && testUserIds.has(doc.senderId);
    const matchesRecipient = doc.recipientId && testUserIds.has(doc.recipientId);

    if (isExplicitTest || matchesTestUser || matchesCreatedBy || matchesSender || matchesRecipient) {
      confirmedTestIdsByCol[colName].push(doc._id);
    } else {
      // Check for test keywords
      const docStr = JSON.stringify(doc).toLowerCase();
      if (docStr.includes('test') || docStr.includes('qa-') || docStr.includes('demo') || docStr.includes('example.com')) {
        ambiguousIdsByCol[colName].push(doc._id);
      } else {
        protectedIdsByCol[colName].push(doc._id);
      }
    }
  }

  inventory[colName] = {
    total: docs.length,
    confirmedTest: confirmedTestIdsByCol[colName].length,
    ambiguous: ambiguousIdsByCol[colName].length,
    protected: protectedIdsByCol[colName].length,
  };
}

console.log('\n=== INVENTORY SUMMARY BY COLLECTION ===');
console.log('Collection'.padEnd(28) + ' | Total | Confirmed Test | Ambiguous | Protected');
console.log('-'.repeat(75));
for (const [col, counts] of Object.entries(inventory)) {
  console.log(
    `${col.padEnd(28)} | ${counts.total.toString().padStart(5)} | ${counts.confirmedTest.toString().padStart(14)} | ${counts.ambiguous.toString().padStart(9)} | ${counts.protected.toString().padStart(9)}`
  );
}

// Write the inventory result to a json file for use by report and cleanup script
fs.writeFileSync(
  path.join(__dirname, '..', 'scratch', 'cleanup-inventory.json'),
  JSON.stringify({ inventory, confirmedTestIdsByCol, ambiguousIdsByCol, protectedIdsByCol, testUserIds: Array.from(testUserIds) }, null, 2),
  'utf-8'
);
console.log('\nSaved inventory to scratch/cleanup-inventory.json');

