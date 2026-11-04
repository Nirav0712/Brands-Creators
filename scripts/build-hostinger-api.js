/**
 * Brands & Creators — Hostinger Dedicated Backend Production Build Script
 * 
 * Purpose:
 * - Compiles ONLY the NestJS Backend and shared @brands-creators/types package.
 * - Does NOT compile Next.js web or admin applications.
 * - Resolves TypeScript compiler (tsc) robustly in both local and Hostinger production environments.
 * - Auto-heals by installing typescript if running in an ultra-restricted production install.
 * - Generates production backend output at apps/api/dist/main.js.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const typesDir = path.join(rootDir, 'packages', 'types');
const apiDir = path.join(rootDir, 'apps', 'api');

console.log('================================================================');
console.log('  Brands & Creators — Hostinger Backend Production Build');
console.log('================================================================');
console.log(`[Hostinger Build] Working Directory: ${rootDir}`);
console.log(`[Hostinger Build] Node.js Version:   ${process.version}`);
console.log(`[Hostinger Build] NODE_ENV:          ${process.env.NODE_ENV || 'not set (development)'}`);
console.log(`[Hostinger Build] Start Time:        ${new Date().toISOString()}`);

const startTime = Date.now();

// 1. Locate TypeScript compiler
function resolveTsc() {
  const candidatePaths = [
    path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc'),
    path.join(apiDir, 'node_modules', 'typescript', 'bin', 'tsc'),
    path.join(typesDir, 'node_modules', 'typescript', 'bin', 'tsc'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Try require.resolve
  try {
    const resolved = require.resolve('typescript/bin/tsc', { paths: [rootDir, apiDir, typesDir] });
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  } catch (_) {}

  return null;
}

let tscPath = resolveTsc();

if (!tscPath) {
  console.warn('\n[Hostinger Build] WARNING: TypeScript compiler (tsc) not found in standard node_modules paths.');
  console.log('[Hostinger Build] Attempting self-healing install of typescript...');
  
  const installResult = spawnSync('npm', ['install', 'typescript@5.4.5', '--no-save', '--no-package-lock'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });

  tscPath = resolveTsc();
}

if (!tscPath) {
  console.error('\n[Hostinger Build] ERROR: TypeScript compiler (tsc) could not be located or installed!');
  console.error('[Hostinger Build] Searched paths:');
  console.error(`  - ${path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc')}`);
  console.error(`  - ${path.join(apiDir, 'node_modules', 'typescript', 'bin', 'tsc')}`);
  console.error(`  - ${path.join(typesDir, 'node_modules', 'typescript', 'bin', 'tsc')}`);
  console.error('\n[Hostinger Build] Cause: Hostinger npm install ran in production mode without TypeScript.');
  console.error('[Hostinger Build] Remedy: Ensure "typescript" is declared in root package.json "dependencies".');
  process.exit(1);
}

console.log(`[Hostinger Build] TypeScript Compiler: ${tscPath}`);

// Clean stale build cache files to guarantee fresh compilation output
const staleCaches = [
  path.join(typesDir, 'tsconfig.tsbuildinfo'),
  path.join(apiDir, 'tsconfig.tsbuildinfo'),
];
for (const cacheFile of staleCaches) {
  if (fs.existsSync(cacheFile)) {
    try {
      fs.unlinkSync(cacheFile);
      console.log(`[Hostinger Build] Cleaned stale TypeScript cache: ${path.relative(rootDir, cacheFile)}`);
    } catch (_) {}
  }
}

// 2. Step 1 — Compile packages/types
console.log('\n--- Step 1: Compiling packages/types ---');
const typesTsconfig = path.join(typesDir, 'tsconfig.json');
if (!fs.existsSync(typesTsconfig)) {
  console.error(`[Hostinger Build] ERROR: Missing ${typesTsconfig}`);
  process.exit(1);
}

const typesResult = spawnSync(process.execPath, [tscPath, '-p', typesTsconfig], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});

if (typesResult.status !== 0) {
  console.error(`[Hostinger Build] ERROR: packages/types compilation failed with exit code ${typesResult.status}`);
  process.exit(typesResult.status || 1);
}

const typesEntry = path.join(typesDir, 'dist', 'index.js');
const typesDts = path.join(typesDir, 'dist', 'index.d.ts');
if (!fs.existsSync(typesEntry) || !fs.existsSync(typesDts)) {
  console.error('[Hostinger Build] ERROR: packages/types compiled but dist/index.js or dist/index.d.ts is missing!');
  process.exit(1);
}
console.log(`[Hostinger Build] packages/types compiled successfully -> ${typesEntry}`);

// 3. Step 2 — Compile apps/api
console.log('\n--- Step 2: Compiling apps/api (NestJS) ---');
const apiTsconfig = path.join(apiDir, 'tsconfig.json');
if (!fs.existsSync(apiTsconfig)) {
  console.error(`[Hostinger Build] ERROR: Missing ${apiTsconfig}`);
  process.exit(1);
}

const apiResult = spawnSync(process.execPath, [tscPath, '-p', apiTsconfig], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});

if (apiResult.status !== 0) {
  console.error(`[Hostinger Build] ERROR: apps/api compilation failed with exit code ${apiResult.status}`);
  process.exit(apiResult.status || 1);
}

const apiMain = path.join(apiDir, 'dist', 'main.js');
if (!fs.existsSync(apiMain)) {
  console.error(`[Hostinger Build] ERROR: apps/api compiled but ${apiMain} was not created!`);
  process.exit(1);
}

const stat = fs.statSync(apiMain);
console.log(`[Hostinger Build] apps/api compiled successfully -> ${apiMain} (${stat.size} bytes)`);

// 4. Step 3 — Verify entry file and runtime requirements
console.log('\n--- Step 3: Verification of Output Artifacts ---');
const expectedFiles = [
  path.join(apiDir, 'dist', 'main.js'),
  path.join(apiDir, 'dist', 'app.module.js'),
  path.join(typesDir, 'dist', 'index.js'),
];

let allExist = true;
for (const f of expectedFiles) {
  const exists = fs.existsSync(f);
  const size = exists ? fs.statSync(f).size : 0;
  console.log(`  [${exists ? 'EXISTS' : 'MISSING'}] ${path.relative(rootDir, f)} (${size} bytes)`);
  if (!exists) allExist = false;
}

if (!allExist) {
  console.error('[Hostinger Build] ERROR: Not all required artifacts exist!');
  process.exit(1);
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);
console.log('\n================================================================');
console.log(`  Hostinger Backend Build SUCCESSFUL in ${duration}s`);
console.log(`  Entry File for Hostinger: apps/api/dist/main.js`);
console.log('================================================================\n');
process.exit(0);
