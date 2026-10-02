// Review every UI route using synthetic data; no requests reach live Supabase.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { load } = require('./sdd34-harness.cjs');
const journey = load('src/shared/journey/domain.ts');
const analytics = load('src/features/charts/data.ts');
const AxeBuilder = process.env.AXE_MODULE ? require(process.env.AXE_MODULE).default : null;
const output = process.env.UI_OUTPUT || 'SDD-Script/evidence/ui-glass-orange/all-pages';
const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:3000';
fs.mkdirSync(output, { recursive: true });
const user = {
  id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid',
  aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {},
  created_at: '2026-09-01T00:00:00Z',
};
const logs = Array.from({ length: 7 }, (_, i) => ({
  id: '00000000-0000-4000-8000-' + String(i + 10).padStart(12, '0'),
  user_id: user.id, occurred_at: '2026-10-01T08:00:00Z', intensity: (i % 5) + 1,
  mood: 'Ingin jeda', location: 'Di rumah', situation: 'Selesai bekerja',
}));
const today = journey.localDate(new Date(), 'Asia/Makassar');
const fixtureState = journey.emptyJourney();
const baseline = { id: '00000000-0000-4000-8000-000000000099', effectiveFrom: journey.dateBefore(today, 90), cigarettesPerDay: 10, pricePerCigarette: 2500, createdAt: new Date().toISOString() };
fixtureState.baselines.push(baseline); fixtureState.ownReason = 'Menjaga waktu untuk diri dan keluarga'; fixtureState.motivations = ['Kesehatan']; fixtureState.rewardGoal = 'Sepatu jalan';
fixtureState.coping.push({ id: '00000000-0000-4000-8000-000000000098', trigger: 'Kopi', steps: ['Ambil air', 'Jeda sebentar'], createdAt: new Date().toISOString() });
for (let index = 0; index < 7; index++) {
  const date = journey.dateBefore(today, index), count = index === 3 ? null : index % 3;
  fixtureState.daily[date] = { date, status: count === null ? 'unreported' : 'reported', count, baseline, createdAt: date + 'T00:00:00Z', updatedAt: date + 'T00:00:00Z' };
  fixtureState.cravingEvents.push({ id: '00000000-0000-4000-8000-' + String(index + 50).padStart(12, '0'), occurredAt: new Date(Date.now() - index * 86400000 - 60000).toISOString(), intensity: index % 11, trigger: index % 2 ? 'Stres' : 'Kopi', outcome: ['passed', 'ongoing', 'smoked'][index % 3], durationSec: 120, note: '' });
}
function analyticsFixture(days) {
  const series = Array.from({ length: days }, (_, index) => {
    const day = journey.dateBefore(today, days - index - 1), record = fixtureState.daily[day];
    return { day, cigarettes: record?.status === 'reported' ? record.count : null, baseline_cigs_per_day: record?.baseline?.cigarettesPerDay ?? null, price_per_cigarette: record?.baseline?.pricePerCigarette ?? null };
  });
  const events = fixtureState.cravingEvents.filter(event => journey.localDate(event.occurredAt, fixtureState.timezone) >= series[0].day);
  const hours = [], triggers = [];
  events.forEach(event => {
    const hour = Number(new Intl.DateTimeFormat('en', { timeZone: fixtureState.timezone, hour: '2-digit', hourCycle: 'h23' }).format(new Date(event.occurredAt)));
    let row = hours.find(item => item.hour === hour); if (!row) { row = { hour, total: 0, passed: 0, smoked: 0, ongoing: 0 }; hours.push(row); }
    row.total++; row[event.outcome]++;
    let trigger = triggers.find(item => item.trigger === event.trigger); if (!trigger) { trigger = { trigger: event.trigger, total: 0 }; triggers.push(trigger); } trigger.total++;
  });
  const progress = analytics.journeyProgress(fixtureState, today);
  return { days, timezone: fixtureState.timezone, series, hours: hours.sort((a, b) => a.hour - b.hour), triggers: triggers.sort((a, b) => b.total - a.total), summary: { days_logged_7: progress.logged, days_logged: progress.logged, avoided: progress.avoided, saved: progress.saved, estimate_days: progress.estimateDays, smoke_free_days: progress.zeroDays } };
}
const routes = [
  ['', 'home-entry'], ['welcome', 'welcome'], ['journey-start', 'journey-start'],
  ['time-selection', 'time-selection'], ['set-quit-date-past', 'set-quit-date-past'],
  ['motivation', 'motivation'], ['signin', 'signin'], ['signup', 'signup'],
  ['forgot-password', 'forgot-password'], ['otp-verification', 'otp-verification'],
  ['reset-password', 'reset-password'], ['password-reset-success', 'password-reset-success'],
  ['home', 'home'], ['tracker', 'tracker'], ['pencapaian', 'pencapaian'],
  ['craving-support', 'craving-support'], ['contact-professional', 'contact-professional'],
  ['craving-history', 'craving-history'], ['craving-history/' + logs[0].id, 'craving-detail'],
  ['community', 'community'], ['notifications', 'notifications'], ['ai-result', 'ai-result'],
  ['profile-settings', 'profile-settings'], ['pricing', 'pricing'],
  ['breathing-exercise', 'breathing-exercise'], ['distractions', 'distractions'],
  ['auth/callback?error=fixture', 'auth-callback'], ['fixture-page-not-found', 'not-found'],
  ['craving-support', 'sos-practice', 'practice'], ['craving-support', 'sos-reason', 'reason'], ['craving-support', 'sos-result', 'result'],
  ['craving-support?mode=slip', 'slip'], ['craving-support?mode=talk', 'talk'],
  ['pencapaian', 'wizard-habits', 'wizard2'], ['pencapaian', 'wizard-date', 'wizard3'], ['pencapaian', 'wizard-summary', 'wizard4'],
  ['pencapaian?tab=reminders', 'reminders'], ['pencapaian?tab=buddy', 'buddy'], ['pencapaian?tab=data', 'data'],
  ['buddy/' + 'A'.repeat(43), 'buddy-join'],
  ['tracker', 'tracker-30', 'period30'], ['tracker', 'tracker-90', 'period90'],
];
const requestedRoutes = (process.env.UI_ROUTES || '').split(',').filter(Boolean);
const reviewRoutes = requestedRoutes.length ? routes.filter(([, label]) => requestedRoutes.includes(label)) : routes;
let browser;
(async () => {
  browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  let emptyHistory = false;
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname === '/api/journey') {
      assert.equal(request.method(), 'GET', 'visual review must not mutate journey data');
      return route.fulfill({ json: { revision: 0, state: fixtureState, flags: { triggers: true, coping: true, slips: true, followups: true } } });
    }
    if (url.pathname === '/api/journey/analytics') return route.fulfill({ json: analyticsFixture(Number(url.searchParams.get('days') || 7)) });
    if (url.pathname === '/api/journey/legacy') return route.fulfill({ json: { records: [], nextOffset: null } });
    if (url.pathname === '/api/buddy') return route.fulfill({ json: url.searchParams.has('token') ? { metrics: ['total_smoke_free_days'] } : { owned: [], receiving: [], pending: [] } });
    if (url.pathname === '/api/push/subscriptions') return route.fulfill({ json: { configured: false, subscribed: false, publicKey: null } });
    if (url.pathname === '/api/profile') return route.fulfill({ json: { profile: { full_name: 'Profil Uji', email: user.email, phone_number: '', gender: '', date_of_birth: '1990-01-01', motivations: ['Kesehatan'] } } });
    if (url.pathname === '/api/consultation') return route.fulfill({ json: { available: false, policy: null, consultants: [], rooms: [] } });
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user });
    if (url.pathname === '/auth/v1/signup') return route.fulfill({ json: { user, session: null } });
    if (url.pathname === '/rest/v1/craving_logs') {
      const single = (request.headers().accept || '').includes('vnd.pgrst.object');
      return route.fulfill({ json: single ? logs[0] : emptyHistory ? [] : logs });
    }
    if (url.pathname === '/rest/v1/ai_suggestions') return route.fulfill({ json: [{ suggestion_type: 'craving_support_v2', craving_log_id: logs[0].id, content: 'Pilih satu langkah yang nyaman untukmu.' }] });
    if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
    if (url.origin === origin) return route.continue();
    return route.abort();
  });
  await context.addInitScript(({ user }) => {
    const token = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + btoa(JSON.stringify({ sub: user.id, exp: 9999999999, aud: 'authenticated' })) + '.fixture';
    localStorage.setItem('supabase.auth.token', JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: 9999999999, expires_in: 3600, token_type: 'bearer', user }));
    localStorage.setItem('userToken', token);
    localStorage.setItem('userId', user.id);
    localStorage.setItem('lastLoginAt', String(Date.now()));
    localStorage.setItem('resetEmail', user.email);
    sessionStorage.setItem('nivo.recovery', JSON.stringify({ userId: user.id, until: Date.now() + 900000 }));
    sessionStorage.setItem('nivo.support-result', JSON.stringify({ mode: 'automatic', suggestion: 'Pilih satu langkah yang nyaman untukmu.' }));
  }, { user });
  const page = await context.newPage(), errors = [], results = [], checks = [], accessibility = [];
  page.on('pageerror', error => errors.push(error.message));
  const go = path => page.goto(origin + '/' + path, { waitUntil: 'networkidle' });
  const widths = (process.env.UI_WIDTHS || '320,360,390,768,1024,1280,1536').split(',').map(Number);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, label, subview] of reviewRoutes) {
      const response = await go(path);
      if (['home', 'tracker', 'pencapaian', 'craving-support', 'time-selection', 'set-quit-date-past'].includes(path.split('?')[0])) {
        await page.locator('.nivo-journey-page > section, .nivo-journey-page .nivo-tabs').first().waitFor();
        await page.getByText('Menyiapkan ruangmu', { exact: true }).waitFor({ state: 'hidden' });
      }
      if (['practice', 'reason', 'result'].includes(subview)) {
        const names = { practice: /2Jeda|2\s*Jeda/, reason: /3Alasanmu|3\s*Alasanmu/, result: /4Hasil|4\s*Hasil/ };
        await page.getByRole('navigation', { name: 'Langkah Craving SOS' }).getByRole('button', { name: names[subview] }).click();
        if (subview === 'practice') await page.getByRole('button', { name: 'Mulai latihan', exact: true }).click();
        if (subview === 'result') await page.getByRole('button', { name: 'Masih kuat', exact: true }).click();
      }
      if (subview?.startsWith('wizard')) {
        if (subview === 'wizard2') await page.getByRole('button', { name: '2. Kebiasaan awal', exact: true }).click();
        if (subview === 'wizard3') await page.getByRole('button', { name: '3. Tanggal berhenti', exact: true }).click();
        if (subview === 'wizard4') for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Lewati langkah ini', exact: true }).click();
      }
      if (subview?.startsWith('period')) await page.getByRole('button', { name: subview === 'period30' ? '30 hari' : '90 hari', exact: true }).click();
      if (['tracker', 'tracker-30', 'tracker-90'].includes(label)) await page.getByRole('heading', { name: 'Rincian catatan', exact: true }).waitFor();
      if (label === 'profile-settings') await page.getByLabel('Nama Lengkap', { exact: true }).waitFor();
      if (label === 'craving-detail') await page.getByRole('heading', { name: 'Ingin jeda', exact: true }).waitFor();
      if (label === 'auth-callback') await page.getByRole('heading', { name: 'Belum berhasil masuk' }).waitFor();
      if (label === 'buddy') await page.getByRole('button', { name: 'Buat tautan undangan' }).waitFor();
      if (label === 'buddy-join') await page.getByRole('button', { name: 'Terima undangan' }).waitFor();
      const metrics = await page.evaluate(async () => {
        for (const img of document.images) await img.decode();
        const root = getComputedStyle(document.documentElement);
        const cards = [...document.querySelectorAll('.nivo-glass, .nivo-panel:not(.nivo-panel-plain), .nivo-link-card, .nivo-empty-service, .nivo-support-strip')];
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          body: getComputedStyle(document.body).backgroundColor,
          primary: root.getPropertyValue('--primary').trim(), secondary: root.getPropertyValue('--secondary').trim(),
          glass: cards.some(card => { const style = getComputedStyle(card); return style.backdropFilter.includes('blur') && style.backgroundImage.includes('gradient'); }),
          images: document.images.length,
          navPosition: document.querySelector('.nivo-nav') ? getComputedStyle(document.querySelector('.nivo-nav')).position : null,
          overflowing: document.documentElement.scrollWidth > innerWidth ? [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(el => ({ tag: el.tagName, className: String(el.className), right: el.getBoundingClientRect().right })) : [],
        };
      });
      await page.screenshot({ path: output + '/' + label + '-' + width + '.png', fullPage: true });
      assert.equal(response.status(), label === 'not-found' ? 404 : 200, label + ' response');
      assert.equal(metrics.overflow, false, label + ' overflow at ' + width + ': ' + JSON.stringify(metrics.overflowing));
      assert.equal(metrics.body, 'rgb(255, 255, 255)', label + ' white canvas');
      assert.equal(metrics.primary, '178 85% 18%', label + ' original primary');
      assert.equal(metrics.secondary, '25 95% 53%', label + ' orange secondary');
      assert.equal(metrics.glass, true, label + ' glass cards');
      if (AxeBuilder && width === 390) {
        const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        const failures = audit.violations.filter(item => ['serious', 'critical'].includes(item.impact));
        accessibility.push({ route: label, violations: audit.violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) })) });
        if (failures.length) console.log(label + ' accessibility: ' + failures.map(item => item.id).join(', '));
      }
      if (!['auth-callback', 'not-found'].includes(label)) assert.ok(metrics.images > 0, label + ' original assets');
      if (metrics.navPosition !== null) assert.equal(metrics.navPosition, width < 1024 ? 'fixed' : 'sticky', label + ' navigation breakpoint at ' + width);
      if (['breathing-exercise', 'distractions'].includes(label)) {
        assert.ok(await page.locator('h1').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.legacy-header').getBoundingClientRect().bottom), label + ' title clear of header');
      }
      if (width >= 768 && ['journey-start', 'time-selection', 'set-quit-date-past', 'motivation'].includes(label)) {
        assert.ok(await page.locator('.nivo-setup .nivo-welcome-story img').evaluate(el => el.getBoundingClientRect().top < 150), label + ' logo stays near top of long form');
      }
      results.push({ route: path, width, ...metrics });
    }
    console.log('Reviewed ' + reviewRoutes.length + ' routes at ' + width + 'px.');
  }
  checks.push(results.length + ' route/viewport combinations: white canvas, teal primary, orange secondary, glass cards, decoded images and no horizontal overflow.');
  await page.setViewportSize({ width: 320, height: 750 });
  await go('craving-history');
  await page.getByRole('button', { name: /Intensitas:/ }).first().focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/craving-history/' + logs[0].id);
  await page.getByRole('heading', { name: 'Ingin jeda', exact: true }).waitFor();
  checks.push('Legacy craving cards open their detail with keyboard navigation.');
  emptyHistory = true;
  await go('craving-history');
  await page.getByText('Belum ada riwayat craving', { exact: true }).waitFor();
  await page.screenshot({ path: output + '/history-empty-320.png', fullPage: true });
  await go('signup');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Kata sandi', { exact: true }).fill('Synthetic-password');
  await page.getByRole('button', { name: 'Daftar', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true, 'signup modal traps keyboard focus');
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'signup modal overflow');
  await page.screenshot({ path: output + '/signup-verification-320.png', fullPage: true });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  checks.push('Signup verification modal fits 320px, traps keyboard focus and closes with Escape.');
  await go('distractions');
  await page.getByRole('button', { name: 'Minum Air Perlahan', exact: true }).click();
  await page.getByRole('heading', { name: 'Minum Air Perlahan', exact: true }).waitFor();
  checks.push('Changing a distraction updates the selected activity.');
  await go('breathing-exercise');
  await page.getByRole('button', { name: 'Mulai Latihan', exact: true }).click();
  await page.getByRole('button', { name: 'Selesai', exact: true }).click();
  await page.getByRole('button', { name: 'Mulai Latihan', exact: true }).waitFor();
  checks.push('Breathing exercise can start and stop.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await go('home');
  assert.ok(await page.locator('.nivo-panel').first().evaluate(el => parseFloat(getComputedStyle(el).animationDuration) <= .0001), 'reduced motion card animation');
  assert.equal(await page.locator('.nivo-route-surface').evaluate(el => el.getAnimations().length), 0, 'reduced motion route animation');
  checks.push('Reduced-motion preference disables route fade and minimizes card motion.');
  assert.deepEqual(errors, []);
  fs.writeFileSync(output + '/all-pages-results.json', JSON.stringify({ routes: reviewRoutes.length, combinations: results.length, checks, errors, accessibility, results }, null, 2));
  assert.deepEqual(accessibility.flatMap(item => item.violations.filter(violation => ['serious', 'critical'].includes(violation.impact)).map(violation => ({ route: item.route, ...violation }))), [], 'Serious/critical accessibility audit');
  await browser.close();
  console.log(checks.join('\n'));
})().catch(async error => { console.error(error); if (browser) await browser.close(); process.exitCode = 1; });
