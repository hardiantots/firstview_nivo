import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import startlogo from "@/assets/startapp-logo.png";

const OnboardingScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/welcome");
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="text-center animate-bounce-in">
        <div className="w-36 h-36 mx-auto mb-8 flex items-center justify-center">
          <img src={startlogo} alt="Nivo Logo"/>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;