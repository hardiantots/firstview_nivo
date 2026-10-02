'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  percentage: number | null;
  label: string;
  color?: string;
  className?: string;
}

const ProgressRing = ({
  percentage,
  label,
  color = 'hsl(var(--primary))',
  className,
}: ProgressRingProps) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const value =
    percentage === null || !Number.isFinite(percentage)
      ? null
      : Math.max(0, Math.min(100, percentage));
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (ready ? (value ?? 0) : 0) / 100);

  return (
    <svg
      viewBox="0 0 120 120"
      className={cn('nivo-progress-ring', className)}
      role="img"
      aria-label={`${label}: ${value === null ? 'belum ada hasil' : `${Math.round(value)} persen`}`}
    >
      <circle
        cx="60"
        cy="60"
        r={radius}
        strokeWidth="9"
        stroke="hsl(var(--border) / .7)"
        fill="none"
      />
      {value !== null && (
        <circle
          className="nivo-progress-ring-value"
          cx="60"
          cy="60"
          r={radius}
          strokeWidth="9"
          stroke={color}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 60 60)"
        />
      )}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        fontSize="22"
        fontWeight="600"
        fill="hsl(var(--foreground))"
      >
        {value === null ? '—' : `${Math.round(value)}%`}
      </text>
    </svg>
  );
};

export default ProgressRing;
