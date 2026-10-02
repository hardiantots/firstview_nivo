'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Heart } from 'lucide-react';
import { PageTitle, Panel, StateNotice, ActionLink } from '@/components/ui/nivo';
import { useJourneyState } from '@/shared/journey/client';
import { dueReminders, localDate } from '@/shared/journey/domain';
import {
  JourneyStatus,
  PendingSummary,
  SupportLinks,
  SupportStrip,
  TabPanel,
  Tabs,
  WeekOverview,
} from './JourneyVisuals';
import LegacyRecords from './LegacyRecords';
import QuickLog from '@/features/log/QuickLog';
import { JourneyProgress } from './JourneyProgress';
import HomeOverview from '@/features/home/HomeOverview';
import DailyPractice from './DailyPractice';
import NationalSupport, {
  CrisisSupport,
  HealthEducation,
} from '@/features/support/NationalSupport';

const loading = () => (
  <div className="nivo-skeleton" role="status" aria-label="Memuat pilihan">
    <span />
    <span />
    <span />
  </div>
);
const JourneyWizard = dynamic(() => import('./JourneyWizard'), { loading });
const CopingPlans = dynamic(() => import('./CopingPlans'), { loading });
const JourneyData = dynamic(() => import('./JourneyData'), { loading });
const TrackerInsights = dynamic(() => import('./TrackerInsights'), { loading });
const CravingFlow = dynamic(() => import('@/features/craving/CravingFlow'), { loading });
const SlipForm = dynamic(() => import('@/features/craving/SlipForm'), { loading });
const BuddySettings = dynamic(() => import('@/features/buddy/BuddySettings'), { loading });
const PushPreferences = dynamic(() => import('@/features/reminders/PushPreferences'), { loading });
const HomeCharts = dynamic(() => import('@/features/home/HomeCharts'), { loading });

export default function JourneyPage({
  view = 'journey',
}: {
  view?: 'journey' | 'home' | 'tracker' | 'craving';
}) {
  const j = useJourneyState();
  const [clock, setClock] = useState(new Date()),
    [journeyTab, setJourneyTab] = useState('plan'),
    [cravingTab, setCravingTab] = useState('sos');
  const [linkedSlip, setLinkedSlip] = useState(false),
    [reflection, setReflection] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (['plan', 'reminders', 'buddy', 'data'].includes(query.get('tab')))
      setJourneyTab(query.get('tab'));
    if (['sos', 'slip', 'talk'].includes(query.get('mode'))) setCravingTab(query.get('mode'));
  }, [view]);
  const state = j.snapshot?.state,
    today = state ? localDate(clock, state.timezone) : '',
    flags = j.snapshot?.flags || {};
  const busy = j.busy || !!j.pending;
  const titles = {
    home: 'Langkahmu hari ini',
    tracker: 'Catatan harian',
    craving: 'Satu langkah saat ini',
    journey: 'Perjalanan pilihanmu',
  };
  const descriptions = {
    home: 'Apa pun yang terjadi hari ini, kamu bisa mulai dari sini.',
    tracker: 'Kenali pola dari catatanmu, satu hari pada satu waktu.',
    craving: 'Pilih bantuan yang nyaman untukmu saat ini.',
    journey: 'Atur rencana dan pengingat sesuai ritmemu sendiri.',
  };
  const cravingItems = [
    { value: 'sos', label: 'Sedang ingin merokok', enabled: flags.triggers },
    { value: 'slip', label: 'Saya merokok lagi', enabled: flags.slips },
    { value: 'talk', label: 'Mau curhat', enabled: true },
  ].filter((item) => item.enabled);
  const activeCraving = cravingItems.some((item) => item.value === cravingTab)
    ? cravingTab
    : cravingItems[0]?.value;
  const journeyItems = [
    { value: 'plan', label: 'Rencana' },
    ...(flags.followups ? [{ value: 'reminders', label: 'Pengingat' }] : []),
    { value: 'buddy', label: 'Pendamping' },
    { value: 'data', label: 'Data saya' },
  ];
  const activeJourney = journeyItems.some((item) => item.value === journeyTab)
    ? journeyTab
    : 'plan';
  return (
    <div className="nivo-page nivo-journey-page">
      <PageTitle title={titles[view]}>{descriptions[view]}</PageTitle>
      {j.error && <StateNotice error>{j.error}</StateNotice>}
      {j.notice && <StateNotice>{j.notice}</StateNotice>}
      {j.pending && (
        <Panel title="Ada isian yang belum tersinkron" tone="soft">
          <p>Tinjau isian sebelum mengirim ulang.</p>
          <PendingSummary action={j.pending.action} />
          <div className="nivo-button-row">
            <button className="nivo-action" disabled={j.busy} onClick={() => j.retry()}>
              Kirim ulang
            </button>
            <button
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
                className="nivo-action nivo-action-secondary"
                disabled={j.busy}
                onClick={() => j.retry(true)}
              >
                Terapkan isian ini pada versi terbaru
              </button>
              <button className="nivo-text-link" disabled={j.busy} onClick={j.discard}>
                Batalkan isian tertunda
              </button>
            </div>
          </details>
        </Panel>
      )}
      {!state ? (
        <Panel title={j.error ? 'Perjalanan belum dapat dimuat' : 'Menyiapkan ruangmu'}>
          {j.error ? (
            <>
              <p>Coba muat kembali untuk melihat catatanmu.</p>
              <button className="nivo-action" onClick={j.refresh}>
                Coba muat lagi
              </button>
            </>
          ) : (
            <div className="nivo-skeleton" role="status" aria-label="Memuat perjalanan">
              <span />
              <span />
              <span />
            </div>
          )}
        </Panel>
      ) : (
        <>
          {view === 'home' && (
            <>
              <HomeOverview state={state} today={today} />
              <SupportStrip />
              <div className="nivo-dashboard-grid">
                <QuickLog key={today} state={state} today={today} busy={busy} onSave={j.save} />
                <WeekOverview state={state} today={today} />
              </div>
              <JourneyProgress state={state} today={today} />
              <HomeCharts state={state} today={today} />
              <div className="nivo-dashboard-grid">
                <JourneyStatus state={state} today={today} />
                <DailyPractice
                  key={today}
                  state={state}
                  today={today}
                  busy={busy}
                  onSave={j.save}
                />
              </div>
              <Panel title="Dukungan, saat kamu perlu">
                <SupportLinks />
              </Panel>
            </>
          )}
          {view === 'tracker' && (
            <>
              <TrackerInsights
                state={state}
                revision={j.snapshot.revision}
                today={today}
                busy={busy}
                onSave={async (action) => {
                  await j.save(action);
                }}
              />
              <JourneyProgress state={state} today={today} />
              <LegacyRecords />
            </>
          )}
          {view === 'journey' && (
            <>
              <Tabs
                label="Pengaturan perjalanan"
                value={activeJourney}
                onChange={setJourneyTab}
                items={journeyItems}
              />
              <TabPanel name="plan" selected={activeJourney}>
                <div className="nivo-stack">
                  <JourneyWizard state={state} today={today} busy={busy} onSave={j.save} />
                  {flags.coping && <CopingPlans state={state} busy={busy} onSave={j.save} />}
                  <JourneyProgress state={state} today={today} />
                  <HealthEducation />
                </div>
              </TabPanel>
              {flags.followups && (
                <TabPanel name="reminders" selected={activeJourney}>
                  <PushPreferences state={state} busy={busy} onSave={j.save} />
                </TabPanel>
              )}
              <TabPanel name="buddy" selected={activeJourney}>
                <BuddySettings />
              </TabPanel>
              <TabPanel name="data" selected={activeJourney}>
                <JourneyData snapshot={j.snapshot} busy={busy} refresh={j.refresh} />
              </TabPanel>
            </>
          )}
          {view === 'craving' && (
            <>
              <div className="nivo-calm-intro">
                <Heart size={22} aria-hidden="true" />
                <p>Kamu boleh berhenti sejenak. Pilih yang paling kamu butuhkan sekarang.</p>
              </div>
              <Tabs
                label="Bantuan mandiri"
                value={activeCraving}
                onChange={(value) => {
                  setCravingTab(value);
                  setLinkedSlip(false);
                }}
                items={cravingItems}
              />
              {flags.triggers && (
                <TabPanel name="sos" selected={activeCraving}>
                  <CravingFlow
                    state={state}
                    busy={busy}
                    onSave={j.save}
                    onSmoked={() => {
                      setLinkedSlip(true);
                      setCravingTab('slip');
                    }}
                  />
                </TabPanel>
              )}
              {flags.slips && (
                <TabPanel name="slip" selected={activeCraving}>
                  <SlipForm
                    key={linkedSlip ? state.cravingEvents?.at(-1)?.id || 'linked' : 'standalone'}
                    state={state}
                    busy={busy}
                    onSave={j.save}
                    cravingEventId={linkedSlip ? state.cravingEvents?.at(-1)?.id : undefined}
                  />
                </TabPanel>
              )}
              <TabPanel name="talk" selected={activeCraving}>
                <div className="nivo-stack">
                  <Panel title="Ada ruang untuk bercerita">
                    <p>
                      Kamu bisa langsung memilih layanan konseling di bawah. Jika ingin, tulis satu
                      kalimat untuk dirimu; tulisan ini tidak disimpan atau dikirim.
                    </p>
                    <label className="nivo-field">
                      Yang sedang kamu rasakan (opsional)
                      <textarea
                        value={reflection}
                        maxLength={500}
                        onChange={(event) => setReflection(event.target.value)}
                      />
                    </label>
                    <CrisisSupport text={reflection} />
                    <ActionLink href="/contact-professional" secondary>
                      Lihat konsultasi NIVO
                    </ActionLink>
                  </Panel>
                  <NationalSupport />
                </div>
              </TabPanel>
            </>
          )}
          {flags.followups &&
            dueReminders(state, clock).map((reminder) => (
              <Panel
                key={reminder.id}
                title={
                  reminder.kind === 'followup'
                    ? 'Saatnya refleksi perjalanan'
                    : 'Pengingat pilihanmu'
                }
                tone="soft"
              >
                <p>Bagaimana keadaanmu sekarang?</p>
                <div className="nivo-button-row">
                  {(['okay', 'difficult', 'skip'] as const).map((answer, index) => (
                    <button
                      className="nivo-action nivo-action-secondary"
                      key={answer}
                      disabled={busy}
                      onClick={() =>
                        j.save({ type: 'reminder_answer', reminderId: reminder.id, answer })
                      }
                    >
                      {['Baik', 'Sedang sulit', 'Lewati'][index]}
                    </button>
                  ))}
                </div>
              </Panel>
            ))}
          {state.answers.at(-1)?.answer === 'difficult' && (
            <StateNotice>
              Kamu bisa membuka bantuan saat ingin merokok atau memilih layanan konseling.
            </StateNotice>
          )}
        </>
      )}
    </div>
  );
}
