import { useState, useMemo, FC } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Lock, Crown, Coins, Target, Zap, Leaf, Shield, Award, LucideIcon, Heart } from "lucide-react";
import Sidebar from "../Sidebar";
import { AppHeader } from "@/components/ui/app-header";
import { motion } from "framer-motion";

type Achievement = {
  id: number;
  icon: LucideIcon;
  title: string;
  description: string;
  completed: boolean;
  locked?: boolean;
  xp: number;
};

const PencapaianPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "milestone" | "mastery" | "savings">("all");

  const milestoneRewards: Achievement[] = [
    { 
      id: 1, 
      icon: Leaf, 
      title: "Nafas Pertama", 
      description: "1 hari bebas rokok", 
      completed: true,
      xp: 50
    },
    { 
      id: 2, 
      icon: Zap, 
      title: "Memutus Rantai", 
      description: "3 hari bebas rokok", 
      completed: true,
      xp: 100
    },
    { 
      id: 3, 
      icon: Award, 
      title: "Seven Dawn", 
      description: "7 hari bebas rokok", 
      completed: true,
      xp: 200
    },
    { 
      id: 4, 
      icon: Heart, 
      title: "Vena Bersih", 
      description: "14 hari bebas rokok", 
      completed: false,
      locked: true,
      xp: 300
    },
    { 
      id: 5, 
      icon: Shield, 
      title: "Kekuatan Sunyi", 
      description: "21 hari bebas rokok", 
      completed: false,
      locked: true,
      xp: 400
    },
    { 
      id: 6, 
      icon: Leaf, 
      title: "Paru-paru Terlahir Kembali", 
      description: "30 hari bebas rokok", 
      completed: false,
      locked: true,
      xp: 500
    },
    { 
      id: 7, 
      icon: Crown, 
      title: "Titik Balik", 
      description: "45 hari bebas rokok", 
      completed: false,
      locked: true,
      xp: 750
    },
    { 
      id: 8, 
      icon: Award, 
      title: "Penakluk Keinginan", 
      description: "60 hari bebas rokok", 
      completed: false,
      locked: true,
      xp: 1000
    }
  ];

  const triggerMastery: Achievement[] = [
    { 
      id: 1, 
      icon: Target, 
      title: "Pemula Penakluk Pemicu", 
      description: "Melawan 1 keinginan", 
      completed: true,
      xp: 75
    },
    { 
      id: 2, 
      icon: Shield, 
      title: "Ahli Pemicu", 
      description: "Melawan 5 keinginan", 
      completed: true,
      xp: 200
    },
    { 
      id: 3, 
      icon: Crown, 
      title: "Master Pemicu", 
      description: "Melawan 15 keinginan", 
      completed: false,
      locked: true,
      xp: 500
    }
  ];

  const savingsAchievements: Achievement[] = [
    { 
      id: 1, 
      icon: Coins, 
      title: "Tabungan Pertama", 
      description: "Menghemat Rp100.000", 
      completed: true,
      xp: 100
    },
    { 
      id: 2, 
      icon: Coins, 
      title: "Penabung Cerdas", 
      description: "Menghemat Rp500.000", 
      completed: false,
      locked: true,
      xp: 300
    },
    { 
      id: 3, 
      icon: Coins, 
      title: "Pembangun Kekayaan", 
      description: "Menghemat Rp1.000.000", 
      completed: false,
      locked: true,
      xp: 800
    }
  ];

  const allAchievements = useMemo(() => 
    [...milestoneRewards, ...triggerMastery, ...savingsAchievements], 
    []
  );

  const totalAchievements = allAchievements.length;
  const completedAchievements = allAchievements.filter(a => a.completed).length;
  const completedPercentage = totalAchievements > 0 ? (completedAchievements / totalAchievements) * 100 : 0;

  // Gamification Stats
  const totalXp = useMemo(() => allAchievements.filter(a => a.completed).reduce((sum, a) => sum + a.xp, 0), [allAchievements]);
  const level = useMemo(() => Math.floor(totalXp / 1000) + 1, [totalXp]);
  const xpForNextLevel = 1000;
  const currentLevelXp = totalXp % xpForNextLevel;
  const xpPercentage = (currentLevelXp / xpForNextLevel) * 100;

  const achievementsToShow = useMemo(() => {
    switch (activeTab) {
      case "milestone": return milestoneRewards;
      case "mastery": return triggerMastery;
      case "savings": return savingsAchievements;
      default: return allAchievements;
    }
  }, [activeTab, allAchievements]);

  const AchievementCard: FC<{ achievement: Achievement, index: number }> = ({ achievement, index }) => {
    const IconComponent = achievement.icon;
    const isCompleted = achievement.completed;
    const isLocked = !isCompleted && achievement.locked;

    const cardVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { delay: index * 0.05 } },
    };

    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className={`relative rounded-2xl p-4 text-center transition-all duration-300 shadow-lg border ${
          isCompleted
            ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-yellow-500"
            : isLocked
            ? "bg-gray-700 border-gray-600" // Gaya baru untuk kartu terkunci
            : "bg-gray-100 border-gray-200" // Gaya default
        }`}
      >
        <div className={`relative w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
            isCompleted ? 'bg-white/20' : isLocked ? 'bg-gray-800' : 'bg-gray-200'
        }`}>
          <IconComponent className={`w-8 h-8 ${
              isCompleted ? 'text-white' : isLocked ? 'text-gray-500' : 'text-gray-400'
          }`} strokeWidth={2} />
          {/* Ikon gembok untuk menandakan terkunci */}
          {isLocked && <Lock className="absolute w-6 h-6 text-gray-500" />}
        </div>
        <h3 className={`font-bold text-sm mb-1 ${
            isCompleted ? 'text-white' : isLocked ? 'text-white/90' : 'text-gray-800'
        }`}>{achievement.title}</h3>
        <p className={`text-xs mb-2 ${
            isCompleted ? 'text-white/80' : isLocked ? 'text-gray-400' : 'text-gray-500'
        }`}>{achievement.description}</p>
        <div className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
            isCompleted ? 'bg-white/20 text-white' : isLocked ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
        }`}>
          +{achievement.xp} XP
        </div>
        {isCompleted && <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-white" />}
      </motion.div>
    );
  };

  const tabs = [
    { id: "all", label: "Semua" },
    { id: "milestone", label: "Milestone" },
    { id: "mastery", label: "Mastery" },
    { id: "savings", label: "Tabungan" },
  ];

  return (
    <div className="flex flex-col bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Main Content */}
      <div className="flex-1 px-4 py-6">
        <motion.h1 
          className="text-2xl font-bold text-gray-800 mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Pencapaian
        </motion.h1>

        {/* XP and Level Card */}
        <motion.div 
          className="bg-gradient-to-br from-primary to-orange-500 rounded-2xl p-5 mb-6 text-white shadow-xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-lg">Level {level}</span>
            <span className="font-bold text-lg">{totalXp.toLocaleString()} <span className="text-sm font-normal opacity-80">XP</span></span>
          </div>
          <div className="bg-white/20 rounded-full h-2.5 w-full mb-1">
            <motion.div 
              className="bg-yellow-300 h-2.5 rounded-full" 
              initial={{ width: 0 }}
              animate={{ width: `${xpPercentage}%` }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </div>
          <div className="text-right text-xs opacity-80">
            {currentLevelXp.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP menuju Level {level + 1}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 sm:space-x-2 bg-gray-100 p-1 rounded-full overflow-x-auto">
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

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {achievementsToShow.map((achievement, index) => (
            <AchievementCard key={achievement.id} achievement={achievement} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PencapaianPage;