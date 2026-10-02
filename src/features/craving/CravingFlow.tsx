'use client';
import { useEffect, useReducer, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Check, Heart, RotateCcw, Wind } from 'lucide-react';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { cravingPractices, triggerChoices } from '@/content/craving-practices';
import { CrisisSupport } from '@/features/support/NationalSupport';
import { support } from '@/config/support';
import { JourneyAction, JourneyState } from '@/shared/journey/domain';
import { useCountdown } from '@/shared/hooks/use-countdown';
import { authenticatedRequest } from '@/shared/api/client';
import {
  beginCravingFlow,
  breathingPhase,
  countdownLabel,
  cravingFlowReducer,
  cravingResultAction,
  CravingStep,
} from '@/shared/craving/flow';

const steps: { id: CravingStep; title: string }[] = [
  { id: 'intensity', title: 'Kenali' },
  { id: 'practice', title: 'Jeda' },
  { id: 'reason', title: 'Alasanmu' },
  { id: 'result', title: 'Hasil' },
];

export default function CravingFlow({
  state,
  busy = false,
  onSave,
  onSmoked,
}: {
  state: JourneyState;
  busy?: boolean;
  onSave: (action: JourneyAction) => Promise<boolean>;
  onSmoked: () => void;
}) {
  const [flow, dispatch] = useReducer(cravingFlowReducer, undefined, () => beginCravingFlow());
  const [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const [legacyReasons, setLegacyReasons] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    if (!state.motivations?.length)
      authenticatedRequest('/api/profile')
        .then((result) => {
          if (active)
            setLegacyReasons(
              (result.profile?.motivations || [])
                .filter((value: unknown) => typeof value === 'string' && value.length <= 200)
                .slice(0, 10),
            );
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [state.motivations]);
  const reasons = state.motivations?.length ? state.motivations : legacyReasons;
  const lock = useRef(false),
    heading = useRef<HTMLHeadingElement>(null),
    initialized = useRef(false);
  const acknowledged = useRef<number | null>(null);
  const attempted = useRef<number | null>(null);
  const left = useCountdown(flow.endAt),
    reducedMotion = useReducedMotion();
  const practice = cravingPractices.find((item) => item.id === flow.practice)!;
  const phase = breathingPhase(practice.seconds, left);
  const coping =
    state.coping.find(
      (item) =>
        flow.trigger &&
        item.trigger.toLocaleLowerCase('id') === flow.trigger.toLocaleLowerCase('id'),
    ) ?? state.coping.at(-1);
  useEffect(() => {
    if (initialized.current) heading.current?.focus();
    initialized.current = true;
  }, [flow.step]);
  const persisted = state.cravingEvents?.find(
    (event) =>
      event.occurredAt === new Date(flow.startedAt).toISOString() && event.outcome === flow.outcome,
  );
  useEffect(() => {
    if (
      !persisted ||
      attempted.current !== flow.startedAt ||
      flow.saved ||
      acknowledged.current === flow.startedAt
    )
      return;
    acknowledged.current = flow.startedAt;
    dispatch({ type: 'saved' });
    if (flow.outcome === 'smoked') onSmoked();
  }, [persisted, flow.saved, flow.startedAt, flow.outcome, onSmoked]);
  async function save() {
    if (lock.current || busy || flow.saved) return;
    attempted.current = flow.startedAt;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      const success = await onSave(cravingResultAction(flow));
      if (success && acknowledged.current !== flow.startedAt) {
        acknowledged.current = flow.startedAt;
        dispatch({ type: 'saved' });
        if (flow.outcome === 'smoked') onSmoked();
      } else
        setError(
          'Belum tersimpan. Pilihanmu tetap ada. Tinjau isian tertunda lalu kirim ulang saat koneksi tersedia.',
        );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Belum tersimpan. Pilihanmu tetap ada.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  const changeStep = (step: CravingStep) => {
    setError('');
    dispatch({ type: 'step', step });
  };
  return (
    <Panel title="Craving SOS" eyebrow="Ambil satu langkah saat ini" tone="soft">
      <CrisisSupport text={`${flow.trigger} ${flow.note} ${state.ownReason ?? ''}`} />
      <nav aria-label="Langkah Craving SOS" className="mb-4 grid grid-cols-4 gap-1">
        {steps.map((step, index) => (
          <button
            type="button"
            key={step.id}
            disabled={busy || saving || flow.saved}
            aria-current={step.id === flow.step ? 'step' : undefined}
            className={`min-h-11 rounded-xl px-1 py-2 text-[0.8125rem] sm:text-sm ${step.id === flow.step ? 'bg-primary text-primary-foreground' : 'bg-white/70 text-muted-foreground hover:bg-secondary/10'}`}
            onClick={() => changeStep(step.id)}
          >
            <span className="block text-sm font-semibold">{index + 1}</span>
            {step.title}
          </button>
        ))}
      </nav>
      {error && <StateNotice error>{error}</StateNotice>}
      {flow.saved ? (
        <div className="nivo-stack">
          <p className="flex items-center gap-2 font-medium" role="status">
            <Check size={19} aria-hidden="true" />
            Hasilnya tersimpan.
          </p>
          <p className="nivo-caption">
            Apa pun hasilnya, kamu bisa memilih satu langkah berikutnya.
          </p>
          {flow.outcome === 'ongoing' && <SupportChoices />}
          <button
            type="button"
            className="nivo-action nivo-action-secondary"
            onClick={() => {
              attempted.current = null;
              acknowledged.current = null;
              dispatch({ type: 'restart', at: Math.max(Date.now(), flow.startedAt + 1) });
              setError('');
            }}
          >
            <RotateCcw size={17} aria-hidden="true" />
            Mulai jeda baru
          </button>
        </div>
      ) : (
        <>
          <h3
            tabIndex={-1}
            ref={heading}
            className="mb-3 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {flow.step === 'intensity'
              ? 'Seberapa kuat keinginannya?'
              : flow.step === 'practice'
                ? 'Pilih jeda yang nyaman'
                : flow.step === 'reason'
                  ? 'Ingat apa yang ingin kamu jaga'
                  : 'Bagaimana rasanya sekarang?'}
          </h3>
          {flow.step === 'intensity' && (
            <div className="nivo-stack">
              <label className="nivo-field">
                Intensitas keinginan, 0–10
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={flow.intensity}
                  onChange={(event) =>
                    dispatch({ type: 'intensity', value: Number(event.target.value) })
                  }
                  className="min-h-11 w-full accent-primary"
                />
                <output className="text-center text-3xl font-semibold">
                  {flow.intensity}
                  <span className="text-base font-normal text-muted-foreground"> / 10</span>
                </output>
                <span className="nivo-caption">0: tidak terasa · 10: sangat kuat</span>
              </label>
              <div>
                <p className="mb-2 text-sm font-medium">Apa pemicunya? (opsional)</p>
                <div
                  role="group"
                  aria-label="Pilih pemicu craving"
                  className="flex flex-wrap gap-2"
                >
                  {triggerChoices.map((trigger) => (
                    <button
                      type="button"
                      aria-pressed={flow.trigger === trigger}
                      key={trigger}
                      onClick={() =>
                        dispatch({
                          type: 'trigger',
                          value: flow.trigger === trigger ? '' : trigger,
                        })
                      }
                      className={`min-h-11 rounded-full border px-3 text-sm ${flow.trigger === trigger ? 'border-secondary/30 bg-secondary/15 text-accent' : 'border-primary/10 bg-white/70 hover:bg-primary/5'}`}
                    >
                      {trigger}
                    </button>
                  ))}
                </div>
              </div>
              <label className="nivo-field">
                Pemicu dalam kata-katamu (opsional)
                <input
                  value={flow.trigger}
                  maxLength={60}
                  onChange={(event) => dispatch({ type: 'trigger', value: event.target.value })}
                />
              </label>
              <button type="button" className="nivo-action" onClick={() => changeStep('practice')}>
                Lanjut ke latihan
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          )}
          {flow.step === 'practice' && (
            <div className="nivo-stack">
              <div
                className="grid gap-2 sm:grid-cols-2"
                role="group"
                aria-label="Pilih latihan jeda"
              >
                {cravingPractices.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={flow.practice === item.id}
                    onClick={() => dispatch({ type: 'practice', value: item.id })}
                    className={`min-h-14 rounded-xl border p-3 text-left ${flow.practice === item.id ? 'border-secondary/30 bg-secondary/10 text-accent' : 'border-primary/10 bg-white/70'}`}
                  >
                    <span className="block font-medium">{item.title}</span>
                    <span className="text-sm">{item.seconds / 60} menit</span>
                  </button>
                ))}
              </div>
              {practice.body.map((paragraph) => (
                <p className="text-sm text-muted-foreground" key={paragraph}>
                  {paragraph}
                </p>
              ))}
              {flow.endAt === null ? (
                <button
                  type="button"
                  className="nivo-action"
                  onClick={() =>
                    dispatch({ type: 'start_practice', at: Date.now(), seconds: practice.seconds })
                  }
                >
                  <Wind size={17} aria-hidden="true" />
                  Mulai latihan
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 py-3">
                  <motion.div
                    className="flex h-36 w-36 flex-col items-center justify-center rounded-full border border-primary/15 bg-white/70"
                    aria-hidden="true"
                    animate={{
                      scale:
                        reducedMotion || flow.practice !== 'breathing' || left === 0
                          ? 1
                          : phase.phase === 'inhale'
                            ? 1.07
                            : 1,
                    }}
                    transition={{ duration: reducedMotion ? 0 : phase.seconds, ease: 'easeInOut' }}
                  >
                    <Heart className="mb-1 text-primary" size={24} />
                    <span className="text-2xl font-semibold tabular-nums">
                      {countdownLabel(left)}
                    </span>
                  </motion.div>
                  <p className="text-center text-lg font-medium">
                    {left === 0
                      ? 'Jeda selesai. Pilih langkah berikutnya.'
                      : flow.practice === 'breathing'
                        ? `${phase.label} · ${phase.count}`
                        : 'Amati sensasi saat ini, satu momen pada satu waktu.'}
                  </p>
                  <p className="nivo-caption" role="timer" aria-live="off">
                    {left > 0 ? `Sisa latihan ${countdownLabel(left)}` : 'Latihan selesai'}
                  </p>
                </div>
              )}
              <p className="nivo-caption">
                Kamu dapat lanjut atau memilih hasil kapan saja. Timer mengikuti waktu yang berlalu
                meski tab berada di latar.
              </p>
              <button type="button" className="nivo-action" onClick={() => changeStep('reason')}>
                Lanjut ke alasanmu
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          )}
          {flow.step === 'reason' && (
            <div className="nivo-stack">
              {state.ownReason || reasons.length ? (
                <blockquote className="rounded-2xl border border-secondary/20 bg-white/70 p-4">
                  <p className="break-words font-medium">
                    {state.ownReason || reasons.join(' · ')}
                  </p>
                  {state.ownReason && !!reasons.length && (
                    <p className="mt-2 text-sm text-muted-foreground">{reasons.join(' · ')}</p>
                  )}
                </blockquote>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Pikirkan satu hal yang penting bagimu. Kamu bebas melewati langkah ini.
                  </p>
                  <Link href="/pencapaian" className="nivo-text-link">
                    Tambahkan alasan di rencanamu
                  </Link>
                </>
              )}
              {coping && (
                <div>
                  <h4 className="mb-2 font-medium">Langkah pilihanmu</h4>
                  <ol className="list-decimal space-y-2 pl-5 text-sm">
                    {coping.steps.map((item, index) => (
                      <li key={index} className="break-words">
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <button type="button" className="nivo-action" onClick={() => changeStep('result')}>
                Pilih hasilnya
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          )}
          {flow.step === 'result' && (
            <div className="nivo-stack">
              <div className="grid gap-2" role="group" aria-label="Hasil Craving SOS">
                {(
                  [
                    { value: 'passed', label: 'Keinginan mereda' },
                    { value: 'ongoing', label: 'Masih kuat' },
                    { value: 'smoked', label: 'Saya merokok' },
                  ] as const
                ).map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    disabled={busy || saving}
                    aria-pressed={flow.outcome === item.value}
                    onClick={() => dispatch({ type: 'outcome', value: item.value })}
                    className={`min-h-12 rounded-xl border px-4 py-3 text-left font-medium ${flow.outcome === item.value ? 'border-primary bg-primary/5 text-primary' : 'border-primary/10 bg-white/70 hover:bg-secondary/10'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {flow.outcome === 'ongoing' && (
                <>
                  <p className="nivo-caption">
                    Kamu bisa mengulang jeda atau berbicara dengan layanan bantuan.
                  </p>
                  <button
                    type="button"
                    className="nivo-action nivo-action-secondary"
                    onClick={() => {
                      dispatch({ type: 'practice', value: flow.practice });
                      changeStep('practice');
                    }}
                  >
                    <RotateCcw size={17} aria-hidden="true" />
                    Ulangi latihan
                  </button>
                  <SupportChoices />
                </>
              )}
              {flow.outcome === 'smoked' && (
                <p className="nivo-caption">
                  Satu kejadian tidak menghapus kemajuanmu. Setelah tersimpan, kamu bisa mencatat
                  jumlah batang dan langkah berikutnya.
                </p>
              )}
              <label className="nivo-field">
                Catatan untuk dirimu (opsional)
                <textarea
                  rows={3}
                  value={flow.note}
                  maxLength={500}
                  onChange={(event) => dispatch({ type: 'note', value: event.target.value })}
                />
              </label>
              <button
                type="button"
                className="nivo-action"
                disabled={!flow.outcome || busy || saving}
                onClick={save}
              >
                {saving ? 'Menyimpan…' : 'Simpan hasil'}
              </button>
            </div>
          )}
          {flow.step !== 'result' && (
            <button
              type="button"
              className="nivo-action nivo-action-secondary mt-4"
              onClick={() => changeStep('result')}
            >
              Pilih hasil sekarang
            </button>
          )}
        </>
      )}
    </Panel>
  );
}

function SupportChoices() {
  return (
    <div className="nivo-button-row">
      <Link href="/contact-professional" className="nivo-action nivo-action-secondary">
        Lihat layanan konseling
      </Link>
      <a href={support.quitline.href} className="nivo-text-link">
        Telepon Quitline.INA
      </a>
    </div>
  );
}
