import { useNavigate } from "react-router-dom";
import { useEffect} from "react";
import startlogo from "@/assets/startapp-logo.png";

const OnboardingScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Timer untuk navigasi ke halaman berikutnya setelah 5 detik
    const navigationTimer = setTimeout(() => {
      navigate("/welcome");
    }, 5000);

    // Membersihkan timer saat komponen dibongkar
    return () => clearTimeout(navigationTimer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-28 h-28 mx-auto mb-4 flex items-center justify-center"> {/* Logo muncul segera */}
          <img src={startlogo} alt="Nivo Logo" />
        </div>
        {/* Animasi loading dots */}
        <div className="flex justify-center items-center space-x-2 mt-10">
          <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
          <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
          <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;