const fs=require('fs');
const path=require('path');
// Load the ts module via tsx/esbuild? Use ts-node? simpler: replicate logic in JS by reading the file's strategy.
// Instead, use the compiled TS through a lightweight approach: require via tsx if available.
// Let's just reimplement the key functions quickly for diagnosis by extracting logic.
const { createClient } = require('@supabase/supabase-js');
function loadEnv(){let t=fs.readFileSync('.env.local','utf8').replace(/^\uFEFF/,'');const e={};for(const l of t.split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2].trim();}return e;}
const e=loadEnv();
const supabase=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const PROFILE='3c321d7c-23e8-4101-9d30-1a2a8a0a37f9';
const visionDesc=`Women's three-piece ethnic set: long straight kurta with matching wide/straight pants and dupatta. Color: pastel lemon yellow with small white/pale-pink floral print. Distinctive features: white scalloped lace trim at round neckline, sleeve cuffs and hem; lace border on trouser hem; lightweight semi-matte fabric (appears cotton/lawn). Dupatta: coordinating light blue/white striped panel with lace edging. No visible brand, text, logo, or SKU. Suitable search keywords: yellow floral kurta set, lace-trim kurta pajama, cotton lawn ethnic dress, three-piece dupatta set.`;

// replicate extractVisionFeatures + score + aggregate quickly from multimodalMatch logic
const STOP=new Set(["the","a","an","and","or","of","with","in","on","this","that","it","is","are","was","for","to","from","by","you","your","has","have","colors","color","look","looks","product","dress","design","designs","piece","image","photo","feature","features","styles"]);
function tokenize(text){return String(text||"").toLowerCase().replace(/[^a-z0-9\s]+/g," ").split(/\s+/).filter(w=>w.length>=3&&!STOP.has(w));}
function textSim(a,b){const ta=new Set(tokenize(a)),tb=new Set(tokenize(b));if(!ta.size||!tb.size)return 0;let i=0;for(const t of ta)if(tb.has(t))i++;const u=ta.size+tb.size-i;return u?i/u:0;}
const colorMap={black:["black","noir","charcoal"],white:["white","ivory","offwhite","off-white","cream"],yellow:["yellow","yellowish","mustard","canary"],red:["red","maroon","burgundy","crimson","scarlet"],blue:["blue","navy","royal","sky","azure"],green:["green","olive","sage","emerald","mint"],pink:["pink","rose","blush","salmon","peach"],purple:["purple","plum","lavender","lilac","violet"],brown:["brown","beige","tan","camel","chocolate"],grey:["grey","gray","silver"],gold:["gold","golden"],orange:["orange","coral","amber"]};
function featuresOf(text){const lower=String(text||"").toLowerCase();const colors=[];for(const [base,variants] of Object.entries(colorMap)){if(variants.some(v=>lower.includes(v)))colors.push(base);}
const attrs=[];const pats=[["printed",/print|printed|pattern|motif/i],["embroidered",/embroider|embellish|bead|sequin/i],["unstitched",/unstitched|unstiched/i],["stitched",/\bstitched\b/i],["sleeveless",/sleeveless|no sleeve/i],["long sleeves",/long sleeve|full sleeve/i],["short sleeves",/short sleeve|elbow sleeve/i],["round neck",/round neck|crew neck/i],["v neck",/\bv.?neck/i],["high neck",/high neck|mandarin/i],["palazzo",/palazzo/i],["trouser",/trouser|pants|pyjama/i],["dupatta",/dupatta|chiffon dupatta|scarf/i],["lawn",/lawn/i],["chiffon",/chiffon/i],["cotton",/cotton/i],["silk",/silk|raw silk/i],["lace",/lace|scallop/i],["border",/border|piping|trim/i],["kurti",/kurti|kurta|kameez/i],["shirt",/shirt|top|blouse/i],["suit",/suit|outfit|ensemble/i],["winter",/winter|warm|cozy/i],["summer",/summer|lightweight|breathable/i]];
for(const [name,re] of pats){if(re.test(text)&&!attrs.includes(name))attrs.push(name);}
return {colors,attributes:attrs};}
function setSim(a,b){if(!a.length||!b.length)return 0;const sa=new Set(a),sb=new Set(b);let i=0;for(const v of sa)if(sb.has(v))i++;const u=sa.size+sb.size-i;return u?i/u:0;}
function colorSim(a,b){if(!a.length||!b.length)return 0.4;return setSim(a,b);}

const customer=featuresOf(visionDesc);
console.log('CUSTOMER colors:',customer.colors,'attrs:',customer.attributes);

(async()=>{
  const {data}=await supabase.from('knowledge_pages').select('id,title,page_url,page_type,content,user_id').eq('user_id',PROFILE).limit(1000);
  const rows=(data||[]).filter(p=>/FSP1266|fsp1266/i.test(String(p.content||'')+String(p.title||'')));
  const fsp=rows[0];
  console.log('\n=== FSP1266 product ===');
  console.log('title:',fsp&&fsp.title);
  const cat=featuresOf(fsp?String(fsp.content||fsp.title||''):'');
  console.log('CAT colors:',cat.colors,'attrs:',cat.attributes);
  const productText=(fsp?[fsp.title,fsp.content||''].join(' '):'');
  const textMatch=textSim(visionDesc,productText);
  const attrSim=setSim(customer.attributes,cat.attributes.length?cat.attributes:tokenize(productText));
  const cs=colorSim(customer.colors,cat.colors);
  const visual=Math.max(attrSim,attrSim*0.6+cs*0.4);
  const metadata=0.5*0.5+cs*0.3+Math.min(1,attrSim)*0.2; // catScore neutral 0.5 (category unknown)
  const weighted=visual*0.55+textMatch*0.2+metadata*0.25;
  console.log('textMatch:',textMatch.toFixed(3));
  console.log('attrSim:',attrSim.toFixed(3));
  console.log('colorSim:',cs.toFixed(3));
  console.log('visual:',visual.toFixed(3));
  console.log('metadata:',metadata.toFixed(3));
  console.log('WEIGHTED:',weighted.toFixed(3),'=> high>=0.68?', weighted>=0.68, ' similar>=0.36?', weighted>=0.36);
})();
