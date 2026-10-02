const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./sdd34-harness.cjs');
const { beginCravingFlow, cravingFlowReducer, cravingResultAction, breathingPhase } = load('src/shared/craving/flow.ts');
const { secondsRemaining } = load('src/shared/hooks/use-countdown.ts');
const { occurrenceUtc, localDateTime, quickOccurrence, occurrenceCaption } = load('src/shared/craving/occurrence.ts');
const { lessonForDay } = load('src/shared/craving/lesson.ts');
const { emptyJourney, reduceJourney, localDate } = load('src/shared/journey/domain.ts');

test('SOS can save every outcome immediately, including intensity zero and a smoking outcome', () => {
  const at = Date.parse('2026-09-30T15:30:00Z');
  for (const outcome of ['passed', 'ongoing', 'smoked']) {
    let flow = beginCravingFlow(at);
    flow = cravingFlowReducer(flow, { type: 'intensity', value: 0 });
    flow = cravingFlowReducer(flow, { type: 'trigger', value: 'Kopi' });
    flow = cravingFlowReducer(flow, { type: 'note', value: 'Ruang untuk jeda' });
    flow = cravingFlowReducer(flow, { type: 'outcome', value: outcome });
    const action = cravingResultAction(flow, at + 2000);
    assert.equal(action.durationSec, 2);
    assert.equal(action.occurredAt, '2026-09-30T15:30:00.000Z');
    assert.equal(action.intensity, 0);
    const state = reduceJourney(emptyJourney(), action, '10000000-0000-4000-8000-000000000001', new Date(at + 2000));
    assert.equal(state.cravingEvents[0].outcome, outcome);
    assert.equal(state.cravingEvents[0].note, 'Ruang untuk jeda');
    assert.equal(state.daily['2026-09-30'], undefined, 'SOS does not silently alter daily totals');
  }
  assert.throws(() => cravingResultAction(beginCravingFlow(at), at + 1000), /Pilih hasil/);
});

test('SOS deadline catches elapsed background time without depending on ticks; saved flow cannot duplicate', () => {
  const start = 1000000;
  let flow = beginCravingFlow(start);
  flow = cravingFlowReducer(flow, { type: 'step', step: 'practice' });
  flow = cravingFlowReducer(flow, { type: 'start_practice', at: start, seconds: 300 });
  assert.equal(secondsRemaining(flow.endAt, start + 499), 300);
  assert.equal(secondsRemaining(flow.endAt, start + 180001), 120);
  assert.equal(secondsRemaining(flow.endAt, start + 400000), 0);
  flow = cravingFlowReducer(flow, { type: 'step', step: 'result' });
  assert.equal(flow.step, 'result', 'result is reachable before a timer is finished');
  flow = cravingFlowReducer(flow, { type: 'outcome', value: 'ongoing' });
  const beforeSave = structuredClone(flow);
  // A failed network save dispatches no saved transition: all values remain available.
  assert.equal(cravingResultAction(flow, start + 45000).outcome, 'ongoing');
  assert.deepEqual(flow, beforeSave);
  flow = cravingFlowReducer(flow, { type: 'saved' });
  assert.equal(flow.endAt, null);
  assert.deepEqual(cravingFlowReducer(flow, { type: 'outcome', value: 'smoked' }), flow);
  const restarted = cravingFlowReducer(flow, { type: 'restart', at: start + 500000 });
  assert.equal(restarted.saved, false);
  assert.equal(restarted.startedAt, start + 500000);
  assert.equal(restarted.outcome, null);
});

test('breathing text follows four-in/six-out cycle and duration is bounded after long sessions', () => {
  assert.deepEqual(breathingPhase(180, 180), { phase: 'inhale', label: 'Tarik napas perlahan', count: 4, seconds: 4 });
  assert.deepEqual(breathingPhase(180, 176), { phase: 'exhale', label: 'Hembuskan perlahan', count: 6, seconds: 6 });
  assert.equal(breathingPhase(180, 170).phase, 'inhale');
  const flow = cravingFlowReducer(beginCravingFlow(0), { type: 'outcome', value: 'passed' });
  assert.equal(cravingResultAction(flow, 10 * 86400000).durationSec, 86400);
});

test('slip wall-time conversion respects journey timezone, midnight and unavailable daylight-saving hours', () => {
  assert.equal(occurrenceUtc('2026-10-02T00:30', 'Asia/Makassar'), '2026-10-01T16:30:00.000Z');
  const now = Date.parse('2026-10-01T16:30:00Z');
  assert.equal(localDateTime(now, 'Asia/Makassar'), '2026-10-02T00:30');
  assert.equal(localDate(quickOccurrence('earlier', now, 'Asia/Makassar'), 'Asia/Makassar'), '2026-10-01');
  assert.equal(localDateTime(Date.parse(quickOccurrence('yesterday', now, 'Asia/Makassar')), 'Asia/Makassar'), '2026-10-01T00:30');
  assert.match(occurrenceCaption('2026-10-01T16:30:00Z', 'Asia/Makassar'), /00[.:]30/);
  assert.throws(() => occurrenceUtc('2026-02-30T12:00', 'Asia/Makassar'), /valid/);
  assert.throws(() => occurrenceUtc('2026-10-02T24:00', 'Asia/Makassar'), /valid/);
  assert.throws(() => occurrenceUtc('2026-03-08T02:30', 'America/New_York'), /tidak tersedia/);
});

test('linked smoking SOS and slip preserve one event relationship and reject duplicate or unrelated references', () => {
  const at = new Date('2026-10-01T02:00:00Z'), cravingId = '20000000-0000-4000-8000-000000000001', slipId = '20000000-0000-4000-8000-000000000002';
  const flow = cravingFlowReducer(beginCravingFlow(at.getTime()), { type: 'outcome', value: 'smoked' });
  const state = reduceJourney(emptyJourney(), cravingResultAction(flow, at.getTime() + 60000), cravingId, new Date(at.getTime() + 60000));
  const slip = { type: 'slip', occurredAt: at.toISOString(), count: 1, trigger: 'Kopi', nextStep: 'Istirahat dulu', cravingEventId: cravingId };
  const updated = reduceJourney(state, slip, slipId, new Date(at.getTime() + 120000));
  assert.equal(updated.slips[0].cravingEventId, cravingId);
  assert.equal(updated.cravingEvents.length, 1);
  assert.throws(() => reduceJourney(updated, slip, '20000000-0000-4000-8000-000000000003', new Date(at.getTime() + 180000)), /sudah dicatat/);
  assert.throws(() => reduceJourney(state, { ...slip, cravingEventId: '20000000-0000-4000-8000-000000000099' }, slipId, at), /tidak ditemukan/);
  assert.deepEqual(updated.daily, {});
});

test('daily lesson rotates deterministically and completion is limited to once per local day', () => {
  const first = lessonForDay('2026-09-30'), second = lessonForDay('2026-10-01');
  assert.notEqual(first.id, second.id);
  assert.equal(first.id, lessonForDay('2026-09-30').id);
  assert.ok(first.durationSec >= 120 && first.durationSec <= 180);
  assert.throws(() => lessonForDay('2026-02-30'));
  const at = new Date('2026-09-30T16:30:00Z');
  const state = reduceJourney(emptyJourney(), { type: 'lesson', lessonId: first.id }, '30000000-0000-4000-8000-000000000001', at);
  const updated = reduceJourney(state, { type: 'lesson', lessonId: second.id }, '30000000-0000-4000-8000-000000000002', at);
  assert.equal(updated.lessonCompletions.length, 1);
  assert.equal(updated.lessonCompletions[0].date, '2026-10-01');
});
