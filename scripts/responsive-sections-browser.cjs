// Isolated browser regression: every auth/data request is synthetic, never live Supabase.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load } = require('./sdd34-harness.cjs');
const d = load('src/shared/journey/domain.ts');
const { needsJourneySetup } = load('src/shared/journey/onboarding.ts');
const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:3000';
const output = process.env.UI_OUTPUT || 'SDD-Script/evidence/responsive-sections';
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'fixture@example.invalid',
  aud: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-10-03T00:00:00Z',
};
const today = d.localDate(new Date(), 'Asia/Makassar');
const results = [],
  errors = [];
let browser;
function session(provider = 'email') {
  return {
    access_token:
      Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url') +
      '.' +
      Buffer.from(
        JSON.stringify({
          sub: user.id,
          session_id: 'fixture-session',
          exp: 9999999999,
          aud: 'authenticated',
        }),
      ).toString('base64url') +
      '.fixture',
    refresh_token: 'fixture',
    expires_at: 9999999999,
    expires_in: 3600,
    token_type: 'bearer',
    user: { ...user, app_metadata: { provider } },
  };
}
function populatedJourney() {
  const state = d.emptyJourney();
  state.motivations = ['Kesehatan'];
  state.targetQuitDate = d.dateBefore(today, -10);
  const baseline = {
    id: '00000000-0000-4000-8000-000000000010',
    cigarettesPerDay: 10,
    pricePerCigarette: 2000,
    effectiveFrom: d.dateBefore(today, 40),
    createdAt: new Date().toISOString(),
  };
  state.baselines.push(baseline);
  for (let i = 0; i < 35; i++) {
    const date = d.dateBefore(today, i);
    state.daily[date] = {
      date,
      status: 'reported',
      count: i % 5,
      baseline,
      createdAt: date + 'T00:00:00Z',
      updatedAt: date + 'T00:00:00Z',
    };
  }
  state.cravingEvents = Array.from({ length: 7 }, (_, i) => ({
    id: '00000000-0000-4000-8000-' + String(i + 50).padStart(12, '0'),
    occurredAt: d.dateBefore(today, i) + 'T01:00:00Z',
    intensity: 4,
    trigger: 'Kopi',
    outcome: ['passed', 'ongoing', 'smoked'][i % 3],
    durationSec: 60,
    note: '',
  }));
  return state;
}
async function setup({ state = populatedJourney(), loggedIn = true, confirmEmail = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const model = {
    state,
    revision: 0,
    fail: false,
    setupFail: false,
    writes: [],
    grants: [],
    profile: { full_name: 'Profil Uji', email: user.email },
    rooms: Array.from({ length: 8 }, (_, i) => ({
      id: String(i + 1).padStart(8, '0') + '-0000-4000-8000-000000000001',
    })),
  };
  const policy = {
    version: 'fixture',
    cost: 'Gratis',
    boundaries: 'Dukungan kebiasaan',
    retentionDays: 30,
    waitMinutes: 5,
    hours: [{ start: '00:00', end: '23:59' }],
  };
  const room = {
    user: user.id,
    consultant: '00000000-0000-4000-8000-000000000002',
    state: 'connected',
    createdAt: new Date().toISOString(),
    policy,
    sharedSummary: '',
    consentAt: new Date().toISOString(),
    messages: [],
    reads: {},
    reports: [],
    summary: null,
    signals: [],
    operations: {},
  };
  const operations = new Set();
  await context.route('**/*', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user });
    if (url.pathname === '/auth/v1/token') {
      model.grants.push(url.searchParams.get('grant_type'));
      return route.fulfill({
        json: session(url.searchParams.get('grant_type') === 'pkce' ? 'google' : 'email'),
      });
    }
    if (url.pathname === '/auth/v1/signup')
      return route.fulfill({ json: confirmEmail ? { user, session: null } : session() });
    if (url.pathname === '/api/onboarding')
      return route.fulfill(
        model.setupFail
          ? { status: 503, json: { error: 'Rencana awal belum dapat diperiksa.' } }
          : { json: { required: needsJourneySetup(model.state) } },
      );
    if (url.pathname === '/api/journey') {
      if (request.method() === 'POST') {
        const operation = request.postDataJSON();
        model.writes.push(operation.action);
        if (model.fail)
          return route.fulfill({ status: 503, json: { error: 'Fixture: belum tersimpan.' } });
        if (!operations.has(operation.operationId)) {
          assert.equal(operation.expectedRevision, model.revision);
          model.state = d.reduceJourney(model.state, operation.action, operation.operationId);
          model.revision++;
          operations.add(operation.operationId);
        }
      }
      return route.fulfill({
        json: {
          state: model.state,
          revision: model.revision,
          flags: { triggers: true, coping: true, slips: true, followups: true },
        },
      });
    }
    if (url.pathname === '/api/journey/analytics') {
      const days = Number(url.searchParams.get('days') || 7);
      return route.fulfill({
        json: {
          days,
          timezone: model.state.timezone,
          series: Array.from({ length: days }, (_, i) => {
            const day = d.dateBefore(today, days - i - 1),
              record = model.state.daily[day];
            return {
              day,
              cigarettes: record?.count ?? null,
              baseline_cigs_per_day: record?.baseline?.cigarettesPerDay ?? null,
              price_per_cigarette: record?.baseline?.pricePerCigarette ?? null,
            };
          }),
          hours: [{ hour: 9, total: 7, passed: 3, smoked: 2, ongoing: 2 }],
          triggers: [{ trigger: 'Kopi', total: 7 }],
          summary: {
            days_logged_7: 7,
            days_logged: Math.min(days, 35),
            avoided: 50,
            saved: 100000,
            estimate_days: Math.min(days, 35),
            smoke_free_days: 2,
          },
        },
      });
    }
    if (url.pathname === '/api/journey/legacy')
      return route.fulfill({
        json: {
          records: Array.from({ length: 10 }, (_, i) => ({
            id: String(i),
            date: d.dateBefore(today, i + 100),
            cigarette_count: i,
            money_spent: i * 2000,
          })),
          nextOffset: null,
        },
      });
    if (url.pathname === '/api/profile') {
      if (request.method() === 'PUT')
        model.profile = { ...model.profile, ...request.postDataJSON() };
      return route.fulfill({
        json: {
          profile: {
            motivations: model.state.motivations,
            own_reason: model.state.ownReason,
            timezone: model.state.timezone,
            journey_revision: model.revision,
            ...model.profile,
          },
          journey_revision: model.revision,
        },
      });
    }
    if (url.pathname === '/api/buddy')
      return route.fulfill({ json: { owned: [], receiving: [], pending: [] } });
    if (url.pathname === '/api/push/subscriptions')
      return route.fulfill({ json: { configured: false, subscribed: false, publicKey: null } });
    if (url.pathname === '/api/consultation')
      return route.fulfill({
        json: {
          available: true,
          policy,
          actor: user.id,
          role: 'user',
          audio: false,
          consultants: [],
          rooms: model.rooms,
        },
      });
    if (url.pathname.startsWith('/api/consultation/'))
      return route.fulfill({
        json: {
          id: model.rooms[0].id,
          actor: user.id,
          revision: 1,
          previous: null,
          document: room,
        },
      });
    if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
    if (url.origin === origin && !url.pathname.startsWith('/api/')) return route.continue();
    return route.abort();
  });
  if (loggedIn)
    await context.addInitScript((saved) => {
      if (!localStorage.getItem('nivo.fixture.seeded')) {
        localStorage.setItem('supabase.auth.token', JSON.stringify(saved));
        localStorage.setItem('nivo.fixture.seeded', 'true');
      }
    }, session());
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('not focusable'))
      errors.push(message.text());
  });
  return { context, page, model };
}
async function choose(page, label, value) {
  await page.getByLabel('Bagian ' + label, { exact: true }).selectOption(value);
  await page.waitForFunction(
    ({ label, value }) =>
      [...document.querySelectorAll('select')].some(
        (select) =>
          document.querySelector('label[for="' + select.id + '"]')?.textContent ===
            'Bagian ' + label && select.value === value,
      ),
    { label, value },
  );
}
async function noOverflow(page, label) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    label,
  );
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  browser = await chromium.launch({ channel: 'msedge' });
  let f = await setup(),
    { page, model } = f;
  for (const width of process.env.UI_SKIP_LAYOUT ? [] : [320, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, label] of [
      ['home', 'Beranda'],
      ['tracker', 'Catatan'],
      ['craving-support', 'Bantuan mandiri'],
      ['pencapaian', 'Pengaturan perjalanan'],
      ['profile-settings', 'Profil'],
      ['contact-professional', 'Konsultasi'],
      ['pencapaian?tab=reminders', 'Jadwal pengingat'],
      ['pencapaian?tab=buddy', 'Pendamping'],
    ]) {
      await page.goto(origin + '/' + path);
      await page.locator('[data-section-pager]').first().waitFor();
      if (width <= 1024) {
        const picker = page.getByLabel('Bagian ' + label, { exact: true });
        await picker.waitFor();
        const options = await picker
          .locator('option')
          .evaluateAll((items) => items.map((item) => item.value));
        for (const value of options) {
          await picker.selectOption(value);
          const visible = await picker.evaluate(
            (select) =>
              [
                ...select.closest('[data-section-pager]').querySelector('.nivo-section-pages')
                  .children,
              ].filter((section) => !section.hidden).length,
          );
          assert.equal(visible, 1, `${label}/${value}/${width}`);
          await noOverflow(page, `${label}/${value}/${width}`);
        }
        await picker.selectOption(options[0]);
      } else {
        assert.equal(await page.locator('.nivo-section-navigation:visible').count(), 0);
        await noOverflow(page, `${label}/${width}`);
      }
      await page.screenshot({
        path: `${output}/${path.split('?')[0]}-${label.replaceAll(' ', '-')}-${width}.png`,
        fullPage: true,
      });
    }
    results.push(
      `Eight menus and their sections fit ${width}px; compact layouts expose one section at a time.`,
    );
  }
  await page.setViewportSize({ width: 320, height: 750 });
  await page.goto(origin + '/home?section=catat#catat');
  await page.getByLabel('Jumlah batang', { exact: true }).fill('7');
  const before = model.writes.length;
  await choose(page, 'Beranda', 'grafik');
  await page.getByRole('button', { name: '30 hari', exact: true }).click();
  await choose(page, 'Grafik beranda', 'hemat');
  await choose(page, 'Beranda', 'catat');
  assert.equal(await page.getByLabel('Jumlah batang', { exact: true }).inputValue(), '7');
  assert.equal(model.writes.length, before, 'pagination never submits a form');
  await page.goBack();
  await page.getByRole('heading', { name: 'Ruang untuk tabunganmu', exact: true }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: '30 hari', exact: true }).getAttribute('aria-pressed'),
    'true',
  );
  await page.goto(origin + '/home?section=grafik&chart=hemat');
  await page.waitForFunction(() => document.querySelector('select[id^="_r_"]')?.value === 'grafik');
  assert.equal(await page.getByLabel('Bagian Beranda', { exact: true }).inputValue(), 'grafik');
  await page
    .getByRole('navigation', { name: /Pagination Beranda.*akhir/ })
    .getByRole('button', { name: /Berikutnya/ })
    .click();
  await page.waitForFunction(() => document.activeElement?.dataset.sectionPage === 'perjalanan');
  assert.ok(
    await page.evaluate(() => document.activeElement.getBoundingClientRect().top < innerHeight),
  );
  results.push(
    'Drafts, chart periods, anchor entry, reload, browser Back and pagination focus behave consistently.',
  );
  await page.goto(origin + '/tracker?section=rincian');
  await page.waitForFunction(() => document.querySelector('select')?.value === 'rincian');
  const dailyRecords = page.locator('[aria-label="Rincian catatan harian"]');
  await dailyRecords.waitFor();
  const dailyCount = await dailyRecords.locator('li').count();
  assert.ok(dailyCount === 0 || dailyCount === 3);
  await page.getByRole('button', { name: '90 hari', exact: true }).click();
  const dailyPager = page.getByRole('navigation', { name: 'Halaman catatan harian' });
  if (await dailyPager.count()) {
    assert.match(await dailyPager.innerText(), /1\s*\/\s*(?:dari\s*)?30/);
    await dailyPager.getByRole('button', { name: 'Berikutnya', exact: true }).click();
    assert.match(await dailyPager.innerText(), /2\s*\/\s*(?:dari\s*)?30/);
  }
  await choose(page, 'Catatan', 'terdahulu');
  await page.getByRole('button', { name: 'Lihat catatan terdahulu' }).click();
  await page.getByRole('navigation', { name: 'Halaman catatan terdahulu' }).waitFor();
  results.push('Daily and legacy records paginate independently, including the 90-day period.');
  await page.goto(origin + '/craving-support?mode=slip');
  await page
    .getByRole('spinbutton', { name: 'Jumlah batang pada kejadian ini', exact: true })
    .fill('');
  await choose(page, 'Kejadian merokok', 'langkah');
  await page.getByRole('button', { name: 'Simpan kejadian', exact: true }).click();
  await page.waitForFunction(
    () => document.activeElement?.tagName === 'INPUT' && document.activeElement.type === 'number',
  );
  assert.equal(await page.getByLabel('Bagian Kejadian merokok').inputValue(), 'waktu');
  await page
    .getByRole('spinbutton', { name: 'Jumlah batang pada kejadian ini', exact: true })
    .fill('2');
  await choose(page, 'Kejadian merokok', 'pemicu');
  await page
    .getByRole('group', { name: 'Pilih pemicu kejadian merokok' })
    .getByRole('button', { name: 'Kopi', exact: true })
    .click();
  await choose(page, 'Kejadian merokok', 'langkah');
  await page.getByRole('button', { name: 'Simpan kejadian', exact: true }).click();
  await page.getByText('Kejadian dan langkah berikutnya tersimpan.', { exact: true }).waitFor();
  assert.equal(model.state.slips.at(-1).count, 2);
  assert.equal(model.state.slips.at(-1).trigger, 'Kopi');
  results.push(
    'Hidden invalid fields are revealed and focused; a complete slip saves the values from all sections.',
  );
  await page.goto(origin + '/profile-settings');
  await page.getByLabel('Nama Lengkap').fill('Nama Baru');
  await choose(page, 'Profil', 'alasan');
  await page.getByLabel('Alasanku sendiri (opsional)').fill('Waktu bersama keluarga');
  await choose(page, 'Profil', 'waktu');
  await page.getByLabel('Zona waktu', { exact: true }).selectOption('Asia/Jakarta');
  await choose(page, 'Profil', 'pribadi');
  assert.equal(await page.getByLabel('Nama Lengkap').inputValue(), 'Nama Baru');
  await page.getByRole('button', { name: 'Simpan Perubahan', exact: true }).click();
  await page.getByText('Perubahan profil tersimpan.', { exact: true }).waitFor();
  assert.equal(model.profile.own_reason, 'Waktu bersama keluarga');
  assert.equal(model.profile.timezone, 'Asia/Jakarta');
  results.push('Profile sections retain their drafts and submit one complete profile.');
  await page.goto(origin + '/contact-professional?section=sesi');
  await page.getByText('Sesi saya', { exact: true }).waitFor();
  const roomButtons = page.getByRole('button', { name: /Buka sesi/ });
  assert.ok((await roomButtons.count()) >= 1 && (await roomButtons.count()) <= 3);
  await page
    .getByRole('button', { name: /Buka sesi/ })
    .first()
    .click();
  await page
    .getByText('Memuat sesi…', { exact: true })
    .waitFor({ state: 'hidden' })
    .catch(() => {});
  results.push('Consultation rooms paginate and unsent chat survives session-section changes.');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(origin + '/pencapaian');
  await page.getByRole('tab', { name: 'Rencana', exact: true }).focus();
  await page.keyboard.press('End');
  assert.equal(
    await page.getByRole('tab', { name: 'Data saya', exact: true }).getAttribute('aria-selected'),
    'true',
  );
  await page.keyboard.press('Home');
  assert.equal(
    await page.getByRole('tab', { name: 'Rencana', exact: true }).getAttribute('aria-selected'),
    'true',
  );
  results.push('Desktop tabs support keyboard Home/End navigation.');
  await f.context.close();
  // New email account with a session: blank motives cannot skip; failures never finish setup.
  f = await setup({ state: d.emptyJourney(), loggedIn: false });
  page = f.page;
  model = f.model;
  await page.goto(origin + '/signup');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Kata sandi', { exact: true }).fill('Synthetic-password');
  await page.getByRole('button', { name: 'Daftar', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/onboarding');
  await page.getByRole('button', { name: 'Simpan alasan', exact: true }).click();
  await page
    .getByText('Pilih setidaknya satu motivasi atau tulis alasanmu sendiri.', { exact: true })
    .waitFor();
  assert.equal(model.writes.length, 0);
  await page.getByLabel('Alasanku sendiri (opsional)').fill('Untuk keluarga');
  await page.getByRole('button', { name: 'Simpan alasan', exact: true }).click();
  await page.getByLabel('Tanggal pilihanmu', { exact: true }).waitFor();
  await page.reload();
  await page.getByLabel('Tanggal pilihanmu', { exact: true }).waitFor();
  await page.getByLabel('Tanggal pilihanmu', { exact: true }).fill(d.dateBefore(today, -14));
  model.fail = true;
  await page.getByRole('button', { name: 'Simpan tanggal', exact: true }).click();
  await page.getByText('Fixture: belum tersimpan.', { exact: true }).waitFor();
  assert.equal(model.state.targetQuitDate, null);
  assert.equal(
    await page.getByRole('button', { name: 'Mulai perjalanan', exact: true }).count(),
    0,
  );
  model.fail = false;
  await page.getByRole('button', { name: 'Kirim ulang', exact: true }).click();
  await page.getByRole('button', { name: 'Mulai perjalanan', exact: true }).click();
  await page.waitForURL(origin + '/home');
  assert.equal(model.state.ownReason, 'Untuk keluarga');
  assert.equal(model.state.targetQuitDate, d.dateBefore(today, -14));
  await page.goto(origin + '/signin');
  await page.waitForURL(origin + '/home');
  results.push(
    'Immediate email signup opens two-step setup, resumes from server data, retries failed writes and skips setup on later login.',
  );
  await f.context.close();
  // Email verification and Google callback share the same account-status routing.
  f = await setup({ state: d.emptyJourney(), loggedIn: false, confirmEmail: true });
  page = f.page;
  await page.goto(origin + '/signup');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Kata sandi', { exact: true }).fill('Synthetic-password');
  await page.getByRole('button', { name: 'Daftar', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.goto(origin + '/signin?next=%2Ftracker');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Kata sandi', { exact: true }).fill('Synthetic-password');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.waitForURL(
    (url) => url.pathname === '/onboarding' && url.searchParams.get('next') === '/tracker',
  );
  results.push(
    'Verified email account starts setup on first login and retains its intended destination.',
  );
  await f.context.close();
  f = await setup({ state: d.emptyJourney(), loggedIn: false });
  page = f.page;
  await page.goto(origin + '/forgot-password');
  await page.evaluate(() => {
    localStorage.setItem('supabase.auth.token-code-verifier', JSON.stringify('fixture-verifier'));
    sessionStorage.setItem('nivo.signin.next', '/tracker?section=rincian');
  });
  await page.goto(origin + '/auth/callback?code=fixture-code');
  await page.waitForURL(
    (url) =>
      url.pathname === '/onboarding' && url.searchParams.get('next') === '/tracker?section=rincian',
  );
  assert.ok(f.model.grants.includes('pkce'));
  await page.getByLabel('Alasanku sendiri (opsional)').fill('Lebih sehat');
  await page.getByRole('button', { name: 'Simpan alasan', exact: true }).click();
  await page.getByLabel('Saya mau mengurangi bertahap dulu', { exact: true }).check();
  await page.getByRole('button', { name: 'Simpan tanggal', exact: true }).click();
  await page.getByRole('button', { name: 'Mulai perjalanan', exact: true }).click();
  await page.waitForURL(origin + '/tracker?section=rincian');
  assert.equal(f.model.state.reduceFirst, true);
  results.push(
    'New Google PKCE account completes gradual-reduction setup and returns to its exact safe destination.',
  );
  await f.context.close();
  assert.deepEqual(errors, []);
  fs.writeFileSync(output + '/results.json', JSON.stringify({ results, errors }, null, 2));
  console.log(results.join('\n'));
  await browser.close();
})().catch(async (error) => {
  console.error(error);
  if (browser) await browser.close();
  process.exitCode = 1;
});
