'use client';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { useJourneyState } from '@/shared/journey/client';
import { PendingSummary } from './JourneyVisuals';

export function JourneySyncStatus({ journey: j }: { journey: ReturnType<typeof useJourneyState> }) {
  return (
    <>
      {j.error && <StateNotice error>{j.error}</StateNotice>}
      {j.notice && <StateNotice>{j.notice}</StateNotice>}
      {j.pending && (
        <Panel title="Ada isian yang belum tersinkron" tone="soft">
          <p>Tinjau isian sebelum mengirim ulang.</p>
          <PendingSummary action={j.pending.action} />
          <div className="nivo-button-row">
            <button
              type="button"
              className="nivo-action"
              disabled={j.busy}
              onClick={() => j.retry()}
            >
              Kirim ulang
            </button>
            <button
              type="button"
              className="nivo-action nivo-action-secondary"
              disabled={j.busy}
              onClick={j.refresh}
            >
              Muat versi server
            </button>
          </div>
          <details className="nivo-disclosure">
            <summary>Pilihan jika catatan berubah di perangkat lain</summary>
            <div className="nivo-stack">
              <p>
                Setelah meninjau versi terbaru, kamu dapat menerapkan isian di atas atau
                membatalkannya.
              </p>
              <button
                type="button"
                className="nivo-action nivo-action-secondary"
                disabled={j.busy}
                onClick={() => j.retry(true)}
              >
                Terapkan isian ini pada versi terbaru
              </button>
              <button
                type="button"
                className="nivo-text-link"
                disabled={j.busy}
                onClick={j.discard}
              >
                Batalkan isian tertunda
              </button>
            </div>
          </details>
        </Panel>
      )}
    </>
  );
}
