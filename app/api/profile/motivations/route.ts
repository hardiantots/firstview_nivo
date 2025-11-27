import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key to bypass RLS in server-side API route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: NextRequest) {
  try {
    const { userId, motivations } = await req.json();

    if (!userId || !Array.isArray(motivations)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_profile")
      .upsert(
        {
          user_id: userId,
          motivations,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Failed to save motivations", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error in motivations API", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
