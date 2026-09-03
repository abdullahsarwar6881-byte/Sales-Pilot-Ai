const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
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
    .from('conversations').select('id', { count:'exact', head:true })
    .eq('profile_id', PROFILE).eq('visitor_session_id', sessionId);
  return error ? -1 : count;
}
const BASE='http://localhost:3000/widget-preview-test';
const TEXT_INPUT='input:not([type=file])';
const SEND='button[aria-label="Send message"]';
const RES=[];
function record(n,ok,d){RES.push({n,ok,d});console.log(`${ok?'PASS':'FAIL'} | ${n} | ${d}`);}
async function install(page){
  await page.addInitScript(()=>{ window.__r=[]; const o=window.fetch.bind(window); window.fetch=async(...a)=>{const r=await o(...a);try{if(String(a[0]).includes('/api/chat'))window.__r.push(await r.clone().json());}catch{}return r;};});
}
async function sessionOf(page){
  await page.waitForFunction(()=>{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('sales-pilot-preview-session'))return true;}return false;},{timeout:20000});
  return await page.evaluate(()=>{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('sales-pilot-preview-session'))return localStorage.getItem(k);}return null;});
}
async function sendText(page,text){
  const inp=page.locator(TEXT_INPUT).first();await inp.waitFor({state:'visible',timeout:20000});await inp.fill(text);await page.locator(SEND).first().click();
}
async function waitBot(page,before){
  await page.waitForFunction((n)=>(window.__r||[]).length>n,before,{timeout:60000});await page.waitForTimeout(800);
}
async function fresh(page){
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector(TEXT_INPUT,{timeout:25000});
}

async function main(){
  const browser=await chromium.launch({headless:true});

  // Session A
  const a=await browser.newContext();
  const pa=await a.newPage(); await install(pa); await fresh(pa);
  const sA=await sessionOf(pa);
  record('session A created',!!sA,String(sA));
  let n=(await pa.evaluate(()=>window.__r.length));
  await sendText(pa,'hi do you sell dresses'); await waitBot(pa,n);
  record('A first msg ->1 conv',(await countConversations(sA))===1,`count=${await countConversations(sA)}`);
  // 14 more messages
  const msgs=['price','shipping','return','colors','material','medium','blue','discount','stock','link','size','delivery','quality','wash'];
  for(const m of msgs){n=await pa.evaluate(()=>window.__r.length);await sendText(pa,m);await waitBot(pa,n);}
  record('A many msgs ->1 conv',(await countConversations(sA))===1,`count=${await countConversations(sA)}`);
  // reload same session
  await pa.reload({waitUntil:'domcontentloaded'}); await pa.waitForSelector(TEXT_INPUT,{timeout:25000});
  n=await pa.evaluate(()=>window.__r.length);
  await sendText(pa,'still there'); await waitBot(pa,n);
  record('A reload ->1 conv',(await countConversations(sA))===1,`count=${await countConversations(sA)}`);

  // Session B (genuinely new browser context)
  const b=await browser.newContext();
  const pb=await b.newPage(); await install(pb); await fresh(pb);
  const sB=await sessionOf(pb);
  record('session B created (new visitor)',!!sB && sB!==sA,`${sB}`);
  n=await pb.evaluate(()=>window.__r.length);
  await sendText(pb,'hello'); await waitBot(pb,n);
  record('B first msg ->1 new conv',(await countConversations(sB))===1,`count=${await countConversations(sB)}`);
  record('A still 1 (not duplicated)',(await countConversations(sA))===1,`count=${await countConversations(sA)}`);

  await browser.close();
  console.log('\n== BILLING SUMMARY ==');
  RES.forEach(r=>console.log(`${r.ok?'PASS':'FAIL'} | ${r.n} | ${r.d}`));
}
main().catch(e=>{console.error('FATAL',e);process.exit(1);});
