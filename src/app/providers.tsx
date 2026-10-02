'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { useState, useEffect } from "react"
import React from "react"
import { MotionConfig } from "framer-motion"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  // Setup Supabase auth listener and restore session
  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    const initAuth = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { AuthStorage } = await import('@/lib/auth-storage');
      if (disposed) return;
      
      // Get current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (disposed) return;
      
      if (session) {
        // Sync Supabase session to our custom AuthStorage
        AuthStorage.saveSession({
          userToken: session.access_token,
          userId: session.user.id,
          userEmail: session.user.email || '',
          lastLoginAt: Date.now(),
          sessionMaxAgeDays: 30,
          loginMethod: session.user.app_metadata.provider === 'google' ? 'oauth' : 'password',
        });
      }
      
      // Listen for auth changes (login, logout, token refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (disposed) return;
        
        if (event === 'SIGNED_IN' && session) {
          // User signed in - save to AuthStorage
          AuthStorage.saveSession({
            userToken: session.access_token,
            userId: session.user.id,
            userEmail: session.user.email || '',
            lastLoginAt: Date.now(),
            sessionMaxAgeDays: 30,
            loginMethod: session.user.app_metadata.provider === 'google' ? 'oauth' : 'password',
          });
        } else if (event === 'SIGNED_OUT') {
          // User signed out - clear AuthStorage
          AuthStorage.clearSession();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Token refreshed - update AuthStorage
          AuthStorage.saveSession({
            userToken: session.access_token,
            userId: session.user.id,
            userEmail: session.user.email || '',
            lastLoginAt: Date.now(),
            sessionMaxAgeDays: 30,
            loginMethod: session.user.app_metadata.provider === 'google' ? 'oauth' : 'password',
          });
          AuthStorage.updateLastLogin();
        }
      });
      
      unsubscribe = () => subscription.unsubscribe();
    };

    void initAuth().catch(() => { /* AuthGuard handles session availability. */ });
    return () => { disposed = true; unsubscribe?.(); };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider><MotionConfig reducedMotion="user">
        {children}
        <Toaster />
        <Sonner />
      </MotionConfig></TooltipProvider>
    </QueryClientProvider>
  )
}
