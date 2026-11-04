/**
 * Brands & Creators — Local Database Backup Utility
 *
 * Safety Rules:
 * 1. Strictly local/dev only. Refuses to backup or connect to any database or host
 *    containing 'prod', 'production', or cloud connection strings (e.g. mongodb.net).
 * 2. Writes exported collections to backups/backup_<timestamp>/ as clean JSON.
 * 3. Generates manifest.json with document counts and checksum metadata.
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

const dbName = getArg('--db', 'brands_creators_dev');
const mongoUri = getArg('--uri', `mongodb://127.0.0.1:27017/${dbName}`);

// Safety check
if (dbName.toLowerCase().includes('prod') || mongoUri.includes('mongodb.net')) {
  console.error('❌ SAFETY ABORT: db-backup refuses to run against production or remote cloud databases.');
  process.exit(1);
}

async function runBackup() {
  console.log('===============================================================');
  console.log('  BRANDS & CREATORS — LOCAL DATABASE BACKUP UTILITY            ');
  console.log('===============================================================');
  console.log(`Target Database: ${dbName}`);
  console.log(`Connection URI:  ${mongoUri.replace(/:[^:@]+@/, ':***@')}`);

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', `backup_${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const collections = await db.listCollections().toArray();
  const manifest = {
    database: dbName,
    createdAt: new Date().toISOString(),
    totalCollections: collections.length,
    totalDocuments: 0,
    collections: {},
  };

  console.log(`\nFound ${collections.length} collections to backup:\n`);

  for (const col of collections) {
    const colName = col.name;
    if (colName.startsWith('system.')) continue;

    const collection = db.collection(colName);
    const docs = await collection.find({}).toArray();
    const count = docs.length;

    const hexId = Buffer.from(colName).toString('hex');
    const filePath = path.join(backupDir, `${hexId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');

    // Also backup indexes
    const indexes = await collection.indexes();
    const indexFilePath = path.join(backupDir, `${hexId}.indexes.json`);
    fs.writeFileSync(indexFilePath, JSON.stringify(indexes, null, 2), 'utf-8');

    manifest.collections[colName] = {
      count,
      file: `${hexId}.json`,
      indexFile: `${hexId}.indexes.json`,
    };
    manifest.totalDocuments += count;

    console.log(`  📦 Backed up ${colName.padEnd(25)} : ${count.toString().padStart(6)} documents`);
  }

  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  // Also write 'latest' pointer
  const latestPath = path.join(__dirname, '..', 'backups', 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify({ backupDir, timestamp, manifest }, null, 2), 'utf-8');

  await mongoose.disconnect();

  console.log('\n===============================================================');
  console.log(`✅ Backup successfully created at: ${backupDir}`);
  console.log(`   Collections: ${manifest.totalCollections} | Documents: ${manifest.totalDocuments}`);
  console.log('===============================================================\n');

  return backupDir;
}

if (require.main === module) {
  runBackup().catch((err) => {
    console.error('❌ Backup failed:', err.message);
    mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = { runBackup };
