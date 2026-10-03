'use client';
import { useEffect, useRef, useState } from 'react';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { JourneyField } from '@/components/ui/journey-field';
import { MOTIVATION_OPTIONS } from '@/content/copy-id';
import { authenticatedRequest } from '@/shared/api/client';
import { JourneyAction, JourneyState } from '@/shared/journey/domain';
import { formatDate } from '@/shared/lib/format';
import { CrisisSupport } from '@/features/support/NationalSupport';
import { hasJourneyMotivation } from '@/shared/journey/onboarding';

export default function JourneyWizard({
  state,
  today,
  busy,
  onSave,
  onboarding = false,
  onComplete,
}: {
  state: JourneyState;
  today: string;
  busy: boolean;
  onSave: (action: JourneyAction) => Promise<boolean>;
  onboarding?: boolean;
  onComplete?: () => void;
}) {
  const baseline = state.baselines.at(-1);
  const [step, setStep] = useState(onboarding && hasJourneyMotivation(state) ? 3 : 1),
    [selected, setSelected] = useState(state.motivations || []),
    [reason, setReason] = useState(state.ownReason || '');
  const [cigarettes, setCigarettes] = useState(String(baseline?.cigarettesPerDay ?? 0)),
    [price, setPrice] = useState(String(baseline?.pricePerCigarette ?? 0)),
    [priceMode, setPriceMode] = useState('single'),
    [packSize, setPackSize] = useState('16'),
    [minutes, setMinutes] = useState(state.minutesToFirstCigarette?.toString() || ''),
    [reward, setReward] = useState(state.rewardGoal || '');
  const [mode, setMode] = useState(
      state.actualQuitDate ? 'stopped' : state.reduceFirst ? 'reduce' : 'target',
    ),
    [date, setDate] = useState(state.actualQuitDate || state.targetQuitDate || today),
    [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  const reasonsTouched = useRef(false);
  const initialState = useRef(state);
  useEffect(() => {
    if (!onboarding || state === initialState.current) return;
    if (hasJourneyMotivation(state)) {
      setStep(state.targetQuitDate || state.actualQuitDate || state.reduceFirst ? 4 : 3);
    }
  }, [state, onboarding]);
  useEffect(() => {
    let disposed = false;
    authenticatedRequest('/api/profile')
      .then((result) => {
        if (!disposed && !reasonsTouched.current) {
          setSelected(result.profile?.motivations || initialState.current.motivations || []);
          setReason(result.profile?.own_reason || initialState.current.ownReason || '');
        }
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, []);
  const save = async (action: JourneyAction) => {
    setError('');
    setNotice('');
    if (
      onboarding &&
      action.type === 'reasons' &&
      !action.motivations.length &&
      !action.ownReason.trim()
    ) {
      setError('Pilih setidaknya satu motivasi atau tulis alasanmu sendiri.');
      return;
    }
    try {
      if (await onSave(action)) {
        setNotice('Langkah ini tersimpan.');
        setStep((value) => (onboarding && value === 1 ? 3 : Math.min(4, value + 1)));
      }
    } catch {
      setError('Periksa kembali isianmu.');
    }
  };
  const choices = [...new Set([...MOTIVATION_OPTIONS, ...selected])];
  return (
    <Panel
      title={
        step === 4
          ? 'Rencanamu'
          : onboarding
            ? `Rencana awal · ${step === 1 ? 1 : 2} dari 2`
            : `Susun rencana · ${step} dari 3`
      }
    >
      <div className="nivo-button-row" aria-label="Langkah rencana">
        {['Alasanmu', 'Kebiasaan awal', 'Tanggal berhenti'].map(
          (label, index) =>
            (!onboarding || index !== 1) && (
              <button
                className="nivo-action nivo-action-secondary"
                key={label}
                disabled={busy || (onboarding && index === 2 && !hasJourneyMotivation(state))}
                aria-pressed={step === index + 1}
                onClick={() => {
                  setStep(index + 1);
                  setNotice('');
                }}
              >
                {onboarding && index === 2 ? 2 : index + 1}. {label}
              </button>
            ),
        )}
      </div>
      {error && <StateNotice error>{error}</StateNotice>}
      {notice && <StateNotice>{notice}</StateNotice>}
      {step === 1 && (
        <form
          className="nivo-stack"
          onSubmit={(event) => {
            event.preventDefault();
            save({ type: 'reasons', motivations: selected, ownReason: reason });
          }}
        >
          <p>Pilih sampai dua alasan yang penting bagimu.</p>
          {onboarding && (
            <p className="nivo-caption">
              Pilih setidaknya satu motivasi atau isi alasanmu sendiri untuk melanjutkan.
            </p>
          )}
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Alasan berhenti</legend>
            {choices.map((choice) => (
              <label className="nivo-checkbox nivo-choice-surface" key={choice}>
                <input
                  type="checkbox"
                  checked={selected.includes(choice)}
                  disabled={!selected.includes(choice) && selected.length >= 2}
                  onChange={(event) => {
                    reasonsTouched.current = true;
                    setSelected((values) =>
                      event.target.checked
                        ? [...values, choice]
                        : values.filter((value) => value !== choice),
                    );
                  }}
                />
                <span>{choice}</span>
              </label>
            ))}
          </fieldset>
          <label className="nivo-field">
            Alasanku sendiri (opsional)
            <textarea
              maxLength={300}
              value={reason}
              onChange={(event) => {
                reasonsTouched.current = true;
                setReason(event.target.value);
              }}
            />
          </label>
          <CrisisSupport text={reason} />
          <button className="nivo-action" disabled={busy || selected.length > 2}>
            Simpan alasan
          </button>
        </form>
      )}
      {step === 2 && (
        <form
          className="nivo-stack"
          onSubmit={(event) => {
            event.preventDefault();
            save({
              type: 'baseline',
              cigarettesPerDay: Number(cigarettes),
              pricePerCigarette:
                priceMode === 'pack' ? Number(price) / Number(packSize) : Number(price),
              minutesToFirstCigarette: minutes === '' ? null : Number(minutes),
              rewardGoal: reward,
            });
          }}
        >
          <JourneyField
            label="Kebiasaan awal · batang per hari"
            type="number"
            min={0}
            max={200}
            required
            value={cigarettes}
            onChange={(event) => setCigarettes(event.target.value)}
          />
          <label className="nivo-field">
            Cara memasukkan harga
            <select value={priceMode} onChange={(event) => setPriceMode(event.target.value)}>
              <option value="single">Harga per batang</option>
              <option value="pack">Harga per bungkus</option>
            </select>
          </label>
          <JourneyField
            label={
              priceMode === 'pack' ? 'Harga per bungkus (rupiah)' : 'Harga per batang (rupiah)'
            }
            type="number"
            min={0}
            max={priceMode === 'pack' ? 10000000 : 1000000}
            required
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
          {priceMode === 'pack' && (
            <JourneyField
              label="Isi bungkus (batang)"
              type="number"
              min={1}
              max={200}
              required
              value={packSize}
              onChange={(event) => setPackSize(event.target.value)}
            />
          )}
          <JourneyField
            label="Menit sampai rokok pertama setelah bangun (opsional)"
            type="number"
            min={0}
            max={1440}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
          <JourneyField
            label="Tabungan untuk (opsional)"
            maxLength={160}
            value={reward}
            onChange={(event) => setReward(event.target.value)}
          />
          <p className="nivo-caption">
            Setiap perubahan kebiasaan awal membuat versi baru. Estimasi catatan lama tetap memakai
            asumsi saat dicatat.
          </p>
          <button className="nivo-action" disabled={busy}>
            Simpan kebiasaan awal
          </button>
        </form>
      )}
      {step === 3 && (
        <form
          className="nivo-stack"
          onSubmit={(event) => {
            event.preventDefault();
            save({
              type: 'plan',
              timezone: state.timezone,
              targetQuitDate: mode === 'target' ? date : null,
              actualQuitDate: mode === 'stopped' ? date : null,
              reduceFirst: mode === 'reduce',
            });
          }}
        >
          <fieldset className="nivo-stack">
            <legend className="mb-3 font-medium">Apa langkahmu sekarang?</legend>
            {[
              ['target', 'Pilih tanggal berhenti'],
              ['reduce', 'Saya mau mengurangi bertahap dulu'],
              ['stopped', 'Saya sudah mulai berhenti'],
            ].map(([value, label]) => (
              <label className="nivo-checkbox" key={value}>
                <input
                  type="radio"
                  name="quit-mode"
                  checked={mode === value}
                  onChange={() => {
                    setMode(value);
                    setDate(today);
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          {mode !== 'reduce' && (
            <JourneyField
              label={mode === 'stopped' ? 'Tanggal mulai berhenti' : 'Tanggal pilihanmu'}
              type="date"
              required
              min={mode === 'stopped' ? '1970-01-01' : today}
              max={mode === 'stopped' ? today : undefined}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              hint={formatDate(date)}
            />
          )}
          <p className="nivo-caption">
            Waktu mengikuti {state.timezone.replace('Asia/', '')}. Ubah zona waktu melalui profil
            jika perlu.
          </p>
          <button className="nivo-action" disabled={busy}>
            Simpan tanggal
          </button>
        </form>
      )}
      {step === 4 && (
        <div className="nivo-stack">
          <p>
            {state.ownReason ||
              state.motivations?.join(', ') ||
              'Alasanmu belum diisi. Kamu dapat menambahkannya kapan saja.'}
          </p>
          {!onboarding && (
            <p>
              {state.baselines.at(-1)
                ? `Kebiasaan awal: ${state.baselines.at(-1).cigarettesPerDay} batang per hari.`
                : 'Kebiasaan awal belum diisi.'}
            </p>
          )}
          <p>
            {state.actualQuitDate
              ? `Mulai berhenti pada ${formatDate(state.actualQuitDate)}.`
              : state.targetQuitDate
                ? `Tanggal pilihanmu: ${formatDate(state.targetQuitDate)}.`
                : 'Mulai dari mengurangi bertahap sesuai pilihanmu.'}
          </p>
          <p className="nivo-caption">Kamu bisa mengubah rencana melalui menu Perjalanan.</p>
          {onboarding && (
            <p className="nivo-caption">
              Tambahkan kebiasaan awal dan harga rokok di Perjalanan jika ingin melihat estimasi
              hemat.
            </p>
          )}
          {onboarding && (
            <button type="button" className="nivo-action" disabled={busy} onClick={onComplete}>
              Mulai perjalanan
            </button>
          )}
        </div>
      )}
      {!onboarding && step < 4 && (
        <button
          className="nivo-text-link"
          disabled={busy}
          onClick={() => setStep((value) => value + 1)}
        >
          Lewati langkah ini
        </button>
      )}
    </Panel>
  );
}
