const fs = require('fs');
const path = require('path');

const imports = new Set();

function scan(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      scan(p);
    } else if (f.endsWith('.ts')) {
      const content = fs.readFileSync(p, 'utf8');
      const importRegex = /(?:import|from|require\()\s*['"]([^'"./][^'"]*)['"]/g;
      let m;
      while ((m = importRegex.exec(content)) !== null) {
        let pkg = m[1];
        if (pkg.startsWith('@')) {
          const parts = pkg.split('/');
          pkg = parts[0] + '/' + (parts[1] || '');
        } else {
          pkg = pkg.split('/')[0];
        }
        imports.add(pkg);
      }
    }
  }
}

scan(path.join(__dirname, '..', 'apps', 'api', 'src'));

console.log('--- Imported packages in apps/api/src ---');
const sortedImports = Array.from(imports).sort();
sortedImports.forEach(i => console.log('  -', i));

const apiPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'apps', 'api', 'package.json'), 'utf8'));
const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const allDeps = {
  ...rootPkg.dependencies,
  ...apiPkg.dependencies,
};

console.log('\n--- Checking runtime dependencies against apps/api/package.json & root package.json ---');
const builtins = new Set(['crypto', 'fs', 'path', 'os', 'http', 'https', 'events', 'util', 'stream', 'buffer']);
const missing = [];

for (const imp of sortedImports) {
  if (builtins.has(imp)) continue;
  if (!allDeps[imp]) {
    missing.push(imp);
    console.log(`  [MISSING in dependencies]: ${imp}`);
  } else {
    console.log(`  [OK]: ${imp} (version: ${allDeps[imp]})`);
  }
}

if (missing.length === 0) {
  console.log('\nAll imported runtime packages are declared in dependencies!');
} else {
  console.log(`\nWARNING: Found ${missing.length} packages missing from production dependencies:`, missing);
}

