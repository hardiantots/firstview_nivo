"use client";

import { useState, useEffect, FC, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Flame, Cigarette, CircleDollarSign, LucideIcon, ChevronLeft, ChevronRight, Lock, Leaf, Shield, Award, Target, Zap, Heart, CheckCircle } from "lucide-react";
import Image from "next/image";
import compressedBg from "@/assets/compressed1.jpg";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/ui/app-header";
import { Slider } from "@/components/ui/slider";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { fetchDailyConsumptionLogs } from "@/lib/db/dailyConsumption";
import { useToast } from "@/hooks/use-toast";
import { fetchJourneyStatus, upsertJourneyStatus } from "@/lib/db/journey";
import { getOrCreateUserStats } from "@/lib/db/userStats";
import { fetchUserJourneyStats, getUserStats } from "@/lib/db/userJourneyStats";
import { 
  getAchievementsForPhase, 
  getRewardMilestones, 
  checkAchievementCondition,
  calculateTotalXp,
  getNextReward,
  type Achievement as AchievementType
} from "@/lib/achievementUtils";
import motivationsData from "@/data/motivations.json";

const HomePage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [todaysConsumption, setTodaysConsumption] = useState(0);
  const [sliderValue, setSliderValue] = useState([0]);
  const [userName, setUserName] = useState("User");
  const [moneySaved, setMoneySaved] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userStatus, setUserStatus] = useState<"PRE_QUIT" | "POST_QUIT">("PRE_QUIT");
  const [showConsumptionDialog, setShowConsumptionDialog] = useState(false);
  const [timeProgress, setTimeProgress] = useState({ months: 0, days: 0, hours: 0 });
  const [streakDays, setStreakDays] = useState(0);
  const [userMotivation, setUserMotivation] = useState("");
  const [countdownDays, setCountdownDays] = useState(0);
  const [badgeIndex, setBadgeIndex] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [nextBadgeXp, setNextBadgeXp] = useState(0);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileFullName, setProfileFullName] = useState("");
  const [profileDob, setProfileDob] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileGender, setProfileGender] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [nivoCoachContent, setNivoCoachContent] = useState<{
    greeting: string;
    dynamicCard: {
      type: "MOTIVATION_REMINDER" | "DAILY_MISSION";
      title: string;
      content: string;
    };
  }>({
    greeting: "",
    dynamicCard: {
      type: "MOTIVATION_REMINDER",
      title: "",
      content: ""
    }
  });

  /* ===== ACHIEVEMENT DATA - Loaded from JSON ===== */
  type Achievement = AchievementType;
  const [allBadges, setAllBadges] = useState<Achievement[]>([]);

  // Cek apakah user layak auto-transisi dari PRE_QUIT ke POST_QUIT
  const checkAndAutoTransitionPhase = async (userId: string) => {
    try {
      const journey = await fetchJourneyStatus(userId);
      const currentPhase = journey?.phase ?? "PRE_QUIT";
      if (currentPhase !== "PRE_QUIT") return;

      const logs = await fetchDailyConsumptionLogs(userId);
      if (!logs.length) return;

      // Ambil 28 hari terakhir berdasarkan tanggal
      const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
      const uniqueByDate = Object.values(
        sorted.reduce<Record<string, typeof sorted[0]>>((acc, log) => {
          acc[log.date] = log;
          return acc;
        }, {})
      ).sort((a, b) => a.date.localeCompare(b.date));

      const last28 = uniqueByDate.slice(-28);
      if (last28.length < 21) return; // butuh minimal 3 minggu data

      const allZero = last28.every((d) => (d.cigarette_count ?? 0) === 0);
      if (!allZero) return;

      // Tentukan quitDate sebagai tanggal hari pertama dari rangkaian nol rokok
      const firstZeroDate = last28[0].date;

      await upsertJourneyStatus(userId, firstZeroDate, "POST_QUIT");

      if (typeof window !== "undefined") {
        localStorage.setItem("userPhase", "POST_QUIT");
        localStorage.setItem("quitDate", firstZeroDate);
      }

      setUserStatus("POST_QUIT");
    } catch (e) {
      console.error("checkAndAutoTransitionPhase error", e);
    }
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("userToken");
      const lastLoginAt = Number(localStorage.getItem("lastLoginAt") || 0);
      const maxAgeDays = Number(localStorage.getItem("sessionMaxAgeDays") || 0);

      if (!token || !lastLoginAt || !maxAgeDays) {
        router.push("/signin");
        return;
      }

      const diffMs = Date.now() - lastLoginAt;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > maxAgeDays) {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("lastLoginAt");
        localStorage.removeItem("sessionMaxAgeDays");
        router.push("/signin");
        return;
      } else {
        localStorage.setItem("lastLoginAt", String(Date.now()));
      }

      const userId = localStorage.getItem("userId");
      let userCondition: "PRE_QUIT" | "POST_QUIT" = "PRE_QUIT";
      let countdown = 0;
      let streak = 0;
      let totalSaved = 0;
      let parsedMotivations: string[] = [];

      // Fetch dari database untuk data real-time
      if (userId) {
        try {
          // Fetch motivations, journeyStartDate, selectedDays, and actualQuitDate from database
          const { data: profileData } = await supabase
            .from("user_profile")
            .select("motivations, journey_start_date, selected_preparation_days, actual_quit_date")
            .eq("user_id", userId)
            .maybeSingle();
          
          if (profileData?.motivations && Array.isArray(profileData.motivations)) {
            parsedMotivations = profileData.motivations;
            // Update localStorage cache
            localStorage.setItem("selectedMotivations", JSON.stringify(parsedMotivations));
          } else {
            // Fallback to localStorage
            const storedMotivations = localStorage.getItem("selectedMotivations");
            parsedMotivations = storedMotivations ? JSON.parse(storedMotivations) : [];
          }
          
          // Sync journeyStartDate, selectedDays, and actualQuitDate from database
          if (profileData?.journey_start_date) {
            localStorage.setItem("journeyStartDate", profileData.journey_start_date);
          }
          if (profileData?.selected_preparation_days) {
            localStorage.setItem("selectedDays", String(profileData.selected_preparation_days));
          }
          if (profileData?.actual_quit_date) {
            localStorage.setItem("actualQuitDate", profileData.actual_quit_date);
          }

          const journey = await fetchJourneyStatus(userId);
          const stats = await fetchUserJourneyStats(userId);
          
          if (journey && stats) {
            userCondition = journey.phase;
            totalSaved = stats.moneySaved || 0;
            
            // Calculate countdown/streak based on dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (userCondition === "PRE_QUIT") {
              // PRE-QUIT: Calculate countdown based on preparation days
              const totalPrepDays = Number(localStorage.getItem("selectedDays") || "0");
              const startDateStr = localStorage.getItem("journeyStartDate");
              
              if (totalPrepDays > 0 && startDateStr) {
                const startDate = new Date(startDateStr);
                startDate.setHours(0, 0, 0, 0);
                const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                countdown = Math.max(0, totalPrepDays - daysPassed);
                
                // Auto-transition to POST-QUIT when countdown reaches 0
                if (countdown === 0 && totalPrepDays > 0) {
                  const todayStr = today.toISOString().split("T")[0];
                  await upsertJourneyStatus(userId, todayStr, "POST_QUIT");
                  localStorage.setItem("userPhase", "POST_QUIT");
                  localStorage.setItem("actualQuitDate", todayStr);
                  userCondition = "POST_QUIT";
                }
              } else {
                countdown = 0;
              }
            } else {
              // POST-QUIT: Calculate days since quit date
              const quitDateStr = localStorage.getItem("actualQuitDate");
              if (quitDateStr) {
                const quitDate = new Date(quitDateStr);
                quitDate.setHours(0, 0, 0, 0);
                const diffTime = today.getTime() - quitDate.getTime();
                streak = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
              } else {
                streak = stats.streakDays || 0;
              }
            }
          }
        } catch (e) {
          console.error("Gagal mengambil stats dari database, fallback ke localStorage", e);
          // Fallback ke localStorage jika database error
          const storedPhase = localStorage.getItem("userPhase");
          userCondition = storedPhase === "POST_QUIT" ? "POST_QUIT" : "PRE_QUIT";
          
          const storedCountdown = localStorage.getItem("countdownDays");
          const storedStreak = localStorage.getItem("streakDays");
          countdown = storedCountdown ? parseInt(storedCountdown, 10) || 0 : 0;
          streak = storedStreak ? parseInt(storedStreak, 10) || 0 : 0;
        }
      }

      const personalMotivation =
        parsedMotivations.length > 0
          ? `Alasan terkuatmu: ${parsedMotivations
              .map((m) => m.replace(/^[a-z]/, (c) => c.toUpperCase()))
              .join(", ")}`
          : "Ingat alasan terkuatmu untuk berhenti hari ini.";

      const userEmail = localStorage.getItem("userEmail") || undefined;
      
      // Fetch full name from user_profile
      let fullName = "Budi";
      const userIdForName = localStorage.getItem("userId");
      if (userIdForName) {
        const { data: profileData } = await supabase
          .from("user_profile")
          .select("full_name")
          .eq("user_id", userIdForName)
          .maybeSingle();
        
        if (profileData?.full_name && String(profileData.full_name).trim() !== "") {
          fullName = String(profileData.full_name).trim();
        } else if (userEmail) {
          fullName = userEmail.split("@")[0];
        }
      } else if (userEmail) {
        fullName = userEmail.split("@")[0];
      }

      const userData = {
        userName: fullName,
        userCondition,
        countdownDays: countdown,
        streakDays: streak,
        personalMotivation,
        moneySaved: totalSaved,
      };

      setUserName(userData.userName);
      setMoneySaved(userData.moneySaved);
      setUserStatus(userData.userCondition);
      setCountdownDays(userData.countdownDays);
      setStreakDays(userData.streakDays);
      setUserMotivation(userData.personalMotivation);
      
      // Simpan ke localStorage sebagai cache untuk kompatibilitas dengan halaman lain
      localStorage.setItem("userPhase", userData.userCondition);
      localStorage.setItem("countdownDays", String(userData.countdownDays));
      localStorage.setItem("streakDays", String(userData.streakDays));
      localStorage.setItem("homeMoneySaved", String(userData.moneySaved));

      if (userData.userCondition === "PRE_QUIT") {
        const totalHours = userData.countdownDays * 24;
        setTimeProgress({
          months: Math.floor(userData.countdownDays / 30),
          days: userData.countdownDays % 30,
          hours: totalHours % 24,
        });
      } else {
        setTimeProgress({
          months: Math.floor(userData.streakDays / 30),
          days: userData.streakDays % 30,
          hours: new Date().getHours(),
        });
      }

      // Simpan status untuk PencapaianPage
      localStorage.setItem("userCondition", userData.userCondition);

      // Coba auto-transisi PRE_QUIT -> POST_QUIT bila 3-4 minggu 0 rokok
      if (userId) {
        await checkAndAutoTransitionPhase(userId);
      }

      // Cek profil di Supabase untuk nomor WhatsApp dan gender
      const userIdForProfile = localStorage.getItem("userId");
      if (userIdForProfile) {
        const { data: profile } = await supabase
          .from("user_profile")
          .select("full_name, date_of_birth, phone_number, gender")
          .eq("user_id", userIdForProfile)
          .maybeSingle();

        const needsFullName = !profile?.full_name || String(profile.full_name).trim() === "";
        const needsDob = !profile?.date_of_birth;
        const needsPhone = !profile?.phone_number || String(profile.phone_number).trim() === "";
        const needsGender = !profile?.gender || String(profile.gender).trim() === "";

        if (needsFullName || needsDob || needsPhone || needsGender) {
          setProfileFullName((profile?.full_name as string) || "");
          setProfileDob((profile?.date_of_birth as string) || "");
          setProfilePhone((profile?.phone_number as string) || "");
          setProfileGender((profile?.gender as string) || "");
          setShowProfileDialog(true);
        }
      }

      const dailyMissions = motivationsData.dailyMissions;
      const randomMission = dailyMissions[Math.floor(Math.random() * dailyMissions.length)];

      // XP and achievements will be loaded separately via useEffect

      if (userData.userCondition === "PRE_QUIT") {
        setNivoCoachContent({
          greeting: `Semangat, ${userData.userName}! ${userData.countdownDays} hari lagi menuju hari bebasmu dari rokok.`,
          dynamicCard: {
            type: "DAILY_MISSION",
            title: "Misi Persiapan Hari Ini",
            content: randomMission
          }
        });
      } else {
        // POST-QUIT: Show ALL motivations based on user's selected reasons
        let motivationContent = userData.personalMotivation;
        
        // Match ALL user's motivations with our detailed motivation messages
        if (parsedMotivations.length > 0) {
          const matchedMotivations: string[] = [];
          
          parsedMotivations.forEach(userMotivation => {
            // Match by label (Indonesian) - stored labels are now in Indonesian
            const matched = motivationsData.postQuitMotivations.find(
              m => m.label.toLowerCase() === userMotivation.toLowerCase()
            );
            
            if (matched) {
              matchedMotivations.push(`${matched.title}\n${matched.message}`);
            }
          });
          
          // Add all matched motivations to the content
          if (matchedMotivations.length > 0) {
            motivationContent = `${userData.personalMotivation}\n\n${matchedMotivations.join('\n\n')}`;
          }
        }
        
        setNivoCoachContent({
          greeting: `Luar biasa, ${userData.userName}! ${userData.streakDays} hari tanpa rokok sangat membanggakan!`,
          dynamicCard: {
            type: "MOTIVATION_REMINDER",
            title: "Ingat Alasan Terkuatmu",
            content: motivationContent
          }
        });
      }
    };
    fetchUserData();
  }, [router, setUserName, setMoneySaved, setUserStatus, setCountdownDays, setStreakDays, setUserMotivation, setTimeProgress, setNivoCoachContent]);

  // Load achievements from JSON and compute status
  useEffect(() => {
    const loadAchievements = async () => {
      const userId = localStorage.getItem("userId");
      const phase = userStatus;

      // Get achievements structure from JSON
      const { milestones, behaviors } = getAchievementsForPhase(phase);
      const rewards = getRewardMilestones();

      if (!userId) {
        setAllBadges([...milestones, ...behaviors]);
        return;
      }

      try {
        // Fetch user data
        const stats = await fetchUserJourneyStats(userId);
        const userStats = await getUserStats(userId);
        
        const cravingsRejected = userStats?.cravings_rejected || 0;
        const productiveActivities = userStats?.productive_activities || 0;

        // Check each achievement
        const updatedMilestones = milestones.map((ach) => {
          const completed = checkAchievementCondition(ach.condition, {
            streakDays,
            cravingsRejected,
            productiveActivities,
          });
          return { ...ach, completed, locked: !completed };
        });

        const updatedBehaviors = behaviors.map((ach) => {
          const completed = checkAchievementCondition(ach.condition, {
            streakDays,
            cravingsRejected,
            productiveActivities,
          });
          return { ...ach, completed, locked: !completed };
        });

        const allAchievements = [...updatedMilestones, ...updatedBehaviors];
        setAllBadges(allAchievements);

        // Calculate and update XP
        const xpTotal = calculateTotalXp(allAchievements);
        setTotalXp(xpTotal);

        // Get next reward target
        const nextReward = getNextReward(xpTotal, rewards);
        setNextBadgeXp(nextReward?.xpRequired || 1200);
      } catch (e) {
        console.error("Error loading achievements:", e);
        setAllBadges([...milestones, ...behaviors]);
      }
    };

    loadAchievements();
  }, [userStatus, streakDays]);

  // Auto-slide badge carousel every 15 seconds
  useEffect(() => {
    if (allBadges.length === 0) return;
    
    const interval = setInterval(() => {
      setBadgeIndex((prev) => (prev === allBadges.length - 1 ? 0 : prev + 1));
    }, 15000);

    return () => clearInterval(interval);
  }, [allBadges.length]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Check for phase transition based on consumption patterns
  const checkPhaseTransition = async (userId: string, todayConsumption: number) => {
    try {
      const journey = await fetchJourneyStatus(userId);
      const currentPhase = journey?.phase ?? "PRE_QUIT";

      // Case 1: POST_QUIT user smoked again → Transition back to PRE_QUIT
      if (currentPhase === "POST_QUIT" && todayConsumption > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        
        // Use today as new journey start date (reset preparation)
        const newTargetDays = 30; // Default 30 days preparation
        await upsertJourneyStatus(userId, todayStr, "PRE_QUIT", newTargetDays);
        
        // Update user_profile for cross-device sync
        await supabase
          .from('user_profile')
          .update({
            journey_start_date: todayStr,
            selected_preparation_days: newTargetDays,
          })
          .eq('user_id', userId);
        
        // Clear actualQuitDate from localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("userPhase", "PRE_QUIT");
          localStorage.setItem("journeyStartDate", todayStr);
          localStorage.setItem("selectedDays", String(newTargetDays));
          localStorage.setItem("countdownDays", String(newTargetDays));
          localStorage.setItem("streakDays", "0");
          localStorage.removeItem("actualQuitDate"); // Clear old quit date
        }

        toast({
          title: "Fase Berubah",
          description: "Jangan khawatir! Kembali ke fase persiapan untuk membangun kembali momentum. Kamu bisa melakukannya!",
          variant: "default",
        });
        
        // Hot-reload: refetch all data without page reload
        const journey = await fetchJourneyStatus(userId);
        const stats = await fetchUserJourneyStats(userId);
        if (journey && stats) {
          setUserStatus(journey.phase);
          setCountdownDays(newTargetDays);
          setStreakDays(0);
          setMoneySaved(stats.moneySaved || 0);
        }
        return;
      }

      // Case 2: PRE_QUIT user has 14+ consecutive days of zero → Auto transition to POST_QUIT
      if (currentPhase === "PRE_QUIT") {
        const logs = await fetchDailyConsumptionLogs(userId);
        if (!logs.length) return;

        // Get last 14 days of unique data
        const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
        const uniqueByDate = Object.values(
          sorted.reduce<Record<string, typeof sorted[0]>>((acc, log) => {
            if (!acc[log.date]) acc[log.date] = log;
            return acc;
          }, {})
        ).sort((a, b) => b.date.localeCompare(a.date));

        const last14 = uniqueByDate.slice(0, 14);
        if (last14.length < 14) return; // Need at least 14 days of data

        const allZero = last14.every((d) => (d.cigarette_count ?? 0) === 0);
        if (!allZero) return;

        // Find the first day of the zero streak
        const firstZeroDate = last14[last14.length - 1].date;
        
        await upsertJourneyStatus(userId, firstZeroDate, "POST_QUIT");
        
        // Save actualQuitDate to user_profile for cross-device sync
        await supabase
          .from('user_profile')
          .update({
            actual_quit_date: firstZeroDate,
          })
          .eq('user_id', userId);
        
        setUserStatus("POST_QUIT");
        setStreakDays(14);
        
        if (typeof window !== "undefined") {
          localStorage.setItem("userPhase", "POST_QUIT");
          localStorage.setItem("actualQuitDate", firstZeroDate);
          localStorage.setItem("streakDays", "14");
          localStorage.setItem("countdownDays", "0");
        }

        toast({
          title: "🎉 Selamat!",
          description: "Kamu telah menyelesaikan 14 hari tanpa rokok! Sekarang memasuki fase Post-Quit. Teruskan!",
          variant: "default",
        });
        
        // Hot-reload: refetch all data without page reload
        const journey = await fetchJourneyStatus(userId);
        const stats = await fetchUserJourneyStats(userId);
        if (journey && stats) {
          setUserStatus(journey.phase);
          setStreakDays(14);
          setCountdownDays(0);
          setMoneySaved(stats.moneySaved || 0);
        }
      }
    } catch (e) {
      console.error("checkPhaseTransition error", e);
    }
  };

  const handleLogConsumption = async () => {
    // Allow 0 cigarettes - it means user didn't smoke today
    setTodaysConsumption(sliderValue[0]);
    
    const today = new Date().toISOString().split('T')[0];
    
    // Verify userId matches auth user
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || localStorage.getItem("userId");
    
    if (user?.id) {
      localStorage.setItem("userId", user.id);
    }

    // Simpan ke Supabase jika userId tersedia
    if (userId) {
      try {
        const pricePerCigarette = 1750;
        const cigaretteCount = Number(sliderValue[0]); // Ensure it's a number
        const moneySpent = cigaretteCount * pricePerCigarette;
        
        // Validate data before save
        if (isNaN(cigaretteCount) || cigaretteCount < 0) {
          throw new Error("Invalid cigarette count");
        }
        
        // Check if entry exists for today first
        const { data: existing, error: checkError } = await supabase
          .from("daily_consumption")
          .select("id")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle();
        
        if (checkError) {
          console.error("❌ Error checking existing entry:", checkError);
          throw checkError;
        }
        
        console.log("🔍 Existing entry check:", existing);
        
        if (existing) {
          // Update existing record
          const { data: updateData, error: updateError } = await supabase
            .from("daily_consumption")
            .update({
              cigarette_count: cigaretteCount,
              money_spent: moneySpent,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
            .select();
          
          if (updateError) {
            console.error("❌ Update error:", updateError);
            throw updateError;
          }
          console.log("✅ Update successful:", updateData);
        } else {
          // Insert new record
          const { data: insertData, error: insertError } = await supabase
            .from("daily_consumption")
            .insert([{
              user_id: userId,
              date: today,
              cigarette_count: cigaretteCount,
              money_spent: moneySpent,
            }])
            .select();
          
          if (insertError) {
            console.error("❌ Insert error:", insertError);
            throw insertError;
          }
          console.log("✅ Insert successful:", insertData);
        }
      } catch (e) {
        console.error("❌ Gagal menyimpan ke Supabase:", e);
        toast({
          title: "Error",
          description: "Gagal menyimpan data. Silakan coba lagi.",
          variant: "destructive",
        });
        return; // Don't proceed if save failed
      }
    }

    // Tetap log ke localStorage sebagai cache lokal
    const consumptionLog = {
      date: today,
      amount: sliderValue[0],
      timestamp: new Date().toISOString()
    };
    const existingLogs = JSON.parse(localStorage.getItem("consumptionLogs") || "[]");
    const updatedLogs = existingLogs.filter((log: any) => log.date !== today);
    updatedLogs.push(consumptionLog);
    localStorage.setItem("consumptionLogs", JSON.stringify(updatedLogs));

    toast({
      title: "Berhasil!",
      description: `✓ Berhasil mencatat ${sliderValue[0]} batang rokok hari ini`,
      variant: "default",
    });
    setSliderValue([0]);

    // Check for phase transition after logging
    if (userId) {
      await checkPhaseTransition(userId, sliderValue[0]);
    }
  };

  const xpProgressPercentage = nextBadgeXp > 0 ? Math.min(100, Math.round((totalXp / nextBadgeXp) * 100)) : 0;

  const handleSaveProfile = async () => {
    if (!profileFullName.trim() || !profileDob || !profilePhone.trim() || !profileGender) {
      return;
    }
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    setSavingProfile(true);
    try {
      await supabase.from("user_profile").upsert(
        {
          user_id: userId,
          full_name: profileFullName.trim(),
          date_of_birth: profileDob,
          phone_number: profilePhone.trim(),
          gender: profileGender,
        },
        { onConflict: "user_id" }
      );
      setShowProfileDialog(false);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="relative max-w-md mx-auto md:max-w-lg lg:max-w-xl">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Main Content - with padding for fixed header */}
      <div className="px-4 py-6 space-y-6"> 
          {/* Hero Section - Greeting + Time Progress Combined */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl p-8 mb-6"
            style={{
              backgroundImage: `url(${compressedBg.src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: '320px'
            }}
          >
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-900/40 to-teal-950/60" />
            
            {/* Content */}
            <div className="relative z-10 space-y-6 h-full flex flex-col justify-between">
              {/* Greeting Section */}
              <div>
                <h1 className="text-xl sm:text-2xl text-white font-bold mb-2 drop-shadow-lg leading-tight">{nivoCoachContent.greeting}</h1>
                <p className="text-white/90 text-xs sm:text-sm drop-shadow-md">NIVO mendukung perjalananmu!</p>
              </div>

              {/* Time Progress Section */}
              <div className="backdrop-blur-md bg-white/10 p-6 rounded-2xl border border-white/20">
                <p className="text-[10px] sm:text-xs text-white font-medium mb-4 text-center uppercase tracking-wider">
                  {userStatus === "PRE_QUIT" ? "Waktu Menuju Hari Bebas Rokok" : "Waktu Bebas dari Rokok"}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <TimeStatItem value={timeProgress.months} label="Bulan" />
                  <TimeStatItem value={timeProgress.days} label="Hari" />
                  <TimeStatItem value={timeProgress.hours} label="Jam" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Motivation/Mission Card - Separated */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gradient-to-br from-teal-50 to-emerald-50 p-5 rounded-2xl border border-teal-200 shadow-sm"
          >
            <h3 className="text-sm font-bold text-teal-900 mb-2">{nivoCoachContent.dynamicCard.title}</h3>
            <p className={`text-sm leading-relaxed text-teal-800 whitespace-pre-line ${nivoCoachContent.dynamicCard.type === "MOTIVATION_REMINDER" ? "italic" : ""}`}>
              {nivoCoachContent.dynamicCard.content}
            </p>
          </motion.div>

          {/* Badge Carousel Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative"
          >
            <p className="text-xs text-teal-700 font-medium mb-3 text-center uppercase tracking-wider">Your Badge</p>
            
            <div className="flex items-center gap-3">
              {/* Left Arrow Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setBadgeIndex((prev) => (prev === 0 ? allBadges.length - 1 : prev - 1))}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white hover:shadow-lg transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.button>

              {/* Center Badge Display */}
              <div className="flex-1 flex justify-center">
                {allBadges.length > 0 && (
                  <motion.div
                    key={allBadges[badgeIndex].id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg border-4 ${
                      allBadges[badgeIndex].completed
                        ? "bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-300"
                        : "bg-gradient-to-br from-gray-400 to-gray-500 border-gray-400"
                    }`}
                  >
                    {/* Icon Container */}
                    <div className="text-white">
                      {(() => {
                        const IconComp = allBadges[badgeIndex].icon;
                        return <IconComp className="w-12 h-12" />;
                      })()}
                    </div>

                    {/* Lock Icon for Locked Badges */}
                    {allBadges[badgeIndex].locked && (
                      <div className="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                        <Lock className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* Check Icon for Completed Badges */}
                    {allBadges[badgeIndex].completed && (
                      <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-emerald-500">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}

                    {/* Badge Label */}
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-24 text-center">
                      <p className="text-xs font-bold text-gray-700 truncate">{allBadges[badgeIndex].title}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Arrow Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setBadgeIndex((prev) => (prev === allBadges.length - 1 ? 0 : prev + 1))}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white hover:shadow-lg transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Badge Counter */}
            <div className="text-center mt-12 text-xs text-gray-500">
              {badgeIndex + 1} / {allBadges.length}
            </div>
          </motion.div>

          {/* XP Progress Toward Next Reward */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                Progress XP Menuju Reward Berikutnya
              </p>
              <span className="text-xs font-medium text-teal-700">
                {totalXp} / {nextBadgeXp} XP
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
                style={{ width: `${xpProgressPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Dapatkan XP dengan menyelesaikan misi harian, menahan keinginan merokok,
              dan menjaga streak bebas rokok. Reward spesial akan terbuka saat bar ini penuh.
            </p>
          </motion.div>

          {/* Metrics Section - New Layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex gap-3 items-center"
          >
            {/* Left Card - Smoke Free Days */}
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-3 shadow-md flex-1 h-28 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-1">
                <Cigarette className="w-4 h-4 text-white" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mb-0.5">
                {userStatus === "PRE_QUIT" ? countdownDays : streakDays}
              </div>
              <div className="text-[10px] text-white/90 font-medium leading-tight">
                {userStatus === "PRE_QUIT" ? "Hari Menuju Berhenti" : "Hari Tanpa"}
                <br />
                Merokok
              </div>
            </div>

            {/* Right Card - Money Saved Progress */}
            <div className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-3 shadow-md h-28 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-1">
                <CircleDollarSign className="w-4 h-4 text-white" />
              </div>
              <div className="text-xl font-bold text-white mb-0.5">{formatCurrency(moneySaved)}</div>
              <div className="text-[10px] text-white/90 font-medium leading-tight">Uang yang Dihemat</div>
            </div>
          </motion.div>

          {/* Emergency Button */}
          <motion.div 
            className="mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 rounded-xl transition-all hover:shadow-lg active:scale-95"
              onClick={() => router.push("/craving-support")}
            >
              ! SAYA INGIN MEROKOK
            </Button>
          </motion.div>

          {/* Daily Consumption Tracker - Only for PRE-QUIT */}
          {userStatus === "PRE_QUIT" && (
            <motion.div 
              className="bg-white p-6 rounded-2xl shadow-md border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Catat Konsumsi Hari Ini</h3>
                  <p className="text-xs text-gray-500">Berapa batang rokok yang kamu merokok?</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full">
                  <span className="text-lg font-bold text-orange-600">{sliderValue[0]}</span>
                </div>
              </div>

              <div className="mb-6 px-2">
                <div className="mb-3">
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    max={24}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0 batang</span>
                  <span>24 batang</span>
                </div>
              </div>

              <Button
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-lg transition-all active:scale-95"
                onClick={handleLogConsumption}
              >
                <Cigarette className="w-4 h-4 mr-2" />
                Catat Sekarang
              </Button>
              
              {todaysConsumption > 0 && (
                <p className="text-xs text-green-600 mt-2 text-center">
                  ✓ Tercatat: {todaysConsumption} batang hari ini
                </p>
              )}
            </motion.div>
          )}
      </div>

      {showProfileDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-2">Lengkapi Profilmu</h2>
            <p className="text-sm text-gray-600 mb-4">
              Beberapa informasi tambahan membantu NIVO memberi dukungan yang lebih personal.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={profileFullName}
                  onChange={(e) => setProfileFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={profileDob}
                  onChange={(e) => setProfileDob(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setProfileGender("Laki-Laki")}
                    className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                      profileGender === "Laki-Laki"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                        : "bg-white border-gray-300 text-gray-800 hover:border-gray-400"
                    }`}
                  >
                    Laki-Laki
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileGender("Perempuan")}
                    className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                      profileGender === "Perempuan"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                        : "bg-white border-gray-300 text-gray-800 hover:border-gray-400"
                    }`}
                  >
                    Perempuan
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfileDialog(false)}
                disabled={savingProfile}
              >
                Nanti Saja
              </Button>
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={
                  savingProfile ||
                  !profileFullName.trim() ||
                  !profileDob ||
                  !profilePhone.trim() ||
                  !profileGender
                }
              >
                {savingProfile ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==== COMPONENTS ==== */

interface TimeStatItemProps {
  value: number;
  label: string;
}
const TimeStatItem: FC<TimeStatItemProps> = ({ value, label }) => (
  <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-3 text-center">
    <div className="text-xl sm:text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-[10px] sm:text-xs text-white/80">{label}</div>
  </div>
);

interface StatItemProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
}
const StatItem: FC<StatItemProps> = ({ icon: Icon, value, label }) => (
  <div className="text-center">
    <Icon className="w-6 h-6 text-teal-600 mx-auto mb-2" />
    <div className="text-lg font-bold text-gray-800">{value}</div>
    <div className="text-xs text-gray-600">{label}</div>
  </div>
);

export default HomePage;