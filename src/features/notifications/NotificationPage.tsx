'use client';
import MainLayout from '@/shared/layout/MainLayout';
import { PageTitle, Panel, StateNotice, ActionLink } from '@/components/ui/nivo';
import { useJourneyState } from '@/shared/journey/client';
import { ResponsiveSections, SectionPage } from '@/components/ui/responsive-sections';
import { dueReminders } from '@/shared/journey/domain';

export default function NotificationPage() {
  const j = useJourneyState(),
    state = j.snapshot?.state;
  const reminders = state ? dueReminders(state) : [];
  return (
    <MainLayout>
      <div className="nivo-page">
        <PageTitle title="Notifikasi" />
        {j.error && <StateNotice error>{j.error}</StateNotice>}
        {j.notice && <StateNotice>{j.notice}</StateNotice>}
        {!state ? (
          <Panel title="Memuat pengingat">
            <button className="nivo-action" onClick={j.refresh}>
              Muat ulang
            </button>
          </Panel>
        ) : (
          <>
            {reminders.length > 0 && (
              <ResponsiveSections label="Notifikasi" queryKey="reminder">
                {reminders.map((reminder, index) => (
                  <SectionPage
                    key={reminder.id}
                    name={reminder.id}
                    label={
                      reminder.kind === 'followup'
                        ? `Refleksi perjalanan ${index + 1}`
                        : 'Pengingat harian'
                    }
                  >
                    <Panel
                      key={reminder.id}
                      title={
                        reminder.kind === 'followup'
                          ? 'Saatnya refleksi perjalanan'
                          : 'Pengingat pilihanmu'
                      }
                    >
                      <p>Bagaimana keadaanmu sekarang?</p>
                      <div className="nivo-button-row">
                        {(['okay', 'difficult', 'skip'] as const).map((answer, index) => (
                          <button
                            key={answer}
                            disabled={j.busy || !!j.pending}
                            className="nivo-action nivo-action-secondary"
                            onClick={() =>
                              j.save({ type: 'reminder_answer', reminderId: reminder.id, answer })
                            }
                          >
                            {['Baik', 'Sedang sulit', 'Lewati'][index]}
                          </button>
                        ))}
                      </div>
                    </Panel>
                  </SectionPage>
                ))}
              </ResponsiveSections>
            )}
            {!reminders.length && (
              <Panel title="Belum ada pengingat untuk sekarang">
                <p>Pengingat muncul sesuai persetujuan, jadwal, dan jeda yang kamu pilih.</p>
                <ActionLink href="/pencapaian?tab=reminders">Atur pengingat</ActionLink>
              </Panel>
            )}
            {!!j.pending && (
              <Panel title="Jawaban belum tersinkron">
                <button className="nivo-action" disabled={j.busy} onClick={() => j.retry()}>
                  Kirim ulang
                </button>
                <ActionLink href="/home" secondary>
                  Tinjau isian tertunda
                </ActionLink>
              </Panel>
            )}
            <ActionLink href="/home" secondary>
              Kembali ke Beranda
            </ActionLink>
          </>
        )}
      </div>
    </MainLayout>
  );
}
