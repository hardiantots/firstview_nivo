export const protectedRoutes = [
  '/onboarding',
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
] as const;

export const authEntryRoutes = ['/', '/welcome', '/signin', '/signup'] as const;

export function isProtectedRoute(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isAuthEntryRoute(pathname: string) {
  return authEntryRoutes.some((route) => route === pathname);
}

// Setup must never prevent someone from reaching immediate support.
export function shouldCheckJourneySetup(pathname: string) {
  return (
    (isProtectedRoute(pathname) ||
      isAuthEntryRoute(pathname) ||
      /^\/buddy\/[A-Za-z0-9_-]{43}$/.test(pathname)) &&
    !['/onboarding', '/craving-support', '/contact-professional', '/breathing-exercise'].some(
      (route) => pathname === route || pathname.startsWith(route + '/'),
    )
  );
}
