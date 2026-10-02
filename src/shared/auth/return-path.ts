export function signInReturnPath(next: string | null) {
  return next && /^\/buddy\/[A-Za-z0-9_-]{43}$/.test(next) ? next : '/home';
}
