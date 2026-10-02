'use client'
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Home, Heart, BarChart3, Sprout, MessageCircle, Bell, Menu } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import AuthGuard from '@/shared/auth/AuthGuard';
import Sidebar from './Sidebar';
import ScrollToTop from './ScrollToTop';
import headerlogo from '@/assets/logo-with-text-horizontal.png';

const items = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/craving-support', icon: Heart, label: 'Butuh bantuan' },
  { href: '/tracker', icon: BarChart3, label: 'Catatan' },
  { href: '/pencapaian', icon: Sprout, label: 'Perjalanan' },
  { href: '/contact-professional', icon: MessageCircle, label: 'Konsultasi' },
];
export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <AuthGuard><div className="nivo-shell">
    <ScrollToTop />
    <a href="#main-content" className="nivo-skip">Lewati ke konten</a>
    <header className="nivo-header">
      <div className="nivo-brand"><Link href="/home" aria-label="NIVO — Home"><Image src={headerlogo} alt="NIVO" height={32} className="h-8 w-auto" priority /></Link><span>Ruang untuk langkah kecil.</span></div>
      <div className="flex items-center gap-2">
        <Link href="/notifications" className="nivo-icon-button" aria-label="Notifikasi"><Bell size={20} aria-hidden="true" /></Link>
        <button className="nivo-icon-button" onClick={() => setMenuOpen(true)} aria-label="Buka menu akun"><Menu size={20} aria-hidden="true" /></button>
      </div>
    </header>
    <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    <div className="nivo-shell-body">
      <nav className="nivo-nav" aria-label="Navigasi utama">
        <p className="nivo-nav-caption">Ruangmu</p>
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href === '/tracker' && pathname.startsWith('/craving-history'));
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
            <Icon size={21} strokeWidth={1.7} aria-hidden="true" /><span>{label}</span>
          </Link>;
        })}
        <div className="nivo-nav-note"><Sprout size={22} strokeWidth={1.5} aria-hidden="true" /><p>Satu langkah.<br />Sesuai ritmemu.</p></div>
      </nav>
      <main id="main-content" tabIndex={-1} className="nivo-main">
        {offline && <p role="status" className="nivo-notice nivo-notice-error">Kamu sedang offline. Isian tetap di halaman ini; penyimpanan memerlukan koneksi.</p>}
        {children}
      </main>
    </div>
  </div></AuthGuard>;
}

