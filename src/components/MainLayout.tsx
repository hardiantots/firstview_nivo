import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Heart, BarChart3, Trophy, Settings } from "lucide-react";
import ScrollToTop from "./ScrollToTop";

const navItems = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/craving-support", icon: Heart, label: "Craving Support" },
  { path: "/tracker", icon: BarChart3, label: "Tracker" },
  { path: "/pencapaian", icon: Trophy, label: "Pencapaian" }
];

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <ScrollToTop />
      <div className="pb-20">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 shadow-lg">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center py-2"
              >
                <Icon
                  className={`w-6 h-6 mb-1 ${
                    isActive ? "text-accent" : "text-primary/60"
                  }`}
                />
                <span
                  className={`text-xs ${
                    isActive
                      ? "text-accent font-medium"
                      : "text-primary/60"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MainLayout;