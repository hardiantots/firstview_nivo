'use client'

import { useState, useEffect, useMemo, FC } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle, Lock, Leaf, Shield, Award, Target,
  Zap, Heart, LucideIcon
} from "lucide-react";
import Sidebar from "../Sidebar";
import { AppHeader } from "@/components/ui/app-header";
import backimg3 from "@/assets/backimg3.png";
import { motion } from "framer-motion";

type Achievement = {
  id: number;
  icon: LucideIcon;
  title: string;
  description: string;
  completed: boolean;
  locked?: boolean;
};

/* ===== ACHIEVEMENT DATA ===== */
const PRE_QUIT_MILESTONES: Achievement[] = [
  { id: 1, icon: Leaf, title: "Langkah Pertama", description: "Mendaftar dan mulai perjalanan berhenti merokok.", completed: true },
  { id: 2, icon: Zap, title: "Hari Tanpa Asap", description: "Menjalani 1 hari tanpa rokok.", completed: true },
  { id: 3, icon: Heart, title: "Minggu Kebebasan", description: "Menjalani 7 hari tanpa rokok.", completed: false, locked: true },
  { id: 4, icon: Shield, title: "Bulan Pertama", description: "Menjaga komitmen selama 30 hari.", completed: false, locked: true },
];

const PRE_QUIT_BEHAVIOR: Achievement[] = [
  { id: 1, icon: Target, title: "Pemula Pengendali Diri", description: "Berhasil menolak satu keinginan merokok.", completed: true },
  { id: 2, icon: Shield, title: "Kuat Menghadapi Godaan", description: "Menolak lima kali keinginan merokok.", completed: false, locked: true },
];

const POST_QUIT_MILESTONES: Achievement[] = [
  { id: 1, icon: Leaf, title: "Pelanjut Kebebasan", description: "Menjaga 30 hari penuh bebas rokok.", completed: true },
  { id: 2, icon: Award, title: "100 Hari Konsisten", description: "Melewati 100 hari tanpa rokok.", completed: true },
  { id: 3, icon: Shield, title: "Setahun Penuh", description: "Menjaga 365 hari tanpa rokok.", completed: false, locked: true },
];

const POST_QUIT_BEHAVIOR: Achievement[] = [
  { id: 1, icon: Target, title: "Kembali Fokus", description: "Menggantikan waktu merokok dengan aktivitas produktif.", completed: true },
  { id: 2, icon: Zap, title: "Stabil Tanpa Ketergantungan", description: "Sebulan tanpa keinginan kembali merokok.", completed: false, locked: true },
];

const PencapaianPage = () => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "milestone" | "behavior">("all");
  const [userCondition, setUserCondition] = useState<"PRE_QUIT" | "POST_QUIT">("POST_QUIT");

  // Ambil status dari HomePage
  useEffect(() => {
    const condition = localStorage.getItem("userCondition");
    if (condition === "PRE_QUIT" || condition === "POST_QUIT") {
      setUserCondition(condition);
    }
  }, []);

  // Tentukan dataset berdasarkan kondisi user
  const milestoneData = userCondition === "PRE_QUIT" ? PRE_QUIT_MILESTONES : POST_QUIT_MILESTONES;
  const behaviorData = userCondition === "PRE_QUIT" ? PRE_QUIT_BEHAVIOR : POST_QUIT_BEHAVIOR;

  const allAchievements = useMemo(() => [...milestoneData, ...behaviorData], [milestoneData, behaviorData]);

  const achievementsToShow = useMemo(() => {
    switch (activeTab) {
      case "milestone": return milestoneData;
      case "behavior": return behaviorData;
      default: return allAchievements;
    }
  }, [activeTab, milestoneData, behaviorData, allAchievements]);

  const AchievementCard: FC<{ achievement: Achievement, index: number }> = ({ achievement, index }) => {
    const IconComp = achievement.icon;
    const isLocked = achievement.locked;
    const isCompleted = achievement.completed;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`relative rounded-2xl p-4 text-center shadow-md border transition-all duration-300 ${
          isCompleted
            ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
            : isLocked
            ? "bg-gray-700 text-gray-300 border-gray-600"
            : "bg-gray-100 text-gray-800 border-gray-200"
        }`}
      >
        <div className="relative w-14 h-14 mx-auto mb-2 rounded-full flex items-center justify-center bg-white/10">
          <IconComp className={`w-8 h-8 ${isCompleted ? "text-white" : "text-gray-400"}`} />
          {isLocked && <Lock className="absolute w-6 h-6 text-gray-500" />}
        </div>
        <h3 className="font-bold text-sm mb-1">{achievement.title}</h3>
        <p className="text-xs opacity-90">{achievement.description}</p>
        {isCompleted && <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-white" />}
      </motion.div>
    );
  };

  const tabs = useMemo(() => [
    { id: "all" as const, label: "Semua" },
    { id: "milestone" as const, label: "Perjalanan" },
    { id: "behavior" as const, label: "Kebiasaan" },
  ], []);

  /* ==== RENDER ==== */
  return (
    <div className="flex flex-col min-h-screen bg-cover bg-center relative">
      {/* Background Image */}
      <Image
        src={backimg3}
        alt="Background"
        fill
        className="object-cover -z-10"
        priority
      />
      
      {/* Header Components */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Konten dengan latar belakang semi-transparan */}
      <div className="px-4 py-6 bg-white/60 backdrop-blur-sm relative z-10">
        {/* Header Informasi */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-green-900 mb-1">
            {userCondition === "PRE_QUIT" ? "Perjalanan Menuju Bebas Rokok" : "Pencapaianmu Sejauh Ini"}
          </h1>
          <p className="text-gray-500 text-sm">
            {userCondition === "PRE_QUIT"
              ? "Langkah kecilmu hari ini adalah bagian besar dari perubahan besar ke depan."
              : "Setiap hari yang kamu lalui tanpa rokok adalah bukti nyata kekuatan dirimu."}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-full overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "all" | "milestone" | "behavior")}
                className={`${
                  activeTab === tab.id ? "bg-white text-primary shadow" : "text-gray-600"
                } flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Achievement Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievementsToShow.map((achievement, i) => (
            <AchievementCard key={achievement.id} achievement={achievement} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PencapaianPage;
