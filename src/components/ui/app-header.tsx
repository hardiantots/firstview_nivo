'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Menu, Bell } from "lucide-react";
import headerlogo from "@/assets/logo-with-text-horizontal.png";

interface AppHeaderProps {
  onMenuClick?: () => void;
  showNotifications?: boolean;
}

export const AppHeader = ({ onMenuClick, showNotifications = true }: AppHeaderProps) => {
  const router = useRouter();
  const [unreadNotifications] = useState(3); // This would come from your notification state/API

  return (
    <div className="fixed top-0 left-0 right-0 z-30 bg-white px-3 sm:px-4 py-3 max-w-md mx-auto md:max-w-lg lg:max-w-xl">
      <div className="w-full flex items-center justify-between">
      <Menu 
        className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 cursor-pointer flex-shrink-0" 
        onClick={onMenuClick}
      />
      <div className="flex items-center gap-2">
        <Image src={headerlogo} alt="Nivo Logo" height={28} width={100} className="sm:h-8 sm:w-[120px]"/>
      </div>
      {showNotifications && (
        <div className="relative cursor-pointer flex-shrink-0" onClick={() => router.push("/notifications")}>
          <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          {unreadNotifications > 0 && (
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-[10px] sm:text-xs text-white font-bold">{unreadNotifications}</span>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};