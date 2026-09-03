const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
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
(async () => {
  const { data, error } = await supabase.from('conversations').select('id, visitor_session_id, profile_id, created_at, last_message').eq('profile_id', PROFILE).order('created_at', { ascending:false }).limit(20);
  console.log('ERROR:', error ? JSON.stringify(error) : 'none');
  console.log('COUNT:', Array.isArray(data) ? data.length : 0);
  (Array.isArray(data)?data:[]).forEach(c => {
    console.log(c.id, '|', c.visitor_session_id, '|', c.created_at, '|', String(c.last_message||'').slice(0,40));
  });
})();
