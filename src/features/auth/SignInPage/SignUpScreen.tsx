'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Loader, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signUpWithEmail, signInWithGoogle, signInWithFacebook } from '@/lib/auth';
import AuthFrame from '@/features/auth/AuthFrame';
import { signInReturnPath } from '@/shared/auth/return-path';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const SignUpScreen = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setError(''); // Clear error on input change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.email || !formData.password) {
      setError('Email dan kata sandi harus diisi.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      setLoading(false);
      return;
    }
    const result = await signUpWithEmail(formData.email, formData.password);

    if (result.success) {
      if (result.data?.session) {
        router.replace(signInReturnPath(new URLSearchParams(window.location.search).get('next')));
        setLoading(false);
        return;
      }
      // Show verification modal instead of immediately redirecting
      setVerificationEmail(formData.email);
      setShowVerificationModal(true);
    } else {
      setError(
        'Akun belum berhasil dibuat. Periksa email dan koneksi, lalu coba lagi. Jika sudah punya akun, gunakan halaman masuk.',
      );
    }

    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');
    sessionStorage.setItem(
      'nivo.signin.next',
      signInReturnPath(new URLSearchParams(window.location.search).get('next')),
    );
    const result = await signInWithGoogle();

    if (!result.success) {
      setError('Belum bisa daftar dengan Google. Coba lagi atau gunakan email.');
    }
    setLoading(false);
  };

  const handleFacebookSignUp = async () => {
    setLoading(true);
    setError('');
    sessionStorage.setItem(
      'nivo.signin.next',
      signInReturnPath(new URLSearchParams(window.location.search).get('next')),
    );
    const result = await signInWithFacebook();

    if (!result.success) {
      setError('Belum bisa daftar dengan Facebook. Coba lagi atau gunakan email.');
    }
    setLoading(false);
  };

  return (
    <>
      {/* Verification Modal */}
      {showVerificationModal && (
        <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
          <DialogContent className="nivo-glass nivo-glass-warm max-w-sm max-h-[90dvh] overflow-y-auto p-6 sm:p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            {/* Title */}
            <DialogTitle className="text-2xl font-bold text-center mb-2">
              Akun Berhasil Dibuat!
            </DialogTitle>
            <DialogDescription className="sr-only">
              Periksa email untuk mengaktifkan akun NIVO.
            </DialogDescription>

            {/* Message */}
            <p className="text-center text-gray-600 mb-2">Verifikasi email telah dikirim ke:</p>
            <p className="text-center font-semibold text-foreground mb-6 break-all">
              {verificationEmail}
            </p>

            {/* Description */}
            <div className="bg-secondary/10 border border-secondary/25 rounded-lg p-4 mb-6">
              <p className="text-sm text-accent">
                Periksa emailmu (termasuk folder spam) untuk tautan verifikasi. Buka tautan tersebut
                untuk mengaktifkan akunmu.
              </p>
            </div>

            {/* Next Steps */}
            <div className="mb-6">
              <h3 className="font-semibold text-sm mb-3">Langkah Selanjutnya:</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-fit">1.</span>
                  <span>Buka email yang dikirim ke {verificationEmail}</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-fit">2.</span>
                  <span>Buka tautan verifikasi dalam email</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-fit">3.</span>
                  <span>Kembali ke halaman masuk dan gunakan emailmu</span>
                </li>
              </ol>
            </div>

            {/* Button */}
            <Button
              onClick={() => router.push('/signin')}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              Kembali ke halaman masuk
            </Button>
          </DialogContent>
        </Dialog>
      )}
      <AuthFrame onBack={() => router.back()}>
        <div>
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold mb-8">Buat akun</h1>

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 bg-destructive/10 border border-destructive/25 rounded-control text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Input
                    id="signup-email"
                    autoComplete="email"
                    type="email"
                    placeholder="Masukkan email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    className="pr-10"
                    required
                  />
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                  Kata sandi
                </label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    autoComplete="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan kata sandi"
                    value={formData.password}
                    onChange={handleInputChange('password')}
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

              {/* Sign Up Button */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Membuat akun…
                  </>
                ) : (
                  'Daftar'
                )}
              </Button>
            </form>

            {/* Sign in link */}
            <div className="text-center mt-4">
              <span className="text-sm text-muted-foreground">Sudah punya akun? </span>
              <button
                onClick={() => router.push('/signin')}
                className="min-h-11 text-sm text-accent hover:text-accent/80 font-medium"
              >
                Masuk di sini
              </button>
            </div>

            {/* Social Login */}
            <div className="mt-8">
              <div className="flex items-center gap-4 mb-6">
                <hr className="flex-1 border-border" />
                <span className="text-sm text-muted-foreground px-2">Atau daftar dengan</span>
                <hr className="flex-1 border-border" />
              </div>

              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  aria-label="Daftar dengan Google"
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
                {process.env.NEXT_PUBLIC_FACEBOOK_AUTH_ENABLED === 'true' && (
                  <button
                    type="button"
                    onClick={handleFacebookSignUp}
                    aria-label="Daftar dengan Facebook"
                    disabled={loading}
                    className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </AuthFrame>
    </>
  );
};

export default SignUpScreen;
