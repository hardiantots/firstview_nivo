import { z } from 'zod';

export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Tanggal tidak valid');
export const timezoneSchema = z.string().max(80).refine(value => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; } catch { return false; }
}, 'Zona waktu tidak valid');
const text = (max: number) => z.string().trim().min(1).max(max);
const timestamp = z.string().datetime({ offset: true });
export const journeyActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('plan'), timezone: timezoneSchema, targetQuitDate: localDateSchema.nullable(), actualQuitDate: localDateSchema.nullable() }).strict(),
  z.object({ type: z.literal('baseline'), cigarettesPerDay: z.number().min(0).max(200), pricePerCigarette: z.number().min(0).max(1000000) }).strict(),
  z.object({ type: z.literal('daily'), date: localDateSchema, count: z.number().int().min(0).max(200).nullable() }).strict(),
  z.object({ type: z.literal('checkin'), occurredAt: timestamp, trigger: text(120), intensity: z.number().int().min(1).max(5), context: z.string().trim().max(200) }).strict(),
  z.object({ type: z.literal('coping'), trigger: text(120), steps: z.array(text(160)).min(2).max(3) }).strict(),
  z.object({ type: z.literal('coping_feedback'), planId: z.string().uuid(), helped: z.enum(['yes', 'no', 'unsure']) }).strict(),
  z.object({ type: z.literal('slip'), occurredAt: timestamp, count: z.number().int().min(1).max(200), trigger: z.string().trim().max(120), nextStep: text(200) }).strict(),
  z.object({ type: z.literal('preferences'), enabled: z.boolean(), consent: z.boolean(), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), maxPerDay: z.number().int().min(1).max(3), pausedUntil: localDateSchema.nullable(), followupDays: z.array(z.number().int().min(1).max(365)).max(12) }).strict(),
  z.object({ type: z.literal('reminder_answer'), reminderId: text(120), answer: z.enum(['okay', 'difficult', 'skip']) }).strict(),
]);
export type JourneyAction = z.infer<typeof journeyActionSchema>;
export type Baseline = { id: string; effectiveFrom: string; cigarettesPerDay: number; pricePerCigarette: number; createdAt: string };
export type DailyRecord = { date: string; status: 'unreported' | 'reported'; count: number | null; baseline: Baseline | null; createdAt: string; updatedAt: string };
export type JourneyState = {
  schema: 1; timezone: string; targetQuitDate: string | null; actualQuitDate: string | null;
  daily: Record<string, DailyRecord>; baselines: Baseline[];
  checkins: { id: string; occurredAt: string; trigger: string; intensity: number; context: string }[];
  coping: { id: string; trigger: string; steps: string[]; createdAt: string }[];
  feedback: { id: string; planId: string; helped: 'yes' | 'no' | 'unsure'; createdAt: string }[];
  slips: { id: string; occurredAt: string; count: number; trigger: string; nextStep: string }[];
  preferences: { enabled: boolean; consent: boolean; time: string; maxPerDay: number; pausedUntil: string | null; followupDays: number[] };
  answers: { id: string; reminderId: string; answer: 'okay' | 'difficult' | 'skip'; date: string; createdAt: string }[];
  history: { id: string; type: string; createdAt: string; previousTarget?: string | null; previousActual?: string | null; previousDaily?: DailyRecord | null; date?: string }[];
};
export type JourneySnapshot = { revision: number; state: JourneyState; flags?: Record<string, boolean> };
export function emptyJourney(timezone = 'Asia/Makassar'): JourneyState {
  return { schema: 1, timezone, targetQuitDate: null, actualQuitDate: null, daily: {}, baselines: [], checkins: [], coping: [], feedback: [], slips: [], preferences: { enabled: false, consent: false, time: '19:00', maxPerDay: 1, pausedUntil: null, followupDays: [] }, answers: [], history: [] };
}
export function localDate(at: Date | string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(at));
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}
export function phase(state: JourneyState): 'NOT_STARTED' | 'PRE_QUIT' | 'POST_QUIT' {
  return state.actualQuitDate ? 'POST_QUIT' : state.targetQuitDate ? 'PRE_QUIT' : 'NOT_STARTED';
}
export function dayDifference(a: string, b: string) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000); }
export function dateBefore(date: string, days: number) { return new Date(Date.parse(date + 'T12:00:00Z') - days * 86400000).toISOString().slice(0, 10); }
export function dueReminders(state: JourneyState, at = new Date()): { id: string; kind: 'checkin' | 'followup'; date: string }[] {
  const p = state.preferences, date = localDate(at, state.timezone);
  if (!p.enabled || !p.consent || (p.pausedUntil && date <= p.pausedUntil)) return [];
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: state.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
  if (time < p.time) return [];
  const answered = state.answers.filter(a => a.date === date);
  const candidates: { id: string; kind: 'checkin' | 'followup'; date: string }[] = [];
  if (state.actualQuitDate && p.followupDays.includes(dayDifference(date, state.actualQuitDate))) candidates.push({ id: 'followup:' + state.actualQuitDate + ':' + date, kind: 'followup', date });
  candidates.push({ id: 'checkin:' + date, kind: 'checkin', date });
  return candidates.filter(item => !state.answers.some(a => a.reminderId === item.id)).slice(0, Math.max(0, p.maxPerDay - answered.length));
}
export function reduceJourney(previous: JourneyState, input: JourneyAction, id: string, at = new Date()): JourneyState {
  const action = journeyActionSchema.parse(input), state: JourneyState = structuredClone(previous);
  const now = at.toISOString(), today = localDate(at, state.timezone);
  const past = (date: string) => { if (date > today || date < '1970-01-01') throw new Error('Tanggal harus antara 1970 dan hari ini.'); };
  const occurred = (value: string) => { if (new Date(value).getTime() > at.getTime() + 60000 || value < '1970') throw new Error('Waktu kejadian tidak valid.'); };
  switch (action.type) {
    case 'plan': {
      const planToday = localDate(at, action.timezone);
      if (action.actualQuitDate && (action.actualQuitDate > planToday || action.actualQuitDate < '1970-01-01')) throw new Error('Tanggal mulai berhenti harus antara 1970 dan hari ini.');
      if (action.targetQuitDate && action.targetQuitDate < '1970-01-01') throw new Error('Tanggal target tidak valid.');
      state.history.push({ id, type: 'plan', createdAt: now, previousTarget: state.targetQuitDate, previousActual: state.actualQuitDate });
      state.timezone = action.timezone; state.targetQuitDate = action.targetQuitDate; state.actualQuitDate = action.actualQuitDate;
      break;
    }
    case 'baseline': state.baselines.push({ id, effectiveFrom: today, cigarettesPerDay: action.cigarettesPerDay, pricePerCigarette: action.pricePerCigarette, createdAt: now }); break;
    case 'daily': {
      past(action.date);
      const existing = state.daily[action.date];
      state.history.push({ id, type: 'daily', date: action.date, previousDaily: existing || null, createdAt: now });
      // Preserve the original assumption, including null, when a past record is edited.
      const baseline = existing ? existing.baseline : [...state.baselines].reverse().find(b => b.effectiveFrom <= action.date) || null;
      state.daily[action.date] = { date: action.date, status: action.count === null ? 'unreported' : 'reported', count: action.count, baseline, createdAt: existing?.createdAt || now, updatedAt: now };
      break;
    }
    case 'checkin': occurred(action.occurredAt); state.checkins.push({ id, occurredAt: action.occurredAt, trigger: action.trigger, intensity: action.intensity, context: action.context }); break;
    case 'coping': state.coping.push({ id, trigger: action.trigger, steps: action.steps, createdAt: now }); break;
    case 'coping_feedback': if (!state.coping.some(p => p.id === action.planId)) throw new Error('Rencana tidak ditemukan.'); state.feedback.push({ id, planId: action.planId, helped: action.helped, createdAt: now }); break;
    case 'slip': occurred(action.occurredAt); state.slips.push({ id, occurredAt: action.occurredAt, count: action.count, trigger: action.trigger, nextStep: action.nextStep }); break;
    case 'preferences': if (action.enabled && !action.consent) throw new Error('Persetujuan pengingat diperlukan.'); state.preferences = { enabled: action.enabled, consent: action.consent, time: action.time, maxPerDay: action.maxPerDay, pausedUntil: action.pausedUntil, followupDays: [...new Set(action.followupDays)].sort((a, b) => a - b) }; break;
    case 'reminder_answer': if (!dueReminders(state, at).some(r => r.id === action.reminderId)) throw new Error('Pengingat sudah dijawab atau belum waktunya.'); state.answers.push({ id, reminderId: action.reminderId, answer: action.answer, date: today, createdAt: now }); break;
  }
  if (action.type !== 'plan' && action.type !== 'daily') state.history.push({ id, type: action.type, createdAt: now });
  if (JSON.stringify(state).length > 1500000) throw new Error('Batas catatan tercapai. Ekspor dan kelola data sebelum menambahkan lagi.');
  return state;
}
export function estimatedSavings(record: DailyRecord): number | null {
  return record.status !== 'reported' || record.count === null || !record.baseline ? null : Math.max(0, record.baseline.cigarettesPerDay - record.count) * record.baseline.pricePerCigarette;
}
export function triggerPatterns(state: JourneyState) {
  if (state.checkins.length < 3 || new Set(state.checkins.map(c => localDate(c.occurredAt, state.timezone))).size < 2) return [];
  const counts = new Map<string, number>();
  state.checkins.forEach(item => { const key = item.trigger.trim().toLocaleLowerCase('id'); counts.set(key, (counts.get(key) || 0) + 1); });
  return [...counts].sort((a, b) => b[1] - a[1]);
}
