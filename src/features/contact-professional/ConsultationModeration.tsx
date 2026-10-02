'use client';
import { useState } from 'react';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { authenticatedRequest } from '@/shared/api/client';

export default function Moderation() {
  const [reports, setReports] = useState<
      { id: string; state: string; reports: { id: string; reason: string }[] }[]
    >([]),
    [error, setError] = useState(''),
    [next, setNext] = useState<number | null>(0);
  const load = async () => {
    try {
      const result = await authenticatedRequest('/api/consultation/admin?offset=' + (next || 0));
      setReports((old) => [...old, ...result.reports]);
      setNext(result.next);
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Panel title="Moderasi administratif">
      <p>
        Akses laporan dicatat dalam audit. Muat halaman berikutnya untuk melanjutkan peninjauan.
      </p>
      {error && <StateNotice error>{error}</StateNotice>}
      {reports.map((r) => (
        <div className="nivo-stack border p-3" key={r.id}>
          <p>
            Sesi {r.id.slice(0, 8)}: {r.state}
          </p>
          {r.reports.map((report) => (
            <p key={report.id}>{report.reason}</p>
          ))}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await authenticatedRequest('/api/consultation/admin', {
                  method: 'POST',
                  body: JSON.stringify({
                    id: r.id,
                    reason: String(new FormData(e.currentTarget).get('reason')),
                  }),
                });
                setReports((old) => old.map((x) => (x.id === r.id ? { ...x, state: 'ended' } : x)));
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            <label>
              Alasan penghentian
              <input className="block border p-3 w-full" name="reason" maxLength={500} required />
            </label>
            <button className="nivo-action" disabled={r.state === 'ended'}>
              Hentikan sesi
            </button>
          </form>
        </div>
      ))}
      {next !== null && (
        <button className="nivo-action" onClick={load}>
          Muat laporan berikutnya
        </button>
      )}
    </Panel>
  );
}
