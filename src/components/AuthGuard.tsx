'use client'

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthStorage } from '@/lib/auth-storage';

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/home',
  '/tracker',
  '/craving-support',
  '/ai-result',
  '/pencapaian',
  '/contact-professional',
  '/craving-history',
  '/profile-settings',
  '/notifications',
  '/community',
  '/distractions',
  '/breathing-exercise',
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/otp-verification',
  '/password-reset-success',
  '/welcome',
  '/journey-start',
  '/time-selection',
  '/motivation',
  '/set-quit-date-past',
  '/auth/callback', // OAuth callback route
];

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check both localStorage and Supabase session
      const localAuth = AuthStorage.isSessionValid();
      
      // Also check Supabase session
      let supabaseAuth = false;
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        supabaseAuth = !!session;
        
        // If Supabase has session but localStorage doesn't, sync them
        if (supabaseAuth && !localAuth && session) {
          AuthStorage.saveSession({
            userToken: session.access_token,
            userId: session.user.id,
            userEmail: session.user.email || '',
            lastLoginAt: Date.now(),
            sessionMaxAgeDays: 30,
            loginMethod: session.user.app_metadata.provider === 'google' ? 'oauth' : 'password',
          });
        }
      } catch (e) {
        console.error('Error checking Supabase session:', e);
      }
      
      const authenticated = localAuth || supabaseAuth;
      setIsAuthenticated(authenticated);

      const isProtectedRoute = PROTECTED_ROUTES.some(route => 
        pathname === route || pathname?.startsWith(`${route}/`)
      );

      if (pathname?.startsWith('/auth/callback')) {
        setIsLoading(false);
        return;
      }

      if (isProtectedRoute && !authenticated) {
        AuthStorage.clearSession();
        router.replace('/signin');
      } else if (authenticated && pathname === '/signin') {
        router.replace('/home');
      } else if (pathname === '/' && authenticated) {
        router.replace('/home');
      } else if (pathname === '/' && !authenticated) {
        router.replace('/welcome');
      }

      setIsLoading(false);
    };

    checkAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userToken' || e.key === 'userId') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [pathname, router]);

  return { isAuthenticated, isLoading };
}

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  // For protected routes, only render if authenticated
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (isProtectedRoute && !isAuthenticated) {
    // Will be redirected by useAuth hook
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Mengalihkan...</p>
        </div>
      </div>
    );
  }

  // Render children for authenticated users or public routes
  return <>{children}</>;
}
