'use client';

import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, MessageSquare, Activity, Bot } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchAISuggestions } from '@/lib/db/userJourneyStats';
import { CravingHistoryItem, toCravingHistoryItem } from './craving-history';

const CravingHistoryDetailPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id?: string }>();
  const cravingId = params.id || searchParams.get('id');
  const [craving, setCraving] = useState<CravingHistoryItem | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadCravingDetail = async () => {
      setIsLoading(true);
      setCraving(null);
      setAiSuggestion(null);
      try {
        // Reload by URL and verified identity; device caches cannot establish ownership.
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user || !cravingId) return;
        const userId = user.id;
        const { data, error } = await supabase
          .from('craving_logs')
          .select('*')
          .eq('id', cravingId)
          .eq('user_id', userId)
          .single();

        if (error) throw error;

        if (data && active) {
          const mappedCraving = toCravingHistoryItem(data);
          setCraving(mappedCraving);

          // Fetch AI suggestion
          await fetchAISuggestionForCraving(data.id, userId);
        }
      } catch (error) {
        console.error('Failed to fetch craving detail:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const fetchAISuggestionForCraving = async (logId: string, userId: string) => {
      try {
        // Fetch AI suggestions and find one created around the same time as this craving
        const suggestions = await fetchAISuggestions(userId, 50);

        // Try to match by content (since we save location/situation in AI suggestion)
        const matchingSuggestion = suggestions.find(
          (s) => s.suggestion_type === 'craving_support_v2' && s.craving_log_id === logId,
        );

        if (matchingSuggestion) {
          // Check if content is AI-generated (not structured data)
          if (!matchingSuggestion.content.includes('Lokasi:')) {
            if (active) setAiSuggestion(matchingSuggestion.content);
          }
        }
      } catch (error) {
        console.error('Failed to fetch AI suggestion:', error);
      }
    };

    loadCravingDetail();
    return () => {
      active = false;
    };
  }, [cravingId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-background p-4 py-12">
        <div className="nivo-glass nivo-error-card text-center" role="status">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Memuat detail craving...</p>
        </div>
      </div>
    );
  }

  if (!craving) {
    return (
      <div className="flex items-center justify-center bg-background p-4 py-12">
        <div className="nivo-glass nivo-glass-warm nivo-error-card text-center">
          <h1 className="mb-4 text-xl font-bold">Riwayat Tidak Ditemukan</h1>
          <p className="mb-4 text-gray-600">Detail craving tidak dapat dimuat.</p>
          <button onClick={() => router.back()} className="nivo-action nivo-action-secondary">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-4 border-b border-border">
        <button onClick={() => router.back()} className="nivo-icon-button" aria-label="Kembali">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Detail Craving</h1>
          <p className="text-sm text-gray-500">{craving.date}</p>
        </div>
      </div>

      <main className="nivo-page">
        {/* Intensity Hero Card */}
        <div className="nivo-glass nivo-glass-warm p-6 text-primary">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{craving.emotion}</h2>
                <p className="text-muted-foreground">Emosi yang dirasakan</p>
              </div>
              <div className="bg-secondary/10 text-accent rounded-2xl px-4 py-2 shrink-0">
                <Activity className="w-6 h-6 mb-1 mx-auto" />
                <p className="text-xs font-semibold">Level {craving.intensity}/5</p>
              </div>
            </div>
            {/* Intensity Bar */}
            <div className="w-full bg-primary/10 rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary rounded-full h-full transition-[width] duration-200 ease-out"
                style={{ width: `${(craving.intensity / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className="space-y-4">
          {/* Location Card */}
          <div className="nivo-glass p-5">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-1">Lokasi</h3>
                <p className="text-gray-600 leading-relaxed">{craving.location}</p>
              </div>
            </div>
          </div>

          {/* Situation Card */}
          <div className="nivo-glass nivo-glass-warm p-5">
            <div className="flex items-start gap-3">
              <div className="bg-secondary/10 p-2.5 rounded-xl">
                <MessageSquare className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-1">Situasi</h3>
                <p className="text-gray-600 leading-relaxed">{craving.situation}</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Suggestion */}
        {aiSuggestion && (
          <div className="nivo-glass p-5">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl flex-shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
                  Saran AI
                  <span className="nivo-badge">NIVO</span>
                </h3>
                <div className="prose prose-sm">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {aiSuggestion}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CravingHistoryDetailPage;
