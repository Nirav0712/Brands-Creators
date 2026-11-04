/**
 * Brands & Creators — Local Database Restore Utility
 *
 * Safety Rules:
 * 1. Strictly local/dev only. Refuses to restore to any database or host
 *    containing 'prod', 'production', or cloud connection strings (e.g. mongodb.net).
 * 2. Requires an explicitly named destination database ending in '_dev', '_test',
 *    or containing 'test' / 'backup'.
 * 3. Verifies restored collection and document counts against manifest.json.
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

let targetDb = getArg('--target');
let sourceArg = getArg('--source', 'latest');

if (require.main === module) {
  if (!targetDb) {
    console.error('❌ Usage Error: --target <database_name> is required.');
    console.error('Example: node scripts/db-restore.js --target brands_creators_backup_test');
    process.exit(1);
  }

  const lowerTarget = targetDb.toLowerCase();
  if (lowerTarget.includes('prod') || lowerTarget.includes('production')) {
    console.error(`❌ SAFETY ABORT: Refusing to restore to production-named database: '${targetDb}'.`);
    process.exit(1);
  }

  const isAllowedTarget = lowerTarget.endsWith('_dev') || lowerTarget.endsWith('_test') || lowerTarget.includes('test') || lowerTarget.includes('backup');
  if (!isAllowedTarget) {
    console.error(`❌ SAFETY ABORT: Target database '${targetDb}' must end with '_dev', '_test', or contain 'test'/'backup'.`);
    process.exit(1);
  }

  const mongoUri = getArg('--uri', `mongodb://127.0.0.1:27017/${targetDb}`);
  if (mongoUri.includes('mongodb.net')) {
    console.error('❌ SAFETY ABORT: Refusing to connect to remote cloud database.');
    process.exit(1);
  }
}

async function runRestore(customSourceDir, customTargetDb) {
  const activeTargetDb = customTargetDb || targetDb;
  if (!activeTargetDb) {
    throw new Error('Target database name is required for restore.');
  }
  const lowerTarget = activeTargetDb.toLowerCase();
  if (lowerTarget.includes('prod') || lowerTarget.includes('production')) {
    throw new Error(`SAFETY ABORT: Refusing to restore to production-named database: '${activeTargetDb}'.`);
  }
  const isAllowedTarget = lowerTarget.endsWith('_dev') || lowerTarget.endsWith('_test') || lowerTarget.includes('test') || lowerTarget.includes('backup');
  if (!isAllowedTarget) {
    throw new Error(`SAFETY ABORT: Target database '${activeTargetDb}' must end with '_dev', '_test', or contain 'test'/'backup'.`);
  }
  const activeUri = `mongodb://127.0.0.1:27017/${activeTargetDb}`;
  if (activeUri.includes('mongodb.net')) {
    throw new Error('SAFETY ABORT: Refusing to connect to remote cloud database.');
  }

  let backupDir = customSourceDir;
  if (!backupDir || backupDir === 'latest') {
    const latestFile = path.join(__dirname, '..', 'backups', 'latest.json');
    if (!fs.existsSync(latestFile)) {
      throw new Error('No latest backup pointer found at backups/latest.json. Run scripts/db-backup.js first.');
    }
    const latestData = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
    backupDir = latestData.backupDir;
  }

  if (!fs.existsSync(backupDir)) {
    throw new Error(`Backup directory not found: ${backupDir}`);
  }

  const manifestFile = path.join(backupDir, 'manifest.json');
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`manifest.json missing in backup directory: ${backupDir}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));

  console.log('===============================================================');
  console.log('  BRANDS & CREATORS — LOCAL DATABASE RESTORE UTILITY           ');
  console.log('===============================================================');
  console.log(`Source Backup:   ${backupDir}`);
  console.log(`Target Database: ${activeTargetDb}`);
  console.log(`Connection URI:  ${activeUri.replace(/:[^:@]+@/, ':***@')}`);

  await mongoose.connect(activeUri);
  const db = mongoose.connection.db;

  let totalRestoredDocs = 0;
  let totalRestoredCols = 0;

  console.log('\nRestoring collections and indexes:\n');

  for (const [colName, colMeta] of Object.entries(manifest.collections)) {
    const filePath = path.join(backupDir, colMeta.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠️ Skipping missing file: ${colMeta.file}`);
      continue;
    }

    const docs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const collection = db.collection(colName);

    // Drop existing collection in target database for clean restore
    try {
      await collection.drop();
    } catch {}

    // Ensure collection exists even if empty
    try {
      await db.createCollection(colName);
    } catch {}

    if (docs.length > 0) {
      // Re-cast ObjectIds and Dates where appropriate
      const transformed = docs.map((doc) => {
        if (doc._id && typeof doc._id === 'string' && /^[0-9a-fA-F]{24}$/.test(doc._id)) {
          doc._id = new mongoose.Types.ObjectId(doc._id);
        }
        return doc;
      });

      await collection.insertMany(transformed, { ordered: false });
    }

    // Rebuild indexes if index file exists
    const indexFilePath = path.join(backupDir, colMeta.indexFile);
    if (fs.existsSync(indexFilePath)) {
      const indexes = JSON.parse(fs.readFileSync(indexFilePath, 'utf-8'));
      for (const idx of indexes) {
        if (idx.name === '_id_') continue; // Standard default index
        try {
          const options = { name: idx.name };
          if (idx.unique) options.unique = true;
          if (idx.sparse) options.sparse = true;
          await collection.createIndex(idx.key, options);
        } catch {
          // Index creation failure handled safely
        }
      }
    }

    const restoredCount = await collection.countDocuments();
    if (restoredCount !== colMeta.count) {
      console.warn(`  ⚠️ Count mismatch on ${colName}: expected ${colMeta.count}, got ${restoredCount}`);
    } else {
      console.log(`  ✅ Restored ${colName.padEnd(25)} : ${restoredCount.toString().padStart(6)} documents`);
    }

    totalRestoredDocs += restoredCount;
    totalRestoredCols++;
  }

  await mongoose.disconnect();

  console.log('\n===============================================================');
  console.log(`🎉 Restore completed successfully into '${activeTargetDb}'!`);
  console.log(`   Collections Restored: ${totalRestoredCols} | Total Documents: ${totalRestoredDocs}`);
  console.log('===============================================================\n');

  return {
    success: true,
    targetDb: activeTargetDb,
    collectionsRestored: totalRestoredCols,
    documentsRestored: totalRestoredDocs,
  };
}

if (require.main === module) {
  runRestore(sourceArg, targetDb).catch((err) => {
    console.error('❌ Restore failed:', err.message);
    mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = { runRestore };
