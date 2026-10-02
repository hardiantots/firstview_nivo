'use client';

import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartDay, displayDay, rupiah } from '@/features/charts/data';
import type { OutcomePoint, SavingsPoint } from './dashboard-data';

export function SavingsChart({ data }: { data: SavingsPoint[] }) {
  const reducedMotion = useReducedMotion();
  const gradientId = `nivo-savings-${useId().replace(/:/g, '')}`;
  return (
    <div className="nivo-chart-canvas" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <AreaChart data={data} margin={{ top: 12, right: 10, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            tickFormatter={chartDay}
            axisLine={false}
            tickLine={false}
            minTickGap={32}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            width={46}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value)
            }
            domain={[0, (maximum: number) => Math.max(1000, maximum)]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            labelFormatter={(day) => displayDay(String(day))}
            formatter={(value) => [rupiah(Number(value)), 'Akumulasi estimasi']}
            contentStyle={{ borderRadius: 12, fontSize: 13, background: 'hsl(var(--card))' }}
          />
          <Area
            dataKey="cumulative"
            type="linear"
            connectNulls={false}
            stroke="hsl(var(--orange-ink))"
            fill={`url(#${gradientId})`}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 4 }}
            isAnimationActive={reducedMotion === false}
            animationDuration={450}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OutcomeChart({ data }: { data: OutcomePoint[] }) {
  const reducedMotion = useReducedMotion();
  const total = data.reduce((sum, point) => sum + point.total, 0);
  const visible = data.filter((point) => point.total > 0);
  return (
    <div className="nivo-chart-canvas nivo-outcome-canvas" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <PieChart>
          <Pie
            data={visible}
            dataKey="total"
            nameKey="label"
            innerRadius="62%"
            outerRadius="83%"
            paddingAngle={visible.length > 1 ? 3 : 0}
            stroke="hsl(var(--card))"
            isAnimationActive={reducedMotion === false}
            animationDuration={450}
            animationBegin={0}
            animationEasing="ease-out"
          >
            {visible.map((point) => (
              <Cell key={point.outcome} fill={point.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value} kejadian`]}
            contentStyle={{ borderRadius: 12, fontSize: 13, background: 'hsl(var(--card))' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="nivo-outcome-center">
        <strong>{total}</strong>
        <span>kejadian</span>
      </div>
    </div>
  );
}
