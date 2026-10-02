"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OTPInput, SlotProps } from "input-otp";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility
import AuthFrame from '@/features/auth/AuthFrame';
import { resendPasswordResetEmail } from "@/lib/auth";
import { verifyRecoveryOtp } from '@/lib/recovery';

const OtpVerificationScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
      setError('Kode belum berhasil dikirim ulang. Periksa koneksi, lalu coba lagi.');
    }
    
    setResendLoading(false);
  };

  return (
    <AuthFrame onBack={() => router.back()}>
      <div>
        <div className="animate-fade-in text-center">
          <h1 className="text-2xl font-bold mb-2">Masukkan Kode</h1>
          <p className="text-muted-foreground mb-8">
            Kami telah mengirimkan kode verifikasi ke email<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>

          {error && (
            <div role="alert" className="flex gap-3 items-start p-3 bg-destructive/10 border border-destructive/25 rounded-control mb-6 text-left">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {resendMessage && (
            <div role="status" className="flex gap-3 items-start p-3 bg-green-50 border border-green-200 rounded-control mb-6 text-left">
              <p className="text-sm text-green-800">{resendMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <OTPInput
              aria-label="Kode verifikasi enam digit"
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
                  Memeriksa kode…
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
              className="min-h-11 font-medium text-accent hover:text-accent/80 disabled:opacity-50"
            >
              {resendLoading ? "Mengirim..." : "Kirim Ulang"}
            </button>
          </div>
        </div>
      </div>
    </AuthFrame>
  );
};

// Slot component for OTPInput, styled similarly to shadcn/ui
function Slot(props: SlotProps) {
  return (
    <div
      className={cn(
        "relative w-9 sm:w-10 h-12 sm:h-14 text-xl sm:text-2xl mx-0.5",
        "flex items-center justify-center",
        "transition-all duration-300",
        "border-border border-y border-r first:border-l first:rounded-l-md last:rounded-r-md",
        "bg-white/80 group-hover:border-primary/40 group-focus-within:border-primary/40",
        "outline outline-0 outline-primary",
        { "outline-2": props.isActive }
      )}
    >
      {props.char !== null && <div>{props.char}</div>}
    </div>
  );
}

export default OtpVerificationScreen;
