const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./sdd34-harness.cjs');
const { AuthStorage, SESSION_MAX_AGE_MS, SUPABASE_AUTH_STORAGE_KEY } = load(
  'src/shared/lib/auth-storage.ts',
);
const { signInReturnPath } = load('src/shared/auth/return-path.ts');

function token(id, version = 1) {
  return (
    Buffer.from('{}').toString('base64url') +
    '.' +
    Buffer.from(JSON.stringify({ session_id: id, version })).toString('base64url') +
    '.fixture'
  );
}
function session(id = 'session-one', version = 1, userId = 'owner') {
  return {
    access_token: token(id, version),
    user: { id: userId, email: 'fixture@example.invalid', app_metadata: { provider: 'google' } },
  };
}
async function withStorage(run) {
  const original = {
    localStorage: global.localStorage,
    sessionStorage: global.sessionStorage,
    now: Date.now,
  };
  const store = {};
  const storage = {
    getItem: (key) => (Object.hasOwn(store, key) ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
      storage[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
      delete storage[key];
    },
  };
  global.localStorage = storage;
  global.sessionStorage = storage;
  let now = 1790985600000;
  Date.now = () => now;
  try {
    await run({
      storage,
      store,
      advance: (milliseconds) => {
        now += milliseconds;
      },
      now: () => now,
    });
  } finally {
    Date.now = original.now;
    for (const key of ['localStorage', 'sessionStorage']) {
      if (original[key] === undefined) delete global[key];
      else global[key] = original[key];
    }
  }
}

test('login lasts exactly 14 days; refreshed tokens and route sync preserve its start time', async () =>
  withStorage(async (fixture) => {
    const initial = session();
    AuthStorage.saveSupabaseSession(initial, { newLogin: true });
    const startedAt = fixture.now();
    assert.equal(AuthStorage.getSession().sessionMaxAgeDays, 14);
    assert.equal(AuthStorage.expiresAt(initial), startedAt + SESSION_MAX_AGE_MS);
    fixture.advance(13 * 86400000);
    AuthStorage.saveSupabaseSession(session('session-one', 2));
    AuthStorage.saveSupabaseSession(session('session-one', 3));
    assert.equal(AuthStorage.getSession().lastLoginAt, startedAt);
    assert.equal(AuthStorage.getSession().userToken, session('session-one', 3).access_token);
    assert.equal(AuthStorage.isSessionValid(), true);
    fixture.advance(86400000 - 1);
    assert.equal(AuthStorage.isSessionValid(), true);
    fixture.advance(1);
    assert.equal(AuthStorage.isSessionValid(), false);
  }));

test('only a fresh login, new Supabase session identity, or changed account starts a new window', async () =>
  withStorage(async (fixture) => {
    AuthStorage.saveSupabaseSession(session());
    const startedAt = fixture.now();
    fixture.advance(SESSION_MAX_AGE_MS + 1);
    AuthStorage.saveSupabaseSession(session('session-one', 2));
    assert.equal(AuthStorage.isSessionValid(), false);
    assert.equal(AuthStorage.getSession().lastLoginAt, startedAt);
    assert.equal(AuthStorage.expiresAt(session('new-session')), null);
    AuthStorage.saveSupabaseSession(session('new-session'));
    assert.equal(AuthStorage.getSession().lastLoginAt, fixture.now());
    assert.equal(AuthStorage.isSessionValid(), true);
    fixture.advance(1000);
    AuthStorage.saveSupabaseSession(session('new-session'), { newLogin: true });
    assert.equal(AuthStorage.getSession().lastLoginAt, fixture.now());
    fixture.advance(1000);
    AuthStorage.saveSupabaseSession(session('other-session', 1, 'other-user'));
    assert.equal(AuthStorage.getSession().userId, 'other-user');
    assert.equal(AuthStorage.getSession().lastLoginAt, fixture.now());
  }));

test('existing sessions adopt 14 days without extending their cached login timestamp', async () =>
  withStorage(async (fixture) => {
    const previous = fixture.now() - 13 * 86400000;
    for (const [key, value] of Object.entries({
      userToken: 'old-token',
      userId: 'owner',
      lastLoginAt: previous,
      sessionMaxAgeDays: 30,
    }))
      fixture.storage.setItem(key, value);
    AuthStorage.saveSupabaseSession(session());
    assert.equal(AuthStorage.getSession().lastLoginAt, previous);
    assert.equal(AuthStorage.getSession().sessionMaxAgeDays, 14);
    assert.equal(AuthStorage.expiresAt(session()), previous + SESSION_MAX_AGE_MS);
  }));

test('invalid and future cache timestamps never authorize a non-expiring session', async () =>
  withStorage(async (fixture) => {
    assert.equal(AuthStorage.isSessionValid(), false);
    AuthStorage.saveSupabaseSession(session());
    for (const value of ['NaN', 'Infinity', '0', '-1', String(fixture.now() + 1)]) {
      fixture.storage.setItem('lastLoginAt', value);
      assert.equal(AuthStorage.isSessionValid(), false, value);
      assert.equal(AuthStorage.expiresAt(session()), 0, value);
    }
  }));

test('expiry preserves owner-scoped retry drafts while explicit logout clears them', async () =>
  withStorage(async (fixture) => {
    AuthStorage.saveSupabaseSession(session());
    fixture.storage.setItem('nivo.pending.owner', 'draft');
    AuthStorage.clearSession({ preserveDrafts: true });
    assert.equal(fixture.store['nivo.pending.owner'], 'draft');
    assert.equal(AuthStorage.getSession(), null);
    AuthStorage.clearSession();
    assert.equal(fixture.store['nivo.pending.owner'], undefined);
  }));

test('expired login clears local Supabase credentials even when logout cannot reach the network', async () =>
  withStorage(async (fixture) => {
    AuthStorage.saveSupabaseSession(session());
    fixture.storage.setItem(SUPABASE_AUTH_STORAGE_KEY, 'synthetic-session');
    fixture.storage.setItem('nivo.pending.owner', 'draft');
    const calls = [];
    const expiry = load('src/shared/auth/expire-session.ts', {
      '@/lib/supabase': {
        supabase: {
          auth: {
            signOut: async (options) => {
              calls.push(options);
              throw new Error('Network fixture');
            },
          },
        },
      },
      '@/lib/auth-storage': { AuthStorage, SUPABASE_AUTH_STORAGE_KEY },
    });
    await Promise.all([expiry.expireBrowserSession(), expiry.expireBrowserSession()]);
    assert.deepEqual(calls, [{ scope: 'local' }]);
    assert.equal(fixture.store[SUPABASE_AUTH_STORAGE_KEY], undefined);
    assert.equal(fixture.store['nivo.pending.owner'], 'draft');
    assert.equal(AuthStorage.getSession(), null);
  }));

test('login returns to allowed app destinations and rejects external or malformed redirect targets', () => {
  for (const value of [
    '/home',
    '/tracker',
    '/craving-support?mode=talk',
    '/craving-history/fixture',
    '/buddy/' + 'A'.repeat(43),
  ])
    assert.equal(signInReturnPath(value), value);
  for (const value of [
    null,
    '',
    'https://evil.invalid',
    '//evil.invalid/home',
    '/\\evil.invalid/home',
    '/signin',
    '/api/journey',
    '/home\n',
    '/home?' + 'x'.repeat(2048),
  ])
    assert.equal(signInReturnPath(value), '/home');
});
