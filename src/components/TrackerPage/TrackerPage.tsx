
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { Trophy, Cigarette, TrendingUp, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, Tooltip, LabelList } from "recharts";
import { AppHeader } from "@/components/ui/app-header";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import ProgressRing from "@/components/ui/progress-ring";
import InfoCard from "@/components/ui/InfoCard";

const TrackerPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Generate chart data for the last 7 days
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
  ];

  const getCravingStyle = (intensity: number) => {
    if (intensity >= 4) {
      return { color: "bg-red-100 text-red-800", dot: "bg-red-500" };
    }
    if (intensity === 3) {
      return { color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" };
    }
    return { color: "bg-green-100 text-green-800", dot: "bg-green-500" };
  };

  const getIntensityLabel = (intensity: number) => {
    return `Intensitas: ${intensity}`;
  }

  const handleCravingHistoryClick = (item: typeof cravingHistory[0]) => {
    navigate(`/craving-history/${item.id}`, { state: { craving: item } });
  }

  const totalConsumption = chartData.reduce((sum, item) => sum + item.consumption, 0);
  const consumptionTrend = chartData[chartData.length - 1].consumption - chartData[0].consumption;

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
              {change < 0 ? <ArrowDown className="w-3 h-3 mr-1 text-green-500" /> : change > 0 ? <ArrowUp className="w-3 h-3 mr-1 text-red-500" /> : <Minus className="w-3 h-3 mr-1 text-gray-500" />}
              <span>{Math.abs(change)} batang dari hari sebelumnya</span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">Kerja bagus! Terus kurangi ya.</p>
        </div>
      );
    }
    return null;
  };

  const CustomizedLabel = (props: any) => {
    const { x, y, value } = props;
    return <text x={x} y={y} dy={-10} fill="#004030" fontSize={11} textAnchor="middle">{value}</text>;
  };

  const progress = 78; // Example progress percentage

  return (
    <div className="flex flex-col bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Main Content */}
      <div className="flex-1 px-4 py-6">
        <motion.h1 
          className="text-2xl font-bold text-gray-800 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Progress Anda
        </motion.h1>
        
        {/* Main Progress Card */}
        <motion.div 
          className="relative bg-gradient-to-br from-primary to-orange-500 rounded-2xl p-6 mb-6 text-white shadow-lg overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-primary to-orange-500 bg-[length:200%_200%]"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Trophy className="w-6 h-6 text-yellow-300" />
                </div>
                <span className="font-semibold text-lg">Hari Tanpa Rokok</span>
              </div>
              <div className="text-5xl font-bold">47</div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 my-6">
              <div className="w-32 h-32 sm:w-40 sm:h-40"><ProgressRing percentage={progress} color="#fff" strokeWidth={12} /></div>
              <div className="text-center">
                <div className="text-xl font-light text-indigo-200">Menuju tujuanmu!</div>
                <div className="text-5xl font-bold my-1">{60 - 47}</div>
                <div className="text-lg text-indigo-200">Hari tersisa</div>
              </div>
            </div>

            <div className="text-center text-indigo-100 text-sm mt-4">
              Kamu hebat! Pertahankan kerja kerasmu.
            </div>
          </div>
        </motion.div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <InfoCard 
            title="Streak Terbaik"
            value="47"
            subtitle="Hari"
            icon={TrendingUp}
            color="bg-green-500"
            bgColor="bg-white"
          />
          <InfoCard 
            title="Jumlah Rokok"
            value="235"
            subtitle="Batang"
            icon={Cigarette}
            color="bg-red-500"
            bgColor="bg-white"
          />
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-2xl p-4 md:p-6 mb-6 shadow-lg border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Tren Merokok 7 Hari</h2>
          <div className="text-sm text-gray-600 mb-4">
            Total <span className="font-bold text-primary">{totalConsumption}</span> batang minggu ini.
            {consumptionTrend < 0 ? (
              <span className="text-green-600"> Tren menurun, bagus!</span>
            ) : (
              <span className="text-red-600"> Tren meningkat, ayo lebih semangat!</span>
            )}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(date) => format(date, "EEE, dd", { locale: id })}
                  dy={10}
                />
                <YAxis 
                  axisLine
                  tickLine={false}
                  tick={false}
                  domain={[0, 'dataMax + 2']}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="consumption"
                  stroke="none"
                  fill="url(#areaGradient)"
                />
                <Line 
                  type="monotone" 
                  dataKey="consumption" 
                  stroke="url(#lineGradient)" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={false}
                >
                  <LabelList content={<CustomizedLabel />} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Craving History */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Riwayat Keinginan</h2>
            <button onClick={() => navigate("/craving-history")} className="text-blue-500 text-sm font-medium hover:underline">Lihat Semua</button>
          </div>
          
          <div className="space-y-3">
            {cravingHistory.map((item, index) => {
              const style = getCravingStyle(item.intensity);
              return (
                <motion.div 
                  key={index} 
                  className={`p-3 rounded-lg ${style.color} flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => handleCravingHistoryClick(item)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className={`w-3 h-3 rounded-full ${style.dot}`}></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.emotion}</div>
                    <div className="text-xs opacity-75">{item.date}</div>
                  </div>
                  <div className="text-sm font-medium">{getIntensityLabel(item.intensity)}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackerPage;
