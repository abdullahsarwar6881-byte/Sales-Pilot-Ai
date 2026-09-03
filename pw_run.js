const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000/widget-preview-test';
const TEXT_INPUT = 'input:not([type=file])';
const SEND_BTN = 'button[aria-label="Send message"]';
const FILE_INPUT = 'input[type=file]';

const RES = [];
function record(name, ok, detail) {
  RES.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} | ${detail}`);
}

// Capture each /api/chat response into an array we can pull back via evaluate.
async function installCapture(page) {
  await page.addInitScript(() => {
    window.__chatResps = [];
    const orig = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const res = await orig(...args);
      try {
        if (String(args[0]).includes('/api/chat')) {
          const j = await res.clone().json();
          window.__chatResps.push(j);
        }
      } catch {}
      return res;
    };
  });
}
async function getResponses(page) {
  return await page.evaluate(() => window.__chatResps || []);
}

async function sendText(page, text) {
  const input = page.locator(TEXT_INPUT).first();
  await input.waitFor({ state: 'visible', timeout: 25000 });
  await input.fill(text);
  await page.locator(SEND_BTN).first().click();
}
async function sendImage(page, filePath, caption) {
  await page.setInputFiles(FILE_INPUT, filePath);
  await page.waitForTimeout(1200);
  await sendText(page, caption || 'Find this product from the image.');
}
async function waitBotsReply(page) {
  // Wait until a new fetch to /api/chat has completed (i.e., responses length grows)
  const before = (await getResponses(page)).length;
  await page.waitForFunction((n) => (window.__chatResps || []).length > n, before, { timeout: 90000 });
  await page.waitForTimeout(1500);
}

function findMatch(resp) {
  // Look for imageMatch (top-level) or nested
  if (resp && resp.imageMatch) return resp.imageMatch;
  if (resp && resp.match) return resp.match;
  for (const k of Object.keys(resp||{})) {
    const v = resp[k];
    if (v && typeof v === 'object' && v.matchType) return v;
    if (v && typeof v === 'object' && v.imageMatch && v.imageMatch.matchType) return v.imageMatch;
  }
  return null;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await installCapture(page);
  page.on('console', (m) => {
    const t = m.text();
    if (/error/i.test(t) && !/favicon|App Bridge|app bridge|bridge/i.test(t)) console.log('  [browser err]', t.slice(0,180));
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(TEXT_INPUT, { timeout: 25000 });
  console.log('widget ready on', BASE);

  // ===== A. EXACT SYNTHETIC IMAGE =====
  console.log('\n== A. EXACT SYNTHETIC IMAGE (FSP1266-YELLOW) ==');
  const synth = path.resolve('test_synthetic_fsp1266.png');
  if (!fs.existsSync(synth)) {
    record('A. asset present', false, 'test_synthetic_fsp1266.png missing');
  } else {
    await sendImage(page, synth, 'Can you find this product?');
    await waitBotsReply(page);
    const resps = await getResponses(page);
    const last = resps[resps.length-1];
    console.log('  [resp keys]', Object.keys(last||{}).join(','));
    console.log('  [imageMatch]', JSON.stringify(last && last.imageMatch, null, 0));
    const m = findMatch(last);
    if (m) {
      record('A. matchType present', true, `matchType=${m.matchType}`);
      record('A. matchType==exact', m.matchType === 'exact', `got ${m.matchType}`);
      const p = m.exactProduct || m.product;
      record('A. product selected', !!p, p ? `${p.name} | ${p.url}` : 'none');
      const url = (p && (p.url||p.productUrl)) || last?.productUrl || '';
      record('A. url points FSP1266-YELLOW', /fsp1266/i.test(url), url || 'no url');
    } else {
      console.log('  [full last resp]', JSON.stringify(last).slice(0,1500));
      record('A. found imageMatch', false, 'no imageMatch in response');
    }
  }

  await browser.close();
  console.log('\n==== SUMMARY ====');
  RES.forEach(r => console.log(`${r.ok?'PASS':'FAIL'} | ${r.name} | ${r.detail}`));
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
