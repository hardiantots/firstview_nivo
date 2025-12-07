'use client'

import { useState, useEffect, useMemo, FC } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle, Lock, Leaf, Shield, Award, Target,
  Zap, Heart, LucideIcon, Trophy, X
} from "lucide-react";
import Sidebar from "../Sidebar";
import { AppHeader } from "@/components/ui/app-header";
import { Button } from "@/components/ui/button";
import backimg3 from "@/assets/backimg3.png";
import { motion, AnimatePresence } from "framer-motion";
import { getOrCreateUserStats, updateUserStats } from "@/lib/db/userStats";
import { getUserStats, fetchUserJourneyStats } from "@/lib/db/userJourneyStats";
import { 
  getAchievementsForPhase, 
  getRewardMilestones, 
  checkAchievementCondition,
  calculateTotalXp,
  getNextReward,
  getUnlockedRewards,
  type Achievement,
  type Reward
} from "@/lib/achievementUtils";
import { AuthStorage } from "@/lib/auth-storage";

// Types are imported from achievementUtils

const PencapaianPage = () => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "milestone" | "behavior">("all");
  const [userCondition, setUserCondition] = useState<"PRE_QUIT" | "POST_QUIT">("PRE_QUIT");
  const [totalXp, setTotalXp] = useState(0);
  const [lastUnlockedReward, setLastUnlockedReward] = useState<Reward | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [milestoneData, setMilestoneData] = useState<Achievement[]>([]);
  const [behaviorData, setBehaviorData] = useState<Achievement[]>([]);
  const [rewardMilestones, setRewardMilestones] = useState<Reward[]>([]);

  // Load and compute achievements based on user data
  useEffect(() => {
    const fetchAndComputeAchievements = async () => {
      const storedUserId = AuthStorage.getUserId();
      const phase = (localStorage.getItem("userPhase") as "PRE_QUIT" | "POST_QUIT") || "PRE_QUIT";
      
      setUserId(storedUserId);
      setUserCondition(phase);

      // Get achievements from JSON
      const { milestones, behaviors } = getAchievementsForPhase(phase);
      const rewards = getRewardMilestones();

      if (!storedUserId) {
        setMilestoneData(milestones);
        setBehaviorData(behaviors);
        setRewardMilestones(rewards);
        return;
      }

      try {
        // Fetch user stats from database
        const stats = await fetchUserJourneyStats(storedUserId);
        const userStats = await getUserStats(storedUserId);
        
        const streakDays = stats?.streakDays || 0;
        const cravingsRejected = userStats?.cravings_rejected || 0;
        const productiveActivities = userStats?.productive_activities || 0;

        // Check each achievement condition
        const updatedMilestones = milestones.map((ach) => {
          const completed = checkAchievementCondition(ach.condition, {
            streakDays,
            cravingsRejected,
            productiveActivities,
          });
          return {
            ...ach,
            completed,
            locked: !completed,
          };
        });

        const updatedBehaviors = behaviors.map((ach) => {
          const completed = checkAchievementCondition(ach.condition, {
            streakDays,
            cravingsRejected,
            productiveActivities,
          });
          return {
            ...ach,
            completed,
            locked: !completed,
          };
        });

        setMilestoneData(updatedMilestones);
        setBehaviorData(updatedBehaviors);

        // Calculate total XP
        const allAchievements = [...updatedMilestones, ...updatedBehaviors];
        const xpTotal = calculateTotalXp(allAchievements);
        setTotalXp(xpTotal);

        // Update rewards unlocked status
        const unlockedRewardsList = getUnlockedRewards(xpTotal, rewards);
        const updatedRewards = rewards.map((r) => ({
          ...r,
          unlocked: unlockedRewardsList.some((ur) => ur.id === r.id),
        }));
        setRewardMilestones(updatedRewards);

        // Save to database
        const completedIds = allAchievements.filter((a) => a.completed).map((a) => a.id);
        await updateUserStats(storedUserId, {
          total_xp: xpTotal,
          completed_achievements: completedIds,
        });
      } catch (e) {
        console.error("Error fetching achievements data:", e);
        // Use defaults on error
        setMilestoneData(milestones);
        setBehaviorData(behaviors);
        setRewardMilestones(rewards);
      }
    };

    fetchAndComputeAchievements();
  }, []);

  const allAchievements = useMemo(() => [...milestoneData, ...behaviorData], [milestoneData, behaviorData]);

  const achievementsToShow = useMemo(() => {
    switch (activeTab) {
      case "milestone": return milestoneData;
      case "behavior": return behaviorData;
      default: return allAchievements;
    }
  }, [activeTab, milestoneData, behaviorData, allAchievements]);

  // Hitung rewards yang sudah unlock
  const unlockedRewards = useMemo(() => {
    return rewardMilestones.filter(reward => reward.unlocked);
  }, [rewardMilestones]);

  // Dapatkan reward berikutnya
  const nextReward = useMemo(() => {
    return getNextReward(totalXp, rewardMilestones);
  }, [totalXp, rewardMilestones]);

  useEffect(() => {
    const checkRewards = async () => {
      if (!userId || rewardMilestones.length === 0) return;
      
      const stats = await getOrCreateUserStats(userId);
      const prevXp = stats?.last_reward_xp ?? 0;

      const newlyUnlocked = rewardMilestones.filter(
        (r) => prevXp < r.xpRequired && totalXp >= r.xpRequired
      );

      if (newlyUnlocked.length > 0) {
        const reward = newlyUnlocked[0];
        setLastUnlockedReward(reward);
        setShowRewardModal(true);

        await updateUserStats(userId, { last_reward_xp: totalXp });
      }
    };

    checkRewards();
  }, [totalXp, userId, rewardMilestones]);

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
        <div className={`mt-2 text-xs font-semibold ${isCompleted ? "text-yellow-200" : "text-gray-400"}`}>
          +{achievement.xp} XP
        </div>
        {isCompleted && <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-white" />}
      </motion.div>
    );
  };

  const RewardCard: FC<{ reward: Reward; index: number }> = ({ reward, index }) => {
    const RewardIcon = reward.icon;
    const progress = (totalXp / reward.xpRequired) * 100;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        className={`rounded-2xl p-4 text-center border-2 transition-all duration-300 ${
          reward.unlocked
            ? "bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-600 shadow-lg"
            : "bg-gray-100 border-gray-300"
        }`}
      >
        <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
          reward.unlocked ? "bg-white/20" : "bg-gray-300"
        }`}>
          <RewardIcon className={`w-8 h-8 ${reward.unlocked ? "text-white" : "text-gray-500"}`} />
        </div>
        <h3 className={`font-bold text-sm mb-1 ${reward.unlocked ? "text-white" : "text-gray-700"}`}>
          {reward.name}
        </h3>
        <p className={`text-xs mb-3 ${reward.unlocked ? "text-white/80" : "text-gray-600"}`}>
          {reward.description}
        </p>
        <div className="w-full bg-white/30 rounded-full h-2 mb-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${reward.unlocked ? "bg-white" : "bg-gray-400"}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className={`text-xs font-semibold ${reward.unlocked ? "text-white" : "text-gray-600"}`}>
          {reward.unlocked ? "✓ Unlocked" : `${totalXp}/${reward.xpRequired} XP`}
        </span>
        {reward.unlocked && (
          <button
            className="mt-3 w-full text-xs font-semibold bg-yellow-600 hover:bg-yellow-700 text-white py-1.5 rounded-lg transition-colors"
            onClick={() => {
              alert(`Reward "${reward.name}" berhasil diklaim (simulasi).`);
            }}
          >
            Redeem Reward
          </button>
        )}
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
    <div className="flex flex-col min-h-screen bg-cover bg-center relative max-w-md mx-auto md:max-w-lg lg:max-w-xl">
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

        {/* XP & Reward Section */}
        <div className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-sm opacity-90">Total XP Terkumpul</p>
              <p className="text-3xl font-bold">{totalXp}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Badges Unlock</p>
              <p className="text-3xl font-bold">{unlockedRewards.length}/{rewardMilestones.length}</p>
            </div>
          </div>
          {nextReward && (
            <div className="bg-white/20 rounded-lg p-2">
              <p className="text-xs opacity-90">Next Reward: <span className="font-semibold">{nextReward.name}</span></p>
              <p className="text-xs opacity-90">{nextReward.xpRequired - totalXp} XP remaining</p>
            </div>
          )}
        </div>

        {/* Rewards Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Reward Badges</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rewardMilestones.map((reward, index) => (
              <RewardCard key={`reward-${reward.id}`} reward={reward} index={index} />
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-full overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={`tab-${tab.id}`}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
          {achievementsToShow.map((achievement, i) => (
            <AchievementCard key={`achievement-${achievement.id}`} achievement={achievement} index={i} />
          ))}
        </div>

        {/* Reward Unlock Modal - Fullscreen Overlay */}
        <AnimatePresence>
          {showRewardModal && lastUnlockedReward && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={() => setShowRewardModal(false)}
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-3xl shadow-2xl p-8 w-full max-w-md relative border-4 border-yellow-400"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowRewardModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>

                {/* Reward Icon */}
                <div className="mb-6 relative">
                  <motion.div
                    animate={{ 
                      rotate: [0, -10, 10, -10, 10, 0],
                      scale: [1, 1.1, 1.1, 1.1, 1.1, 1]
                    }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-xl"
                  >
                    {(() => {
                      const RewardIcon = lastUnlockedReward.icon;
                      return <RewardIcon className="w-12 h-12 text-white" />;
                    })()}
                  </motion.div>
                  {/* Sparkles Effect */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="text-yellow-400 text-4xl"
                    >
                      ✨
                    </motion.div>
                  </div>
                </div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-gray-800 mb-2 text-center"
                >
                  🎉 Selamat! 🎉
                </motion.h2>

                {/* Reward Name */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-4 bg-white/60 rounded-xl p-3 border-2 border-yellow-300"
                >
                  <p className="text-lg font-bold text-amber-700 text-center">
                    {lastUnlockedReward.name}
                  </p>
                </motion.div>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-gray-700 mb-6 text-center leading-relaxed"
                >
                  Kamu baru saja membuka reward{" "}
                  <span className="font-semibold text-amber-700">{lastUnlockedReward.name}</span>
                  {userCondition === "PRE_QUIT"
                    ? " sebagai apresiasi fase persiapanmu. Terus lanjutkan langkah kecilmu! 💪"
                    : " atas konsistensimu di fase POST-QUIT. Kamu adalah inspirasi! 🌟"}
                </motion.p>

                {/* XP Badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="flex items-center justify-center gap-2 mb-6"
                >
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    +{lastUnlockedReward.xpRequired} XP Milestone!
                  </div>
                </motion.div>

                {/* Action Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold py-3 rounded-xl shadow-lg"
                    onClick={() => setShowRewardModal(false)}
                  >
                    Lanjutkan Perjalanan 🚀
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PencapaianPage;
