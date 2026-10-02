const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { createHash } = require('node:crypto');
const { load } = require('./sdd34-harness.cjs');
const http = load('src/shared/server/http.ts');
const token = 'a'.repeat(43), id = '00000000-0000-4000-8000-000000000001';
function fixture({ authenticated = true, rpcError = null, revoked = false, expired = false, owned = false, accepted = false, actor = 'verified-buddy' } = {}) {
  const calls = [];
  const chain = table => {
    const query = {
      select: value => { calls.push(['select', table, value]); return query; },
      eq: (field, value) => { calls.push(['eq', table, field, value]); return query; },
      is: (field, value) => { calls.push(['is', table, field, value]); return query; },
      gt: (field, value) => { calls.push(['gt', table, field, value]); return query; },
      update: value => { calls.push(['update', table, value]); return query; },
      maybeSingle: async () => ({ data: { user_id: owned ? actor : 'verified-owner', share_metrics: ['total_smoke_free_days'], expires_at: expired ? '2000-01-01T00:00:00Z' : '2099-01-01T00:00:00Z', revoked_at: revoked ? new Date().toISOString() : null, accepted_by: accepted ? actor : null }, error: null }),
      then: (resolve, reject) => Promise.resolve({ data: table === 'nivo_buddy_links' ? [{ id, share_metrics: ['total_smoke_free_days'] }] : [{ id }], error: null }).then(resolve, reject),
    };
    return query;
  };
  const route = load('src/app/api/buddy/route.ts', { '@/shared/server/http': { ...http,
    identity: async () => { if (!authenticated) throw new http.HttpError(401, 'Masuk kembali'); return actor; },
    database: () => ({ from: chain, rpc: async (name, args) => { calls.push(['rpc', name, args]); return { data: rpcError ? { error: rpcError } : name === 'nivo_create_buddy_invite' ? { id, expires_at: '2099-01-01' } : name === 'nivo_accept_buddy' ? { link_id: id } : name === 'nivo_revoke_buddy' ? true : { total_smoke_free_days: 7, days_logged_7: 5, secret_note: 'private note', user_id: 'private id' }, error: null }; } }),
  } });
  const request = (method, value, query = '') => new NextRequest('http://localhost/api/buddy' + query, { method, ...(value ? { body: JSON.stringify(value) } : {}) });
  return { calls, get: query => route.GET(request('GET', null, query)), post: value => route.POST(request('POST', value)), remove: value => route.DELETE(request('DELETE', value)) };
}
test('buddy invite requires explicit consent and whitelist; stores only random token hash for verified owner', async () => {
  const f = fixture();
  for (const bad of [{ type: 'invite', consent: false, metrics: ['total_smoke_free_days'] }, { type: 'invite', consent: true, metrics: ['notes'] }, { type: 'invite', consent: true, metrics: [] }, { type: 'invite', consent: true, metrics: ['days_logged_7', 'days_logged_7'] }, { type: 'invite', consent: true, metrics: ['days_logged_7'], user_id: 'victim' }]) assert.equal((await f.post(bad)).status, 400);
  assert.equal(f.calls.length, 0);
  const response = await f.post({ type: 'invite', consent: true, metrics: ['total_smoke_free_days'] });
  assert.equal(response.status, 201); assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json(), raw = result.path.split('/').at(-1), args = f.calls[0][2];
  assert.match(raw, /^[A-Za-z0-9_-]{43}$/); assert.equal(args.p_user, 'verified-buddy');
  assert.equal(args.p_token_hash, createHash('sha256').update(raw).digest('hex')); assert.equal(JSON.stringify(f.calls).includes(raw), false);
  assert.equal((await fixture({ rpcError: 'active_buddy' }).post({ type: 'invite', consent: true, metrics: ['days_logged_7'] })).status, 409);
  assert.equal((await fixture({ authenticated: false }).post({ type: 'invite', consent: true, metrics: ['days_logged_7'] })).status, 401);
});
test('buddy preview denies own/revoked/expired/consumed invites without exposing identity or notes', async () => {
  for (const option of [{ owned: true }, { revoked: true }, { expired: true }, { accepted: true }]) assert.equal((await fixture(option).get('?token=' + token)).status, 404);
  const f = fixture(), response = await f.get('?token=' + token), result = await response.json();
  assert.deepEqual(result.metrics, ['total_smoke_free_days']); assert.deepEqual(Object.keys(result), ['metrics', 'expires_at']);
  assert.ok(f.calls.some(call => call[0] === 'eq' && call[2] === 'token_hash' && call[3] === createHash('sha256').update(token).digest('hex')));
  assert.equal((await fixture().get('?token=bad')).status, 400);
});
test('buddy accept/revoke RPCs derive actor from verified session and forbid client owner overrides', async () => {
  const f = fixture();
  assert.equal((await f.post({ type: 'accept', consent: false, token })).status, 400);
  assert.equal((await f.post({ type: 'accept', consent: true, token, p_buddy: 'victim' })).status, 400);
  assert.equal((await f.post({ type: 'accept', consent: true, token })).status, 200);
  assert.equal(f.calls[0][2].p_buddy, 'verified-buddy');
  assert.equal((await fixture({ rpcError: 'unavailable' }).post({ type: 'accept', consent: true, token })).status, 404);
  assert.equal((await f.remove({ kind: 'link', id })).status, 200);
  assert.deepEqual(f.calls.at(-1), ['rpc', 'nivo_revoke_buddy', { p_actor: 'verified-buddy', p_link: id }]);
  assert.equal((await f.remove({ kind: 'invite', id })).status, 200);
  assert.ok(f.calls.some(call => call[0] === 'eq' && call[2] === 'user_id' && call[3] === 'verified-buddy'));
});
test('buddy summaries are owner filtered and strip fields outside explicit shared numeric metrics', async () => {
  const f = fixture(), response = await f.get(''), result = await response.json();
  assert.deepEqual(result.receiving, [{ id, metrics: { total_smoke_free_days: 7 } }]);
  assert.doesNotMatch(JSON.stringify(result), /private note|private id|secret_note/);
  assert.ok(f.calls.filter(call => call[0] === 'eq' && ['user_id', 'buddy_id'].includes(call[2])).every(call => call[3] === 'verified-buddy'));
  assert.ok(f.calls.some(call => call[0] === 'rpc' && call[1] === 'nivo_buddy_summary' && call[2].p_actor === 'verified-buddy'));
});
