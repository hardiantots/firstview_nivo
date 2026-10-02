'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function LogoutButton({ onLoggedOut }: { onLoggedOut?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  const logout = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const { signOut } = await import('@/lib/auth');
      const result = await signOut();
      if (!result.success) throw new Error('logout');
      setOpen(false);
      onLoggedOut?.();
      router.replace('/signin');
    } catch {
      setError('Belum berhasil keluar. Periksa koneksi, lalu coba lagi.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
          setError('');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Keluar dari akun
        </Button>
      </DialogTrigger>
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogTitle>Keluar dari akun?</DialogTitle>
        <DialogDescription>
          Catatan yang sudah tersimpan tetap ada. Kamu bisa masuk lagi kapan saja. Pastikan isian
          tertunda sudah dikirim sebelum keluar.
        </DialogDescription>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)} autoFocus>
            Tetap di sini
          </Button>
          <Button
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy}
            onClick={logout}
          >
            {busy ? 'Keluar…' : 'Ya, keluar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
