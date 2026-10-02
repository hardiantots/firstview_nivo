const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { load } = require('./sdd34-harness.cjs');
const request = (path, value, method = 'PUT') => new NextRequest('http://localhost' + path, { method, ...(value === undefined ? {} : { body: JSON.stringify(value) }) });

function profileFixture(broken = false, rpcData = { success: true, revision: 8 }) {
  const writes = [], owners = [], rpcs = [];
  const http = load('src/shared/server/http.ts');
  const route = load('src/app/api/profile/route.ts', { '@/shared/server/http': { ...http,
    verifiedUser: async () => ({ id: 'verified-owner', email: 'owner@example.invalid' }),
    database: () => ({ rpc: async (name, value) => { rpcs.push({ name, value }); return { data: rpcData, error: broken ? { details: 'PRIVATE DB ERROR' } : null }; }, from: table => ({
      upsert: async value => { writes.push(value); return { error: broken ? { details: 'PRIVATE DB ERROR' } : null }; },
      select: () => ({ eq: (field, owner) => { owners.push(owner); return { maybeSingle: async () => ({ data: table === 'nivo_journeys' ? { revision: 7, document: { timezone: 'Asia/Jakarta', ownReason: 'Alasan server' } } : { email: 'stale@example.invalid', full_name: 'Fixture' }, error: null }) }; } }),
    }) }),
  } });
  return { route, writes, owners, rpcs };
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
  assert.deepEqual(f.owners, ['verified-owner', 'verified-owner']);
});
test('profile: journey preferences validate revision and use one atomic verified-owner RPC', async () => {
  const f = profileFixture();
  const input = { full_name: ' Nama ', motivations: ['Keluarga'], own_reason: ' Alasanku ', timezone: 'Asia/Jakarta', journey_revision: 7 };
  for (const bad of [{ ...input, own_reason: 'x'.repeat(301) }, { ...input, timezone: 'unknown/zone' }, { ...input, journey_revision: -1 }, { ...input, journey_revision: undefined }, { ...input, whatsapp_consent: true }, { ...input, user_id: 'victim' }]) {
    assert.equal((await f.route.PUT(request('/api/profile', bad))).status, 400);
  }
  assert.equal(f.rpcs.length, 0); assert.equal(f.writes.length, 0);
  const response = await f.route.PUT(request('/api/profile', input));
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { success: true, journey_revision: 8 });
  assert.deepEqual(f.rpcs, [{ name: 'nivo_update_profile', value: { p_user: 'verified-owner', p_profile: { full_name: 'Nama', motivations: ['Keluarga'] }, p_expected: 7, p_own_reason: 'Alasanku', p_timezone: 'Asia/Jakarta' } }]);
  assert.equal(f.writes.length, 0);
  const read = await f.route.GET(request('/api/profile', undefined, 'GET'));
  const result = (await read.json()).profile;
  assert.equal(result.own_reason, 'Alasan server'); assert.equal(result.timezone, 'Asia/Jakarta'); assert.equal(result.journey_revision, 7);
});
test('profile: atomic conflicts do not fall back to basic profile writes or false success', async () => {
  const f = profileFixture(false, { error: 'conflict' });
  const input = { full_name: 'Nama', motivations: [], own_reason: '', journey_revision: 6 };
  const response = await f.route.PUT(request('/api/profile', input));
  assert.equal(response.status, 409); assert.equal(f.writes.length, 0);
  const unavailable = await profileFixture(true).route.PUT(request('/api/profile', input));
  assert.equal(unavailable.status, 503); assert.doesNotMatch(await unavailable.text(), /PRIVATE/);
});
test('signin return path accepts only same-app buddy token paths', () => {
  const { signInReturnPath } = load('src/shared/auth/return-path.ts');
  const valid = '/buddy/' + 'a'.repeat(43);
  assert.equal(signInReturnPath(valid), valid);
  for (const bad of [null, 'https://example.invalid', '//example.invalid', '/buddy/' + 'a'.repeat(42), valid + '?next=elsewhere', valid + '#fragment', '/home']) assert.equal(signInReturnPath(bad), '/home');
});
test('Indonesian formatting preserves calendar dates and uses 24-hour zone time', () => {
  const { formatDate, formatTime, formatRupiah } = load('src/shared/lib/format.ts');
  assert.equal(formatDate('2026-10-02', 'Pacific/Kiritimati'), '2 Okt 2026');
  assert.equal(formatTime('2026-10-02T11:00:00Z', 'Asia/Makassar'), '19:00');
  assert.match(formatRupiah(15000), /^Rp\s?15\.000$/);
});
test('profile: failed persistence cannot report success or leak details', async () => {
  const response = await profileFixture(true).route.PUT(request('/api/profile', profile));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await response.text(), /PRIVATE/);
});

test('legacy journey reasons import only missing valid selections; explicit empty and unresolved choices are preserved', async () => {
  const { journeyState } = load('src/shared/server/journey-state.ts');
  const { emptyJourney } = load('src/shared/journey/domain.ts');
  let reads = 0;
  const db = motivations => ({ from: table => ({ select: value => ({ eq: (field, owner) => ({ maybeSingle: async () => { reads++; assert.equal(table, 'user_profile'); assert.equal(value, 'motivations'); assert.equal(field, 'user_id'); assert.equal(owner, 'verified-owner'); return { data: { motivations }, error: null }; } }) }) }) });
  const old = emptyJourney(); delete old.motivations;
  assert.deepEqual((await journeyState(db([' Keluarga ']), 'verified-owner', old)).state.motivations, ['Keluarga']);
  reads = 0; assert.deepEqual((await journeyState(db(['Keluarga']), 'verified-owner', emptyJourney())).state.motivations, []); assert.equal(reads, 0);
  const unresolved = await journeyState(db(['Satu', 'Dua', 'Tiga']), 'verified-owner', old);
  assert.equal(unresolved.unresolvedReasons, true); assert.deepEqual(unresolved.state.motivations, []);
  assert.equal((await journeyState(db([]), 'verified-owner', undefined, 'Asia/Jakarta')).state.timezone, 'Asia/Jakarta');
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
