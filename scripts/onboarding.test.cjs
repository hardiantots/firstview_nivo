const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { load } = require('./sdd34-harness.cjs');
const { emptyJourney, reduceJourney } = load('src/shared/journey/domain.ts');
const { needsJourneySetup } = load('src/shared/journey/onboarding.ts');
const { shouldCheckJourneySetup } = load('src/shared/auth/routes.ts');

test('new and partially configured journeys require setup until motivation and a plan exist', () => {
  const initial = emptyJourney();
  assert.equal(needsJourneySetup(initial), true);
  initial.baselines.push({ cigarettesPerDay: 10 });
  assert.equal(needsJourneySetup(initial), true);
  for (const plan of [
    { targetQuitDate: '2026-11-01' },
    { actualQuitDate: '2026-10-01' },
    { reduceFirst: true },
  ]) {
    assert.equal(needsJourneySetup({ ...initial, ...plan }), true);
    assert.equal(needsJourneySetup({ ...initial, ...plan, motivations: ['Kesehatan'] }), false);
    assert.equal(needsJourneySetup({ ...initial, ...plan, ownReason: 'Untuk keluarga' }), false);
  }
  assert.equal(needsJourneySetup({ ...initial, ownReason: '   ' }), true);
});

test('server reducer records both steps; existing users and intentionally cleared reasons keep their flow', () => {
  let state = reduceJourney(
    emptyJourney(),
    { type: 'reasons', motivations: ['Keluarga'], ownReason: '' },
    'reasons',
  );
  assert.equal(needsJourneySetup(state), true);
  state = reduceJourney(
    state,
    {
      type: 'plan',
      timezone: state.timezone,
      targetQuitDate: null,
      actualQuitDate: null,
      reduceFirst: true,
    },
    'plan',
  );
  assert.equal(needsJourneySetup(state), false);
  state = reduceJourney(state, { type: 'reasons', motivations: [], ownReason: '' }, 'privacy');
  assert.equal(needsJourneySetup(state), false);
  const existing = emptyJourney();
  existing.daily['2026-10-02'] = { status: 'reported', count: 0 };
  assert.equal(needsJourneySetup(existing), false);
  existing.daily['2026-10-02'] = { status: 'unreported', count: null };
  assert.equal(needsJourneySetup(existing), true);
});

test('setup routing checks auth entry and protected menus while keeping urgent help accessible', () => {
  for (const path of ['/home', '/tracker', '/signup', '/signin'])
    assert.equal(shouldCheckJourneySetup(path), true);
  for (const path of [
    '/onboarding',
    '/craving-support',
    '/contact-professional',
    '/breathing-exercise',
    '/reset-password',
  ])
    assert.equal(shouldCheckJourneySetup(path), false);
});

test('onboarding API scopes database reads to the verified account and returns only status', async () => {
  const query = {
    select(value) {
      assert.equal(value, 'document');
      return this;
    },
    eq(key, value) {
      assert.equal(key, 'user_id');
      assert.equal(value, 'verified-owner');
      return this;
    },
    async maybeSingle() {
      return { data: { document: emptyJourney() }, error: null };
    },
  };
  const http = load('src/shared/server/http.ts');
  const mocks = {
    '@/shared/server/http': {
      ...http,
      identity: async () => 'verified-owner',
      database: () => ({
        from(table) {
          assert.equal(table, 'nivo_journeys');
          return query;
        },
      }),
    },
    '@/shared/server/journey-state': {
      journeyState: async (_db, owner, document) => {
        assert.equal(owner, 'verified-owner');
        return { state: document };
      },
    },
  };
  const { GET } = load('src/app/api/onboarding/route.ts', mocks);
  const response = await GET(new NextRequest('http://localhost/api/onboarding'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { required: true });
  mocks['@/shared/server/http'].identity = async () => {
    throw new http.HttpError(401, 'Silakan masuk kembali.');
  };
  assert.equal((await GET(new NextRequest('http://localhost/api/onboarding'))).status, 401);
  mocks['@/shared/server/http'].identity = async () => 'verified-owner';
  query.maybeSingle = async () => ({ error: { message: 'private database failure' } });
  const failure = await GET(new NextRequest('http://localhost/api/onboarding'));
  assert.equal(failure.status, 503);
  assert.doesNotMatch(JSON.stringify(await failure.json()), /private database/);
});
