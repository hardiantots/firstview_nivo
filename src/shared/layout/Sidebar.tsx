'use client'
import Link from 'next/link';
import { useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import LogoutButton from '@/shared/auth/LogoutButton';
export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return <Sheet open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <SheetContent side="left" className="w-[min(90vw,340px)]" onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }} onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}>
      <SheetHeader><SheetTitle>Menu NIVO</SheetTitle><SheetDescription>Akun dan dukunganmu.</SheetDescription></SheetHeader>
      <nav aria-label="Menu akun" className="grid gap-2 py-6">
        {[['/home', 'Beranda'], ['/profile-settings', 'Pengaturan profil'], ['/contact-professional', 'Konsultasi'], ['/community', 'Komunitas — belum tersedia']].map(([href, label]) => <Link key={href} href={href} onClick={onClose} className="rounded-control p-3 hover:bg-secondary/10 hover:text-accent transition-colors">{label}</Link>)}
      </nav>
      <div className="mt-6 border-t border-border pt-6"><LogoutButton onLoggedOut={onClose} /></div>
    </SheetContent>
  </Sheet>;
}

