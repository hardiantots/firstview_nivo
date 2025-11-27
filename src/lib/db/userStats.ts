import { supabase } from "../supabase";

export interface UserStats {
  id: string;
  user_id: string;
  total_xp: number;
  rejected_craving_count: number;
  replacement_activity_count: number;
  completed_achievements: any;
  last_reward_xp: number;
  created_at: string;
  updated_at: string;
}

export async function getOrCreateUserStats(userId: string): Promise<UserStats | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user_stats:", error.message);
    return null;
  }

  if (data) return data as UserStats;

  const { data: inserted, error: insertError, status } = await supabase
    .from("user_stats")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (insertError) {
    // Jika sudah ada (409 conflict karena unique user_id), ambil lagi saja
    if (status === 409) {
      const { data: existing, error: fetchError } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching existing user_stats after conflict:", fetchError.message);
        return null;
      }

      return existing as UserStats;
    }

    console.error("Error creating user_stats:", insertError.message);
    return null;
  }

  return inserted as UserStats;
}

export async function updateUserStats(userId: string, patch: Partial<UserStats>): Promise<UserStats | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("user_stats")
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating user_stats:", error.message);
    return null;
  }

  return data as UserStats;
}

export async function incrementXp(userId: string, delta: number): Promise<UserStats | null> {
  if (!userId || !delta) return null;

  const stats = await getOrCreateUserStats(userId);
  if (!stats) return null;

  const newTotalXp = (stats.total_xp || 0) + delta;

  return updateUserStats(userId, { total_xp: newTotalXp });
}

export async function recordCravingRejected(userId: string, xpPerAction = 10): Promise<UserStats | null> {
  const stats = await getOrCreateUserStats(userId);
  if (!stats) return null;

  const patch: Partial<UserStats> = {
    rejected_craving_count: (stats.rejected_craving_count || 0) + 1,
    total_xp: (stats.total_xp || 0) + xpPerAction,
  };

  return updateUserStats(userId, patch);
}

export async function recordReplacementActivity(userId: string, xpPerAction = 10): Promise<UserStats | null> {
  const stats = await getOrCreateUserStats(userId);
  if (!stats) return null;

  const patch: Partial<UserStats> = {
    replacement_activity_count: (stats.replacement_activity_count || 0) + 1,
    total_xp: (stats.total_xp || 0) + xpPerAction,
  };

  return updateUserStats(userId, patch);
}
