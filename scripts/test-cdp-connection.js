const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_cdp_test_' + Date.now());

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
  throw new Error('Failed to connect to Chrome debugging endpoint');
}

async function main() {
  console.log('Launching headless Chrome with remote debugging on 9222...');
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempDir}`,
    '--disable-gpu',
    '--no-first-run',
    'about:blank',
  ]);

  try {
    const wsUrl = await getDebuggerUrl();
    console.log('Connected to Chrome CDP! WebSocket URL:', wsUrl);

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.once('open', resolve));
    console.log('WebSocket handshake complete.');

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
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

    const { targetId } = await send('Target.createTarget', { url: 'http://localhost:3000' });
    console.log('Created Target:', targetId);

    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    console.log('Attached Session:', sessionId);

    function sendSession(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
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
    }

    await sendSession('Page.enable');
    await sendSession('Runtime.enable');
    await sleep(1500);

    const titleEval = await sendSession('Runtime.evaluate', {
      expression: 'document.title',
      returnByValue: true,
    });
    console.log('Page Title:', titleEval.result?.value);

    const urlEval = await sendSession('Runtime.evaluate', {
      expression: 'window.location.href',
      returnByValue: true,
    });
    console.log('Page URL:', urlEval.result?.value);

    ws.close();
    console.log('CDP Test Successful!');
  } finally {
    proc.kill();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

