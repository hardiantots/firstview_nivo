export function Ring({ value, label, hint }: { value: number | null; label: string; hint?: string }) {
  const percentage = value === null ? null : Math.max(0, Math.min(100, Math.round(value)));
  const radius = 48, circumference = 2 * Math.PI * radius;
  return <figure className="flex min-w-0 flex-col items-center gap-2 text-center">
    <svg viewBox="0 0 120 120" className="w-28 max-w-full" role="img" aria-label={`${label}: ${percentage === null ? 'belum ada hasil' : percentage + ' persen'}`}>
      <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
      {percentage !== null && <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth="9" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percentage / 100)} transform="rotate(-90 60 60)" />}
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fill="hsl(var(--foreground))" fontSize="22" fontWeight="600">{percentage === null ? '—' : `${percentage}%`}</text>
    </svg>
    <figcaption className="text-sm font-medium">{label}</figcaption>{hint && <p className="nivo-caption">{hint}</p>}
  </figure>;
}
