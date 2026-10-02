'use client'
import Link from 'next/link';
import Image from 'next/image';
import { Menu, Bell } from 'lucide-react';
import headerlogo from '@/assets/logo-with-text-horizontal.png';
export function AppHeader({ onMenuClick, showNotifications = true }: { onMenuClick?: () => void; showNotifications?: boolean }) {
  return <header className="legacy-header fixed top-0 inset-x-0 z-30 bg-background border-b px-4 py-3 flex items-center justify-between">
    <button onClick={onMenuClick} className="nivo-icon-button" aria-label="Buka menu akun"><Menu size={22} /></button>
    <Link href="/home" aria-label="NIVO — Home"><Image src={headerlogo} alt="NIVO" height={30} className="h-8 w-auto" /></Link>
    {showNotifications && <Link href="/notifications" className="nivo-icon-button" aria-label="Notifikasi"><Bell size={22} /></Link>}
  </header>;
}

