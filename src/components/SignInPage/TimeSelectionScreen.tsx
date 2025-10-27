import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logo from '@/assets/logo-with-text-horizontal.png';
import assetsfirstpage from '@/assets/assetsfirstpage.png';

const TimeSelectionScreen = () => {
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState<number | null>(null);

  const timeOptions = [
    { days: 30, label: "30 Hari" },
    { days: 45, label: "45 Hari" },
    { days: 60, label: "60 Hari" },
    { days: 90, label: "90 Hari" },
  ];

  const handleContinue = () => {
    if (selectedDays) {
      navigate("/motivation", { state: { selectedDays } });
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="w-full max-w-md mx-auto p-6 relative min-h-screen flex flex-col">
        <div className="relative z-10">
          {/* Header */}
          <div className="relative flex justify-center items-center mb-8 pt-8">
            <button
              onClick={() => navigate('/journey-start')}
              className="absolute left-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <img src={logo} alt="NIVO Logo" className="h-10" />
          </div>

          {/* Title */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h1 className="text-lg font-bold text-foreground leading-tight mb-4">
              Satu Langkah Menuju<br />
              Kehidupan Baru: Tetapkan<br />
              Tanggal Berhentimu!
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Pilih salah satu di bawah ini:
            </p>
          </motion.div>

          {/* Time Options */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {timeOptions.map((option, index) => (
              <motion.div
                key={option.days}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1, ease: "easeOut" }}
              >
                <Button
                  variant={selectedDays === option.days ? "default" : "secondary"}
                  className={`w-full h-12 font-medium text-base ${
                    selectedDays === option.days ? "bg-primary hover:bg-primary/90" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                  onClick={() => setSelectedDays(option.days)}
                >
                  {option.label}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Motivational Card */}
          <div className="bg-primary rounded-2xl p-6 text-white text-center mb-8">
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
            <p className="text-sm leading-relaxed">
              Bayangkan dirimu bebas dari asap rokok, bernapas lebih lega, dan meraih kesehatan yang lebih baik. Mulailah perjalanan menakjubkan ini dengan menetapkan tanggal berhentimu sekarang. Setiap hari tanpanya adalah kemenangan!
            </p>
          </div>

          {/* Continue Button */}
          {selectedDays && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Button
                className="w-full bg-accent hover:bg-accent/90 text-white"
                size="lg"
                onClick={handleContinue}
              >
                Lanjutkan
              </Button>
            </motion.div>
          )}
        </div>
        {/* Background Image */}
        <img
          src={assetsfirstpage}
          alt="Decorative background graphic"
          className="absolute bottom-0 right-0 w-[90%] max-w-xs pointer-events-none opacity-80"
        />
      </div>
    </div>
  );
};

export default TimeSelectionScreen;