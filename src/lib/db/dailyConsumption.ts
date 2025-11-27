import { supabase } from "@/lib/supabase";

export type DailyConsumptionRow = {
  id: string;
  user_id: string;
  date: string;
  cigarette_count: number;
  money_spent: number | null;
};

export const fetchDailyConsumptionLogs = async (userId: string) => {
  const { data, error } = await supabase
    .from("daily_consumption")
    .select("id, user_id, date, cigarette_count, money_spent")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) throw error;
  return (data || []) as DailyConsumptionRow[];
};
