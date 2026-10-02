import { NextRequest } from 'next/server';
import { z } from 'zod';
import { motivationsSchema } from '@/shared/profile/schema';
import { body, database, failure, HttpError, identity, json } from '@/shared/server/http';
import { recordOperation } from '@/shared/server/telemetry';

const payload = z.object({ motivations: motivationsSchema }).strict();

export async function POST(req: NextRequest) {
  const started = Date.now();
  let status = 503;
  try {
    const userId = await identity(req);
    const input = payload.parse(await body(req, 8192));
    const db = database();
    const current = await db.from('nivo_journeys').select('revision').eq('user_id', userId).maybeSingle();
    if (current.error) throw new HttpError(503, 'Pilihan belum tersimpan. Silakan coba lagi.');
    const result = await db.rpc('nivo_update_profile', { p_user: userId, p_profile: { motivations: input.motivations }, p_expected: current.data?.revision || 0, p_own_reason: null, p_timezone: null });
    if (result.error || !result.data?.success) throw new HttpError(result.data?.error === 'conflict' ? 409 : 503, 'Pilihan belum tersimpan. Muat ulang dan coba lagi.');
    status = 200;
    return json({ success: true });
  } catch (error) {
    const response = failure(error);
    status = response.status;
    return response;
  } finally {
    recordOperation('profile.motivations', status, Date.now() - started);
  }
}
