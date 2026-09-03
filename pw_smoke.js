const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000/widget-preview-test';
const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} | ${detail}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    const t = msg.text();
    if (/error/i.test(t) && !/favicon/i.test(t)) {
      console.log('  [browser console]', t.slice(0, 200));
    }
  });
  page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0,300)));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  // wait for widget (auto-open). The widget input placeholder.
  await page.waitForSelector('input[placeholder^="Ask me anything"]', { timeout: 20000 });
  console.log('widget input visible:', await page.isVisible('input[placeholder^="Ask me anything"]'));

  const input = page.locator('input[placeholder^="Ask me anything"]');
  const sendBtn = page.locator('button[aria-label="Send message"]');

  // --- A. EXACT synthetic image ---
  console.log('\n==== A. EXACT SYNTHETIC IMAGE TEST ====');
  const synthPath = path.resolve('test_synthetic_fsp1266.png');
  if (fs.existsSync(synthPath)) {
    await page.setInputFiles('input[type=file]', synthPath).catch(e => console.log('setInputFiles err', String(e)));
    await page.waitForTimeout(1500);
    // after image select, input placeholder changes to "Ask about this product..."
    await input.fill('Can you find this product?');
    const sendVisible = await sendBtn.isEnabled();
    await sendBtn.click();
    // wait for loading then response
    await page.waitForTimeout(3000);
    console.log('sent image request');
  } else {
    record('A. set exact image', false, 'test_synthetic_fsp1266.png missing');
  }

  await browser.close();
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
