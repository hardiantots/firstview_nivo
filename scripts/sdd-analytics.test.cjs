const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { load } = require('./sdd34-harness.cjs');
const data = load('src/features/charts/data.ts');
const reports = load('src/features/charts/export.ts');
const domain = load('src/shared/journey/domain.ts');
const http = load('src/shared/server/http.ts');
const dashboard = load('src/features/home/dashboard-data.ts');

function dashboardRecord(date, count, baseline = null) {
  return { date, count, status: count === null ? 'unreported' : 'reported', baseline, createdAt: date + 'T00:00:00Z', updatedAt: date + 'T00:00:00Z' };
}

test('home charts preserve missing days, zero counts and historical prices across baseline changes', () => {
  const state = domain.emptyJourney('Asia/Makassar');
  const baseline = { id: 'old', effectiveFrom: '2026-09-01', cigarettesPerDay: 10, pricePerCigarette: 1000, createdAt: '2026-09-01T00:00:00Z' };
  const changed = { ...baseline, id: 'new', cigarettesPerDay: 20, pricePerCigarette: 2000 };
  state.baselines = [changed];
  state.daily = {
    '2026-09-01': dashboardRecord('2026-09-01', 0, baseline),
    '2026-09-02': dashboardRecord('2026-09-02', null, baseline),
    '2026-09-03': dashboardRecord('2026-09-03', 2, changed),
    '2026-09-04': dashboardRecord('2026-09-04', 1),
    '2026-09-05': dashboardRecord('2026-09-05', 30, changed),
    '2026-09-08': dashboardRecord('2026-09-08', 0, changed),
  };
  const result = dashboard.dashboardData(state, '2026-09-07', 7);
  assert.deepEqual(result.series.map(point => point.cigarettes), [0, null, 2, 1, 30, null, null]);
  assert.deepEqual(result.savings.map(point => point.cumulative), [10000, null, 46000, null, 46000, null, null]);
  assert.equal(result.period.saved, 46000);
  assert.equal(result.period.logged, 4);
  assert.equal(result.progress.zeroDays, 1);
  assert.equal(result.weekLogged, 4);
  assert.equal(result.series[1].baseline_cigs_per_day, null);
  assert.equal(result.savings[3].saved, null);
});

test('home ring keeps cumulative smoke-free days, excludes contradictory smoking and advances its milestone', () => {
  const state = domain.emptyJourney('Asia/Makassar');
  for (let index = 0; index < 9; index++) {
    const date = domain.dateBefore('2026-09-07', index);
    state.daily[date] = dashboardRecord(date, 0);
  }
  state.slips = [{ id: 'slip', occurredAt: '2026-09-02T01:00:00Z', count: 1, trigger: '', nextStep: 'Jeda' }];
  state.cravingEvents = [{ id: 'event', occurredAt: '2026-09-05T23:30:00Z', intensity: 5, trigger: '', outcome: 'smoked', durationSec: 60, note: '' }];
  const result = dashboard.dashboardData(state, '2026-09-07', 7);
  assert.equal(result.progress.zeroDays, 7);
  assert.equal(result.nextMilestone, 14);
  assert.equal(result.milestonePercentage, 50);
  assert.equal(result.weekLogged, 7);
  assert.equal(result.cravingTotal, 1);
});

test('home craving outcomes use the selected local period and never infer a result from legacy check-ins', () => {
  const state = domain.emptyJourney('Asia/Makassar');
  state.checkins = [{ id: 'legacy', occurredAt: '2026-09-07T00:00:00Z', trigger: 'Kopi', intensity: 2, context: '' }];
  const event = (id, occurredAt, outcome) => ({ id, occurredAt, outcome, intensity: 4, trigger: 'Kopi', durationSec: 30, note: '' });
  state.cravingEvents = [
    event('outside', '2026-08-31T15:59:00Z', 'passed'),
    event('boundary', '2026-08-31T16:00:00Z', 'passed'),
    event('ongoing', '2026-09-07T00:00:00Z', 'ongoing'),
    event('future', '2026-09-07T16:00:00Z', 'smoked'),
  ];
  const week = dashboard.dashboardData(state, '2026-09-07', 7);
  assert.deepEqual(week.outcomes.map(point => point.total), [1, 1, 0]);
  assert.equal(week.cravingTotal, 2);
  const month = dashboard.dashboardData(state, '2026-09-07', 30);
  assert.equal(month.cravingTotal, 3);
  assert.equal(month.series.length, 30);
});

test('empty home data and valid zero-cost estimates do not become fictitious progress', () => {
  const state = domain.emptyJourney('Asia/Makassar');
  const empty = dashboard.dashboardData(state, '2026-09-07', 7);
  assert.equal(empty.milestonePercentage, 0);
  assert.equal(empty.nextMilestone, 7);
  assert.equal(empty.period.saved, null);
  assert.equal(empty.cravingTotal, 0);
  assert.ok(empty.savings.every(point => point.cumulative === null));
  state.daily['2026-09-07'] = dashboardRecord('2026-09-07', 0, { id: 'zero', effectiveFrom: '2026-09-07', cigarettesPerDay: 0, pricePerCigarette: 0, createdAt: '2026-09-07T00:00:00Z' });
  const zero = dashboard.dashboardData(state, '2026-09-07', 30);
  assert.equal(zero.period.saved, 0);
  assert.equal(zero.period.estimateDays, 1);
  assert.equal(zero.savings.at(-1).cumulative, 0);
  assert.equal(zero.weekLogged, 1);
});

test('home milestone remains bounded and continues beyond one year of recorded progress', () => {
  const state = domain.emptyJourney('Asia/Makassar');
  for (let index = 0; index < 400; index++) {
    const date = domain.dateBefore('2026-09-07', index);
    state.daily[date] = dashboardRecord(date, 0);
  }
  const result = dashboard.dashboardData(state, '2026-09-07', 30);
  assert.equal(result.progress.zeroDays, 400);
  assert.equal(result.nextMilestone, 420);
  assert.ok(result.milestonePercentage > 0 && result.milestonePercentage < 100);
  assert.equal(result.weekLogged, 7);
  assert.equal(result.period.logged, 30);
});

test('analytics keeps zero separate from missing and applies historical baseline snapshots', () => {
  const series = [
    { day: '2026-09-01', cigarettes: null, baseline_cigs_per_day: 20, price_per_cigarette: 1000 },
    { day: '2026-09-02', cigarettes: 0, baseline_cigs_per_day: 10, price_per_cigarette: 1000 },
    { day: '2026-09-03', cigarettes: 8, baseline_cigs_per_day: 20, price_per_cigarette: 2000 },
    { day: '2026-09-04', cigarettes: 40, baseline_cigs_per_day: 20, price_per_cigarette: 2000 },
    { day: '2026-09-05', cigarettes: 1, baseline_cigs_per_day: null, price_per_cigarette: null },
  ];
  assert.deepEqual(data.periodSummary(series), { logged: 4, average: 12.25, zeroDays: 1, estimateDays: 3, avoided: 22, saved: 34000 });
  assert.deepEqual(data.periodSummary([series[0]]), { logged: 0, average: null, zeroDays: 0, estimateDays: 0, avoided: null, saved: null });
  assert.equal(data.periodSummary([series[4]]).saved, null);
});

test('insights require five events and unknown/ongoing outcomes never become successful outcomes', () => {
  const hour = (total, passed, smoked, ongoing) => ({ hour: 16, total, passed, smoked, ongoing });
  assert.equal(data.cravingSummary([hour(4, 1, 1, 1)]).busiestHour, null);
  const summary = data.cravingSummary([hour(6, 1, 1, 2)]);
  assert.equal(summary.busiestHour, 16);
  assert.equal(summary.completed, 2);
  assert.equal(summary.passedPercentage, 50);
  assert.equal(data.cravingSummary([hour(5, 0, 0, 3)]).passedPercentage, null);
});

test('cumulative milestones keep past progress, exclude missing/future and contradictory smoking days in local timezone', () => {
  const state = domain.emptyJourney('Asia/Makassar');
  const record = (date, count) => ({ date, status: count === null ? 'unreported' : 'reported', count, baseline: null, createdAt: date + 'T00:00:00Z', updatedAt: date + 'T00:00:00Z' });
  state.daily = Object.fromEntries([['2026-09-01', 0], ['2026-09-02', 0], ['2026-09-03', 0], ['2026-09-04', null], ['2026-09-05', 2], ['2026-09-06', 0], ['2026-09-07', 0], ['2026-09-09', 0]].map(([date, count]) => [date, record(date, count)]));
  state.slips = [{ id: 'slip', occurredAt: '2026-09-02T01:00:00Z', count: 1, trigger: '', nextStep: 'Jeda' }];
  // UTC September 5 late night belongs to September 6 in WITA.
  state.cravingEvents = [{ id: 'craving', occurredAt: '2026-09-05T23:30:00Z', intensity: 5, trigger: '', outcome: 'smoked', durationSec: 60, note: '' }];
  assert.equal(data.journeyProgress(state, '2026-09-07').zeroDays, 3);
  assert.equal(data.journeyProgress(state, '2026-09-07').saved, null);
  assert.equal(data.journeyProgress(state, '2026-09-07').logged, 6);
});

test('CSV handles quotes/newlines and spreadsheet formula injection, preserves missing data and unknown outcomes', () => {
  for (const value of ['=SUM(1,2)', '+123', '-cmd', '@SUM(1)', '  =1', '\ttext', '\rtext', '\ntext']) {
    assert.ok(reports.csvCell(value).startsWith('"\''), value);
  }
  assert.equal(reports.csvCell('safe "text"\nnext'), '"safe ""text""\nnext"');
  assert.equal(reports.csvCell(0), '"0"');
  assert.equal(reports.csvCell(null), '""');
  const csv = reports.exportCsv([
    { log_date: '2026-09-01', cigarettes: null, reported: false, baseline_cigs_per_day: null, price_per_cigarette: null },
    { log_date: '2026-09-02', cigarettes: 0, reported: true, baseline_cigs_per_day: 10, price_per_cigarette: 1000 },
  ], [{ id: 'internal-id', occurred_at: '2026-09-02T15:30:00Z', intensity: 4, trigger: '=HYPERLINK("attacker")', outcome: null, duration_sec: null, note: 'catatan\nbaris kedua', source: 'checkin' }], 'Asia/Makassar');
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"belum tercatat"/);
  assert.match(csv, /"10000"/);
  assert.match(csv, /"belum diketahui"/);
  assert.doesNotMatch(csv, /internal-id|user_id|email/);
  assert.equal(reports.exportCravingSchema.safeParse({ id: 'slip-event', occurred_at: '2026-09-02T15:30:00Z', intensity: null, trigger: '', outcome: 'smoked', duration_sec: null, note: 'Jeda', source: 'slip' }).success, true);
});

test('server PDF is one complete A4 page with valid byte offsets and honest insufficient-data text', () => {
  const buffer = Buffer.from(reports.exportPdf({ daily: [], hours: [], start: '2026-09-01', end: '2026-09-07', timezone: 'Asia/Makassar' }));
  const text = buffer.toString('ascii');
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /\/Count 1/);
  assert.match(text, /\/MediaBox \[0 0 595 842\]/);
  assert.match(text, /Perlu minimal 5 kejadian/);
  assert.match(text, /Rata-rata: Belum tersedia/);
  assert.match(text, /Hari tanpa catatan tidak dihitung sebagai nol/);
  const xref = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(buffer.subarray(xref, xref + 4).toString(), 'xref');
  const offsets = text.slice(xref).match(/\d{10} 00000 n/g).map(entry => Number(entry.slice(0, 10)));
  offsets.forEach((offset, index) => assert.equal(buffer.subarray(offset, offset + `${index + 1} 0 obj`.length).toString(), `${index + 1} 0 obj`));
  const length = Number(text.match(/\/Length (\d+)/)[1]);
  const stream = text.match(/\nstream\n([\s\S]*?)\nendstream/)[1];
  assert.equal(Buffer.byteLength(stream), length);
  const populated = Buffer.from(reports.exportPdf({ daily: [{ log_date: '2026-09-02', cigarettes: 0, reported: true, baseline_cigs_per_day: 10, price_per_cigarette: 1000 }], hours: [{ hour: 16, total: 5, passed: 2, smoked: 1, ongoing: 1 }], start: '2026-09-01', end: '2026-09-07', timezone: 'Asia/Makassar' })).toString();
  assert.ok(populated.includes('Rp 10.000 \\(estimasi\\)'));
  assert.match(populated, /16\.00 - 17\.00/);
});

function fixture({ authenticated = true, broken = false, malformed = false, exportRows = null, cravingRows = [] } = {}) {
  const calls = [], clients = [];
  const today = domain.localDate(new Date(), 'Asia/Makassar');
  const defaults = [{ log_date: today, cigarettes: 0, reported: true, baseline_cigs_per_day: 10, price_per_cigarette: 1000 }];
  const db = {
    from: table => {
      const query = {
        select(value) { calls.push(['select', table, value]); return this; },
        eq(key, value) { calls.push(['eq', table, key, value]); return this; },
        gte(key, value) { calls.push(['gte', table, key, value]); return this; },
        lte(key, value) { calls.push(['lte', table, key, value]); return this; },
        lt(key, value) { calls.push(['lt', table, key, value]); return this; },
        order(key) { calls.push(['order', table, key]); return this; },
        limit(count) { calls.push(['limit', table, count]); return this; },
        range(start, end) { calls.push(['range', table, start, end]); this.offset = start; this.end = end; return this; },
        maybeSingle: async () => ({ data: { timezone: 'Asia/Makassar' }, error: null }),
        then(resolve, reject) { return Promise.resolve({ data: table === 'daily_logs' ? exportRows ?? defaults : cravingRows.slice(this.offset ?? 0, (this.end ?? 499) + 1), error: broken ? { message: 'SECRET DATABASE ERROR' } : null }).then(resolve, reject); },
      };
      return query;
    },
    rpc: async (name, args) => {
      calls.push(['rpc', name, args]);
      const result = {
        daily_series: Array.from({ length: args.p_days ?? 7 }, (_, index) => ({ day: domain.dateBefore(today, (args.p_days ?? 7) - index - 1), cigarettes: index === 0 ? 0 : null, baseline_cigs_per_day: index === 0 ? 10 : null, price_per_cigarette: index === 0 ? 1000 : null })),
        craving_by_hour: [], craving_by_trigger: [], journey_summary: [{ days_logged_7: 1, days_logged: 1, avoided: 10, saved: 10000, estimate_days: 1, smoke_free_days: 1 }],
      }[name];
      return { data: malformed && name === 'daily_series' ? [] : result, error: broken ? { message: 'SECRET DATABASE ERROR' } : null };
    },
  };
  const mocks = {
    '@/shared/server/http': { ...http, verifiedUser: async () => { if (!authenticated) throw new http.HttpError(401, 'Masuk kembali'); return { id: 'verified-owner' }; } },
    '@supabase/supabase-js': { createClient: (...args) => { clients.push(args); return db; } },
  };
  const server = load('src/features/charts/server.ts', mocks);
  const apiMocks = { ...mocks, '@/features/charts/server': server };
  const analyticsRoute = load('src/app/api/journey/analytics/route.ts', apiMocks);
  const exportRoute = load('src/app/api/journey/export/route.ts', apiMocks);
  const request = path => new NextRequest(`http://localhost${path}`, { headers: { Authorization: 'Bearer user-session-token' } });
  return { calls, clients, analytics: path => analyticsRoute.GET(request(path ?? '/api/journey/analytics?days=7')), export: path => exportRoute.GET(request(path ?? '/api/journey/export?days=7&format=csv')) };
}

test('analytics uses verified-user token and invoker RPCs; identifiers and unbounded periods are rejected', async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.invalid'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-fixture';
    const f = fixture(), response = await f.analytics();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const payload = await response.json();
    assert.equal(payload.series.length, 7);
    assert.equal(payload.series[0].cigarettes, 0);
    assert.equal(payload.series[1].cigarettes, null);
    assert.equal(f.clients[0][1], 'public-test-fixture');
    assert.equal(f.clients[0][2].global.headers.Authorization, 'Bearer user-session-token');
    assert.ok(f.calls.some(call => call[0] === 'eq' && call[2] === 'user_id' && call[3] === 'verified-owner'));
    assert.equal(f.calls.filter(call => call[0] === 'rpc').length, 4);
    assert.ok(f.calls.filter(call => call[0] === 'rpc').every(call => !('p_user' in call[2])));
    for (const query of ['days=999', 'days=-1', 'days=7&user_id=victim', 'days=7&days=30']) assert.equal((await f.analytics('/api/journey/analytics?' + query)).status, 400);
    assert.equal((await fixture({ authenticated: false }).analytics()).status, 401);
    const failure = await fixture({ broken: true }).analytics();
    assert.equal(failure.status, 503); assert.doesNotMatch(await failure.text(), /SECRET/);
    assert.equal((await fixture({ malformed: true }).analytics()).status, 503);
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousAnon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnon;
  }
});

test('exports enforce ownership, local-date window and record cap, and never cache private files', async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.invalid'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-fixture';
    const f = fixture(), response = await f.export();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('content-disposition'), /^attachment; filename="nivo-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv"$/);
    const owners = f.calls.filter(call => call[0] === 'eq' && ['daily_logs', 'craving_events'].includes(call[1]));
    assert.ok(owners.length >= 2); assert.ok(owners.every(call => call[2] === 'user_id' && call[3] === 'verified-owner'));
    assert.ok(f.calls.some(call => call[0] === 'range' && call[2] === 0 && call[3] === 499));
    assert.ok(f.calls.some(call => call[0] === 'lte' && call[2] === 'log_date'));
    const pdf = await f.export('/api/journey/export?days=30&format=pdf');
    assert.equal(pdf.status, 200); assert.equal(pdf.headers.get('content-type'), 'application/pdf');
    assert.match(Buffer.from(await pdf.arrayBuffer()).toString(), /^%PDF-1\.4/);
    assert.equal((await fixture({ authenticated: false }).export()).status, 401);
    assert.equal((await f.export('/api/journey/export?days=366&format=csv')).status, 400);
    assert.equal((await f.export('/api/journey/export?days=7&format=html')).status, 400);
    assert.equal((await f.export('/api/journey/export?days=7&format=csv&user_id=victim')).status, 400);
    const at = new Date().toISOString();
    const excess = Array.from({ length: 5001 }, (_, index) => ({ id: String(index), occurred_at: at, intensity: 1, trigger: '', outcome: 'passed', duration_sec: 1, note: '', source: 'sos' }));
    assert.equal((await fixture({ cravingRows: excess }).export()).status, 413);
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousAnon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnon;
  }
});
