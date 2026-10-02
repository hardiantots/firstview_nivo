'use client'
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const returnFocus = useRef<HTMLElement | null>(null);
  const logout = async () => {
    setBusy(true); setError('');
    try {
      const { signOut } = await import('@/lib/auth');
      const result = await signOut();
      if (!result.success) throw new Error('logout');
      onClose(); router.replace('/signin');
    } catch { setError('Belum berhasil keluar. Coba lagi.'); }
    finally { setBusy(false); }
  };
  return <Sheet open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <SheetContent side="left" className="w-[min(90vw,340px)]" onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }} onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}>
      <SheetHeader><SheetTitle>Menu NIVO</SheetTitle><SheetDescription>Akun dan dukunganmu.</SheetDescription></SheetHeader>
      <nav aria-label="Menu akun" className="grid gap-2 py-6">
        {[['/home', 'Home'], ['/profile-settings', 'Pengaturan profil'], ['/contact-professional', 'Konsultasi'], ['/community', 'Komunitas — belum tersedia']].map(([href, label]) => <Link key={href} href={href} onClick={onClose} className="rounded-lg p-3 hover:bg-secondary">{label}</Link>)}
      </nav>
      <Button variant="outline" disabled={busy} onClick={logout}>{busy ? 'Keluar…' : 'Keluar dari akun'}</Button>
      {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
    </SheetContent>
  </Sheet>;
}

