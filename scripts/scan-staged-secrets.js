const { execSync } = require('child_process');

console.log('================================================================');
console.log('  Scanning Staged Files for Accidental Credentials & Secrets');
console.log('================================================================');

const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`Found ${stagedFiles.length} staged files to scan:`);
stagedFiles.forEach(f => console.log(`  - ${f}`));

const diff = execSync('git diff --cached', { encoding: 'utf8' });

const suspiciousPatterns = [
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/ },
  { name: 'Stripe Live Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/ },
  { name: 'Razorpay Live Key', regex: /rzp_live_[0-9a-zA-Z]{14}/ },
  { name: 'RSA Private Key', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/ },
  { 
    name: 'Real MongoDB URI with Credentials', 
    regex: /mongodb(?:\+srv)?:\/\/(?!<[^>]+>)[a-zA-Z0-9_\-\.]+:(?!<[^>]+>)[a-zA-Z0-9_\-\.]+@/ 
  },
  { name: 'Generic AWS Secret Key', regex: /(?:aws_secret_access_key|aws_access_key_id)\s*=\s*[a-zA-Z0-9/+=]{20,}/i },
];

let foundIssues = [];

const lines = diff.split('\n');
lines.forEach((line, index) => {
  if (!line.startsWith('+') || line.startsWith('+++')) return;
  const addedContent = line.substring(1).trim();

  for (const pattern of suspiciousPatterns) {
    if (pattern.regex.test(addedContent)) {
      foundIssues.push({
        line: index + 1,
        rule: pattern.name,
        snippet: addedContent.substring(0, 80),
      });
    }
  }
});

console.log('\n--- Scan Summary ---');
if (foundIssues.length === 0) {
  console.log('✅ SECRETS SCAN PASSED: Zero credentials, private keys, or actual secrets found in staged diff.');
  process.exit(0);
} else {
  console.error(`❌ SECRETS SCAN FAILED: Found ${foundIssues.length} potential secrets!`);
  foundIssues.forEach(i => console.error(`  Line ${i.line} [${i.rule}]: ${i.snippet}`));
  process.exit(1);
}
