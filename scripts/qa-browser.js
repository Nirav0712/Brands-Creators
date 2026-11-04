const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactsDir = path.join('C:', 'Users', 'nikpr', '.gemini', 'antigravity-ide', 'brain', '7db79c26-b42d-49ff-845a-66962279e173');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('--- RE-RUNNING CHROME HEADLESS RESPONSIVE QA ---');

  // Warm up page first so Next.js finishes compilation of CSS and components
  try {
    console.log('Warming up http://localhost:3000 ...');
    await fetch('http://localhost:3000');
    await sleep(2000);
    console.log('Warming up http://localhost:3000/explore ...');
    await fetch('http://localhost:3000/explore');
    await sleep(1500);
  } catch (e) {
    console.error('Warmup fetch error:', e.message);
  }

  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_qa_profile_' + Date.now());

  const viewports = [
    { name: 'desktop', width: 1280, height: 800, url: 'http://localhost:3000' },
    { name: 'tablet', width: 768, height: 1024, url: 'http://localhost:3000' },
    { name: 'mobile', width: 375, height: 812, url: 'http://localhost:3000' },
    { name: 'explore_desktop', width: 1280, height: 800, url: 'http://localhost:3000/explore' },
    { name: 'admin_dashboard', width: 1280, height: 800, url: 'http://localhost:3001' },
  ];

  for (const vp of viewports) {
    const outFile = path.join(artifactsDir, `screenshot_${vp.name}.png`);
    console.log(`\nCapturing ${vp.name} (${vp.width}x${vp.height}) -> ${outFile}`);
    try {
      const args = [
        '--headless=new',
        '--disable-gpu',
        `--window-size=${vp.width},${vp.height}`,
        `--user-data-dir=${tempDir}`,
        `--screenshot=${outFile}`,
      ];
      if (vp.name === 'mobile') {
        args.push('--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');
      }
      args.push(vp.url);
      execFileSync(chromePath, args, { stdio: 'pipe', timeout: 25000 });
      if (fs.existsSync(outFile)) {
        const stats = fs.statSync(outFile);
        console.log(`  ✅ Successfully saved ${vp.name} (${stats.size} bytes)`);
      } else {
        console.log(`  ⚠️ Command exited 0 but file not found: ${outFile}`);
      }
    } catch (err) {
      console.error(`  ❌ Failed to capture ${vp.name}:`, err.message);
    }
  }

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  console.log('\n--- BROWSER QA CAPTURE COMPLETE ---');
}

run().catch(console.error);
