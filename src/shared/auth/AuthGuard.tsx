'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthStorage } from '@/lib/auth-storage';
import { isAuthEntryRoute, isProtectedRoute, shouldCheckJourneySetup } from './routes';
import { signInReturnPath } from './return-path';

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationError, setVerificationError] = useState('');
  const [redirectingToSetup, setRedirectingToSetup] = useState(false);

  useEffect(() => {
    let disposed = false;
    let version = 0;
    let unsubscribe: (() => void) | undefined;
    let authTimer: ReturnType<typeof setTimeout> | undefined;
    setIsLoading(true);
    const checkAuth = async () => {
      const current = ++version;
      const active = () => !disposed && current === version;
      setVerificationError('');
      setRedirectingToSetup(false);
      let checkingSetup = false;
      try {
        const { supabase } = await import('@/lib/supabase');
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (!active()) return;
        if (sessionError) throw sessionError;
        const expiry = session ? AuthStorage.expiresAt(session) : null;
        if (session && expiry !== null && Date.now() >= expiry) {
          setIsAuthenticated(false);
          setIsLoading(true);
          const { expireBrowserSession } = await import('./expire-session');
          await expireBrowserSession();
          if (!active()) return;
          setIsAuthenticated(false);
          if (isProtectedRoute(pathname))
            router.replace(
              '/signin?next=' +
                encodeURIComponent(signInReturnPath(pathname + window.location.search)),
            );
          setIsLoading(false);
          return;
        }
        // A persisted token or user ID alone never authorizes this route.
        const {
          data: { user },
          error,
        } = session ? await supabase.auth.getUser() : { data: { user: null }, error: null };
        if (!active()) return;
        if (
          session &&
          error &&
          (error.name === 'AuthRetryableFetchError' ||
            (error.status ?? 0) >= 500 ||
            error.status === 0)
        )
          throw error;
        const authenticated = !!user && !error && !!session && user.id === session.user.id;
        if (authenticated && session) AuthStorage.saveSupabaseSession(session);
        else if (AuthStorage.getSession()) AuthStorage.clearSession({ preserveDrafts: true });
        if (authenticated && shouldCheckJourneySetup(pathname)) {
          checkingSetup = true;
          const { authenticatedRequest } = await import('@/shared/api/client');
          const setup = await authenticatedRequest<{ required: boolean }>('/api/onboarding');
          if (!active()) return;
          if (setup.required) {
            const next = isAuthEntryRoute(pathname)
              ? signInReturnPath(new URLSearchParams(window.location.search).get('next'))
              : signInReturnPath(pathname + window.location.search + window.location.hash);
            setIsAuthenticated(true);
            setRedirectingToSetup(true);
            router.replace('/onboarding?next=' + encodeURIComponent(next));
            setIsLoading(false);
            return;
          }
        }
        setIsAuthenticated(authenticated);
        if (isProtectedRoute(pathname) && !authenticated) {
          router.replace(
            '/signin?next=' +
              encodeURIComponent(signInReturnPath(pathname + window.location.search)),
          );
        } else if (authenticated && isAuthEntryRoute(pathname)) {
          router.replace(signInReturnPath(new URLSearchParams(window.location.search).get('next')));
        }
        setIsLoading(false);
      } catch {
        if (!active()) return;
        setVerificationError(
          checkingSetup
            ? 'Rencana awal belum dapat diperiksa. Sesi dan isian sementara tetap tersimpan; coba lagi saat koneksi tersedia.'
            : 'Sesi belum dapat diverifikasi. Isian sementara tetap tersimpan; coba lagi saat koneksi tersedia.',
        );
        setIsLoading(false);
      }
    };
    const queueCheck = () => {
      version++;
      clearTimeout(authTimer);
      authTimer = setTimeout(() => {
        if (!disposed) void checkAuth();
      }, 0);
    };
    const init = async () => {
      const { supabase } = await import('@/lib/supabase');
      if (disposed) return;
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(queueCheck);
      unsubscribe = () => subscription.unsubscribe();
      await checkAuth();
    };
    void init().catch(() => {
      if (!disposed) {
        setVerificationError('Sesi belum dapat diverifikasi. Coba muat kembali.');
        setIsLoading(false);
      }
    });
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        ['supabase.auth.token', 'userId', 'lastLoginAt', 'nivo.auth.session-id'].includes(event.key)
      )
        queueCheck();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') queueCheck();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('online', queueCheck);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      version++;
      unsubscribe?.();
      clearTimeout(authTimer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', queueCheck);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname, router]);

  return { isAuthenticated, isLoading, verificationError, redirectingToSetup };
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, verificationError, redirectingToSetup } = useAuth();
  const pathname = usePathname();
  if (verificationError)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div role="alert" className="nivo-glass nivo-glass-warm nivo-error-card nivo-stack">
          <p>{verificationError}</p>
          <button className="nivo-action" onClick={() => window.location.reload()}>
            Coba verifikasi lagi
          </button>
        </div>
      </div>
    );
  const redirecting =
    redirectingToSetup ||
    (!isAuthenticated && isProtectedRoute(pathname)) ||
    (isAuthenticated && isAuthEntryRoute(pathname));
  if (isLoading || redirecting)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="nivo-glass nivo-error-card">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Memverifikasi sesi…' : 'Mengalihkan…'}
          </p>
        </div>
      </div>
    );
  return <>{children}</>;
}
