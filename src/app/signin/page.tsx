import SignInScreen from '@/features/auth/SignInPage/SignInScreen';
import AuthGuard from '@/shared/auth/AuthGuard';

export default function SignInPage() {
  return (
    <AuthGuard>
      <SignInScreen />
    </AuthGuard>
  );
}
