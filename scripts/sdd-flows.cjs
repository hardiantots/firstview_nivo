const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const output = 'SDD-Script/evidence/flows';
fs.mkdirSync(output, { recursive: true });
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, aud: 'authenticated', created_at: '2026-09-01T00:00:00Z' };
let testBrowser;
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  testBrowser = browser;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  let failWrites = false, failReads = false, failAdvice = false, slow = false;
  const records = [], writes = [], checks = [], errors = [];
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname === '/api/ai-support') return route.fulfill({ json: { success: true, mode: 'automatic', suggestion: 'Panduan otomatis untuk pengujian lokal.' } });
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user });
    if (url.pathname.startsWith('/rest/v1/')) {
      if (slow) await new Promise(resolve => setTimeout(resolve, 2000));
      const table = url.pathname.split('/').pop();
      const write = req.method() !== 'GET';
      if ((write && failWrites) || (!write && failReads) || (write && table === 'ai_suggestions' && failAdvice)) return route.fulfill({ status: 503, json: { message: 'Synthetic unavailable' } });
      if (write) {
        const data = req.postDataJSON(); writes.push({ table, data });
        if (table === 'daily_consumption') {
          const row = Array.isArray(data) ? data[0] : data;
          if (req.method() === 'PATCH') Object.assign(records[0], row);
          else records.push({ id: 'entry-fixture', ...row });
        }
      }
      const single = (req.headers().accept || '').includes('vnd.pgrst.object');
      const rows = table === 'daily_consumption' ? records : [];
      return route.fulfill({ json: single ? rows[0] || (write ? { id: 'fixture' } : null) : rows });
    }
    return route.abort();
  });
  await context.addInitScript(({ user }) => {
    const token = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + btoa(JSON.stringify({ sub: user.id, exp: 9999999999, aud: 'authenticated' })) + '.fixture';
    localStorage.setItem('supabase.auth.token', JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: 9999999999, expires_in: 3600, token_type: 'bearer', user }));
    localStorage.setItem('userToken', token); localStorage.setItem('userId', user.id); localStorage.setItem('lastLoginAt', String(Date.now()));
  }, { user });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  async function go(route) { await page.goto('http://127.0.0.1:3000/' + route, { waitUntil: 'networkidle', timeout: 120000 }); await page.locator('h1').first().waitFor(); await page.waitForTimeout(500); }
  async function shot(name) {
    await page.evaluate(() => {
      if (document.querySelector('[data-sdd-fixture]')) return;
      const label = document.createElement('div'); label.dataset.sddFixture = 'true';
      label.textContent = 'QA — data sintetis, bukan akun nyata';
      label.style.cssText = 'position:fixed;bottom:0;right:0;z-index:99999;background:#fff;color:#000;font:10px sans-serif;padding:2px;pointer-events:none';
      document.body.appendChild(label);
    });
    await page.screenshot({ path: output + '/' + name + '.png', fullPage: true });
  }
  await go('home');
  await page.getByRole('button', { name: 'Simpan catatan hari ini' }).click();
  await page.getByText('Tersimpan: 0 batang hari ini.', { exact: true }).waitFor();
  assert.equal(writes.find(w => w.table === 'daily_consumption').data[0].cigarette_count, 0);
  checks.push('Saving zero is successful and confirmed only after write.');
  await page.getByLabel('Jumlah rokok (batang)').fill('4');
  failWrites = true;
  await page.getByRole('button', { name: 'Simpan catatan hari ini' }).click();
  await page.getByRole('alert').filter({ hasText: 'Catatan belum tersimpan' }).waitFor();
  assert.equal(await page.getByLabel('Jumlah rokok (batang)').inputValue(), '4');
  await shot('home-save-error'); checks.push('Failed write retains input and does not confirm four cigarettes.');
  failWrites = false;
  await page.getByRole('button', { name: 'Simpan catatan hari ini' }).click();
  await page.getByText('Tersimpan: 4 batang hari ini.', { exact: true }).waitFor();
  assert.equal(records.length, 1); assert.equal(records[0].cigarette_count, 4);
  checks.push('Saving again updates the same daily record.');
  await go('tracker');
  await page.getByText('4 batang dari 1 hari yang dicatat.').waitFor();
  assert.equal(await page.getByRole('cell', { name: 'Belum dicatat', exact: true }).count(), 6);
  await shot('tracker-active'); checks.push('Active chart and table distinguish missing days from recorded values.');
  failReads = true; await go('tracker');
  await page.getByRole('alert').filter({ hasText: 'Catatan belum dapat dimuat' }).waitFor();
  await shot('tracker-error'); failReads = false;
  checks.push('Read failure is shown as unavailable, not zero consumption.');
  await go('craving-support');
  await page.getByRole('button', { name: 'Simpan dan lihat panduan' }).click();
  assert.equal(await page.locator('#location').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'location');
  await page.getByLabel('Di mana kamu sekarang?').fill('Rumah (fixture)');
  await page.getByLabel('Apa yang sedang terjadi?').fill('Menguji form');
  await page.getByRole('button', { name: 'netral', exact: true }).click();
  failAdvice = true;
  await page.getByRole('button', { name: 'Simpan dan lihat panduan' }).click();
  await page.getByRole('alert').filter({ hasText: 'panduan belum tersimpan' }).waitFor();
  assert.ok(page.url().endsWith('/craving-support'));
  assert.equal(await page.getByLabel('Di mana kamu sekarang?').inputValue(), 'Rumah (fixture)');
  await shot('support-save-error');
  const cravingCount = writes.filter(w => w.table === 'craving_logs').length;
  failAdvice = false;
  await page.getByRole('button', { name: 'Simpan dan lihat panduan' }).click();
  await page.waitForURL('**/ai-result');
  assert.equal(writes.filter(w => w.table === 'craving_logs').length, cravingCount);
  checks.push('Support save failure keeps form and retry does not duplicate its craving record.');
  await go('craving-support');
  await context.setOffline(true);
  await page.getByRole('status').filter({ hasText: 'Kamu sedang offline' }).waitFor();
  await shot('offline'); await context.setOffline(false);
  checks.push('Offline state is announced.');
  await page.getByRole('button', { name: 'Buka menu akun' }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Buka menu akun');
  checks.push('Menu supports Escape and restores trigger focus.');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Lewati ke konten' }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
  checks.push('Keyboard skip link focuses main content.');
  // Real browser page zoom via extension-style preference is not available in headless.
  // Text enlargement + narrow viewport is separately recorded, not claimed as browser zoom.
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await shot('text-200-percent'); checks.push('200% text enlargement at 390px has no horizontal overflow.');
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  slow = true;
  await page.goto('http://127.0.0.1:3000/tracker', { waitUntil: 'domcontentloaded' });
  await page.getByText('Memuat catatan…', { exact: true }).waitFor();
  await shot('tracker-loading'); slow = false;
  checks.push('Slow reads expose a loading state.');
  for (const route of ['time-selection', 'set-quit-date-past', 'motivation']) {
    await go(route);
    failWrites = true;
    if (route === 'time-selection') await page.getByLabel('30 hari', { exact: true }).check();
    if (route === 'set-quit-date-past') {
      await page.getByLabel('Tanggal berhenti merokok').fill('2020-01-01');
      await page.getByLabel('Tanggal berhenti merokok').press('Tab');
      assert.equal(await page.getByLabel('Tanggal berhenti merokok').inputValue(), '2020-01-01');
    }
    if (route === 'motivation') await page.getByLabel('Kesehatan', { exact: true }).check();
    await page.getByRole('button', { name: /Simpan dan/ }).click();
    await page.locator('.nivo-notice-error').waitFor();
    assert.ok(page.url().endsWith('/' + route));
    await shot(route + '-error');
    failWrites = false;
    await page.getByRole('button', { name: /Simpan dan/ }).click();
    await page.waitForURL(route === 'motivation' ? '**/home' : '**/motivation');
  }
  checks.push('Onboarding dates and motivations preserve selections on failure and navigate only after successful save.');
  fs.writeFileSync(output + '/results.json', JSON.stringify({ fixtures: true, checks, pageErrors: errors }, null, 2));
  await browser.close();
  console.log(JSON.stringify({ checks, pageErrors: errors }));
})().catch(async e => { console.error(e); await testBrowser?.close(); process.exitCode = 1; });
