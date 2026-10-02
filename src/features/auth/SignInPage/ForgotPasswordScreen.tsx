"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { sendPasswordResetEmail } from "@/lib/auth";
import AuthFrame from '@/features/auth/AuthFrame';

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "Masukkan email yang valid." }),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setError("");
    const result = await sendPasswordResetEmail(data.email);
    
    if (result.success) {
      router.push("/otp-verification");
    } else {
      setError('Kode belum berhasil dikirim. Periksa koneksi, lalu coba lagi.');
    }
  };

  return (
    <AuthFrame onBack={() => router.back()}>
      <div>
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold mb-2">Lupa kata sandi</h1>
          <p className="text-muted-foreground mb-8">
            Masukkan email akunmu. Kami akan mengirimkan kode verifikasi untuk membuat kata sandi baru.
          </p>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-destructive/10 border border-destructive/25 rounded-control text-sm text-destructive">
              {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                      <div className="relative">
                        <FormControl><Input type="email" autoComplete="email" placeholder="Masukkan email" {...field} className="pr-10" /></FormControl>
                        <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Mengirim kode…
                  </>
                ) : (
                  "Kirim kode"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </AuthFrame>
  );
};

export default ForgotPasswordScreen;
