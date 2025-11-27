'use client'

import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/ui/app-header";
import { fetchAISuggestions } from "@/lib/db/userJourneyStats";

const AIResultPage = () => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Prioritaskan data dari localStorage (fresh dari CravingSupportPage)
      const storedData = localStorage.getItem('aiResultData');
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          setAiData(parsed);
          // Clean up after use
          localStorage.removeItem('aiResultData');
          return;
        } catch (e) {
          console.error("Failed to parse stored AI data", e);
        }
      }

      // Fallback: coba ambil dari database
      const userId = localStorage.getItem("userId");
      if (userId) {
        try {
          const suggestions = await fetchAISuggestions(userId, 1);
          if (suggestions && suggestions.length > 0) {
            const latest = suggestions[0];
            
            // Check if content is AI-generated or structured data
            if (latest.content.includes("Lokasi:")) {
              // Parse structured content
              const contentParts = latest.content.split(", ");
              const locationMatch = contentParts[0]?.match(/Lokasi: (.+)/);
              const situationMatch = contentParts[1]?.match(/Situasi: (.+)/);
              const emotionMatch = contentParts[2]?.match(/Emosi: (.+)/);
              
              const parsedData = {
                location: locationMatch ? locationMatch[1] : "-",
                situation: situationMatch ? situationMatch[1] : "-",
                emotions: emotionMatch ? emotionMatch[1].split(", ") : [],
                intensity: latest.intensity || 0,
                aiSuggestion: null,
              };
              
              setAiData(parsedData);
            } else {
              // AI-generated content
              setAiData({
                location: "-",
                situation: "-",
                emotions: [],
                intensity: latest.intensity || 0,
                aiSuggestion: latest.content,
              });
            }
            return;
          }
        } catch (e) {
          console.error("Gagal fetch AI suggestion dari database", e);
        }
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="relative min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Main Content Container */}
      <div className="w-full">
        {/* Content with max-width constraint */}
        <div className="px-4 py-6 pt-20 mx-auto max-w-2xl">
          {/* AI Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 border-2 border-dashed border-teal-600 rounded-full flex items-center justify-center bg-transparent">
              <Bot className="w-10 h-10 text-teal-600" />
            </div>
          </div>

          {/* AI Advice Card */}
          <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-200 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-bold text-gray-800">Saran dari NIVO AI</h3>
            </div>
            {aiData ? (
              <>
                {aiData.aiSuggestion ? (
                  // Display AI-generated suggestion with proper paragraph and bullet point formatting
                  <div className="text-gray-700 text-sm leading-relaxed space-y-3">
                    {(() => {
                      const content = aiData.aiSuggestion;
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
                ) : (
                  // No AI suggestion available
                  <div className="text-center py-6">
                    <p className="text-gray-600 text-sm leading-relaxed mb-2">
                      Saran AI tidak tersedia untuk sesi ini.
                    </p>
                    <p className="text-gray-500 text-xs">
                      Silakan coba lagi dalam beberapa saat atau hubungi dukungan jika masalah berlanjut.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 text-sm leading-relaxed">
                  Tidak ada data saran yang tersedia. Silakan coba lagi nanti.
                </p>
              </div>
            )}
          </div>

          {/* Panel distraksi manual */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm mb-4">
            <h4 className="text-sm font-semibold text-emerald-800 mb-2">Panel Distraksi Cepat</h4>
            <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
              <li>Tarik napas 4 detik, tahan 7 detik, hembuskan 8 detik (ulang 3 kali).</li>
              <li>Pindah sebentar dari area yang memicu (misalnya keluar ruangan).</li>
              <li>Minum segelas air pelan-pelan sambil fokus ke rasa di tubuhmu.</li>
              <li>Scroll pencapaianmu di halaman Pencapaian untuk mengingat progresmu.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <Button
            onClick={() => router.push("/craving-support")}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            Saya Merasa Lebih Baik
          </Button>

          <p className="mt-4 text-[11px] text-gray-500 leading-relaxed">
            Saran dari NIVO AI bukan pengganti nasihat tenaga kesehatan profesional.
            Jika kamu merasa tidak aman, sangat cemas, atau terpikir untuk melukai diri,
            segera hubungi tenaga kesehatan atau layanan darurat terdekat.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIResultPage;