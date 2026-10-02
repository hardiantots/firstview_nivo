// Read-only preflight. Run with Node --env-file=.env.local; never prints keys or rows.
const { createClient } = require('@supabase/supabase-js');
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
async function main() {
  if (required.some(name => !process.env[name])) throw new Error('Required Supabase environment is missing');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try { await fetch(url + '/auth/v1/health', { signal: AbortSignal.timeout(12000) }); }
  catch (error) {
    const code = ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.cause?.code) ? error.cause.code : 'NETWORK_UNAVAILABLE';
    console.log(JSON.stringify({ readOnly: true, ready: false, blockedBy: code, checks: [] }, null, 2));
    process.exitCode = 1; return;
  }
  const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }) } };
  const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
  const checks = [];
  for (const [table, fields] of [
    ['user_profile', 'user_id,full_name,email,phone_number,gender,date_of_birth,motivations'],
    ['daily_consumption', 'user_id,date,cigarette_count,money_spent'],
    ['nivo_journeys', 'user_id,revision,document'],
    ['nivo_journey_operations', 'user_id,operation_id,request'],
  ]) {
    const { error } = await service.from(table).select(fields).limit(0);
    checks.push({ check: table + '.schema', passed: !error, code: error?.code || null });
    if (table.startsWith('nivo_') && !error) {
      const result = await anon.from(table).select('user_id').limit(0);
      checks.push({ check: table + '.anon-denied', passed: Boolean(result.error) });
    }
  }
  // Inspect the API schema, never invoke commit/delete RPCs on live data.
  let schema = null;
  try {
    const response = await fetch(url + '/rest/v1/', { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY }, signal: AbortSignal.timeout(12000) });
    schema = response.ok ? await response.json() : null;
  } catch { /* Report unavailable, never the response body or host. */ }
  for (const rpc of ['nivo_commit_journey', 'nivo_delete_journey']) {
    checks.push({ check: rpc + '.available', passed: Boolean(schema?.paths?.['/rpc/' + rpc]) });
  }
  let authAvailable = false;
  try {
    const auth = await fetch(url + '/auth/v1/settings', { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(12000) });
    authAvailable = auth.ok;
  } catch { /* No upstream details. */ }
  checks.push({ check: 'auth.settings', passed: authAvailable });
  console.log(JSON.stringify({ readOnly: true, checks, ready: checks.every(check => check.passed) }, null, 2));
  if (checks.some(check => !check.passed)) process.exitCode = 1;
}
main().catch(() => { console.error('Supabase read-only preflight unavailable; no credentials or upstream details are printed.'); process.exitCode = 1; });
