const PUSH_HOSTS = new Set(['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']);

export function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    const allowedHost = PUSH_HOSTS.has(url.hostname) || /^wns2-[a-z0-9-]{1,40}\.notify\.windows\.com$/.test(url.hostname);
    return value.length <= 2048 && url.protocol === 'https:' && !url.username && !url.password && !url.hash &&
      (!url.port || url.port === '443') && url.pathname.length > 1 && allowedHost;
  } catch { return false; }
}

export function urlBase64Bytes(value: string) {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) throw new Error('invalid_key');
  const raw = value.replace(/=+$/, '');
  if (value !== raw && value.length % 4 !== 0) throw new Error('invalid_key');
  const bytes = atob(raw.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - raw.length % 4) % 4));
  return Uint8Array.from(bytes, character => character.charCodeAt(0));
}

export function validPushKey(value: string, kind: 'public' | 'private' | 'auth') {
  try {
    const bytes = urlBase64Bytes(value);
    return kind === 'public' ? bytes.length === 65 && bytes[0] === 4 : bytes.length === (kind === 'private' ? 32 : 16);
  } catch { return false; }
}

export function validVapidSubject(value: string) {
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && url.hostname !== 'localhost' && url.hostname.includes('.'); }
  catch { return false; }
}
