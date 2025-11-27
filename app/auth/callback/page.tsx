"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/db/userProfile";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!error && data.session && data.session.user) {
        const user = data.session.user;
        try {
          localStorage.setItem("userToken", data.session.access_token);
          localStorage.setItem("userId", user.id);
          localStorage.setItem("userEmail", user.email || "");
          localStorage.setItem("loginMethod", "google");
          const now = Date.now();
          localStorage.setItem("lastLoginAt", String(now));
          localStorage.setItem("sessionMaxAgeDays", "7");
        } catch {
          // ignore storage errors
        }

        await ensureUserProfile({
          userId: user.id,
          email: user.email,
          fullName: (user.user_metadata?.full_name as string) || null,
          phoneNumber: (user.user_metadata?.phone as string) || null,
        });

        // Check if user already has journey data (sudah pernah onboarding)
        console.log("OAuth callback: checking journey data for userId:", user.id);
        
        try {
          const { data: journeyData, error: journeyError } = await supabase
            .from("smoke_free_journey")
            .select("user_id, phase, start_date")
            .eq("user_id", user.id)
            .maybeSingle();
          
          console.log("Journey query result in callback:", { journeyData, journeyError });
          
          // Jika sudah ada journey data, langsung ke home
          if (journeyData && journeyData.user_id) {
            console.log("User has journey data, redirecting to /home");
            router.replace("/home");
            return;
          } else {
            console.log("No journey data found, redirecting to /journey-start");
          }
        } catch (e) {
          console.error("Error checking journey data in callback:", e);
        }

        router.replace("/journey-start");
      } else {
        router.replace("/signin");
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <h1 className="text-xl font-semibold">Menyelesaikan proses sign in...</h1>
        <p className="text-gray-600 mt-2">Silakan tunggu sebentar</p>
      </div>
    </div>
  );
}
