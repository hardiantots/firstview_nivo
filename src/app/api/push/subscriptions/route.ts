import { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, database, failure, HttpError, json, verifiedUser } from '@/shared/server/http';
import { pushConfigured, pushEndpointSchema, pushSubscriptionSchema } from '@/shared/push/schema';

export async function GET(req: NextRequest) {
  try {
    const user = await verifiedUser(req);
    if (!pushConfigured()) return json({ configured: false, subscribed: false, publicKey: null });
    const { data, error } = await database().from('push_subscriptions').select('id').eq('user_id', user.id).eq('enabled', true).limit(1);
    if (error) throw new HttpError(503, 'Pengingat perangkat belum dapat diperiksa. Coba lagi.');
    return json({ configured: true, subscribed: Boolean(data?.length), publicKey: process.env.NIVO_VAPID_PUBLIC_KEY });
  } catch (error) { return failure(error); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifiedUser(req);
    const input = pushSubscriptionSchema.parse(await body(req, 4096));
    if (!pushConfigured()) throw new HttpError(503, 'Pengingat saat aplikasi ditutup belum diaktifkan. Pengingat di dalam NIVO tetap bisa digunakan.');
    const db = database();
    const journey = await db.from('nivo_journeys').select('document').eq('user_id', user.id).maybeSingle();
    if (journey.error) throw new HttpError(503, 'Persetujuan pengingat belum dapat diperiksa. Coba lagi.');
    if (journey.data?.document?.preferences?.enabled !== true || journey.data.document.preferences.consent !== true) throw new HttpError(403, 'Aktifkan pengingat dan simpan persetujuanmu terlebih dahulu.');
    const existing = await db.from('push_subscriptions').select('id,user_id').eq('endpoint', input.endpoint).maybeSingle();
    if (existing.error) throw new HttpError(503, 'Pengingat perangkat belum berhasil disimpan. Coba lagi.');
    if (existing.data && existing.data.user_id !== user.id) throw new HttpError(409, 'Pengingat perangkat ini masih terhubung ke akun lain. Gunakan perangkat lain atau matikan pengingat dari akun tersebut terlebih dahulu.');
    const values = { endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, enabled: true, updated_at: new Date().toISOString() };
    const result = existing.data
      ? await db.from('push_subscriptions').update(values).eq('id', existing.data.id).eq('user_id', user.id).select('id').maybeSingle()
      : await db.from('push_subscriptions').insert({ ...values, user_id: user.id }).select('id').single();
    if (result.error?.code === '23505') throw new HttpError(409, 'Pengingat perangkat berubah. Muat ulang halaman, lalu coba lagi.');
    if (result.error || !result.data) throw new HttpError(503, 'Pengingat perangkat belum berhasil disimpan. Periksa koneksi, lalu coba lagi.');
    return json({ subscribed: true });
  } catch (error) { return failure(error); }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await verifiedUser(req);
    const input = z.object({ endpoint: pushEndpointSchema.optional() }).strict().parse(await body(req, 4096));
    let query = database().from('push_subscriptions').delete().eq('user_id', user.id);
    if (input.endpoint) query = query.eq('endpoint', input.endpoint);
    const { error } = await query;
    if (error) throw new HttpError(503, 'Pengingat perangkat belum berhasil dimatikan. Periksa koneksi, lalu coba lagi.');
    return json({ subscribed: false });
  } catch (error) { return failure(error); }
}
