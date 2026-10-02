"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff, Loader, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Image from "next/image";
import abstractHeader from "@/assets/abstract-header.jpg";
import { prepareRecovery, updateRecoveryPassword } from '@/lib/recovery';

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8, { message: "Password minimal 8 karakter." }).max(128),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
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
      setError("Mulai pemulihan password kembali.");
      return;
    }

    try {
      await updateRecoveryPassword(data.newPassword);
      router.push("/password-reset-success");
    } catch (error) { setError(error instanceof Error ? error.message : 'Password belum berhasil diubah.'); }
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
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold mb-8">Buat Password Baru</h1>

          {error && (
            <div className="flex gap-3 items-start p-3 bg-red-50 border border-red-200 rounded-lg mb-6 text-left">
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
                    <FormLabel>Password Baru</FormLabel>
                      <div className="relative">
                        <FormControl><Input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Masukkan password baru" {...field} className="pr-10" /></FormControl>
                        <button type="button" aria-label={showPassword ? 'Sembunyikan password baru' : 'Lihat password baru'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                    <FormLabel>Konfirmasi Password</FormLabel>
                      <div className="relative">
                        <FormControl><Input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Konfirmasi password baru" {...field} className="pr-10" /></FormControl>
                        <button type="button" aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Lihat konfirmasi password'} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
