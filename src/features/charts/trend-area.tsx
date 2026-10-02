'use client';
import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartDay, DailyPoint, displayDay } from './data';

function DeltaTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DailyPoint }[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point || point.cigarettes === null) return null;
  const difference =
    point.baseline_cigs_per_day === null ? null : point.cigarettes - point.baseline_cigs_per_day;
  return (
    <div className="max-w-[230px] rounded-xl border border-border bg-white p-3 text-sm shadow-sm">
      <p className="font-medium">
        {displayDay(point.day)}: {point.cigarettes} batang
      </p>
      {difference !== null && (
        <p className="mt-1 text-muted-foreground">
          {difference === 0
            ? 'Sama dengan kebiasaan awal'
            : `${Math.abs(difference)} batang ${difference < 0 ? 'lebih sedikit' : 'lebih banyak'} dari kebiasaan awal pada catatan ini`}
        </p>
      )}
    </div>
  );
}

export function TrendArea({ data }: { data: DailyPoint[] }) {
  const reducedMotion = useReducedMotion();
  const gradientId = 'nivo-trend-' + useId().replace(/:/g, '');
  const reported = data.filter((point) => point.cigarettes !== null);
  if (!reported.length)
    return <p className="nivo-caption py-6">Catat hari ini, grafikmu mulai dari sini.</p>;
  if (reported.length < 3)
    return (
      <div className="grid gap-3 py-3 sm:grid-cols-2">
        {reported.map((point) => (
          <div className="rounded-xl bg-primary/5 p-4" key={point.day}>
            <p className="text-sm text-muted-foreground">{displayDay(point.day)}</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
              {point.cigarettes} batang
            </p>
          </div>
        ))}
        <p className="nivo-caption sm:col-span-2">
          Tren mulai ditampilkan setelah minimal 3 hari tercatat.
        </p>
      </div>
    );
  return (
    <figure>
      <div className="h-52 min-w-0 w-full sm:h-60" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <AreaChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.015} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="day"
              tickFormatter={chartDay}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[0, (maximum: number) => Math.max(5, maximum)]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <Tooltip content={<DeltaTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
            <Area
              type="linear"
              dataKey="cigarettes"
              connectNulls={false}
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={{ r: 2.5, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 4 }}
              isAnimationActive={reducedMotion === false}
              animationDuration={450}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="nivo-caption">
        {reported.length} dari {data.length} hari tercatat. Celah berarti belum tercatat, bukan 0
        batang. Rincian angka tersedia di catatan di bawah.
      </figcaption>
    </figure>
  );
}
