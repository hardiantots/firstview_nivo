'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SetupFrame from './SetupFrame';
import JourneyWizard from '@/features/journey/JourneyWizard';
import { JourneySyncStatus } from '@/features/journey/JourneySyncStatus';
import { Panel } from '@/components/ui/nivo';
import { useJourneyState } from '@/shared/journey/client';
import { localDate } from '@/shared/journey/domain';
import { needsJourneySetup } from '@/shared/journey/onboarding';
import { signInReturnPath } from '@/shared/auth/return-path';

function destination() {
  const next = signInReturnPath(new URLSearchParams(window.location.search).get('next'));
  const path = new URL(next, 'https://nivo.invalid').pathname;
  return path === '/onboarding' || path.startsWith('/onboarding/') ? '/home' : next;
}

export default function JourneySetupScreen() {
  const router = useRouter(),
    journey = useJourneyState(),
    checked = useRef(false);
  const snapshot = journey.snapshot;
  useEffect(() => {
    if (!snapshot || checked.current || journey.pending) return;
    checked.current = true;
    if (!needsJourneySetup(snapshot.state)) router.replace(destination());
  }, [snapshot, journey.pending, router]);
  return (
    <SetupFrame
      title="Siapkan langkah pertamamu"
      description="Pilih motivasi dan waktu yang sesuai denganmu. Rencana ini bisa diubah melalui menu Perjalanan."
      backHref="/craving-support"
      backLabel="Butuh bantuan sekarang"
    >
      <div className="nivo-stack">
        <JourneySyncStatus journey={journey} />
        {snapshot ? (
          <JourneyWizard
            state={snapshot.state}
            today={localDate(new Date(), snapshot.state.timezone)}
            busy={journey.busy || !!journey.pending}
            onSave={journey.save}
            onboarding
            onComplete={() => {
              router.replace(destination());
            }}
          />
        ) : (
          <Panel title={journey.error ? 'Rencana belum dapat dimuat' : 'Memuat rencana awal'}>
            {journey.error ? (
              <button type="button" className="nivo-action" onClick={journey.refresh}>
                Coba muat lagi
              </button>
            ) : (
              <p role="status">Menyiapkan pilihanmu…</p>
            )}
          </Panel>
        )}
      </div>
    </SetupFrame>
  );
}
