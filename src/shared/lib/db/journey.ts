import { errorMessage } from '../errors';
import { supabase } from '@/lib/supabase';

export type UserPhase = 'PRE_QUIT' | 'POST_QUIT';

export interface JourneyStatus {
  userId: string;
  quitDate: string | null;
  phase: UserPhase;
  targetDays?: number | null;
}

export async function upsertJourneyStatus(
  userId: string,
  quitDate: string | null,
  phase: UserPhase,
  targetDays?: number | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('smoke_free_journey').upsert(
      {
        user_id: userId,
        // start_date akan kita gunakan sebagai quitDate/journey start
        start_date: quitDate,
        status: phase, // keep for compatibility
        phase: phase, // new explicit phase column
        target_days: targetDays ?? null,
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      console.error('upsertJourneyStatus error', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: unknown) {
    console.error('upsertJourneyStatus exception', e);
    return { success: false, error: errorMessage(e) };
  }
}

export async function fetchJourneyStatus(userId: string): Promise<JourneyStatus | null> {
  try {
    const { data, error } = await supabase
      .from('smoke_free_journey')
      .select('user_id, start_date, status, phase, target_days')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('fetchJourneyStatus error', error.message);
      return null;
    }

    if (!data) return null;

    // Prefer new phase column, fallback to status for backward compatibility
    const currentPhase = (data.phase || data.status) as UserPhase;

    return {
      userId: data.user_id,
      quitDate: data.start_date,
      phase: currentPhase ?? 'PRE_QUIT',
      targetDays: data.target_days ?? null,
    };
  } catch (e: unknown) {
    console.error('fetchJourneyStatus exception', e);
    return null;
  }
}
