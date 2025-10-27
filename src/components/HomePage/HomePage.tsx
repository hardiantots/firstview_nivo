import { useState, useEffect, FC } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Cigarette, CircleDollarSign, LucideIcon } from "lucide-react";
import backgroundImage from "@/assets/backgroundimg2.png";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/ui/app-header";
import { Slider } from "@/components/ui/slider";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";

const HomePage = () => {
  const navigate = useNavigate();
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

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) {
        navigate("/signin");
        return;
      }

      const mockUserData = {
        userName: "Budi",
        userCondition: "POST_QUIT",
        countdownDays: 15,
        personalMotivation: "Untuk bisa bermain futsal lagi dengan teman-teman tanpa cepat lelah."
      };

      setUserName(mockUserData.userName);
      setMoneySaved(12345);
      setUserStatus(mockUserData.userCondition);
      setCountdownDays(mockUserData.countdownDays || 0);
      setStreakDays(mockUserData.countdownDays || 0);
      setUserMotivation(mockUserData.personalMotivation);

      if (mockUserData.userCondition === "PRE_QUIT") {
        const totalHours = mockUserData.countdownDays * 24;
        setTimeProgress({
          months: Math.floor(mockUserData.countdownDays / 30),
          days: mockUserData.countdownDays % 30,
          hours: totalHours % 24
        });
      } else {
        const totalDays = 127;
        setTimeProgress({
          months: Math.floor(totalDays / 30),
          days: totalDays % 30,
          hours: new Date().getHours()
        });
      }

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
          greeting: `Luar biasa, ${mockUserData.userName}! ${streakDays} hari tanpa rokok adalah pencapaian yang sangat membanggakan!`,
          dynamicCard: {
            type: "MOTIVATION_REMINDER",
            title: "Ingat Alasan Terkuatmu",
            content: mockUserData.personalMotivation
          }
        });
      }
    };
    fetchUserData();
  }, [navigate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleLogConsumption = async () => {
    setTodaysConsumption(sliderValue[0]);
    setShowConsumptionDialog(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen relative">
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Main Content */}
        <div className="flex-1 px-4 py-6 relative overflow-y-auto"> 
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative mb-6 text-white overflow-hidden rounded-2xl p-6"
            style={{
              background: `url(${backgroundImage}) no-repeat center center`,
              backgroundSize: "cover",
            }}
          >
            <div className="relative z-10 space-y-6">
              <div>
                <h1 className="text-xl text-teal-800 font-bold mb-1">{nivoCoachContent.greeting}</h1>
                <p className="text-teal-800 text-sm">NIVO mendukung perjalananmu!</p>
              </div>

              {/* Progress Section */}
              <div className="p-4 bg-black/20 backdrop-blur-sm rounded-xl">
                <h3 className="text-sm mb-3">
                  {userStatus === "PRE_QUIT" ? "Waktu Menuju Hari Bebas Rokok" : "Waktu Bebas dari Rokok"}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <TimeStatItem value={timeProgress.months} label="Bulan" />
                  <TimeStatItem value={timeProgress.days} label="Hari" />
                  <TimeStatItem value={timeProgress.hours} label="Jam" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4 text-center mt-10">
                  <StatItem
                    icon={Flame}
                    value={userStatus === "PRE_QUIT" ? `${countdownDays}` : `${streakDays}`}
                    label={userStatus === "PRE_QUIT" ? "Hari Menuju Target" : "Total Hari Tanpa Rokok"}
                  />
                  <StatItem icon={CircleDollarSign} value={formatCurrency(moneySaved)} label="Uang Dihemat" />
                </div>
              </div>

              {/* Dynamic Card */}
              <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">{nivoCoachContent.dynamicCard.title}</h3>
                <p className={`text-md leading-relaxed ${nivoCoachContent.dynamicCard.type === "MOTIVATION_REMINDER" ? "italic" : ""}`}>
                  {nivoCoachContent.dynamicCard.content}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Emergency Button */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-8 rounded-xl transition-all hover:shadow-lg text-lg"
              onClick={() => navigate("/craving-support")}
            >
              ! SAYA INGIN MEROKOK
            </Button>
          </motion.div>

          {/* Daily Consumption Tracker */}
          <motion.div 
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Konsumsi Hari Ini</h3>
                <p className="text-sm text-gray-500">Catat jumlah rokok yang dikonsumsi.</p>
              </div>
              <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                <Cigarette className="w-6 h-6" />
                <span>{sliderValue[0]}</span>
              </div>
            </div>

            <div className="mb-6 px-2">
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                max={24}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>0</span>
                <span>24</span>
              </div>
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2"
              onClick={handleLogConsumption}
            >
              Catat Konsumsi
            </Button>
          </motion.div>
        </div>

        {/* Gradient Fade at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/90 to-transparent pointer-events-none"></div>
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
  <div className="text-center">
    <div className="text-3xl font-bold mb-1">{value}</div>
    <div className="text-sm">{label}</div>
  </div>
);

interface StatItemProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
}
const StatItem: FC<StatItemProps> = ({ icon: Icon, value, label }) => (
  <div>
    <div className="bg-white/20 p-3 rounded-full inline-block mb-1">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs">{label}</div>
  </div>
);

export default HomePage;