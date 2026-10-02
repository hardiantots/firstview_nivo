import { supabase } from "@/lib/supabase";

export type CravingLogRow = {
  id: string;
  user_id: string;
  occurred_at: string;
  intensity: number | null;
  trigger: string | null;
  location: string | null;
  mood: string | null;
  situation: string | null;
  coping_action: string | null;
  avoided_smoking: boolean | null;
  notes: string | null;
};

export const createCravingLog = async (payload: {
  userId: string;
  intensity: number;
  location: string;
  situation: string;
  emotions: string[];
}) => {
  const { userId, intensity, location, situation, emotions } = payload;

  const { error } = await supabase.from("craving_logs").insert({
    user_id: userId,
    intensity,
    location,
    situation,
    mood: emotions.join(", "),
    // Requesting help does not establish whether the user smoked.
    avoided_smoking: null,
  });

  if (error) throw error;
};

export const fetchRecentCravingLogs = async (userId: string, limit = 20) => {
  const { data, error } = await supabase
    .from("craving_logs")
    .select("id, user_id, occurred_at, intensity, location, situation, mood")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as CravingLogRow[];
};
