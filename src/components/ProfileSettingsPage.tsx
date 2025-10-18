import { useState } from "react";
import { ArrowLeft, Camera, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LoadingScreen } from "./ui/loading";
import { useApiLoading } from "@/hooks/useApiLoading";
import logo from "@/assets/logo-with-text-horizontal.png";

const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const { isLoading, withLoading } = useApiLoading();
  const [formData, setFormData] = useState({
    name: "Sarah",
    email: "sarah.johnson@email.com",
    regionCode: "+62",
    phoneNumber: "851-5503-2260",
    gender: "Perempuan",
    birthDate: "1992-05-15",
    address: "Jl. Mks",
    city: "Jakarta",
    province: "Jakarta Utara", 
    targetBerhenti: "30 Hari",
    motivasiBerhenti: "Jakarta"
  });

  const regionCodes = [
    { value: "+62", label: "+62" },
    { value: "+1", label: "+1" },
    { value: "+44", label: "+44" },
    { value: "+81", label: "+81" },
    { value: "+86", label: "+86" }
  ];

  const cities = [
    { value: "Jakarta", label: "Jakarta" },
    { value: "Surabaya", label: "Surabaya" },
    { value: "Bandung", label: "Bandung" },
    { value: "Medan", label: "Medan" },
    { value: "Semarang", label: "Semarang" }
  ];

  const provinces = [
    { value: "Jakarta Utara", label: "Jakarta Utara" },
    { value: "Jakarta Selatan", label: "Jakarta Selatan" },
    { value: "Jakarta Timur", label: "Jakarta Timur" },
    { value: "Jakarta Barat", label: "Jakarta Barat" },
    { value: "Jakarta Pusat", label: "Jakarta Pusat" }
  ];

  const genderOptions = [
    { value: "Laki-Laki", label: "Laki-Laki" },
    { value: "Perempuan", label: "Perempuan" }
  ];

  const targetOptions = [
    { value: "30 Hari", label: "30 Hari" },
    { value: "45 Hari", label: "45 Hari" },
    { value: "60 Hari", label: "60 Hari" },
    { value: "90 Hari", label: "90 Hari" }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    await withLoading(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Saving changes:", formData);
      // Here you would typically save to backend
    });
  };

  const handleCancelChanges = () => {
    console.log("Canceling changes");
    navigate("/home");
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/home")} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="NIVO Logo" className="h-8"/>
          </div>
        </div>
        <div className="w-6 h-6 text-gray-600">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile Photo Section */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center overflow-hidden">
              <span className="text-white font-medium text-2xl">S</span>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>
          <span className="text-sm text-gray-600">Klik untuk mengubah foto</span>
        </div>

        {/* Personal Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Informasi Pribadi</h3>
          
          <div className="space-y-2">
            <Label htmlFor="nama">Nama</Label>
            <Input
              id="nama"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Alamat E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Nomor HP</Label>
            <div className="flex gap-2">
              <Select
                value={formData.regionCode}
                onValueChange={(value) => handleInputChange("regionCode", value)}
              >
                <SelectTrigger className="w-20 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {regionCodes.map((code) => (
                    <SelectItem key={code.value} value={code.value}>
                      {code.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm"
              />
            </div>
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
            <div className="relative">
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleInputChange("birthDate", e.target.value)}
                className="bg-white border border-gray-200 rounded-lg shadow-sm pr-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Address Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Informasi Alamat</h3>
          
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kota</Label>
              <Select
                value={formData.city}
                onValueChange={(value) => handleInputChange("city", value)}
              >
                <SelectTrigger className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {cities.map((city) => (
                    <SelectItem key={city.value} value={city.value}>
                      {city.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Provinsi</Label>
              <Select
                value={formData.province}
                onValueChange={(value) => handleInputChange("province", value)}
              >
                <SelectTrigger className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {provinces.map((province) => (
                    <SelectItem key={province.value} value={province.value}>
                      {province.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Preferensi</h3>
          
          <div className="space-y-2">
            <Label>Target Berhenti</Label>
            <Select
              value={formData.targetBerhenti}
              onValueChange={(value) => handleInputChange("targetBerhenti", value)}
            >
              <SelectTrigger className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg">
                {targetOptions.map((target) => (
                  <SelectItem key={target.value} value={target.value}>
                    {target.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivasi">Motivasi Berhenti</Label>
            <Input
              id="motivasi"
              value={formData.motivasiBerhenti}
              onChange={(e) => handleInputChange("motivasiBerhenti", e.target.value)}
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-4">
          <Button 
            onClick={handleSaveChanges}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg shadow-sm"
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
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;