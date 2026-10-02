import WelcomeScreen from '@/features/auth/SignInPage/WelcomeScreen';
import AuthGuard from '@/shared/auth/AuthGuard';

export default function WelcomePage() {
  return (
    <AuthGuard>
      <WelcomeScreen />
    </AuthGuard>
  );
}
