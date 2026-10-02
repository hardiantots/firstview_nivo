"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import AuthFrame from '@/features/auth/AuthFrame';

const PasswordResetSuccessScreen = () => {
  const router = useRouter();

  return (
    <AuthFrame><div className="flex flex-col items-center text-center animate-fade-in">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </div>

      <h1 className="text-2xl font-bold mb-2">Kata sandi tersimpan</h1>
      <p className="text-muted-foreground mb-8 max-w-xs">
        Kata sandimu sudah diperbarui. Gunakan kata sandi baru saat masuk.
      </p>

      <Button
        onClick={() => router.push("/signin")}
        className="w-full max-w-xs bg-primary hover:bg-primary/90"
        size="lg"
      >
        Kembali ke halaman masuk
      </Button>
    </div></AuthFrame>
  );
};

export default PasswordResetSuccessScreen;
