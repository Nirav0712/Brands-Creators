const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'apps', 'api', 'src');

function walk(dir) {
  let files = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else if (file.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

const tsFiles = walk(srcDir);
const processEnvVars = new Map();
const configServiceCalls = new Map();

for (const file of tsFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // match process.env.FOO or process.env['FOO']
    const matchesEnv = line.matchAll(/process\.env(?:\.([A-Za-z0-9_]+)|\[['"]([A-Za-z0-9_]+)['"]\])/g);
    for (const m of matchesEnv) {
      const v = m[1] || m[2];
      if (!processEnvVars.has(v)) processEnvVars.set(v, []);
      processEnvVars.get(v).push({
        file: path.relative(rootDir, file).replace(/\\/g, '/'),
        line: idx + 1,
        code: line.trim()
      });
    }

    // match configService.get<...>(...)
    const matchesConfig = line.matchAll(/configService\.get(?:<[^>]+>)?\(['"]([^'"]+)['"]\)/g);
    for (const m of matchesConfig) {
      const k = m[1];
      if (!configServiceCalls.has(k)) configServiceCalls.set(k, []);
      configServiceCalls.get(k).push({
        file: path.relative(rootDir, file).replace(/\\/g, '/'),
        line: idx + 1,
        code: line.trim()
      });
    }
  });
}

function parseEnvKeys(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = [];
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        keys.push(trimmed.substring(0, eqIdx).trim());
      }
    }
  });
  return keys;
}

const rootEnvKeys = parseEnvKeys(path.join(rootDir, '.env'));
const rootEnvExampleKeys = parseEnvKeys(path.join(rootDir, '.env.example'));
const apiEnvExampleKeys = parseEnvKeys(path.join(rootDir, 'apps', 'api', '.env.example'));

console.log('=== 1. PROCESS.ENV VARIABLES IN apps/api/src (' + processEnvVars.size + ') ===');
for (const [k, refs] of Array.from(processEnvVars.entries()).sort()) {
  console.log(`- ${k} (${refs.length} refs): first at ${refs[0].file}:${refs[0].line}`);
}

console.log('\n=== 2. CONFIG SERVICE KEYS IN apps/api/src (' + configServiceCalls.size + ') ===');
for (const [k, refs] of Array.from(configServiceCalls.entries()).sort()) {
  console.log(`- ${k} (${refs.length} refs): first at ${refs[0].file}:${refs[0].line}`);
}

console.log('\n=== 3. ROOT .env KEYS (' + rootEnvKeys.length + ') ===');
console.log(JSON.stringify(rootEnvKeys.sort()));

console.log('\n=== 4. ROOT .env.example KEYS (' + rootEnvExampleKeys.length + ') ===');
console.log(JSON.stringify(rootEnvExampleKeys.sort()));

console.log('\n=== 5. apps/api/.env.example KEYS (' + apiEnvExampleKeys.length + ') ===');
console.log(JSON.stringify(apiEnvExampleKeys.sort()));

// Cross-referencing
const allSourceEnvVars = new Set(Array.from(processEnvVars.keys()));

// Check keys in .env not used in apps/api/src
const unusedInEnv = rootEnvKeys.filter(k => !allSourceEnvVars.has(k));
console.log('\n=== 6. KEYS IN ROOT .env NOT DIRECTLY USED IN apps/api/src ===');
console.log(JSON.stringify(unusedInEnv));

// Check keys in apps/api/src not in apps/api/.env.example
const missingInApiExample = Array.from(allSourceEnvVars).filter(k => !apiEnvExampleKeys.includes(k));
console.log('\n=== 7. SOURCE process.env KEYS MISSING FROM apps/api/.env.example ===');
console.log(JSON.stringify(missingInApiExample));

// Check keys in apps/api/src not in root .env.example
const missingInRootExample = Array.from(allSourceEnvVars).filter(k => !rootEnvExampleKeys.includes(k));
console.log('\n=== 8. SOURCE process.env KEYS MISSING FROM root .env.example ===');
console.log(JSON.stringify(missingInRootExample));

