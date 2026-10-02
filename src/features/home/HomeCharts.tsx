'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Panel } from '@/components/ui/nivo';
import { TrendArea } from '@/features/charts/lazy';
import { ChartSkeleton } from '@/features/charts/chart-skeleton';
import { displayDay, rupiah } from '@/features/charts/data';
import { Ring } from '@/features/charts/ring';
import type { JourneyState } from '@/shared/journey/domain';
import { dashboardData, type DashboardPeriod } from './dashboard-data';

const SavingsChart = dynamic(
  () => import('./home-chart-visuals').then((module) => module.SavingsChart),
  { ssr: false, loading: ChartSkeleton },
);
const OutcomeChart = dynamic(
  () => import('./home-chart-visuals').then((module) => module.OutcomeChart),
  { ssr: false, loading: ChartSkeleton },
);

export default function HomeCharts({ state, today }: { state: JourneyState; today: string }) {
  const [days, setDays] = useState<DashboardPeriod>(7);
  const data = useMemo(() => dashboardData(state, today, days), [state, today, days]);
  const { period } = data;
  return (
    <section className="nivo-stack" aria-label="Grafik ringkasan beranda">
      <header className="nivo-home-charts-heading">
        <div>
          <p className="nivo-eyebrow">Dari catatanmu</p>
          <h2 className="text-xl font-semibold tracking-tight">Lihat langkah kecilmu</h2>
          <p className="nivo-caption mt-1">
            {displayDay(data.series[0].day)} – {displayDay(today)}
          </p>
        </div>
        <div className="nivo-period-picker" role="group" aria-label="Rentang grafik beranda">
          {([7, 30] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={days === value}
              onClick={() => setDays(value)}
            >
              {value} hari
            </button>
          ))}
        </div>
      </header>
      <div className="nivo-home-chart-grid">
        <Panel title="Tren konsumsi" eyebrow={`${days} hari terakhir`}>
          <p className="nivo-home-chart-value">
            {period.average === null
              ? 'Belum ada catatan'
              : `${period.average.toLocaleString('id-ID', { maximumFractionDigits: 1 })} batang`}
            <span>
              {period.average === null
                ? 'Mulai dengan mencatat hari ini'
                : 'rata-rata per hari tercatat'}
            </span>
          </p>
          <TrendArea data={data.series} />
          <details className="nivo-disclosure">
            <summary>Lihat angka konsumsi</summary>
            <dl className="nivo-chart-details">
              {data.series.map((point) => (
                <div key={point.day}>
                  <dt>{displayDay(point.day)}</dt>
                  <dd>
                    {point.cigarettes === null ? 'Belum tercatat' : `${point.cigarettes} batang`}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        </Panel>
        <Panel title="Ruang untuk tabunganmu" eyebrow="Akumulasi estimasi" tone="soft">
          <p className="nivo-home-chart-value">
            {period.saved === null ? 'Belum tersedia' : rupiah(period.saved)}
            <span>estimasi hemat pada periode ini</span>
          </p>
          {period.estimateDays === 0 ? (
            <p className="nivo-caption py-6">
              Isi kebiasaan awal dan catatan harian untuk melihat estimasi hemat.
            </p>
          ) : (
            <SavingsChart data={data.savings} />
          )}
          <p className="nivo-caption">
            Memakai baseline dan harga yang melekat pada {period.estimateDays} dari {period.logged}{' '}
            hari tercatat. Celah berarti data estimasi belum tersedia.
          </p>
          <details className="nivo-disclosure">
            <summary>Lihat angka estimasi hemat</summary>
            <dl className="nivo-chart-details">
              {data.savings.map((point) => (
                <div key={point.day}>
                  <dt>{displayDay(point.day)}</dt>
                  <dd>{point.saved === null ? 'Belum tersedia' : rupiah(point.saved)}</dd>
                </div>
              ))}
            </dl>
            <p>
              Selisih positif konsumsi awal dan jumlah batang × harga per batang. Perubahan
              kebiasaan awal tidak menghitung ulang catatan lama.
            </p>
          </details>
        </Panel>
        <Panel title="Hasil jedamu" eyebrow="Catatan Craving SOS">
          {state.insightsHidden ? (
            <p className="nivo-caption py-6">
              Insight disembunyikan sesuai pilihanmu. Kamu dapat menampilkannya kembali dari Catatan
              harian.
            </p>
          ) : data.cravingTotal === 0 ? (
            <p className="nivo-caption py-6">
              Belum ada hasil craving tercatat pada periode ini. Catat dari Craving SOS saat kamu
              membutuhkannya.
            </p>
          ) : (
            <>
              <OutcomeChart data={data.outcomes} />
              <dl className="nivo-outcome-legend" aria-label="Jumlah hasil craving">
                {data.outcomes.map((item) => (
                  <div key={item.outcome}>
                    <dt>
                      <span style={{ backgroundColor: item.color }} aria-hidden="true" />
                      {item.label}
                    </dt>
                    <dd>{item.total} kejadian</dd>
                  </div>
                ))}
              </dl>
              <p className="nivo-caption mt-3">
                {data.cravingTotal} kejadian dengan hasil tercatat. Check-in lama tanpa hasil tidak
                dimasukkan.
              </p>
            </>
          )}
        </Panel>
        <Panel title="Ritme mencatatmu" eyebrow="Periode pilihanmu" tone="soft">
          <Ring
            value={(period.logged / days) * 100}
            label="Hari yang sudah tercatat"
            hint={`${period.logged} dari ${days} hari`}
            tone="secondary"
          />
          <p className="nivo-caption mt-4">
            Catatan 0 batang tetap dihitung sebagai isian. Hari yang kosong belum memberi informasi
            tentang konsumsi.
          </p>
          <Link href="/tracker" className="nivo-text-link mt-4 inline-flex items-center gap-2">
            Lihat catatan lengkap
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </Panel>
      </div>
    </section>
  );
}
