import { supabase } from './supabase';
import { ensureUserProfile } from '@/lib/db/userProfile';

/**
 * Sign in dengan email dan password
 */
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // Store user info
    if (data.user) {
      localStorage.setItem('userToken', data.session?.access_token || '');
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userEmail', data.user.email || '');
      const now = Date.now();
      localStorage.setItem('lastLoginAt', String(now));
      // Default 30 hari untuk persistent login - bisa di-override oleh form
      localStorage.setItem('sessionMaxAgeDays', '30');
      localStorage.setItem('loginMethod', 'password');
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Sign up dengan email dan password
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  metadata: { full_name?: string; phone?: string; motivations?: string[] } = {}
) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      throw error;
    }

    const user = data.user;
    if (user) {
      await ensureUserProfile({
        userId: user.id,
        email: user.email,
        fullName: (metadata.full_name as string) || null,
        phoneNumber: (metadata.phone as string) || null,
        motivations: metadata.motivations || null,
      });
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Sign in dengan Google
 */
export const signInWithGoogle = async () => {
  try {
    // Use site URL from environment variable for consistent OAuth redirect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Sign in dengan Facebook
 */
export const signInWithFacebook = async () => {
  try {
    // Use site URL from environment variable for consistent OAuth redirect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Reset password - send OTP to email
 */
export const sendPasswordResetEmail = async (email: string) => {
  try {
    // Use site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      throw error;
    }

    // Store email for OTP verification
    localStorage.setItem('resetEmail', email);

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Verify OTP dan reset password
 */
export const verifyOTPAndResetPassword = async (
  email: string,
  token: string,
  newPassword: string
) => {
  try {
    // Verify OTP token
    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });

    if (verifyError) {
      throw verifyError;
    }

    // Update password
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }

    return { success: true, data: updateData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Resend OTP
 */
export const resendPasswordResetEmail = async (email: string) => {
  try {
    // Use site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    // Clear stored user data
    localStorage.removeItem('userToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('resetEmail');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get current session
 */
export const getCurrentSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
