import { ArrowUpRight, Phone, MessageCircle, MapPin } from 'lucide-react';
import { Panel } from '@/components/ui/nivo';
import { support } from '@/config/support';

export default function NationalSupport() {
  return <section aria-label="Pilihan layanan berhenti merokok" className="nivo-stack">
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Telepon konselor" tone="soft"><Phone aria-hidden="true" /><p>Quitline.INA Kemenkes: {support.quitline.phone}.</p><p className="nivo-caption">Jadwal yang tercantum: {support.quitline.hours}. Ketersediaan layanan dapat berubah.</p><a href={support.quitline.href} className="nivo-action">Buka telepon</a></Panel>
      <Panel title="Chat Quitina"><MessageCircle aria-hidden="true" /><p>Buka chatbot Quitina milik Kemenkes di Telegram. Ini layanan di luar NIVO.</p><a href={support.quitina.telegram} target="_blank" rel="noopener noreferrer" className="nivo-action nivo-action-secondary">Buka Telegram <ArrowUpRight aria-hidden="true" size={17} /></a></Panel>
      <Panel title="Layanan terdekat"><MapPin aria-hidden="true" /><p>Tanyakan layanan Upaya Berhenti Merokok di Puskesmas atau klinik di dekatmu.</p><a href={support.source} target="_blank" rel="noopener noreferrer" className="nivo-action nivo-action-secondary">Informasi Kemenkes <ArrowUpRight aria-hidden="true" size={17} /></a></Panel>
    </div>
    <p className="nivo-caption">Kontak diperiksa dari <a className="underline" href={support.source} target="_blank" rel="noopener noreferrer">situs Kemenkes</a> pada {support.checkedAt}; jam telepon merujuk <a className="underline" href={support.quitline.hoursSource} target="_blank" rel="noopener noreferrer">pengumuman layanan</a>.</p>
    <Panel title="Bicarakan pilihan bantuan dengan tenaga kesehatan"><p>Konseling dan terapi berhenti merokok dapat dibahas dengan dokter atau apoteker. NIVO tidak memilih obat atau menentukan dosis untukmu.</p><a href={support.who} target="_blank" rel="noopener noreferrer" className="nivo-text-link">Pedoman WHO tentang berhenti merokok <ArrowUpRight size={16} aria-hidden="true" /></a></Panel>
  </section>;
}

export function CrisisSupport({ text }: { text: string }) {
  if (!/bunuh\s*diri|ingin\s*mati|mengakhiri\s*hidup|suicid|membunuh\s*diri/i.test(text)) return null;
  return <aside role="alert" className="nivo-panel nivo-panel-soft"><h2>Ada bantuan untuk menemanimu</h2><p>Jika kamu merasa tidak aman atau ingin menyakiti diri, hubungi orang yang kamu percaya atau bantuan darurat setempat. Dukungan kesehatan jiwa tersedia melalui Healing119: {support.crisis.phone}.</p><a href={support.crisis.href} target="_blank" rel="noopener noreferrer" className="nivo-action">Buka Healing119 <ArrowUpRight size={17} aria-hidden="true" /></a><a href={support.crisis.source} target="_blank" rel="noopener noreferrer" className="nivo-caption underline">Informasi layanan Kemenkes</a></aside>;
}

export function HealthEducation() {
  return <Panel title="Manfaat berhenti merokok"><p>WHO menjelaskan bahwa tubuh mulai mengalami perubahan setelah berhenti merokok: denyut jantung dan tekanan darah menurun dalam sekitar 20 menit; sirkulasi dan fungsi paru membaik dalam sekitar 2–12 minggu.</p><p className="nivo-caption">Ini informasi umum, bukan hasil pemeriksaan atau penilaian kondisi tubuhmu.</p><a href={support.milestones} target="_blank" rel="noopener noreferrer" className="nivo-text-link">Baca penjelasan WHO <ArrowUpRight aria-hidden="true" size={16} /></a></Panel>;
}
