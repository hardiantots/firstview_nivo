"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OTPInput, SlotProps } from "input-otp";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility
import Image from "next/image";
import abstractHeader from "@/assets/abstract-header.jpg";
import { resendPasswordResetEmail } from "@/lib/auth";
import { verifyRecoveryOtp } from '@/lib/recovery';

const OtpVerificationScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("your email");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    // Get email from localStorage
    const storedEmail = localStorage.getItem('resetEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // If no email stored, redirect back to forgot password
      router.push("/forgot-password");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (otp.length !== 6) {
      setError("Kode harus 6 digit");
      setLoading(false);
      return;
    }

    try {
      await verifyRecoveryOtp(email, otp);
      router.push("/reset-password");
    } catch (error) { setError(error instanceof Error ? error.message : 'Kode verifikasi tidak valid.'); }
    
    setLoading(false);
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setResendMessage("");
    setError("");

    const result = await resendPasswordResetEmail(email);
    
    if (result.success) {
      setResendMessage("Kode telah dikirim ulang ke email Anda");
      setTimeout(() => setResendMessage(""), 5000);
    } else {
      setError(result.error || "Gagal mengirim ulang kode");
    }
    
    setResendLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="h-48 relative overflow-hidden">
        <Image
          src={abstractHeader}
          alt="Abstract colorful background"
          className="w-full h-full object-cover"
          fill
        />
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Content */}
      <div className="max-w-sm mx-auto px-6 py-8">
        <div className="animate-fade-in text-center">
          <h1 className="text-2xl font-bold mb-2">Masukkan Kode</h1>
          <p className="text-muted-foreground mb-8">
            Kami telah mengirimkan kode verifikasi ke email<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>

          {error && (
            <div className="flex gap-3 items-start p-3 bg-red-50 border border-red-200 rounded-lg mb-6 text-left">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {resendMessage && (
            <div className="flex gap-3 items-start p-3 bg-green-50 border border-green-200 rounded-lg mb-6 text-left">
              <p className="text-sm text-green-800">{resendMessage}</p>
            </div>
          )}

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
              disabled={otp.length < 6 || loading}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verifikasi"
              )}
            </Button>
          </form>

          <div className="mt-6 text-sm">
            <span className="text-muted-foreground">Tidak menerima kode? </span>
            <button 
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading}
              className="font-medium text-accent hover:text-accent/80 disabled:opacity-50"
            >
              {resendLoading ? "Mengirim..." : "Kirim Ulang"}
            </button>
          </div>
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
