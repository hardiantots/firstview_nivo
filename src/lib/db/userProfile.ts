import { supabase } from "@/lib/supabase";

export const ensureUserProfile = async (params: {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  phoneNumber?: string | null;
  motivations?: string[] | null;
}) => {
  const { userId, email, fullName, phoneNumber, motivations } = params;

  if (!userId) return;

  const { data, error } = await supabase
    .from("user_profile")
    .select("id, full_name, email, phone_number, motivations")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("ensureUserProfile: gagal mengambil user_profile", error);
    return;
  }

  if (!data) {
    await supabase.from("user_profile").insert({
      user_id: userId,
      full_name: fullName || "",
      email: email || "",
      phone_number: phoneNumber || "",
      motivations: motivations || [],
    });
  }
};
