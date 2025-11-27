"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";
import {
  Trophy,
  Cigarette,
  Brain,
  HeartPulse,
  ArrowDown,
  ArrowUp,
  Minus,
  CircleDollarSign,
  CalendarCheck,
  TrendingDown,
  Activity,
  Wind,
  Lightbulb,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, Tooltip, LabelList, CartesianGrid } from "recharts";
import { AppHeader } from "@/components/ui/app-header";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import ProgressRing from "@/components/ui/progress-ring";
import { useToast } from "@/hooks/use-toast";
import backimg4 from "@/assets/backimg4.jpg";
import InfoCard from "@/components/ui/InfoCard";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { fetchDailyConsumptionLogs } from "@/lib/db/dailyConsumption";
import { fetchRecentCravingLogs } from "@/lib/db/cravingLogs";
import { fetchJourneyStatus, upsertJourneyStatus } from "@/lib/db/journey";
import { fetchUserJourneyStats } from "@/lib/db/userJourneyStats";
import healthMilestonesData from "@/data/health-milestones.json";

const TrackerPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [userPhase, setUserPhase] = useState<"PRE_QUIT" | "POST_QUIT">("PRE_QUIT");
  const [activeTab, setActiveTab] = useState<"financial" | "health">("financial");
  const [sliderValue, setSliderValue] = useState([0]);
  const [todaysConsumption, setTodaysConsumption] = useState(0);
  const [consumptionData, setConsumptionData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [financialData, setFinancialData] = useState<any[]>([]);
  const [cravingHistory, setCravingHistory] = useState<any[]>([]);
  const [preQuitStreak, setPreQuitStreak] = useState(0);
  const [isCravingLoading, setIsCravingLoading] = useState(true);
  const [countdownDays, setCountdownDays] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  // Gunakan harga per batang konsisten dengan perhitungan di Home
  const pricePerCigarette = 1750;
  // Asumsi kebiasaan awal: 20 batang/hari (sama dengan HomePage)
  const baselineConsumption = 20;

  useEffect(() => {
    const init = async () => {
      // Get userId from localStorage first
      let userId = localStorage.getItem("userId");
      
      // Verify with Supabase auth - ensure they match
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.id !== userId) {
        // Sync localStorage with actual auth user
        userId = user.id;
        localStorage.setItem("userId", user.id);
      }
      
      if (!userId) {
        setIsCravingLoading(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Ambil fase dari database smoke_free_journey sebagai sumber truth
      let phase: "PRE_QUIT" | "POST_QUIT" = "PRE_QUIT";
      const journeyStatus = await fetchJourneyStatus(userId);
      if (journeyStatus) {
        phase = journeyStatus.phase;
      }
      
      setUserPhase(phase);
      localStorage.setItem("userPhase", phase);

      // Calculate countdown based on quit date preparation days
      if (phase === "PRE_QUIT") {
        // Use stored selectedDays from onboarding
        const totalPrepDays = Number(localStorage.getItem("selectedDays") || "0");
        if (totalPrepDays > 0) {
          // Calculate days passed since journey started
          const startDateStr = localStorage.getItem("journeyStartDate");
          if (startDateStr) {
            const startDate = new Date(startDateStr);
            startDate.setHours(0, 0, 0, 0);
            const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const calculatedCountdown = Math.max(0, totalPrepDays - daysPassed);
            setCountdownDays(calculatedCountdown);
            localStorage.setItem("countdownDays", String(calculatedCountdown));
          } else {
            // Fallback to stored countdown
            const storedCountdown = Number(localStorage.getItem("countdownDays") || "0");
            setCountdownDays(Number.isNaN(storedCountdown) ? 0 : storedCountdown);
          }
        } else {
          const storedCountdown = Number(localStorage.getItem("countdownDays") || "0");
          setCountdownDays(Number.isNaN(storedCountdown) ? 0 : storedCountdown);
        }
      } else {
        const storedCountdown = Number(localStorage.getItem("countdownDays") || "0");
        setCountdownDays(Number.isNaN(storedCountdown) ? 0 : storedCountdown);
      }

      try {
        const logs = await fetchDailyConsumptionLogs(userId);
        
        // Debug: Show what we got from database
        if (logs.length === 0) {
          console.warn("⚠️ No consumption logs found for userId:", userId);
          console.warn("⚠️ Check if data in database has matching user_id");
        } else {
          console.log("✅ Found", logs.length, "consumption logs");
          console.log("📅 Date range:", logs[0]?.date, "to", logs[logs.length-1]?.date);
        }
        
        // Jika belum ada data sama sekali (user baru PRE-QUIT), set semua ke 0
        if (logs.length === 0) {
          setConsumptionData([0, 0, 0, 0, 0, 0, 0]);
          setFinancialData([]);
          setPreQuitStreak(0);
        } else {
          const days = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i));
          const perDay: Record<string, number> = {};
          const perDayMoney: Record<string, number> = {};
          logs.forEach((l) => {
            perDay[l.date] = l.cigarette_count || 0;
            perDayMoney[l.date] = l.money_spent || 0;
          });
          const consArray = days.map((d) => {
            const key = format(d, 'yyyy-MM-dd');
            return perDay[key] ?? 0;
          });
          
          console.log("📊 TrackerPage - Consumption Array:", consArray);
          console.log("📊 TrackerPage - perDay data:", perDay);
          console.log("💰 TrackerPage - perDayMoney data:", perDayMoney);
          console.log("📊 TrackerPage - days keys:", days.map(d => format(d, 'yyyy-MM-dd')));
          setConsumptionData(consArray);

          // Hitung streak hari berturut-turut dengan konsumsi 0 (hanya dihitung jika ada input dan == 0)
          let streak = 0;
          for (let i = consArray.length - 1; i >= 0; i--) {
            const val = consArray[i];
            const dayKey = format(days[i], 'yyyy-MM-dd');
            if (val === 0 && perDay[dayKey] !== undefined) {
              streak += 1;
            } else if (perDay[dayKey] === undefined) {
              // tidak ada input hari ini → streak putus
              break;
            } else {
              // ada input dan >0 → streak putus
              break;
            }
          }
          setPreQuitStreak(streak);

          const fin = days.map((date, i) => {
            const key = format(date, 'yyyy-MM-dd');
            const hasData = perDay[key] !== undefined;
            const actualConsumption = consArray[i];
            
            // Gunakan money_spent dari database jika ada, fallback ke perhitungan manual
            const spending = hasData ? (perDayMoney[key] || (actualConsumption * pricePerCigarette)) : 0;
            // Savings dihitung hanya jika user sudah pernah input baseline sebelumnya
            const avoided = hasData ? Math.max(0, baselineConsumption - actualConsumption) : 0;
            const savings = avoided * pricePerCigarette;
            
            return {
              date,
              spending,
              savings,
              label: format(date, "d MMM", { locale: id }),
            };
          });
          
          console.log("💰 TrackerPage - Financial Data:", fin);
          setFinancialData(fin);
        }
      } catch (e) {
        console.error("Gagal mengambil data konsumsi dari Supabase", e);
      }

      // Calculate streak for POST-QUIT users
      if (phase === "POST_QUIT") {
        const quitDateStr = localStorage.getItem("actualQuitDate");
        if (quitDateStr) {
          const quitDate = new Date(quitDateStr);
          quitDate.setHours(0, 0, 0, 0);
          const diffTime = today.getTime() - quitDate.getTime();
          const calculatedStreak = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
          setStreakDays(calculatedStreak);
          localStorage.setItem("streakDays", String(calculatedStreak));
        } else {
          const storedStreak = Number(localStorage.getItem("streakDays") || "0");
          setStreakDays(Number.isNaN(storedStreak) ? 0 : storedStreak);
        }
      } else {
        const storedStreak = Number(localStorage.getItem("streakDays") || "0");
        setStreakDays(Number.isNaN(storedStreak) ? 0 : storedStreak);
      }

      try {
        setIsCravingLoading(true);
        const cravings = await fetchRecentCravingLogs(userId, 20);
        console.log("Fetched craving logs:", cravings);
        const mapped = cravings.map((c) => ({
          id: c.id,
          emotion: c.mood || "Tidak disebutkan",
          date: format(new Date(c.occurred_at || new Date().toISOString()), "EEEE, d MMM yyyy HH:mm", { locale: id }),
          intensity: c.intensity || 0,
          location: c.location || "",
          situation: c.situation || "",
        }));
        console.log("Mapped craving history:", mapped);
        setCravingHistory(mapped);
      } catch (e) {
        console.error("Gagal mengambil craving logs dari Supabase", e);
        setCravingHistory([]);
      } finally {
        setIsCravingLoading(false);
      }
    };

    init();
  }, []);

  const today = new Date(); // compute for chart rendering
  const chartData = Array.from({ length: 7 }).map((_, i) => ({
    date: subDays(today, 6 - i),
    consumption: consumptionData[i] ?? 0,
  }));

  console.log("📈 Chart Data for Rendering:", chartData);
  console.log("📈 Consumption Data State:", consumptionData);
  console.log("📈 Financial Data State:", financialData);

  // Hitung total penghematan dari data finansial
  const totalSavings = financialData.reduce((sum, item) => sum + item.savings, 0);
  const totalSpending = financialData.reduce((sum, item) => sum + item.spending, 0);

  // Ambil streakDays & moneySaved dari database untuk sinkronisasi real-time
  const [dbStreakDays, setDbStreakDays] = useState(0);
  const [dbMoneySaved, setDbMoneySaved] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const stats = await fetchUserJourneyStats(userId);
        if (stats) {
          setDbStreakDays(stats.streakDays || 0);
          setDbMoneySaved(stats.moneySaved || 0);
        }
      } catch (e) {
        console.error("Gagal fetch stats dari database", e);
        // Fallback ke localStorage
        const storedStreak = Number(localStorage.getItem("streakDays") || "0");
        const storedMoney = Number(localStorage.getItem("homeMoneySaved") || "0");
        setDbStreakDays(Number.isNaN(storedStreak) ? 0 : storedStreak);
        setDbMoneySaved(Number.isNaN(storedMoney) ? 0 : storedMoney);
      }
    };
    fetchStats();
  }, [userPhase]);

  const displayStreakDays = userPhase === "PRE_QUIT" ? preQuitStreak : (userPhase === "POST_QUIT" ? streakDays : 0);
  const moneySaved = userPhase === "POST_QUIT" ? dbMoneySaved : totalSavings;

  // Rokok yang dihindari:
  // PRE-QUIT: hitung hanya untuk hari dengan data input (jangan asumsi 7 hari baseline)
  // POST-QUIT: streakDays * baselineConsumption
  const hasAnyConsumptionData = consumptionData.some(val => val > 0) || financialData.length > 0;
  let cigarettesAvoided = 0;
  if (userPhase === "PRE_QUIT" && hasAnyConsumptionData) {
    // Hitung hanya dari data finansial yang punya input (avoided sudah dihitung per hari)
    cigarettesAvoided = financialData.reduce((sum, item) => {
      // item.savings sudah dalam rupiah, konversi kembali ke batang rokok
      const avoidsInCigs = item.savings / pricePerCigarette;
      return sum + avoidsInCigs;
    }, 0);
    cigarettesAvoided = Math.round(cigarettesAvoided);
  } else if (userPhase === "POST_QUIT") {
    cigarettesAvoided = baselineConsumption * displayStreakDays;
  }

  // Progress PRE-QUIT: sisa hari menuju tanggal berhenti (pakai selectedDays dari onboarding)
  let preQuitProgressPercent = 0;
  if (userPhase === "PRE_QUIT" && typeof window !== "undefined") {
    const totalDaysRaw = Number(localStorage.getItem("selectedDays") || "0");
    const totalDays = Number.isNaN(totalDaysRaw) ? 0 : totalDaysRaw;
    
    if (totalDays > 0) {
      // Calculate actual days passed since journey start
      const startDateStr = localStorage.getItem("journeyStartDate");
      if (startDateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(startDateStr);
        startDate.setHours(0, 0, 0, 0);
        
        const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysPassedClamped = Math.max(0, Math.min(totalDays, daysPassed));
        preQuitProgressPercent = Math.max(0, Math.min(100, (daysPassedClamped / totalDays) * 100));
      } else {
        // Fallback to countdown-based calculation
        const countdownRaw = Number(localStorage.getItem("countdownDays") || `${totalDays}`);
        const countdown = Number.isNaN(countdownRaw) ? totalDays : countdownRaw;
        const done = Math.max(0, totalDays - countdown);
        preQuitProgressPercent = Math.max(0, Math.min(100, (done / totalDays) * 100));
      }
    }
  }

  // Average craving intensity for POST-QUIT stability insight
  const avgCravingIntensity =
    cravingHistory.reduce((sum, c) => sum + c.intensity, 0) / cravingHistory.length;
  
  // Map icon strings from JSON to actual icon components
  const iconMap: Record<string, any> = {
    HeartPulse,
    Wind,
    Activity,
    Brain,
    Lightbulb,
  };

  // Load health milestones from JSON and map icons
  const ALL_HEALTH_MILESTONES = healthMilestonesData.map((milestone) => ({
    ...milestone,
    icon: iconMap[milestone.icon] || Activity,
  }));

  // Pagination state for health benefits
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4; // Show 4 cards per page

  // Filter health benefits based on current streak days
  const getAllRelevantBenefits = () => {
    if (userPhase === "PRE_QUIT") {
      // PRE-QUIT: Show first 10-12 milestones as preview (what awaits them)
      return ALL_HEALTH_MILESTONES.slice(0, 12).map(m => ({
        icon: m.icon,
        title: m.title,
        value: m.value,
        desc: m.desc,
        journalName: m.journalName,
        journalUrl: m.journalUrl,
        isAchieved: false, // All are upcoming for PRE-QUIT
      }));
    }

    // POST-QUIT: Show ALL milestones that user has achieved + upcoming milestones
    const achieved = ALL_HEALTH_MILESTONES.filter(m => displayStreakDays >= m.minDays);
    const upcoming = ALL_HEALTH_MILESTONES.filter(m => displayStreakDays < m.minDays).slice(0, 3);
    
    // Combine achieved + upcoming (show all)
    const result = [...achieved, ...upcoming];
    
    return result.map(m => ({
      icon: m.icon,
      title: m.title,
      value: m.value,
      desc: m.desc,
      journalName: m.journalName,
      journalUrl: m.journalUrl,
      isAchieved: displayStreakDays >= m.minDays,
    }));
  };

  const allHealthBenefits = getAllRelevantBenefits();
  const totalPages = Math.ceil(allHealthBenefits.length / itemsPerPage);
  const healthBenefits = allHealthBenefits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // === AI Insight Mock (Only for Financial tab and PRE-QUIT health) ===
  const [aiInsight, setAiInsight] = useState("");
  useEffect(() => {
    // Jika belum ada data sama sekali, tampilkan pesan welcome
    if (financialData.length === 0 && consumptionData.every(val => val === 0)) {
      setAiInsight(
        "Selamat datang di Tracker! Mulai catat konsumsi rokok harianmu untuk melihat progress dan penghematan yang kamu capai. Setiap langkah kecil adalah awal dari perubahan besar!"
      );
      return;
    }
    
    if (userPhase === "POST_QUIT") {
      // POST-QUIT: Only show AI insight for financial tab
      if (activeTab === "financial") {
        const maxSavings = financialData.length > 0 ? Math.max(...financialData.map(d => d.savings)) : 0;
        setAiInsight(
          `Luar biasa! Dalam 7 hari terakhir, kamu telah menghemat total Rp ${totalSavings.toLocaleString("id-ID")}${maxSavings > 0 ? `, dengan prestasi tertinggi sebesar Rp ${maxSavings.toLocaleString("id-ID")}` : ''}. Konsistensimu sangat membanggakan, teruslah mempertahankan momentum ini!`
        );
      }
      // Note: No AI insight for POST-QUIT health tab - it shows milestone cards instead
    } else {
      // PRE-QUIT: Show AI insight for both tabs
      if (activeTab === "financial") {
        if (totalSavings === 0) {
          setAiInsight(
            "Mulai catat konsumsi rokok harianmu! Dengan mengurangi jumlah rokok yang kamu hisap, kamu akan melihat penghematan uang yang bisa digunakan untuk hal-hal yang lebih bermanfaat."
          );
        } else {
          const maxSavings = financialData.length > 0 ? Math.max(...financialData.map(d => d.savings)) : 0;
          setAiInsight(
            `Wah, luar biasa! Minggu ini kamu sudah berhasil mengumpulkan total penghematan Rp ${totalSavings.toLocaleString("id-ID")}${maxSavings > 0 ? `, dengan prestasi tertinggi sebesar Rp ${maxSavings.toLocaleString("id-ID")}` : ''}. Terus pertahankan usahamu!`
          );
        }
      } else {
        setAiInsight(
          "Tubuhmu mulai merasakan perubahan positif! Nafas terasa lebih ringan dengan peningkatan kapasitas paru-paru 12%, dan detak jantungmu mulai kembali normal. Terus pertahankan usahamu, karena setiap hari tanpa rokok adalah investasi besar untuk kesehatanmu."
        );
      }
    }
  }, [userPhase, activeTab, totalSavings, financialData, consumptionData]);

  const getCravingStyle = (intensity: number) => {
    if (intensity >= 4) return { color: "bg-red-100 text-red-800", dot: "bg-red-500" };
    if (intensity === 3) return { color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" };
    return { color: "bg-green-100 text-green-800", dot: "bg-green-500" };
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
        const { supabase } = await import('@/lib/supabase');
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
        if (journey) {
          setUserPhase(journey.phase);
          setCountdownDays(newTargetDays);
          setStreakDays(0);
        }
        return;
      }

      // Case 2: PRE_QUIT user has 14+ consecutive days of zero → Auto transition to POST_QUIT
      if (currentPhase === "PRE_QUIT") {
        const logs = await fetchDailyConsumptionLogs(userId);
        if (!logs.length) return;

        const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
        const uniqueByDate = Object.values(
          sorted.reduce<Record<string, typeof sorted[0]>>((acc, log) => {
            if (!acc[log.date]) acc[log.date] = log;
            return acc;
          }, {})
        ).sort((a, b) => b.date.localeCompare(a.date));

        const last14 = uniqueByDate.slice(0, 14);
        if (last14.length < 14) return;

        const allZero = last14.every((d) => (d.cigarette_count ?? 0) === 0);
        if (!allZero) return;

        const firstZeroDate = last14[last14.length - 1].date;
        await upsertJourneyStatus(userId, firstZeroDate, "POST_QUIT");
        
        // Save actualQuitDate to user_profile for cross-device sync
        const { supabase } = await import('@/lib/supabase');
        await supabase
          .from('user_profile')
          .update({
            actual_quit_date: firstZeroDate,
          })
          .eq('user_id', userId);
        
        setUserPhase("POST_QUIT");
        
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
        if (journey) {
          setUserPhase(journey.phase);
          setStreakDays(14);
          setCountdownDays(0);
        }
      }
    } catch (e) {
      console.error("checkPhaseTransition error", e);
    }
  };

  const handleLogConsumption = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    
    // Allow 0 cigarettes - it means user didn't smoke today
    setTodaysConsumption(sliderValue[0]);
    
    const today = new Date().toISOString().split('T')[0];
    const pricePerCigarette = 1750;
    const moneySpent = sliderValue[0] * pricePerCigarette;
    
    try {
      // Save to Supabase with check for existing entry
      const { supabase } = await import('@/lib/supabase');
      
      const cigaretteCount = Number(sliderValue[0]);
      
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
        console.error("❌ TrackerPage - Error checking existing entry:", checkError);
        throw checkError;
      }
      
      console.log("🔍 TrackerPage - Existing entry check:", existing);
      
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
          console.error("❌ TrackerPage - Update error:", updateError);
          throw updateError;
        }
        console.log("✅ TrackerPage - Update successful:", updateData);
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
          console.error("❌ TrackerPage - Insert error:", insertError);
          throw insertError;
        }
        console.log("✅ TrackerPage - Insert successful:", insertData);
      }
      
      // Show success message
      toast({
        title: "Berhasil!",
        description: `✓ Berhasil mencatat ${sliderValue[0]} batang rokok hari ini`,
        variant: "default",
      });
      
      // Reset slider
      setSliderValue([0]);

      // Check for phase transition after logging
      await checkPhaseTransition(userId, sliderValue[0]);
      
      // Reload consumption data to update charts and stats
      const logs = await fetchDailyConsumptionLogs(userId);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      if (logs.length === 0) {
        setConsumptionData([0, 0, 0, 0, 0, 0, 0]);
        setFinancialData([]);
        setPreQuitStreak(0);
      } else {
        const { subDays } = await import('date-fns');
        const days = Array.from({ length: 7 }).map((_, i) => subDays(todayDate, 6 - i));
        const perDay: Record<string, number> = {};
        logs.forEach((l) => {
          perDay[l.date] = l.cigarette_count || 0;
        });
        const consArray = days.map((d) => {
          const key = d.toISOString().split("T")[0];
          return perDay[key] ?? 0;
        });
        
        console.log("📊 After Log - Updated Consumption Array:", consArray);
        console.log("📊 After Log - perDay data:", perDay);
        setConsumptionData(consArray);

        // Calculate new streak
        let streak = 0;
        for (let i = consArray.length - 1; i >= 0; i--) {
          const val = consArray[i];
          if (val === 0 && perDay[days[i].toISOString().split("T")[0]] !== undefined) {
            streak += 1;
          } else if (perDay[days[i].toISOString().split("T")[0]] === undefined) {
            break;
          } else {
            break;
          }
        }
        setPreQuitStreak(streak);

        // Update financial data
        const { format } = await import('date-fns');
        const { id } = await import('date-fns/locale');
        const baselineConsumption = 20;
        const fin = days.map((date, i) => {
          const key = date.toISOString().split("T")[0];
          const hasData = perDay[key] !== undefined;
          const actualConsumption = consArray[i];
          const spending = hasData ? actualConsumption * pricePerCigarette : 0;
          const avoided = hasData ? Math.max(0, baselineConsumption - actualConsumption) : 0;
          const savings = avoided * pricePerCigarette;
          
          return {
            date,
            spending,
            savings,
            label: format(date, "d MMM", { locale: id }),
          };
        });
        setFinancialData(fin);
      }
    } catch (error) {
      console.error('Failed to save consumption:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data. Coba lagi.",
        variant: "destructive",
      });
    }
  };

  const CustomizedLabel = (props: any) => {
    const { x, y, value } = props;
    return <text x={x} y={y} dy={-10} fill="#004030" fontSize={11} textAnchor="middle">{value}</text>;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      if (activeTab === "financial") {
        return (
          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
            <p className="text-sm font-bold text-gray-800 mb-2">{data.label}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-xs text-gray-600">Total pengeluaran:</span>
                <span className="text-sm font-semibold text-red-600">Rp {data.spending.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-xs text-gray-600">Total uang dihemat:</span>
                <span className="text-sm font-semibold text-green-600">Rp {data.savings.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>
        );
      }
      
      const formattedLabel = format(new Date(label), "EEE, dd MMM yyyy", { locale: id });
      const prevDayIndex = chartData.findIndex(d => d.date.getTime() === new Date(label).getTime()) - 1;
      const prevDayData = prevDayIndex >= 0 ? chartData[prevDayIndex] : null;
      const change = prevDayData ? data.consumption - prevDayData.consumption : 0;

      return (
        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-bold text-gray-800">{formattedLabel}</p>
          <p className="text-lg font-semibold text-primary my-1">{data.consumption} batang</p>
          {prevDayData && (
            <div className="flex items-center text-xs text-gray-600">
              {change < 0 ? <ArrowDown className="w-3 h-3 mr-1 text-green-500" /> :
                change > 0 ? <ArrowUp className="w-3 h-3 mr-1 text-red-500" /> :
                  <Minus className="w-3 h-3 mr-1 text-gray-500" />}
              <span>{Math.abs(change)} batang dari hari sebelumnya</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // ===================== RENDER ======================
  return (
    <div className="relative max-w-md mx-auto md:max-w-lg lg:max-w-xl">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      <div className="px-4 py-6">
        {/* Title */}
        <motion.h1
          className="text-xl font-bold text-green-900 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {userPhase === "PRE_QUIT" ? "Progress Konsumsi & Craving" : "Refleksi dan Perjalananmu"}
        </motion.h1>

        {/* Ringkasan Utama: sinkron dengan Home (tanpa durasi program / progress bar) */}
        <motion.div
          className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Ringkasan Perjalananmu</h2>
            <Lightbulb className="w-5 h-5 text-yellow-500" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">
                {userPhase === "PRE_QUIT" ? "Hari menuju berhenti" : "Hari tanpa rokok"}
              </p>
              <p className="text-3xl font-bold text-green-600" suppressHydrationWarning>
                {userPhase === "PRE_QUIT" ? countdownDays : displayStreakDays}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {userPhase === "PRE_QUIT"
                  ? "Sisa hari hingga target berhenti merokok."
                  : "Streak konsisten bebas rokok."}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">
                {userPhase === "PRE_QUIT" ? "Streak hari tanpa rokok" : "Rokok yang dihindari"}
              </p>
              <p className="text-3xl font-bold text-orange-600" suppressHydrationWarning>
                {userPhase === "PRE_QUIT" ? preQuitStreak : cigarettesAvoided}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {userPhase === "PRE_QUIT" 
                  ? "Hari berturut-turut tanpa merokok (0 batang)."
                  : "Perkiraan total batang yang tidak dihisap."}
              </p>
            </div>
          </div>

          {/* Progress bar PRE-QUIT: kemajuan menuju hari berhenti */}
          {userPhase === "PRE_QUIT" && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
                <span>Progress menuju hari berhenti</span>
                <span suppressHydrationWarning>{Math.round(preQuitProgressPercent)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                  style={{ width: `${preQuitProgressPercent}%` }}
                  suppressHydrationWarning
                />
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Total uang yang dihemat</span>
            </div>
            <span className="text-sm font-semibold text-green-700" suppressHydrationWarning>
              Rp {moneySaved.toLocaleString("id-ID")}
            </span>
          </div>
        </motion.div>

        {/* Tabs Financial & Health */}
        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("financial")}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === "financial"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Finansial
            </button>
            <button
              onClick={() => setActiveTab("health")}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === "health"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Kesehatan
            </button>
          </div>
        </div>

        {/* Content berdasarkan Tab Aktif */}
        {activeTab === "financial" ? (
          <>
            {/* Rekap Keuangan Section */}
            <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Rekap Keuangan</h2>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-xs text-gray-600">Total pengeluaran</span>
                  </div>
                  <p className="text-xl font-bold text-red-600">Rp {(totalSpending / 1000).toFixed(0)}K</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-xs text-gray-600">Total uang dihemat</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">Rp {(totalSavings / 1000).toFixed(0)}K</p>
                </div>
              </div>

              {/* Chart */}
              <div className="h-56 mb-2">
                <ResponsiveContainer width="100%" height="100%" key={`financial-${financialData.length}`}>
                  <LineChart data={financialData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      dy={5}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: "#6B7280" }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      width={35}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="spending" 
                      stroke="#EF4444" 
                      strokeWidth={2.5}
                      dot={{ fill: "#EF4444", r: 4 }}
                      name="Pengeluaran"
                      isAnimationActive={true}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="savings" 
                      stroke="#10B981" 
                      strokeWidth={2.5}
                      dot={{ fill: "#10B981", r: 4 }}
                      name="Penghematan"
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-xs text-green-600 font-medium">
                Grafik rekap keuangan harian
              </p>
            </div>

            {/* AI Analysis */}
            <motion.div
              className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-green-800">Hasil Analisis</h3>
              </div>
              <p className="text-green-900 text-sm leading-relaxed">{aiInsight}</p>
            </motion.div>
          </>
        ) : (
          <>
            {/* PRE-QUIT: grafik konsumsi rokok mingguan + health benefits */}
            {userPhase === "PRE_QUIT" ? (
              <>
                <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Pola Konsumsi Mingguan</h2>
                  <p className="text-xs text-gray-500 mb-4">
                    Lihat bagaimana jumlah rokokmu berubah dari hari ke hari.
                  </p>
                  <div className="h-56 mb-2">
                    <ResponsiveContainer width="100%" height="100%" key={`chart-${consumptionData.join('-')}`}>
                      <LineChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d) => format(d, "d MMM", { locale: id })}
                          tick={{ fontSize: 11, fill: "#6B7280" }}
                          dy={5}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#6B7280" }}
                          tickFormatter={(value) => `${value}`}
                          width={28}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="consumption"
                          stroke="#059669"
                          strokeWidth={2.5}
                          dot={{ fill: "#059669", r: 4 }}
                          name="Batang per hari"
                          isAnimationActive
                        >
                          <LabelList content={<CustomizedLabel />} />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-xs text-green-600 font-medium">
                    Targetmu adalah menurunkan konsumsi secara bertahap hingga 0.
                  </p>
                </div>

                {/* PRE-QUIT Health Benefits - Paginated Milestones */}
                <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Manfaat Kesehatan yang Menanti</h2>
                  <p className="text-xs text-gray-600 mb-4">
                    Perubahan positif yang akan kamu rasakan saat mulai berhenti merokok
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {healthBenefits.map((benefit, index) => {
                      const IconComponent = benefit.icon;
                      return (
                        <motion.div
                          key={index}
                          className="rounded-xl p-4 border bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100 flex flex-col"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800 text-sm">{benefit.title}</h4>
                            </div>
                          </div>
                          <div className="mb-3">
                            <p className="text-2xl font-bold text-blue-600 mb-1">{benefit.value}</p>
                            <p className="text-xs text-gray-600 leading-relaxed">{benefit.desc}</p>
                          </div>
                          <div className="border-t border-blue-200 pt-3 mt-auto">
                            <div className="bg-white rounded-lg px-3 py-2">
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Referensi:</span>
                                <a 
                                  href={benefit.journalUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium leading-snug hover:underline"
                                >
                                  {benefit.journalName}
                                </a>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls for PRE-QUIT */}
                  {totalPages > 1 && (
                    <div className="mt-6">
                      {/* Mobile Pagination */}
                      <div className="flex md:hidden items-center justify-between gap-2 px-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-2 text-xs flex-shrink-0"
                        >
                          ← Prev
                        </Button>
                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-2">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            const showPage = Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                            if (!showPage) {
                              if (page === currentPage - 2 || page === currentPage + 2) {
                                return (
                                  <span key={page} className="text-gray-400 px-1">
                                    ...
                                  </span>
                                );
                              }
                              return null;
                            }
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                                  page === currentPage
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "bg-gray-100 text-gray-600 active:bg-gray-200"
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 text-xs flex-shrink-0"
                        >
                          Next →
                        </Button>
                      </div>

                      {/* Desktop Pagination */}
                      <div className="hidden md:flex items-center justify-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 text-sm"
                        >
                          ← Sebelumnya
                        </Button>
                        <div className="flex items-center gap-2">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                                page === currentPage
                                  ? "bg-blue-600 text-white shadow-md"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 text-sm"
                        >
                          Selanjutnya →
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Analysis for PRE-QUIT */}
                <motion.div
                  className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-blue-800">Hasil Analisis</h3>
                  </div>
                  <p className="text-blue-900 text-sm leading-relaxed">{aiInsight}</p>
                </motion.div>
              </>
            ) : (
              // POST-QUIT: ringkasan manfaat kesehatan berdasarkan streak days
              <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Perubahan Kesehatanmu</h2>
                  <div className="text-xs text-gray-500">
                    Hari ke-{streakDays}
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4">
                  Milestone kesehatan yang telah kamu capai berdasarkan penelitian medis
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {healthBenefits.map((benefit, index) => {
                    const IconComponent = benefit.icon;
                    const isAchieved = benefit.isAchieved;
                    return (
                      <motion.div
                        key={index}
                        className={`rounded-xl p-4 border flex flex-col ${
                          isAchieved 
                            ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200"
                            : "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200"
                        }`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isAchieved ? "bg-emerald-500" : "bg-gray-400"
                          }`}>
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className={`font-semibold text-sm ${isAchieved ? "text-gray-800" : "text-gray-600"}`}>
                              {benefit.title}
                            </h4>
                            {!isAchieved && (
                              <span className="text-xs text-gray-500 italic">Segera tercapai</span>
                            )}
                          </div>
                        </div>
                        <div className="mb-3">
                          <p className={`text-2xl font-bold mb-1 ${isAchieved ? "text-emerald-600" : "text-gray-400"}`}>
                            {benefit.value}
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed">{benefit.desc}</p>
                        </div>
                        <div className="border-t pt-3 mt-auto" style={{ borderColor: isAchieved ? "#a7f3d0" : "#e5e7eb" }}>
                          <div className="bg-white rounded-lg px-3 py-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Referensi:</span>
                              <a 
                                href={benefit.journalUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium leading-snug hover:underline"
                              >
                                {benefit.journalName}
                              </a>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {healthBenefits.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Terus pertahankan streak-mu!</p>
                    <p className="text-xs text-gray-400 mt-1">Milestone kesehatan akan muncul seiring bertambahnya hari</p>
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6">
                    {/* Mobile Pagination - Show only arrows and current page */}
                    <div className="flex md:hidden items-center justify-between gap-2 px-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-xs flex-shrink-0"
                      >
                        ← Prev
                      </Button>
                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // On mobile, show current page and adjacent pages only
                          const showPage = Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                          if (!showPage) {
                            // Show ellipsis for skipped pages
                            if (page === currentPage - 2 || page === currentPage + 2) {
                              return (
                                <span key={page} className="text-gray-400 px-1">
                                  ...
                                </span>
                              );
                            }
                            return null;
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                                page === currentPage
                                  ? "bg-emerald-600 text-white shadow-md"
                                  : "bg-gray-100 text-gray-600 active:bg-gray-200"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-xs flex-shrink-0"
                      >
                        Next →
                      </Button>
                    </div>

                    {/* Desktop Pagination - Show all page numbers */}
                    <div className="hidden md:flex items-center justify-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm"
                      >
                        ← Sebelumnya
                      </Button>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                              page === currentPage
                                ? "bg-emerald-600 text-white shadow-md"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm"
                      >
                        Selanjutnya →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Craving History (Show for both PRE-QUIT and POST-QUIT) */}
        <div className="bg-white rounded-2xl p-6 mt-6 shadow-lg border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">Riwayat Craving</h2>
            {cravingHistory.length > 5 && (
              <button
                onClick={() => router.push("/craving-history")}
                className="text-sm font-medium text-primary hover:underline"
              >
                Lihat Semua
              </button>
            )}
          </div>
          {isCravingLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-xs text-gray-500">Memuat riwayat craving...</p>
            </div>
          ) : cravingHistory.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Belum ada riwayat craving</p>
              <p className="text-xs text-gray-400 mt-1">
                {userPhase === "PRE_QUIT" 
                  ? "Catat craving pertamamu untuk melacak polanya"
                  : "Tracking craving membantumu memahami pola dan trigger"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cravingHistory.slice(0, 5).map((item, i) => {
              const style = getCravingStyle(item.intensity);
              return (
                <motion.div
                  key={i}
                  className={`p-4 rounded-lg ${style.color} flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => {
                    localStorage.setItem('cravingDetail', JSON.stringify(item));
                    router.push(`/craving-history/${item.id}`);
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className={`w-3 h-3 rounded-full ${style.dot}`}></div>
                  <div className="flex-1">
                    <div className="font-semibold text-base">{item.date}</div>
                  </div>
                  <div className="text-sm font-medium">Intensitas: {item.intensity}</div>
                </motion.div>
              );
            })}
            </div>
          )}
        </div>

        {/* Daily Consumption Tracker - Only for POST-QUIT */}
        {userPhase === "POST_QUIT" && (
          <motion.div 
            className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Catat Konsumsi Hari Ini</h3>
                <p className="text-xs text-gray-500">Monitoring penggunaan rokok jika ada</p>
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
    </div>
  );
};

export default TrackerPage;