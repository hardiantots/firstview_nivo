'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { JourneyAction, JourneySnapshot, reduceJourney } from './domain';

import { authenticatedRequest } from '@/shared/api/client';
import { JourneyOperation, readPendingOperation } from './operation';

type Pending = JourneyOperation;
export function useJourneyState() {
  const [snapshot, setSnapshot] = useState<JourneySnapshot | null>(null);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const lock = useRef(false),
    owner = useRef(''),
    refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    if (lock.current) return;
    const version = ++refreshVersion.current;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Silakan masuk kembali.');
      if (version !== refreshVersion.current) return;
      if (owner.current && owner.current !== session.user.id) setSnapshot(null);
      owner.current = session.user.id;
      try {
        setPending(readPendingOperation(localStorage.getItem('nivo.pending.' + owner.current)));
      } catch {
        setPending(null);
        setNotice(
          'Isian sementara pada perangkat tidak dapat dibaca. Catatan server tetap dimuat.',
        );
      }
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Makassar';
      const latest = await authenticatedRequest<JourneySnapshot>(
        '/api/journey?timezone=' + encodeURIComponent(timezone),
      );
      if (version !== refreshVersion.current) return;
      setSnapshot(latest);
      setError('');
    } catch (e) {
      if (version === refreshVersion.current)
        setError(e instanceof Error ? e.message : 'Catatan belum dapat dimuat.');
    }
  }, []);
  useEffect(() => {
    const version = refreshVersion;
    refresh();
    return () => {
      version.current++;
    };
  }, [refresh]);
  const send = async (operation: Pending) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session || session.user.id !== owner.current)
      throw new Error('Akun berubah. Muat ulang halaman.');
    const result = await authenticatedRequest<JourneySnapshot>('/api/journey', {
      method: 'POST',
      body: JSON.stringify(operation),
    });
    // A device-storage failure must not roll back a successful server commit.
    let cleared = true;
    try {
      localStorage.removeItem('nivo.pending.' + owner.current);
    } catch {
      cleared = false;
    }
    setPending(null);
    setSnapshot(result);
    setNotice(
      cleared
        ? 'Tersimpan di server.'
        : 'Tersimpan di server. Isian sementara pada perangkat belum dapat dibersihkan.',
    );
  };
  const save = async (action: JourneyAction) => {
    if (lock.current || !snapshot || pending) return false;
    lock.current = true;
    refreshVersion.current++;
    setBusy(true);
    setError('');
    setNotice('');
    const operation = {
      operationId: crypto.randomUUID(),
      expectedRevision: snapshot.revision,
      action,
      timezone: snapshot.state.timezone,
    };
    const previous = snapshot;
    let queued = false;
    try {
      localStorage.setItem('nivo.pending.' + owner.current, JSON.stringify(operation));
      queued = true;
      setPending(operation);
      if (action.type === 'daily')
        setSnapshot({
          ...snapshot,
          state: reduceJourney(snapshot.state, action, operation.operationId),
        });
      await send(operation);
      return true;
    } catch (e) {
      setSnapshot(previous);
      setError(e instanceof Error ? e.message : 'Catatan belum tersimpan.');
      setNotice(
        queued
          ? 'Belum tersimpan. Isian tersimpan sementara pada perangkat ini; kirim ulang saat online.'
          : 'Penyimpanan perangkat tidak tersedia. Isian belum dikirim; coba lagi setelah penyimpanan tersedia.',
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const retry = async (rebase = false) => {
    if (!pending || lock.current) return;
    lock.current = true;
    refreshVersion.current++;
    setBusy(true);
    setError('');
    try {
      let operation = pending;
      if (rebase) {
        const latest = await authenticatedRequest<JourneySnapshot>('/api/journey');
        setSnapshot(latest);
        operation = { ...pending, expectedRevision: latest.revision };
        localStorage.setItem('nivo.pending.' + owner.current, JSON.stringify(operation));
        setPending(operation);
      }
      await send(operation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Catatan belum tersimpan.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const discard = () => {
    if (lock.current) return;
    try {
      localStorage.removeItem('nivo.pending.' + owner.current);
      setPending(null);
      setNotice('Isian tertunda dibatalkan.');
    } catch {
      setError('Isian sementara pada perangkat belum dapat dibersihkan.');
    }
  };
  return { snapshot, error, notice, busy, pending, save, retry, discard, refresh };
}
