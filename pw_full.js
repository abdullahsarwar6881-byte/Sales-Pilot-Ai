const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ---- env ----
function loadEnv() {
  let txt = fs.readFileSync('.env.local','utf8').replace(/^\uFEFF/, '');
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken:false, persistSession:false } });
const PROFILE = '3c321d7c-23e8-4101-9d30-1a2a8a0a37f9';

async function countConversations(sessionId) {
  if (!sessionId) return -1;
  const { count, error } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', PROFILE)
    .eq('visitor_session_id', sessionId);
  if (error) return -1;
  return count;
}

const BASE = 'http://localhost:3000/widget-preview-test';
const TEXT_INPUT = 'input:not([type=file])';
const SEND_BTN = 'button[aria-label="Send message"]';
const FILE_INPUT = 'input[type=file]';
const RES = [];
function record(name, ok, detail) {
  RES.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} | ${detail}`);
}

async function installCapture(page) {
  await page.addInitScript(() => {
    window.__chatResps = [];
    const orig = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const res = await orig(...args);
      try { if (String(args[0]).includes('/api/chat')) window.__chatResps.push(await res.clone().json()); } catch {}
      return res;
    };
  });
}
async function getResponses(page) { return await page.evaluate(() => window.__chatResps || []); }
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
async function waitBot(page, beforeCount) {
  const before = beforeCount === undefined ? (await getResponses(page)).length : beforeCount;
  await page.waitForFunction((n) => (window.__chatResps || []).length > n, before, { timeout: 90000 });
  await page.waitForTimeout(1200);
}
function getMatch(resp) {
  if (resp && resp.imageMatch && resp.imageMatch.matchType) return resp.imageMatch;
  if (resp && resp.match && resp.match.matchType) return resp.match;
  return null;
}
function hasProductCards(resp) {
  return resp && (resp.productCount > 0 || (resp.products && resp.products.length>0) || (resp.productCards && resp.productCards.length>0));
}
function extractProducts(resp) {
  const list = [];
  for (const k of ['products','productCards']) {
    const v = resp && resp[k];
    if (Array.isArray(v)) { for (const p of v) if (p && (p.name||p.title||p.url)) list.push(p); }
  }
  return list;
}

async function sessionOf(page){
  await page.waitForFunction(()=>{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('sales-pilot-preview-session'))return true;}return false;},{timeout:20000});
  return await page.evaluate(()=>{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('sales-pilot-preview-session'))return localStorage.getItem(k);}return null;});
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await installCapture(page);
  page.on('console', (m) => {
    const t = m.text();
    if (/error/i.test(t) && !/favicon|App Bridge|app bridge|bridge/i.test(t)) console.log('  [browser err]', t.slice(0,160));
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(TEXT_INPUT, { timeout: 25000 });
  console.log('widget ready');

  // Get visitor session id from localStorage for billing test
  const sessionId = await sessionOf(page);

  // ============ A. EXACT + FOLLOW-UP IDENTITY ============
  console.log('\n== A. EXACT IMAGE + FOLLOW-UP IDENTITY ==');
  const synth = path.resolve('test_synthetic_fsp1266.png');
  if (fs.existsSync(synth)) {
    await sendImage(page, synth, 'Can you find this product?');
    await waitBot(page, 0);
    let resps = await getResponses(page);
    let m = getMatch(resps[resps.length-1]);
    record('A. matchType==exact', m && m.matchType==='exact', m ? m.matchType : 'none');
    const exactUrl = m && (m.exactProduct?.url || m.exactProduct?.productUrl || '');
    const exactName = m && (m.exactProduct?.name || '');
    record('A. url==FSP1266-YELLOW', /fsp1266/i.test(exactUrl), exactUrl || 'no url');

    // Follow-up: is this available?
    const n1 = resps.length;
    await sendText(page, 'Is this available?');
    await waitBot(page, n1);
    resps = await getResponses(page);
    const fu1 = resps[resps.length-1];
    const fu1Products = extractProducts(fu1);
    const fu1Url = fu1Products[0] && (fu1Products[0].url || fu1Products[0].productUrl || '');
    record('A. followup available same product', /fsp1266/i.test(fu1Url) || fu1Url === exactUrl, `url=${fu1Url || 'none'}`);
    const fu1M = getMatch(fu1);
    const fu1MatchUrl = fu1M && (fu1M.exactProduct?.url || '');
    record('A. followup imageMatch same', !fu1M || /fsp1266/i.test(fu1MatchUrl || exactUrl), fu1MatchUrl || exactUrl);

    // Follow-up: give me its link
    const n2 = resps.length;
    await sendText(page, 'Can you give me its link?');
    await waitBot(page, n2);
    resps = await getResponses(page);
    const fu2 = resps[resps.length-1];
    const fu2Text = String(fu2.response || fu2.message || '');
    const fu2Products = extractProducts(fu2);
    const fu2Url = fu2Products[0] && (fu2Products[0].url || fu2Products[0].productUrl || '');
    record('A. followup link returns exact url', /fsp1266/i.test(fu2Url) || fu2Text.includes('tfs.com.pk/products/'), `url=${fu2Url||'none'} text=${fu2Text.slice(0,120)}`);
  } else { record('A. asset present', false, 'missing test image'); }

  // ============ B. REAL PRODUCT PHOTO ============
  console.log('\n== B. REAL PRODUCT PHOTO ==');
  const real = path.resolve('real_fsp1266_yellow.jpg');
  if (fs.existsSync(real)) {
    const n = (await getResponses(page)).length;
    await sendImage(page, real, 'What is this dress?');
    await waitBot(page, n);
    const resps = await getResponses(page);
    const m = getMatch(resps[resps.length-1]);
    record('B. attempt visual match', !!m, m ? `matchType=${m.matchType}` : 'no imageMatch');
    record('B. no wrong-product replacement', !m || m.matchType !== 'exact' || /fsp1266/i.test(m.exactProduct?.url||''), m ? `${m.matchType}` : 'no match');
  } else { record('B. asset present', false, 'missing real photo'); }

  // ============ C. NO MATCH ============
  console.log('\n== C. NO MATCH (unrelated image) ==');
  const car = path.resolve('test_car.png');
  if (fs.existsSync(car)) {
    const n = (await getResponses(page)).length;
    await sendImage(page, car, 'Find this product.');
    await waitBot(page, n);
    const resps = await getResponses(page);
    const last = resps[resps.length-1];
    const m = getMatch(last);
    record('C. matchType==no_match', !m || m.matchType==='no_match', m ? m.matchType : 'no imageMatch block');
    const text = String(last.response || last.message || '');
    const p = extractProducts(last);
    const hasCards = hasProductCards(last);
    record('C. no false exact card', !(m && m.matchType==='exact'), m ? m.matchType : 'none');
    record('C. no fake link for car', !hasCards || (p.length && hasProductCards(last) && /similar|recommend/i.test(text)), `cards=${p.length}`);
        record('C. conservative text', /(couldn|not able|cannot|can.t find|unable|didn.t|don.t find|no match|similar)/i.test(text) || p.length===0, text.slice(0,150));
  } else { record('C. asset present', false, 'missing test_car.png'); }

  // ============ E. QUALITY QUESTION ============
  console.log('\n== E. QUALITY QUESTION ==');
  const nE = (await getResponses(page)).length;
  await sendText(page, 'How is the quality of your dresses?');
  await waitBot(page, nE);
  const respsE = await getResponses(page);
  const lastE = respsE[respsE.length-1];
  const textE = String(lastE.response || lastE.message || '');
  record('E. no "in this store"', !/in this store/i.test(textE), textE.slice(0,120));
  record('E. no unsupported premium claim', !/premium quality(?!.*verified)/i.test(textE), textE.slice(0,120));
  record('E. merchant voice', /(our store|our collection|we offer|we can help|our)/i.test(textE), textE.slice(0,120));

  // ============ F. BILLING ============
  console.log('\n== F. BILLING (conversation counting) ==');
  // new context = genuinely new visitor session
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await installCapture(page2);
  await page2.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page2.waitForSelector(TEXT_INPUT, { timeout: 25000 });
  const newSession = await sessionOf(page2);
  record('F. new session created', !!newSession && newSession !== sessionId, `${newSession} (old=${sessionId})`);

  let n = (await getResponses(page2)).length;
  await sendText(page2, 'Hi, do you sell dresses?');
  await waitBot(page2, n);
  let c1 = await countConversations(newSession);
  record('F. first msg -> exactly 1 conversation', c1 === 1, `count=${c1}`);

  // send 12 more messages
  const extra = ['Is it available in medium?','What is the price?','Do you have blue?','Tell me about shipping.','How long to delivery?','Can I return?','What colors are there?','Give me its link.','Is it in stock?','What material?','Any discount?','Where can I buy it?'];
  for (const msg of extra) {
    n = (await getResponses(page2)).length;
    await sendText(page2, msg);
    await waitBot(page2, n);
  }
  let c2 = await countConversations(newSession);
  record('F. 12+ msgs -> still 1 conversation', c2 === 1, `count=${c2}`);

  // refresh
  await page2.reload({ waitUntil: 'domcontentloaded' });
  await page2.waitForSelector(TEXT_INPUT, { timeout: 25000 });
  n = (await getResponses(page2)).length;
  await sendText(page2, 'Is it still available?');
  await waitBot(page2, n);
  let c3 = await countConversations(newSession);
  record('F. reload same session -> still 1', c3 === 1, `count=${c3}`);

  // new session again
  const ctx3 = await browser.newContext();
  const page3 = await ctx3.newPage();
  await installCapture(page3);
  await page3.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page3.waitForSelector(TEXT_INPUT, { timeout: 25000 });
  const thirdSession = await sessionOf(page3);
  record('F. second new session created', !!thirdSession && thirdSession !== newSession, `${thirdSession}`);
  n = (await getResponses(page3)).length;
  await sendText(page3, 'Hello again');
  await waitBot(page3, n);
  let c4 = await countConversations(thirdSession);
  record('F. new visitor -> 1 new conversation', c4 === 1, `count=${c4}`);
  let c2again = await countConversations(newSession);
  record('F. old session still 1 (not duplicated)', c2again === 1, `count=${c2again}`);

  await browser.close();
  console.log('\n==== FULL SUMMARY ====');
  RES.forEach(r => console.log(`${r.ok?'PASS':'FAIL'} | ${r.name} | ${r.detail}`));
  fs.writeFileSync(path.resolve('pw_report.txt'), RES.map(r => `${r.ok?'PASS':'FAIL'} | ${r.name} | ${r.detail}`).join('\n'));
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
