import { NextRequest } from 'next/server';
import { database, failure, HttpError, identity, json } from '@/shared/server/http';

// Read-only visibility into existing records. Never guesses quit dates or baselines.
export async function GET(req: NextRequest) {
  try {
    const user = await identity(req);
    const raw = req.nextUrl.searchParams.get('offset') || '0';
    if (!/^\d{1,6}$/.test(raw) || Number(raw) > 100000) throw new HttpError(400, 'Halaman tidak valid.');
    const offset = Number(raw);
    const { data, error } = await database().from('daily_consumption')
      .select('id,date,cigarette_count,money_spent').eq('user_id', user)
      .order('date', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 50);
    if (error) throw new HttpError(503, 'Catatan terdahulu belum dapat dimuat. Silakan coba lagi.');
    return json({ records: (data || []).slice(0, 50), nextOffset: data?.length > 50 ? offset + 50 : null });
  } catch (error) { return failure(error); }
}
