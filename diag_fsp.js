const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
function loadEnv(){let t=fs.readFileSync('.env.local','utf8').replace(/^\uFEFF/,'');const e={};for(const l of t.split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2].trim();}return e;}
const e=loadEnv();
const supabase=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const PROFILE='3c321d7c-23e8-4101-9d30-1a2a8a0a37f9';
(async()=>{
  const {data,error}=await supabase.from('knowledge_pages').select('id,title,page_url,page_type,content').eq('user_id',PROFILE).limit(1000);
  const rows=(data||[]).filter(p=>/FSP1266|fsp1266/i.test(String(p.content||'')+String(p.title||'')));
  console.log('MATCHING ROWS',rows.length);
  rows.forEach(p=>{
    console.log('====');
    console.log('ID:',p.id);
    console.log('TITLE:',p.title);
    console.log('URL:',p.page_url);
    console.log('TYPE:',p.page_type);
    const c=String(p.content||'');
    console.log('CONTENT-LEN:',c.length);
    console.log('CONTENT:',c.slice(0,1500));
  });
})();
