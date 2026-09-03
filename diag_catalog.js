const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
function loadEnv() {
  let txt = fs.readFileSync('.env.local','utf8');
  txt = txt.replace(/^\uFEFF/, '');
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const pid = '3c321d7c-23e8-4101-9d30-1a2a8a0a37f9';
const supabase = createClient(url, key, { auth: { autoRefreshToken:false, persistSession:false } });
(async () => {
  const { data, error } = await supabase
    .from('knowledge_pages')
    .select('id, user_id, title, page_url, page_type, content')
    .eq('user_id', pid)
    .limit(1000);
  console.log('ERROR:', error ? error.message : 'none');
  console.log('COUNT:', Array.isArray(data) ? data.length : 0);
  const list = Array.isArray(data) ? data : [];
  list.forEach((p, i) => {
    const c = String(p.content || '');
    const m = c.match(/FSP1266[^\s"\'<>]*/i);
    console.log(i, '|', p.page_type, '|', String(p.title).slice(0,60), '| FSP:', m ? m[0] : (c.includes('yellow') ? 'YELLOW?' : '-'));
  });
})();
