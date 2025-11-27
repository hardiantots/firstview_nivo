'use client'

import { usePathname, useRouter } from "next/navigation";
import { Home, Heart, BarChart3, Trophy, Phone } from "lucide-react";
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

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen relative">
        <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col relative">
          <ScrollToTop />

        {/* ✅ Header dengan Logo */}
        <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-b border-gray-100 px-4 py-3 z-30 flex items-center justify-center shadow-sm">
          <Image src={headerlogo} alt="NIVO Logo" className="h-8" height={32} />
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
