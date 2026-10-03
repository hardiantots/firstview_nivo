// No live login or account creation: Supabase and application APIs are intercepted.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load } = require('./sdd34-harness.cjs');
const domain = load('src/shared/journey/domain.ts');
const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:3000';
const output = process.env.UI_OUTPUT || 'SDD-Script/evidence/auth-14-days';
const lifetime = 14 * 86400000;
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'fixture@example.invalid',
  aud: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-09-01T00:00:00Z',
};
function session(id = 'session-one', provider = 'email') {
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, session_id: id, exp: 9999999999, aud: 'authenticated' }),
  ).toString('base64url');
  return {
    access_token:
      Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url') + '.' + payload + '.fixture',
    refresh_token: 'fixture',
    token_type: 'bearer',
    expires_at: 9999999999,
    expires_in: 3600,
    user: { ...user, app_metadata: { provider } },
  };
}
const results = [],
  errors = [];
let browser;
(async () => {
  fs.mkdirSync(output, { recursive: true });
  browser = await chromium.launch({ channel: 'msedge' });
  const setup = async ({
    ageDays,
    status = 200,
    storageState,
    staleAccess = false,
    forgedCache = false,
  } = {}) => {
    const context = await browser.newContext({ storageState });
    const calls = { user: 0, logout: 0, grants: [] };
    const state = domain.emptyJourney('Asia/Makassar');
    await context.route('**/*', async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.pathname === '/auth/v1/user') {
        calls.user++;
        return route.fulfill({
          status,
          json: status === 200 ? user : { code: 'fixture', msg: 'Fixture identity unavailable.' },
        });
      }
      if (url.pathname === '/auth/v1/token') {
        const grant = url.searchParams.get('grant_type');
        calls.grants.push(grant);
        assert.ok(['password', 'refresh_token', 'pkce'].includes(grant));
        return route.fulfill({
          json: session(
            grant === 'refresh_token' ? 'session-one' : 'new-login',
            grant === 'pkce' ? 'google' : 'email',
          ),
        });
      }
      if (url.pathname === '/auth/v1/logout') {
        calls.logout++;
        return route.fulfill({ status: 204 });
      }
      if (url.pathname === '/api/journey')
        return route.fulfill({
          json: {
            revision: 1,
            state,
            flags: { triggers: true, coping: true, slips: true, followups: false },
          },
        });
      if (url.pathname === '/api/onboarding') return route.fulfill({ json: { required: false } });
      if (url.pathname === '/api/journey/analytics') {
        const days = Number(url.searchParams.get('days') || 7),
          today = domain.localDate(new Date(), state.timezone);
        return route.fulfill({
          json: {
            days,
            timezone: state.timezone,
            series: Array.from({ length: days }, (_, index) => ({
              day: domain.dateBefore(today, days - index - 1),
              cigarettes: null,
              baseline_cigs_per_day: null,
              price_per_cigarette: null,
            })),
            hours: [],
            triggers: [],
            summary: {
              days_logged_7: 0,
              days_logged: 0,
              avoided: null,
              saved: null,
              estimate_days: 0,
              smoke_free_days: 0,
            },
          },
        });
      }
      if (url.pathname === '/api/journey/legacy')
        return route.fulfill({ json: { records: [], nextOffset: null } });
      if (url.pathname === '/api/buddy')
        return route.fulfill({
          json: { metrics: ['total_smoke_free_days'], owned: [], receiving: [], pending: [] },
        });
      if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
      if (url.origin === origin) return route.continue();
      return route.abort();
    });
    if (ageDays !== undefined || forgedCache)
      await context.addInitScript(
        ({ saved, ageDays, staleAccess, forgedCache }) => {
          if (localStorage.getItem('nivo.test.seeded')) return;
          localStorage.setItem('nivo.test.seeded', 'true');
          if (!forgedCache) {
            if (staleAccess) saved.expires_at = Math.floor(Date.now() / 1000) - 60;
            localStorage.setItem('supabase.auth.token', JSON.stringify(saved));
          }
          localStorage.setItem('userToken', saved.access_token);
          localStorage.setItem('userId', saved.user.id);
          localStorage.setItem('lastLoginAt', String(Date.now() - (ageDays || 0) * 86400000));
          localStorage.setItem('nivo.auth.session-id', 'session-one');
          localStorage.setItem('nivo.pending.' + saved.user.id, 'fixture-draft');
        },
        { saved: session(), ageDays, staleAccess, forgedCache },
      );
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    return { context, page, calls };
  };
  let fixture = await setup();
  await fixture.page.goto(origin + '/signin?next=%2Ftracker');
  await fixture.page.getByRole('heading', { name: 'Masuk', exact: true }).waitFor();
  await fixture.page.getByLabel('Email', { exact: true }).fill(user.email);
  await fixture.page.getByLabel('Kata sandi', { exact: true }).fill('Synthetic-password');
  await fixture.page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await fixture.page.waitForURL(origin + '/tracker');
  await fixture.page.getByRole('heading', { name: 'Catatan harian', exact: true }).waitFor();
  const startedAt = await fixture.page.evaluate(() => Number(localStorage.getItem('lastLoginAt')));
  assert.equal(await fixture.page.evaluate(() => localStorage.getItem('sessionMaxAgeDays')), '14');
  assert.ok(fixture.calls.user > 0);
  const saved = await fixture.context.storageState();
  await fixture.context.close();
  fixture = await setup({ storageState: saved });
  await fixture.page.goto(origin + '/signin?next=%2Ftracker');
  await fixture.page.waitForURL(origin + '/tracker');
  await fixture.page.reload();
  await fixture.page.getByRole('heading', { name: 'Catatan harian', exact: true }).waitFor();
  assert.equal(
    await fixture.page.evaluate(() => Number(localStorage.getItem('lastLoginAt'))),
    startedAt,
  );
  results.push(
    'Password login stores 14 days, preserves the intended route, and survives a new browser context plus reload.',
  );
  await fixture.context.close();
  fixture = await setup({ ageDays: 13, staleAccess: true });
  await fixture.page.goto(origin + '/signin');
  await fixture.page.waitForURL(origin + '/home');
  assert.ok(fixture.calls.grants.includes('refresh_token'));
  const age =
    Date.now() - (await fixture.page.evaluate(() => Number(localStorage.getItem('lastLoginAt'))));
  assert.ok(age >= 13 * 86400000 && age < lifetime);
  results.push('A 13-day session refreshes its access token without extending the login window.');
  for (const path of ['/signup', '/', '/welcome', '/signin?next=//evil.invalid']) {
    await fixture.page.goto(origin + path);
    await fixture.page.waitForURL(origin + '/home');
  }
  results.push(
    'Active sessions skip signup, signin, welcome and the entry page; external return URLs are rejected.',
  );
  await fixture.context.close();
  fixture = await setup({ ageDays: 14.001 });
  await fixture.page.goto(origin + '/tracker');
  await fixture.page.waitForURL(
    (url) => url.pathname === '/signin' && url.searchParams.get('next') === '/tracker',
  );
  await fixture.page.getByRole('heading', { name: 'Masuk', exact: true }).waitFor();
  assert.equal(
    await fixture.page.evaluate(() => localStorage.getItem('supabase.auth.token')),
    null,
  );
  assert.equal(
    await fixture.page.evaluate(
      (userId) => localStorage.getItem('nivo.pending.' + userId),
      user.id,
    ),
    'fixture-draft',
  );
  results.push(
    'Expired sessions return to signin with the intended route and preserve unsent owner drafts.',
  );
  await fixture.context.close();
  fixture = await setup({ forgedCache: true });
  await fixture.page.goto(origin + '/home');
  await fixture.page.waitForURL((url) => url.pathname === '/signin');
  await fixture.page.getByRole('heading', { name: 'Masuk', exact: true }).waitFor();
  results.push('Browser identity cache alone does not authenticate a user.');
  await fixture.context.close();
  fixture = await setup({ ageDays: 1, status: 401 });
  await fixture.page.goto(origin + '/home');
  await fixture.page.waitForURL((url) => url.pathname === '/signin');
  await fixture.page.getByRole('heading', { name: 'Masuk', exact: true }).waitFor();
  results.push('Revoked/invalid Supabase identities cannot restore a cached login.');
  await fixture.context.close();
  fixture = await setup({ ageDays: 1, status: 503 });
  await fixture.page.goto(origin + '/home');
  await fixture.page.getByText(/Sesi belum dapat diverifikasi/).waitFor();
  assert.notEqual(
    await fixture.page.evaluate(() => localStorage.getItem('supabase.auth.token')),
    null,
  );
  assert.equal(
    await fixture.page.evaluate(
      (userId) => localStorage.getItem('nivo.pending.' + userId),
      user.id,
    ),
    'fixture-draft',
  );
  results.push(
    'Temporary verification failures preserve the session and draft and do not expose protected content.',
  );
  await fixture.context.close();
  fixture = await setup();
  await fixture.page.goto(origin + '/forgot-password');
  await fixture.page.evaluate(() => {
    localStorage.setItem('supabase.auth.token-code-verifier', JSON.stringify('fixture-verifier'));
    sessionStorage.setItem('nivo.signin.next', '/buddy/' + 'A'.repeat(43));
  });
  await fixture.page.goto(origin + '/auth/callback?code=fixture-code');
  await fixture.page.waitForURL(origin + '/buddy/' + 'A'.repeat(43));
  await fixture.page
    .getByRole('heading', { name: 'Undangan untuk mendampingi', exact: true })
    .waitFor();
  assert.ok(fixture.calls.grants.includes('pkce'));
  assert.equal(await fixture.page.evaluate(() => localStorage.getItem('sessionMaxAgeDays')), '14');
  assert.equal(await fixture.page.evaluate(() => localStorage.getItem('loginMethod')), 'oauth');
  results.push('Google PKCE callback stores 14 days and returns to the selected buddy invitation.');
  await fixture.context.close();
  assert.deepEqual(errors, []);
  fs.writeFileSync(output + '/results.json', JSON.stringify({ results, errors }, null, 2));
  console.log(results.join('\n'));
  await browser.close();
})().catch(async (error) => {
  console.error(error);
  if (browser) await browser.close();
  process.exitCode = 1;
});
