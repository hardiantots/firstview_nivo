/**
 * Custom hook for managing journey status
 * Provides centralized access to user's smoke-free journey data
 */

import { useEffect, useState } from 'react';
import { AuthStorage } from '@/lib/auth-storage';
import { supabase } from '@/lib/supabase';

interface JourneyStatus {
  userId: string;
  phase: 'PRE_QUIT' | 'POST_QUIT' | string;
  startDate: string | null;
  quitDate: string | null;
  actualQuitDate: string | null;
  smokingFrequency: number;
  cigarettesPerPack: number;
  pricePerPack: number;
  streakDays: number;
  moneySaved: number;
}

export function useJourney() {
  const [journey, setJourney] = useState<JourneyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJourney = async () => {
    const userId = AuthStorage.getUserId();
    if (!userId) {
      setJourney(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('smoke_free_journey')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setJourney({
          userId: data.user_id,
          phase: data.phase || 'PRE_QUIT',
          startDate: data.start_date,
          quitDate: data.quit_date,
          actualQuitDate: data.actual_quit_date,
          smokingFrequency: data.smoking_frequency || 0,
          cigarettesPerPack: data.cigarettes_per_pack || 20,
          pricePerPack: data.price_per_pack || 0,
          streakDays: data.streak_days || 0,
          moneySaved: data.money_saved || 0,
        });
      } else {
        setJourney(null);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading journey:', err);
      setError(err instanceof Error ? err.message : 'Failed to load journey');
      setJourney(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJourney();
  }, []);

  const refreshJourney = () => {
    setIsLoading(true);
    loadJourney();
  };

  return { journey, isLoading, error, refreshJourney };
}
