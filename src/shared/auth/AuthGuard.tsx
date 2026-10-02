'use client'

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthStorage } from '@/lib/auth-storage';
import { signInReturnPath } from '@/shared/auth/return-path';

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
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      setVerificationError('');
      // Browser cache is not an authentication authority.
      let supabaseAuth = false;
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user }, error } = session ? await supabase.auth.getUser() : { data: { user: null }, error: null };
        if (session && error && (error.name === 'AuthRetryableFetchError' || error.status >= 500 || error.status === 0)) {
          setVerificationError('Sesi belum dapat diverifikasi. Isian sementara tetap tersimpan; coba lagi saat koneksi tersedia.');
          setIsLoading(false);
          return;
        }
        supabaseAuth = !!user && !error;
        
        // Refresh identity even when an older browser cache claims to be valid.
        if (supabaseAuth && session) {
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
        setVerificationError('Sesi belum dapat diverifikasi. Coba lagi saat koneksi tersedia.');
        setIsLoading(false);
        return;
      }
      
      const authenticated = supabaseAuth;
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
        router.replace(signInReturnPath(new URLSearchParams(window.location.search).get('next')));
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
    window.addEventListener('online', checkAuth);
    return () => { window.removeEventListener('storage', handleStorageChange); window.removeEventListener('online', checkAuth); };
  }, [pathname, router]);

  return { isAuthenticated, isLoading, verificationError };
}

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, verificationError } = useAuth();
  const pathname = usePathname();

  if (verificationError) return <div className="min-h-screen flex items-center justify-center bg-background p-6"><div role="alert" className="nivo-glass nivo-glass-warm nivo-error-card nivo-stack"><p>{verificationError}</p><button className="nivo-action" onClick={() => window.location.reload()}>Coba verifikasi lagi</button></div></div>;

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="nivo-glass nivo-error-card">
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
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="nivo-glass nivo-error-card">
          <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Mengalihkan...</p>
        </div>
      </div>
    );
  }

  // Render children for authenticated users or public routes
  return <>{children}</>;
}
