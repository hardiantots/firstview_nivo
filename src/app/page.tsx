import OnboardingScreen from '@/features/onboarding/OnboardingScreen';
import AuthGuard from '@/shared/auth/AuthGuard';

export default function HomePage() {
  return (
    <AuthGuard>
      <OnboardingScreen />
    </AuthGuard>
  );
}
