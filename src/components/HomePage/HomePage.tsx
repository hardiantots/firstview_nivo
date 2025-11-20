'use client'

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

const HomePage = () => {
  const router = useRouter();
  const [todaysConsumption, setTodaysConsumption] = useState(0);
  const [sliderValue, setSliderValue] = useState([0]);
  const [userName, setUserName] = useState("User");
  const [moneySaved, setMoneySaved] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userStatus, setUserStatus] = useState<"PRE_QUIT" | "POST_QUIT">("POST_QUIT");
  const [showConsumptionDialog, setShowConsumptionDialog] = useState(false);
  const [timeProgress, setTimeProgress] = useState({ months: 0, days: 0, hours: 0 });
  const [streakDays, setStreakDays] = useState(0);
  const [userMotivation, setUserMotivation] = useState("");
  const [countdownDays, setCountdownDays] = useState(0);
  const [badgeIndex, setBadgeIndex] = useState(0);

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

  /* ===== ACHIEVEMENT DATA ===== */
  type Achievement = {
    id: number;
    icon: LucideIcon;
    title: string;
    description: string;
    completed: boolean;
    locked?: boolean;
  };

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

  const milestoneData = userStatus === "PRE_QUIT" ? PRE_QUIT_MILESTONES : POST_QUIT_MILESTONES;
  const behaviorData = userStatus === "PRE_QUIT" ? PRE_QUIT_BEHAVIOR : POST_QUIT_BEHAVIOR;
  const allBadges = useMemo(() => [...milestoneData, ...behaviorData], [milestoneData, behaviorData]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) {
        router.push("/signin");
        return;
      }

      const mockUserData = {
        userName: "Budi",
        userCondition: "POST_QUIT" as "PRE_QUIT" | "POST_QUIT",
        countdownDays: 15,
        streakDays: 127,
        personalMotivation: "Untuk bisa bermain futsal lagi dengan teman-teman tanpa cepat lelah.",
        moneySaved: 12345
      };

      setUserName(mockUserData.userName);
      setMoneySaved(mockUserData.moneySaved);
      setUserStatus(mockUserData.userCondition);
      setCountdownDays(mockUserData.countdownDays);
      setStreakDays(mockUserData.streakDays);
      setUserMotivation(mockUserData.personalMotivation);

      if (mockUserData.userCondition === "PRE_QUIT") {
        const totalHours = mockUserData.countdownDays * 24;
        setTimeProgress({
          months: Math.floor(mockUserData.countdownDays / 30),
          days: mockUserData.countdownDays % 30,
          hours: totalHours % 24
        });
      } else {
        setTimeProgress({
          months: Math.floor(mockUserData.streakDays / 30),
          days: mockUserData.streakDays % 30,
          hours: new Date().getHours()
        });
      }

      // Save userCondition to localStorage for PencapaianPage
      localStorage.setItem("userCondition", mockUserData.userCondition);

      const dailyMissions = [
        "Identifikasi 3 situasi yang memicu keinginan merokok hari ini.",
        "Beritahu satu teman dekat tentang rencanamu berhenti merokok.",
        "Bersihkan ruang favoritmu dari asbak dan pemantik.",
        "Siapkan camilan sehat sebagai pengganti rokok di tasmu.",
        "Unduh aplikasi meditasi dan coba latihan pernapasan 5 menit.",
        "Buat daftar aktivitas yang bisa kamu lakukan saat keinginan merokok muncul.",
        "Hitung dan catat berapa banyak uang yang bisa kamu hemat dalam sebulan tanpa rokok."
      ];

      const randomMission = dailyMissions[Math.floor(Math.random() * dailyMissions.length)];

      if (mockUserData.userCondition === "PRE_QUIT") {
        setNivoCoachContent({
          greeting: `Semangat, ${mockUserData.userName}! ${mockUserData.countdownDays} hari lagi menuju hari bebasmu dari rokok.`,
          dynamicCard: {
            type: "DAILY_MISSION",
            title: "Misi Persiapan Hari Ini",
            content: randomMission
          }
        });
      } else {
        setNivoCoachContent({
          greeting: `Luar biasa, ${mockUserData.userName}! ${mockUserData.streakDays} hari tanpa rokok sangat membanggakan!`,
          dynamicCard: {
            type: "MOTIVATION_REMINDER",
            title: "Ingat Alasan Terkuatmu",
            content: mockUserData.personalMotivation
          }
        });
      }
    };
    fetchUserData();
  }, [router, setUserName, setMoneySaved, setUserStatus, setCountdownDays, setStreakDays, setUserMotivation, setTimeProgress, setNivoCoachContent]);

  // Auto-slide badge carousel every 15 seconds
  useEffect(() => {
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

  const handleLogConsumption = async () => {
    if (sliderValue[0] === 0) {
      alert("Pilih jumlah rokok terlebih dahulu");
      return;
    }

    setTodaysConsumption(sliderValue[0]);
    
    // Log ke localStorage (sementara, bisa diganti dengan API call)
    const today = new Date().toISOString().split('T')[0];
    const consumptionLog = {
      date: today,
      amount: sliderValue[0],
      timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    const existingLogs = JSON.parse(localStorage.getItem("consumptionLogs") || "[]");
    const updatedLogs = existingLogs.filter((log: any) => log.date !== today);
    updatedLogs.push(consumptionLog);
    localStorage.setItem("consumptionLogs", JSON.stringify(updatedLogs));
    
    // Show success message
    alert(`✓ Berhasil mencatat ${sliderValue[0]} batang rokok hari ini`);
    
    // Reset slider
    setSliderValue([0]);
  };

  return (
    <div className="relative">
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
                <h1 className="text-2xl text-white font-bold mb-2 drop-shadow-lg leading-tight">{nivoCoachContent.greeting}</h1>
                <p className="text-white/90 text-sm drop-shadow-md">NIVO mendukung perjalananmu!</p>
              </div>

              {/* Time Progress Section */}
              <div className="backdrop-blur-md bg-white/10 p-6 rounded-2xl border border-white/20">
                <p className="text-xs text-white font-medium mb-4 text-center uppercase tracking-wider">
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
            <p className={`text-sm leading-relaxed text-teal-800 ${nivoCoachContent.dynamicCard.type === "MOTIVATION_REMINDER" ? "italic" : ""}`}>
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

          {/* Metrics Section - New Layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex gap-3 items-center"
          >
            {/* Left Card - Smoke Free Days */}
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-4 shadow-md flex-1 h-32 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-2">
                <Cigarette className="w-5 h-5 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {userStatus === "PRE_QUIT" ? countdownDays : streakDays}
              </div>
              <div className="text-xs text-white/90 font-medium">
                {userStatus === "PRE_QUIT" ? "Hari Menuju" : "Hari Tanpa"}<br />Rokok
              </div>
            </div>

            {/* Right Card - Money Saved Progress */}
            <div className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-4 shadow-md h-32 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-2">
                <CircleDollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{formatCurrency(moneySaved)}</div>
              <div className="text-xs text-white/90 font-medium">Dihemat</div>
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

          {/* Daily Consumption Tracker */}
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
      </div>
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
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-xs text-white/80">{label}</div>
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