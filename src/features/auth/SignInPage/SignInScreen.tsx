'use client'

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { signInReturnPath } from '@/shared/auth/return-path';
import AuthFrame from '@/features/auth/AuthFrame';
import { AuthStorage } from "@/lib/auth-storage";

const SignInScreen = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError(""); // Clear error on input change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.email || !formData.password) {
      setError("Email dan kata sandi harus diisi.");
      setLoading(false);
      return;
    }

    const result = await signInWithEmail(formData.email, formData.password);
    
    if (result.success) {
      // Store remember me preference
      if (formData.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('savedEmail', formData.email);
      }
      
      // Session is already saved by AuthStorage in signInWithEmail
      
      router.push(signInReturnPath(new URLSearchParams(window.location.search).get('next')));
    } else {
      setError('Belum bisa masuk. Periksa email, kata sandi, dan koneksimu, lalu coba lagi.');
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    sessionStorage.setItem('nivo.signin.next', signInReturnPath(new URLSearchParams(window.location.search).get('next')));
    const result = await signInWithGoogle();
    
    if (!result.success) {
      setError('Belum bisa masuk dengan Google. Coba lagi atau gunakan email.');
    }
    setLoading(false);
  };

  return (
    <AuthFrame onBack={() => router.back()}>
      <div>
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold mb-8">Masuk</h1>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-destructive/10 border border-destructive/25 rounded-control text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="signin-email" className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Input
                  id="signin-email"
                  autoComplete="email"
                  type="email"
                  placeholder="Masukkan email"
                  value={formData.email}
                  onChange={handleInputChange("email")}
                  className="pr-10"
                  required
                />
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="signin-password" className="text-sm font-medium text-foreground">Kata sandi</label>
              <div className="relative">
                <Input
                  id="signin-password"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi"
                  value={formData.password}
                  onChange={handleInputChange("password")}
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="nivo-password-toggle"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-h-11 items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, rememberMe: checked as boolean }))
                  }
                />
                <label htmlFor="remember" className="flex min-h-11 items-center text-sm text-foreground">
                  Ingat email saya
                </label>
              </div>
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="min-h-11 text-sm text-accent hover:text-accent/80 font-medium"
              >
                Lupa kata sandi?
              </button>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Memeriksa akun…
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          {/* Sign up link */}
          <div className="text-center mt-4">
            <span className="text-sm text-muted-foreground">Belum punya akun? </span>
            <button
              onClick={() => router.push("/signup")}
              className="min-h-11 text-sm text-accent hover:text-accent/80 font-medium"
            >
              Daftar di sini
            </button>
          </div>

          {/* Social Login */}
          <div className="mt-8">
            <div className="flex items-center gap-4 mb-6">
              <hr className="flex-1 border-border" />
              <span className="text-sm text-muted-foreground px-2">Atau masuk dengan</span>
              <hr className="flex-1 border-border" />
            </div>

            <div className="flex justify-center gap-4">
              <button 
                type="button"
                onClick={handleGoogleSignIn}
                aria-label="Masuk dengan Google"
                disabled={loading}
                className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthFrame>
  );
};

export default SignInScreen;
