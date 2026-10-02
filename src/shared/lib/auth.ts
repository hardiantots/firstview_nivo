import { supabase } from './supabase';
import { ensureUserProfile } from '@/lib/db/userProfile';
import { AuthStorage } from './auth-storage';
import { errorMessage } from './errors';

/**
 * Sign in with email and password
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

    if (data.user && data.session) {
      AuthStorage.saveSupabaseSession(data.session, { newLogin: true });
    }

    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
  }
};

/**
 * Sign up dengan email dan password
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  metadata: { full_name?: string; phone?: string; motivations?: string[] } = {},
) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }

    const user = data.user;
    if (user && data.session) {
      AuthStorage.saveSupabaseSession(data.session, { newLogin: true });
      await ensureUserProfile({
        userId: user.id,
        email: user.email,
        fullName: (metadata.full_name as string) || null,
        phoneNumber: (metadata.phone as string) || null,
        motivations: metadata.motivations || null,
      });
    }

    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
  }
};

async function signInWithProvider(provider: 'google' | 'facebook') {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) throw error;
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
  }
}

export const signInWithGoogle = () => signInWithProvider('google');
export const signInWithFacebook = () => signInWithProvider('facebook');

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
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
  }
};

/**
 * Verify OTP dan reset password
 */
export const verifyOTPAndResetPassword = async (
  email: string,
  token: string,
  newPassword: string,
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
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
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
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
  }
};

/**
 * Sign out and clear all session data
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    AuthStorage.clearSession();

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
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
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
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
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) };
  }
};
