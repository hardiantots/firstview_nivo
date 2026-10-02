'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StateNotice } from '@/components/ui/nivo';

export function JourneyExports({ busy = false }: { busy?: boolean }) {
  const [days, setDays] = useState(30),
    [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null),
    [error, setError] = useState('');
  async function download(format: 'csv' | 'pdf') {
    if (downloading || busy) return;
    setDownloading(format);
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Silakan masuk kembali.');
      const response = await fetch(`/api/journey/export?days=${days}&format=${format}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        const failure = await response.json();
        throw new Error(failure.error || 'Ekspor belum dapat dibuat.');
      }
      const blob = await response.blob(),
        url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const name = response.headers
        .get('content-disposition')
        ?.match(/filename="([a-z0-9.-]+)"/i)?.[1];
      anchor.download = name || `nivo-${days}-hari.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Delayed cleanup lets the browser consume the blob before revoking it.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ekspor belum dapat dibuat.');
    } finally {
      setDownloading(null);
    }
  }
  return (
    <div className="nivo-stack">
      <p className="nivo-caption">
        CSV memuat catatan harian dan kejadian craving. PDF dibuat di server sebagai ringkasan satu
        halaman untuk dibawa saat konsultasi. Data akun dan konsultasi tidak ikut diekspor.
      </p>
      <label className="nivo-field">
        Periode ekspor
        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          disabled={!!downloading}
        >
          {[7, 30, 90].map((value) => (
            <option key={value} value={value}>
              {value} hari terakhir
            </option>
          ))}
        </select>
      </label>
      <div className="nivo-button-row">
        {(['csv', 'pdf'] as const).map((format) => (
          <button
            key={format}
            type="button"
            className="nivo-action nivo-action-secondary"
            onClick={() => download(format)}
            disabled={busy || !!downloading}
          >
            <Download size={17} aria-hidden="true" />
            {downloading === format ? 'Menyiapkan…' : `Ekspor ${format.toUpperCase()}`}
          </button>
        ))}
      </div>
      {error && <StateNotice error>{error}</StateNotice>}
    </div>
  );
}
