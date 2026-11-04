/**
 * Brands & Creators — Hostinger Runtime Dependency & Entry Verification
 * 
 * Verifies that all runtime dependencies required by the compiled NestJS API
 * can be resolved by Node.js in the production environment.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'apps', 'api');
const distDir = path.join(apiDir, 'dist');
const entryFile = path.join(distDir, 'main.js');

console.log('================================================================');
console.log('  Brands & Creators — Hostinger Runtime Verification');
console.log('================================================================');

// 1. Entry file verification
if (!fs.existsSync(entryFile)) {
  console.error(`[FAIL] Entry file does not exist: ${entryFile}`);
  process.exit(1);
}

const stat = fs.statSync(entryFile);
console.log(`[PASS] Entry file exists: ${path.relative(rootDir, entryFile)} (${stat.size} bytes)`);

// 2. Syntax validation
const vm = require('vm');
try {
  const code = fs.readFileSync(entryFile, 'utf8');
  new vm.Script(code);
  console.log('[PASS] Entry file JavaScript syntax is valid (compiled successfully with vm.Script).');
} catch (e) {
  console.error(`[FAIL] Entry file syntax error: ${e.message}`);
  process.exit(1);
}

// 3. Runtime dependency resolution check
const requiredPackages = [
  '@nestjs/core',
  '@nestjs/common',
  '@nestjs/config',
  '@nestjs/mongoose',
  '@nestjs/jwt',
  '@nestjs/passport',
  '@nestjs/platform-express',
  '@nestjs/platform-socket.io',
  '@nestjs/swagger',
  '@nestjs/throttler',
  '@nestjs/websockets',
  'bcryptjs',
  'class-transformer',
  'class-validator',
  'cloudinary',
  'cookie-parser',
  'dotenv',
  'helmet',
  'mongoose',
  'nodemailer',
  'passport',
  'passport-jwt',
  'passport-local',
  'reflect-metadata',
  'rxjs',
  'socket.io',
  path.join(rootDir, 'packages', 'types', 'dist', 'index.js'),
];

let allPassed = true;
console.log('\n--- Checking Runtime Dependency Resolutions ---');
for (const pkg of requiredPackages) {
  try {
    const resolved = require.resolve(pkg, { paths: [distDir, apiDir, rootDir] });
    console.log(`  [OK] ${pkg} -> ${path.relative(rootDir, resolved)}`);
  } catch (err) {
    console.error(`  [FAILED] Cannot resolve: ${pkg} (${err.message})`);
    allPassed = false;
  }
}

if (!allPassed) {
  console.error('\n[FAIL] One or more runtime dependencies could not be resolved!');
  process.exit(1);
}

console.log('\n================================================================');
console.log('  All Runtime Dependencies and Entry Points VERIFIED for Hostinger');
console.log('================================================================\n');
process.exit(0);
