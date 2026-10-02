import ProgressRing from '@/components/ui/progress-ring';

export function Ring({
  value,
  label,
  hint,
  tone = 'primary',
  className,
}: {
  value: number | null;
  label: string;
  hint?: string;
  tone?: 'primary' | 'secondary';
  className?: string;
}) {
  return (
    <figure className="flex min-w-0 flex-col items-center gap-2 text-center">
      <ProgressRing
        percentage={value}
        label={label}
        color={`hsl(var(--${tone}))`}
        className={className}
      />
      <figcaption className="text-sm font-medium">{label}</figcaption>
      {hint && <p className="nivo-caption">{hint}</p>}
    </figure>
  );
}
