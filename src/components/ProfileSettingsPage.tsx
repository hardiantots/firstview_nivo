'use client'

import { useState, useEffect } from "react";
import { ArrowLeft, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LoadingScreen } from "./ui/loading";
import { supabase } from "@/lib/supabase";
import { useApiLoading } from "@/hooks/useApiLoading";
import logo from "@/assets/logo-with-text-horizontal.png";
import AuthGuard from "./AuthGuard";

const ProfileSettingsPage = () => {
  const router = useRouter();
  const { isLoading, withLoading } = useApiLoading();
  const [initialData, setInitialData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: "",
    birthDate: "",
    smokingPattern: "",
    motivasiPilihan: [] as string[],
  });
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: "",
    birthDate: "",
    smokingPattern: "",
    motivasiPilihan: [] as string[],
  });

  const motivationOptions = [
    { value: "health", label: "Kesehatan" },
    { value: "finance", label: "Keuangan" },
    { value: "family", label: "Keluarga" },
    { value: "energy", label: "Energi & Stamina" },
    { value: "cognitive", label: "Fokus & Konsentrasi" },
    { value: "confidence", label: "Kepercayaan Diri" },
  ];

  const genderOptions = [
    { value: "Laki-Laki", label: "Laki-Laki" },
    { value: "Perempuan", label: "Perempuan" }
  ];

  // Sinkronisasi awal dengan data dari onboarding / HomePage
  useEffect(() => {
    const loadProfile = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      // Ambil data user_profile
      const { data, error } = await supabase
        .from("user_profile")
        .select("full_name,email,phone_number,gender,date_of_birth,smoking_pattern,motivations")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Gagal mengambil profil user", error);
        return;
      }

      // Ambil fase dari smoke_free_journey sebagai source of truth
      const { data: journeyData } = await supabase
        .from("smoke_free_journey")
        .select("phase, status")
        .eq("user_id", userId)
        .maybeSingle();

      const currentPhase = journeyData?.phase || journeyData?.status || "";

      if (data) {
        const loaded = {
          fullName: (data.full_name as string) || "",
          email: (data.email as string) || "",
          phoneNumber: (data.phone_number as string) || "",
          gender: (data.gender as string) || "",
          birthDate: data.date_of_birth ? String(data.date_of_birth) : "",
          smokingPattern: currentPhase || (data.smoking_pattern as string) || "",
          motivasiPilihan: (data.motivations as string[] | null) || [],
        };
        setInitialData(loaded);
        setFormData(loaded);
      }
    };

    loadProfile();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMotivation = (value: string) => {
    setFormData(prev => {
      const exists = prev.motivasiPilihan.includes(value);
      const next = exists
        ? prev.motivasiPilihan.filter(v => v !== value)
        : prev.motivasiPilihan.length >= 2
        ? prev.motivasiPilihan
        : [...prev.motivasiPilihan, value];
      return { ...prev, motivasiPilihan: next };
    });
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSaveChanges = async () => {
    await withLoading(async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      // Update user profile
      await supabase.from("user_profile").upsert(
        {
          user_id: userId,
          full_name: formData.fullName,
          email: formData.email,
          phone_number: formData.phoneNumber,
          gender: formData.gender,
          date_of_birth: formData.birthDate || null,
          smoking_pattern: formData.smokingPattern,
          motivations: formData.motivasiPilihan,
        },
        { onConflict: "user_id" }
      );

      // Update fase di smoke_free_journey sebagai source of truth
      if (formData.smokingPattern) {
        await supabase.from("smoke_free_journey").upsert(
          {
            user_id: userId,
            phase: formData.smokingPattern,
            status: formData.smokingPattern,
          },
          { onConflict: "user_id" }
        );
      }

      setInitialData(formData);
    });
  };

  const handleCancelChanges = () => {
    router.push("/home");
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white max-w-md mx-auto md:max-w-lg lg:max-w-xl">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white px-4 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/home")} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Image src={logo} alt="NIVO Logo" height={32} width={120}/>
          </div>
        </div>
        <div className="w-6 h-6 text-gray-600">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile Header - no photo upload for now */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center overflow-hidden">
            <span className="text-white font-medium text-lg">
              {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : "U"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">{formData.fullName || "Nama belum diisi"}</span>
            <span className="text-xs text-gray-500">{formData.email || "Email belum diisi"}</span>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Informasi Pribadi</h3>
          
          <div className="space-y-2">
            <Label htmlFor="nama">Nama Lengkap</Label>
            <Input
              id="nama"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Nomor WhatsApp</Label>
            <Input
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Jenis Kelamin</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => handleInputChange("gender", value)}
            >
              <SelectTrigger className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg">
                {genderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate">Tanggal Lahir</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange("birthDate", e.target.value)}
              className="bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-full min-w-0 text-sm md:text-base"
            />
          </div>
        </div>

        {/* Preferences Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Preferensi</h3>

          <div className="space-y-2">
            <Label>Motivasi Utama (seperti saat onboarding)</Label>
            <p className="text-xs text-gray-500 mb-1">
              Pilih kembali 1-3 alasan terkuatmu. Ini akan mempengaruhi pesan di beranda.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {motivationOptions.map((m) => {
                const active = formData.motivasiPilihan.includes(m.value);
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => toggleMotivation(m.value)}
                    className={`text-xs px-3 py-2 rounded-lg border transition-colors text-left flex items-center gap-2 ${
                      active
                        ? "bg-green-700 text-white border-green-700 hover:bg-green-800"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {active && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100">
            <Label>Fase yang Sedang Dijalani</Label>
            <Select
              value={formData.smokingPattern}
              onValueChange={(value) => handleInputChange("smokingPattern", value)}
            >
              <SelectTrigger className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <SelectValue placeholder="Pilih fase" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg">
                <SelectItem value="PRE-QUIT">PRE-QUIT</SelectItem>
                <SelectItem value="POST-QUIT">POST-QUIT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-4">
          <Button 
            onClick={handleSaveChanges}
            disabled={!hasChanges}
            className={`w-full py-3 rounded-lg shadow-sm ${
              hasChanges
                ? "bg-primary hover:bg-primary/90 text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Simpan Perubahan
          </Button>
          <Button 
            onClick={handleCancelChanges}
            variant="outline"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white border-orange-500 py-3 rounded-lg shadow-sm"
          >
            Batalkan Perubahan
          </Button>
          
          {/* Logout Button */}
          <div className="pt-6 border-t border-gray-200">
            <Button 
              onClick={async () => {
                // Call Supabase signOut
                try {
                  const { signOut } = await import('@/lib/auth');
                  await signOut();
                } catch (e) {
                  // Silent fail
                }
                
                // Clear all authentication data
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
                
                // Redirect to signin
                router.replace('/signin');
              }}
              variant="outline"
              className="w-full bg-red-500 hover:bg-red-600 text-white border-red-500 py-3 rounded-lg shadow-sm"
            >
              Keluar / Logout
            </Button>
          </div>
        </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default ProfileSettingsPage;