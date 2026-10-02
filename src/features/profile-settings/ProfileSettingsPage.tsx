'use client'

import { useState, useEffect } from "react";
import { ArrowLeft, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingScreen } from "@/components/ui/loading";
import { authenticatedRequest } from '@/shared/journey/client';
import { StateNotice } from '@/components/ui/nivo';
import logo from "@/assets/logo-with-text-horizontal.png";
import AuthGuard from "@/shared/auth/AuthGuard";

const ProfileSettingsPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [forceRender, setForceRender] = useState(0); // Add force render
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [saving, setSaving] = useState(false);
  
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
    { value: "Kesehatan", label: "Kesehatan" },
    { value: "Keuangan", label: "Keuangan" }, 
    { value: "Keluarga", label: "Keluarga" },
    { value: "Energi & Stamina", label: "Energi & Stamina" },
    { value: "Fokus & Konsentrasi", label: "Fokus & Konsentrasi" },
    { value: "Kepercayaan Diri", label: "Kepercayaan Diri" },
  ];

  const genderOptions = [
    { value: "Laki-Laki", label: "Laki-Laki" },
    { value: "Perempuan", label: "Perempuan" }
  ];

  useEffect(() => {
    const loadProfile = async () => {
      let data;
      try { data = (await authenticatedRequest('/api/profile')).profile; }
      catch {
        setProfileError('Profil belum dapat dimuat. Coba buka kembali halaman ini.');
        setIsLoading(false);
        return;
      }

      const currentPhase = "";
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
        setTimeout(() => setForceRender(prev => prev + 1), 100);
      }
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMotivation = (value: string) => {
    setFormData(prev => {
      const exists = prev.motivasiPilihan?.includes(value) || false;
      const next = exists
        ? prev.motivasiPilihan.filter(v => v !== value)
        : prev.motivasiPilihan.length >= 2
        ? prev.motivasiPilihan
        : [...prev.motivasiPilihan, value];
      
      return { ...prev, motivasiPilihan: next };
    });
    
    setTimeout(() => setForceRender(prev => prev + 1), 50);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSaveChanges = async () => {
    if (saving) return;
    setSaving(true); setProfileError(''); setProfileNotice('');
    try {
      await authenticatedRequest('/api/profile', { method: 'PUT', body: JSON.stringify({
          full_name: formData.fullName,
          phone_number: formData.phoneNumber,
          gender: formData.gender,
          date_of_birth: formData.birthDate || null,
          motivations: formData.motivasiPilihan,
      }) });
      setInitialData(formData);
      setProfileNotice('Perubahan profil tersimpan.');
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'Perubahan belum tersimpan.'); }
    finally { setSaving(false); }
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
        {profileError && <StateNotice error>{profileError}</StateNotice>}
        {profileNotice && <StateNotice>{profileNotice}</StateNotice>}
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
              readOnly
              aria-describedby="profile-email-hint"
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
            />
            <p id="profile-email-hint" className="text-sm text-muted-foreground">Email mengikuti akun login.</p>
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
              Pilih kembali maksimal 2 alasan terkuatmu. Ini akan mempengaruhi pesan di beranda.
            </p>
            <div className="grid grid-cols-2 gap-2" key={`motivations-${forceRender}`}>
              {motivationOptions.map((m) => {
                const active = formData.motivasiPilihan?.includes(m.value) || false;
                return (
                  <button
                    key={`${m.value}-${forceRender}-${formData.motivasiPilihan?.length || 0}`}
                    type="button"
                    onClick={() => toggleMotivation(m.value)}
                    className={`text-xs px-3 py-2 rounded-lg border transition-all duration-200 text-left flex items-center gap-2 ${
                      active
                        ? "bg-green-700 text-white border-green-700 hover:bg-green-800 shadow-md"
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
            <a className="underline text-primary" href="/pencapaian">Atur tanggal dan fase perjalanan</a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-4">
          <Button 
            onClick={handleSaveChanges}
            disabled={!hasChanges || saving || Boolean(profileError && !formData.email)}
            className={`w-full py-3 rounded-lg shadow-sm ${
              hasChanges
                ? "bg-primary hover:bg-primary/90 text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
          </Button>
          <Button 
            onClick={handleCancelChanges}
            variant="outline"
            className="w-full py-3 rounded-lg"
          >
            Batalkan Perubahan
          </Button>
          
          {/* Logout Button */}
          <div className="pt-6 border-t border-gray-200">
            <Button 
              onClick={async () => {
                try {
                  const { signOut } = await import('@/lib/auth');
                  await signOut();
                  router.replace('/signin');
                } catch (e) {
                  console.error('Logout error:', e);
                }
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
