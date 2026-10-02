'use client'
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SetupFrame from '@/features/onboarding/SetupFrame';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
const choices = ['Kesehatan', 'Keuangan', 'Keluarga', 'Energi & Stamina', 'Fokus & Konsentrasi', 'Kepercayaan Diri'];
export default function MotivationScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected.length) { setError('Pilih satu atau dua alasan.'); return; }
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Silakan masuk untuk menyimpan pilihan.');
      const response = await fetch('/api/profile/motivations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ motivations: selected }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(response.status === 401 ? 'Silakan masuk kembali.' : 'Pilihan belum tersimpan. Silakan coba lagi.');
      localStorage.setItem('selectedMotivations', JSON.stringify(selected));
      router.push('/home');
    } catch (e) { setError(e instanceof Error ? e.message : 'Belum dapat menyimpan pilihan.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <SetupFrame title="Apa alasan yang penting bagimu?" description="Pilihanmu akan menjadi pengingat pribadi, bukan janji hasil dari NIVO."><form onSubmit={submit}><Panel title="Pilih satu atau dua alasan"><fieldset className="grid gap-3"><legend className="sr-only">Alasan berhenti merokok</legend>{choices.map(choice => <label key={choice} className="flex items-center gap-3 border rounded-lg p-3"><input type="checkbox" checked={selected.includes(choice)} disabled={!selected.includes(choice) && selected.length === 2} onChange={e => setSelected(values => e.target.checked ? [...values, choice] : values.filter(v => v !== choice))} />{choice}</label>)}</fieldset>{error && <StateNotice error>{error}</StateNotice>}<Button type="submit" disabled={busy} className="min-h-12">{busy ? 'Menyimpan…' : 'Simpan dan buka Home'}</Button></Panel></form></SetupFrame>;
}

