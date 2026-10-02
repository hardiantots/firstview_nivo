const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { load } = require('./sdd34-harness.cjs');
const request = (path, value, method = 'PUT') => new NextRequest('http://localhost' + path, { method, ...(value === undefined ? {} : { body: JSON.stringify(value) }) });

function profileFixture(broken = false) {
  const writes = [], owners = [];
  const http = load('src/shared/server/http.ts');
  const route = load('src/app/api/profile/route.ts', { '@/shared/server/http': { ...http,
    verifiedUser: async () => ({ id: 'verified-owner', email: 'owner@example.invalid' }),
    database: () => ({ from: () => ({
      upsert: async value => { writes.push(value); return { error: broken ? { details: 'PRIVATE DB ERROR' } : null }; },
      select: () => ({ eq: (field, owner) => { owners.push(owner); return { maybeSingle: async () => ({ data: { email: 'stale@example.invalid', full_name: 'Fixture' }, error: null }) }; } }),
    }) }),
  } });
  return { route, writes, owners };
}
const profile = { full_name: 'Nama Uji', phone_number: '', gender: '', date_of_birth: null, motivations: ['Keluarga'] };
test('profile: verified account and auth email override client authority; invalid dates never write', async () => {
  const f = profileFixture();
  for (const bad of [{ ...profile, user_id: 'victim' }, { ...profile, email: 'victim@example.invalid' }, { ...profile, date_of_birth: '2026-02-30' }, { ...profile, date_of_birth: '2999-01-01' }, { ...profile, motivations: [null] }]) {
    assert.equal((await f.route.PUT(request('/api/profile', bad))).status, 400);
  }
  assert.equal(f.writes.length, 0);
  assert.equal((await f.route.PUT(request('/api/profile', profile))).status, 200);
  assert.deepEqual(f.writes[0], { ...profile, user_id: 'verified-owner', email: 'owner@example.invalid' });
  const response = await f.route.GET(request('/api/profile?user_id=victim', undefined, 'GET'));
  assert.equal((await response.json()).profile.email, 'owner@example.invalid');
  assert.deepEqual(f.owners, ['verified-owner']);
});
test('profile: failed persistence cannot report success or leak details', async () => {
  const response = await profileFixture(true).route.PUT(request('/api/profile', profile));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await response.text(), /PRIVATE/);
});
test('legacy read: ownership enforced and pagination bounded without writes', async () => {
  let owner, range;
  const http = load('src/shared/server/http.ts');
  const chain = { eq: (field, value) => { owner = value; return chain; }, order: () => chain, range: async (a, b) => { range = [a, b]; return { data: Array.from({ length: 51 }, (_, i) => ({ id: String(i), date: '2026-01-01', cigarette_count: 0 })), error: null }; } };
  const route = load('src/app/api/journey/legacy/route.ts', { '@/shared/server/http': { ...http, identity: async () => 'verified-owner', database: () => ({ from: () => ({ select: () => chain }) }) } });
  assert.equal((await route.GET(request('/api/journey/legacy?offset=-1', undefined, 'GET'))).status, 400);
  const response = await route.GET(request('/api/journey/legacy?offset=50&user_id=victim', undefined, 'GET'));
  const result = await response.json();
  assert.equal(owner, 'verified-owner'); assert.deepEqual(range, [50, 100]);
  assert.equal(result.records.length, 50); assert.equal(result.nextOffset, 100);
  assert.equal(result.records[0].cigarette_count, 0);
});

async function recoveryFixture(run) {
  const old = { sessionStorage: global.sessionStorage, localStorage: global.localStorage, window: global.window };
  const store = new Map(); const storage = { setItem: (key, value) => store.set(key, value), getItem: key => store.get(key) || null, removeItem: key => store.delete(key) };
  global.sessionStorage = storage; global.localStorage = storage; global.window = { location: { origin: 'http://localhost' } };
  let verifications = 0, updates = 0, identity = 'owner';
  const result = () => ({ data: { user: { id: identity }, session: { user: { id: identity } } }, error: null });
  const recovery = load('src/shared/lib/recovery.ts', { './supabase': { supabase: { auth: {
    verifyOtp: async () => { verifications++; return result(); },
    exchangeCodeForSession: async () => result(), setSession: async () => result(),
    getSession: async () => ({ data: { session: { user: { id: identity } } } }),
    getUser: async () => ({ data: { user: { id: identity } }, error: null }),
    updateUser: async ({ password }) => { assert.ok(password.length >= 8); updates++; return { error: null }; },
  } } } });
  try { await run({ recovery, store, counts: () => ({ verifications, updates }), switchOwner: () => { identity = 'other'; } }); }
  finally { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete global[key]; else global[key] = value; } }
}
test('recovery OTP is consumed once; password is updated only on final submit', async () => recoveryFixture(async f => {
  await f.recovery.verifyRecoveryOtp('fixture@example.invalid', '123456');
  assert.deepEqual(f.counts(), { verifications: 1, updates: 0 });
  await f.recovery.prepareRecovery('http://localhost/reset-password');
  await f.recovery.updateRecoveryPassword('Synthetic-password');
  assert.deepEqual(f.counts(), { verifications: 1, updates: 1 });
  assert.equal(f.store.has('nivo.recovery'), false);
  await assert.rejects(f.recovery.updateRecoveryPassword('Synthetic-password'));
}));
test('recovery supports PKCE link, rejects account switch and expired marker', async () => recoveryFixture(async f => {
  await f.recovery.prepareRecovery('http://localhost/reset-password?code=fixture');
  f.store.set('nivo.recovery', JSON.stringify({ userId: 'owner', until: 1 }));
  await assert.rejects(f.recovery.updateRecoveryPassword('Synthetic-password'));
  await f.recovery.prepareRecovery('http://localhost/reset-password?code=fixture');
  f.switchOwner();
  await assert.rejects(f.recovery.updateRecoveryPassword('Synthetic-password'));
  assert.equal(f.counts().updates, 0);
}));
