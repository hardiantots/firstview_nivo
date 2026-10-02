'use client';
import { useEffect, useId, useState } from 'react';
import { ArrowUpRight, Check, Download, Heart, Settings2, Sprout, Timer } from 'lucide-react';
import { PageTitle, Panel, StateNotice, ActionLink } from '@/components/ui/nivo';
import { useJourneyState, authenticatedRequest } from '@/shared/journey/client';
import { dueReminders, localDate, triggerPatterns } from '@/shared/journey/domain';
import { JourneyStatus, PendingSummary, SupportLinks, SupportStrip, TabPanel, Tabs, WeekOverview } from './JourneyVisuals';
import LegacyRecords from './LegacyRecords';

function Field({ label, name, type = 'text', value, required = false, min, max, hint, accessibleLabel }: {
  label: string; name: string; type?: string; value?: string | number; required?: boolean; min?: number | string; max?: number | string; hint?: string; accessibleLabel?: string;
}) {
  const id = useId();
  return <div className="nivo-field"><label htmlFor={id}>{label}</label><input id={id} name={name} type={type} defaultValue={value} required={required} min={min} max={max} maxLength={200} aria-label={accessibleLabel} aria-describedby={hint ? `${id}-hint` : undefined} />{hint && <p id={`${id}-hint`} className="nivo-caption">{hint}</p>}</div>;
}

export default function JourneyPage({ view = 'journey' }: { view?: 'journey' | 'home' | 'tracker' | 'craving' }) {
  const j = useJourneyState();
  const [clock, setClock] = useState(new Date()), [step, setStep] = useState(0), [planId, setPlanId] = useState(''), [seconds, setSeconds] = useState(0);
  const [confirmation, setConfirmation] = useState(''), [dataError, setDataError] = useState(''), [deleting, setDeleting] = useState(false);
  const [journeyTab, setJourneyTab] = useState('plan'), [cravingTab, setCravingTab] = useState('checkin');
  useEffect(() => { const id = setInterval(() => setClock(new Date()), 30000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!seconds) return; const id = setTimeout(() => setSeconds(seconds - 1), 1000); return () => clearTimeout(id); }, [seconds]);
  const state = j.snapshot?.state, today = state ? localDate(clock, state.timezone) : '', flags = j.snapshot?.flags || {};
  const form = (fn: (f: FormData) => void) => (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setDataError('');
    try { fn(new FormData(event.currentTarget)); } catch { setDataError('Periksa kembali tanggal dan isianmu.'); }
  };
  const str = (f: FormData, key: string) => String(f.get(key) || '');
  const button = (label: string) => <button className="nivo-action" disabled={j.busy || !!j.pending} type="submit">{j.busy ? 'Menyimpan…' : label}<ArrowUpRight size={17} aria-hidden="true" /></button>;
  const titles = { home: ['Ruang untuk langkah kecil', 'Langkahmu hari ini'], tracker: ['Dari hari ke hari', 'Catatan harian'], craving: ['Ambil waktumu', 'Satu langkah saat ini'], journey: ['Kamu yang menentukan', 'Perjalanan pilihanmu'] };
  const descriptions = { home: 'Apa pun yang terjadi hari ini, kamu bisa mulai dari sini.', tracker: 'Kenali pola dari catatanmu, satu hari pada satu waktu.', craving: 'Kenali pemicunya, lalu pilih langkah yang nyaman untukmu.', journey: 'Atur rencana dan pengingat sesuai ritmemu sendiri.' };
  const cravingItems = [{ value: 'checkin', label: 'Check-in', enabled: flags.triggers }, { value: 'coping', label: 'Langkah saya', enabled: flags.coping }, { value: 'slip', label: 'Saya merokok lagi', enabled: flags.slips }].filter(item => item.enabled);
  const activeCraving = cravingItems.some(item => item.value === cravingTab) ? cravingTab : cravingItems[0]?.value;
  const journeyItems = [{ value: 'plan', label: 'Rencana' }, ...(flags.followups ? [{ value: 'reminders', label: 'Pengingat' }] : []), { value: 'data', label: 'Data saya' }];
  const activeJourney = journeyItems.some(item => item.value === journeyTab) ? journeyTab : 'plan';
  const selectedPlan = state?.coping.find(plan => plan.id === planId);

  return <div className="nivo-page nivo-journey-page">
    <PageTitle eyebrow={titles[view][0]} title={titles[view][1]}>{descriptions[view]}</PageTitle>
    {j.error && <StateNotice error>{j.error}</StateNotice>}
    {j.notice && <StateNotice>{j.notice}</StateNotice>}
    {dataError && <StateNotice error>{dataError}</StateNotice>}
    {j.pending && <Panel title="Ada isian yang belum tersinkron" tone="soft">
      <p>Tinjau isian dan versi server sebelum menerapkan perubahan dari perangkat ini.</p><PendingSummary action={j.pending.action} />
      <div className="nivo-button-row"><button className="nivo-action" disabled={j.busy} onClick={() => j.retry()}>Kirim ulang</button><button className="nivo-action nivo-action-secondary" onClick={j.refresh}>Muat versi server</button></div>
      <details className="nivo-disclosure"><summary>Pilihan jika ada perubahan dari perangkat lain</summary><div className="nivo-stack"><p>Setelah meninjau versi terbaru, kamu dapat menerapkan isian di atas atau membatalkannya.</p><button className="nivo-action nivo-action-secondary" disabled={j.busy} onClick={() => j.retry(true)}>Terapkan isian ini pada versi terbaru</button><button className="nivo-text-link" disabled={j.busy} onClick={j.discard}>Batalkan isian tertunda</button></div></details>
    </Panel>}

    {!state ? <Panel title={j.error ? 'Perjalanan belum dapat dimuat' : 'Menyiapkan ruangmu'}>
      {j.error ? <><p>Coba muat kembali untuk melihat catatanmu.</p><button className="nivo-action" onClick={j.refresh}>Coba muat lagi</button></> : <div className="nivo-skeleton" role="status" aria-label="Memuat perjalanan"><span /><span /><span /></div>}
    </Panel> : <>
      {view === 'home' && <SupportStrip />}
      {(view === 'home' || view === 'tracker') && <>
        <div className="nivo-dashboard-grid">
          <Panel title="Catat atau perbarui konsumsi" eyebrow="Check-in harian" className="nivo-today-card">
            <p className="nivo-caption">Tanggal mengikuti zona waktu {state.timezone}. Setiap catatan membantu melihat perjalananmu dengan jujur.</p>
            <form className="nivo-stack" onSubmit={form(f => j.save({ type: 'daily', date: str(f, 'date'), count: str(f, 'count') === '' ? null : Number(f.get('count')) }))}>
              <div className="nivo-form-grid"><Field label="Tanggal catatan" name="date" type="date" value={today} min="1970-01-01" max={today} required /><Field label="Jumlah batang" accessibleLabel="Jumlah batang (0 berarti tidak merokok; kosong berarti belum tercatat)" hint="0 = tidak merokok. Kosong = belum tercatat." name="count" type="number" min={0} max={200} /></div>
              {button('Simpan catatan')}
            </form>
            <details className="nivo-disclosure"><summary>Bagaimana jika saya mencatat slip?</summary><p>Masukkan jumlah total harian di sini. Kejadian slip dicatat terpisah dan tidak otomatis ditambahkan ke total ini.</p></details>
          </Panel>
          <WeekOverview state={state} today={today} table={view === 'tracker'} />
        </div>
        {view === 'home' && <div className="nivo-dashboard-grid"><JourneyStatus state={state} today={today} /><Panel title="Dukungan, saat kamu perlu" tone="plain"><p className="nivo-caption">Pilih langkah berikutnya sesuai kebutuhanmu.</p><SupportLinks /></Panel></div>}
      </>}

      {view === 'journey' && <>
        <Tabs label="Pengaturan perjalanan" value={activeJourney} onChange={setJourneyTab} items={journeyItems} />
        <TabPanel name="plan" selected={activeJourney}><div className="nivo-dashboard-grid">
          <Panel title="Tanggal dan zona waktu" eyebrow="Arah perjalanan"><form key={'plan-' + j.snapshot.revision} className="nivo-stack" onSubmit={form(f => j.save({ type: 'plan', timezone: str(f, 'timezone'), targetQuitDate: str(f, 'target') || null, actualQuitDate: str(f, 'actual') || null }))}>
            <Field label="Zona waktu IANA" name="timezone" value={state.timezone} required hint="Contoh: Asia/Makassar, Asia/Jakarta, atau Asia/Jayapura." />
            <Field label="Target berhenti (opsional)" name="target" type="date" value={state.targetQuitDate || ''} min="1970-01-01" />
            <Field label="Tanggal benar-benar mulai berhenti (opsional)" name="actual" type="date" value={state.actualQuitDate || ''} min="1970-01-01" max={today} />
            <p className="nivo-caption">Tanggal ini menentukan fase. Kosongkan untuk membatalkan pilihan sebelumnya. Slip tidak mengubah tanggal ini.</p>{button('Simpan rencana')}
          </form></Panel>
          <div className="nivo-stack"><Panel title="Asumsi estimasi biaya"><form className="nivo-stack" onSubmit={form(f => j.save({ type: 'baseline', cigarettesPerDay: Number(f.get('baseline')), pricePerCigarette: Number(f.get('price')) }))}>
            <Field label="Konsumsi awal batang per hari" name="baseline" type="number" min={0} max={200} required /><Field label="Harga per batang (rupiah)" name="price" type="number" min={0} max={1000000} required />{button('Simpan baseline baru')}
          </form><p className="nivo-caption">{state.baselines.length} versi asumsi tersimpan. Riwayat lama tidak dihitung ulang.</p></Panel>
          <Panel title="Langkah pilihanmu" tone="soft"><Sprout size={26} aria-hidden="true" /><p>Simpan 2–3 langkah yang ingin kamu lakukan saat pemicu muncul.</p><ActionLink href="/craving-support" secondary>Buka bantuan mandiri</ActionLink></Panel></div>
        </div></TabPanel>
        {flags.followups && <TabPanel name="reminders" selected={activeJourney}><Panel title="Pengingat dan tindak lanjut pilihanmu" eyebrow="Ruang untuk refleksi">
          <p>Pesan otomatis hanya tampil saat NIVO terbuka. Kamu bebas mengatur jeda atau menghentikannya.</p>
          <form key={'preferences-' + j.snapshot.revision} className="nivo-stack" onSubmit={form(f => j.save({ type: 'preferences', enabled: f.has('enabled'), consent: f.has('consent'), time: str(f, 'time'), maxPerDay: Number(f.get('max')), pausedUntil: str(f, 'pause') || null, followupDays: str(f, 'days').split(',').filter(x => x.trim()).map(Number) }))}>
            <div className="nivo-choice-surface"><label className="nivo-checkbox"><input type="checkbox" name="enabled" defaultChecked={state.preferences.enabled} /><span>Aktifkan pengingat</span></label><label className="nivo-checkbox"><input type="checkbox" name="consent" defaultChecked={state.preferences.consent} /><span>Saya setuju menerima pengingat dalam aplikasi</span></label></div>
            <div className="nivo-form-grid"><Field label="Mulai pukul (zona waktu perjalanan)" name="time" type="time" value={state.preferences.time} required /><Field label="Maksimum per hari (1–3)" name="max" type="number" value={state.preferences.maxPerDay} min={1} max={3} required /></div>
            <Field label="Jeda sampai tanggal (opsional)" name="pause" type="date" value={state.preferences.pausedUntil || ''} />
            <Field label="Tindak lanjut hari ke- setelah mulai berhenti, pisahkan dengan koma (contoh 1,7,30)" name="days" value={state.preferences.followupDays.join(',')} />
            {button('Simpan pilihan pengingat')}
          </form><p className="nivo-caption">Pengingat ini bukan kontak dari konsultan. Tidak ada pengiriman saat aplikasi ditutup.</p>
        </Panel></TabPanel>}
        <TabPanel name="data" selected={activeJourney}><Panel title="Data perjalanan versi baru" eyebrow="Dalam kendalimu">
          <p>Ekspor mencakup catatan, asumsi biaya, rencana, pemicu, slip, preferensi, dan riwayat perubahan versi baru. Data lama, profil akun, dan konsultasi tidak termasuk.</p>
          <button className="nivo-action nivo-action-secondary" onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(j.snapshot, null, 2)], { type: 'application/json' }));
            const a = document.createElement('a'); a.href = url; a.download = 'nivo-perjalanan.json'; a.click(); URL.revokeObjectURL(url);
          }}><Download size={18} aria-hidden="true" />Ekspor JSON</button>
          <details className="nivo-disclosure nivo-danger-zone"><summary>Hapus data perjalanan versi baru</summary><div className="nivo-stack">
            <p>Catatan versi baru akan dihapus. Ekspor terlebih dahulu jika ingin menyimpan salinannya.</p>
            <label className="nivo-field">Ketik HAPUS PERJALANAN untuk menghapus data versi baru<input value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
            <button className="nivo-action nivo-action-danger" disabled={confirmation !== 'HAPUS PERJALANAN' || j.busy || !!j.pending || deleting} onClick={async () => {
              setDeleting(true); setDataError('');
              try { await authenticatedRequest('/api/journey', { method: 'DELETE', body: JSON.stringify({ expectedRevision: j.snapshot.revision, confirm: confirmation }) }); setConfirmation(''); await j.refresh(); }
              catch (e) { setDataError(e.message); } finally { setDeleting(false); }
            }}>{deleting ? 'Menghapus…' : 'Hapus data perjalanan versi baru'}</button>
            <p className="nivo-caption">Nomor revisi tetap disimpan agar isian lama dari perangkat lain tidak mengembalikan data yang dihapus. Keluar akun menghapus isian tertunda pada perangkat ini.</p>
          </div></details>
        </Panel></TabPanel>
      </>}

      {view === 'craving' && <>
        <div className="nivo-calm-intro"><Heart size={22} aria-hidden="true" /><p>Kamu boleh berhenti sejenak. Pilih yang paling kamu butuhkan sekarang.</p></div>
        {cravingItems.length ? <Tabs label="Bantuan mandiri" value={activeCraving} onChange={setCravingTab} items={cravingItems} /> : <StateNotice>Bantuan mandiri sedang tidak tersedia. Catatan harian tetap dapat digunakan.</StateNotice>}
        {flags.triggers && <TabPanel name="checkin" selected={activeCraving}><div className="nivo-dashboard-grid">
          <Panel title="Check-in pemicu" eyebrow="Kenali momen ini"><form className="nivo-stack" onSubmit={form(f => j.save({ type: 'checkin', occurredAt: new Date().toISOString(), trigger: str(f, 'trigger'), intensity: Number(f.get('intensity')), context: str(f, 'context') }))}>
            <Field label="Apa pemicunya?" name="trigger" required /><Field label="Intensitas 1–5" name="intensity" type="number" min={1} max={5} value={3} required hint="1: ringan · 5: sangat kuat" /><Field label="Konteks (opsional)" name="context" />{button('Simpan check-in')}
          </form></Panel>
          <Panel title="Pola dari catatanmu" tone="soft"><Settings2 size={25} strokeWidth={1.5} aria-hidden="true" />{triggerPatterns(state).length ? <ul className="nivo-pattern-list">{triggerPatterns(state).map(([trigger, count]) => <li key={trigger}><span>{trigger}</span><span className="nivo-badge">{count} catatan</span></li>)}</ul> : <><p>Setiap catatan memberi sedikit gambaran.</p><p className="nivo-caption">Pola muncul setelah minimal 3 check-in pada 2 hari berbeda. Ini ringkasan catatan, bukan prediksi.</p></>}</Panel>
        </div></TabPanel>}
        {flags.coping && <TabPanel name="coping" selected={activeCraving}><div className="nivo-dashboard-grid">
          <Panel title="Rencana coping pribadi" eyebrow="Langkah yang kamu pilih">
            {state.coping.length > 0 && <label className="nivo-field">Gunakan rencana<select value={planId} onChange={e => { setPlanId(e.target.value); setStep(0); setSeconds(0); }}><option value="">Pilih rencana</option>{state.coping.map(plan => <option key={plan.id} value={plan.id}>{plan.trigger}</option>)}</select></label>}
            {selectedPlan ? <div className="nivo-stack"><div className="nivo-coping-step"><span className="nivo-badge">{step + 1} dari {selectedPlan.steps.length}</span><p aria-live="polite">Langkah {step + 1}: {selectedPlan.steps[step]}</p></div><button className="nivo-action" onClick={() => setStep((step + 1) % selectedPlan.steps.length)}>Langkah berikutnya <ArrowUpRight size={17} aria-hidden="true" /></button><button className="nivo-action nivo-action-secondary" onClick={() => setSeconds(seconds ? 0 : 60)}><Timer size={18} aria-hidden="true" />{seconds ? `Hentikan timer (${seconds} detik)` : 'Timer opsional 60 detik'}</button><p>Apakah langkahmu membantu?</p><div className="nivo-button-row">{(['yes', 'no', 'unsure'] as const).map((helped, i) => <button key={helped} disabled={j.busy || !!j.pending} className="nivo-action nivo-action-secondary" onClick={() => j.save({ type: 'coping_feedback', planId, helped })}>{['Ya', 'Belum', 'Belum yakin'][i]}</button>)}</div></div> : <div className="nivo-coping-step"><Sprout size={26} aria-hidden="true" /><p>{state.coping.length ? 'Pilih rencana untuk melihat satu langkah pada satu waktu.' : 'Mulai dengan 2–3 langkah sederhana yang kamu pilih sendiri.'}</p></div>}
          </Panel>
          <Panel title="Buat langkah pilihanmu" tone="soft"><form className="nivo-stack" onSubmit={form(f => j.save({ type: 'coping', trigger: str(f, 'trigger'), steps: [str(f, 'one'), str(f, 'two'), str(f, 'three')].filter(Boolean) }))}>
            <Field label="Jika pemicu ini muncul" name="trigger" required /><Field label="Langkah pilihan pertama" name="one" required /><Field label="Langkah kedua" name="two" required /><Field label="Langkah ketiga (opsional)" name="three" />{button('Simpan langkah saya')}
          </form></Panel>
        </div></TabPanel>}
        {flags.slips && <TabPanel name="slip" selected={activeCraving}><div className="nivo-dashboard-grid">
          <Panel title="Saya merokok lagi" eyebrow="Tetap ada langkah berikutnya"><p className="nivo-caption">Satu kejadian tidak menghapus usaha sebelumnya. Catat apa yang terjadi, lalu pilih langkah berikutnya.</p><form className="nivo-stack" onSubmit={form(f => j.save({ type: 'slip', occurredAt: new Date(str(f, 'when')).toISOString(), count: Number(f.get('count')), trigger: str(f, 'trigger'), nextStep: str(f, 'next') }))}>
            <Field label="Waktu kejadian (waktu perangkat)" name="when" type="datetime-local" required /><Field label="Jumlah batang" name="count" type="number" min={1} max={200} value={1} required /><Field label="Pemicu (opsional)" name="trigger" /><Field label="Langkah yang saya pilih berikutnya" name="next" required />{button('Simpan kejadian')}
          </form></Panel>
          <div className="nivo-stack"><Panel title="Kamu masih punya pilihan" tone="soft"><p>Gunakan kembali langkah coping atau lihat pilihan dukungan manusia.</p><ActionLink href="/contact-professional" secondary>Konsultasi web</ActionLink></Panel><Panel title="Kejadian terakhir">{state.slips.length ? <ol className="nivo-timeline">{state.slips.slice(-5).reverse().map(item => <li key={item.id}><time>{new Date(item.occurredAt).toLocaleString('id-ID', { timeZone: state.timezone })}</time><p>{item.count} batang</p><p className="nivo-caption">Berikutnya: {item.nextStep}</p></li>)}</ol> : <p className="nivo-caption">Belum ada kejadian yang dicatat.</p>}</Panel></div>
        </div></TabPanel>}
      </>}

      {flags.followups && dueReminders(state, clock).map(reminder => <Panel key={reminder.id} title={reminder.kind === 'followup' ? 'Tindak lanjut otomatis' : 'Check-in otomatis'} tone="soft"><p>Bagaimana keadaanmu sekarang?</p><div className="nivo-button-row">{(['okay', 'difficult', 'skip'] as const).map((answer, i) => <button className="nivo-action nivo-action-secondary" key={answer} disabled={j.busy || !!j.pending} onClick={() => j.save({ type: 'reminder_answer', reminderId: reminder.id, answer })}>{['Baik', 'Sedang sulit', 'Lewati'][i]}</button>)}</div></Panel>)}
      {state.answers.at(-1)?.answer === 'difficult' && <StateNotice>Kamu memilih sedang sulit. Kamu bisa membuka langkah coping sendiri atau memilih konsultasi web.</StateNotice>}
      <footer className="nivo-data-note"><Check size={15} aria-hidden="true" /><p>Catatan lama tetap disimpan, tetapi belum dipindahkan ke tampilan ini.</p></footer>
    </>}
    {view === 'tracker' && <LegacyRecords />}
  </div>;
}
