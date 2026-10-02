import { emptyJourney, journeyActionSchema, JourneyState, normalizeJourney } from '@/shared/journey/domain';
import { database, HttpError } from './http';

// Legacy profile selections are imported once. An explicitly cleared list stays cleared.
export async function journeyState(db: ReturnType<typeof database>, user: string, document?: JourneyState, timezone?: string) {
  const state = document ? normalizeJourney(document) : emptyJourney(timezone);
  if (document && Object.prototype.hasOwnProperty.call(document, 'motivations')) return { state, unresolvedReasons: false };
  const profile = await db.from('user_profile').select('motivations').eq('user_id', user).maybeSingle();
  if (profile.error) throw new HttpError(503, 'Alasan pribadi belum dapat dimuat. Coba lagi.');
  const parsed = journeyActionSchema.safeParse({ type: 'reasons', motivations: profile.data?.motivations ?? [], ownReason: '' });
  if (parsed.success && parsed.data.type === 'reasons') state.motivations = parsed.data.motivations;
  return { state, unresolvedReasons: !parsed.success };
}
