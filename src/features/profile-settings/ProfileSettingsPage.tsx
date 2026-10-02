'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bell, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel, PageTitle, StateNotice } from '@/components/ui/nivo';
import { authenticatedRequest } from '@/shared/api/client';
import { deviceTimezone } from '@/shared/lib/format';
import { profileSchema } from '@/shared/profile/schema';
import { MOTIVATION_OPTIONS } from '@/content/copy-id';
import logo from '@/assets/logo-with-text-horizontal.png';
import AuthGuard from '@/shared/auth/AuthGuard';
import LogoutButton from '@/shared/auth/LogoutButton';

type ProfileForm = {
  fullName: string;
  email: string;
  motivations: string[];
  ownReason: string;
  timezone: string;
};
const emptyForm: ProfileForm = {
  fullName: '',
  email: '',
  motivations: [],
  ownReason: '',
  timezone: '',
};
const timezoneOptions = [
  { value: 'Asia/Jakarta', label: 'Jakarta · WIB' },
  { value: 'Asia/Makassar', label: 'Makassar · WITA' },
  { value: 'Asia/Jayapura', label: 'Jayapura · WIT' },
];

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true),
    [loaded, setLoaded] = useState(false),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [conflict, setConflict] = useState(false);
  const [initial, setInitial] = useState<ProfileForm>(emptyForm),
    [form, setForm] = useState<ProfileForm>(emptyForm);
  const [journeyRevision, setJourneyRevision] = useState(0);
  const lock = useRef(false),
    alive = useRef(true);

  const loadProfile = useCallback(async (keepDraft = false) => {
    setLoading(true);
    setError('');
    try {
      const { profile } = await authenticatedRequest('/api/profile');
      if (!alive.current) return;
      const next: ProfileForm = {
        fullName: profile.full_name || '',
        email: profile.email || '',
        motivations: profile.motivations || [],
        ownReason: profile.own_reason || '',
        timezone: profile.timezone || deviceTimezone(),
      };
      setInitial(next);
      if (!keepDraft) setForm(next);
      setJourneyRevision(profile.journey_revision || 0);
      setLoaded(true);
      setConflict(false);
      if (keepDraft)
        setNotice(
          'Profil terbaru sudah dimuat di bawah. Isianmu tetap ada. Periksa perbedaannya sebelum menyimpan lagi.',
        );
    } catch {
      if (alive.current) setError('Profil belum dapat dimuat. Periksa koneksi, lalu coba lagi.');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    loadProfile();
    return () => {
      alive.current = false;
    };
  }, [loadProfile]);
  const setField = <K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice('');
  };
  const hasChanges = JSON.stringify(form) !== JSON.stringify(initial);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current || !loaded || !hasChanges || conflict) return;
    const input = profileSchema.safeParse({
      full_name: form.fullName,
      motivations: form.motivations,
      own_reason: form.ownReason,
      timezone: form.timezone,
      journey_revision: journeyRevision,
    });
    if (!input.success) {
      setError('Periksa kembali isianmu. Alasan pribadi maksimal 300 karakter.');
      return;
    }
    lock.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await authenticatedRequest('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(input.data),
      });
      setJourneyRevision(result.journey_revision ?? journeyRevision);
      const saved = {
        ...form,
        fullName: input.data.full_name,
        ownReason: input.data.own_reason || '',
      };
      setForm(saved);
      setInitial(saved);
      setNotice('Perubahan profil tersimpan.');
    } catch (cause) {
      setConflict(
        Boolean(cause && typeof cause === 'object' && 'status' in cause && cause.status === 409),
      );
      setError(
        cause instanceof Error
          ? cause.message
          : 'Belum bisa menyimpan. Periksa koneksi, lalu coba lagi.',
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="nivo-standalone">
        <header className="nivo-standalone-header sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/home')}
              className="nivo-icon-button"
              aria-label="Kembali ke Beranda"
            >
              <ArrowLeft size={20} />
            </button>
            <Image src={logo} alt="NIVO" height={32} className="h-8 w-auto" />
          </div>
          <Link href="/notifications" className="nivo-icon-button" aria-label="Notifikasi">
            <Bell size={20} />
          </Link>
        </header>
        <main className="nivo-profile-content space-y-6">
          <PageTitle eyebrow="Akunmu" title="Pengaturan profil">
            Pilih informasi yang ingin kamu simpan. Kamu bisa mengubahnya kapan saja.
          </PageTitle>
          {error && <StateNotice error>{error}</StateNotice>}
          {notice && <StateNotice>{notice}</StateNotice>}
          {loading && !loaded ? (
            <div className="nivo-glass p-6" role="status" aria-busy="true">
              <p>Memuat profil…</p>
              <div className="nivo-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : !loaded ? (
            <Button variant="secondary" onClick={() => loadProfile()}>
              Coba muat profil lagi
            </Button>
          ) : (
            <>
              <div className="nivo-glass nivo-glass-warm flex items-center gap-3 p-5">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-secondary/25 bg-secondary/20 text-lg font-medium text-accent"
                  aria-hidden="true"
                >
                  {form.fullName.trim().charAt(0).toUpperCase() || 'N'}
                </span>
                <div className="min-w-0 break-words">
                  <p className="font-semibold">{form.fullName || 'Nama belum diisi'}</p>
                  <p className="text-sm text-muted-foreground">{form.email}</p>
                </div>
              </div>
              <form onSubmit={save} className="grid gap-6">
                <fieldset disabled={saving || loading} className="grid min-w-0 gap-6">
                  <Panel title="Informasi pribadi">
                    <div className="nivo-field">
                      <Label htmlFor="nama">Nama Lengkap</Label>
                      <Input
                        id="nama"
                        autoComplete="name"
                        maxLength={200}
                        value={form.fullName}
                        onChange={(e) => setField('fullName', e.target.value)}
                      />
                    </div>
                    <div className="nivo-field">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        readOnly
                        aria-describedby="profile-email-hint"
                      />
                      <p id="profile-email-hint" className="nivo-caption">
                        Email mengikuti akun yang kamu gunakan untuk masuk.
                      </p>
                    </div>
                  </Panel>
                  <Panel title="Alasanmu" tone="soft">
                    <fieldset className="grid gap-3">
                      <legend className="mb-2 font-medium">Pilih maksimal dua alasan</legend>
                      <p className="nivo-caption">
                        Pilihan ini menjadi pengingat pribadi saat keinginan merokok muncul.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ...MOTIVATION_OPTIONS,
                          ...form.motivations.filter(
                            (value) => !MOTIVATION_OPTIONS.some((option) => option === value),
                          ),
                        ].map((value) => {
                          const selected = form.motivations.includes(value);
                          return (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={selected}
                              disabled={!selected && form.motivations.length >= 2}
                              onClick={() =>
                                setField(
                                  'motivations',
                                  selected
                                    ? form.motivations.filter((item) => item !== value)
                                    : [...form.motivations, value],
                                )
                              }
                              className={`nivo-button flex min-h-12 items-center gap-2 rounded-control border px-3 py-2 text-left text-sm ${selected ? 'border-primary bg-primary text-white' : 'border-secondary/25 bg-white/80 text-foreground'}`}
                            >
                              {selected && <Check size={16} aria-hidden="true" />}
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                    <div className="nivo-field">
                      <Label htmlFor="own-reason">Alasanku sendiri (opsional)</Label>
                      <textarea
                        id="own-reason"
                        maxLength={300}
                        rows={3}
                        value={form.ownReason}
                        onChange={(e) => setField('ownReason', e.target.value)}
                        aria-describedby="own-reason-hint"
                      />
                      <p id="own-reason-hint" className="nivo-caption">
                        Pengingat untukmu saat keinginan merokok muncul. {form.ownReason.length}/300
                        karakter.
                      </p>
                    </div>
                  </Panel>
                  <Panel title="Waktu dan perjalanan">
                    <div className="nivo-field">
                      <Label htmlFor="profile-timezone">Zona waktu</Label>
                      <select
                        id="profile-timezone"
                        value={form.timezone}
                        onChange={(e) => setField('timezone', e.target.value)}
                        aria-describedby="timezone-hint"
                      >
                        {!timezoneOptions.some((option) => option.value === form.timezone) && (
                          <option value={form.timezone}>
                            Zona waktu perangkat atau pilihan tersimpan
                          </option>
                        )}
                        {timezoneOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p id="timezone-hint" className="nivo-caption">
                        Awalnya mengikuti perangkat. Pilihan ini menentukan tanggal catatan dan jam
                        pengingatmu.
                      </p>
                    </div>
                    <Link className="nivo-text-link" href="/pencapaian">
                      Atur tanggal dan langkah perjalanan
                    </Link>
                  </Panel>
                </fieldset>
                {conflict && (
                  <div className="nivo-glass p-5">
                    <p className="mb-3 text-sm">
                      Isianmu masih ada. Muat versi terbaru untuk memeriksa perubahan dari perangkat
                      lain.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={loading}
                      onClick={() => loadProfile(true)}
                    >
                      {loading ? 'Memuat…' : 'Muat profil terbaru'}
                    </Button>
                  </div>
                )}
                {notice.startsWith('Profil terbaru') && (
                  <Panel title="Profil terakhir di server" tone="soft">
                    <dl className="grid gap-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Nama</dt>
                        <dd>{initial.fullName || 'Belum diisi'}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Alasan pribadi</dt>
                        <dd>{initial.ownReason || 'Belum diisi'}</dd>
                      </div>
                    </dl>
                  </Panel>
                )}
                <div className="nivo-glass nivo-glass-warm grid gap-3 p-5 sm:p-6">
                  <Button
                    type="submit"
                    disabled={!hasChanges || saving || loading || conflict}
                    aria-describedby="profile-save-hint"
                  >
                    {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
                  </Button>
                  <p id="profile-save-hint" className="nivo-caption">
                    {saving
                      ? 'Tunggu sampai penyimpanan selesai.'
                      : conflict
                        ? 'Muat profil terbaru sebelum menyimpan.'
                        : hasChanges
                          ? 'Perubahanmu belum disimpan.'
                          : 'Belum ada perubahan.'}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => {
                      setForm(initial);
                      setError('');
                      setNotice('');
                    }}
                  >
                    Batalkan Perubahan
                  </Button>
                </div>
              </form>
              <div className="border-t border-border pt-6">
                <LogoutButton />
              </div>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
