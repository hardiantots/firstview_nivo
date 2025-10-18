import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const PasswordResetSuccessScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6 animate-fade-in">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </div>

      <h1 className="text-2xl font-bold mb-2">Password Changed!</h1>
      <p className="text-muted-foreground mb-8 max-w-xs">
        Your password has been changed successfully.
      </p>

      <Button
        onClick={() => navigate("/signin")}
        className="w-full max-w-xs bg-primary hover:bg-primary/90"
        size="lg"
      >
        Back to Sign In
      </Button>
    </div>
  );
};

export default PasswordResetSuccessScreen;