'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { ResponsiveSections, SectionPage } from '@/components/ui/responsive-sections';
import { PageNavigation } from '@/components/ui/page-navigation';
import { useCompactLayout } from '@/shared/hooks/use-compact-layout';
import { authenticatedRequest } from '@/shared/api/client';
import { formatDate } from '@/shared/lib/format';

export const buddyMetrics = {
  smoke_free_days: 'Hari bebas rokok berurutan yang tercatat',
  total_smoke_free_days: 'Total hari bebas rokok tercatat',
  days_logged_7: 'Jumlah hari tercatat dalam 7 hari',
} as const;
type Metric = keyof typeof buddyMetrics;
type Status = {
  owned: { id: string; share_metrics: Metric[] }[];
  receiving: { id: string; metrics: Partial<Record<Metric, number>> }[];
  pending: { id: string; share_metrics: Metric[]; expires_at: string }[];
};
export default function BuddySettings() {
  const compact = useCompactLayout(),
    perPage = compact ? 1 : 3;
  const [receivingPage, setReceivingPage] = useState(0);
  const [status, setStatus] = useState<Status | null>(null),
    [selected, setSelected] = useState<Metric[]>(['total_smoke_free_days']);
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [link, setLink] = useState(''),
    [notice, setNotice] = useState('');
  const lock = useRef(false);
  const receivingPages = Math.ceil((status?.receiving.length ?? 0) / perPage);
  useEffect(() => {
    setReceivingPage((page) => Math.min(page, Math.max(0, receivingPages - 1)));
  }, [receivingPages]);
  const load = useCallback(async () => {
    try {
      setStatus(await authenticatedRequest('/api/buddy'));
      setError('');
    } catch (e) {
      setStatus(null);
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);
  const revoke = async (kind: 'invite' | 'link', id: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await authenticatedRequest('/api/buddy', {
        method: 'DELETE',
        body: JSON.stringify({ kind, id }),
      });
      setLink('');
      setNotice('Akses telah dicabut.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Panel title="Pendamping pilihanmu">
      <p>
        Undang satu orang yang kamu percaya. Pendamping hanya melihat angka yang kamu pilih setelah
        ia menyetujui undangan. Alasan pribadi, pemicu, dan isi catatan tidak dibagikan.
      </p>
      {error && <StateNotice error>{error}</StateNotice>}
      {notice && <StateNotice>{notice}</StateNotice>}
      {!status && !error && <p role="status">Memuat pendamping…</p>}
      <ResponsiveSections label="Pendamping" queryKey="buddySection">
        <SectionPage name="undang" label="Pendamping saya">
          {status?.owned.map((item) => (
            <div key={item.id} className="nivo-choice-surface nivo-stack">
              <p>
                Pendamping aktif. Dibagikan:{' '}
                {item.share_metrics.map((metric) => buddyMetrics[metric]).join(', ')}.
              </p>
              <button
                disabled={busy}
                className="nivo-action nivo-action-secondary"
                onClick={() => revoke('link', item.id)}
              >
                Cabut akses pendamping
              </button>
            </div>
          ))}
          {status && !status.owned.length && (
            <form
              className="nivo-stack"
              onSubmit={async (event) => {
                event.preventDefault();
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                setError('');
                try {
                  const data = await authenticatedRequest('/api/buddy', {
                    method: 'POST',
                    body: JSON.stringify({ type: 'invite', consent, metrics: selected }),
                  });
                  setLink(window.location.origin + data.path);
                  setNotice('Undangan baru berlaku 24 jam. Undangan sebelumnya sudah dibatalkan.');
                  await load();
                } catch (e) {
                  setError(e.message);
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              <fieldset className="nivo-stack">
                <legend className="mb-3 font-medium">Angka yang boleh dibagikan</legend>
                {(Object.keys(buddyMetrics) as Metric[]).map((metric) => (
                  <label key={metric} className="nivo-checkbox">
                    <input
                      type="checkbox"
                      checked={selected.includes(metric)}
                      onChange={(event) =>
                        setSelected((previous) =>
                          event.target.checked
                            ? [...previous, metric]
                            : previous.filter((value) => value !== metric),
                        )
                      }
                    />
                    <span>{buddyMetrics[metric]}</span>
                  </label>
                ))}
              </fieldset>
              <label className="nivo-checkbox">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  Saya setuju membagikan angka pilihan di atas kepada penerima tautan yang menerima
                  undangan.
                </span>
              </label>
              <button className="nivo-action" disabled={busy || !consent || !selected.length}>
                {busy ? 'Menyiapkan…' : 'Buat tautan undangan'}
              </button>
            </form>
          )}
          {link && (
            <div className="nivo-stack">
              <label className="nivo-field">
                Tautan undangan
                <input value={link} readOnly onFocus={(event) => event.target.select()} />
              </label>
              <button
                className="nivo-action nivo-action-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setNotice('Tautan disalin. Bagikan secara pribadi kepada orang pilihanmu.');
                  } catch {
                    setNotice('Pilih lalu salin tautan pada kolom di atas.');
                  }
                }}
              >
                Salin tautan
              </button>
            </div>
          )}
          {status?.pending.map((item) => (
            <div className="nivo-divider nivo-stack" key={item.id}>
              <p>Undangan menunggu penerima sampai {formatDate(item.expires_at)}.</p>
              <button
                className="nivo-action nivo-action-secondary"
                disabled={busy}
                onClick={() => revoke('invite', item.id)}
              >
                Batalkan undangan
              </button>
            </div>
          ))}
        </SectionPage>
        <SectionPage name="mendampingi" label="Orang yang saya dampingi">
          {!status?.receiving.length && <p>Belum ada orang yang kamu dampingi.</p>}
          {status?.receiving
            .slice(receivingPage * perPage, receivingPage * perPage + perPage)
            .map((item) => (
              <div className="nivo-choice-surface nivo-stack" key={item.id}>
                <dl>
                  {(Object.entries(item.metrics) as [Metric, number][])
                    .filter(([metric]) => metric in buddyMetrics)
                    .map(([metric, value]) => (
                      <div key={metric}>
                        <dt>{buddyMetrics[metric]}</dt>
                        <dd className="text-2xl font-semibold">{value} hari</dd>
                      </div>
                    ))}
                </dl>
                <button
                  className="nivo-action nivo-action-secondary"
                  disabled={busy}
                  onClick={() => revoke('link', item.id)}
                >
                  Berhenti mendampingi
                </button>
              </div>
            ))}
          <PageNavigation
            label="Halaman orang yang didampingi"
            page={receivingPage}
            pages={receivingPages}
            onChange={setReceivingPage}
          />
        </SectionPage>
      </ResponsiveSections>
      <p className="nivo-caption">
        Tautan undangan bersifat pribadi. Angka mengikuti catatan pengguna dan bukan penilaian
        kesehatan.
      </p>
      <button className="nivo-text-link" disabled={busy} onClick={load}>
        Muat ulang status
      </button>
    </Panel>
  );
}
