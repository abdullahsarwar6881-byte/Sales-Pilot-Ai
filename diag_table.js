const { createClient } = require('@supabase/supabase-js');
const fs=require('fs');
function loadEnv(){let t=fs.readFileSync('.env.local','utf8').replace(/^\uFEFF/,'');const e={};for(const l of t.split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2].trim();}return e;}
const e=loadEnv();
const supabase=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
(async()=>{
  const r=await supabase.from('product_visual_embeddings').select('id').limit(1);
  console.log('product_visual_embeddings query error:', r.error ? r.error.message : 'none (table EXISTS)');
  console.log('row count sample:', Array.isArray(r.data) ? r.data.length : 0);
})();
