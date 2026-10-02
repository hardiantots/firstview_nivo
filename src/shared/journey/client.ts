'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { JourneyAction, JourneySnapshot } from './domain';

export async function authenticatedRequest(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Silakan masuk kembali.');
  const response = await fetch(path, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'Permintaan belum berhasil.'), { status: response.status });
  return result;
}
type Pending = { operationId: string; expectedRevision: number; action: JourneyAction };
export function useJourneyState() {
  const [snapshot, setSnapshot] = useState<JourneySnapshot | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const lock = useRef(false), owner = useRef('');
  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Silakan masuk kembali.');
      owner.current = session.user.id;
      const saved = localStorage.getItem('nivo.pending.' + owner.current);
      try { setPending(saved ? JSON.parse(saved) : null); }
      catch { setPending(null); setNotice('Isian sementara pada perangkat tidak dapat dibaca. Catatan server tetap dimuat.'); }
      setSnapshot(await authenticatedRequest('/api/journey')); setError('');
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const send = async (operation: Pending) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== owner.current) throw new Error('Akun berubah. Muat ulang halaman.');
    const result = await authenticatedRequest('/api/journey', { method: 'POST', body: JSON.stringify(operation) });
    localStorage.removeItem('nivo.pending.' + owner.current); setPending(null); setSnapshot(result); setNotice('Tersimpan di server.');
  };
  const save = async (action: JourneyAction) => {
    if (lock.current || !snapshot || pending) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    const operation = { operationId: crypto.randomUUID(), expectedRevision: snapshot.revision, action };
    try {
      localStorage.setItem('nivo.pending.' + owner.current, JSON.stringify(operation)); setPending(operation);
      await send(operation);
    } catch (e) { setError(e.message); setNotice('Belum tersimpan. Isian tersimpan sementara pada perangkat ini; kirim ulang saat online.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const retry = async (rebase = false) => {
    if (!pending || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      let operation = pending;
      if (rebase) {
        const latest = await authenticatedRequest('/api/journey');
        setSnapshot(latest); operation = { ...pending, expectedRevision: latest.revision };
        localStorage.setItem('nivo.pending.' + owner.current, JSON.stringify(operation)); setPending(operation);
      }
      await send(operation);
    } catch (e) { setError(e.message); } finally { lock.current = false; setBusy(false); }
  };
  const discard = () => { localStorage.removeItem('nivo.pending.' + owner.current); setPending(null); setNotice('Isian tertunda dibatalkan.'); };
  return { snapshot, error, notice, busy, pending, save, retry, discard, refresh };
}
