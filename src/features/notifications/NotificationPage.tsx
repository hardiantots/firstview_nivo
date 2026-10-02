import MainLayout from '@/shared/layout/MainLayout';
import { PageTitle, Panel, ActionLink } from '@/components/ui/nivo';
export default function NotificationPage() {
  return <MainLayout><div className="nivo-page"><PageTitle eyebrow="NIVO" title="Notifikasi" /><Panel title="Belum ada notifikasi"><p>Notifikasi layanan belum tersedia. Tidak ada pesan konsultan atau pengingat baru yang dapat ditampilkan.</p><ActionLink href="/home">Kembali ke Home</ActionLink></Panel></div></MainLayout>;
}

