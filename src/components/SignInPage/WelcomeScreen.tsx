import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import abstractHeader from "@/assets/abstract-header.jpg";
import logo from "@/assets/logo.png";
const WelcomeScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Abstract Header */}
      <div className="h-48 relative overflow-hidden">
        <img
          src={abstractHeader}
          alt="Abstract colorful background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="max-w-sm mx-auto px-6 py-8">
        <div className="animate-fade-in">
          {/* Logo and Welcome - Centered */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center">
                <img src={logo} alt="Nivo Logo"/>
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Selamat<br />Datang
              </h1>
            </div>
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-center mb-12 leading-relaxed">
            Kami percaya perubahan adalah pilihan<br />
            dan kami hadir untuk menemani<br />
            perjalanan lebih sehatmu tanpa nikotin.
          </p>

          {/* Action Buttons */}
          <div className="space-y-4 mb-8">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => navigate("/signin")}
            >
              Sign In
            </Button>
            <Button
              size="lg"
              className="w-full bg-accent hover:bg-accent/90"
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </Button>
          </div>

          {/* Social Login */}
          <div className="text-center">
            <div className="flex items-center gap-4 mb-6">
              <hr className="flex-1 border-border" />
              <span className="text-sm text-muted-foreground px-2">Or connect using</span>
              <hr className="flex-1 border-border" />
            </div>

            <div className="flex justify-center gap-4">
              <button className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors">
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
              <button className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Privacy Links */}
          <div className="flex justify-center gap-6 mt-8">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Kebijakan Privasi
            </button>
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Syarat & Ketentuan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;