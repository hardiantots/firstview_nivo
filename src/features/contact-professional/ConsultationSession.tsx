'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { ResponsiveSections, SectionPage } from '@/components/ui/responsive-sections';
import { authenticatedRequest } from '@/shared/api/client';
import { Room, RoomAction } from '@/shared/consultation/domain';
import { useAudio } from '@/shared/consultation/useAudio';
import { AudioLines, ArrowUpRight, MessageCircle } from 'lucide-react';
import { CrisisSupport } from '@/features/support/NationalSupport';

export default function Session({
  id,
  audioEnabled,
  onBack,
}: {
  id: string;
  audioEnabled: boolean;
  onBack: () => void;
}) {
  const [room, setRoom] = useState<Room | null>(null),
    [actor, setActor] = useState(''),
    [error, setError] = useState(''),
    [online, setOnline] = useState(true),
    [draft, setDraft] = useState(''),
    [pending, setPending] = useState<{ operationId: string; action: RoomAction } | null>(null),
    [busy, setBusy] = useState(false),
    [previous, setPrevious] = useState<number | null>(null),
    [older, setOlder] = useState<Room['messages']>([]),
    [confirmation, setConfirmation] = useState('');
  const lock = useRef(false),
    lastRead = useRef(''),
    latest = useRef<Room | null>(null),
    pageCursor = useRef<number | null>(null);
  const load = useCallback(async () => {
    try {
      const data = await authenticatedRequest('/api/consultation/' + id);
      setRoom(data.document);
      latest.current = data.document;
      setActor(data.actor);
      if (pageCursor.current === null) setPrevious(data.previous);
      setOnline(true);
    } catch (e) {
      setOnline(false);
      setError(e.message);
    }
  }, [id]);
  const send = useCallback(
    async (action: RoomAction) => {
      await authenticatedRequest('/api/consultation/' + id, {
        method: 'POST',
        body: JSON.stringify({ operationId: crypto.randomUUID(), action }),
      });
    },
    [id],
  );
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await load();
      if (!disposed) timer = setTimeout(poll, 3000);
    };
    poll();
    const pulse = setInterval(() => {
      if (latest.current?.state !== 'ended') send({ type: 'heartbeat' }).catch(() => {});
    }, 15000);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearInterval(pulse);
    };
  }, [load, send]);
  useEffect(() => {
    if (!room || !actor || document.visibilityState !== 'visible') return;
    const last = room.messages.at(-1);
    if (last && last.sender !== actor && last.id !== lastRead.current) {
      lastRead.current = last.id;
      send({ type: 'read', messageId: last.id }).catch(() => {
        lastRead.current = '';
      });
    }
  }, [room, actor, send]);
  const audio = useAudio(id, room, actor, send);
  const act = async (action: RoomAction) => {
    try {
      await send(action);
      setError('');
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  const submitMessage = async () => {
    if (lock.current || (!draft.trim() && !pending)) return;
    lock.current = true;
    setBusy(true);
    const operation = pending || {
      operationId: crypto.randomUUID(),
      action: { type: 'message', text: draft } as RoomAction,
    };
    setPending(operation);
    try {
      await authenticatedRequest('/api/consultation/' + id, {
        method: 'POST',
        body: JSON.stringify(operation),
      });
      setPending(null);
      setDraft('');
      setError('');
      await load();
    } catch (e) {
      setError(e.message + ' Pesan belum dikonfirmasi; coba kirim ulang.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const peer = room && (actor === room.user ? room.consultant : room.user),
    seen = room?.lastSeen?.[peer];
  return (
    <div className="nivo-stack">
      <button
        className="nivo-action nivo-action-secondary"
        onClick={() => {
          audio.end();
          onBack();
        }}
      >
        Kembali ke daftar sesi
      </button>
      {error && <StateNotice error>{error}</StateNotice>}
      {!online && (
        <StateNotice error>
          Koneksi terputus. Pesan belum tentu terkirim. Chat yang sudah dimuat tetap bisa dibaca.
        </StateNotice>
      )}
      <CrisisSupport text={draft} />
      {!room ? (
        <StateNotice>Memuat sesi…</StateNotice>
      ) : (
        <ResponsiveSections label="Sesi konsultasi" queryKey="sessionSection">
          <SectionPage name="chat" label="Percakapan">
            <Panel
              tone="soft"
              eyebrow="Status percakapan"
              title={
                room.state === 'queued'
                  ? 'Menunggu konsultan menerima sesi'
                  : room.state === 'connected'
                    ? 'Sesi chat aktif'
                    : 'Sesi berakhir'
              }
            >
              <p className="nivo-caption">
                {seen && Date.now() - Date.parse(seen) < 45000
                  ? 'Lawan bicara baru saja aktif.'
                  : 'Kehadiran lawan bicara belum terkonfirmasi; mereka mungkin offline atau menutup tab.'}
              </p>
              {room.sharedSummary && <p>Ringkasan yang dibagikan: {room.sharedSummary}</p>}
              {room.state === 'queued' && actor === room.consultant && (
                <button className="nivo-action" onClick={() => act({ type: 'accept' })}>
                  Terima sesi
                </button>
              )}
              {room.state !== 'ended' && (
                <div className="nivo-button-row">
                  <button
                    className="nivo-action nivo-action-secondary"
                    onClick={() => {
                      audio.end();
                      act({ type: 'end' });
                    }}
                  >
                    Akhiri sesi
                  </button>
                </div>
              )}
            </Panel>
            <Panel title="Chat dengan manusia">
              {previous != null && (
                <button
                  className="nivo-action nivo-action-secondary"
                  onClick={async () => {
                    try {
                      const data = await authenticatedRequest(
                        '/api/consultation/' + id + '?before=' + previous,
                      );
                      setOlder((prev) => [...data.document.messages, ...prev]);
                      pageCursor.current = data.previous || 0;
                      setPrevious(data.previous);
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  Muat pesan sebelumnya
                </button>
              )}
              <div className="nivo-chat-log" aria-label="Pesan percakapan" tabIndex={0}>
                {!room.messages.length && !older.length && (
                  <div className="nivo-chat-empty">
                    <MessageCircle size={26} className="mx-auto" aria-hidden="true" />
                    <p>Belum ada pesan.</p>
                    <p className="nivo-caption">
                      {room.state === 'connected'
                        ? 'Mulai dari hal yang ingin kamu ceritakan.'
                        : 'Pesan akan tampil di sini setelah percakapan dimulai.'}
                    </p>
                  </div>
                )}
                {[...new Map([...older, ...room.messages].map((m) => [m.id, m])).values()].map(
                  (m) => (
                    <div
                      key={m.id}
                      className={`nivo-chat-bubble ${m.sender === actor ? 'nivo-chat-bubble-own' : ''}`}
                    >
                      <p className="nivo-chat-author">
                        {m.sender === actor
                          ? 'Saya'
                          : m.sender === room.consultant
                            ? 'Konsultan manusia'
                            : 'Pengguna'}
                      </p>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <small>
                        {new Date(m.at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · Tersimpan di server{room.reads[peer] === m.id ? ' · Dibaca' : ''}
                      </small>
                    </div>
                  ),
                )}
              </div>
              {room.state === 'connected' && (
                <form
                  className="nivo-chat-composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitMessage();
                  }}
                >
                  <label>
                    Pesan
                    <textarea
                      maxLength={2000}
                      value={draft}
                      disabled={!!pending}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Tulis yang ingin kamu ceritakan…"
                    />
                  </label>
                  <button className="nivo-action" disabled={busy}>
                    {busy ? 'Mengirim…' : pending ? 'Kirim ulang pesan yang sama' : 'Kirim pesan'}
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </button>
                </form>
              )}
              <p className="nivo-caption">
                Hanya teks. Isian pesan yang belum terkirim hilang jika tab ditutup.
              </p>
            </Panel>
          </SectionPage>
          {audioEnabled && room.state === 'connected' && (
            <SectionPage name="suara" label="Panggilan suara">
              <Panel title="Panggilan suara browser">
                <p role="status">{audio.status}</p>
                <audio
                  className="w-full max-w-full"
                  ref={audio.audio}
                  controls
                  autoPlay
                  aria-label="Audio lawan bicara"
                />
                {audio.active ? (
                  <>
                    <button className="nivo-action" onClick={audio.toggleMute}>
                      {audio.muted ? 'Aktifkan mikrofon' : 'Mute mikrofon'}
                    </button>
                    <button className="nivo-action nivo-action-secondary" onClick={audio.end}>
                      Akhiri panggilan
                    </button>
                  </>
                ) : (
                  <button className="nivo-action" onClick={() => audio.start(audio.incoming)}>
                    {audio.incoming
                      ? 'Jawab panggilan dan izinkan mikrofon'
                      : 'Panggil dan izinkan mikrofon'}
                  </button>
                )}
                <p>Audio tidak direkam. Kamu dapat menolak izin mikrofon dan melanjutkan chat.</p>
              </Panel>
            </SectionPage>
          )}
          <SectionPage name="ringkasan" label="Ringkasan dan penilaian">
            <Panel title="Ringkasan tindakan">
              {room.summary ? (
                <>
                  <p>{room.summary.text}</p>
                  <p>
                    {room.summary.approved
                      ? 'Disetujui pengguna.'
                      : 'Usulan konsultan; belum disetujui pengguna.'}
                  </p>
                  {actor === room.user && !room.summary.approved && (
                    <button
                      className="nivo-action"
                      onClick={() => act({ type: 'approve_summary' })}
                    >
                      Saya menyetujui ringkasan ini
                    </button>
                  )}
                </>
              ) : (
                <p>Belum ada ringkasan yang diajukan.</p>
              )}
              {actor === room.consultant && room.state === 'connected' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    act({
                      type: 'summary',
                      text: String(new FormData(e.currentTarget).get('summary')),
                    });
                  }}
                >
                  <label>
                    Usulan tindakan
                    <textarea
                      name="summary"
                      className="block w-full border p-3"
                      required
                      maxLength={2000}
                    />
                  </label>
                  <button className="nivo-action">Ajukan ringkasan</button>
                </form>
              )}
            </Panel>
            <Panel title="Penilaian opsional">
              <p>Seberapa puas kamu dengan sesi ini? 1 sangat tidak puas, 5 sangat puas.</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    className="nivo-action nivo-action-secondary"
                    aria-pressed={room.satisfaction?.[actor] === score}
                    onClick={() => act({ type: 'satisfaction', score })}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <p>
                Penilaian boleh dilewati. Data teknis yang dicatat hanya jumlah kejadian koneksi,
                tanpa isi audio.
              </p>
            </Panel>
          </SectionPage>
          <SectionPage name="kelola" label="Kelola sesi">
            <Panel title="Laporkan dan kelola sesi">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  act({
                    type: 'report',
                    reason: String(new FormData(e.currentTarget).get('reason')),
                  });
                }}
              >
                <label>
                  Alasan laporan
                  <textarea
                    name="reason"
                    className="block w-full border p-3"
                    required
                    maxLength={500}
                  />
                </label>
                <button className="nivo-action nivo-action-secondary">
                  Kirim laporan ke admin
                </button>
              </form>
              <p>{room.reports.length} laporanmu tercatat.</p>
              {actor === room.user && room.state === 'ended' && (
                <>
                  <label>
                    Ketik HAPUS CHAT untuk menghapus isi sesi
                    <input
                      className="block border p-3"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                  </label>
                  <button
                    className="nivo-action nivo-action-secondary"
                    disabled={confirmation !== 'HAPUS CHAT'}
                    onClick={async () => {
                      try {
                        await authenticatedRequest('/api/consultation/' + id, {
                          method: 'DELETE',
                          body: JSON.stringify({ confirm: confirmation }),
                        });
                        setOlder([]);
                        setConfirmation('');
                        await load();
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    Hapus isi chat
                  </button>
                </>
              )}
            </Panel>
          </SectionPage>
        </ResponsiveSections>
      )}
    </div>
  );
}
