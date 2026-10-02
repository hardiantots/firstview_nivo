'use client';
import { useState } from 'react';
import { Panel } from '@/components/ui/nivo';
import { JourneyField } from '@/components/ui/journey-field';
import { JourneyAction, JourneyState } from '@/shared/journey/domain';
import { useCountdown } from '@/shared/hooks/use-countdown';

export default function CopingPlans({
  state,
  busy,
  onSave,
}: {
  state: JourneyState;
  busy: boolean;
  onSave: (action: JourneyAction) => Promise<boolean>;
}) {
  const [planId, setPlanId] = useState(''),
    [step, setStep] = useState(0),
    [endAt, setEndAt] = useState<number | null>(null);
  const seconds = useCountdown(endAt),
    plan = state.coping.find((item) => item.id === planId);
  return (
    <Panel title="Langkah saat pemicu muncul" tone="soft">
      {state.coping.length > 0 && (
        <label className="nivo-field">
          Gunakan rencana
          <select
            value={planId}
            onChange={(event) => {
              setPlanId(event.target.value);
              setStep(0);
              setEndAt(null);
            }}
          >
            <option value="">Pilih rencana</option>
            {state.coping.map((item) => (
              <option key={item.id} value={item.id}>
                {item.trigger}
              </option>
            ))}
          </select>
        </label>
      )}
      {plan && (
        <div className="nivo-stack">
          <p aria-live="polite">
            Langkah {step + 1}: {plan.steps[step]}
          </p>
          <div className="nivo-button-row">
            <button
              className="nivo-action nivo-action-secondary"
              onClick={() => setStep((value) => (value + 1) % plan.steps.length)}
            >
              Langkah berikutnya
            </button>
            <button
              className="nivo-action nivo-action-secondary"
              onClick={() => setEndAt(seconds ? null : Date.now() + 60000)}
            >
              {seconds ? `Hentikan timer (${seconds} detik)` : 'Timer opsional 60 detik'}
            </button>
          </div>
          <p>Apakah langkahmu membantu?</p>
          <div className="nivo-button-row">
            {(['yes', 'no', 'unsure'] as const).map((helped, index) => (
              <button
                key={helped}
                disabled={busy}
                className="nivo-action nivo-action-secondary"
                onClick={() => onSave({ type: 'coping_feedback', planId, helped })}
              >
                {['Ya', 'Belum', 'Belum yakin'][index]}
              </button>
            ))}
          </div>
        </div>
      )}
      <form
        className="nivo-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget,
            data = new FormData(form);
          if (
            await onSave({
              type: 'coping',
              trigger: String(data.get('trigger')),
              steps: ['one', 'two', 'three']
                .map((key) => String(data.get(key) || '').trim())
                .filter(Boolean),
            })
          )
            form.reset();
        }}
      >
        <p>Simpan dua atau tiga langkah sederhana pilihanmu.</p>
        <JourneyField label="Jika pemicu ini muncul" name="trigger" required maxLength={120} />
        <JourneyField label="Langkah pilihan pertama" name="one" required maxLength={160} />
        <JourneyField label="Langkah kedua" name="two" required maxLength={160} />
        <JourneyField label="Langkah ketiga (opsional)" name="three" maxLength={160} />
        <button className="nivo-action" disabled={busy}>
          Simpan langkah saya
        </button>
      </form>
    </Panel>
  );
}
