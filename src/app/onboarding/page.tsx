import AuthGuard from '@/shared/auth/AuthGuard';
import JourneySetupScreen from '@/features/onboarding/JourneySetupScreen';

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <JourneySetupScreen />
    </AuthGuard>
  );
}
