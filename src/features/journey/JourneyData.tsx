'use client';
import { useState } from 'react';
import { Panel, StateNotice } from '@/components/ui/nivo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { authenticatedRequest } from '@/shared/api/client';
import { JourneySnapshot } from '@/shared/journey/domain';
import { JourneyExports } from './JourneyExports';
import LegacyRecords from './LegacyRecords';

export default function JourneyData({
  snapshot,
  busy,
  refresh,
}: {
  snapshot: JourneySnapshot;
  busy: boolean;
  refresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [confirmation, setConfirmation] = useState(''),
    [deleting, setDeleting] = useState(false),
    [error, setError] = useState('');
  return (
    <div className="nivo-stack">
      <JourneyExports busy={busy} />
      <Panel title="Data dalam kendalimu">
        <p>
          Ekspor terlebih dahulu jika ingin menyimpan salinan. Menghapus perjalanan juga mematikan
          pengingat dan mencabut izin pendamping atas perjalanan ini. Akun, profil, data terdahulu,
          dan konsultasi tetap ada.
        </p>
        <details className="nivo-disclosure">
          <summary>Ekspor JSON lanjutan</summary>
          <p className="nivo-caption">
            Salinan dokumen perjalanan, preferensi, dan riwayat perubahan; tidak termasuk profil
            atau percakapan konsultasi.
          </p>
          <button
            className="nivo-action nivo-action-secondary"
            disabled={busy}
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }),
              );
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = 'nivo-perjalanan.json';
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            Ekspor JSON
          </button>
        </details>
        <button
          className="nivo-action nivo-action-danger"
          disabled={busy}
          onClick={() => {
            setError('');
            setConfirmation('');
            setOpen(true);
          }}
        >
          Hapus data perjalanan
        </button>
        <p className="nivo-caption nivo-data-note">
          Catatan terdahulu tetap disimpan secara terpisah dan dapat ditinjau di bawah.
        </p>
      </Panel>
      <LegacyRecords />
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!deleting) setOpen(value);
        }}
      >
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (deleting) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (deleting) event.preventDefault();
          }}
        >
          <DialogTitle>Hapus data perjalanan?</DialogTitle>
          <DialogDescription>
            Catatan, hasil bantuan craving, rencana, dan latihan akan dihapus. Pengingat dimatikan
            dan izin berbagi perjalanan dicabut. Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
          {error && <StateNotice error>{error}</StateNotice>}
          <label className="nivo-field">
            Ketik HAPUS PERJALANAN
            <input
              value={confirmation}
              disabled={deleting}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <DialogFooter>
            <button
              autoFocus
              disabled={deleting}
              className="nivo-action nivo-action-secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </button>
            <button
              className="nivo-action nivo-action-danger"
              disabled={busy || deleting || confirmation !== 'HAPUS PERJALANAN'}
              onClick={async () => {
                if (deleting) return;
                setDeleting(true);
                setError('');
                try {
                  await authenticatedRequest('/api/journey', {
                    method: 'DELETE',
                    body: JSON.stringify({
                      expectedRevision: snapshot.revision,
                      confirm: confirmation,
                    }),
                  });
                  await refresh();
                  setOpen(false);
                  setConfirmation('');
                } catch (e) {
                  setError(e.message);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Menghapus…' : 'Ya, hapus perjalanan'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
