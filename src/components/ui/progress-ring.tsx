
import { motion } from 'framer-motion';

interface ProgressRingProps {
  percentage: number;
  color: string;
}

const ProgressRing = ({ percentage, color }: ProgressRingProps) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle
        cx="60"
        cy="60"
        r={radius}
        strokeWidth="10"
        stroke="#e6e6e6"
        fill="none"
      />
      <motion.circle
        cx="60"
        cy="60"
        r={radius}
        strokeWidth="10"
        stroke={color}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        className="text-2xl font-bold"
        fill={color}
      >
        {`${percentage}%`}
      </text>
    </svg>
  );
};

export default ProgressRing;
