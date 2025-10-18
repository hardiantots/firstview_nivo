import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface InfoCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const InfoCard = ({ title, value, subtitle, icon: Icon, color, bgColor }: InfoCardProps) => {
  return (
    <motion.div
      className={`p-4 rounded-2xl shadow-lg border border-gray-100 ${bgColor} transition-shadow duration-300`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-sm font-medium text-gray-600">{title}</span>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </motion.div>
  );
};

export default InfoCard;