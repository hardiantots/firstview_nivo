import { Award, Sprout, Wallet } from 'lucide-react';
import { Panel } from '@/components/ui/nivo';
import { JourneyState } from '@/shared/journey/domain';
import { journeyProgress, rupiah } from '@/features/charts/data';

export function JourneyProgress({ state, today }: { state: JourneyState; today: string }) {
  const { zeroDays, saved, avoided, estimateDays, logged } = journeyProgress(state, today);
  return (
    <Panel title="Kemajuan yang tetap berarti" eyebrow="Seluruh catatanmu" tone="soft">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sprout size={17} aria-hidden="true" />
            Total hari bebas rokok tercatat
          </dt>
          <dd className="mt-2 text-2xl font-semibold">{zeroDays} hari</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <Award size={17} aria-hidden="true" />
            Batang dihindari (estimasi)
          </dt>
          <dd className="mt-2 text-2xl font-semibold">
            {avoided === null
              ? 'Belum tersedia'
              : avoided.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet size={17} aria-hidden="true" />
            Uang hemat (estimasi)
          </dt>
          <dd className="mt-2 break-words text-2xl font-semibold">
            {saved === null ? 'Belum tersedia' : rupiah(saved)}
          </dd>
        </div>
      </dl>
      {state.rewardGoal && (
        <p className="mt-4 break-words text-sm">
          Tabungan untuk <strong>{state.rewardGoal}</strong>
        </p>
      )}
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Lencana total hari bebas rokok">
        {[1, 3, 7, 14, 30].map((milestone) => (
          <li
            key={milestone}
            className={`rounded-full border px-3 py-2 text-sm ${zeroDays >= milestone ? 'border-secondary/30 bg-secondary/10 text-accent' : 'border-border bg-white/60 text-muted-foreground'}`}
          >
            <span aria-hidden="true">{zeroDays >= milestone ? '✓ ' : ''}</span>
            {milestone} hari
            <span className="sr-only">
              {zeroDays >= milestone ? ', tercapai' : ', belum tercapai'}
            </span>
          </li>
        ))}
      </ul>
      <p className="nivo-caption mt-3">
        Kemajuan dihitung dari seluruh hari yang tercatat 0 batang tanpa kejadian merokok pada hari
        tersebut. Hari tanpa catatan tidak dianggap bebas rokok; satu kejadian merokok tidak
        menghapus kemajuan pada hari lain.
      </p>
      <details className="nivo-disclosure">
        <summary>Dasar perhitungan kemajuan</summary>
        <p>
          Estimasi memakai baseline dan harga per batang yang melekat pada setiap catatan. Selisih
          yang negatif dihitung sebagai 0. Estimasi tersedia untuk {estimateDays} dari {logged} hari
          tercatat. Perubahan data awal tidak menghitung ulang riwayat lama. Jumlah slip tidak
          otomatis ditambahkan ke total batang harian.
        </p>
      </details>
    </Panel>
  );
}
