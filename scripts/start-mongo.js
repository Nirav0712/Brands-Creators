const fs = require('fs');
const path = require('path');

// Ensure MSVC runtime DLLs are available in PATH
const oneDriveBase = 'C:\\Program Files\\Microsoft OneDrive';
if (fs.existsSync(oneDriveBase)) {
  try {
    const dirs = fs.readdirSync(oneDriveBase);
    for (const d of dirs) {
      const full = path.join(oneDriveBase, d);
      if (fs.existsSync(path.join(full, 'vcruntime140.dll'))) {
        process.env.PATH = `${full};${process.env.PATH}`;
        break;
      }
    }
  } catch {}
}

const { MongoMemoryServer } = require('mongodb-memory-server');

const dbDir = path.join(__dirname, '..', '.mongo-data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

async function startMongo() {
  console.log('🚀 Initializing Native MongoDB Server on port 27017...');
  try {
    const localBin = path.join(__dirname, '..', 'node_modules', '.cache', 'mongodb-memory-server', 'mongod-x64-win32-8.2.6.exe');
    const binaryConfig = fs.existsSync(localBin) ? { systemBinary: localBin } : { version: '8.2.6' };

    const mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbPath: dbDir,
        storageEngine: 'wiredTiger',
        dbName: 'brands_creators_dev',
      },
      binary: binaryConfig,
    });

    console.log('✅ Real MongoDB Server started successfully!');
    console.log(`📌 Connection URI: ${mongod.getUri()}brands_creators_dev`);
    console.log(`📁 Persistence directory: ${dbDir}`);

    const cleanup = async () => {
      console.log('Shutting down MongoDB server...');
      await mongod.stop();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.error('Failed to start MongoDB:', err);
    process.exit(1);
  }
}

startMongo();
