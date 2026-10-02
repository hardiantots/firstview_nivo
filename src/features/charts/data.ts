import { z } from 'zod';
import { estimatedSavings, JourneyState, localDate } from '@/shared/journey/domain';

export const analyticsDaysSchema = z.enum(['7', '30', '90']).default('7').transform(Number);
const total = z.number().int().nonnegative();
const nullableAmount = z.number().nonnegative().nullable();
export const dailyPointSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cigarettes: z.number().int().min(0).max(200).nullable(),
  baseline_cigs_per_day: z.number().min(0).max(200).nullable(),
  price_per_cigarette: z.number().min(0).max(1000000).nullable(),
});
export const hourPointSchema = z.object({ hour: total.max(23), total, passed: total, smoked: total, ongoing: total });
export const triggerPointSchema = z.object({ trigger: z.string().max(120), total });
export const summarySchema = z.object({
  days_logged_7: total.max(7), days_logged: total,
  avoided: nullableAmount, saved: nullableAmount, estimate_days: total,
  smoke_free_days: total,
});
export type DailyPoint = { day: string; cigarettes: number | null; baseline_cigs_per_day: number | null; price_per_cigarette: number | null };
export type HourPoint = { hour: number; total: number; passed: number; smoked: number; ongoing: number };
export type TriggerPoint = { trigger: string; total: number };
export type AnalyticsData = {
  days: number; timezone: string; series: DailyPoint[]; hours: HourPoint[]; triggers: TriggerPoint[];
  summary: { days_logged_7: number; days_logged: number; avoided: number | null; saved: number | null; estimate_days: number; smoke_free_days: number };
};

export function periodSummary(series: DailyPoint[]) {
  const logged = series.filter(point => point.cigarettes !== null);
  const covered = logged.filter(point => point.baseline_cigs_per_day !== null && point.price_per_cigarette !== null);
  return {
    logged: logged.length,
    average: logged.length ? logged.reduce((sum, point) => sum + point.cigarettes!, 0) / logged.length : null,
    zeroDays: logged.filter(point => point.cigarettes === 0).length,
    estimateDays: covered.length,
    avoided: covered.length ? covered.reduce((sum, point) => sum + Math.max(0, point.baseline_cigs_per_day! - point.cigarettes!), 0) : null,
    saved: covered.length ? covered.reduce((sum, point) => sum + Math.max(0, point.baseline_cigs_per_day! - point.cigarettes!) * point.price_per_cigarette!, 0) : null,
  };
}

export function cravingSummary(hours: HourPoint[]) {
  const result = hours.reduce((sum, point) => ({ total: sum.total + point.total, passed: sum.passed + point.passed, smoked: sum.smoked + point.smoked, ongoing: sum.ongoing + point.ongoing }), { total: 0, passed: 0, smoked: 0, ongoing: 0 });
  const completed = result.passed + result.smoked;
  const busiest = [...hours].sort((a, b) => b.total - a.total || a.hour - b.hour)[0];
  return { ...result, completed, passedPercentage: completed ? result.passed / completed * 100 : null, busiestHour: result.total >= 5 && busiest?.total ? busiest.hour : null };
}

export function journeyProgress(state: JourneyState, today: string) {
  const records = Object.values(state.daily).filter(record => record.date <= today && record.status === 'reported' && record.count !== null);
  const smokedDates = new Set([...state.slips.map(slip => localDate(slip.occurredAt, state.timezone)), ...(state.cravingEvents ?? []).filter(event => event.outcome === 'smoked').map(event => localDate(event.occurredAt, state.timezone))]);
  const zeroDays = records.filter(record => record.count === 0 && !smokedDates.has(record.date)).length;
  const covered = records.filter(record => estimatedSavings(record) !== null);
  return {
    zeroDays, logged: records.length, estimateDays: covered.length,
    saved: covered.length ? covered.reduce((sum, record) => sum + estimatedSavings(record)!, 0) : null,
    avoided: covered.length ? covered.reduce((sum, record) => sum + Math.max(0, record.baseline!.cigarettesPerDay - record.count!), 0) : null,
  };
}

export const rupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
export const displayDay = (day: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'));
export const chartDay = (day: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'));
export const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}.00`;
