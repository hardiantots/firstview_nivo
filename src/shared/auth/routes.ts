export const protectedRoutes = [
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
