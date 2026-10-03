'use client';
import { useEffect, useState } from 'react';
import { useCompactLayout } from '@/shared/hooks/use-compact-layout';
import { PageNavigation } from '@/components/ui/page-navigation';
import { authenticatedRequest } from '@/shared/api/client';
import { Panel, StateNotice } from '@/components/ui/nivo';

type Record = { id: string; date: string; cigarette_count: number; money_spent: number | null };
export default function LegacyRecords() {
  const compact = useCompactLayout(),
    perPage = compact ? 3 : 7;
  const [page, setPage] = useState(0);
  const [records, setRecords] = useState<Record[]>([]),
    [next, setNext] = useState<number | null>(0);
  const [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState('');
  const pages = Math.ceil(records.length / perPage);
  const visible = records.slice(page * perPage, page * perPage + perPage);
  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, pages - 1)));
  }, [pages]);
  const load = async () => {
    if (busy || next === null) return;
    setBusy(true);
    setError('');
    try {
      const result = await authenticatedRequest('/api/journey/legacy?offset=' + next);
      setRecords((current) => [...current, ...result.records]);
      setPage(Math.floor(records.length / perPage));
      setNext(result.nextOffset);
      setLoaded(true);
    } catch {
      setError('Catatan terdahulu belum dapat dimuat. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Catatan terdahulu">
      <p className="nivo-caption">
        Catatan konsumsi dari versi sebelumnya tetap tersedia untuk dibaca. Catatan ini belum
        digabungkan ke grafik dan estimasi perjalanan baru.
      </p>
      {error && <StateNotice error>{error}</StateNotice>}
      {loaded && !records.length && <p>Belum ada catatan konsumsi dari versi sebelumnya.</p>}
      {records.length > 0 && (
        <div className="nivo-wide-only overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Riwayat konsumsi terdahulu</caption>
            <thead>
              <tr>
                <th className="p-3">Tanggal tersimpan</th>
                <th className="p-3">Jumlah batang</th>
                <th className="p-3">Pengeluaran tersimpan</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((record) => (
                <tr key={record.id}>
                  <td className="p-3">{record.date}</td>
                  <td className="p-3">{record.cigarette_count ?? 'Belum tercatat'}</td>
                  <td className="p-3">
                    {record.money_spent == null
                      ? 'Belum tercatat'
                      : new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          maximumFractionDigits: 0,
                        }).format(record.money_spent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {compact && records.length > 0 && (
        <ul className="nivo-stack" aria-label="Riwayat konsumsi terdahulu">
          {visible.map((record) => (
            <li key={record.id} className="nivo-glass p-4">
              <time dateTime={record.date} className="font-medium">
                {record.date}
              </time>
              <p className="nivo-caption mt-2">
                {record.cigarette_count == null
                  ? 'Belum tercatat'
                  : `${record.cigarette_count} batang`}
              </p>
              <p className="nivo-caption">
                Pengeluaran:{' '}
                {record.money_spent == null
                  ? 'belum tercatat'
                  : `Rp${record.money_spent.toLocaleString('id-ID')}`}
              </p>
            </li>
          ))}
        </ul>
      )}
      <PageNavigation
        label="Halaman catatan terdahulu"
        page={page}
        pages={pages}
        onChange={setPage}
      />
      {next !== null && (
        <button className="nivo-action nivo-action-secondary" onClick={load} disabled={busy}>
          {busy ? 'Memuat…' : loaded ? 'Muat lebih banyak catatan' : 'Lihat catatan terdahulu'}
        </button>
      )}
    </Panel>
  );
}
