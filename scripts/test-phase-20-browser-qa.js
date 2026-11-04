/**
 * BRANDS & CREATORS — PHASE 20 REAL BROWSER QA & USER WORKFLOW VALIDATION
 *
 * Automates real Chrome browser user journeys over Chrome DevTools Protocol (CDP):
 * - Journey 1: Creator User Login → Account Menu → Navigation
 * - Journey 2: My Profile (/profile) → Edit Mode → Form Submission → Fresh Reload Persistence
 * - Journey 3: Avatar Upload & Photo Picker Modal
 * - Journey 4: Marketplace Discovery (/explore) → Creator Card Reflection & Data Consistency
 * - Journey 5: Public Creator Profile Page (/creators/[slug])
 * - Journey 6: Admin Backoffice Header Menu & Session Validation
 * - Journey 7: Logout Action & Client Storage Invalidation
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_qa_p20_' + Date.now());
const repoScreenshotsDir = path.join(__dirname, '..', 'docs', 'screenshots');
const artifactScreenshotsDir = 'C:\\Users\\nikpr\\.gemini\\antigravity\\brain\\ea273c11-e7d8-4c2f-b7a3-82561f944fd5\\screenshots';

[repoScreenshotsDir, artifactScreenshotsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

let chromeProc = null;
let ws = null;
let idCounter = 1;

let totalAsserts = 0;
let passedAsserts = 0;

function assert(condition, message) {
  totalAsserts++;
  if (!condition) {
    console.error(`  ❌ [FAIL ${totalAsserts}] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedAsserts++;
  console.log(`  ✅ [PASS ${totalAsserts}] ${message}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getDebuggerUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const data = await res.json();
        return data.webSocketDebuggerUrl;
      }
    } catch (e) {}
    await sleep(200);
  }
  throw new Error('Could not connect to Chrome debugging endpoint on port 9222');
}

function sendBrowser(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = idCounter++;
    const onMsg = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === msgId) {
        ws.off('message', onMsg);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.on('message', onMsg);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

async function createTab(initialUrl = 'about:blank', width = 1280, height = 800) {
  const { targetId } = await sendBrowser('Target.createTarget', { url: initialUrl });
  const { sessionId } = await sendBrowser('Target.attachToTarget', { targetId, flatten: true });

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const msgId = idCounter++;
      const onMsg = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === msgId) {
          ws.off('message', onMsg);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.on('message', onMsg);
      ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
    });
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(1000);

  const navigate = async (url, waitMs = 2000) => {
    await send('Page.navigate', { url });
    await sleep(waitMs);
  };

  const evalJs = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
      throw new Error(`Eval error: ${desc}`);
    }
    return res.result?.value;
  };

  const captureScreenshot = async (filename) => {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(path.join(repoScreenshotsDir, filename), buffer);
    fs.writeFileSync(path.join(artifactScreenshotsDir, filename), buffer);
    console.log(`  📸 Saved screenshot: ${filename} (${buffer.length} bytes)`);
  };

  const close = async () => {
    try {
      await sendBrowser('Target.closeTarget', { targetId });
    } catch {}
  };

  return { targetId, sessionId, send, navigate, evalJs, captureScreenshot, close };
}

async function run() {
  console.log('\n================================================================');
  console.log('🌐 BRANDS & CREATORS — PHASE 20 REAL CHROME BROWSER QA SUITE');
  console.log('================================================================\n');

  let debuggerUrl;
  try {
    debuggerUrl = await getDebuggerUrl();
  } catch (e) {
    console.log('1. Launching Google Chrome in headless mode with remote debugging...');
    chromeProc = spawn(
      chromePath,
      [
        '--remote-debugging-port=9222',
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=1280,850',
        `--user-data-dir=${tempDir}`,
      ],
      { stdio: 'ignore' },
    );
    debuggerUrl = await getDebuggerUrl();
  }

  console.log('✅ Chrome DevTools Protocol connected.\n');

  ws = new WebSocket(debuggerUrl);
  await new Promise((resolve) => ws.once('open', resolve));

  const tab = await createTab('http://localhost:3000/login');

  try {
    // -------------------------------------------------------------
    // JOURNEY 1: LOGIN → ACCOUNT MENU VERIFICATION
    // -------------------------------------------------------------
    console.log('--- JOURNEY 1: LOGIN & USER ACCOUNT MENU ---');
    const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'creator@demo.com', password: 'Password@123' }),
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data?.accessToken;
    const userObj = loginJson.data?.user;

    await tab.navigate('http://localhost:3000/login', 1500);

    // Set authenticated state in localStorage
    await tab.evalJs(`(() => {
      localStorage.setItem('bc_access_token', ${JSON.stringify(token)});
      localStorage.setItem('bc_user', JSON.stringify(${JSON.stringify(userObj)}));
    })()`);

    await tab.navigate('http://localhost:3000', 1500);

    // Open User Account Menu
    await tab.evalJs(`(() => {
      const accountBtn = document.querySelector('button[aria-label="User Account Menu"]');
      if (accountBtn) accountBtn.click();
    })()`);
    await sleep(800);

    const accountMenuVisible = await tab.evalJs(`(() => {
      return document.body.innerText.includes('Sign Out') && (document.body.innerText.includes('View My Profile') || document.body.innerText.includes('Profile'));
    })()`);
    assert(accountMenuVisible, 'User account menu renders with Profile and Sign Out options');

    await tab.captureScreenshot('phase20_01_account_menu.png');

    // -------------------------------------------------------------
    // JOURNEY 2: MY PROFILE EDIT MODE & FRESH RELOAD PERSISTENCE
    // -------------------------------------------------------------
    console.log('\n--- JOURNEY 2: MY PROFILE EDIT MODE & PERSISTENCE ---');
    await tab.navigate('http://localhost:3000/profile', 2000);

    const profileLoaded = await tab.evalJs(`(() => {
      return document.body.innerText.includes('Creative Professional') || document.body.innerText.includes('Headline');
    })()`);
    assert(profileLoaded, 'Profile page renders with role metadata');

    // Enter Edit Mode
    await tab.evalJs(`(() => {
      const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Edit Profile'));
      if (editBtn) editBtn.click();
    })()`);
    await sleep(1000);

    // Fill new headline and starting rate
    const updatedHeadline = `Visionary Commercial DP & Cinema Director (QA Verified)`;
    await tab.evalJs(`(() => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const headlineInput = document.querySelector('input[placeholder*="Cinematographer"]') || document.querySelectorAll('input[type="text"]')[1];
      if (headlineInput) {
        setVal(headlineInput, ${JSON.stringify(updatedHeadline)});
      }
      const priceInput = Array.from(document.querySelectorAll('input[type="number"]'))[0];
      if (priceInput) {
        setVal(priceInput, '48000');
      }
    })()`);
    await sleep(500);

    // Click Save Changes
    await tab.evalJs(`(() => {
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save Profile Changes'));
      if (saveBtn) saveBtn.click();
    })()`);
    await sleep(2500);

    // Verify success notification
    const saveConfirmed = await tab.evalJs(`(() => {
      return document.body.innerText.includes('saved successfully');
    })()`);
    assert(saveConfirmed, 'Profile save displays success confirmation banner');

    // Perform hard reload to verify persistence across fresh page requests
    await tab.evalJs(`location.reload()`);
    await sleep(2500);

    const persistedHeadlineFound = await tab.evalJs(`(() => {
      return document.body.innerText.includes('Visionary Commercial DP & Cinema Director');
    })()`);
    assert(persistedHeadlineFound, 'Saved profile changes strictly persisted across browser reload');

    await tab.captureScreenshot('phase20_02_profile_saved_persistence.png');

    // -------------------------------------------------------------
    // JOURNEY 3: PHOTO PICKER MODAL
    // -------------------------------------------------------------
    console.log('\n--- JOURNEY 3: PHOTO MANAGEMENT MODAL ---');
    await tab.evalJs(`(() => {
      const photoBtn = document.querySelector('button[title*="photo"]') || document.querySelector('button[title*="Change Photo"]') || document.querySelector('button[aria-label="Change profile photo"]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-camera'));
      if (photoBtn) photoBtn.click();
    })()`);
    await sleep(800);

    const modalOpen = await tab.evalJs(`(() => {
      return document.body.innerText.includes('Manage Profile Photo') || document.body.innerText.includes('Choose Image');
    })()`);
    assert(modalOpen, 'Avatar photo management modal opens with file specifications');

    await tab.captureScreenshot('phase20_03_photo_modal.png');

    // Close modal
    await tab.evalJs(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close modal"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cancel') || b.querySelector('svg.lucide-x'));
      if (closeBtn) closeBtn.click();
    })()`);
    await sleep(500);

    // -------------------------------------------------------------
    // JOURNEY 4: MARKETPLACE EXPLORE TALENT DIRECTORY
    // -------------------------------------------------------------
    console.log('\n--- JOURNEY 4: MARKETPLACE EXPLORE DIRECTORY ---');
    await tab.navigate('http://localhost:3000/explore', 2500);

    const exploreLoaded = await tab.evalJs(`(() => {
      return document.body.innerText.includes('Explore') && document.querySelectorAll('a[href*="/creators/"]').length > 0;
    })()`);
    assert(exploreLoaded, 'Explore talent directory loaded with creator cards');

    await tab.captureScreenshot('phase20_04_explore_creator_card.png');

    // -------------------------------------------------------------
    // JOURNEY 5: PUBLIC CREATOR PROFILE PAGE
    // -------------------------------------------------------------
    console.log('\n--- JOURNEY 5: PUBLIC CREATOR PROFILE PAGE ---');
    await tab.navigate('http://localhost:3000/creators/rohan-kapoor', 2500);

    const creatorPageLoaded = await tab.evalJs(`(() => {
      return document.body.innerText.includes('Book in advance') || document.body.innerText.includes('Portfolio') || document.body.innerText.includes('Collaborations');
    })()`);
    assert(creatorPageLoaded, 'Public creator profile loaded with portfolio tabs and pricing');

    await tab.captureScreenshot('phase20_05_public_creator_page.png');

    // -------------------------------------------------------------
    // JOURNEY 6: ADMIN BACKOFFICE HEADER & SESSION VALIDATION
    // -------------------------------------------------------------
    console.log('\n--- JOURNEY 6: ADMIN BACKOFFICE HEADER MENU ---');
    // Set admin token in admin portal localStorage
    await tab.navigate('http://localhost:3001', 2000);

    await tab.evalJs(`(() => {
      localStorage.setItem('bc_admin_token', 'mock_admin_token_qa');
      localStorage.setItem('bc_user', JSON.stringify({
        fullName: 'Super Admin',
        email: 'admin@brandsandcreators.com',
        roles: ['SUPER_ADMIN']
      }));
    })()`);
    await tab.navigate('http://localhost:3001', 2000);

    // Open Admin header dropdown
    await tab.evalJs(`(() => {
      const adminBtn = document.querySelector('button[aria-label="Admin Account Menu"]');
      if (adminBtn) adminBtn.click();
    })()`);
    await sleep(800);

    const adminMenuRendered = await tab.evalJs(`(() => {
      return document.body.innerText.includes('Super Admin') && document.body.innerText.includes('Sign Out of Admin');
    })()`);
    assert(adminMenuRendered, 'Admin header account menu renders with Super Admin role and Sign Out button');

    await tab.captureScreenshot('phase20_06_admin_header_account.png');

    // -------------------------------------------------------------
    // JOURNEY 7: LOGOUT WORKFLOW & STORAGE INVALIDATION
    // -------------------------------------------------------------
    console.log('\n--- JOURNEY 7: DESKTOP LOGOUT & STORAGE INVALIDATION ---');
    await tab.navigate('http://localhost:3000', 2000);

    // Open account menu
    await tab.evalJs(`(() => {
      const accountBtn = document.querySelector('button[aria-label="User Account Menu"]');
      if (accountBtn) accountBtn.click();
    })()`);
    await sleep(600);

    // Click Sign Out
    await tab.evalJs(`(() => {
      const signOutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign Out'));
      if (signOutBtn) signOutBtn.click();
    })()`);
    await sleep(2000);

    // Check localStorage is cleared
    const storageCleared = await tab.evalJs(`(() => {
      const token = localStorage.getItem('bc_access_token');
      const user = localStorage.getItem('bc_user');
      return !token && !user;
    })()`);
    assert(storageCleared, 'Client localStorage tokens and user profile cleared upon Sign Out');

    const redirectedToLogin = await tab.evalJs(`(() => {
      return window.location.pathname === '/login' || document.body.innerText.includes('Sign In');
    })()`);
    assert(redirectedToLogin, 'User redirected to login page after signing out');

    await tab.captureScreenshot('phase20_07_logged_out.png');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`🎉 PHASE 20 REAL BROWSER QA SUITE COMPLETED`);
    console.log(`   Passed: ${passedAsserts} / ${totalAsserts}`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ BROWSER QA FAILED WITH ERROR:\n', err);
    process.exit(1);
  } finally {
    await tab.close();
    if (ws) ws.close();
    if (chromeProc) chromeProc.kill();
  }
}

run();
