import { NextRequest } from 'next/server';
import { database, failure, HttpError, identity, json } from '@/shared/server/http';
import { journeyState } from '@/shared/server/journey-state';
import { needsJourneySetup } from '@/shared/journey/onboarding';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await identity(req),
      db = database();
    const { data, error } = await db
      .from('nivo_journeys')
      .select('document')
      .eq('user_id', user)
      .maybeSingle();
    if (error) throw new HttpError(503, 'Rencana awal belum dapat diperiksa. Coba lagi.');
    const { state } = await journeyState(db, user, data?.document);
    return json({ required: needsJourneySetup(state) });
  } catch (error) {
    return failure(error);
  }
}
