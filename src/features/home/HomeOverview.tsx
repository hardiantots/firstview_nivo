'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { CalendarCheck, Sprout, Wallet } from 'lucide-react';
import { Panel } from '@/components/ui/nivo';
import { Ring } from '@/features/charts/ring';
import { rupiah } from '@/features/charts/data';
import type { JourneyState } from '@/shared/journey/domain';
import illustration from '@/shared/assets/assetsfirstpage.png';
import abstractTexture from '@/shared/assets/abstract-header.jpg';
import { dashboardData } from './dashboard-data';

export default function HomeOverview({ state, today }: { state: JourneyState; today: string }) {
  const { progress, nextMilestone, milestonePercentage, weekLogged } = useMemo(
    () => dashboardData(state, today, 7),
    [state, today],
  );
  return (
    <Panel
      title="Setiap langkahmu berarti"
      eyebrow="Progres perjalanan"
      className="nivo-home-overview"
    >
      <Image
        src={abstractTexture}
        alt=""
        fill
        sizes="(min-width: 1100px) 900px, 100vw"
        className="nivo-home-texture"
      />
      <div className="nivo-home-overview-content">
        <Ring
          value={milestonePercentage}
          label={`Menuju ${nextMilestone} hari bebas rokok tercatat`}
          hint={`${progress.zeroDays} dari ${nextMilestone} hari`}
          className="nivo-progress-ring-large"
        />
        <div className="nivo-stack">
          <p className="nivo-home-highlight">
            <strong>{progress.zeroDays}</strong> hari bebas rokok sudah kamu catat.
          </p>
          <p className="text-sm text-muted-foreground">
            Kemajuan dari hari-hari yang tercatat tetap berarti. Kamu bisa melanjutkan dari satu
            pilihan hari ini.
          </p>
          <dl className="nivo-home-metrics">
            <div>
              <dt>
                <CalendarCheck size={17} aria-hidden="true" />
                Catatan minggu ini
              </dt>
              <dd>
                {weekLogged}
                <span> / 7 hari</span>
              </dd>
            </div>
            <div>
              <dt>
                <Wallet size={17} aria-hidden="true" />
                Total hemat (estimasi)
              </dt>
              <dd>{progress.saved === null ? 'Belum tersedia' : rupiah(progress.saved)}</dd>
            </div>
          </dl>
          <p className="nivo-caption flex items-start gap-2">
            <Sprout size={16} className="shrink-0 text-accent" aria-hidden="true" />
            Total hari tercatat, bukan streak. Hari tanpa catatan dan hari dengan kejadian merokok
            tidak masuk capaian.
          </p>
        </div>
        <Image
          src={illustration}
          alt=""
          sizes="(min-width: 1100px) 150px, 110px"
          className="nivo-home-illustration"
        />
      </div>
    </Panel>
  );
}
