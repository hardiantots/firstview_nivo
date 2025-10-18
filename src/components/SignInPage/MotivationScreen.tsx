import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MotivationScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedDays = location.state?.selectedDays || 30;
  
  const [motivation, setMotivation] = useState("");
  const maxLength = 120;

  const handleSubmit = () => {
    if (motivation.trim()) {
      // Here you would typically save the data and navigate to dashboard
      console.log("Motivation:", motivation);
      console.log("Selected days:", selectedDays);
      // Navigate to home page after completion
      navigate("/home");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
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
          <h1 className="text-lg font-bold text-foreground mb-3">
            Apa alasan terkuatmu untuk<br />berhenti?
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tuliskan di bawah ini untuk menjadi pengingat<br />
            di sepanjang perjalananmu.
          </p>
        </div>

        {/* Motivation Input */}
        <div className="mb-6 animate-bounce-in">
          <Textarea
            value={motivation}
            onChange={(e) => {
              if (e.target.value.length <= maxLength) {
                setMotivation(e.target.value);
              }
            }}
            placeholder="Contoh: Untuk kesehatan anak saya dan bisa melihatnya tumbuh dewasa."
            className="min-h-[120px] resize-none text-sm"
            maxLength={maxLength}
          />
          <div className="flex justify-end mt-2">
            <span className="text-xs text-muted-foreground">
              {motivation.length}/{maxLength}
            </span>
          </div>
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
          <p className="text-xs leading-relaxed">
            Apa alasan terkuatmu untuk berhenti? Entah itu demi keluarga tercinta, demi kesehatanmu sendiri, atau demi masa depan yang lebih cerah, kekuatan dari dalam dirimu. Bayangkan hidup bebas dari rokok, bernapas lega, dan meraih kesehatan yang prima. Setiap hari tanpa rokok adalah bukti kekuatanmu!
          </p>
        </div>

        {/* Submit Button */}
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-white"
          size="lg"
          onClick={handleSubmit}
          disabled={!motivation.trim()}
        >
          Selesai & Mulai Perjalananmu
        </Button>
      </div>
    </div>
  );
};

export default MotivationScreen;