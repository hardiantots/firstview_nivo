import MainLayout from '@/shared/layout/MainLayout';
import { PageTitle, Panel, ActionLink } from '@/components/ui/nivo';
export default function CommunityPage() {
  return <MainLayout><div className="nivo-page"><PageTitle eyebrow="NIVO" title="Komunitas belum tersedia">Belum ada ruang komunitas untuk membaca atau mengirim cerita.</PageTitle><Panel title="Catatanmu tetap milikmu"><p>Kamu bisa mencatat pengalaman di fitur bantuan dan melihatnya kembali di Catatan.</p><ActionLink href="/tracker">Buka catatan</ActionLink></Panel></div></MainLayout>;
}

