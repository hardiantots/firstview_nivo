import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { CravingLogRow } from '@/lib/db/cravingLogs';

export type CravingHistoryItem = {
  id: string;
  emotion: string;
  date: string;
  intensity: number;
  location: string;
  situation: string;
};

type HistoryRow = Pick<
  CravingLogRow,
  'id' | 'mood' | 'occurred_at' | 'intensity' | 'location' | 'situation'
>;

export function toCravingHistoryItem(row: HistoryRow): CravingHistoryItem {
  const date = row.occurred_at ? new Date(row.occurred_at) : null;
  return {
    id: row.id,
    emotion: row.mood || 'Tidak disebutkan',
    date:
      date && Number.isFinite(date.getTime())
        ? format(date, 'EEEE, d MMM yyyy HH:mm', { locale: id })
        : 'Tanggal belum tersedia',
    intensity: row.intensity ?? 0,
    location: row.location || '-',
    situation: row.situation || '-',
  };
}
