import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-sm mx-auto">
        {/* NIVO Logo */}
        <div className="flex justify-center mb-8 pt-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
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
            <span className="text-xl font-bold text-primary">NIVO</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-lg font-bold text-foreground leading-tight mb-4">
            Satu Langkah Menuju<br />
            Kehidupan Baru: Tetapkan<br />
            Tanggal Berhentimu!
          </h1>
          <p className="text-sm font-medium text-foreground">
            Pilih salah satu di bawah ini:
          </p>
        </div>

        {/* Time Options */}
        <div className="grid grid-cols-2 gap-3 mb-8 animate-slide-up">
          {timeOptions.map((option) => (
            <Button
              key={option.days}
              variant={selectedDays === option.days ? "default" : "outline"}
              className={`h-12 font-medium ${
                selectedDays === option.days
                  ? "bg-accent hover:bg-accent/90 text-white"
                  : "bg-accent hover:bg-accent/90 text-white border-accent"
              }`}
              onClick={() => setSelectedDays(option.days)}
            >
              {option.label}
            </Button>
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
          <Button
            className="w-full bg-accent hover:bg-accent/90 text-white"
            size="lg"
            onClick={handleContinue}
          >
            Lanjutkan
          </Button>
        )}
      </div>
    </div>
  );
};

export default TimeSelectionScreen;