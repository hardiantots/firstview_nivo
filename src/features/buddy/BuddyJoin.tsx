'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { authenticatedRequest } from '@/shared/api/client';
import { buddyMetrics } from './BuddySettings';

export default function BuddyJoin({ token }: { token: string }) {
  const [metrics, setMetrics] = useState<string[] | null>(null),
    [error, setError] = useState(''),
    [signIn, setSignIn] = useState(false),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [accepted, setAccepted] = useState(false);
  useEffect(() => {
    let disposed = false;
    authenticatedRequest('/api/buddy?token=' + encodeURIComponent(token))
      .then((data) => {
        if (!disposed) setMetrics(data.metrics);
      })
      .catch((e) => {
        if (!disposed) {
          setError(e.message);
          setSignIn(e.status === 401 || e.message.includes('masuk'));
        }
      });
    return () => {
      disposed = true;
    };
  }, [token]);
  return (
    <Panel title="Undangan untuk mendampingi">
      <p>
        Kamu bebas menerima atau menolak undangan ini. Menerima berarti kamu dapat melihat angka
        yang dipilih pengundang; akses bisa dihentikan oleh salah satu pihak kapan saja.
      </p>
      {error && <StateNotice error>{error}</StateNotice>}
      {signIn && (
        <Link
          className="nivo-action"
          href={'/signin?next=' + encodeURIComponent('/buddy/' + token)}
        >
          Masuk untuk meninjau undangan
        </Link>
      )}
      {metrics && !accepted && (
        <form
          className="nivo-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError('');
            try {
              await authenticatedRequest('/api/buddy', {
                method: 'POST',
                body: JSON.stringify({ type: 'accept', token, consent }),
              });
              setAccepted(true);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <ul>
            {metrics
              .filter((metric) => metric in buddyMetrics)
              .map((metric) => (
                <li key={metric}>{buddyMetrics[metric]}</li>
              ))}
          </ul>
          <p className="nivo-caption">
            Tidak termasuk nama, kontak, isi catatan, pemicu, atau alasan pribadi.
          </p>
          <label className="nivo-checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>Saya setuju menjadi pendamping dan melihat angka pilihan di atas.</span>
          </label>
          <button className="nivo-action" disabled={!consent || busy}>
            {busy ? 'Menerima…' : 'Terima undangan'}
          </button>
          <Link href="/home" className="nivo-text-link">
            Lewati undangan
          </Link>
        </form>
      )}
      {accepted && (
        <>
          <StateNotice>Undangan diterima.</StateNotice>
          <Link className="nivo-action" href="/pencapaian?tab=buddy">
            Lihat ringkasan pendamping
          </Link>
        </>
      )}
    </Panel>
  );
}
