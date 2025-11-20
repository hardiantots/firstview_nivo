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
    <div className="fixed top-0 left-0 right-0 z-30 bg-white px-4 py-3 flex items-center justify-between shadow-sm border-b border-gray-100 max-w-md mx-auto">
      <Menu 
        className="w-6 h-6 text-gray-600 cursor-pointer" 
        onClick={onMenuClick}
      />
      <div className="flex items-center gap-2">
        <Image src={headerlogo} alt="Nivo Logo" height={32} width={120}/>
      </div>
      {showNotifications && (
        <div className="relative cursor-pointer" onClick={() => router.push("/notifications")}>
          <Bell className="w-6 h-6 text-gray-600" />
          {unreadNotifications > 0 && (
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">{unreadNotifications}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};