'use client'

import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/ui/app-header";

const AIResultPage = () => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  useEffect(() => {
    // Get data from localStorage
    const storedData = localStorage.getItem('aiResultData');
    if (storedData) {
      setAiData(JSON.parse(storedData));
      // Clean up after use
      localStorage.removeItem('aiResultData');
    }
  }, []);

  return (
    <div className="relative min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Main Content Container */}
      <div className="w-full">
        {/* Content with max-width constraint */}
        <div className="px-4 py-8 pt-20 mx-auto max-w-2xl">
          {/* AI Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 border-2 border-dashed border-teal-600 rounded-full flex items-center justify-center bg-transparent">
              <Bot className="w-10 h-10 text-teal-600" />
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center mb-8">
            <p className="text-gray-700 leading-relaxed text-base font-medium">
              Berdasarkan masukan Anda, berikut adalah beberapa strategi yang dipersonalisasi untuk membantu Anda tetap di jalur yang benar.
            </p>
          </div>

          {/* AI Advice Card */}
          <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-200 shadow-sm mb-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">Rangkuman & Saran</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Anda melakukannya dengan baik! Tampaknya keinginan terbesar Anda muncul saat stres. Coba latihan pernapasan dalam atau berjalan singkat saat Anda merasakan dorongan itu datang. Anda kuat!
            </p>
          </div>

          {/* Action Buttons */}
          <Button
            onClick={() => router.push("/craving-support")}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            Saya Merasa Lebih Baik
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIResultPage;