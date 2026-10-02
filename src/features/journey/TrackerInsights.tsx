'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { authenticatedRequest } from '@/shared/api/client';
import { JourneyAction, JourneyState } from '@/shared/journey/domain';
import {
  AnalyticsData,
  cravingSummary,
  DailyPoint,
  displayDay,
  hourLabel,
  periodSummary,
  rupiah,
} from '@/features/charts/data';
import { HourBars, TrendArea, TriggerBars } from '@/features/charts/lazy';
import { Ring } from '@/features/charts/ring';
import { ChartSkeleton } from '@/features/charts/chart-skeleton';

function recordSavings(point: DailyPoint) {
  return point.cigarettes !== null &&
    point.baseline_cigs_per_day !== null &&
    point.price_per_cigarette !== null
    ? Math.max(0, point.baseline_cigs_per_day - point.cigarettes) * point.price_per_cigarette
    : null;
}

function DailyRecords({ data }: { data: DailyPoint[] }) {
  const [page, setPage] = useState(0),
    pages = Math.ceil(data.length / 7);
  useEffect(() => {
    setPage(0);
  }, [data.length]);
  const visible = [...data].reverse().slice(page * 7, page * 7 + 7);
  return (
    <Panel title="Rincian catatan" eyebrow="Satu hari, satu catatan">
      <p className="nivo-caption">
        Ubah catatan dari Beranda. Jumlah baru menggantikan jumlah pada tanggal tersebut.
      </p>
      <div className="mt-4 hidden lg:block">
        <table className="nivo-table w-full">
          <caption className="sr-only">
            Catatan harian dan estimasi hemat, halaman {page + 1} dari {pages}
          </caption>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Batang</th>
              <th>Status</th>
              <th>Estimasi hemat</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((point) => {
              const saved = recordSavings(point);
              return (
                <tr key={point.day}>
                  <td>
                    <time dateTime={point.day}>{displayDay(point.day)}</time>
                  </td>
                  <td>{point.cigarettes === null ? '—' : point.cigarettes}</td>
                  <td>
                    {point.cigarettes === null
                      ? 'Belum tercatat'
                      : point.cigarettes === 0
                        ? 'Tercatat tanpa rokok'
                        : 'Tercatat'}
                  </td>
                  <td>{saved === null ? 'Belum tersedia' : rupiah(saved)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 grid gap-3 lg:hidden" aria-label="Rincian catatan harian">
        {visible.map((point) => {
          const saved = recordSavings(point);
          return (
            <li key={point.day} className="rounded-xl border border-primary/10 bg-white/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <time dateTime={point.day} className="text-sm font-medium">
                  {displayDay(point.day)}
                </time>
                <span
                  className={
                    point.cigarettes === null ? 'text-sm text-muted-foreground' : 'nivo-badge'
                  }
                >
                  {point.cigarettes === null ? 'Belum tercatat' : `${point.cigarettes} batang`}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Estimasi hemat: {saved === null ? 'belum tersedia' : rupiah(saved)}
              </p>
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <nav
          className="mt-4 flex flex-wrap items-center justify-between gap-2"
          aria-label="Halaman catatan harian"
        >
          <button
            type="button"
            className="nivo-action nivo-action-secondary"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Sebelumnya
          </button>
          <span className="text-sm text-muted-foreground" role="status">
            {page + 1} / {pages}
          </span>
          <button
            type="button"
            className="nivo-action nivo-action-secondary"
            disabled={page >= pages - 1}
            onClick={() => setPage((current) => Math.min(pages - 1, current + 1))}
          >
            Berikutnya
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}
      <Link href="/home" className="nivo-text-link mt-4 inline-flex">
        Catat atau perbarui dari Beranda
      </Link>
      <details className="nivo-disclosure">
        <summary>Cara menghitung estimasi</summary>
        <p>
          Estimasi hemat = selisih positif konsumsi awal dan jumlah batang × harga per batang.
          Asumsi memakai versi yang melekat pada catatan ini. Hari tanpa catatan dan catatan tanpa
          data awal tidak dimasukkan ke estimasi.
        </p>
      </details>
    </Panel>
  );
}

export default function TrackerInsights({
  state,
  revision,
  today,
  busy = false,
  onSave,
}: {
  state: JourneyState;
  revision: number;
  today: string;
  busy?: boolean;
  onSave: (action: JourneyAction) => void | Promise<void>;
}) {
  const [days, setDays] = useState(7),
    [data, setData] = useState<AnalyticsData | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    setData(null);
    authenticatedRequest(`/api/journey/analytics?days=${days}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Grafik belum dapat dimuat.');
      });
    return () => {
      active = false;
    };
  }, [days, revision, today, retry]);
  const period = data ? periodSummary(data.series) : null,
    cravings = data ? cravingSummary(data.hours) : null;
  const hidden = state.insightsHidden ?? false;
  const recommendedTime =
    cravings?.busiestHour === null || cravings?.busiestHour === undefined
      ? null
      : (() => {
          const minute = (cravings.busiestHour * 60 - 15 + 1440) % 1440;
          return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
        })();
  return (
    <div className="nivo-stack min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Rentang catatan menurut {state.timezone.replace(/_/g, ' ')}
        </p>
        <div
          role="group"
          aria-label="Rentang waktu catatan"
          className="flex rounded-xl border border-primary/10 bg-white/70 p-1"
        >
          {[7, 30, 90].map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={days === value}
              onClick={() => setDays(value)}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${days === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary/10'}`}
            >
              {value} hari
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <Panel title="Grafik belum tersedia">
          <StateNotice error>{error}</StateNotice>
          <button
            type="button"
            className="nivo-action mt-4"
            onClick={() => setRetry((value) => value + 1)}
          >
            Coba lagi
          </button>
        </Panel>
      ) : !data ? (
        <Panel title="Memuat catatan">
          <ChartSkeleton />
        </Panel>
      ) : (
        <>
          <div className="nivo-dashboard-grid">
            <Panel title={`Catatan ${days} hari terakhir`} eyebrow="Dari catatanmu">
              <TrendArea data={data.series} />
            </Panel>
            <Panel title="Ringkasan periode" tone="soft">
              <Ring
                value={(period!.logged / days) * 100}
                label="Hari tercatat"
                hint={`${period!.logged} dari ${days} hari`}
              />
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Rata-rata per hari tercatat</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {period!.average === null
                      ? 'Belum tersedia'
                      : `${period!.average.toLocaleString('id-ID', { maximumFractionDigits: 1 })} batang`}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Estimasi hemat</dt>
                  <dd className="mt-1 break-words text-lg font-semibold">
                    {period!.saved === null ? 'Belum tersedia' : rupiah(period!.saved)}
                  </dd>
                </div>
              </dl>
              <p className="nivo-caption mt-3">
                Estimasi tersedia untuk {period!.estimateDays} dari {period!.logged} hari tercatat.
                Hari kosong tidak dihitung sebagai nol.
              </p>
            </Panel>
          </div>
          <Panel title="Pemicu dan jam catatan" eyebrow="Pahami, tanpa menghakimi">
            <button
              type="button"
              className="nivo-action nivo-action-secondary"
              disabled={busy}
              onClick={() => onSave({ type: 'insights', hidden: !hidden })}
            >
              {hidden ? (
                <Eye size={17} aria-hidden="true" />
              ) : (
                <EyeOff size={17} aria-hidden="true" />
              )}
              {hidden ? 'Tampilkan insight' : 'Sembunyikan insight'}
            </button>
            {hidden ? (
              <p className="nivo-caption mt-4">
                Insight disembunyikan sesuai pilihanmu. Catatanmu tetap tersimpan.
              </p>
            ) : cravings!.total === 0 ? (
              <p className="nivo-caption mt-4">
                Belum ada kejadian craving pada periode ini. Gunakan Craving SOS ketika kamu ingin
                mencatatnya.
              </p>
            ) : (
              <>
                <p className="nivo-caption mt-4">
                  {cravings!.total < 5
                    ? `Ada ${cravings!.total} kejadian. Ringkasan jam terbanyak muncul setelah minimal 5 kejadian.`
                    : `Catatan terbanyak sekitar pukul ${hourLabel(cravings!.busiestHour!)}–${hourLabel((cravings!.busiestHour! + 1) % 24)}. Ini ringkasan catatan, bukan prediksi.`}
                </p>
                <div className="mt-4 grid min-w-0 gap-6 lg:grid-cols-2">
                  <figure className="min-w-0">
                    <h3 className="text-sm font-semibold">Kejadian menurut jam</h3>
                    <HourBars data={data.hours} />
                    <figcaption className="nivo-caption">
                      Jam mengikuti {data.timezone}. Tidak ada batang pada jam tanpa kejadian.
                    </figcaption>
                  </figure>
                  <figure className="min-w-0">
                    <h3 className="text-sm font-semibold">Pemicu yang tercatat</h3>
                    <TriggerBars data={data.triggers} />
                    <figcaption className="nivo-caption">
                      Maksimal 8 pemicu dengan catatan terbanyak.
                    </figcaption>
                  </figure>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[140px_1fr]">
                  <Ring value={cravings!.passedPercentage} label="Craving mereda" />
                  <div className="self-center">
                    <p className="nivo-caption">
                      {cravings!.passed} dari {cravings!.completed} kejadian dengan hasil selesai
                      tercatat mereda. Hasil “masih kuat” dan check-in lama tanpa hasil tidak
                      dimasukkan ke persentase.
                    </p>
                    {recommendedTime && (
                      <>
                        <button
                          type="button"
                          className="nivo-action nivo-action-secondary mt-3"
                          disabled={busy}
                          onClick={() =>
                            onSave({
                              type: 'preferences',
                              ...state.preferences,
                              time: recommendedTime,
                            })
                          }
                        >
                          Gunakan pukul {recommendedTime} untuk pengingat
                        </button>
                        <p className="nivo-caption mt-2">
                          Jam diubah atas pilihanmu. Pengingat tetap mengikuti persetujuan dan
                          status aktif pada pengaturan perjalanan. Manfaat pengingat dari pola ini
                          belum dapat dipastikan.
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <details className="nivo-disclosure">
                  <summary>Lihat angka jam dan pemicu</summary>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <dl className="grid gap-2 text-sm">
                      {data.hours.map((point) => (
                        <div key={point.hour} className="flex items-start justify-between gap-2">
                          <dt>Pukul {hourLabel(point.hour)}</dt>
                          <dd>{point.total} kejadian</dd>
                        </div>
                      ))}
                    </dl>
                    <dl className="grid gap-2 text-sm">
                      {data.triggers.map((point) => (
                        <div key={point.trigger} className="flex items-start justify-between gap-2">
                          <dt className="min-w-0 break-words [overflow-wrap:anywhere]">
                            {point.trigger}
                          </dt>
                          <dd className="shrink-0">{point.total} kejadian</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </details>
              </>
            )}
          </Panel>
          <DailyRecords data={data.series} />
        </>
      )}
    </div>
  );
}
