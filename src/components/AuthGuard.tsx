'use client'

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
    const checkAuth = () => {
      // Get auth token from localStorage
      const token = localStorage.getItem('userToken');
      const userId = localStorage.getItem('userId');
      const lastLoginAt = localStorage.getItem('lastLoginAt');
      const sessionMaxAgeDays = Number(localStorage.getItem('sessionMaxAgeDays') || 0);

      // Check if user has valid session
      const hasValidToken = Boolean(token && userId);
      
      // Check if session is expired
      let isSessionExpired = false;
      if (lastLoginAt && sessionMaxAgeDays > 0) {
        const diffMs = Date.now() - Number(lastLoginAt);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        isSessionExpired = diffDays > sessionMaxAgeDays;
      }

      const authenticated = hasValidToken && !isSessionExpired;
      setIsAuthenticated(authenticated);

      // Determine if current route is protected
      const isProtectedRoute = PROTECTED_ROUTES.some(route => 
        pathname === route || pathname?.startsWith(`${route}/`)
      );
      
      const isPublicRoute = PUBLIC_ROUTES.some(route => 
        pathname === route || pathname?.startsWith(`${route}/`)
      );

      // Skip redirect logic for auth callback (let it handle its own redirects)
      if (pathname?.startsWith('/auth/callback')) {
        setIsLoading(false);
        return;
      }

      // Redirect logic
      if (isProtectedRoute && !authenticated) {
        // User is not authenticated but trying to access protected route
        console.log('🔒 Access denied: Authentication required');
        console.log('🔍 Debug - pathname:', pathname);
        console.log('🔍 Debug - token:', token ? 'EXISTS' : 'MISSING');
        console.log('🔍 Debug - userId:', userId ? 'EXISTS' : 'MISSING');
        console.log('🔍 Debug - lastLoginAt:', lastLoginAt);
        console.log('🔍 Debug - sessionMaxAgeDays:', sessionMaxAgeDays);
        console.log('🔍 Debug - isSessionExpired:', isSessionExpired);
        
        // Clear any stale data
        localStorage.removeItem('userToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('lastLoginAt');
        
        // Redirect to signin
        router.replace('/signin');
      } else if (authenticated && pathname === '/signin') {
        // User is authenticated but on signin page, redirect to home
        router.replace('/home');
      } else if (pathname === '/' && authenticated) {
        // Redirect root to home if authenticated
        router.replace('/home');
      } else if (pathname === '/' && !authenticated) {
        // Redirect root to welcome if not authenticated
        router.replace('/welcome');
      }

      setIsLoading(false);
    };

    checkAuth();

    // Re-check auth on storage changes (e.g., logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userToken' || e.key === 'userId') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
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
