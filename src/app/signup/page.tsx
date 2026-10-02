import SignUpScreen from '@/features/auth/SignInPage/SignUpScreen';
import AuthGuard from '@/shared/auth/AuthGuard';

export default function SignUpPage() {
  return (
    <AuthGuard>
      <SignUpScreen />
    </AuthGuard>
  );
}
