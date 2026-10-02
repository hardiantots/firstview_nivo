const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createECDH, randomBytes } = require('node:crypto');
const { NextRequest } = require('next/server');
const { load } = require('./sdd34-harness.cjs');
const endpointHelpers = load('src/shared/push/endpoint.ts');
const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
const publicKey = ecdh.getPublicKey().toString('base64url'), privateKey = ecdh.getPrivateKey().toString('base64url'), auth = randomBytes(16).toString('base64url');
const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/fixture-device', expirationTime: null, keys: { p256dh: publicKey, auth } };
const env = { NIVO_PUSH_READY: 'true', NIVO_VAPID_PUBLIC_KEY: publicKey, NIVO_VAPID_PRIVATE_KEY: privateKey, NIVO_VAPID_SUBJECT: 'mailto:fixture@example.invalid', NIVO_PUSH_CRON_SECRET: 'fixture-cron-secret-only-for-testing' };

function apiFixture({ existingOwner, consent = true, unavailable = false, denied = false } = {}) {
  const writes = [], reads = [];
  const http = load('src/shared/server/http.ts');
  const database = () => ({ from: table => {
    const filters = [], operation = { table, filters }; let mutation = false;
    const result = () => ({ data: mutation ? { id: 'stored-id' } : table === 'nivo_journeys' ? { document: { preferences: { enabled: consent, consent } } } : existingOwner ? { id: 'stored-id', user_id: existingOwner } : null, error: unavailable ? { detail: 'PRIVATE ENDPOINT DETAILS' } : null });
    const chain = {
      select: fields => { reads.push({ table, fields, filters }); return chain; },
      eq: (field, value) => { filters.push([field, value]); return chain; },
      maybeSingle: async () => result(), single: async () => result(),
      limit: async () => ({ data: existingOwner === 'owner' ? [{ id: 'stored-id' }] : [], error: unavailable ? {} : null }),
      insert: value => { mutation = true; writes.push({ ...operation, type: 'insert', value }); return chain; },
      update: value => { mutation = true; writes.push({ ...operation, type: 'update', value }); return chain; },
      delete: () => { writes.push({ ...operation, type: 'delete' }); return chain; },
      then: (resolve, reject) => Promise.resolve({ error: unavailable ? {} : null }).then(resolve, reject),
    }; return chain;
  } });
  const route = load('src/app/api/push/subscriptions/route.ts', { '@/shared/server/http': { ...http, database, verifiedUser: async () => { if (denied) throw new http.HttpError(401, 'Masuk lagi'); return { id: 'owner' }; } } });
  return { route, writes, reads };
}
const request = (method, value) => new NextRequest('http://localhost/api/push/subscriptions', { method, headers: { Authorization: 'Bearer fixture' }, ...(method === 'GET' ? {} : { body: typeof value === 'string' ? value : JSON.stringify(value) }) });
async function withEnv(run) {
  const saved = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  try { await run(); } finally { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
}

test('push endpoint and keys reject SSRF destinations, credentials, redirects and malformed material', () => {
  assert.equal(endpointHelpers.allowedPushEndpoint(subscription.endpoint), true);
  for (const endpoint of ['http://fcm.googleapis.com/x', 'https://127.0.0.1/x', 'https://localhost/x', 'https://fcm.googleapis.com.evil.invalid/x', 'https://user:secret@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x', 'https://fcm.googleapis.com/x#secret', 'https://[::1]/x', 'https://evil.notify.windows.com/x']) assert.equal(endpointHelpers.allowedPushEndpoint(endpoint), false);
  assert.equal(endpointHelpers.validPushKey(publicKey, 'public'), true);
  assert.equal(endpointHelpers.validPushKey(auth, 'auth'), true);
  assert.equal(endpointHelpers.validPushKey(privateKey, 'private'), true);
  assert.equal(endpointHelpers.validPushKey(auth, 'public'), false);
});

test('push API verifies owner and saved consent; invalid input never writes', () => withEnv(async () => {
  const f = apiFixture();
  for (const bad of ['{', { ...subscription, user_id: 'victim' }, { ...subscription, endpoint: 'https://localhost/private' }, { ...subscription, keys: { p256dh: 'invalid', auth } }, { ...subscription, keys: { ...subscription.keys, privateKey } }]) assert.equal((await f.route.POST(request('POST', bad))).status, 400);
  assert.equal(f.writes.length, 0);
  assert.equal((await apiFixture({ denied: true }).route.POST(request('POST', subscription))).status, 401);
  assert.equal((await apiFixture({ consent: false }).route.POST(request('POST', subscription))).status, 403);
  assert.equal((await f.route.POST(request('POST', subscription))).status, 200);
  assert.equal(f.writes[0].type, 'insert'); assert.equal(f.writes[0].value.user_id, 'owner');
  assert.ok(f.reads.some(read => read.table === 'nivo_journeys' && read.filters.some(([field, value]) => field === 'user_id' && value === 'owner')));
}));

test('push API never reassigns another owner endpoint and mutations remain owner guarded', () => withEnv(async () => {
  const other = apiFixture({ existingOwner: 'victim' });
  assert.equal((await other.route.POST(request('POST', subscription))).status, 409); assert.equal(other.writes.length, 0);
  const own = apiFixture({ existingOwner: 'owner' });
  assert.equal((await own.route.POST(request('POST', subscription))).status, 200);
  assert.deepEqual(own.writes[0].filters, [['id', 'stored-id'], ['user_id', 'owner']]);
  assert.equal((await own.route.DELETE(request('DELETE', {}))).status, 200);
  assert.deepEqual(own.writes[1].filters, [['user_id', 'owner']]);
  assert.equal((await own.route.DELETE(request('DELETE', { endpoint: subscription.endpoint }))).status, 200);
  assert.deepEqual(own.writes[2].filters, [['user_id', 'owner'], ['endpoint', subscription.endpoint]]);
  assert.equal((await own.route.DELETE(request('DELETE', { user_id: 'victim' }))).status, 400);
}));

test('push readiness exposes only public VAPID material and disabled configuration cannot register', () => withEnv(async () => {
  const f = apiFixture({ existingOwner: 'owner' });
  const response = await f.route.GET(request('GET'));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json(); assert.deepEqual(result, { configured: true, subscribed: true, publicKey });
  assert.equal(JSON.stringify(result).includes(privateKey), false); assert.equal(JSON.stringify(result).includes(env.NIVO_PUSH_CRON_SECRET), false);
  delete process.env.NIVO_VAPID_PRIVATE_KEY;
  assert.deepEqual(await (await f.route.GET(request('GET'))).json(), { configured: false, subscribed: false, publicKey: null });
  assert.equal((await f.route.POST(request('POST', subscription))).status, 503);
  assert.equal(f.writes.length, 0);
  const error = await apiFixture({ unavailable: true }).route.DELETE(request('DELETE', {}));
  assert.equal(error.status, 503); assert.doesNotMatch(await error.text(), /PRIVATE/);
}));

function workerFixture({ active = true, fresh = true, status = 201, invalidEndpoint = false } = {}) {
  const events = [], writes = [], sends = [];
  const { createPushHandler } = load('supabase/functions/nivo-push/handler.ts', { '../../../src/shared/push/endpoint.ts': endpointHelpers });
  let claimed = false;
  const handler = createPushHandler({
    env: name => env[name],
    store: () => ({
      claim: async () => { events.push('claim'); if (claimed) return []; claimed = true; return [{ id: 'delivery-1', user_id: 'owner', subscriptions: [{ id: 'device-1' }] }]; },
      subscription: async (id, owner) => { events.push('device'); assert.equal(owner, 'owner'); return fresh ? { id, user_id: owner, endpoint: invalidEndpoint ? 'https://localhost/private' : subscription.endpoint, p256dh: publicKey, auth, enabled: true } : null; },
      active: async () => { events.push('active'); return active; },
      remove: async (id, owner) => writes.push({ type: 'remove', id, owner }),
      finish: async (id, delivered) => writes.push({ type: 'finish', id, delivered }),
    }),
    send: async (value, payload) => { events.push('send'); sends.push({ value, payload }); return status; },
  });
  return { handler, events, writes, sends };
}
const cronRequest = secret => new Request('https://fixture.invalid/functions/v1/nivo-push', { method: 'POST', headers: { 'x-nivo-cron-secret': secret === undefined ? env.NIVO_PUSH_CRON_SECRET : secret } });

test('push worker custom authentication rejects before accessing the database', async () => {
  const f = workerFixture();
  assert.equal((await f.handler(cronRequest('wrong'))).status, 401);
  assert.equal((await f.handler(new Request('https://fixture.invalid'))).status, 405);
  assert.equal(f.events.length, 0);
});
test('push worker checks current device ownership and latest preferences immediately before sending', async () => {
  const f = workerFixture();
  assert.equal((await f.handler(cronRequest())).status, 200);
  assert.deepEqual(f.events, ['claim', 'device', 'active', 'send']);
  assert.deepEqual(JSON.parse(f.sends[0].payload), { tag: 'delivery-1', url: '/notifications' });
  assert.deepEqual(f.writes, [{ type: 'finish', id: 'delivery-1', delivered: 1 }]);
  await f.handler(cronRequest()); assert.equal(f.sends.length, 1);
  for (const config of [{ active: false }, { fresh: false }, { invalidEndpoint: true }]) { const blocked = workerFixture(config); await blocked.handler(cronRequest()); assert.equal(blocked.sends.length, 0); }
});
test('push worker removes only expired devices; transient failures never pretend to be delivered', async () => {
  for (const status of [404, 410]) {
    const expired = workerFixture({ status }); await expired.handler(cronRequest());
    assert.deepEqual(expired.writes, [{ type: 'remove', id: 'device-1', owner: 'owner' }, { type: 'finish', id: 'delivery-1', delivered: 0 }]);
  }
  const transient = workerFixture({ status: 500 }); await transient.handler(cronRequest());
  assert.deepEqual(transient.writes, [{ type: 'finish', id: 'delivery-1', delivered: 0 }]);
});
test('PWA never caches private API/pages/media; notifications stay neutral and point inside NIVO', async () => {
  const listeners = {}, notifications = [], cached = [];
  const context = { URL, Promise, Response, fetch: async () => new Response('network'), caches: { open: async () => ({ match: async () => null, put: async (...value) => cached.push(value), keys: async () => [], addAll: async () => {} }), match: async () => new Response('offline'), keys: async () => [] }, self: { location: { origin: 'https://fixture.invalid' }, addEventListener: (name, fn) => { listeners[name] = fn; }, registration: { showNotification: async (...value) => notifications.push(value) } } };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), context);
  for (const path of ['/api/profile', '/api/journey', '/private-media/audio.mp3']) {
    let intercepted = false; listeners.fetch({ request: { method: 'GET', mode: 'cors', url: 'https://fixture.invalid' + path }, respondWith: () => { intercepted = true; } }); assert.equal(intercepted, false);
  }
  let navigation; listeners.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://fixture.invalid/profile-settings' }, respondWith: promise => { navigation = promise; } }); await navigation; assert.equal(cached.length, 0);
  let push; listeners.push({ data: { json: () => ({ body: 'PRIVATE HEALTH REASON', url: 'https://evil.invalid', tag: 'safe-id' }) }, waitUntil: promise => { push = promise; } }); await push;
  assert.equal(notifications[0][0], 'NIVO'); assert.equal(notifications[0][1].data.url, '/notifications'); assert.equal(JSON.stringify(notifications).includes('PRIVATE HEALTH'), false);
});
