// Isolated UI regression: every auth/data request uses synthetic fixtures.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load } = require('./sdd34-harness.cjs');
const domain = load('src/shared/journey/domain.ts');
const { dashboardData } = load('src/features/home/dashboard-data.ts');
const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:3000';
const output = process.env.UI_OUTPUT || 'SDD-Script/evidence/home-dashboard';
const AxeBuilder = process.env.AXE_MODULE ? require(process.env.AXE_MODULE).default : null;
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'fixture@example.invalid',
  aud: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-09-01T00:00:00Z',
};
const today = domain.localDate(new Date(), 'Asia/Makassar');
const initial = domain.emptyJourney('Asia/Makassar');
const baseline = {
  id: '00000000-0000-4000-8000-000000000002',
  cigarettesPerDay: 10,
  pricePerCigarette: 2000,
  effectiveFrom: domain.dateBefore(today, 40),
  createdAt: '2026-09-01T00:00:00Z',
};
initial.baselines.push(baseline);
for (let index = 0; index < 7; index++) {
  const date = domain.dateBefore(today, index);
  const count = [2, 0, 4, null, 0, 8, 1][index];
  initial.daily[date] = {
    date,
    count,
    status: count === null ? 'unreported' : 'reported',
    baseline,
    createdAt: date + 'T00:00:00Z',
    updatedAt: date + 'T00:00:00Z',
  };
}
initial.cravingEvents = ['passed', 'ongoing', 'smoked'].map((outcome, index) => ({
  id: '00000000-0000-4000-8000-' + String(index + 10).padStart(12, '0'),
  occurredAt: domain.dateBefore(today, 2) + 'T01:00:00Z',
  intensity: 4,
  trigger: 'Kopi',
  outcome,
  durationSec: 60,
  note: '',
}));
let state = structuredClone(initial),
  revision = 1,
  failSave = false,
  browser;
const flags = { triggers: true, coping: true, slips: true, followups: false };
const snapshot = () => ({ state, revision, flags });
const results = [];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await context.route('**/*', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin === origin && url.pathname === '/api/journey') {
      if (request.method() === 'POST') {
        if (failSave)
          return route.fulfill({ status: 503, json: { error: 'Fixture: server belum tersedia.' } });
        const operation = request.postDataJSON();
        assert.equal(operation.action.type, 'daily');
        state = domain.reduceJourney(state, operation.action, operation.operationId);
        revision++;
      }
      return route.fulfill({ json: snapshot() });
    }
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user });
    if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
    if (url.origin === origin) return route.continue();
    return route.abort();
  });
  await context.addInitScript(
    ({ user }) => {
      const token =
        btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) +
        '.' +
        btoa(JSON.stringify({ sub: user.id, exp: 9999999999, aud: 'authenticated' })) +
        '.fixture';
      localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({
          access_token: token,
          refresh_token: 'fixture',
          expires_at: 9999999999,
          expires_in: 3600,
          token_type: 'bearer',
          user,
        }),
      );
    },
    { user },
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const overview = page.locator('.nivo-home-overview');
  const graphs = page.getByRole('region', { name: 'Grafik ringkasan beranda' });
  const openHome = async () => {
    const response = await page.goto(origin + '/home');
    assert.equal(response.status(), 200);
    await overview.getByRole('heading', { name: 'Setiap langkahmu berarti' }).waitFor();
    await graphs.getByRole('heading', { name: 'Tren konsumsi' }).waitFor();
    await page.waitForFunction(
      () => document.querySelectorAll('.nivo-home-chart-grid .recharts-surface').length === 3,
    );
  };
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await openHome();
    await page.waitForTimeout(600);
    const metrics = await page.evaluate(async () => {
      for (const image of document.images) {
        if (image.getClientRects().length && image.currentSrc) await image.decode();
      }
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        background: getComputedStyle(document.body).backgroundColor,
        glass: getComputedStyle(document.querySelector('.nivo-home-overview')).backdropFilter,
        orange: getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim(),
      };
    });
    assert.equal(metrics.overflow, false, `overflow at ${width}`);
    assert.equal(metrics.background, 'rgb(255, 255, 255)');
    assert.ok(metrics.glass.includes('blur'));
    assert.equal(metrics.orange, '25 95% 53%');
    await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true });
    results.push(`Home charts, glass surfaces, images and layout fit ${width}px.`);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await openHome();
  await graphs.getByRole('button', { name: '30 hari', exact: true }).click();
  assert.equal(
    await graphs.getByRole('button', { name: '30 hari', exact: true }).getAttribute('aria-pressed'),
    'true',
  );
  await graphs.getByText('6 dari 30 hari', { exact: true }).waitFor();
  await graphs.getByText('Lihat angka konsumsi', { exact: true }).click();
  const consumption = graphs.locator('details').first();
  assert.equal(await consumption.locator('dt').count(), 30);
  assert.ok((await consumption.getByText('Belum tercatat', { exact: true }).count()) > 0);
  results.push(
    '7/30-day periods and accessible detail rows keep unreported days separate from zero.',
  );
  await page.getByRole('button', { name: '0 hari ini', exact: true }).click();
  await page.getByText('Tersimpan di server.', { exact: true }).waitFor();
  let expected = dashboardData(state, today, 7);
  await overview
    .getByText(`${expected.progress.zeroDays} dari ${expected.nextMilestone} hari`, { exact: true })
    .waitFor();
  assert.equal(
    await overview.getByRole('img', { name: /Menuju .* persen/ }).getAttribute('aria-label'),
    `Menuju ${expected.nextMilestone} hari bebas rokok tercatat: ${Math.round(expected.milestonePercentage)} persen`,
  );
  results.push(
    'Saving a daily log updates the home ring and charts from the returned server snapshot.',
  );
  failSave = true;
  await page.getByLabel('Jumlah batang', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Simpan catatan', exact: true }).click();
  await page.getByText('Fixture: server belum tersedia.', { exact: true }).waitFor();
  await overview
    .getByText(`${expected.progress.zeroDays} dari ${expected.nextMilestone} hari`, { exact: true })
    .waitFor();
  results.push('Failed writes restore the server progress and preserve the pending retry draft.');
  await page.evaluate(() =>
    localStorage.removeItem('nivo.pending.' + '00000000-0000-4000-8000-000000000001'),
  );
  failSave = false;
  state.insightsHidden = true;
  await page.reload();
  await graphs.getByText(/Insight disembunyikan sesuai pilihanmu/).waitFor();
  assert.equal(await graphs.locator('.nivo-outcome-canvas').count(), 0);
  results.push('The home outcome chart respects the stored hidden-insights preference.');
  state = domain.emptyJourney('Asia/Makassar');
  await page.reload();
  await graphs.getByText(/^Belum ada catatan/).waitFor();
  await graphs.getByText(/Isi kebiasaan awal dan catatan harian/).waitFor();
  await overview.getByRole('img', { name: /0 persen/ }).waitFor();
  assert.equal(await graphs.locator('.recharts-surface').count(), 0);
  results.push(
    'Empty database state shows helpful empty states without invented charts or savings.',
  );
  state = structuredClone(initial);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome();
  await page.waitForTimeout(100);
  const motion = await overview.evaluate((element) => ({
    duration: parseFloat(getComputedStyle(element).animationDuration),
    ringTransition: getComputedStyle(element.querySelector('.nivo-progress-ring-value'))
      .transitionDuration,
    routeAnimations: document.querySelector('.nivo-route-surface').getAnimations().length,
  }));
  assert.ok(motion.duration <= 0.0001);
  assert.ok(parseFloat(motion.ringTransition) <= 0.0001);
  assert.equal(motion.routeAnimations, 0);
  results.push('Reduced motion disables route and ring animation and minimizes surface motion.');
  if (AxeBuilder) {
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    assert.deepEqual(
      audit.violations
        .filter((item) => ['serious', 'critical'].includes(item.impact))
        .map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })),
      [],
    );
    results.push('Home passes the serious/critical WCAG accessibility checks.');
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(output + '/results.json', JSON.stringify({ results, errors }, null, 2));
  console.log(results.join('\n'));
  await browser.close();
})().catch(async (error) => {
  console.error(error);
  if (browser) await browser.close();
  process.exitCode = 1;
});
