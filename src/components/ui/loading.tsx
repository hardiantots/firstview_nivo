"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import logo from "@/assets/logo-with-text-horizontal.png";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Loading = ({ className, size = "md" }: LoadingProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Outer ring */}
        <div className="absolute inset-0 border-4 border-[#004030]/20 rounded-full"></div>
        {/* Spinning ring */}
        <div className="absolute inset-0 border-4 border-transparent border-t-[#004030] rounded-full animate-spin"></div>
        {/* Inner dot */}
        <div className="absolute inset-2 bg-[#004030] rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="mb-8">
        <Image src={logo} alt="NIVO Logo" className="h-12" height={48} />
      </div>

      {/* Loading text */}
      <p className="text-[#004030] text-sm font-medium animate-pulse mb-4">
        Memuat halaman...
      </p>
      
      {/* Progress dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-[#004030] rounded-full animate-pulse"
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export { Loading, LoadingScreen };