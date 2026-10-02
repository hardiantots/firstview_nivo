import { isProtectedRoute } from './routes';

export function signInReturnPath(next: string | null) {
  if (!next || next.length > 2048 || !next.startsWith('/') || /[\\\u0000-\u001f]/.test(next))
    return '/home';
  try {
    const parsed = new URL(next, 'https://nivo.invalid');
    if (parsed.origin !== 'https://nivo.invalid') return '/home';
    return isProtectedRoute(parsed.pathname) || /^\/buddy\/[A-Za-z0-9_-]{43}$/.test(next)
      ? parsed.pathname + parsed.search + parsed.hash
      : '/home';
  } catch {
    return '/home';
  }
}
