import { useState, useEffect, useMemo, FC } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle, Lock, Leaf, Shield, Award, Target,
  Zap, Coins, Heart, Smile, Handshake, LucideIcon
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

const PencapaianPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "milestone" | "behavior" | "social">("all");
  const [userCondition, setUserCondition] = useState<"PRE_QUIT" | "POST_QUIT">("PRE_QUIT");

  // Ambil status dari HomePage
  useEffect(() => {
    const condition = localStorage.getItem("userCondition");
    if (condition === "PRE_QUIT" || condition === "POST_QUIT") {
      setUserCondition(condition);
    }
  }, []);

  /* ===== PRE-QUIT ===== */
  const preQuitMilestones: Achievement[] = [
    { id: 1, icon: Leaf, title: "Langkah Pertama", description: "Mendaftar dan mulai perjalanan berhenti merokok.", completed: true },
    { id: 2, icon: Zap, title: "Hari Tanpa Asap", description: "Menjalani 1 hari tanpa rokok.", completed: true },
    { id: 3, icon: Heart, title: "Minggu Kebebasan", description: "Menjalani 7 hari tanpa rokok.", completed: false, locked: true },
    { id: 4, icon: Shield, title: "Bulan Pertama", description: "Menjaga komitmen selama 30 hari.", completed: false, locked: true },
  ];

  const preQuitBehavior: Achievement[] = [
    { id: 1, icon: Target, title: "Pemula Pengendali Diri", description: "Berhasil menolak satu keinginan merokok.", completed: true },
    { id: 2, icon: Shield, title: "Kuat Menghadapi Godaan", description: "Menolak lima kali keinginan merokok.", completed: false, locked: true },
  ];

  const preQuitSocial: Achievement[] = [
    { id: 1, icon: Handshake, title: "Dukungan Pertama", description: "Menceritakan niat berhenti merokok ke teman.", completed: true },
    { id: 2, icon: Smile, title: "Berbagi Semangat", description: "Memberi semangat ke pengguna lain.", completed: false, locked: true },
  ];

  /* ===== POST-QUIT ===== */
  const postQuitMilestones: Achievement[] = [
    { id: 1, icon: Leaf, title: "Pelanjut Kebebasan", description: "Menjaga 30 hari penuh bebas rokok.", completed: true },
    { id: 2, icon: Award, title: "100 Hari Konsisten", description: "Melewati 100 hari tanpa rokok.", completed: true },
    { id: 3, icon: Shield, title: "Setahun Penuh", description: "Menjaga 365 hari tanpa rokok.", completed: false, locked: true },
  ];

  const postQuitBehavior: Achievement[] = [
    { id: 1, icon: Target, title: "Kembali Fokus", description: "Menggantikan waktu merokok dengan aktivitas produktif.", completed: true },
    { id: 2, icon: Zap, title: "Stabil Tanpa Ketergantungan", description: "Sebulan tanpa keinginan kembali merokok.", completed: false, locked: true },
  ];

  const postQuitSocial: Achievement[] = [
    { id: 1, icon: Handshake, title: "Menginspirasi Orang Lain", description: "Membagikan kisah berhenti merokok kepada orang lain.", completed: true },
    { id: 2, icon: Smile, title: "Mentor Dukungan", description: "Mendukung pengguna lain untuk tetap bebas rokok.", completed: false, locked: true },
  ];

  // Tentukan dataset berdasarkan kondisi user
  const milestoneData = userCondition === "PRE_QUIT" ? preQuitMilestones : postQuitMilestones;
  const behaviorData = userCondition === "PRE_QUIT" ? preQuitBehavior : postQuitBehavior;
  const socialData = userCondition === "PRE_QUIT" ? preQuitSocial : [];

  const allAchievements = useMemo(() => [...milestoneData, ...behaviorData, ...socialData], [userCondition]);

  const achievementsToShow = useMemo(() => {
    switch (activeTab) {
      case "milestone": return milestoneData;
      case "behavior": return behaviorData;
      case "social": return socialData;
      default: return allAchievements;
    }
  }, [activeTab, userCondition]);

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
    { id: "all", label: "Semua" },
    { id: "milestone", label: "Perjalanan" },
    { id: "behavior", label: "Kebiasaan" },
    ...(userCondition === "PRE_QUIT" ? [{ id: "social", label: "Dukungan" }] : []),
  ], [userCondition]);

  /* ==== RENDER ==== */
  return (
    <div
      className="flex flex-col min-h-screen bg-cover bg-center"
      style={{
        backgroundImage: `url(${backimg3})`,
      }}
    >
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Konten dengan latar belakang semi-transparan */}
      <div className="flex-1 px-4 py-6 bg-white/60 backdrop-blur-sm">
        {/* Header Informasi */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
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
                onClick={() => setActiveTab(tab.id as any)}
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
