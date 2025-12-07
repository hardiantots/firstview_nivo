"use client";

import { AppHeader } from "@/components/ui/app-header";
import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const BreathingExercisePage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    const maxCounts = {
      inhale: 4,
      hold: 7,
      exhale: 8,
    } as const;

    const timer = setInterval(() => {
      setCount((prev) => {
        const next = prev + 1;
        const limit = maxCounts[phase];
        if (next > limit) {
          if (phase === "inhale") {
            setPhase("hold");
            return 0;
          }
          if (phase === "hold") {
            setPhase("exhale");
            return 0;
          }
          if (phase === "exhale") {
            setPhase("inhale");
            return 0;
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, isRunning]);

  const getInstruction = () => {
    if (phase === "inhale") return "Tarik napas perlahan lewat hidung selama 4 hitungan.";
    if (phase === "hold") return "Tahan napas lembut selama 7 hitungan.";
    return "Hembuskan napas pelan lewat mulut selama 8 hitungan.";
  };

  const getPhaseLabel = () => {
    if (phase === "inhale") return "Tarik Napas";
    if (phase === "hold") return "Tahan";
    return "Hembuskan";
  };

  const handleStart = () => {
    setIsRunning(true);
    setPhase("inhale");
    setCount(0);
  };

  const handleStop = () => {
    setIsRunning(false);
    setCount(0);
  };

  return (
    <div className="relative max-w-md mx-auto md:max-w-lg lg:max-w-xl">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      <main className="px-3 sm:px-4 py-6 space-y-6">
        <motion.h1
          className="text-xl font-bold text-green-900"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Latihan Napas 4-7-8
        </motion.h1>

        <motion.section
          className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm text-gray-700">
            Teknik napas 4-7-8 diperkenalkan oleh Dr. Andrew Weil dan sering
            digunakan dalam latihan relaksasi. Pola ini membantu menenangkan
            sistem saraf dengan memperlambat ritme napas dan memberi sinyal pada
            tubuh bahwa kondisi aman.
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Posisi duduk tegak namun rileks, bahu diturunkan.</li>
            <li>Letakkan ujung lidah di belakang gigi seri atas, di langit-langit mulut.</li>
            <li>Tarik napas perlahan lewat hidung selama 4 hitungan.</li>
            <li>Tahan napas lembut selama 7 hitungan.</li>
            <li>Hembuskan napas perlahan lewat mulut selama 8 hitungan dengan suara lembut.</li>
          </ul>
          <p className="text-xs text-gray-500">
            Catatan: Latihan ini diadaptasi dari teknik yang banyak digunakan
            dalam literatur kesehatan dan praktik mindfulness modern.
          </p>
        </motion.section>

        <motion.section
          className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-6 text-center text-white space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-medium tracking-wide uppercase">
            Panduan Interaktif
          </p>
          <p className="text-sm text-white/90">Ikuti lingkaran dan hitungan di layar.</p>

          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-full border-4 border-white/40 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-white/80 mb-1">
                {getPhaseLabel()}
              </span>
              <span className="text-4xl font-bold">{count}</span>
            </div>
            <p className="text-sm text-white/90 max-w-xs">{getInstruction()}</p>
          </div>

          <div className="flex gap-3 justify-center mt-2">
            {!isRunning ? (
              <Button
                onClick={handleStart}
                className="bg-white text-teal-700 hover:bg-gray-100 font-semibold px-6"
              >
                Mulai Latihan
              </Button>
            ) : (
              <Button
                onClick={handleStop}
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                Selesai
              </Button>
            )}
          </div>

          <p className="text-[11px] text-white/80 mt-2">
            Untuk manfaat optimal, latihan ini dapat diulang 4 siklus berturut-turut
            saat keinginan merokok muncul.
          </p>
        </motion.section>

        <Button
          variant="outline"
          className="w-full border-teal-600 text-teal-700 mt-2"
          onClick={() => router.push("/craving-support")}
        >
          Kembali ke Craving Support
        </Button>
      </main>
    </div>
  );
};

export default BreathingExercisePage;
