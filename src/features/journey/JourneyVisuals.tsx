'use client';
import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Heart, MessageCircle, Sprout } from 'lucide-react';
import { Panel } from '@/components/ui/nivo';
import { dateBefore, dayDifference, estimatedSavings, JourneyAction, JourneyState, phase } from '@/shared/journey/domain';

export function Tabs({ label, value, onChange, items }: { label: string; value: string; onChange: (value: string) => void; items: { value: string; label: string }[] }) {
  return <div className="nivo-tabs" role="tablist" aria-label={label} onKeyDown={event => {
    const index = items.findIndex(item => item.value === value);
    const next = event.key === 'ArrowRight' ? (index + 1) % items.length : event.key === 'ArrowLeft' ? (index - 1 + items.length) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); onChange(items[next].value);
    (event.currentTarget.querySelectorAll('[role="tab"]')[next] as HTMLButtonElement).focus();
  }}>{items.map(item => <button type="button" role="tab" key={item.value} id={`tab-${item.value}`} aria-controls={`panel-${item.value}`} aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1} onClick={() => onChange(item.value)}>{item.label}</button>)}</div>;
}

export function TabPanel({ name, selected, children }: { name: string; selected: string; children: ReactNode }) {
  return <div role="tabpanel" id={`panel-${name}`} aria-labelledby={`tab-${name}`} hidden={name !== selected} tabIndex={0}>{children}</div>;
}

export function JourneyStatus({ state, today }: { state: JourneyState; today: string }) {
  const currentPhase = phase(state);
  return <Panel title="Sesuai ritmemu" eyebrow="Perjalananmu" tone="soft">
    <div className="nivo-status-orb" aria-hidden="true"><Sprout size={28} strokeWidth={1.5} /></div>
    <p className="nivo-status-value">{currentPhase === 'POST_QUIT' ? `${Math.max(0, dayDifference(today, state.actualQuitDate))} hari` : currentPhase === 'PRE_QUIT' ? state.targetQuitDate : 'Mulai dari satu pilihan'}</p>
    <p className="nivo-caption">{currentPhase === 'POST_QUIT' ? `Sejak tanggal mulai berhenti ${state.actualQuitDate}. Ini durasi sejak tanggal pilihanmu, bukan streak tanpa rokok.` : currentPhase === 'PRE_QUIT' ? 'Tanggal berhenti yang kamu pilih. Kamu dapat menyesuaikan rencana kapan saja.' : 'Tentukan target atau catat tanggal kamu mulai berhenti.'}</p>
    <Link href="/pencapaian" className="nivo-text-link">Atur perjalanan <ArrowUpRight size={16} aria-hidden="true" /></Link>
  </Panel>;
}

export function SupportStrip() {
  return <aside className="nivo-support-strip"><span className="nivo-support-icon" aria-hidden="true"><Heart size={23} strokeWidth={1.6} /></span><div><h2>Sedang ingin merokok?</h2><p>Ambil satu langkah pilihanmu.</p></div><Link href="/craving-support" className="nivo-action">Butuh bantuan <ArrowUpRight size={17} aria-hidden="true" /></Link></aside>;
}

export function SupportLinks() {
  return <div className="nivo-link-grid">
    <Link href="/pencapaian" className="nivo-link-card"><CalendarDays aria-hidden="true" /><div><h2>Rencanakan langkahmu</h2><p>Atur tanggal dan pengingat pilihanmu.</p></div><ArrowUpRight size={18} aria-hidden="true" /></Link>
    <Link href="/contact-professional" className="nivo-link-card"><MessageCircle aria-hidden="true" /><div><h2>Ingin berbicara?</h2><p>Lihat ketersediaan konsultasi manusia.</p></div><ArrowUpRight size={18} aria-hidden="true" /></Link>
  </div>;
}

export function WeekOverview({ state, today, table = false }: { state: JourneyState; today: string; table?: boolean }) {
  const dates = Array.from({ length: 7 }, (_, i) => dateBefore(today, 6 - i));
  const records = dates.map(date => state.daily[date]);
  const reported = records.filter(record => record?.status === 'reported');
  const maximum = Math.max(1, ...reported.map(record => record.count || 0));
  return <Panel title="Tujuh hari terakhir" eyebrow="Dari catatanmu">
    <div className="nivo-metric-row"><p><strong>{reported.length}<span> / 7</span></strong><span>hari tercatat</span></p><span className="nivo-badge">{state.timezone.replace('Asia/', '')}</span></div>
    <figure className="nivo-week-chart" aria-label="Jumlah batang per hari selama tujuh hari terakhir">
      <div className="nivo-week-bars">{dates.map((date, i) => {
        const record = records[i], hasReport = record?.status === 'reported';
        const label = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
        return <div key={date} className="nivo-chart-day" aria-label={`${date}: ${hasReport ? `${record.count} batang` : 'belum tercatat'}`}>
          <div className="nivo-chart-track"><span className={hasReport ? record.count === 0 ? 'nivo-chart-zero' : 'nivo-chart-bar' : 'nivo-chart-missing'} style={hasReport && record.count > 0 ? { height: `${Math.max(8, record.count / maximum * 80)}%` } : undefined} />{hasReport && <small>{record.count}</small>}</div>
          <span aria-hidden="true">{label}</span>
        </div>;
      })}</div>
      <figcaption><span className="nivo-chart-key" /> Tercatat <span className="nivo-chart-key nivo-chart-key-missing" /> Belum tercatat</figcaption>
    </figure>
    <p className="nivo-caption">Hari tanpa catatan tidak dihitung sebagai nol. Grafik ini merangkum catatanmu, bukan prediksi.</p>
    {table ? <div className="nivo-table-scroll"><table className="nivo-table"><caption>Rincian catatan dan estimasi penghematan</caption><thead><tr><th>Tanggal</th><th>Batang</th><th>Estimasi hemat</th></tr></thead><tbody>{dates.map(date => {
      const record = state.daily[date], money = record && estimatedSavings(record);
      return <tr key={date}><td><time dateTime={date}>{date.slice(8)} {new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'))}</time></td><td>{record?.status === 'reported' ? record.count : 'Belum tercatat'}</td><td>{money == null ? '—' : `Rp${money.toLocaleString('id-ID')}`}</td></tr>;
    })}</tbody></table></div> : <Link href="/tracker" className="nivo-text-link">Lihat semua catatan <ArrowUpRight size={16} aria-hidden="true" /></Link>}
    {table && <details className="nivo-disclosure"><summary>Dasar estimasi biaya</summary><p>Estimasi = selisih positif dari baseline × harga per batang. Catatan menyimpan asumsi saat pertama dibuat; perubahan baseline berlaku ke depan. Estimasi tidak tersedia tanpa baseline.</p></details>}
  </Panel>;
}

export function PendingSummary({ action }: { action: JourneyAction }) {
  const titles: Record<JourneyAction['type'], string> = { daily: 'Catatan harian', plan: 'Rencana perjalanan', baseline: 'Asumsi biaya', checkin: 'Check-in pemicu', coping: 'Langkah coping', coping_feedback: 'Umpan balik coping', slip: 'Kejadian merokok', preferences: 'Pilihan pengingat', reminder_answer: 'Jawaban pengingat' };
  const labels: Record<string, string> = { date: 'Tanggal', count: 'Jumlah batang', timezone: 'Zona waktu', targetQuitDate: 'Target berhenti', actualQuitDate: 'Mulai berhenti', cigarettesPerDay: 'Konsumsi awal per hari', pricePerCigarette: 'Harga per batang', occurredAt: 'Waktu kejadian', trigger: 'Pemicu', intensity: 'Intensitas', context: 'Konteks', steps: 'Langkah pilihan', helped: 'Membantu', nextStep: 'Langkah berikutnya', enabled: 'Pengingat aktif', consent: 'Persetujuan', time: 'Pukul', maxPerDay: 'Batas per hari', pausedUntil: 'Jeda sampai', followupDays: 'Hari tindak lanjut', answer: 'Jawaban' };
  const values: Record<string, string> = { yes: 'Ya', no: 'Belum', unsure: 'Belum yakin', okay: 'Baik', difficult: 'Sedang sulit', skip: 'Lewati' };
  return <div><p className="font-medium">{titles[action.type]}</p><dl className="nivo-pending-details">{Object.entries(action).filter(([key]) => labels[key]).map(([key, value]) => <div key={key}><dt>{labels[key]}</dt><dd>{value === null || value === '' ? 'Belum diisi' : typeof value === 'boolean' ? value ? 'Ya' : 'Tidak' : Array.isArray(value) ? value.join(' · ') : values[String(value)] || String(value)}</dd></div>)}</dl></div>;
}
