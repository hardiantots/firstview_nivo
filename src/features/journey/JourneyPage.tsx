'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Heart } from 'lucide-react';
import { PageTitle, Panel, StateNotice, ActionLink } from '@/components/ui/nivo';
import { ResponsiveSections, SectionPage } from '@/components/ui/responsive-sections';
import { useCompactLayout } from '@/shared/hooks/use-compact-layout';
import { useJourneyState } from '@/shared/journey/client';
import { dueReminders, localDate } from '@/shared/journey/domain';
import { JourneyStatus, SupportLinks, SupportStrip, WeekOverview } from './JourneyVisuals';
import QuickLog from '@/features/log/QuickLog';
import { JourneySyncStatus } from './JourneySyncStatus';
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
  const compact = useCompactLayout();
  const [clock, setClock] = useState(new Date()),
    [journeyTab, setJourneyTab] = useState('plan'),
    [cravingTab, setCravingTab] = useState('sos');
  const [linkedSlip, setLinkedSlip] = useState(false),
    [reflection, setReflection] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
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
      <JourneySyncStatus journey={j} />
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
            <ResponsiveSections label="Beranda">
              <SectionPage name="ringkasan" label="Ringkasan">
                <HomeOverview state={state} today={today} />
                <SupportStrip />
                <ActionLink href="/home?section=catat#catat" secondary>
                  Catat hari ini
                </ActionLink>
              </SectionPage>
              <SectionPage name="catat" label="Catat hari ini">
                <div className="nivo-dashboard-grid">
                  <QuickLog key={today} state={state} today={today} busy={busy} onSave={j.save} />
                  <div className="nivo-wide-only">
                    <WeekOverview state={state} today={today} />
                  </div>
                </div>
              </SectionPage>
              <SectionPage name="grafik" label="Grafik">
                <HomeCharts state={state} today={today} />
              </SectionPage>
              <SectionPage name="perjalanan" label="Perjalanan">
                <div className="nivo-dashboard-grid">
                  <JourneyProgress state={state} today={today} />
                  <JourneyStatus state={state} today={today} />
                </div>
              </SectionPage>
              <SectionPage name="latihan" label="Latihan dan dukungan">
                <div className="nivo-dashboard-grid">
                  <DailyPractice
                    key={today}
                    state={state}
                    today={today}
                    busy={busy}
                    onSave={j.save}
                  />
                  <Panel title="Dukungan, saat kamu perlu">
                    <SupportLinks />
                  </Panel>
                </div>
              </SectionPage>
            </ResponsiveSections>
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
            </>
          )}
          {view === 'journey' && (
            <>
              <ResponsiveSections
                label="Pengaturan perjalanan"
                value={activeJourney}
                onChange={setJourneyTab}
                queryKey="tab"
                desktop="tabs"
              >
                <SectionPage name="plan" label="Rencana">
                  <ResponsiveSections label="Rencana" queryKey="planSection">
                    <SectionPage name="susun" label="Susun rencana">
                      <JourneyWizard state={state} today={today} busy={busy} onSave={j.save} />
                    </SectionPage>
                    {flags.coping && (
                      <SectionPage name="pemicu" label="Langkah saat pemicu muncul">
                        <CopingPlans state={state} busy={busy} onSave={j.save} />
                      </SectionPage>
                    )}
                    <SectionPage name="kemajuan" label="Kemajuan">
                      <JourneyProgress state={state} today={today} />
                    </SectionPage>
                    <SectionPage name="edukasi" label="Informasi kesehatan">
                      <HealthEducation />
                    </SectionPage>
                  </ResponsiveSections>
                </SectionPage>
                {flags.followups && (
                  <SectionPage name="reminders" label="Pengingat">
                    <PushPreferences state={state} busy={busy} onSave={j.save} />
                  </SectionPage>
                )}
                <SectionPage name="buddy" label="Pendamping">
                  <BuddySettings />
                </SectionPage>
                <SectionPage name="data" label="Data saya">
                  <JourneyData snapshot={j.snapshot} busy={busy} refresh={j.refresh} />
                </SectionPage>
              </ResponsiveSections>
            </>
          )}
          {view === 'craving' && (
            <>
              <div className="nivo-calm-intro">
                <Heart size={22} aria-hidden="true" />
                <p>Kamu boleh berhenti sejenak. Pilih yang paling kamu butuhkan sekarang.</p>
              </div>
              <ResponsiveSections
                label="Bantuan mandiri"
                value={activeCraving}
                onChange={(value) => {
                  setCravingTab(value);
                  setLinkedSlip(false);
                }}
                queryKey="mode"
                desktop="tabs"
              >
                {flags.triggers && (
                  <SectionPage name="sos" label="Sedang ingin merokok">
                    <CravingFlow
                      state={state}
                      busy={busy}
                      onSave={j.save}
                      onSmoked={() => {
                        setLinkedSlip(true);
                        setCravingTab('slip');
                      }}
                    />
                  </SectionPage>
                )}
                {flags.slips && (
                  <SectionPage name="slip" label="Saya merokok lagi">
                    <SlipForm
                      key={linkedSlip ? state.cravingEvents?.at(-1)?.id || 'linked' : 'standalone'}
                      state={state}
                      busy={busy}
                      onSave={j.save}
                      cravingEventId={linkedSlip ? state.cravingEvents?.at(-1)?.id : undefined}
                    />
                  </SectionPage>
                )}
                <SectionPage name="talk" label="Mau curhat">
                  <div className="nivo-stack">
                    <Panel title="Ada ruang untuk bercerita">
                      <p>
                        Kamu bisa langsung memilih layanan konseling di bawah. Jika ingin, tulis
                        satu kalimat untuk dirimu; tulisan ini tidak disimpan atau dikirim.
                      </p>
                      <details className="nivo-disclosure">
                        <summary>Tulis perasaanmu (opsional)</summary>
                        <label className="nivo-field">
                          Yang sedang kamu rasakan (opsional)
                          <textarea
                            value={reflection}
                            maxLength={500}
                            onChange={(event) => setReflection(event.target.value)}
                          />
                        </label>
                      </details>
                      <CrisisSupport text={reflection} />
                      <ActionLink href="/contact-professional" secondary>
                        Lihat konsultasi NIVO
                      </ActionLink>
                    </Panel>
                    <NationalSupport />
                  </div>
                </SectionPage>
              </ResponsiveSections>
            </>
          )}
          {compact && flags.followups && dueReminders(state, clock).length > 0 && (
            <StateNotice>
              Ada {dueReminders(state, clock).length} pengingat pilihanmu.{' '}
              <ActionLink href="/notifications" secondary>
                Tinjau pengingat
              </ActionLink>
            </StateNotice>
          )}
          {!compact &&
            flags.followups &&
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
