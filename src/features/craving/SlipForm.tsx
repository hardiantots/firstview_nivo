'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { nextStepChoices, triggerChoices } from '@/content/craving-practices';
import { CrisisSupport } from '@/features/support/NationalSupport';
import { JourneyAction, JourneyState } from '@/shared/journey/domain';
import {
  localDateTime,
  occurrenceCaption,
  occurrenceUtc,
  quickOccurrence,
} from '@/shared/craving/occurrence';

export default function SlipForm({
  state,
  busy = false,
  onSave,
  cravingEventId,
}: {
  state: JourneyState;
  busy?: boolean;
  onSave: (action: JourneyAction) => Promise<boolean>;
  cravingEventId?: string;
}) {
  const id = useId(),
    source = cravingEventId
      ? state.cravingEvents?.find((item) => item.id === cravingEventId && item.outcome === 'smoked')
      : null;
  const [useLink, setUseLink] = useState(!!source);
  const linked = useLink ? source : null;
  const [choice, setChoice] = useState<'now' | 'earlier' | 'yesterday' | 'custom'>('now');
  const [referenceAt, setReferenceAt] = useState(Date.now),
    [customTime, setCustomTime] = useState(() =>
      localDateTime(linked ? Date.parse(linked.occurredAt) : Date.now(), state.timezone),
    );
  const [count, setCount] = useState('1'),
    [trigger, setTrigger] = useState(linked?.trigger ?? ''),
    [nextStep, setNextStep] = useState<string>(nextStepChoices[0]);
  const [error, setError] = useState(''),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const event = state.cravingEvents?.find(
      (item) => item.id === cravingEventId && item.outcome === 'smoked',
    );
    setUseLink(!!event);
    setChoice('now');
    setSaved(false);
    setError('');
    setCount('1');
    setTrigger(event?.trigger ?? '');
    // A new SOS reference starts a new draft; unrelated state refreshes preserve it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cravingEventId]);
  let preview = '';
  try {
    preview = occurrenceCaption(
      linked && choice === 'now'
        ? linked.occurredAt
        : choice === 'custom'
          ? occurrenceUtc(customTime, state.timezone)
          : quickOccurrence(choice, referenceAt, state.timezone),
      state.timezone,
    );
  } catch {
    preview = 'Periksa tanggal dan jam yang dipilih.';
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || busy || saved) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      const occurredAt =
        linked && choice === 'now'
          ? linked.occurredAt
          : choice === 'custom'
            ? occurrenceUtc(customTime, state.timezone)
            : quickOccurrence(choice, Date.now(), state.timezone);
      if (Date.parse(occurredAt) > Date.now())
        throw new Error('Waktu kejadian tidak boleh berada di masa depan.');
      const value = Number(count);
      if (!Number.isInteger(value) || value < 1 || value > 200)
        throw new Error('Isi jumlah 1–200 batang untuk kejadian ini.');
      if (!nextStep.trim()) throw new Error('Pilih satu langkah berikutnya.');
      const action: JourneyAction = {
        type: 'slip',
        occurredAt,
        count: value,
        trigger: trigger.trim(),
        nextStep: nextStep.trim(),
        ...(linked && choice === 'now' ? { cravingEventId: linked.id } : {}),
      };
      const success = await onSave(action);
      if (success) setSaved(true);
      else
        setError(
          'Belum tersimpan. Isianmu tetap ada. Tinjau isian tertunda dan kirim ulang saat koneksi tersedia.',
        );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Belum tersimpan. Isianmu tetap ada.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  return (
    <Panel title="Saya merokok lagi" eyebrow="Masih ada langkah berikutnya">
      <p className="nivo-caption">
        Satu kejadian tidak menghapus kemajuan pada hari lain. Catat secukupnya, lalu pilih langkah
        yang nyaman.
      </p>
      <CrisisSupport text={`${trigger} ${nextStep}`} />
      {error && <StateNotice error>{error}</StateNotice>}
      {saved ? (
        <div className="nivo-stack mt-4">
          <p role="status" className="flex items-center gap-2 font-medium">
            <Check size={18} aria-hidden="true" />
            Kejadian dan langkah berikutnya tersimpan.
          </p>
          <p className="nivo-caption">
            Total konsumsi harian tetap dicatat terpisah di Beranda. Kejadian ini tidak ditambahkan
            otomatis.
          </p>
          <button
            type="button"
            className="nivo-action nivo-action-secondary"
            onClick={() => {
              setSaved(false);
              setUseLink(false);
              setCount('1');
              setTrigger('');
              setNextStep(nextStepChoices[0]);
              setChoice('now');
              setReferenceAt(Date.now());
            }}
          >
            Catat kejadian lain
          </button>
        </div>
      ) : (
        <form className="nivo-stack mt-4" onSubmit={save}>
          <fieldset disabled={busy || saving} className="nivo-stack min-w-0">
            <legend className="mb-2 text-sm font-medium">Kapan kejadiannya?</legend>
            <div
              role="group"
              aria-label="Pilih waktu kejadian merokok"
              className="flex flex-wrap gap-2"
            >
              {(
                [
                  { value: 'now', label: linked ? 'Dari Craving SOS' : 'Sekarang' },
                  { value: 'earlier', label: 'Tadi' },
                  { value: 'yesterday', label: 'Kemarin' },
                  { value: 'custom', label: 'Pilih waktu' },
                ] as const
              ).map((item) => (
                <button
                  type="button"
                  aria-pressed={choice === item.value}
                  key={item.value}
                  className={`min-h-11 rounded-full border px-3 text-sm ${choice === item.value ? 'border-secondary/30 bg-secondary/10 text-accent' : 'border-primary/10 bg-white/70'}`}
                  onClick={() => {
                    setChoice(item.value);
                    setReferenceAt(Date.now());
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {choice === 'custom' && (
              <label className="nivo-field">
                Tanggal dan jam kejadian
                <input
                  type="datetime-local"
                  value={customTime}
                  max={localDateTime(Date.now(), state.timezone)}
                  min="1970-01-01T00:00"
                  onChange={(event) => setCustomTime(event.target.value)}
                  required
                />
              </label>
            )}
            <p className="nivo-caption" aria-live="polite">
              {preview}. Jam mengikuti zona perjalanan {state.timezone.replace(/_/g, ' ')}.
              {choice === 'earlier' && ' “Tadi” berarti kira-kira satu jam lalu.'}
            </p>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor={`${id}-count`}>
                Jumlah batang pada kejadian ini
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Kurangi jumlah batang pada kejadian"
                  className="nivo-icon-button"
                  disabled={Number(count) <= 1}
                  onClick={() => setCount(String(Math.max(1, Number(count || 1) - 1)))}
                >
                  <Minus size={18} aria-hidden="true" />
                </button>
                <input
                  id={`${id}-count`}
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  required
                  inputMode="numeric"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-primary/15 bg-white/80 px-3 text-center text-lg"
                />
                <button
                  type="button"
                  aria-label="Tambah jumlah batang pada kejadian"
                  className="nivo-icon-button"
                  disabled={Number(count) >= 200}
                  onClick={() => setCount(String(Math.min(200, Number(count || 0) + 1)))}
                >
                  <Plus size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Pemicu (opsional)</p>
              <div
                role="group"
                aria-label="Pilih pemicu kejadian merokok"
                className="flex flex-wrap gap-2"
              >
                {triggerChoices.map((item) => (
                  <button
                    type="button"
                    aria-pressed={trigger === item}
                    key={item}
                    className={`min-h-11 rounded-full border px-3 text-sm ${trigger === item ? 'border-secondary/30 bg-secondary/10 text-accent' : 'border-primary/10 bg-white/70'}`}
                    onClick={() => setTrigger(trigger === item ? '' : item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <label className="nivo-field">
              Pemicu dalam kata-katamu (opsional)
              <input
                value={trigger}
                maxLength={120}
                onChange={(event) => setTrigger(event.target.value)}
              />
            </label>
            <div>
              <p className="mb-2 text-sm font-medium">Langkah berikutnya</p>
              <div
                role="group"
                aria-label="Pilih langkah setelah kejadian merokok"
                className="grid gap-2 sm:grid-cols-2"
              >
                {nextStepChoices.map((item) => (
                  <button
                    type="button"
                    aria-pressed={nextStep === item}
                    key={item}
                    className={`min-h-12 rounded-xl border p-3 text-left text-sm ${nextStep === item ? 'border-primary/20 bg-primary/5 text-primary' : 'border-primary/10 bg-white/70'}`}
                    onClick={() => setNextStep(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <label className="nivo-field">
              Langkah dalam kata-katamu
              <input
                value={nextStep}
                maxLength={200}
                required
                onChange={(event) => setNextStep(event.target.value)}
              />
            </label>
            <button type="submit" className="nivo-action" disabled={busy || saving}>
              {saving ? 'Menyimpan…' : 'Simpan kejadian'}
            </button>
          </fieldset>
          <p className="nivo-caption">
            Kejadian merokok membantu refleksi. Jumlah di sini tidak otomatis ditambahkan ke catatan
            harian.
          </p>
        </form>
      )}
    </Panel>
  );
}
