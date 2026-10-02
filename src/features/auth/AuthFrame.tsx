'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';
import logo from '@/assets/logo-with-text-horizontal.png';
import illustration from '@/assets/abstract-header.jpg';

export default function AuthFrame({ children, onBack }: { children: ReactNode; onBack?: () => void }) {
  return <main className="nivo-auth-page">
    <header className="nivo-auth-header">
      <Link href="/welcome" aria-label="NIVO — Selamat datang"><Image src={logo} alt="NIVO" height={32} className="h-8 w-auto" priority /></Link>
      {onBack && <button type="button" className="nivo-icon-button" onClick={onBack} aria-label="Kembali"><ArrowLeft size={20} /></button>}
    </header>
    <div className="nivo-auth-body">
      <section className="nivo-glass nivo-auth-art">
        <Image src={illustration} alt="" fill sizes="(min-width: 768px) 550px, 100vw" className="object-cover" priority />
        <div className="nivo-auth-art-copy"><span className="nivo-badge">Sesuai ritmemu</span><h2>Ruang untuk langkah kecil.</h2><p>Catat kebiasaanmu dan pilih langkah berikutnya yang nyaman untukmu.</p></div>
      </section>
      <div className="nivo-glass nivo-glass-warm nivo-auth-card">{children}</div>
    </div>
  </main>;
}
