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
}

const AUTH_KEYS = {
  USER_TOKEN: 'userToken',
  USER_ID: 'userId',
  USER_EMAIL: 'userEmail',
  LAST_LOGIN_AT: 'lastLoginAt',
  SESSION_MAX_AGE_DAYS: 'sessionMaxAgeDays',
  LOGIN_METHOD: 'loginMethod',
} as const;

const DEFAULT_SESSION_MAX_AGE_DAYS = 30;

export class AuthStorage {
  /**
   * Save complete authentication session
   */
  static saveSession(session: Partial<AuthSession>): void {
    try {
      if (session.userToken) localStorage.setItem(AUTH_KEYS.USER_TOKEN, session.userToken);
      if (session.userId) localStorage.setItem(AUTH_KEYS.USER_ID, session.userId);
      if (session.userEmail) localStorage.setItem(AUTH_KEYS.USER_EMAIL, session.userEmail);
      if (session.loginMethod) localStorage.setItem(AUTH_KEYS.LOGIN_METHOD, session.loginMethod);
      
      localStorage.setItem(AUTH_KEYS.LAST_LOGIN_AT, String(session.lastLoginAt || Date.now()));
      localStorage.setItem(
        AUTH_KEYS.SESSION_MAX_AGE_DAYS,
        String(session.sessionMaxAgeDays || DEFAULT_SESSION_MAX_AGE_DAYS)
      );
    } catch (error) {
      console.error('Failed to save auth session:', error);
    }
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
        sessionMaxAgeDays: Number(
          localStorage.getItem(AUTH_KEYS.SESSION_MAX_AGE_DAYS) || DEFAULT_SESSION_MAX_AGE_DAYS
        ),
        loginMethod: (localStorage.getItem(AUTH_KEYS.LOGIN_METHOD) as 'password' | 'oauth') || 'password',
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
    const session = this.getSession();
    
    if (!session) {
      return false;
    }

    const { lastLoginAt, sessionMaxAgeDays } = session;
    
    if (!lastLoginAt || sessionMaxAgeDays <= 0) {
      return true; // If no expiration set, treat as valid
    }

    const diffMs = Date.now() - lastLoginAt;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    return diffDays <= sessionMaxAgeDays;
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
  static clearSession(): void {
    try {
      Object.values(AUTH_KEYS).forEach(key => {
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
    } catch (error) {
      console.error('Failed to clear auth session:', error);
    }
  }

  /**
   * Update last login timestamp
   */
  static updateLastLogin(): void {
    try {
      localStorage.setItem(AUTH_KEYS.LAST_LOGIN_AT, String(Date.now()));
    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  }
}
