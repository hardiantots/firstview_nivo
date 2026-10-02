import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { HttpError, verifiedUser } from '@/shared/server/http';
import { timezoneSchema } from '@/shared/journey/domain';
import { analyticsDaysSchema, AnalyticsData, dailyPointSchema, hourPointSchema, summarySchema, triggerPointSchema } from './data';

/** The user's JWT is forwarded so invoker RPCs and read-only views retain RLS. */
export async function analyticsDatabase(req: NextRequest) {
  const user = await verifiedUser(req);
  const token = req.headers.get('authorization')!.slice(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new HttpError(503, 'Layanan belum dikonfigurasi.');
  const db = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }) },
  });
  return { db, user };
}

export function analyticsDays(req: NextRequest, allowFormat = false) {
  const params = req.nextUrl.searchParams;
  for (const key of params.keys()) {
    if (key !== 'days' && !(allowFormat && key === 'format')) throw new HttpError(400, 'Parameter ekspor atau grafik tidak valid.');
    if (params.getAll(key).length !== 1) throw new HttpError(400, 'Pilih satu rentang waktu.');
  }
  return analyticsDaysSchema.parse(params.get('days') ?? undefined);
}

export async function analyticsTimezone(db: Awaited<ReturnType<typeof analyticsDatabase>>['db'], userId: string) {
  const { data, error } = await db.from('journey_settings').select('timezone').eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError(503, 'Data grafik belum tersedia. Periksa migrasi database lalu coba lagi.');
  const parsed = timezoneSchema.safeParse(data?.timezone ?? 'Asia/Makassar');
  if (!parsed.success) throw new HttpError(503, 'Zona waktu perjalanan belum dapat dibaca.');
  return parsed.data;
}

export async function readAnalytics(db: Awaited<ReturnType<typeof analyticsDatabase>>['db'], days: number, timezone: string): Promise<AnalyticsData> {
  const responses = await Promise.all([
    db.rpc('daily_series', { p_days: days, p_tz: timezone }),
    db.rpc('craving_by_hour', { p_days: days, p_tz: timezone }),
    db.rpc('craving_by_trigger', { p_days: days }),
    db.rpc('journey_summary', { p_tz: timezone }),
  ]);
  if (responses.some(response => response.error)) throw new HttpError(503, 'Grafik belum dapat dimuat. Periksa koneksi dan migrasi database, lalu coba lagi.');
  const parsed = z.object({ series: z.array(dailyPointSchema).max(90), hours: z.array(hourPointSchema).max(24), triggers: z.array(triggerPointSchema).max(8), summary: summarySchema }).safeParse({
    series: responses[0].data, hours: responses[1].data ?? [], triggers: responses[2].data ?? [], summary: responses[3].data?.[0],
  });
  if (!parsed.success || parsed.data.series.length !== days) throw new HttpError(503, 'Format data grafik belum sesuai. Periksa migrasi database.');
  return { days, timezone, ...parsed.data } as AnalyticsData;
}
