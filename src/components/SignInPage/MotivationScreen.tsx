"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Wallet, Users, Zap, Brain, Smile } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import logo from '@/assets/logo-with-text-horizontal.png';
import assetsfirstpage from '@/assets/assetsfirstpage.png';

const MotivationScreen = () => {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedMotivations, setSelectedMotivations] = useState<string[]>([]);
  const maxSelections = 2;

  const motivationOptions = [
    { id: 'health', label: 'Kesehatan', icon: Heart, description: 'Demi tubuh yang lebih sehat' },
    { id: 'finance', label: 'Keuangan', icon: Wallet, description: 'Menghemat biaya rokok' },
    { id: 'family', label: 'Keluarga', icon: Users, description: 'Untuk orang-orang terkasih' },
    { id: 'energy', label: 'Energi & Stamina', icon: Zap, description: 'Lebih bugar dan bertenaga' },
    { id: 'cognitive', label: 'Fokus & Konsentrasi', icon: Brain, description: 'Pikiran lebih jernih' },
    { id: 'confidence', label: 'Kepercayaan Diri', icon: Smile, description: 'Merasa lebih percaya diri' },
  ];

  useEffect(() => {
    // Get selected days from localStorage
    const storedDays = localStorage.getItem('selectedDays');
    if (storedDays) {
      setSelectedDays(parseInt(storedDays));
    }

    // Don't preload motivations - let user select fresh
    // This ensures empty state on initial visit to motivation screen
  }, []);

  const handleSubmit = () => {
    if (selectedMotivations.length > 0) {
      console.log("Selected Motivations:", selectedMotivations);
      console.log("Selected days:", selectedDays);
      localStorage.setItem('selectedMotivations', JSON.stringify(selectedMotivations));
      // simpan juga ke user_profile.motivations bila user sudah login
      const userId = localStorage.getItem('userId');
      if (userId) {
        fetch('/api/profile/motivations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, motivations: selectedMotivations }),
        }).catch(() => {
          // biarkan gagal diam-diam, localStorage tetap menyimpan
        });
      }
      router.push("/home");
    }
  };

  const toggleMotivation = (id: string) => {
    // Find the label (Indonesian) for this id
    const option = motivationOptions.find(opt => opt.id === id);
    const label = option?.label || id;
    
    setSelectedMotivations(prev => {
      if (prev.includes(label)) {
        return prev.filter(item => item !== label);
      } else if (prev.length < maxSelections) {
        return [...prev, label];
      }
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="w-full max-w-md mx-auto p-6 relative min-h-screen flex flex-col">
        <div className="relative z-10">
          {/* Header */}
          <div className="relative flex justify-center items-center mb-8 pt-8">
            <button
              onClick={() => router.back()}
              className="absolute left-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <Image src={logo} alt="NIVO Logo" className="h-10" height={40} />
          </div>

          {/* Title */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h1 className="text-lg font-bold text-foreground mb-3">
              Apa alasan terkuatmu untuk<br />berhenti?
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tuliskan di bawah ini untuk menjadi pengingat<br />
              di sepanjang perjalananmu.
            </p>
          </motion.div>

          {/* Motivation Options Grid */}
          <motion.div 
            className="grid grid-cols-2 gap-3 mb-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            {motivationOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedMotivations.includes(option.label);
              return (
                <motion.button
                  key={option.id}
                  onClick={() => toggleMotivation(option.id)}
                  className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`flex flex-col items-center text-center ${isSelected ? 'text-orange-600' : 'text-gray-600'}`}>
                    <Icon className="w-6 h-6 mb-2" />
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Selection Counter */}
          <motion.div 
            className="text-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <p className="text-sm text-muted-foreground">
              {selectedMotivations.length} / {maxSelections} pilihan dipilih
            </p>
          </motion.div>

          {/* Motivational Card */}
          <motion.div 
            className="bg-primary rounded-2xl p-6 text-white text-center mb-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          >
            <p className="text-xs leading-relaxed">
              Apa alasan terkuatmu untuk berhenti? Entah itu demi keluarga tercinta, demi kesehatanmu sendiri, atau demi masa depan yang lebih cerah, kekuatan dari dalam dirimu. Bayangkan hidup bebas dari rokok, bernapas lega, dan meraih kesehatan yang prima. Setiap hari tanpa rokok adalah bukti kekuatanmu!
            </p>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
          >
            <Button
              className="w-full bg-accent hover:bg-accent/90 text-white"
              size="lg"
              onClick={handleSubmit}
              disabled={selectedMotivations.length === 0}
            >
              Selesai & Mulai Perjalananmu
            </Button>
          </motion.div>
        </div>
        {/* Background Image */}
        <div className="absolute bottom-0 right-0 w-[90%] max-w-xs pointer-events-none opacity-80">
          <Image
            src={assetsfirstpage}
            alt="Decorative background graphic"
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default MotivationScreen;