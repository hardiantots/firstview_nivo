import {
  dateBefore,
  estimatedSavings,
  localDate,
  type JourneyState,
} from '@/shared/journey/domain';
import { journeyProgress, periodSummary, type DailyPoint } from '@/features/charts/data';

export type DashboardPeriod = 7 | 30;
export type SavingsPoint = { day: string; saved: number | null; cumulative: number | null };
export const cravingOutcomes = [
  { outcome: 'passed', label: 'Mereda', color: 'hsl(var(--primary))' },
  { outcome: 'ongoing', label: 'Masih kuat', color: 'hsl(var(--secondary))' },
  { outcome: 'smoked', label: 'Merokok', color: 'hsl(var(--muted-foreground))' },
] as const;
export type OutcomePoint = (typeof cravingOutcomes)[number] & { total: number };

export function dashboardData(state: JourneyState, today: string, days: DashboardPeriod) {
  const series: DailyPoint[] = Array.from({ length: days }, (_, index) => {
    const day = dateBefore(today, days - index - 1);
    const record = state.daily[day];
    const reported = record?.status === 'reported' && record.count !== null;
    return {
      day,
      cigarettes: reported ? record.count : null,
      baseline_cigs_per_day: reported ? (record.baseline?.cigarettesPerDay ?? null) : null,
      price_per_cigarette: reported ? (record.baseline?.pricePerCigarette ?? null) : null,
    };
  });
  let cumulative = 0;
  const savings: SavingsPoint[] = series.map(({ day }) => {
    const record = state.daily[day];
    const saved = record ? estimatedSavings(record) : null;
    if (saved !== null) cumulative += saved;
    return { day, saved, cumulative: saved === null ? null : cumulative };
  });
  const totals = { passed: 0, ongoing: 0, smoked: 0 };
  for (const event of state.cravingEvents ?? []) {
    const date = localDate(event.occurredAt, state.timezone);
    if (date >= series[0].day && date <= today) totals[event.outcome]++;
  }
  const outcomes: OutcomePoint[] = cravingOutcomes.map((item) => ({
    ...item,
    total: totals[item.outcome],
  }));
  const progress = journeyProgress(state, today);
  const milestones = [7, 14, 30, 60, 90, 180, 365];
  const nextMilestone =
    milestones.find((goal) => goal > progress.zeroDays) ??
    (Math.floor(progress.zeroDays / 30) + 1) * 30;
  const weekLogged = series.slice(-7).filter((point) => point.cigarettes !== null).length;
  return {
    series,
    savings,
    outcomes,
    progress,
    nextMilestone,
    milestonePercentage: (progress.zeroDays / nextMilestone) * 100,
    weekLogged,
    period: periodSummary(series),
    cravingTotal: outcomes.reduce((sum, item) => sum + item.total, 0),
  };
}
