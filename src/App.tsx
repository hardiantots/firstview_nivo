import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import MainLayout from "./components/MainLayout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OnboardingScreen from "./components/OnboardingScreen";
import WelcomeScreen from "./components/SignInPage/WelcomeScreen";
import SignInScreen from "./components/SignInPage/SignInScreen";
import SignUpScreen from "./components/SignInPage/SignUpScreen";
import JourneyStartScreen from "./components/SignInPage/JourneyStartScreen";
import TimeSelectionScreen from "./components/SignInPage/TimeSelectionScreen";
import SetQuitDatePastScreen from "./components/SignInPage/SetQuitDatePastScreen";
import MotivationScreen from "./components/SignInPage/MotivationScreen";
import HomePage from "./components/HomePage/HomePage";
import CravingSupportPage from "./components/CravingSupportPage/CravingSupportPage";
import TrackerPage from "./components/TrackerPage/TrackerPage";
import PencapaianPage from "./components/PencapaianPage/PencapaianPage";
import ProfileSettingsPage from "./components/ProfileSettingsPage";
import AIResultPage from "./components/CravingSupportPage/AIResultPage";
import NotificationPage from "./components/NotificationPage";
import NotFound from "./pages/NotFound";
import ForgotPasswordScreen from "./components/SignInPage/ForgotPasswordScreen";
import OtpVerificationScreen from "./components/SignInPage/OtpVerificationScreen";
import ResetPasswordScreen from "./components/SignInPage/ResetPasswordScreen";
import PasswordResetSuccessScreen from "./components/SignInPage/PasswordResetSuccessScreen";
import CravingHistoryDetailPage from "./components/TrackerPage/CravingHistoryDetailPage";
import CravingHistoryListPage from "./components/TrackerPage/CravingHistoryListPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<OnboardingScreen />} />
          <Route path="/welcome" element={<WelcomeScreen />} />
          <Route path="/signin" element={<SignInScreen />} /> 
          <Route path="/signup" element={<SignUpScreen />} /> 
          <Route path="/journey-start" element={<JourneyStartScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/otp-verification" element={<OtpVerificationScreen />} />
          <Route path="/reset-password" element={<ResetPasswordScreen />} />
          <Route path="/password-reset-success" element={<PasswordResetSuccessScreen />} />
          <Route path="/time-selection" element={<TimeSelectionScreen />} />
          <Route path="/set-quit-date-past" element={<SetQuitDatePastScreen />} />
          <Route path="/motivation" element={<MotivationScreen />} />
          <Route element={<MainLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/craving-support" element={<CravingSupportPage />} />
            <Route path="/tracker" element={<TrackerPage />} />
            <Route path="/craving-history" element={<CravingHistoryListPage />} />
            <Route path="/craving-history/:id" element={<CravingHistoryDetailPage />} />
            <Route path="/pencapaian" element={<PencapaianPage />} />
          </Route>
          <Route path="/profile-settings" element={<ProfileSettingsPage />} />
          <Route path="/ai-result" element={<AIResultPage />} />
          <Route path="/notifications" element={<NotificationPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;