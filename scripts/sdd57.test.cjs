const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { load } = require('./sdd34-harness.cjs');

function fixture({ authenticated = true, broken = false } = {}) {
  const writes = [];
  const metrics = [];
  const http = load('src/shared/server/http.ts');
  const route = load('src/app/api/profile/motivations/route.ts', {
    '@/shared/server/http': { ...http,
      identity: async () => { if (!authenticated) throw new http.HttpError(401, 'Masuk kembali'); return 'verified-owner'; },
      database: () => ({ from: () => ({ upsert: async value => { writes.push(value); return { error: broken ? { message: 'SECRET upstream content' } : null }; } }) }),
    },
    '@/shared/server/telemetry': { recordOperation: (...args) => metrics.push(args) },
  });
  return { writes, metrics, post: value => route.POST(new NextRequest('http://localhost/api/profile/motivations', {
    method: 'POST', body: typeof value === 'string' ? value : JSON.stringify(value),
  })) };
}

test('motivations: verified owner only; rejected input never writes', async () => {
  const f = fixture();
  for (const value of ['{', { motivations: [3] }, { motivations: [' '] }, { motivations: ['x'.repeat(201)] }, { motivations: Array(11).fill('x') }, { motivations: [], user_id: 'victim' }]) {
    assert.equal((await f.post(value)).status, 400);
  }
  assert.equal((await f.post('x'.repeat(8193))).status, 413);
  assert.equal(f.writes.length, 0);
  assert.equal((await f.post({ motivations: [' keluarga '] })).status, 200);
  assert.deepEqual(f.writes, [{ user_id: 'verified-owner', motivations: ['keluarga'] }]);
  const denied = fixture({ authenticated: false });
  assert.equal((await denied.post({ motivations: [] })).status, 401);
  assert.equal(denied.writes.length, 0);
});

test('motivations: persistence errors are private and responses cannot be cached', async () => {
  const f = fixture({ broken: true });
  const response = await f.post({ motivations: ['private motivation'] });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await response.text(), /SECRET|upstream|private motivation/);
  assert.equal(f.metrics[0][1], 503);
});

test('operational metrics expose only coarse outcome and latency, with opt-in', () => {
  const { recordOperation } = load('src/shared/server/telemetry.ts');
  const previous = process.env.NIVO_OPERATIONAL_METRICS;
  const original = console.info;
  const output = [];
  try {
    console.info = line => output.push(JSON.parse(line));
    delete process.env.NIVO_OPERATIONAL_METRICS;
    recordOperation('profile.motivations', 200, 45);
    assert.equal(output.length, 0);
    process.env.NIVO_OPERATIONAL_METRICS = 'true';
    recordOperation('profile.motivations', 503, 12345);
    assert.deepEqual(output, [{ event: 'nivo.operation.v1', operation: 'profile.motivations', outcome: 'unavailable', latency: 'gte5s' }]);
  } finally {
    console.info = original;
    if (previous === undefined) delete process.env.NIVO_OPERATIONAL_METRICS;
    else process.env.NIVO_OPERATIONAL_METRICS = previous;
  }
});
