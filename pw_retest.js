const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE='http://localhost:3000/widget-preview-test';
const TEXT_INPUT='input:not([type=file])';
const SEND='button[aria-label="Send message"]';
const FILE_INPUT='input[type=file]';
async function main(){
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext();
  const page=await ctx.newPage();
  await page.addInitScript(()=>{window.__r=[];const o=window.fetch.bind(window);window.fetch=async(...a)=>{const r=await o(...a);try{if(String(a[0]).includes('/api/chat'))window.__r.push(await r.clone().json());}catch{}return r;};});
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForSelector(TEXT_INPUT,{timeout:25000});
  console.log('widget ready');
  async function send(file,caption){
    await page.setInputFiles(FILE_INPUT, path.resolve(file));
    await page.waitForTimeout(1500);
    const inp=page.locator(TEXT_INPUT).first();
    await inp.waitFor({state:'visible',timeout:20000});
    await inp.fill(caption);
    await page.locator(SEND).first().click();
    const before=(await page.evaluate(()=>window.__r.length));
    await page.waitForFunction((n)=>(window.__r||[]).length>n,before,{timeout:90000});
    await page.waitForTimeout(1200);
  }
  // TEST B real product photo
  await send('real_fsp1266_yellow.jpg','What is this dress?');
  const resps=await page.evaluate(()=>window.__r);
  const last=resps[resps.length-1];
  console.log('\n== REAL PRODUCT PHOTO ==');
  console.log('resp keys:',Object.keys(last||{}).join(','));
  console.log('imageMatch:',JSON.stringify(last&&last.imageMatch));
  console.log('hasProducts:',last&&last.hasProducts,'productCount:',last&&last.productCount);
  console.log('response:',String(last&&last.response||'').slice(0,300));
  const m=last&&last.imageMatch;
  if(m){console.log('MATCHTYPE:',m.matchType,'EXACT:',JSON.stringify(m.exactProduct));}
  // TEST C car no-match
  await send('test_car.png','Find this product.');
  const resps2=await page.evaluate(()=>window.__r);
  const last2=resps2[resps2.length-1];
  console.log('\n== CAR NO-MATCH ==');
  console.log('imageMatch:',JSON.stringify(last2&&last2.imageMatch));
  console.log('productCount:',last2&&last2.productCount);
  console.log('response:',String(last2&&last2.response||'').slice(0,300));
  await browser.close();
}
main().catch(e=>{console.error('FATAL',e);process.exit(1);});
