'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { useState, useEffect } from 'react';
import React from 'react';
import { MotionConfig } from 'framer-motion';
import PageTransition from '@/shared/layout/PageTransition';
import ServiceWorkerRegistration from '@/shared/push/ServiceWorkerRegistration';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const initAuth = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { AuthStorage } = await import('@/lib/auth-storage');
      const { expireBrowserSession } = await import('@/shared/auth/expire-session');
      if (disposed) return;
      const expireWhenDue = () => {
        if (disposed) return;
        const expiry = AuthStorage.expiresAt();
        if (expiry === null) return;
        if (expiry > Date.now()) {
          expiryTimer = setTimeout(expireWhenDue, expiry - Date.now());
        } else {
          void expireBrowserSession().catch(() => {
            /* Local cleanup still runs. */
          });
        }
      };
      const syncSession = (session: import('@supabase/supabase-js').Session) => {
        AuthStorage.saveSupabaseSession(session);
        clearTimeout(expiryTimer);
        const expiresAt = AuthStorage.expiresAt(session);
        if (expiresAt !== null)
          expiryTimer = setTimeout(expireWhenDue, Math.max(0, expiresAt - Date.now()));
      };
      // Keep the callback synchronous; Supabase holds its auth lock while notifying.
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (disposed) return;
        if (event === 'SIGNED_OUT') {
          clearTimeout(expiryTimer);
          AuthStorage.clearSession({ preserveDrafts: true });
        } else if (session) syncSession(session);
      });
      unsubscribe = () => subscription.unsubscribe();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!disposed && session) syncSession(session);
    };
    void initAuth().catch(() => {
      /* AuthGuard handles session availability. */
    });
    return () => {
      disposed = true;
      unsubscribe?.();
      clearTimeout(expiryTimer);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: 'easeOut' }}>
          <ServiceWorkerRegistration />
          <PageTransition>{children}</PageTransition>
          <Toaster />
          <Sonner />
        </MotionConfig>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
