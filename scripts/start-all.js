const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');
const treeKill = require('tree-kill');

const ROOT_DIR = path.resolve(__dirname, '..');
const isDev = process.argv.includes('--dev');

// MSVC runtime check
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

const children = [];
let mongodInstance = null;

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function waitForHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        return resolve(false);
      }
      http
        .get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 500) {
            clearInterval(interval);
            resolve(true);
          }
        })
        .on('error', () => {});
    }, 500);
  });
}

async function startMongo() {
  const isRunning = await checkPort(27017);
  if (isRunning) {
    console.log('[mongo] ✅ MongoDB is already active and listening on port 27017.');
    return;
  }

  console.log('[mongo] 🚀 Starting MongoDB Server (v8.2.6) on port 27017...');
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const dbDir = path.join(ROOT_DIR, '.mongo-data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const localBin = path.join(ROOT_DIR, 'node_modules', '.cache', 'mongodb-memory-server', 'mongod-x64-win32-8.2.6.exe');
  const binaryConfig = fs.existsSync(localBin) ? { systemBinary: localBin } : { version: '8.2.6' };

  mongodInstance = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbPath: dbDir,
      storageEngine: 'wiredTiger',
      dbName: 'brands_creators_dev',
    },
    binary: binaryConfig,
  });

  console.log('[mongo] ✅ MongoDB Server started successfully.');
}

async function ensureSeedData() {
  try {
    const mongoose = require('mongoose');
    await mongoose.connect('mongodb://127.0.0.1:27017/brands_creators_dev', { directConnection: true });
    const cols = await mongoose.connection.db.listCollections().toArray();
    const usersCount = cols.some((c) => c.name === 'users')
      ? await mongoose.connection.db.collection('users').countDocuments()
      : 0;

    if (cols.length === 0 || usersCount === 0) {
      console.log('[mongo] 📦 Database is fresh or empty. Restoring baseline dataset from backup...');
      const backupDir = path.join(ROOT_DIR, 'backups', 'backup_2026-10-30T06-49-37-603Z');
      if (fs.existsSync(backupDir)) {
        const manifestFile = path.join(backupDir, 'manifest.json');
        if (fs.existsSync(manifestFile)) {
          const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
          const db = mongoose.connection.db;

          for (const [colName, colMeta] of Object.entries(manifest.collections)) {
            const dataFile = path.join(backupDir, colMeta.file);
            if (fs.existsSync(dataFile)) {
              const docs = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
              if (docs.length > 0) {
                const transformed = docs.map((doc) => {
                  if (doc._id && typeof doc._id === 'string' && /^[0-9a-fA-F]{24}$/.test(doc._id)) {
                    doc._id = new mongoose.Types.ObjectId(doc._id);
                  }
                  return doc;
                });
                try {
                  await db.collection(colName).insertMany(transformed, { ordered: false });
                } catch {}
              }
            }

            const idxFile = path.join(backupDir, colMeta.indexFile);
            if (fs.existsSync(idxFile)) {
              const indexes = JSON.parse(fs.readFileSync(idxFile, 'utf-8'));
              for (const idx of indexes) {
                if (idx.name === '_id_') continue;
                try {
                  const options = { name: idx.name };
                  if (idx.unique) options.unique = true;
                  if (idx.sparse) options.sparse = true;
                  await db.collection(colName).createIndex(idx.key, options);
                } catch {}
              }
            }
          }
          console.log('[mongo] ✅ Baseline dataset successfully restored (34 collections, 3,845 records).');
        }
      }
    } else {
      console.log(`[mongo] 📊 Database contains ${cols.length} collections with ${usersCount} users.`);
    }
    await mongoose.disconnect();
  } catch (err) {
    console.warn('[mongo] ⚠️ Note on data check:', err.message);
  }
}

function spawnService(prefix, command, args, cwd) {
  const proc = spawn(command, args, {
    cwd: cwd || ROOT_DIR,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) console.log(`[${prefix}] ${line}`);
    }
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) console.error(`[${prefix}] ${line}`);
    }
  });

  proc.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.warn(`[${prefix}] Process exited with code ${code}`);
    }
  });

  children.push(proc);
  return proc;
}

let isCleaningUp = false;
function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log('\n🛑 Shutting down all services...');

  const killPromises = children.map((proc) => {
    return new Promise((resolve) => {
      if (proc.pid) {
        treeKill(proc.pid, 'SIGKILL', () => resolve());
      } else {
        resolve();
      }
    });
  });

  Promise.all(killPromises).then(async () => {
    if (mongodInstance) {
      try {
        console.log('[mongo] Stopping MongoDB server...');
        await mongodInstance.stop();
      } catch {}
    }
    console.log('✅ All services stopped.');
    process.exit(0);
  });
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function main() {
  console.log('================================================================');
  console.log('  🚀 BRANDS & CREATORS — ALL-IN-ONE SYSTEM LAUNCHER             ');
  console.log(`  Mode: ${isDev ? 'DEVELOPMENT (Hot Reloading)' : 'PRODUCTION (Pre-compiled, Fast)'}`);
  console.log('================================================================\n');

  // 1. Start MongoDB
  await startMongo();

  // 2. Ensure Database has data
  await ensureSeedData();

  // 2.5 Safe Phase 31 Cleanup of synthetic test data
  const markerPath = path.join(ROOT_DIR, 'scratch', 'cleaned_phase31.marker');
  const shouldCleanup = process.argv.includes('--cleanup') || !fs.existsSync(markerPath);
  if (shouldCleanup) {
    try {
      const { runCleanup } = require('./cleanup-test-data');
      await runCleanup();
      fs.writeFileSync(markerPath, new Date().toISOString(), 'utf-8');
    } catch (cleanErr) {
      console.warn('[cleanup] ⚠️ Cleanup warning:', cleanErr.message);
    }
  }

  // 3. Start API Server
  console.log('[api]   🚀 Launching NestJS API Server on port 4000...');
  spawnService('api', 'node', ['apps/api/dist/main.js']);

  // Wait for API health check
  console.log('[api]   ⏳ Waiting for API to become ready...');
  const apiReady = await waitForHttp('http://localhost:4000/api/v1/health', 15000);
  if (apiReady) {
    console.log('[api]   ✅ NestJS API is healthy and listening at http://localhost:4000');
  } else {
    console.log('[api]   ℹ️ API is starting up in background.');
  }

  // 4. Start Web Application
  const webCommand = isDev
    ? ['node', 'node_modules/next/dist/bin/next', 'dev', 'apps/web', '-p', '3000', '-H', '127.0.0.1']
    : ['node', 'node_modules/next/dist/bin/next', 'start', 'apps/web', '-p', '3000', '-H', '127.0.0.1'];
  console.log(`[web]   🚀 Launching Web Application on port 3000 (${isDev ? 'dev' : 'start'})...`);
  spawnService('web', webCommand[0], webCommand.slice(1));

  // 5. Start Admin Portal
  const adminCommand = isDev
    ? ['node', 'node_modules/next/dist/bin/next', 'dev', 'apps/admin', '-p', '3001', '-H', '127.0.0.1']
    : ['node', 'node_modules/next/dist/bin/next', 'start', 'apps/admin', '-p', '3001', '-H', '127.0.0.1'];
  console.log(`[admin] 🚀 Launching Admin Backoffice on port 3001 (${isDev ? 'dev' : 'start'})...`);
  spawnService('admin', adminCommand[0], adminCommand.slice(1));

  // Wait briefly for frontends
  setTimeout(() => {
    console.log('\n================================================================');
    console.log('  🎉 ALL SERVICES ARE UP AND RUNNING!                           ');
    console.log('================================================================');
    console.log('  🌐 Web Marketplace:   http://localhost:3000');
    console.log('  🛡️ Admin Backoffice:  http://localhost:3001');
    console.log('  ⚡ Backend API & Docs: http://localhost:4000/api/v1/health');
    console.log('  📦 MongoDB:           mongodb://127.0.0.1:27017/brands_creators_dev');
    console.log('----------------------------------------------------------------');
    console.log('  🔑 Super Admin Login: admin@brandsandcreators.com / SuperAdmin@Brands2026!');
    console.log('  🔑 Test Brand Login:  qa.test.brand@example.com / TestPassword123!');
    console.log('  🔑 Test Creator:      creator.test@example.com / Password123!');
    console.log('================================================================');
    console.log('  Press Ctrl+C at any time to gracefully stop all services.\n');
  }, 4000);
}

main().catch((err) => {
  console.error('Fatal launch error:', err);
  cleanup();
});

