import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, Tooltip, LabelList } from "recharts";
import { AppHeader } from "@/components/ui/app-header";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import ProgressRing from "@/components/ui/progress-ring";
import backimg4 from "@/assets/backimg4.jpg";
import InfoCard from "@/components/ui/InfoCard";

const TrackerPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // === Mock user phase ===
  const [userPhase, setUserPhase] = useState<"PRE_QUIT" | "POST_QUIT">("POST_QUIT");

  // === Mock data ===
  const today = new Date();
  const consumptionData = [8, 5, 3, 4, 2, 1, 0];
  const chartData = Array.from({ length: 7 }).map((_, i) => ({
    date: subDays(today, 6 - i),
    consumption: consumptionData[i],
  }));

  const cravingHistory = [
    { id: 1, emotion: "Stres", date: "Sabtu, 4 Juli 2025 14:30", intensity: 5, location: "di kantor", situation: "Banyak disekitar saya merokok" },
    { id: 2, emotion: "Bosan", date: "Jumat, 3 Juli 2025 20:15", intensity: 3, location: "di rumah", situation: "Menonton TV sendirian" },
    { id: 3, emotion: "Cemas", date: "Jumat, 3 Juli 2025 09:51", intensity: 2, location: "di kafe", situation: "Menunggu teman" },
    { id: 4, emotion: "Lelah", date: "Kamis, 2 Juli 2025 18:00", intensity: 4, location: "di mobil", situation: "Macet di jalan pulang" },
    { id: 5, emotion: "Senang", date: "Rabu, 1 Juli 2025 21:00", intensity: 1, location: "di pesta", situation: "Merayakan dengan teman" },
    { id: 6, emotion: "Stres", date: "Selasa, 30 Juni 2025 10:00", intensity: 5, location: "di kantor", situation: "Deadline pekerjaan" },
  ];

  const totalConsumption = chartData.reduce((sum, item) => sum + item.consumption, 0);
  const consumptionTrend = chartData[chartData.length - 1].consumption - chartData[0].consumption;
  const moneySaved = 124500; // mock: bisa dihitung dari konsumsi dikurangi baseline

  const progress = 78; // % progress
  const streakDays = 47;
  const targetDays = 60;

  // Average craving intensity for POST-QUIT stability insight
  const avgCravingIntensity =
    cravingHistory.reduce((sum, c) => sum + c.intensity, 0) / cravingHistory.length;

  // === AI Insight Mock ===
  const [emotionalInsight, setEmotionalInsight] = useState("");
  useEffect(() => {
    if (userPhase === "POST_QUIT") {
      setEmotionalInsight(
        "Craving emosionalmu kini jauh lebih stabil — kamu berhasil mengubah kebiasaan lama menjadi kekuatan baru."
      );
    } else {
      setEmotionalInsight(
        "Kamu makin dekat menuju hari bebas rokok! Fokus pada momen craving dan hindari pemicu di lingkunganmu."
      );
    }
  }, [userPhase]);

  const getCravingStyle = (intensity: number) => {
    if (intensity >= 4) return { color: "bg-red-100 text-red-800", dot: "bg-red-500" };
    if (intensity === 3) return { color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" };
    return { color: "bg-green-100 text-green-800", dot: "bg-green-500" };
  };

  const CustomizedLabel = (props: any) => {
    const { x, y, value } = props;
    return <text x={x} y={y} dy={-10} fill="#004030" fontSize={11} textAnchor="middle">{value}</text>;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
    <div className="flex flex-col bg-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex-1 px-4 py-6">
        {/* Title */}
        <motion.h1
          className="text-2xl font-bold text-gray-800 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {userPhase === "PRE_QUIT" ? "Progress Konsumsi & Craving" : "Refleksi dan Perjalananmu"}
        </motion.h1>

        {/* Progress Card (Shared) */}
        <motion.div
          className="relative rounded-2xl p-6 mb-6 text-white shadow-lg overflow-hidden bg-cover bg-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ backgroundImage: `url(${backimg4})` }}
        >
          <div className="relative z-10 bg-black/20 backdrop-blur-sm rounded-xl p-6 -m-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-300" />
                <span className="font-semibold text-lg">
                  {userPhase === "PRE_QUIT" ? "Menuju Hari Bebas Rokok" : "Hari Tanpa Rokok"}
                </span>
              </div>
              <div className="text-5xl font-bold">
                {userPhase === "PRE_QUIT" ? targetDays - streakDays : streakDays}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 my-6">
              <div className="w-32 h-32 sm:w-40 sm:h-40">
                <ProgressRing percentage={progress} color="#fff" strokeWidth={12} />
              </div>
              <div className="text-center">
                <div className="text-xl text-indigo-100 font-light">
                  {userPhase === "PRE_QUIT" ? "Menuju target berhenti" : "Pertahankan konsistensi!"}
                </div>
                <div className="text-5xl font-bold my-1">
                  {userPhase === "PRE_QUIT" ? `${streakDays}` : `${targetDays - streakDays}`}
                </div>
                <div className="text-lg text-indigo-200">
                  {userPhase === "PRE_QUIT" ? "Hari dilalui" : "Hari menuju 100!"}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Uang Dihemat (selalu tampil di kedua fase) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <InfoCard
            title="Uang Dihemat"
            value={`Rp ${moneySaved.toLocaleString("id-ID")}`}
            icon={CircleDollarSign}
            color="bg-green-500"
            bgColor="bg-white"
          />
          {userPhase === "POST_QUIT" && (
            <InfoCard
              title="Hari Stabil Tanpa Craving"
              value={`${Math.round((6 - avgCravingIntensity) / 5 * 100)}%`}
              icon={CalendarCheck}
              color="bg-blue-500"
              bgColor="bg-white"
            />
          )}
        </div>

        {/* PRE-QUIT SECTION */}
        {userPhase === "PRE_QUIT" && (
          <>
            {/* Chart */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow-lg border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-2">Tren Merokok 7 Hari</h2>
              <p className="text-sm text-gray-600 mb-4">
                Total <span className="font-bold text-primary">{totalConsumption}</span> batang minggu ini.
                {consumptionTrend < 0
                  ? <span className="text-green-600"> Tren menurun, hebat!</span>
                  : <span className="text-red-600"> Tren meningkat, ayo lebih fokus!</span>}
              </p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => format(d, "EEE, dd", { locale: id })}
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      dy={10}
                    />
                    <YAxis tick={false} domain={[0, "dataMax + 2"]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="consumption" stroke="none" fill="#FCD34D22" />
                    <Line type="monotone" dataKey="consumption" stroke="#F59E0B" strokeWidth={3}>
                      <LabelList content={<CustomizedLabel />} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Craving History */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">Riwayat Craving</h2>
                {cravingHistory.length > 5 && (
                  <button
                    onClick={() => navigate("/craving-history")}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Lihat Semua
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {cravingHistory.slice(0, 5).map((item, i) => {
                  const style = getCravingStyle(item.intensity);
                  return (
                    <motion.div
                      key={i}
                      className={`p-3 rounded-lg ${style.color} flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow`}
                      onClick={() => navigate(`/craving-history/${item.id}`, { state: { craving: item } })}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className={`w-3 h-3 rounded-full ${style.dot}`}></div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.emotion}</div>
                        <div className="text-xs opacity-75">{item.date}</div>
                      </div>
                      <div className="text-sm font-medium">Intensitas: {item.intensity}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* POST-QUIT SECTION */}
        {userPhase === "POST_QUIT" && (
          <>
            {/* Insight Card */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-5 h-5 text-green-700" />
                <h3 className="text-lg font-semibold text-green-800">Insight Emosional Minggu Ini</h3>
              </div>
              <p className="text-green-700 text-sm leading-relaxed">{emotionalInsight}</p>
            </div>

            {/* Reflection */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <HeartPulse className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-gray-800">Refleksi Positif</h3>
              </div>
              <ul className="list-disc list-inside text-gray-700 space-y-2 text-sm">
                <li>Nafas terasa lebih ringan dan stamina meningkat.</li>
                <li>Lebih tenang menghadapi stres dibanding sebelumnya.</li>
                <li>Hubungan sosial makin positif tanpa aroma rokok.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TrackerPage;