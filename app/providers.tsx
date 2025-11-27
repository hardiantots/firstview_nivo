'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { useState, useEffect } from "react"
import React from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  // Restore Supabase session from localStorage on app load
  useEffect(() => {
    const restoreSession = async () => {
      const userToken = localStorage.getItem('userToken');
      const userId = localStorage.getItem('userId');
      const lastLoginAt = localStorage.getItem('lastLoginAt');
      const sessionMaxAgeDays = Number(localStorage.getItem('sessionMaxAgeDays') || 30);
      
      // Check if session is still valid
      if (userToken && userId && lastLoginAt) {
        const diffMs = Date.now() - Number(lastLoginAt);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (diffDays <= sessionMaxAgeDays) {
          // Session is valid - verify with Supabase
          try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error || !session) {
              // Session expired or invalid - clear localStorage
              localStorage.removeItem('userToken');
              localStorage.removeItem('userId');
              localStorage.removeItem('userEmail');
              localStorage.removeItem('lastLoginAt');
            }
          } catch (e) {
            // Silent fail - AuthGuard will handle redirect
          }
        } else {
          // Session expired - clear localStorage
          localStorage.removeItem('userToken');
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('lastLoginAt');
        }
      }
    };

    restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
