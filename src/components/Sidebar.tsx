'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, User, Info, Star, LogOut, Users, CreditCard } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import headerlogo from "@/assets/logo-with-text-horizontal.png";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [displayName, setDisplayName] = useState("User");
  const [displayEmail, setDisplayEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const emailLocal = typeof window !== "undefined" ? localStorage.getItem("userEmail") : "";

      if (userId) {
        const { data } = await supabase
          .from("user_profile")
          .select("full_name,email")
          .eq("user_id", userId)
          .maybeSingle();

        if (data) {
          setDisplayName((data.full_name as string) || (emailLocal ? emailLocal.split("@")[0] : "User"));
          setDisplayEmail((data.email as string) || emailLocal || "");
          return;
        }
      }

      if (emailLocal) {
        setDisplayName(emailLocal.split("@")[0]);
        setDisplayEmail(emailLocal);
      }
    };

    load();
  }, []);
  
  const handleNavigateToProfile = () => {
    onClose();
    router.push("/profile-settings");
  };
  const handleNavigateToPricing = () => {
    onClose();
    router.push("/pricing");
  };
  const handleNavigateToCommunity = () => {
    onClose();
    router.push("/community");
  };
  
  const menuItems = [
    { icon: User, label: "Pengaturan Profil", onClick: handleNavigateToProfile },
    { icon: CreditCard, label: "Paket & Harga", onClick: handleNavigateToPricing },
    { icon: Users, label: "Komunitas NIVO", onClick: handleNavigateToCommunity },
    { icon: Info, label: "Tentang NIVO", onClick: () => console.log("About NIVO") },
    { icon: Star, label: "Beri Rating Aplikasi", onClick: () => console.log("Rate app") },
  ];

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    onClose();
    
    // Call Supabase signOut
    try {
      const { signOut } = await import('@/lib/auth');
      await signOut();
    } catch (e) {
      // Silent fail
    }
    
    // Clear all auth data
    localStorage.removeItem('userToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('lastLoginAt');
    localStorage.removeItem('sessionMaxAgeDays');
    localStorage.removeItem('loginMethod');
    
    // Clear user data
    localStorage.removeItem('userPhase');
    localStorage.removeItem('selectedMotivations');
    localStorage.removeItem('countdownDays');
    localStorage.removeItem('streakDays');
    localStorage.removeItem('journeyStartDate');
    localStorage.removeItem('quitDate');
    localStorage.removeItem('actualQuitDate');
    localStorage.removeItem('selectedDays');
    localStorage.removeItem('homeMoneySaved');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('savedEmail');
    
    router.replace("/signin");
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? "bg-opacity-50 opacity-100" : "bg-opacity-0 opacity-0 pointer-events-none"
        }`} 
        onClick={onClose} 
      />
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 bg-white z-50 shadow-lg transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Image src={headerlogo} alt="Nivo Logo" height={32} width={120}/>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {/* User Profile */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-lg">
                {displayName ? displayName.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
            <div>
              <div className="font-semibold text-gray-800">{displayName}</div>
              <div className="text-sm text-gray-600">{displayEmail}</div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-2 mb-8">
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={index}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  <IconComponent className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-800">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Logout Button */}
          <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200">
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white rounded-xl shadow-xl border-0 max-w-sm mx-auto">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-center text-gray-800 text-lg font-semibold">
                  Konfirmasi Logout
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center text-gray-600 mt-2">
                  Apakah anda yakin akan keluar dari akun?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
                <AlertDialogCancel className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 border-0 rounded-lg py-2 px-4">
                  Tidak
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleLogout}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-0 rounded-lg py-2 px-4"
                >
                  Ya
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
};

export default Sidebar;