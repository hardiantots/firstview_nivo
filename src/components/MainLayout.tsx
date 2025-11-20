'use client'

import { usePathname, useRouter } from "next/navigation";
import { Home, Heart, BarChart3, Trophy } from "lucide-react";
import ScrollToTop from "./ScrollToTop";
import { ReactNode } from "react";

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
    <div className="bg-gray-50 min-h-screen relative">
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col relative">
        <ScrollToTop />

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

        {/* ✅ Bottom Navigation */}
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)] z-40"
          style={{
            height: `${NAVBAR_HEIGHT}px`,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="flex justify-around items-center h-full">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className="flex flex-col items-center justify-center py-2 focus:outline-none"
                >
                  <Icon
                    className={`w-6 h-6 mb-1 transition-colors duration-200 ${
                      isActive ? "text-accent" : "text-primary/60"
                    }`}
                  />
                  <span
                    className={`text-xs transition-colors duration-200 ${
                      isActive ? "text-accent font-medium" : "text-primary/60"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default MainLayout;
