'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PageNavigation({
  label,
  page,
  pages,
  onChange,
  unit = 'Halaman',
  previousName,
  nextName,
}: {
  label: string;
  page: number;
  pages: number;
  onChange: (page: number) => void;
  unit?: string;
  previousName?: string;
  nextName?: string;
}) {
  if (pages < 2) return null;
  return (
    <nav className="nivo-pagination" aria-label={label}>
      <button
        type="button"
        className="nivo-action nivo-action-secondary"
        disabled={page <= 0}
        aria-label={previousName ? `Sebelumnya: ${previousName}` : 'Sebelumnya'}
        onClick={() => onChange(Math.max(0, page - 1))}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Sebelumnya
      </button>
      <span role="status" aria-live="polite" aria-atomic="true">
        <span className="sr-only">{unit} </span>
        {page + 1}
        <span aria-hidden="true"> / </span>
        <span className="sr-only"> dari </span>
        {pages}
      </span>
      <button
        type="button"
        className="nivo-action nivo-action-secondary"
        disabled={page >= pages - 1}
        aria-label={nextName ? `Berikutnya: ${nextName}` : 'Berikutnya'}
        onClick={() => onChange(Math.min(pages - 1, page + 1))}
      >
        Berikutnya
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
