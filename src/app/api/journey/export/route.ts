import { NextRequest } from 'next/server';
import { z } from 'zod';
import { dateBefore, localDate } from '@/shared/journey/domain';
import { failure, HttpError } from '@/shared/server/http';
import { analyticsDatabase, analyticsDays, analyticsTimezone, readAnalytics } from '@/features/charts/server';
import { ExportCraving, ExportDaily, exportCravingSchema, exportCsv, exportDailySchema, exportPdf } from '@/features/charts/export';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const days = analyticsDays(req, true), format = z.enum(['csv', 'pdf']).parse(req.nextUrl.searchParams.get('format'));
    const { db, user } = await analyticsDatabase(req), timezone = await analyticsTimezone(db, user.id);
    const end = localDate(new Date(), timezone), start = dateBefore(end, days - 1);
    const dailyResponse = await db.from('daily_logs').select('log_date,cigarettes,reported,baseline_cigs_per_day,price_per_cigarette').eq('user_id', user.id).gte('log_date', start).lte('log_date', end).order('log_date').limit(91);
    if (dailyResponse.error) throw new HttpError(503, 'Catatan belum dapat diekspor. Periksa koneksi dan migrasi database.');
    const parsedDaily = z.array(exportDailySchema).max(90).safeParse(dailyResponse.data ?? []);
    if (!parsedDaily.success) throw new HttpError(503, 'Format catatan belum sesuai untuk ekspor.');
    let content: string | Uint8Array;
    if (format === 'csv') {
      // Fetch one extra row so Supabase's row cap cannot silently truncate the export.
      const cravings: ExportCraving[] = [];
      const earliestUtc = new Date(Date.parse(start + 'T00:00:00Z') - 86400000).toISOString();
      const latestUtc = new Date(Date.parse(end + 'T00:00:00Z') + 2 * 86400000).toISOString();
      for (let offset = 0; offset <= 5000; offset += 500) {
        const response = await db.from('craving_events').select('id,occurred_at,intensity,trigger,outcome,duration_sec,note,source').eq('user_id', user.id).gte('occurred_at', earliestUtc).lt('occurred_at', latestUtc).order('occurred_at').order('id').range(offset, offset + 499);
        if (response.error) throw new HttpError(503, 'Kejadian craving belum dapat diekspor.');
        const parsed = z.array(exportCravingSchema).max(500).safeParse(response.data ?? []);
        if (!parsed.success) throw new HttpError(503, 'Format craving belum sesuai untuk ekspor.');
        cravings.push(...(parsed.data as ExportCraving[]).filter(item => { const day = localDate(item.occurred_at, timezone); return day >= start && day <= end && new Date(item.occurred_at).getTime() <= Date.now(); }));
        if (cravings.length > 5000 || offset === 5000 && parsed.data.length === 500) throw new HttpError(413, 'Terlalu banyak kejadian untuk satu ekspor. Pilih periode yang lebih pendek.');
        if (parsed.data.length < 500) break;
      }
      content = exportCsv(parsedDaily.data as ExportDaily[], cravings, timezone);
    } else {
      const analytics = await readAnalytics(db, days, timezone);
      content = exportPdf({ daily: parsedDaily.data as ExportDaily[], hours: analytics.hours, start, end, timezone });
    }
    return new Response(content as BodyInit, { headers: {
      'Content-Type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/pdf',
      'Content-Disposition': `attachment; filename="nivo-${start}-${end}.${format}"`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) { return failure(error); }
}
