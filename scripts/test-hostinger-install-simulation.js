/**
 * Brands & Creators — Hostinger Production Build Simulation Test
 * 
 * Simulates Hostinger production build conditions:
 * - NODE_ENV=production
 * - Ensures no devDependencies are required for build
 * - Runs the dedicated build:hostinger:api script
 * - Verifies exit code 0 and presence of artifacts
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('  Testing Hostinger Build Simulation (NODE_ENV=production)');
console.log('================================================================');

// 1. Clean previous build artifacts to ensure true clean build
console.log('\n[Sim 1/4] Cleaning previous dist directories...');
const apiDist = path.join(rootDir, 'apps', 'api', 'dist');
const typesDist = path.join(rootDir, 'packages', 'types', 'dist');

if (fs.existsSync(apiDist)) {
  fs.rmSync(apiDist, { recursive: true, force: true });
  console.log('  Removed apps/api/dist');
}
if (fs.existsSync(typesDist)) {
  fs.rmSync(typesDist, { recursive: true, force: true });
  console.log('  Removed packages/types/dist');
}

// 2. Run the proposed Hostinger build command
console.log('\n[Sim 2/4] Executing npm run build:hostinger:api under NODE_ENV=production...');
const buildStart = Date.now();
const simEnv = {
  ...process.env,
  NODE_ENV: 'production',
};

const buildResult = spawnSync('npm', ['run', 'build:hostinger:api'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env: simEnv,
});

const buildDuration = ((Date.now() - buildStart) / 1000).toFixed(2);
console.log(`\n[Sim 2/4 Result] Exit code: ${buildResult.status} (Duration: ${buildDuration}s)`);

if (buildResult.status !== 0) {
  console.error('[FAIL] Hostinger build simulation failed!');
  process.exit(1);
}

// 3. Verify output files
console.log('\n[Sim 3/4] Verifying generated build artifacts...');
const expectedFiles = [
  path.join(typesDist, 'index.js'),
  path.join(typesDist, 'index.d.ts'),
  path.join(apiDist, 'main.js'),
  path.join(apiDist, 'app.module.js'),
];

let allFound = true;
for (const file of expectedFiles) {
  const rel = path.relative(rootDir, file);
  if (fs.existsSync(file)) {
    const size = fs.statSync(file).size;
    console.log(`  [OK] ${rel} exists (${size} bytes)`);
  } else {
    console.error(`  [MISSING] ${rel}`);
    allFound = false;
  }
}

if (!allFound) {
  console.error('[FAIL] Missing expected artifacts!');
  process.exit(1);
}

// 4. Verify runtime dependencies
console.log('\n[Sim 4/4] Verifying runtime module resolution...');
const verifyResult = spawnSync('node', ['scripts/verify-hostinger-runtime.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env: simEnv,
});

if (verifyResult.status !== 0) {
  console.error('[FAIL] Runtime verification failed!');
  process.exit(1);
}

console.log('\n================================================================');
console.log('  Hostinger Production Simulation: ALL CHECKS PASSED');
console.log('================================================================\n');
process.exit(0);

