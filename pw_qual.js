const { chromium } = require('playwright');
const path=require('path');
const BASE='http://localhost:3000/widget-preview-test';
const TEXT_INPUT='input:not([type=file])';
const SEND='button[aria-label="Send message"]';
async function main(){
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext();
  const page=await ctx.newPage();
  await page.addInitScript(()=>{window.__r=[];const o=window.fetch.bind(window);window.fetch=async(...a)=>{const r=await o(...a);try{if(String(a[0]).includes('/api/chat'))window.__r.push(await r.clone().json());}catch{}return r;};});
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector(TEXT_INPUT,{timeout:25000});
  async function txt(m){const inp=page.locator(TEXT_INPUT).first();await inp.waitFor({state:'visible',timeout:20000});await inp.fill(m);await page.locator(SEND).first().click();const b=await page.evaluate(()=>window.__r.length);await page.waitForFunction((n)=>(window.__r||[]).length>n,b,{timeout:60000});await page.waitForTimeout(800);}
  // quality
  await txt('How is the quality of your dresses?');
  let resps=await page.evaluate(()=>window.__r);
  console.log('== QUALITY ==');
  console.log('FULL RESPONSE:',String(resps[resps.length-1]?.response||resps[resps.length-1]?.message||''));
  await browser.close();
}
main().catch(e=>{console.error('FATAL',e);process.exit(1);});
