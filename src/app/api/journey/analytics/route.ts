import { NextRequest } from 'next/server';
import { failure, json } from '@/shared/server/http';
import { analyticsDatabase, analyticsDays, analyticsTimezone, readAnalytics } from '@/features/charts/server';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const days = analyticsDays(req), { db, user } = await analyticsDatabase(req);
    const timezone = await analyticsTimezone(db, user.id);
    return json(await readAnalytics(db, days, timezone));
  } catch (error) { return failure(error); }
}
