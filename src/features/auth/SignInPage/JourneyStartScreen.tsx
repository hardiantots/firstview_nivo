import SetupFrame from '@/features/onboarding/SetupFrame';
import { Panel, ActionLink } from '@/components/ui/nivo';
export default function JourneyStartScreen() {
  return <SetupFrame title="Mulai dari keadaanmu sekarang" description="Pilih rencana yang sesuai denganmu. Pilihan ini tidak mengukur keberhasilan atau kesehatanmu."><Panel title="Apa yang ingin kamu catat?"><ActionLink href="/time-selection">Saya ingin menentukan tanggal berhenti</ActionLink><ActionLink href="/set-quit-date-past" secondary>Saya sudah berhenti merokok</ActionLink></Panel></SetupFrame>;
}

