"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import AuthFrame from '@/features/auth/AuthFrame';
import { prepareRecovery, updateRecoveryPassword } from '@/lib/recovery';

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8, { message: "Kata sandi minimal 8 karakter." }).max(128),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Kata sandi belum sama. Periksa kedua isianmu.",
  path: ["confirmPassword"], // Set the error on the confirmPassword field
});

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

const ResetPasswordScreen = () => {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const initialization = useRef<Promise<void> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    initialization.current ||= prepareRecovery(window.location.href);
    initialization.current.then(() => {
      if (cancelled) return;
      window.history.replaceState({}, '', '/reset-password');
      setReady(true);
    }).catch(() => { if (!cancelled) setError('Sesi pemulihan belum valid. Buka tautan email atau gunakan kode pemulihan yang baru.'); });
    return () => { cancelled = true; };
  }, []);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setError("");
    
    if (!ready) {
      setError("Mulai pemulihan kata sandi kembali.");
      return;
    }

    try {
      await updateRecoveryPassword(data.newPassword);
      router.push("/password-reset-success");
    } catch (error) { setError(error instanceof Error ? error.message : 'Kata sandi belum berhasil diubah. Coba lagi.'); }
  };

  return (
    <AuthFrame onBack={() => router.back()}>
      <div>
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold mb-8">Buat kata sandi baru</h1>

          {error && (
            <div role="alert" className="flex gap-3 items-start p-3 bg-destructive/10 border border-destructive/25 rounded-control mb-6 text-left">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kata sandi baru</FormLabel>
                      <div className="relative">
                        <FormControl><Input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Masukkan kata sandi baru" {...field} className="pr-12" /></FormControl>
                        <button type="button" aria-label={showPassword ? 'Sembunyikan kata sandi baru' : 'Lihat kata sandi baru'} onClick={() => setShowPassword(!showPassword)} className="nivo-password-toggle">
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ulangi kata sandi</FormLabel>
                      <div className="relative">
                        <FormControl><Input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Ulangi kata sandi baru" {...field} className="pr-12" /></FormControl>
                        <button type="button" aria-label={showConfirmPassword ? 'Sembunyikan pengulangan kata sandi' : 'Lihat pengulangan kata sandi'} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="nivo-password-toggle">
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!ready && <a href="/forgot-password" className="underline text-primary">Mulai pemulihan kembali</a>}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="lg" disabled={!ready || form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan…
                  </>
                ) : (
                  "Simpan kata sandi"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </AuthFrame>
  );
};

export default ResetPasswordScreen;
