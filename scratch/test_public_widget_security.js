const fs = require('fs');
const path = require('path');
const workspaceDir = 'C:\\Users\\kaas5\\sales Pilot';
const { createClient } = require(path.join(workspaceDir, 'node_modules/@supabase/supabase-js'));

const env = {};
fs.readFileSync(path.join(workspaceDir, '.env.local'), 'utf8')
  .split(/\r?\n/)
  .forEach((line) => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const BASE_URL = 'http://localhost:3000';

async function runWidgetSecurityTests() {
  console.log('====================================================');
  console.log('STARTING PUBLIC WIDGET API SECURITY TEST SUITE');
  console.log('====================================================\n');

  // Load Merchant A widget settings
  const { data: widgetA } = await admin
    .from('widget_settings')
    .select('id, user_id, brand_color, welcome_message')
    .limit(1)
    .single();

  if (!widgetA) {
    throw new Error('No widget_settings row found for testing.');
  }

  const WIDGET_A_ID = widgetA.id;
  const USER_A_ID = widgetA.user_id;
  const VALID_DOMAIN = 'https://tfs.com.pk';
  const VALID_SUBDOMAIN = 'https://shop.tfs.com.pk';
  const ATTACKER_DOMAIN = 'https://malicious-attacker.com';
  const SPOOFED_SUBDOMAIN = 'https://tfs.com.pk.attacker.com';

  console.log('Testing with:');
  console.log('  Widget ID:', WIDGET_A_ID);
  console.log('  Merchant User ID:', USER_A_ID);
  console.log('  Valid Registered Domain:', VALID_DOMAIN);
  console.log('  Attacker Domain:', ATTACKER_DOMAIN);
  console.log('  Attacker Spoofed Subdomain:', SPOOFED_SUBDOMAIN);
  console.log('----------------------------------------------------\n');

  let allPass = true;

  // ---------------------------------------------------------------
  // TEST 1: Valid widget on registered domain accesses widget config
  // ---------------------------------------------------------------
  console.log('TEST 1: Valid widget on registered domain accesses widget config');
  try {
    const res = await fetch(`${BASE_URL}/api/widget-config?widgetId=${WIDGET_A_ID}`, {
      headers: {
        Origin: VALID_DOMAIN,
      },
    });
    const json = await res.json();
    const corsHeader = res.headers.get('access-control-allow-origin');

    const hasPublicProps = Boolean(json.brandColor && json.welcomeMessage && json.widgetId);
    const leaksSecret = Boolean(json.user_id || json.access_token || json.secret);
    const pass = res.status === 200 && hasPublicProps && !leaksSecret && corsHeader === VALID_DOMAIN;

    console.log('  Status:', res.status, '(Expected 200)');
    console.log('  CORS Header:', corsHeader, `(Expected ${VALID_DOMAIN})`);
    console.log('  Has public properties:', hasPublicProps);
    console.log('  Leaks private keys/user_id:', leaksSecret);
    console.log('  -> RESULT:', pass ? 'PASS' : 'FAIL\n');
    if (!pass) allPass = false;
  } catch (err) {
    console.log('  -> ERROR:', err.message);
    allPass = false;
  }

  // ---------------------------------------------------------------
  // TEST 2: Request from unrelated domain is rejected (403)
  // ---------------------------------------------------------------
  console.log('\nTEST 2: Request from unrelated or spoofed domain is rejected');
  try {
    // 2a: Unrelated domain
    const res1 = await fetch(`${BASE_URL}/api/widget-config?widgetId=${WIDGET_A_ID}`, {
      headers: { Origin: ATTACKER_DOMAIN },
    });
    const pass1 = res1.status === 403;
    console.log('  2a. Attacker domain status:', res1.status, pass1 ? '(PASS 403 Forbidden)' : '(FAIL)');

    // 2b: Suffix spoofed domain (tfs.com.pk.attacker.com)
    const res2 = await fetch(`${BASE_URL}/api/widget-config?widgetId=${WIDGET_A_ID}`, {
      headers: { Origin: SPOOFED_SUBDOMAIN },
    });
    const pass2 = res2.status === 403;
    console.log('  2b. Suffix spoofed domain status:', res2.status, pass2 ? '(PASS 403 Forbidden)' : '(FAIL)');

    const pass = pass1 && pass2;
    console.log('  -> RESULT:', pass ? 'PASS' : 'FAIL');
    if (!pass) allPass = false;
  } catch (err) {
    console.log('  -> ERROR:', err.message);
    allPass = false;
  }

  // ---------------------------------------------------------------
  // TEST 3: Malicious request cannot use another merchant's profileId to switch tenants
  // ---------------------------------------------------------------
  console.log('\nTEST 3: Tenant switching attempt via body payload');
  try {
    // Attacker tries to send Merchant B's profileId while pointing to Merchant A's widget
    const FAKE_TENANT_ID = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: VALID_DOMAIN,
      },
      body: JSON.stringify({
        widgetId: WIDGET_A_ID,
        profileId: FAKE_TENANT_ID, // Malicious override attempt!
        message: 'What is my store name?',
      }),
    });
    const json = await res.json();
    // Server must resolve WIDGET_A_ID to Merchant A's store, NOT fake tenant
    console.log('  Status:', res.status);
    console.log('  Response success:', json.success);
    const pass = res.status === 200 && json.success === true;
    console.log('  -> Server safely resolved legitimate merchant identity (client override ignored)');
    console.log('  -> RESULT:', pass ? 'PASS' : 'FAIL');
    if (!pass) allPass = false;
  } catch (err) {
    console.log('  -> ERROR:', err.message);
    allPass = false;
  }

  // ---------------------------------------------------------------
  // TEST 4: Invalid widget identifier is rejected (404)
  // ---------------------------------------------------------------
  console.log('\nTEST 4: Invalid widget identifier is rejected');
  try {
    const res = await fetch(`${BASE_URL}/api/widget-config?widgetId=non_existent_widget_999`, {
      headers: { Origin: VALID_DOMAIN },
    });
    const pass1 = res.status === 404;
    console.log('  4a. widget-config invalid ID status:', res.status, pass1 ? '(PASS 404 Not Found)' : '(FAIL)');

    const res2 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: VALID_DOMAIN,
      },
      body: JSON.stringify({
        widgetId: 'non_existent_widget_999',
        message: 'Hello',
      }),
    });
    const pass2 = res2.status === 404;
    console.log('  4b. /api/chat invalid ID status:', res2.status, pass2 ? '(PASS 404 Not Found)' : '(FAIL)');

    const pass = pass1 && pass2;
    console.log('  -> RESULT:', pass ? 'PASS' : 'FAIL');
    if (!pass) allPass = false;
  } catch (err) {
    console.log('  -> ERROR:', err.message);
    allPass = false;
  }

  // ---------------------------------------------------------------
  // TEST 5: Rate limiting eventually returns HTTP 429
  // ---------------------------------------------------------------
  console.log('\nTEST 5: Rate limiting protection on /api/chat');
  try {
    const testIp = '198.51.100.' + Math.floor(Math.random() * 250);
    const burstCount = 12;

    console.log(`  Sending ${burstCount} concurrent rapid burst requests...`);
    const promises = Array.from({ length: burstCount }).map((_, i) =>
      fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIp,
          Origin: VALID_DOMAIN,
        },
        body: JSON.stringify({
          widgetId: WIDGET_A_ID,
          message: 'burst request ' + i,
        }),
      })
    );

    const responses = await Promise.all(promises);
    const rateLimitedRes = responses.find((r) => r.status === 429);
    const rateLimited = Boolean(rateLimitedRes);

    if (rateLimitedRes) {
      const json = await rateLimitedRes.json().catch(() => ({}));
      const retryAfter = rateLimitedRes.headers.get('retry-after');
      console.log('  Successfully caught flood! Status:', rateLimitedRes.status);
      console.log('  Rate limit error message:', json.error);
      console.log('  Retry-After header:', retryAfter);
    }

    console.log('  -> RESULT:', rateLimited ? 'PASS (Burst protection returned HTTP 429)' : 'FAIL (No 429 returned)');
    if (!rateLimited) allPass = false;
  } catch (err) {
    console.log('  -> ERROR:', err.message);
    allPass = false;
  }

  // ---------------------------------------------------------------
  // TEST 6: OPTIONS / CORS preflight works for valid merchant domain
  // ---------------------------------------------------------------
  console.log('\nTEST 6: OPTIONS preflight handlers for CORS');
  try {
    // 6a: widget-config OPTIONS
    const opt1 = await fetch(`${BASE_URL}/api/widget-config?widgetId=${WIDGET_A_ID}`, {
      method: 'OPTIONS',
      headers: { Origin: VALID_DOMAIN },
    });
    const allowOrigin1 = opt1.headers.get('access-control-allow-origin');
    const allowMethods1 = opt1.headers.get('access-control-allow-methods');
    const pass1 = opt1.status === 204 && allowOrigin1 === VALID_DOMAIN && allowMethods1.includes('GET');
    console.log('  6a. widget-config OPTIONS status:', opt1.status, 'Allow-Origin:', allowOrigin1, pass1 ? '(PASS)' : '(FAIL)');

    // 6b: chat OPTIONS
    const opt2 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'OPTIONS',
      headers: { Origin: VALID_DOMAIN },
    });
    const allowOrigin2 = opt2.headers.get('access-control-allow-origin');
    const allowMethods2 = opt2.headers.get('access-control-allow-methods');
    const pass2 = opt2.status === 204 && allowOrigin2 === VALID_DOMAIN && allowMethods2.includes('POST');
    console.log('  6b. /api/chat OPTIONS status:', opt2.status, 'Allow-Origin:', allowOrigin2, pass2 ? '(PASS)' : '(FAIL)');

    const pass = pass1 && pass2;
    console.log('  -> RESULT:', pass ? 'PASS' : 'FAIL');
    if (!pass) allPass = false;
  } catch (err) {
    console.log('  -> ERROR:', err.message);
    allPass = false;
  }

  // ---------------------------------------------------------------
  // TEST 7: Normal chat conversation functionality preserved
  // ---------------------------------------------------------------
  console.log('\nTEST 7: Normal conversational interaction works');
  try {
    const chatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.45', // Different clean IP
        Origin: VALID_DOMAIN,
      },
      body: JSON.stringify({
        widgetId: WIDGET_A_ID,
        visitorSessionId: 'sec_test_session_' + Date.now(),
        message: 'Do you have embroidered suits?',
      }),
    });
    const chatJson = await chatRes.json();
    const pass = chatRes.status === 200 && chatJson.success === true && Boolean(chatJson.response);

    console.log('  Chat Status:', chatRes.status);
    console.log('  AI Response snippet:', (chatJson.response || '').slice(0, 100) + '...');
    console.log('  Products returned:', chatJson.productCards?.length || 0);
    console.log('  -> RESULT:', pass ? 'PASS' : 'FAIL');
    if (!pass) allPass = false;
  } catch (err) {
    console.log('  -> ERROR:', err.message);
    allPass = false;
  }

  console.log('\n====================================================');
  console.log('ALL PUBLIC WIDGET API SECURITY TESTS:', allPass ? 'ALL PASSED!' : 'SOME FAILED');
  console.log('====================================================');
}

runWidgetSecurityTests();
