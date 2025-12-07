'use client'

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, MessageSquare, Activity, Calendar, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { fetchAISuggestions } from "@/lib/db/userJourneyStats";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { AuthStorage } from "@/lib/auth-storage";

const CravingHistoryDetailPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cravingId = searchParams.get('id');
  const [craving, setCraving] = useState<any>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCravingDetail = async () => {
      // First try localStorage (for fresh navigation from list)
      const storedCraving = localStorage.getItem('cravingDetail');
      if (storedCraving) {
        const parsed = JSON.parse(storedCraving);
        setCraving(parsed);
        localStorage.removeItem('cravingDetail');
        
        // Fetch AI suggestion for this craving
        await fetchAISuggestionForCraving(parsed.id);
        setIsLoading(false);
        return;
      }

      // Fallback: fetch from database using ID
      const userId = AuthStorage.getUserId();
      if (!userId || !cravingId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("craving_logs")
          .select("*")
          .eq("id", cravingId)
          .eq("user_id", userId)
          .single();

        if (error) throw error;

        if (data) {
          const mappedCraving = {
            id: data.id,
            emotion: data.mood || "Tidak disebutkan",
            date: format(new Date(data.occurred_at || new Date()), "EEEE, d MMM yyyy HH:mm", { locale: id }),
            intensity: data.intensity || 0,
            location: data.location || "-",
            situation: data.situation || "-",
          };
          setCraving(mappedCraving);
          
          // Fetch AI suggestion
          await fetchAISuggestionForCraving(data.id);
        }
      } catch (error) {
        console.error("Failed to fetch craving detail:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAISuggestionForCraving = async (logId: string) => {
      const userId = AuthStorage.getUserId();
      if (!userId) return;

      try {
        // Fetch AI suggestions and find one created around the same time as this craving
        const suggestions = await fetchAISuggestions(userId, 50);
        
        // Try to match by content (since we save location/situation in AI suggestion)
        const matchingSuggestion = suggestions.find((s) => 
          s.suggestion_type === "craving_support"
        );

        if (matchingSuggestion) {
          // Check if content is AI-generated (not structured data)
          if (!matchingSuggestion.content.includes("Lokasi:")) {
            setAiSuggestion(matchingSuggestion.content);
          }
        }
      } catch (error) {
        console.error("Failed to fetch AI suggestion:", error);
      }
    };

    loadCravingDetail();
  }, [cravingId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Memuat detail craving...</p>
        </div>
      </div>
    );
  }

  if (!craving) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="mb-4 text-xl font-bold">Riwayat Tidak Ditemukan</h1>
          <p className="mb-4 text-gray-600">Detail craving tidak dapat dimuat.</p>
          <button onClick={() => router.back()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const getIntensityStyle = (intensity: number) => {
    if (intensity >= 4) return "bg-red-100 text-red-800 border-red-200";
    if (intensity === 3) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm px-4 py-4 flex items-center gap-4 border-b border-gray-100/50 shadow-sm sticky top-0 z-10">
        <button 
          onClick={() => router.back()} 
          className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Detail Craving</h1>
          <p className="text-sm text-gray-500">{craving.date}</p>
        </div>
      </div>

      <main className="p-4 space-y-4 max-w-md mx-auto">
        {/* Intensity Hero Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{craving.emotion}</h2>
                <p className="text-indigo-100">Emosi yang dirasakan</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2">
                <Activity className="w-6 h-6 mb-1 mx-auto" />
                <p className="text-xs font-semibold">Level {craving.intensity}/5</p>
              </div>
            </div>
            {/* Intensity Bar */}
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-white rounded-full h-full transition-all duration-700 ease-out"
                style={{ width: `${(craving.intensity / 5) * 100}%` }}
              />
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-white/5 rounded-full blur-lg" />
        </div>

        {/* Info Cards Grid */}
        <div className="space-y-4">
          {/* Location Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-white/50">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2.5 rounded-xl">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-1">Lokasi</h3>
                <p className="text-gray-600 leading-relaxed">{craving.location}</p>
              </div>
            </div>
          </div>

          {/* Situation Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-white/50">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 p-2.5 rounded-xl">
                <MessageSquare className="w-5 h-5 text-amber-600" />
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
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-sm rounded-2xl p-5 border border-emerald-200/50 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 p-2.5 rounded-xl flex-shrink-0">
                <Bot className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                  Saran AI 
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    NIVO
                  </span>
                </h3>
                <div className="prose prose-sm prose-emerald">
                  <p className="text-emerald-700 leading-relaxed whitespace-pre-wrap">{aiSuggestion}</p>
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