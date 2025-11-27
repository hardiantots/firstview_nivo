'use client'

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, MessageSquare, Activity, Calendar, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { fetchAISuggestions } from "@/lib/db/userJourneyStats";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const CravingHistoryDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const cravingId = params?.id as string;
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
      const userId = localStorage.getItem("userId");
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
      const userId = localStorage.getItem("userId");
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Detail Riwayat</h1>
      </div>

      <main className="p-6 space-y-6">
        {/* Main Info Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{craving.emotion}</h2>
            <Badge variant="outline" className={`text-sm font-semibold ${getIntensityStyle(craving.intensity)}`}>
              Intensitas: {craving.intensity}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{craving.date}</span>
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-800">Lokasi</h3>
          </div>
          <p className="text-gray-700">{craving.location}</p>
        </div>

        {/* Situation Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-800">Situasi</h3>
          </div>
          <p className="text-gray-700">{craving.situation}</p>
        </div>

        {/* AI Suggestion */}
        {aiSuggestion && (
          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
            <div className="flex items-center gap-3 mb-3">
              <Bot className="w-5 h-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-teal-800">Saran dari NIVO AI</h3>
            </div>
            <div className="text-gray-700 text-sm leading-relaxed space-y-3">
              {(() => {
                const content = aiSuggestion;
                const sections: JSX.Element[] = [];
                
                // Split by double newlines to get sections
                const parts = content.split('\n\n').filter((p: string) => p.trim());
                
                parts.forEach((part: string, idx: number) => {
                  const trimmedPart = part.trim();
                  
                  // Check if this part contains bullet points (starts with • or has multiple •)
                  const hasBullets = trimmedPart.includes('•');
                  
                  if (hasBullets) {
                    // Split by bullet points and render as list
                    const lines = trimmedPart.split('\n').filter((l: string) => l.trim());
                    const bulletItems: string[] = [];
                    let intro = '';
                    
                    lines.forEach((line: string) => {
                      const cleaned = line.trim();
                      if (cleaned.startsWith('•')) {
                        // Remove the bullet and add to items
                        bulletItems.push(cleaned.substring(1).trim());
                      } else if (bulletItems.length === 0 && cleaned) {
                        // This is intro text before bullets
                        intro = cleaned;
                      }
                    });
                    
                    sections.push(
                      <div key={idx} className="space-y-2">
                        {intro && <p className="text-gray-700">{intro}</p>}
                        <div className="space-y-1.5 pl-1">
                          {bulletItems.map((item: string, bIdx: number) => (
                            <div key={bIdx} className="flex gap-2">
                              <span className="text-teal-600 font-bold mt-0.5">•</span>
                              <span className="flex-1">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } else {
                    // Regular paragraph without bullets
                    sections.push(
                      <p key={idx} className="text-gray-700 leading-relaxed">
                        {trimmedPart}
                      </p>
                    );
                  }
                });
                
                return sections;
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CravingHistoryDetailPage;