import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { AppHeader } from "@/components/ui/app-header";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";

const CravingSupportPage = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [situation, setSituation] = useState("");
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
    navigate("/ai-result", { 
      state: { 
        location, 
        situation, 
        emotions: selectedEmotions, 
        intensity: intensity[0] 
      } 
    });
  };

  return (
    <div className="flex flex-col bg-gray-50">
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
        
        {/* Situasi Terkini */}
        <motion.div
          className="bg-white rounded-2xl p-6 mb-4 shadow-lg border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-lg font-bold text-gray-800 mb-4">Situasi Terkini</h2>
          
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Di mana Anda sekarang?
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="contoh: di kantor, di kafe, ..."
              className="w-full"
            />
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Apa yang sedang terjadi disekitar Anda?
            </label>
            <Input
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="contoh: banyak disekitar saya merokok"
              className="w-full"
            />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Perasaan Terkini */}
          <div className="bg-white rounded-2xl p-6 mb-4 shadow-lg border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Perasaan Terkini</h2>
            
            <div className="mb-4">
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-700">Emosi</label>
                <p className="text-xs text-gray-500">Bisa memilih maksimal 3 opsi</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {emotions.map((emotion) => {
                  const isSelected = selectedEmotions.includes(emotion.id);
                  const isDisabled = !isSelected && selectedEmotions.length >= 3;
                  
                  return (
                    <Button
                      key={emotion.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      disabled={isDisabled}
                      className={`${
                        isSelected 
                          ? "bg-primary text-white border-primary" 
                          : isDisabled
                          ? "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                      }`}
                      onClick={() => handleEmotionSelect(emotion.id)}
                    >
                      {emotion.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
            {/* Intensitas Keinginan */}
            <h2 className="text-lg font-bold text-gray-800 mb-4">Intensitas Keinginan</h2>
            
            <div className="mb-6">
              <div className="text-center mb-4">
                <span className="text-3xl font-bold text-gray-800">{intensity[0]}</span>
              </div>
              
              <Slider
                value={intensity}
                onValueChange={setIntensity}
                max={5}
                min={1}
                step={1}
                className="w-full mb-4"
              />
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>1</span>
                <span>5</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Get AI Help Button */}
        <Button 
          onClick={handleGetAIHelp}
          className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-4 rounded-xl"
          disabled={!location || !situation || selectedEmotions.length === 0}
        >
          Dapatkan Bantuan AI
        </Button>
      </div>
    </div>
  );
};

export default CravingSupportPage;