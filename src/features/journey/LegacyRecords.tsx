'use client';
import { useState } from 'react';
import { authenticatedRequest } from '@/shared/journey/client';
import { Panel, StateNotice } from '@/components/ui/nivo';

type Record = { id: string; date: string; cigarette_count: number; money_spent: number | null };
export default function LegacyRecords() {
  const [records, setRecords] = useState<Record[]>([]), [next, setNext] = useState<number | null>(0);
  const [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false), [error, setError] = useState('');
  const load = async () => {
    if (busy || next === null) return;
    setBusy(true); setError('');
    try {
      const result = await authenticatedRequest('/api/journey/legacy?offset=' + next);
      setRecords(current => [...current, ...result.records]); setNext(result.nextOffset); setLoaded(true);
    } catch { setError('Catatan terdahulu belum dapat dimuat. Silakan coba lagi.'); }
    finally { setBusy(false); }
  };
  return <Panel title="Catatan terdahulu">
    <p className="nivo-caption">Catatan konsumsi dari versi sebelumnya tetap tersedia untuk dibaca. Catatan ini belum digabungkan ke grafik dan estimasi perjalanan baru.</p>
    {error && <StateNotice error>{error}</StateNotice>}
    {loaded && !records.length && <p>Belum ada catatan konsumsi dari versi sebelumnya.</p>}
    {records.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Riwayat konsumsi terdahulu</caption><thead><tr><th className="p-3">Tanggal tersimpan</th><th className="p-3">Jumlah batang</th><th className="p-3">Pengeluaran tersimpan</th></tr></thead><tbody>{records.map(record => <tr key={record.id}><td className="p-3">{record.date}</td><td className="p-3">{record.cigarette_count ?? 'Belum tercatat'}</td><td className="p-3">{record.money_spent == null ? 'Belum tercatat' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(record.money_spent)}</td></tr>)}</tbody></table></div>}
    {next !== null && <button className="nivo-action nivo-action-secondary" onClick={load} disabled={busy}>{busy ? 'Memuat…' : loaded ? 'Muat catatan berikutnya' : 'Lihat catatan terdahulu'}</button>}
  </Panel>;
}
