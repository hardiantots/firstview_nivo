'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { authenticatedRequest } from '@/shared/api/client';
import {
  dateBefore,
  localDate,
  type JourneyAction,
  type JourneyState,
} from '@/shared/journey/domain';
import { formatDate } from '@/shared/lib/format';
import { urlBase64Bytes } from '@/shared/push/endpoint';

type PushStatus = { configured: boolean; subscribed: boolean; publicKey: string | null };
const FOLLOWUP_DAYS = [1, 3, 7, 14, 30];
const initialStatus: PushStatus = { configured: false, subscribed: false, publicKey: null };
const supported = () =>
  window.isSecureContext &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

async function registration() {
  const worker = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });
  if (worker.active) return worker;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('worker_unavailable')), 10000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export default function PushPreferences({
  state,
  busy,
  onSave,
}: {
  state: JourneyState;
  busy: boolean;
  onSave: (action: JourneyAction) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(state.preferences);
  const [status, setStatus] = useState<PushStatus>(initialStatus),
    [checking, setChecking] = useState(true),
    [working, setWorking] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false),
    [deviceSupported, setDeviceSupported] = useState(false);
  const [cleanupFailed, setCleanupFailed] = useState(false);
  const [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  const lock = useRef(false),
    permissionAsked = useRef(false);
  const preferencesKey = JSON.stringify(state.preferences);
  useEffect(() => {
    setDraft(JSON.parse(preferencesKey));
  }, [preferencesKey]);
  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      setStatus(await authenticatedRequest('/api/push/subscriptions'));
    } catch {
      setError(
        'Pengiriman saat NIVO ditutup belum dapat diperiksa. Pengingat dalam aplikasi tetap bisa digunakan.',
      );
    } finally {
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    setDeviceSupported(supported());
    checkStatus();
  }, [checkStatus]);
  const blocked = busy || working;
  const action = (enabled = draft.enabled): JourneyAction => ({
    type: 'preferences',
    ...draft,
    enabled,
    consent: enabled,
  });

  const connect = async () => {
    if (!status.configured || !status.publicKey || !supported()) return false;
    if (Notification.permission !== 'granted') return false;
    const worker = await registration();
    const existing = await worker.pushManager.getSubscription();
    const subscription =
      existing ||
      (await worker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64Bytes(status.publicKey),
      }));
    await authenticatedRequest('/api/push/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription.toJSON()),
    });
    setDeviceConnected(true);
    setStatus((current) => ({ ...current, subscribed: true }));
    return true;
  };

  const stopDeviceSending = async () => {
    const results = await Promise.allSettled([
      authenticatedRequest('/api/push/subscriptions', { method: 'DELETE', body: '{}' }),
      'serviceWorker' in navigator
        ? navigator.serviceWorker.getRegistration('/').then(async (worker) => {
            const subscription = await worker?.pushManager?.getSubscription();
            if (subscription) await subscription.unsubscribe();
          })
        : Promise.resolve(),
    ]);
    const stopped = results.every((result) => result.status === 'fulfilled');
    setDeviceConnected(false);
    setCleanupFailed(!stopped);
    if (stopped) setStatus((current) => ({ ...current, subscribed: false }));
    return stopped;
  };

  const toggle = async () => {
    if (lock.current || blocked) return;
    const enable = !draft.enabled;
    lock.current = true;
    setWorking(true);
    setNotice('');
    setError('');
    // Invoke the permission prompt directly from this gesture, before awaiting a network operation.
    const permission =
      enable &&
      status.configured &&
      supported() &&
      Notification.permission === 'default' &&
      !permissionAsked.current
        ? ((permissionAsked.current = true), Notification.requestPermission())
        : Promise.resolve(null);
    try {
      await permission;
      const saved = await onSave(action(enable));
      if (!enable) {
        const stopped = await stopDeviceSending();
        if (saved && stopped) {
          setDraft((current) => ({ ...current, enabled: false, consent: false }));
          setNotice('Pengingat dimatikan untuk akunmu di semua perangkat.');
        } else
          setError(
            'Pengingat belum sepenuhnya dimatikan. Isian tetap ada. Periksa koneksi, lalu coba matikan lagi.',
          );
        return;
      }
      if (!saved) return;
      setDraft((current) => ({ ...current, enabled: true, consent: true }));
      if (await connect())
        setNotice('Pengingat aktif di perangkat ini. Jadwal mengikuti zona waktu profilmu.');
      else
        setNotice(
          'Pengingat dalam NIVO aktif. Untuk saat ini, pengingat hanya muncul ketika aplikasi terbuka.',
        );
    } catch {
      setError(
        'Pengingat perangkat belum tersambung. Pengaturan yang tersimpan tetap berlaku di dalam NIVO. Periksa koneksi atau izin notifikasi, lalu coba lagi.',
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };

  const enableThisDevice = async () => {
    if (lock.current || blocked) return;
    lock.current = true;
    setWorking(true);
    setError('');
    setNotice('');
    const permission =
      supported() && Notification.permission === 'default' && !permissionAsked.current
        ? ((permissionAsked.current = true), Notification.requestPermission())
        : Promise.resolve(null);
    try {
      await permission;
      if (await connect()) setNotice('Pengingat aktif di perangkat ini.');
      else
        setNotice(
          'Izin notifikasi belum aktif. Ubah izin NIVO pada pengaturan browser; pengingat dalam aplikasi tetap tersedia.',
        );
    } catch {
      setError('Perangkat belum tersambung. Periksa koneksi atau izin notifikasi, lalu coba lagi.');
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };

  const saveSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current || blocked) return;
    lock.current = true;
    setWorking(true);
    setError('');
    setNotice('');
    try {
      if (await onSave(action())) setNotice('Jadwal pengingat tersimpan.');
    } catch {
      setError('Jadwal belum tersimpan. Periksa koneksi, lalu coba lagi.');
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };
  const retryStop = async () => {
    if (lock.current || blocked) return;
    lock.current = true;
    setWorking(true);
    setError('');
    try {
      if (await stopDeviceSending()) setNotice('Pengiriman ke perangkat sudah dihentikan.');
      else setError('Pengiriman belum berhasil dihentikan. Periksa koneksi, lalu coba lagi.');
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };
  const [hours, minutes] = draft.time.split(':');
  const today = localDate(new Date(), state.timezone);
  const minuteOptions = [
    ...new Set([
      ...Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0')),
      minutes,
    ]),
  ].sort();
  return (
    <Panel title="Pengingat pilihanmu" tone="soft">
      <p>
        Pilih pengingat yang ringan. Dengan mengaktifkannya, kamu mengizinkan NIVO mengirim
        pengingat. Kamu bisa mematikan atau menjedanya kapan saja.
      </p>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="push-enabled">Aktifkan pengingat</Label>
        <button
          id="push-enabled"
          type="button"
          role="switch"
          aria-checked={draft.enabled}
          disabled={blocked}
          onClick={toggle}
          className="nivo-button flex min-h-11 min-w-14 items-center justify-center rounded-control px-1"
          aria-describedby="push-mode-hint"
        >
          <span
            className={`relative flex h-6 w-11 items-center rounded-full border p-0.5 ${draft.enabled ? 'border-primary bg-primary' : 'border-input bg-muted'}`}
            aria-hidden="true"
          >
            <span
              className={`h-5 w-5 rounded-full bg-white transition-transform duration-150 ${draft.enabled ? 'translate-x-4' : ''}`}
            />
          </span>
        </button>
      </div>
      <p id="push-mode-hint" className="nivo-caption">
        {checking
          ? 'Memeriksa ketersediaan pengiriman…'
          : !status.configured
            ? 'Pengiriman saat aplikasi ditutup belum diaktifkan. Pengingat hanya muncul saat NIVO terbuka.'
            : !deviceSupported
              ? 'Perangkat ini belum mendukung pengiriman saat aplikasi ditutup. Gunakan pengingat saat NIVO terbuka.'
              : deviceConnected
                ? 'Perangkat ini terhubung. Pengingat tetap bisa dikirim saat NIVO ditutup, selama izin dan koneksi tersedia.'
                : status.subscribed
                  ? 'Akunmu memiliki perangkat yang terhubung. Aktifkan pengiriman di perangkat ini bila dibutuhkan.'
                  : 'Izinkan notifikasi di perangkat ini agar pengingat bisa dikirim saat NIVO ditutup. Jika izin ditolak, pengingat tetap tersedia di dalam aplikasi.'}
      </p>
      {error && <StateNotice error>{error}</StateNotice>}
      {notice && <StateNotice>{notice}</StateNotice>}
      {cleanupFailed && (
        <Button type="button" variant="secondary" disabled={blocked} onClick={retryStop}>
          Coba hentikan pengiriman perangkat lagi
        </Button>
      )}
      {checking && (
        <Button type="button" variant="secondary" disabled>
          Cek pengiriman…
        </Button>
      )}
      {!checking && error && (
        <Button type="button" variant="secondary" disabled={blocked} onClick={checkStatus}>
          Cek ketersediaan lagi
        </Button>
      )}
      {draft.enabled && status.configured && deviceSupported && !deviceConnected && (
        <Button type="button" variant="secondary" disabled={blocked} onClick={enableThisDevice}>
          Aktifkan di perangkat ini
        </Button>
      )}
      {draft.enabled && (
        <details className="nivo-disclosure">
          <summary>Menggunakan iPhone atau iPad?</summary>
          <p className="nivo-caption">
            Pada iOS/iPadOS 16.4 atau lebih baru, buka NIVO di Safari, pilih Bagikan → Tambahkan ke
            Layar Utama. Buka NIVO dari ikon tersebut, lalu aktifkan notifikasi di perangkat ini.
            Pengingat di dalam aplikasi tetap tersedia jika perangkat belum mendukungnya.
          </p>
        </details>
      )}
      <form onSubmit={saveSchedule} className="grid gap-4">
        <fieldset disabled={blocked} className="grid min-w-0 gap-4">
          <div>
            <p className="mb-2 font-medium">Jam pengingat · format 24 jam</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="nivo-field">
                <Label htmlFor="push-hour">Jam</Label>
                <select
                  id="push-hour"
                  value={hours}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      time: event.target.value + ':' + minutes,
                    }))
                  }
                >
                  {Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')).map(
                    (hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="nivo-field">
                <Label htmlFor="push-minute">Menit</Label>
                <select
                  id="push-minute"
                  value={minutes}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, time: hours + ':' + event.target.value }))
                  }
                >
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="nivo-caption mt-2">
              Jadwal {draft.time} mengikuti zona waktu pada profilmu.
            </p>
          </div>
          <div className="grid gap-2">
            <p className="font-medium">Maksimum pengingat per hari</p>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={draft.maxPerDay <= 1 || blocked}
                onClick={() =>
                  setDraft((current) => ({ ...current, maxPerDay: current.maxPerDay - 1 }))
                }
                aria-label="Kurangi maksimum pengingat"
              >
                <Minus aria-hidden="true" />
              </Button>
              <output aria-live="polite">{draft.maxPerDay}</output>
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={draft.maxPerDay >= 3 || blocked}
                onClick={() =>
                  setDraft((current) => ({ ...current, maxPerDay: current.maxPerDay + 1 }))
                }
                aria-label="Tambah maksimum pengingat"
              >
                <Plus aria-hidden="true" />
              </Button>
            </div>
            <p className="nivo-caption">
              Termasuk pengingat harian dan kabar perjalanan setelah berhenti.
            </p>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 font-medium">Kabar perjalanan pada hari ke-</legend>
            <div className="nivo-button-row">
              {FOLLOWUP_DAYS.map((day) => (
                <Button
                  key={day}
                  type="button"
                  variant="outline"
                  aria-pressed={draft.followupDays.includes(day)}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      followupDays: current.followupDays.includes(day)
                        ? current.followupDays.filter((value) => value !== day)
                        : [...current.followupDays, day].sort((a, b) => a - b),
                    }))
                  }
                >
                  {day}
                </Button>
              ))}
            </div>
            <p className="nivo-caption">
              Dihitung dari tanggal mulai berhenti yang kamu catat. Boleh tidak memilih.
            </p>
          </fieldset>
          <div className="grid gap-2">
            <p className="font-medium">Jeda pengingat</p>
            <div className="nivo-button-row">
              <Button
                type="button"
                variant="outline"
                aria-pressed={!draft.pausedUntil || draft.pausedUntil < today}
                onClick={() => setDraft((current) => ({ ...current, pausedUntil: null }))}
              >
                Tanpa jeda
              </Button>
              {[1, 3, 7].map((days) => (
                <Button
                  key={days}
                  type="button"
                  variant="outline"
                  aria-pressed={draft.pausedUntil === dateBefore(today, 1 - days)}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      pausedUntil: dateBefore(today, 1 - days),
                    }))
                  }
                >
                  {days} hari
                </Button>
              ))}
            </div>
            {draft.pausedUntil && draft.pausedUntil >= today && (
              <p className="nivo-caption">
                Dijeda sampai {formatDate(draft.pausedUntil)}. Pengingat kembali pada hari
                berikutnya.
              </p>
            )}
          </div>
        </fieldset>
        <Button type="submit" disabled={blocked}>
          {working || busy ? 'Menyimpan…' : 'Simpan jadwal pengingat'}
        </Button>
      </form>
    </Panel>
  );
}
