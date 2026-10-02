'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageTitle, Panel, StateNotice, ActionLink } from '@/components/ui/nivo';
import { authenticatedRequest } from '@/shared/api/client';
import { Policy } from '@/shared/consultation/domain';
import { AudioLines, ArrowUpRight, MessageCircle, ShieldCheck } from 'lucide-react';
import NationalSupport from '@/features/support/NationalSupport';
import Session from './ConsultationSession';
import Moderation from './ConsultationModeration';

type Directory = {
  available: boolean;
  policy: Policy | null;
  actor?: string;
  role?: string;
  audio?: boolean;
  rooms: { id: string }[];
  consultants: { id: string; name: string; credentials: string; available: boolean }[];
};
export default function ContactProfessionalPage() {
  const [directory, setDirectory] = useState<Directory | null>(null),
    [id, setId] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const attempt = useRef<object | null>(null),
    lock = useRef(false);
  const load = useCallback(async () => {
    try {
      setDirectory(await authenticatedRequest('/api/consultation'));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div className="nivo-page">
      <PageTitle eyebrow="Ada ruang untuk bercerita" title="Konsultasi di NIVO">
        Pilih dukungan manusia saat kamu membutuhkannya.
      </PageTitle>
      {!id && <NationalSupport />}
      {error && <StateNotice error>{error}</StateNotice>}
      {id ? (
        <Session
          key={id}
          id={id}
          audioEnabled={!!directory?.audio}
          onBack={() => {
            setId('');
            load();
          }}
        />
      ) : (
        <>
          {!directory?.policy ? (
            <>
              <section className="nivo-empty-service">
                <span className="nivo-status-orb" aria-hidden="true">
                  <MessageCircle size={28} strokeWidth={1.5} />
                </span>
                <div>
                  <p className="nivo-eyebrow">Dukungan manusia</p>
                  <h2>
                    {error
                      ? 'Ketersediaan belum dapat dimuat'
                      : directory
                        ? 'Layanan belum tersedia'
                        : 'Memeriksa ketersediaanâ€¦'}
                  </h2>
                </div>
                <p>
                  {error
                    ? 'Periksa koneksi lalu coba kembali untuk melihat layanan konsultasi.'
                    : directory
                      ? 'Belum ada jadwal atau konsultan terverifikasi yang dapat ditampilkan. Kamu belum masuk antrean.'
                      : 'Sebentar, kami sedang memuat informasi layanan.'}
                </p>
                <div className="nivo-button-row">
                  <button className="nivo-action" onClick={load}>
                    Periksa ketersediaan <ArrowUpRight size={17} aria-hidden="true" />
                  </button>
                  <ActionLink href="/craving-support" secondary>
                    Bantuan mandiri
                  </ActionLink>
                </div>
              </section>
              <div className="nivo-dashboard-grid">
                <Panel title="Chat atau suara, sesuai pilihanmu" tone="plain">
                  <div className="nivo-calm-intro">
                    <AudioLines size={22} aria-hidden="true" />
                    <p>
                      Saat layanan tersedia, kamu bisa melihat jadwal dan biaya sebelum memulai.
                    </p>
                  </div>
                  <p className="nivo-caption">
                    Konsultasi bersifat opsional. Kamu tetap dapat mencatat dan menggunakan langkah
                    bantuan mandiri.
                  </p>
                </Panel>
                <Panel title="Kamu menentukan yang dibagikan" tone="plain">
                  <ShieldCheck size={24} strokeWidth={1.5} aria-hidden="true" />
                  <p className="nivo-caption">
                    Ringkasan perjalanan hanya dibagikan jika kamu memilihnya. Panduan otomatis dan
                    percakapan dengan manusia ditampilkan secara terpisah.
                  </p>
                </Panel>
              </div>
            </>
          ) : (
            <>
              <Panel title="Jadwal, biaya, dan batas layanan">
                <p>
                  {directory.available
                    ? 'Dalam jam layanan. Ketersediaan setiap konsultan dapat berubah.'
                    : 'Di luar jam layanan; belum menerima antrean baru.'}
                </p>
                <p>Zona waktu perangkat: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                {directory.policy.hours.map((h) => (
                  <p key={h.start}>
                    {new Date(h.start).toLocaleString('id-ID')} â€“{' '}
                    {new Date(h.end).toLocaleString('id-ID')}
                  </p>
                ))}
                <p>
                  Biaya: {directory.policy.cost}. Perkiraan tunggu: {directory.policy.waitMinutes}{' '}
                  menit (bukan jaminan).
                </p>
                <p>{directory.policy.boundaries}</p>
                <p>
                  Chat disimpan {directory.policy.retentionDays} hari sejak sesi dibuat. Audio tidak
                  direkam. Audit akses disimpan 30 hari. Lampiran tidak didukung.
                </p>
              </Panel>
              {directory.role === 'user' && (
                <Panel title="Pilih konsultan manusia">
                  <form
                    className="nivo-stack"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (lock.current) return;
                      lock.current = true;
                      setBusy(true);
                      setError('');
                      const f = new FormData(e.currentTarget);
                      try {
                        if (!attempt.current)
                          attempt.current = {
                            id: crypto.randomUUID(),
                            consultant: f.get('consultant'),
                            consent: f.has('consent'),
                            policyVersion: directory.policy.version,
                            sharedSummary: f.has('share') ? String(f.get('summary') || '') : '',
                          };
                        const result = await authenticatedRequest('/api/consultation', {
                          method: 'POST',
                          body: JSON.stringify(attempt.current),
                        });
                        setId(result.id);
                        attempt.current = null;
                      } catch (e) {
                        setError(e.message + ' Coba lagi untuk mengirim isian yang sama.');
                      } finally {
                        lock.current = false;
                        setBusy(false);
                      }
                    }}
                  >
                    <fieldset disabled={busy || !!attempt.current} className="nivo-stack">
                      <label>
                        Konsultan
                        <select name="consultant" required className="block border p-3 w-full">
                          <option value="">Pilih yang tersedia</option>
                          {directory.consultants.map((c) => (
                            <option key={c.id} value={c.id} disabled={!c.available}>
                              {c.name} â€” {c.credentials} (
                              {c.available ? 'tersedia' : 'tidak tersedia'})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <input name="consent" type="checkbox" required /> Saya menyetujui batas
                        layanan dan retensi di atas (versi {directory.policy.version})
                      </label>
                      <label>
                        <input name="share" type="checkbox" /> Saya ingin membagikan ringkasan yang
                        saya tulis (opsional)
                      </label>
                      <label>
                        Ringkasan pilihanmu
                        <textarea
                          name="summary"
                          maxLength={2000}
                          className="block border p-3 w-full"
                        />
                      </label>
                      <p>
                        Menolak berbagi ringkasan tidak menghalangi konsultasi. Data perjalanan
                        tidak dikirim otomatis.
                      </p>
                    </fieldset>
                    <button className="nivo-action" disabled={busy || !directory.available}>
                      Mulai antrean chat
                    </button>
                  </form>
                </Panel>
              )}
              {directory.role === 'admin' && <Moderation />}
              <Panel title="Sesi saya">
                {directory.rooms.length ? (
                  directory.rooms.map((r) => (
                    <button
                      key={r.id}
                      className="nivo-action nivo-action-secondary"
                      onClick={() => setId(r.id)}
                    >
                      Buka sesi {r.id.slice(0, 8)}
                    </button>
                  ))
                ) : (
                  <p>Belum ada sesi.</p>
                )}
                <button className="nivo-action" onClick={load}>
                  Muat ulang sesi
                </button>
              </Panel>
            </>
          )}
        </>
      )}
      <p className="nivo-caption nivo-divider">
        NIVO bukan layanan darurat. Jika membutuhkan bantuan segera, hubungi fasilitas kesehatan
        yang kamu kenal.
      </p>
    </div>
  );
}
