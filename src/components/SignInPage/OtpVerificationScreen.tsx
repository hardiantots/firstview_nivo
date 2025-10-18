import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OTPInput, SlotProps } from "input-otp";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility
import abstractHeader from "@/assets/abstract-header.jpg";

const OtpVerificationScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "your email";
  const [otp, setOtp] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle OTP verification logic here
    console.log("Verifying OTP:", otp);
    if (otp.length === 6) {
      // Navigate to reset password on successful verification
      navigate("/reset-password", { state: { email } });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="h-48 relative overflow-hidden">
        <img
          src={abstractHeader}
          alt="Abstract colorful background"
          className="w-full h-full object-cover"
        />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-8 animate-fade-in text-center">
        <h1 className="text-2xl font-bold mb-2">Enter Code</h1>
        <p className="text-muted-foreground mb-8">
          We have sent a verification code to <br />
          <span className="font-medium text-foreground">{email}</span>
        </p>

        <form onSubmit={handleSubmit}>
          <OTPInput
            maxLength={6}
            value={otp}
            onChange={setOtp}
            containerClassName="group flex items-center justify-center has-[:disabled]:opacity-30"
            render={({ slots }) => (
              <div className="flex">
                {slots.map((slot, idx) => (
                  <Slot key={idx} {...slot} />
                ))}
              </div>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 mt-8"
            size="lg"
            disabled={otp.length < 6}
          >
            Verify
          </Button>
        </form>

        <div className="mt-6 text-sm">
          <span className="text-muted-foreground">Didn't receive the code? </span>
          <button className="font-medium text-accent hover:text-accent/80">
            Resend
          </button>
        </div>
      </div>
    </div>
  );
};

// Slot component for OTPInput, styled similarly to shadcn/ui
function Slot(props: SlotProps) {
  return (
    <div
      className={cn(
        "relative w-10 h-14 text-[2rem] mx-1",
        "flex items-center justify-center",
        "transition-all duration-300",
        "border-border border-y border-r first:border-l first:rounded-l-md last:rounded-r-md",
        "group-hover:border-accent-foreground/20 group-focus-within:border-accent-foreground/20",
        "outline outline-0 outline-accent-foreground/20",
        { "outline-4 outline-accent-foreground": props.isActive }
      )}
    >
      {props.char !== null && <div>{props.char}</div>}
    </div>
  );
}

export default OtpVerificationScreen;