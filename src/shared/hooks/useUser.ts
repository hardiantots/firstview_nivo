/**
 * Custom hook for accessing current user information
 * Provides centralized user data access across components
 */

import { useEffect, useState } from 'react';
import { AuthStorage } from '@/lib/auth-storage';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  userId: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const userId = AuthStorage.getUserId();
      const session = AuthStorage.getSession();

      if (!userId || !session) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profile')
          .select('full_name, email, phone_number')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          setUser({
            userId,
            email: data.email || session.userEmail,
            fullName: data.full_name,
            phoneNumber: data.phone_number,
          });
        } else {
          setUser({
            userId,
            email: session.userEmail,
            fullName: null,
            phoneNumber: null,
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  return { user, isLoading };
}
