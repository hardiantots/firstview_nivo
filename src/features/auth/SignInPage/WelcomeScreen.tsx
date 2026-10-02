'use client'
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageTitle, Panel, ActionLink, StateNotice } from '@/components/ui/nivo';
import { signInWithGoogle } from '@/lib/auth';
import logo from '@/assets/logo-with-text-horizontal.png';

export default function WelcomeScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const google = async () => {
    setLoading(true); setError('');
    try {
      const result = await signInWithGoogle();
      if (!result.success) setError('Belum bisa masuk dengan Google. Coba lagi atau gunakan email.');
    } catch { setError('Tidak dapat terhubung. Periksa koneksi lalu coba lagi.'); }
    finally { setLoading(false); }
  };
  return <main className="nivo-welcome">
    <section className="nivo-welcome-story">
      <Image src={logo} alt="NIVO" height={40} className="h-10 w-auto mb-12" priority />
      <PageTitle eyebrow="Mulai dari pilihanmu" title="Satu langkah, sesuai ritmemu.">Kenali kebiasaan merokokmu, tentukan rencana, dan temukan bantuan saat kamu membutuhkannya.</PageTitle>
      <ol className="nivo-steps">
        <li><span>01</span><div><h2>Catat tanpa menghakimi</h2><p>Hari tanpa rokok maupun hari yang terasa sulit tetap bisa dicatat.</p></div></li>
        <li><span>02</span><div><h2>Pilih langkah berikutnya</h2><p>Gunakan bantuan mandiri saat keinginan merokok muncul.</p></div></li>
        <li><span>03</span><div><h2>Lihat pola dari catatanmu</h2><p>Gunakan refleksi untuk membuat rencana yang sesuai denganmu.</p></div></li>
      </ol>
    </section>
    <div className="nivo-welcome-form">
      <Panel title="Mulai menggunakan NIVO" eyebrow="Selamat datang" className="nivo-entry-card">
        <p>Kamu menentukan tujuanmu sendiri. NIVO membantu mencatat dan merencanakan langkah.</p>
        <ActionLink href="/signup">Buat akun</ActionLink>
        <ActionLink href="/signin" secondary>Sudah punya akun? Masuk</ActionLink>
        <p className="text-center text-sm">atau</p>
        <Button variant="outline" className="w-full min-h-12" disabled={loading} onClick={google}>{loading ? 'Menghubungkan…' : 'Lanjutkan dengan Google'}</Button>
        {error && <StateNotice error>{error}</StateNotice>}
        <p className="text-sm text-muted-foreground">Konsultasi manusia melalui chat dan panggilan suara belum tersedia.</p>
      </Panel>
    </div>
  </main>;
}

