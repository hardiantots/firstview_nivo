'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/ui/app-header";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import Image from "next/image";
import backimg from "@/assets/backimg.png";
import { createCravingLog } from "@/lib/db/cravingLogs";
import { saveAISuggestion } from "@/lib/db/userJourneyStats";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Cigarette } from "lucide-react";

const CravingSupportPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [situation, setSituation] = useState("");
  const [customSituation, setCustomSituation] = useState("");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [intensity, setIntensity] = useState([3]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [consumptionValue, setConsumptionValue] = useState([0]);
  const [todaysConsumption, setTodaysConsumption] = useState(0);

  const emotions = [
    { id: "senang", label: "Senang", color: "bg-green-100 text-green-800" },
    { id: "sedih", label: "Sedih", color: "bg-blue-100 text-blue-800" },
    { id: "marah", label: "Marah", color: "bg-red-100 text-red-800" },
    { id: "stres", label: "Stres", color: "bg-yellow-100 text-yellow-800" },
    { id: "cemas", label: "Cemas", color: "bg-purple-100 text-purple-800" },
    { id: "bosan", label: "Bosan", color: "bg-gray-100 text-gray-800" },
    { id: "netral", label: "Netral", color: "bg-slate-100 text-slate-800" },
  ];

  const locationOptions = [
    "Di kantor",
    "Di rumah",
    "Di kafe/restoran",
    "Di dalam kendaraan",
    "Di tempat umum terbuka",
    "Lainnya...",
  ];

  const situationOptions = [
    "Melihat orang lain merokok",
    "Setelah makan",
    "Saat minum kopi",
    "Merasa stres atau cemas",
    "Sedang sendirian atau bosan",
    "Lainnya...",
  ];

  const MAX_CUSTOM_INPUT_LENGTH = 30;

  const handleEmotionSelect = (emotionId: string) => {
    setSelectedEmotions(prev => {
      if (prev.includes(emotionId)) {
        return prev.filter(id => id !== emotionId);
      } else if (prev.length < 3) {
        return [...prev, emotionId];
      }
      return prev;
    });
  };

  const handleGetAIHelp = async () => {
    const finalLocation = location === "Lainnya..." ? customLocation : location;
    const finalSituation = situation === "Lainnya..." ? customSituation : situation;

    // Validasi input
    if (!finalLocation || !finalSituation || selectedEmotions.length === 0) {
      toast({
        title: "Input tidak lengkap",
        description: "Mohon lengkapi semua field (lokasi, situasi, dan minimal 1 emosi)",
        variant: "destructive",
      });
      return;
    }

    // Get user motivations from localStorage
    const storedMotivations = localStorage.getItem('selectedMotivations');
    let motivations: string[] = [];
    if (storedMotivations) {
      try {
        motivations = JSON.parse(storedMotivations);
      } catch (e) {
        console.error("Failed to parse motivations", e);
      }
    }

    const data = {
      location: finalLocation,
      situation: finalSituation,
      emotions: selectedEmotions,
      intensity: intensity[0],
      motivations: motivations
    };

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast({
        title: "User tidak ditemukan",
        description: "Silakan login kembali",
        variant: "destructive",
      });
      return;
    }

    // Show loading toast
    toast({
      title: "Memproses...",
      description: "NIVO AI sedang menganalisis situasi Anda",
    });

    try {
      // Call AI API first
      const aiResponse = await fetch('/api/ai-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        console.error('AI API Error:', aiResponse.status, errorData);
        
        if (aiResponse.status === 429) {
          throw new Error('AI sedang sibuk, coba lagi dalam beberapa detik');
        }
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const aiData = await aiResponse.json();


      // Hanya simpan ke database jika AI berhasil

      // Simpan craving log
      await createCravingLog({
        userId,
        intensity: intensity[0],
        location: finalLocation,
        situation: finalSituation,
        emotions: selectedEmotions,
      });



      // Simpan AI suggestion ke database dengan response dari AI
      const suggestionContent = aiData.suggestion || `Lokasi: ${finalLocation}, Situasi: ${finalSituation}, Emosi: ${selectedEmotions.join(", ")}`;
      const result = await saveAISuggestion({
        userId,
        suggestionType: "craving_support",
        content: suggestionContent,
        intensity: intensity[0],
        triggers: [finalLocation, finalSituation, ...selectedEmotions],
      });



      // Simpan data lengkap ke localStorage untuk AIResultPage
      const resultData = {
        ...data,
        aiSuggestion: aiData.suggestion,
        timestamp: aiData.timestamp,
      };
      localStorage.setItem('aiResultData', JSON.stringify(resultData));

      if (result.success) {
        toast({
          title: "Berhasil!",
          description: "NIVO AI telah menyiapkan saran untuk Anda",
          variant: "default",
        });
      }

      // Navigate to result page
      router.push("/ai-result");

    } catch (e) {
      console.error("Error during AI help process:", e);
      
      const errorMessage = e instanceof Error ? e.message : "Gagal mendapatkan saran AI";
      
      toast({
        title: "Terjadi kesalahan",
        description: "Tidak dapat terhubung ke AI. Silakan coba lagi dalam beberapa saat.",
        variant: "destructive",
      });
      
      // Don't navigate if AI fails - let user try again
    }
  };

  const handleLogConsumption = async () => {
    if (consumptionValue[0] === 0) {
      alert("Pilih jumlah rokok terlebih dahulu");
      return;
    }

    setTodaysConsumption(consumptionValue[0]);

    const today = new Date().toISOString().split("T")[0];
    const userId = localStorage.getItem("userId");

    if (userId) {
      try {
        await supabase.from("daily_consumption").upsert(
          {
            user_id: userId,
            date: today,
            cigarette_count: consumptionValue[0],
          },
          { onConflict: "user_id,date" }
        );
      } catch (e) {
        console.error("Gagal menyimpan konsumsi ke Supabase dari CravingSupport", e);
      }
    }

    const consumptionLog = {
      date: today,
      amount: consumptionValue[0],
      timestamp: new Date().toISOString(),
    };
    const existingLogs = JSON.parse(localStorage.getItem("consumptionLogs") || "[]");
    const updatedLogs = existingLogs.filter((log: any) => log.date !== today);
    updatedLogs.push(consumptionLog);
    localStorage.setItem("consumptionLogs", JSON.stringify(updatedLogs));

    alert(`✓ Berhasil mencatat ${consumptionValue[0]} batang rokok hari ini`);
    setConsumptionValue([0]);
  };

  const isFormInvalid =
    !location ||
    (location === "Lainnya..." && !customLocation.trim()) ||
    !situation ||
    (situation === "Lainnya..." && !customSituation.trim()) ||
    selectedEmotions.length === 0;

  return (
    <div className="relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Main Content */}
      <div className="px-4 py-6">
        <motion.h1 
          className="text-xl font-bold text-green-900 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Craving Support</motion.h1>
        
        {/* Combined Card */}
        <motion.div
          className="relative rounded-2xl p-6 mb-6 shadow-lg border border-gray-100 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Background Image */}
          <Image
            src={backimg}
            alt="Background"
            fill
            className="object-cover"
            priority
          />
          <div className="relative z-10 bg-black/30 backdrop-blur-sm rounded-xl p-6 space-y-6">
            {/* Situasi Terkini */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Situasi Terkini</h2>
              <div className="mb-4">
                <label className="text-sm font-medium text-white/90 mb-2 block">
                  Di mana Anda sekarang?
                </label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="w-full bg-white/80 border-white/30 text-gray-800 placeholder:text-gray-500">
                    <SelectValue placeholder="Pilih lokasi Anda" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {location === "Lainnya..." && (
                  <Input
                    value={customLocation}
                    onChange={(e) => e.target.value.length <= MAX_CUSTOM_INPUT_LENGTH && setCustomLocation(e.target.value)}
                    placeholder="Tulis lokasi Anda..."
                    className="mt-2 w-full bg-white/80 border-white/30 text-gray-800 placeholder:text-gray-500"
                    maxLength={MAX_CUSTOM_INPUT_LENGTH}
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-white/90 mb-2 block">
                  Apa yang sedang terjadi disekitar Anda?
                </label>
                <Select value={situation} onValueChange={setSituation}>
                  <SelectTrigger className="w-full bg-white/80 border-white/30 text-gray-800 placeholder:text-gray-500">
                    <SelectValue placeholder="Pilih situasi Anda" />
                  </SelectTrigger>
                  <SelectContent>
                    {situationOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {situation === "Lainnya..." && (
                  <div className="relative mt-2">
                    <Input
                      value={customSituation}
                      onChange={(e) => e.target.value.length <= MAX_CUSTOM_INPUT_LENGTH && setCustomSituation(e.target.value)}
                      placeholder="Tulis situasi Anda..."
                      className="w-full bg-white/80 border-white/30 text-gray-800 placeholder:text-gray-500 pr-12"
                      maxLength={MAX_CUSTOM_INPUT_LENGTH}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{customSituation.length}/{MAX_CUSTOM_INPUT_LENGTH}</span>
                  </div>
                )}
              </div>
            </div>
  
            {/* Perasaan Terkini */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Perasaan Terkini</h2>
              <div className="mb-3">
                <label className="text-sm font-medium text-white/90">Emosi</label>
                <p className="text-xs text-white/70">Bisa memilih maksimal 3 opsi</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {emotions.map((emotion) => {
                  const isSelected = selectedEmotions.includes(emotion.id);
                  const isDisabled = !isSelected && selectedEmotions.length >= 3;
                  return (
                    <Button key={emotion.id} variant={isSelected ? "default" : "outline"} size="sm" disabled={isDisabled} className={`${ isSelected ? "bg-primary text-white border-primary" : isDisabled ? "bg-gray-500/50 text-gray-300 border-gray-500/50 cursor-not-allowed" : "bg-white/20 text-white border-white/30 hover:bg-white/30" }`} onClick={() => handleEmotionSelect(emotion.id)} >
                      {emotion.label}
                    </Button>
                  );
                })}
              </div>
            </div>
  
            {/* Intensitas Keinginan */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Intensitas Keinginan</h2>
              <div className="text-center mb-4">
                <span className="text-3xl font-bold text-white">{intensity[0]}</span>
              </div>
              <Slider value={intensity} onValueChange={setIntensity} max={5} min={1} step={1} className="w-full mb-4" />
              <div className="flex justify-between text-xs text-white/80">
                <span>Sangat Rendah</span>
                <span>Sangat Tinggi</span>
              </div>

              {/* Quick actions distraksi */}
              <div className="mt-4">
                <p className="text-xs text-white/80 mb-2">
                  Sebelum meminta bantuan AI, coba salah satu aksi cepat ini:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white/10 text-white border-white/40 text-[11px] leading-snug px-2 py-2 whitespace-normal min-h-[40px] flex items-center justify-center text-center"
                    onClick={() => router.push("/breathing-exercise")}
                  >
                    Latihan Nafas 4-7-8
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white/10 text-white border-white/40 text-[11px] leading-snug px-2 py-2 whitespace-normal min-h-[40px] flex items-center justify-center text-center"
                    onClick={() => router.push("/distractions")}
                  >
                    Ide Distraksi 5 Menit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
  
        {/* Get AI Help Button */}
        <Button 
          onClick={handleGetAIHelp}
          className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-4 rounded-xl"
          disabled={isFormInvalid}
        >
          Dapatkan Bantuan AI
        </Button>
      </div>
    </div>
  );
};

export default CravingSupportPage;