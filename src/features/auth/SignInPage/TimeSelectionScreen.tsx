'use client';
import SetupFrame from '@/features/onboarding/SetupFrame';
import JourneyPage from '@/features/journey/JourneyPage';
import { ActionLink } from '@/components/ui/nivo';
export default function Page() { return <SetupFrame title="Atur perjalananmu" description="Pilih target atau tanggal mulai berhenti pada rencana perjalanan."><JourneyPage /><ActionLink href="/motivation">Lanjutkan ke motivasi</ActionLink></SetupFrame>; }
