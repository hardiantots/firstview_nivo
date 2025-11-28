'use client'

import { usePathname, useRouter } from "next/navigation";
import { Home, Heart, BarChart3, Trophy, Phone, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import ScrollToTop from "./ScrollToTop";
import { ReactNode } from "react";
import Image from "next/image";
import headerlogo from "@/assets/logo-with-text-horizontal.png";
import AuthGuard from "./AuthGuard";

// ✅ Definisikan tinggi navbar agar konsisten di seluruh halaman
const NAVBAR_HEIGHT = 80;

const navItems = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/craving-support", icon: Heart, label: "Craving Support" },
  { path: "/tracker", icon: BarChart3, label: "Tracker" },
  { path: "/pencapaian", icon: Trophy, label: "Pencapaian" },
];

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // Simulate checking for unread notifications
  useEffect(() => {
    // In a real app, this would be an API call to check notification status
    const checkNotifications = () => {
      // Example: simulate some notifications being unread
      const mockHasUnread = Math.random() > 0.5; // 50% chance of having unread notifications
      setHasUnreadNotifications(mockHasUnread);
    };
    
    checkNotifications();
  }, []);

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen relative">
        <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col relative">
          <ScrollToTop />

        {/* ✅ Header dengan Logo dan Notifikasi */}
        <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-b border-gray-100 px-4 py-3 z-30 flex items-center justify-between shadow-sm">
          {/* Spacer for balance */}
          <div className="w-8 h-8" />
          
          {/* Logo - Centered */}
          <Image src={headerlogo} alt="NIVO Logo" className="h-8" height={32} />
          
          {/* Notification Icon */}
          <button 
            onClick={() => router.push("/notifications")}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {hasUnreadNotifications && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </header>

        {/* 
          ✅ Area konten utama:
          Gunakan padding atas untuk fixed header dan padding bawah untuk navbar.
        */}
        <main
          className="flex-1 relative overflow-y-auto pt-[60px]"
          style={{
            paddingBottom: `calc(${NAVBAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          {children}
        </main>

        {/* ✅ Bottom Navigation dengan Integrated CS Button */}
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)] z-40"
          style={{
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="px-4 py-3 flex justify-between items-center h-20">
            {/* Left icon 1 - Home */}
            {(() => {
              const Icon = navItems[0].icon;
              return (
                <button
                  onClick={() => router.push(navItems[0].path)}
                  className="flex flex-col items-center justify-center focus:outline-none transition-colors duration-200"
                >
                  <Icon
                    className={`w-6 h-6 ${
                      pathname === navItems[0].path ? "text-accent" : "text-primary/60"
                    }`}
                  />
                </button>
              );
            })()}

            {/* Left icon 2 - Craving Support */}
            {(() => {
              const Icon = navItems[1].icon;
              return (
                <button
                  onClick={() => router.push(navItems[1].path)}
                  className="flex flex-col items-center justify-center focus:outline-none transition-colors duration-200"
                >
                  <Icon
                    className={`w-6 h-6 ${
                      pathname === navItems[1].path ? "text-accent" : "text-primary/60"
                    }`}
                  />
                </button>
              );
            })()}

            {/* Center CS Button - Integrated */}
            <button
              onClick={() => router.push("/contact-professional")}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95 flex-shrink-0"
              aria-label="Contact Professional"
            >
              <Phone className="w-6 h-6 text-white" />
            </button>

            {/* Right icon 1 - Tracker */}
            {(() => {
              const Icon = navItems[2].icon;
              return (
                <button
                  onClick={() => router.push(navItems[2].path)}
                  className="flex flex-col items-center justify-center focus:outline-none transition-colors duration-200"
                >
                  <Icon
                    className={`w-6 h-6 ${
                      pathname === navItems[2].path ? "text-accent" : "text-primary/60"
                    }`}
                  />
                </button>
              );
            })()}

            {/* Right icon 2 - Pencapaian */}
            {(() => {
              const Icon = navItems[3].icon;
              return (
                <button
                  onClick={() => router.push(navItems[3].path)}
                  className="flex flex-col items-center justify-center focus:outline-none transition-colors duration-200"
                >
                  <Icon
                    className={`w-6 h-6 ${
                      pathname === navItems[3].path ? "text-accent" : "text-primary/60"
                    }`}
                  />
                </button>
              );
            })()}
          </div>
        </nav>
        </div>
      </div>
    </AuthGuard>
  );
};

export default MainLayout;
