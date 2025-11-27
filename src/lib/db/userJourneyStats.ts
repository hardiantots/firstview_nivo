import { supabase } from "@/lib/supabase";

/**
 * Fetch user journey stats from database (replaces localStorage countdownDays, streakDays, homeMoneySaved)
 */
export async function fetchUserJourneyStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_journey_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return {
      phase: data.phase as "PRE_QUIT" | "POST_QUIT",
      countdownDays: data.countdown_days || 0,
      streakDays: data.streak_days || 0,
      moneySaved: data.calculated_money_saved || 0,
      targetDays: data.target_days || 0,
      startDate: data.start_date,
    };
  } catch (error) {
    console.error("Failed to fetch user journey stats", error);
    return null;
  }
}

/**
 * Update total money saved in user_stats
 */
export async function updateMoneySaved(userId: string, amount: number) {
  try {
    const { error } = await supabase
      .from("user_stats")
      .upsert(
        {
          user_id: userId,
          total_money_saved: amount,
        },
        { onConflict: "user_id" }
      );

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Failed to update money saved", error);
    return { success: false, error };
  }
}

/**
 * Mark achievement flags in user_stats
 */
export async function markAchievementFlag(
  userId: string,
  flag: "has_rejected_craving_once" | "has_productive_replacement",
  value: boolean = true
) {
  try {
    const { error } = await supabase
      .from("user_stats")
      .update({ [flag]: value })
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error(`Failed to mark ${flag}`, error);
    return { success: false, error };
  }
}

/**
 * Save AI suggestion to database (replaces localStorage aiResultData)
 */
export async function saveAISuggestion(payload: {
  userId: string;
  suggestionType: string;
  content: string;
  intensity?: number;
  triggers?: string[];
}) {
  try {
    const { data, error } = await supabase
      .from("ai_suggestions")
      .insert({
        user_id: payload.userId,
        suggestion_type: payload.suggestionType,
        content: payload.content,
        intensity: payload.intensity,
        triggers: payload.triggers,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Failed to save AI suggestion", error);
    return { success: false, error };
  }
}

/**
 * Fetch recent AI suggestions for user
 */
export async function fetchAISuggestions(userId: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from("ai_suggestions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to fetch AI suggestions", error);
    return [];
  }
}

/**
 * Mark AI suggestion as read
 */
export async function markAISuggestionRead(suggestionId: string) {
  try {
    const { error } = await supabase
      .from("ai_suggestions")
      .update({ is_read: true })
      .eq("id", suggestionId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Failed to mark AI suggestion as read", error);
    return { success: false, error };
  }
}

/**
 * Provide feedback on AI suggestion
 */
export async function feedbackAISuggestion(suggestionId: string, isHelpful: boolean) {
  try {
    const { error } = await supabase
      .from("ai_suggestions")
      .update({ is_helpful: isHelpful })
      .eq("id", suggestionId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Failed to submit AI suggestion feedback", error);
    return { success: false, error };
  }
}

/**
 * Get user stats including achievement flags
 */
export async function getUserStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    
    return data || null;
  } catch (error) {
    console.error("Failed to fetch user stats", error);
    return null;
  }
}
