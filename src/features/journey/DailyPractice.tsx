'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Play, Sprout } from 'lucide-react';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { JourneyAction, JourneyState } from '@/shared/journey/domain';
import { useCountdown } from '@/shared/hooks/use-countdown';
import { countdownLabel } from '@/shared/craving/flow';
import { lessonForDay } from '@/shared/craving/lesson';

export default function DailyPractice({
  state,
  today,
  busy = false,
  onSave,
}: {
  state: JourneyState;
  today: string;
  busy?: boolean;
  onSave: (action: JourneyAction) => Promise<boolean>;
}) {
  const lesson = lessonForDay(today),
    complete = (state.lessonCompletions ?? []).some((item) => item.date === today);
  const [endAt, setEndAt] = useState<number | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const left = useCountdown(endAt),
    lock = useRef(false);
  useEffect(() => {
    setEndAt(null);
    setError('');
  }, [today]);
  useEffect(() => {
    if (complete) setEndAt(null);
  }, [complete]);
  async function finish() {
    if (lock.current || complete || busy || endAt === null || left > 0) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      if (await onSave({ type: 'lesson', lessonId: lesson.id })) setEndAt(null);
      else
        setError('Belum tersimpan. Tinjau isian tertunda lalu kirim ulang saat koneksi tersedia.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Latihan belum tersimpan.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  return (
    <Panel
      title="Jeda kecil hari ini"
      eyebrow={`${lesson.durationSec / 60} menit untuk dirimu`}
      tone="soft"
    >
      <div className="flex items-start gap-3">
        <Sprout size={23} className="shrink-0 text-primary" aria-hidden="true" />
        <h3 className="text-lg font-semibold">{lesson.title}</h3>
      </div>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
        {lesson.body.map((paragraph) => (
          <li key={paragraph}>{paragraph}</li>
        ))}
      </ol>
      {complete ? (
        <p role="status" className="mt-4 flex items-center gap-2 font-medium">
          <Check size={18} aria-hidden="true" />
          Latihan hari ini sudah tercatat. Terima kasih sudah memberi ruang untuk dirimu.
        </p>
      ) : (
        <div className="nivo-stack mt-4">
          {endAt === null ? (
            <button
              type="button"
              className="nivo-action nivo-action-secondary"
              disabled={busy}
              onClick={() => setEndAt(Date.now() + lesson.durationSec * 1000)}
            >
              <Play size={17} aria-hidden="true" />
              Mulai jeda {lesson.durationSec / 60} menit
            </button>
          ) : (
            <>
              <p role="timer" aria-live="off" className="text-2xl font-semibold tabular-nums">
                {countdownLabel(left)}
              </p>
              <p className="nivo-caption">
                {left > 0
                  ? 'Ambil waktu secukupnya. Kamu bebas menghentikan latihan.'
                  : 'Jeda selesai. Catat latihan jika kamu sudah melakukannya.'}
              </p>
              <div className="nivo-button-row">
                <button
                  type="button"
                  className="nivo-action"
                  disabled={busy || saving || left > 0}
                  onClick={finish}
                >
                  {saving ? 'Menyimpan…' : 'Saya sudah berlatih'}
                </button>
                <button
                  type="button"
                  className="nivo-action nivo-action-secondary"
                  disabled={busy || saving}
                  onClick={() => {
                    setEndAt(null);
                    setError('');
                  }}
                >
                  Hentikan jeda
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {error && <StateNotice error>{error}</StateNotice>}
      <p className="nivo-caption mt-3">
        Tidak ada target atau streak yang hangus. Satu latihan per hari tercatat di perjalananmu.
      </p>
    </Panel>
  );
}
