import { supabase } from '@/lib/supabase';
import { AuthStorage, SUPABASE_AUTH_STORAGE_KEY } from '@/lib/auth-storage';

let pending: Promise<void> | null = null;

export function expireBrowserSession(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    try {
      // Expiry on this browser must not sign out other devices.
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // A network failure must not keep an expired local login active.
    } finally {
      try {
        localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
      } catch {
        /* Browser storage may be unavailable. */
      }
      AuthStorage.clearSession({ preserveDrafts: true });
    }
  })().finally(() => {
    pending = null;
  });
  return pending;
}
