// Local-only visual fixtures. All external requests are intercepted; no production data.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const phase = process.argv[2] || 'before';
const output = path.resolve('SDD-Script/evidence', phase);
fs.mkdirSync(output, { recursive: true });
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, aud: 'authenticated', created_at: '2026-09-01T00:00:00Z' };
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user });
    if (url.pathname.startsWith('/rest/v1/')) {
      const single = (route.request().headers().accept || '').includes('vnd.pgrst.object');
      return route.fulfill({ json: single ? null : [] });
    }
    return route.abort();
  });
  await context.addInitScript(({ user }) => {
    const token = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + btoa(JSON.stringify({ sub: user.id, exp: 9999999999, aud: 'authenticated' })) + '.fixture';
    localStorage.setItem('supabase.auth.token', JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: 9999999999, expires_in: 3600, token_type: 'bearer', user }));
    localStorage.setItem('userToken', token);
    localStorage.setItem('userId', user.id);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('lastLoginAt', String(Date.now()));
  }, { user });
  const page = await context.newPage();
  const results = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['welcome', 'home', 'craving-support', 'tracker', 'contact-professional']) {
      await page.goto(`http://127.0.0.1:3000/${route}`, { waitUntil: 'networkidle', timeout: 120000 });
      await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30000 });
      if (phase === 'after' && route === 'tracker') await page.getByText('Belum ada catatan pada periode ini.', { exact: false }).waitFor();
      await page.locator('body').evaluate(el => {
        const label = document.createElement('div');
        label.textContent = 'QA — data sintetis, bukan akun nyata';
        label.style.cssText = 'position:fixed;bottom:0;right:0;z-index:99999;background:#fff;color:#000;font:10px sans-serif;padding:2px;pointer-events:none';
        el.appendChild(label);
      });
      await page.screenshot({ path: path.join(output, `${route}-${width}.png`), fullPage: true });
      results.push({ route, width, url: page.url(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
    }
  }
  await page.goto('http://127.0.0.1:3000/craving-support', { waitUntil: 'networkidle' });
  const keyboard = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    keyboard.push(await page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent?.trim().slice(0, 70), label: document.activeElement.getAttribute('aria-label') })));
  }
  let fontScale200;
  if (phase === 'after') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    fontScale200 = await page.evaluate(() => ({
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      navigationLabelOverflow: [...document.querySelectorAll('.nivo-nav a span')].some(span => span.scrollWidth > span.clientWidth || span.getBoundingClientRect().width > span.parentElement.getBoundingClientRect().width),
    }));
    if (fontScale200.horizontalOverflow || fontScale200.navigationLabelOverflow) throw new Error('Font enlargement layout regression');
    await page.screenshot({ path: path.resolve('SDD-Script/evidence/flows/text-200-percent.png'), fullPage: true });
  }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ fixtures: true, results, keyboard, fontScale200 }, null, 2));
  await browser.close();
  console.log(JSON.stringify(results));
})().catch(e => { console.error(e); process.exitCode = 1; });
