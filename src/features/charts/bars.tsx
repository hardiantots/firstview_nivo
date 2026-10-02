'use client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { hourLabel, HourPoint, TriggerPoint } from './data';

export function HourBars({ data }: { data: HourPoint[] }) {
  const full = Array.from({ length: 24 }, (_, hour) => ({ hour, total: data.find(point => point.hour === hour)?.total ?? 0 }));
  return <div className="h-52 min-w-0 w-full sm:h-60" aria-hidden="true"><ResponsiveContainer width="100%" height="100%" debounce={80}>
    <BarChart data={full} margin={{ top: 12, right: 8, left: -12, bottom: 4 }}>
      <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
      <XAxis dataKey="hour" tickFormatter={hour => String(hour).padStart(2, '0')} interval={3} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
      <YAxis allowDecimals={false} width={36} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
      <Tooltip labelFormatter={hour => `Pukul ${hourLabel(Number(hour))}`} formatter={value => [`${value} kejadian`, 'Tercatat']} contentStyle={{ borderRadius: 12, fontSize: 13 }} />
      <Bar dataKey="total" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
    </BarChart>
  </ResponsiveContainer></div>;
}

export function TriggerBars({ data }: { data: TriggerPoint[] }) {
  return <div className="h-60 min-w-0 w-full" aria-hidden="true"><ResponsiveContainer width="100%" height="100%" debounce={80}>
    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
      <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
      <YAxis type="category" dataKey="trigger" width={84} tickFormatter={trigger => String(trigger).length > 12 ? String(trigger).slice(0, 11) + '…' : String(trigger)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
      <Tooltip formatter={value => [`${value} kejadian`, 'Tercatat']} contentStyle={{ borderRadius: 12, maxWidth: 230, overflowWrap: 'anywhere', fontSize: 13 }} />
      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} isAnimationActive={false} />
    </BarChart>
  </ResponsiveContainer></div>;
}
