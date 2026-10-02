'use client'
import { useEffect, useState } from 'react';
import MainLayout from '@/shared/layout/MainLayout';
import { PageTitle, Panel, StateNotice, ActionLink } from '@/components/ui/nivo';
export default function AIResultPage() {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('nivo.support-result');
      if (raw) {
        const result = JSON.parse(raw);
        if (result.mode === 'automatic' && typeof result.suggestion === 'string') setSuggestion(result.suggestion);
      }
    } catch { /* Invalid browser cache is treated as unavailable. */ }
    finally { setLoaded(true); }
  }, []);
  return <MainLayout><div className="nivo-page">
    <PageTitle eyebrow="Panduan otomatis" title="Pilih satu langkah berikutnya">Ini pesan otomatis umum, bukan balasan konsultan atau penilaian kesehatan.</PageTitle>
    <div className="nivo-columns"><Panel title="Kamu yang menentukan">
      {!loaded ? <StateNotice>Memuat panduan…</StateNotice> : suggestion ? <p className="whitespace-pre-line">{suggestion}</p> : <StateNotice>Belum ada panduan untuk sesi ini. Catat situasimu untuk memulai.</StateNotice>}
      <ActionLink href="/craving-support">Kembali ke bantuan</ActionLink>
    </Panel><Panel title="Lanjutkan dengan pilihanmu"><p>Kamu dapat melihat catatanmu atau mengecek status konsultasi manusia.</p><ActionLink href="/tracker" secondary>Lihat catatan</ActionLink><ActionLink href="/contact-professional" secondary>Status konsultasi</ActionLink></Panel></div>
  </div></MainLayout>;
}

