import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/ui/app-header";

const AIResultPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <AppHeader />

      {/* Main Content */}
      <div className="px-4 py-6">
        <h1 className="text-xl font-bold text-gray-800 mb-8">AI Result Support</h1>
        
        {/* AI Icon */}
        <div className="flex justify-center mb-8 animate-bounce-in">
          <div className="w-20 h-20 border-2 border-dashed border-primary rounded-full flex items-center justify-center">
            <Bot className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center mb-8 animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Saran AI Sudah Siap!</h2>
          <p className="text-gray-600 leading-relaxed">
            Berdasarkan masukan Anda, berikut adalah beberapa strategi yang dipersonalisasi untuk membantu Anda tetap di jalur yang benar.
          </p>
        </div>

        {/* AI Advice Card */}
        <div className="bg-green-50 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Rangkuman & Saran</h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            Anda melakukannya dengan baik! Tampaknya keinginan terbesar Anda muncul saat stres. Coba latihan pernapasan dalam atau berjalanjalan singkat saat Anda merasakan dorongan itu datang. Anda kuat!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate("/craving-support")}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl"
          >
            Saya Merasa Lebih Baik
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIResultPage;