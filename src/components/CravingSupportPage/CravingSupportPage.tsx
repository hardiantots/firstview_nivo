import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import backimg from "@/assets/backimg.png";

const CravingSupportPage = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [situation, setSituation] = useState("");
  const [customSituation, setCustomSituation] = useState("");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [intensity, setIntensity] = useState([3]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handleGetAIHelp = () => {
    const finalLocation = location === "Lainnya..." ? customLocation : location;
    const finalSituation = situation === "Lainnya..." ? customSituation : situation;

    navigate("/ai-result", { 
      state: { 
        location: finalLocation, 
        situation: finalSituation, 
        emotions: selectedEmotions, 
        intensity: intensity[0] 
      } 
    });
  };

  const isFormInvalid =
    !location ||
    (location === "Lainnya..." && !customLocation.trim()) ||
    !situation ||
    (situation === "Lainnya..." && !customSituation.trim()) ||
    selectedEmotions.length === 0;

  return (
    <div className="flex flex-col bg-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Main Content */}
      <div className="flex-1 px-4 py-6">
        <motion.h1 
          className="text-2xl font-bold text-gray-800 mb-6"
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
          style={{
            background: `url(${backimg}) no-repeat center center`,
            backgroundSize: "cover",
          }}
        >
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