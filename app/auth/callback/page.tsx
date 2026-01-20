"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader } from "lucide-react";

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleOAuthCallback = async () => {
      // Lazy import to avoid SSR issues
      const { supabase } = await import("@/lib/supabase");
      const { ensureUserProfile } = await import("@/lib/db/userProfile");
      const { AuthStorage } = await import("@/lib/auth-storage");
      
      try {
        // Check for error in URL params (Supabase returns errors this way)
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setTimeout(() => router.replace('/signin'), 3000);
          return;
        }
        const code = searchParams.get('code');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError);
            setError('Gagal memproses login. Silakan coba lagi.');
            setTimeout(() => router.replace('/signin'), 3000);
            return;
          }
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setTimeout(() => router.replace('/signin'), 3000);
          return;
        }

        const session = sessionData.session;
        if (!session) {
          router.replace('/signin');
          return;
        }

        const user = session.user;

        AuthStorage.saveSession({
          userToken: session.access_token,
          userId: user.id,
          userEmail: user.email || "",
          lastLoginAt: Date.now(),
          sessionMaxAgeDays: 30,
          loginMethod: user.app_metadata.provider === 'google' ? 'oauth' : 'password',
        });

        await ensureUserProfile({
          userId: user.id,
          email: user.email,
          fullName: (user.user_metadata?.full_name as string) || null,
          phoneNumber: (user.user_metadata?.phone as string) || null,
        });

        const { data: journeyData, error: journeyError } = await supabase
          .from("smoke_free_journey")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (journeyError) {
          console.error("Journey query error:", journeyError);
        }

        if (journeyData?.user_id) {
          router.replace("/home");
        } else {
          router.replace("/journey-start");
        }
        
      } catch (err: any) {
        console.error('Unexpected error in callback:', err);
        setError(err.message || 'Terjadi kesalahan');
        setTimeout(() => router.replace('/signin'), 3000);
      }
    };

    handleOAuthCallback();
  }, [router, searchParams, mounted]);

  // Show loading during SSR
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-semibold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-red-600 mb-2">Gagal Sign In</h1>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500 mt-2">Mengarahkan kembali ke halaman sign in...</p>
          </>
        ) : (
          <>
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-xl font-semibold">Menyelesaikan proses sign in...</h1>
            <p className="text-gray-600 mt-2">Silakan tunggu sebentar</p>
          </>
        )}
      </div>
    </div>
  );
}
