import { useState, useEffect, FC } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, CheckCircle, Flame, Cigarette, PiggyBank, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { AppHeader } from "@/components/ui/app-header";
import slider1 from "@/assets/slider-1.png";
import slider2 from "@/assets/slider-2.jpg";
import slider3 from "@/assets/slider-3.jpg";
import slider4 from "@/assets/slider-4.jpg";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";

const HomePage = () => {
  const navigate = useNavigate();
  const [todaysConsumption, setTodaysConsumption] = useState(0);
  const [sliderValue, setSliderValue] = useState([0]);
  const [userName, setUserName] = useState("User");
  const [moneySaved, setMoneySaved] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPhonePopup, setShowPhonePopup] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [showConsumptionDialog, setShowConsumptionDialog] = useState(false);

  const sliderImages = [
    { src: slider1, title: "Papan Informasi" },
    { src: slider2, title: "Tips Kesehatan" },
    { src: slider3, title: "Motivasi Harian" },
    { src: slider4, title: "Pencapaian Anda" }
  ];

  // Fetch user data for greeting and money saved
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('userToken');
      if (!token) {
        navigate('/signin'); // Redirect if not logged in
        return;
      }

      // MOCK DATA
      setUserName("User");
      setMoneySaved(12345);
    };
    fetchUserData();
  }, []);

  // Function to format number as currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  // Fetch today's consumption data when the component mounts
  useEffect(() => {
    const fetchTodaysLog = async () => {
      const token = localStorage.getItem('userToken');
      if (!token) return; // Or handle not-logged-in state

      // MOCK DATA
      setTodaysConsumption(5);
      setSliderValue([5]);
    };

    fetchTodaysLog();
  }, []);

  const handleLogConsumption = async () => {
    // MOCK
    setTodaysConsumption(sliderValue[0]);
    setShowConsumptionDialog(true);
  };

  const handleUpdatePhoneNumber = async () => {
    if (!newPhoneNumber.trim()) {
      alert("Mohon masukkan nomor Whatsapp Anda.");
      return;
    }
    // MOCK
    alert("Terima kasih! Nomor Whatsapp Anda telah disimpan.");
    setShowPhonePopup(false);
  };

  return (
    <div className="flex flex-col bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Phone Number Popup */}
      <PhoneNumberPopup 
        isOpen={showPhonePopup}
        onClose={() => setShowPhonePopup(false)}
        phoneNumber={newPhoneNumber}
        onPhoneNumberChange={setNewPhoneNumber}
        onSave={handleUpdatePhoneNumber}
      />

      <ConsumptionSuccessPopup
        isOpen={showConsumptionDialog}
        onClose={() => setShowConsumptionDialog(false)}
        consumptionCount={sliderValue[0]}
      />

      {/* Main Content */}
      <div className="flex-1 px-4 py-6">
        {/* Hero Card */}
        <motion.div
          className="relative bg-gradient-to-br from-primary to-orange-500 rounded-2xl p-6 mb-6 text-white shadow-lg overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative z-10">
            <h1 className="text-2xl font-bold mb-1">Halo, {userName}!</h1>
            <p className="text-orange-100 text-sm mb-6">Terus pertahankan, kamu hebat!</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4 text-center">
              <StatItem icon={Flame} value="127" label="Hari Tanpa Rokok" />
              <StatItem icon={PiggyBank} value={formatCurrency(moneySaved)} label="Uang Dihemat" />
            </div>
          </div>
        </motion.div>

        {/* Information Board - Interactive Carousel */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <ImageCarousel items={sliderImages} autoPlay={true} autoPlayInterval={3000} />
        </motion.div>

        {/* Emergency Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button 
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-8 mb-6 rounded-xl transition-all hover:shadow-lg text-lg"
            onClick={() => navigate("/craving-support")}
          >
            ! SAYA INGIN MEROKOK
          </Button>
        </motion.div>

        {/* Daily Consumption Tracker */}
        <motion.div
          className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Konsumsi Hari Ini</h3>
              <p className="text-sm text-gray-500">Catat jumlah rokok yang dikonsumsi.</p>
            </div>
            <div className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Cigarette className="w-6 h-6" />
              <span>{sliderValue[0]}</span>
            </div>
          </div>

          {/* Slider */}
          <div className="mb-6 px-2">
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              max={24}
              min={0}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0</span>
              <span>24</span>
            </div>
          </div>

          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3"
            onClick={handleLogConsumption}
          >
            Catat Konsumsi
          </Button> 
        </motion.div>
      </div>
    </div>
  );
};

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PhoneNumberPopupProps extends PopupProps {
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  onSave: () => void;
}

const PhoneNumberPopup: FC<PhoneNumberPopupProps> = ({ isOpen, onClose, phoneNumber, onPhoneNumberChange, onSave }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Lengkapi Profil Anda</DialogTitle>
        <DialogDescription>
          Terima kasih telah mendaftar! Mohon masukkan nomor Whatsapp Anda untuk melanjutkan.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="relative">
          <Input
            id="phone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => onPhoneNumberChange(e.target.value)}
            placeholder="Contoh: 081234567890"
            className="pl-10"
          />
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onSave} className="w-full bg-accent hover:bg-accent/90">
          Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface ConsumptionSuccessPopupProps extends PopupProps {
  consumptionCount: number;
}

const ConsumptionSuccessPopup: FC<ConsumptionSuccessPopupProps> = ({ isOpen, onClose, consumptionCount }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader className="items-center text-center">
        <div className="bg-green-100 p-3 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <DialogTitle className="text-xl font-bold">Berhasil Dicatat!</DialogTitle>
        <DialogDescription className="pt-2">
          Anda telah mencatat konsumsi sebanyak{" "}
          <span className="font-bold text-foreground">{consumptionCount} batang rokok</span>{" "}
          hari ini. Tetap semangat dalam perjalanan Anda!
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="sm:justify-center">
        <Button 
          onClick={onClose} 
          className="w-full sm:w-auto bg-accent hover:bg-accent/90"
        >
          Mengerti
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface StatItemProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
}

const StatItem: FC<StatItemProps> = ({ icon: Icon, value, label }) => (
  <div>
    <div className="bg-white/20 p-3 rounded-full inline-block mb-2">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs text-orange-100">{label}</div>
  </div>
);

export default HomePage;