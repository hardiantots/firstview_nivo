"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import logo from '@/assets/logo-with-text-horizontal.png';
import assetsfirstpage from '@/assets/assetsfirstpage.png';

const MotivationScreen = () => {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState(30);
  
  const [motivation, setMotivation] = useState("");
  const maxLength = 80;

  useEffect(() => {
    // Get selected days from localStorage
    const storedDays = localStorage.getItem('selectedDays');
    if (storedDays) {
      setSelectedDays(parseInt(storedDays));
    }
  }, []);

  const handleSubmit = () => {
    if (motivation.trim()) {
      // Here you would typically save the data and navigate to dashboard
      console.log("Motivation:", motivation);
      console.log("Selected days:", selectedDays);
      // Store motivation for future use
      localStorage.setItem('motivation', motivation);
      // Navigate to home page after completion
      router.push("/home");
    }
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

          {/* Motivation Input */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            <Textarea
              value={motivation}
              onChange={(e) => {
                if (e.target.value.length <= maxLength) {
                  setMotivation(e.target.value);
                }
              }}
              placeholder="Contoh: Untuk kesehatan anak saya dan bisa melihatnya tumbuh dewasa."
              className="min-h-[120px] resize-none text-sm shadow-sm"
              maxLength={maxLength}
            />
            <div className="flex justify-end mt-2">
              <span className="text-xs text-muted-foreground">
                {motivation.length}/{maxLength}
              </span>
            </div>
          </motion.div>

          {/* Motivational Card */}
          <motion.div 
            className="bg-primary rounded-2xl p-6 text-white text-center mb-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-primary"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M8 12C8 12 9.5 9 12 10.5C14.5 12 16 9 16 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="currentColor"
                    fillOpacity="0.2"
                  />
                </svg>
              </div>
            </div>
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
              disabled={!motivation.trim()}
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