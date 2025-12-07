'use client'

import { useState, useEffect, useMemo, FC } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle, Lock, Leaf, Shield, Award, Target,
  Zap, Heart, LucideIcon, Trophy, X, Gift, ExternalLink, Coins, Star
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
import {
  getOrCreateUserRewards,
  getRewardHistory,
  getUserVouchers,
  redeemVoucher,
  MILESTONES,
  POINTS_FOR_VOUCHER,
  VOUCHER_DISCOUNT,
  MARKETPLACE_LINKS,
  type UserReward,
  type RewardHistory as RewardHistoryType,
  type Voucher
} from "@/lib/db/rewards";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah } from "@/lib/money-utils";

// Types are imported from achievementUtils

const PencapaianPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "milestone" | "behavior" | "rewards">("all");
  const [userCondition, setUserCondition] = useState<"PRE_QUIT" | "POST_QUIT">("PRE_QUIT");
  const [totalXp, setTotalXp] = useState(0);
  const [lastUnlockedReward, setLastUnlockedReward] = useState<Reward | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [milestoneData, setMilestoneData] = useState<Achievement[]>([]);
  const [behaviorData, setBehaviorData] = useState<Achievement[]>([]);
  const [rewardMilestones, setRewardMilestones] = useState<Reward[]>([]);
  
  // Reward system states
  const [userRewards, setUserRewards] = useState<UserReward | null>(null);
  const [rewardHistory, setRewardHistory] = useState<RewardHistoryType[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

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

  // Load reward data
  useEffect(() => {
    const loadRewardData = async () => {
      if (!userId) return;

      try {
        const [rewards, history, userVouchers] = await Promise.all([
          getOrCreateUserRewards(userId),
          getRewardHistory(userId),
          getUserVouchers(userId),
        ]);

        if (rewards) setUserRewards(rewards);
        setRewardHistory(history);
        setVouchers(userVouchers);
      } catch (error) {
        console.error('Error loading reward data:', error);
      }
    };

    loadRewardData();
  }, [userId]);

  const handleRedeemVoucher = async () => {
    if (!userId || !userRewards) return;

    if (userRewards.total_points < POINTS_FOR_VOUCHER) {
      toast({
        title: "Poin Tidak Cukup",
        description: `Kamu membutuhkan ${POINTS_FOR_VOUCHER} poin untuk menukar voucher. Saat ini kamu punya ${userRewards.total_points} poin.`,
        variant: "destructive",
      });
      return;
    }

    setIsRedeeming(true);
    const result = await redeemVoucher(userId);
    setIsRedeeming(false);

    if (result.success && result.voucher) {
      setSelectedVoucher(result.voucher);
      setShowVoucherModal(true);
      
      // Refresh data
      const [updatedRewards, updatedHistory, updatedVouchers] = await Promise.all([
        getOrCreateUserRewards(userId),
        getRewardHistory(userId),
        getUserVouchers(userId),
      ]);

      if (updatedRewards) setUserRewards(updatedRewards);
      setRewardHistory(updatedHistory);
      setVouchers(updatedVouchers);

      toast({
        title: "🎉 Voucher Berhasil Ditukar!",
        description: `Kamu mendapat voucher diskon ${formatRupiah(VOUCHER_DISCOUNT)}!`,
      });
    } else {
      toast({
        title: "Gagal Menukar Voucher",
        description: result.error || "Terjadi kesalahan, silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

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
    { id: "rewards" as const, label: "Reward" },
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

        {/* Reward Points System */}
        <div className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-sm opacity-90 flex items-center gap-1">
                <Coins className="w-4 h-4" />
                Poin Reward
              </p>
              <p className="text-3xl font-bold">{userRewards?.total_points || 0}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Streak Saat Ini</p>
              <p className="text-3xl font-bold">{userRewards?.current_streak || 0} hari</p>
            </div>
          </div>
          
          {/* Milestone Progress */}
          <div className="bg-white/20 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold mb-2">Milestone Streak:</p>
            {Object.entries(MILESTONES).map(([days, config]) => {
              const dayNum = parseInt(days);
              const achieved = userRewards?.milestones_achieved?.includes(dayNum) || false;
              return (
                <div key={days} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    {achieved ? <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" /> : <Star className="w-3 h-3" />}
                    {config.label}
                  </span>
                  <span className="font-semibold">+{config.points} poin</span>
                </div>
              );
            })}
          </div>

          {/* Redeem Button */}
          {(userRewards?.total_points || 0) >= POINTS_FOR_VOUCHER && (
            <Button
              onClick={handleRedeemVoucher}
              disabled={isRedeeming}
              className="w-full mt-3 bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold"
            >
              <Gift className="w-4 h-4 mr-2" />
              {isRedeeming ? "Menukar..." : `Tukar ${POINTS_FOR_VOUCHER} Poin untuk Voucher`}
            </Button>
          )}
        </div>

        {/* XP & Badge Section */}
        <div className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg">
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
                onClick={() => setActiveTab(tab.id as "all" | "milestone" | "behavior" | "rewards")}
                className={`${
                  activeTab === tab.id ? "bg-white text-primary shadow" : "text-gray-600"
                } flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        {activeTab === "rewards" ? (
          /* Rewards Tab Content */
          <div className="space-y-4 pb-4">
            {/* Active Vouchers */}
            {vouchers.filter(v => v.status === 'active').length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">Voucher Aktif</h3>
                <div className="space-y-3">
                  {vouchers.filter(v => v.status === 'active').map((voucher) => (
                    <div key={voucher.id} className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Voucher Diskon</p>
                          <p className="text-2xl font-bold text-orange-600">{formatRupiah(voucher.discount_amount)}</p>
                        </div>
                        <Gift className="w-8 h-8 text-yellow-600" />
                      </div>
                      <div className="bg-white rounded-lg p-3 mb-3">
                        <p className="text-xs text-gray-600 mb-1">Kode Voucher:</p>
                        <p className="text-lg font-mono font-bold text-gray-900 tracking-wider">{voucher.code}</p>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <a
                          href={MARKETPLACE_LINKS.shopee}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Gunakan di Shopee
                        </a>
                        <a
                          href={MARKETPLACE_LINKS.tokopedia}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Gunakan di Tokopedia
                        </a>
                      </div>
                      <p className="text-xs text-gray-500">
                        Berlaku hingga: {new Date(voucher.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reward History */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Riwayat Reward</h3>
              {rewardHistory.length > 0 ? (
                <div className="space-y-2">
                  {rewardHistory.slice(0, 10).map((history) => (
                    <div key={history.id} className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {history.type === 'earned' ? (
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Coins className="w-4 h-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Gift className="w-4 h-4 text-purple-600" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{history.reason}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(history.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-bold ${history.type === 'earned' ? 'text-green-600' : 'text-purple-600'}`}>
                        {history.type === 'earned' ? '+' : ''}{history.points}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">Belum ada riwayat reward</p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Cara Mendapatkan Poin
              </h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Capai streak 7 hari: +10 poin</li>
                <li>• Capai streak 14 hari: +20 poin</li>
                <li>• Capai streak 30 hari: +40 poin</li>
                <li>• Tukar {POINTS_FOR_VOUCHER} poin untuk voucher diskon {formatRupiah(VOUCHER_DISCOUNT)}</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Achievement Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
            {achievementsToShow.map((achievement, i) => (
              <AchievementCard key={`achievement-${achievement.id}`} achievement={achievement} index={i} />
            ))}
          </div>
        )}

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

        {/* Voucher Success Modal */}
        <AnimatePresence>
          {showVoucherModal && selectedVoucher && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={() => setShowVoucherModal(false)}
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl shadow-2xl p-8 w-full max-w-md relative border-4 border-purple-400"
              >
                <button
                  onClick={() => setShowVoucherModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>

                <div className="text-center">
                  <motion.div
                    animate={{ 
                      rotate: [0, -10, 10, -10, 10, 0],
                      scale: [1, 1.1, 1.1, 1.1, 1.1, 1]
                    }}
                    transition={{ duration: 0.6 }}
                    className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl"
                  >
                    <Gift className="w-14 h-14 text-white" />
                  </motion.div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    🎉 Selamat!
                  </h2>
                  <p className="text-gray-700 mb-6">
                    Voucher diskon <span className="font-bold text-purple-600">{formatRupiah(selectedVoucher.discount_amount)}</span> berhasil ditukar!
                  </p>

                  <div className="bg-white rounded-xl p-4 mb-6 border-2 border-dashed border-purple-300">
                    <p className="text-xs text-gray-600 mb-2">Kode Voucher:</p>
                    <p className="text-xl font-mono font-bold text-purple-600 tracking-wider break-all">
                      {selectedVoucher.code}
                    </p>
                  </div>

                  <p className="text-xs text-gray-600 mb-4">
                    Gunakan kode ini saat checkout untuk mendapat diskon. Kode berlaku hingga{' '}
                    {new Date(selectedVoucher.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>

                  <div className="flex gap-2 mb-4">
                    <a
                      href={MARKETPLACE_LINKS.shopee}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Belanja di Shopee
                    </a>
                    <a
                      href={MARKETPLACE_LINKS.tokopedia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Belanja di Tokopedia
                    </a>
                  </div>

                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl"
                    onClick={() => {
                      setShowVoucherModal(false);
                      setActiveTab('rewards');
                    }}
                  >
                    Lihat Voucher Saya
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PencapaianPage;
