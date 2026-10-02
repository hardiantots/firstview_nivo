import type { Session } from '@supabase/supabase-js';

export const SESSION_MAX_AGE_DAYS = 14;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
export const SUPABASE_AUTH_STORAGE_KEY = 'supabase.auth.token';

/** Session identity is metadata only; authentication is still verified by Supabase. */
function sessionId(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.session_id === 'string' && payload.session_id.length <= 128
      ? payload.session_id
      : null;
  } catch {
    return null;
  }
}

/**
 * Centralized authentication storage management
 * Provides type-safe methods for handling auth tokens and user session data
 */

interface AuthSession {
  userToken: string;
  userId: string;
  userEmail: string;
  lastLoginAt: number;
  sessionMaxAgeDays: number;
  loginMethod: 'password' | 'oauth';
  sessionId: string | null;
}

const AUTH_KEYS = {
  USER_TOKEN: 'userToken',
  USER_ID: 'userId',
  USER_EMAIL: 'userEmail',
  LAST_LOGIN_AT: 'lastLoginAt',
  SESSION_MAX_AGE_DAYS: 'sessionMaxAgeDays',
  LOGIN_METHOD: 'loginMethod',
  SESSION_ID: 'nivo.auth.session-id',
} as const;

export class AuthStorage {
  /**
   * Save complete authentication session
   */
  static saveSession(session: Partial<AuthSession>, options: { newLogin?: boolean } = {}): void {
    try {
      const previous = this.getSession();
      const sameSession =
        previous?.userId === session.userId &&
        (!previous?.sessionId || !session.sessionId || previous.sessionId === session.sessionId);
      const hasTimestamp = localStorage.getItem(AUTH_KEYS.LAST_LOGIN_AT) !== null;
      const startedAt =
        !options.newLogin && sameSession && hasTimestamp
          ? previous!.lastLoginAt
          : (session.lastLoginAt ?? Date.now());
      if (session.userToken) localStorage.setItem(AUTH_KEYS.USER_TOKEN, session.userToken);
      if (session.userId) localStorage.setItem(AUTH_KEYS.USER_ID, session.userId);
      if (session.userEmail) localStorage.setItem(AUTH_KEYS.USER_EMAIL, session.userEmail);
      if (session.loginMethod) localStorage.setItem(AUTH_KEYS.LOGIN_METHOD, session.loginMethod);

      if (session.sessionId) localStorage.setItem(AUTH_KEYS.SESSION_ID, session.sessionId);
      else localStorage.removeItem(AUTH_KEYS.SESSION_ID);
      localStorage.setItem(AUTH_KEYS.LAST_LOGIN_AT, String(startedAt));
      localStorage.setItem(AUTH_KEYS.SESSION_MAX_AGE_DAYS, String(SESSION_MAX_AGE_DAYS));
    } catch (error) {
      console.error('Failed to save auth session:', error);
    }
  }

  static saveSupabaseSession(session: Session, options: { newLogin?: boolean } = {}): void {
    this.saveSession(
      {
        userToken: session.access_token,
        userId: session.user.id,
        userEmail: session.user.email || '',
        loginMethod:
          session.user.app_metadata?.provider === 'google' ||
          session.user.app_metadata?.provider === 'facebook'
            ? 'oauth'
            : 'password',
        sessionId: sessionId(session.access_token),
      },
      options,
    );
  }

  static expiresAt(session?: Pick<Session, 'access_token' | 'user'>): number | null {
    const cached = this.getSession();
    if (!cached || (session && cached.userId !== session.user.id)) return null;
    const currentId = session ? sessionId(session.access_token) : null;
    if (currentId && cached.sessionId && currentId !== cached.sessionId) return null;
    if (
      !Number.isFinite(cached.lastLoginAt) ||
      cached.lastLoginAt <= 0 ||
      cached.lastLoginAt > Date.now()
    )
      return 0;
    return cached.lastLoginAt + SESSION_MAX_AGE_MS;
  }

  /**
   * Get current authentication session
   */
  static getSession(): AuthSession | null {
    try {
      const userToken = localStorage.getItem(AUTH_KEYS.USER_TOKEN);
      const userId = localStorage.getItem(AUTH_KEYS.USER_ID);

      if (!userToken || !userId) {
        return null;
      }

      return {
        userToken,
        userId,
        userEmail: localStorage.getItem(AUTH_KEYS.USER_EMAIL) || '',
        lastLoginAt: Number(localStorage.getItem(AUTH_KEYS.LAST_LOGIN_AT) || 0),
        sessionMaxAgeDays: SESSION_MAX_AGE_DAYS,
        loginMethod:
          (localStorage.getItem(AUTH_KEYS.LOGIN_METHOD) as 'password' | 'oauth') || 'password',
        sessionId: localStorage.getItem(AUTH_KEYS.SESSION_ID),
      };
    } catch (error) {
      console.error('Failed to get auth session:', error);
      return null;
    }
  }

  /**
   * Check if current session is valid and not expired
   */
  static isSessionValid(): boolean {
    const expiry = this.expiresAt();
    return expiry !== null && Date.now() < expiry;
  }

  /**
   * Get user ID from storage
   */
  static getUserId(): string | null {
    try {
      return localStorage.getItem(AUTH_KEYS.USER_ID);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user token from storage
   */
  static getUserToken(): string | null {
    try {
      return localStorage.getItem(AUTH_KEYS.USER_TOKEN);
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all authentication data
   */
  static clearSession({ preserveDrafts = false }: { preserveDrafts?: boolean } = {}): void {
    try {
      Object.values(AUTH_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });

      // Clear additional user data
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('savedEmail');
      localStorage.removeItem('userPhase');
      localStorage.removeItem('selectedMotivations');
      localStorage.removeItem('countdownDays');
      localStorage.removeItem('streakDays');
      localStorage.removeItem('journeyStartDate');
      localStorage.removeItem('quitDate');
      localStorage.removeItem('actualQuitDate');
      localStorage.removeItem('selectedDays');
      localStorage.removeItem('homeMoneySaved');
      localStorage.removeItem('consumptionLogs');
      localStorage.removeItem('cravingDetail');
      localStorage.removeItem('aiResultData');
      sessionStorage.removeItem('nivo.support-result');
      sessionStorage.removeItem('nivo.recovery');
      if (!preserveDrafts)
        Object.keys(localStorage)
          .filter((key) => key.startsWith('nivo.pending.'))
          .forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear auth session:', error);
    }
  }
}
