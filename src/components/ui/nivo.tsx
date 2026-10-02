import Link from 'next/link';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <header className="nivo-page-title">{eyebrow && <p className="nivo-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{children && <p className="nivo-description">{children}</p>}</header>;
}

export function Panel({ title, children, className, tone = 'default' }: { title: string; children: ReactNode; className?: string; tone?: 'default' | 'soft' | 'plain'; eyebrow?: string }) {
  const tones = { default: '', soft: 'nivo-panel-soft', plain: 'nivo-panel-plain' };
  return <section className={cn('nivo-panel', tones[tone], className)}><header className="nivo-panel-heading"><h2>{title}</h2></header>{children}</section>;
}

export function StateNotice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <p role={error ? 'alert' : 'status'} className={cn('nivo-notice', error && 'nivo-notice-error')}>{children}</p>;
}

export function ActionLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <Link href={href} className={cn('nivo-action', secondary && 'nivo-action-secondary')}>{children}</Link>;
}
