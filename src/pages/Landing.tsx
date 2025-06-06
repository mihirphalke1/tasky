import { Button } from "@/components/ui/button";
import { Chrome, HelpCircle, Download } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import TypewriterText from "@/components/TypewriterText";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePWAStatus } from "@/components/PWAInstallPrompt";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { isInstallable, isStandalone } from "../lib/pwa-utils";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Landing = () => {
  const { signInWithGoogle, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { isInstalled, canInstall, triggerInstall } = usePWAStatus();

  const taglines = [
    "A focused space for your tasks.",
    "Your day, your pace.",
    "No distractions. Just flow.",
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const handleInstallClick = () => {
    setShowInstallPrompt(true);
  };

  const handleInstall = async () => {
    await triggerInstall();
  };

  const handleCloseInstallPrompt = () => {
    setShowInstallPrompt(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#FAF8F6] to-[#EFE7DD] dark:from-gray-900 dark:to-gray-800">
      {/* Header - Minimal */}
      <header className="w-full p-4 sm:p-8 flex justify-end">
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="p-2 sm:p-2.5 rounded-full bg-white/20 backdrop-blur-sm border border-[#CDA351]/20 text-[#7E7E7E] hover:text-[#CDA351] transition-all duration-300"
          aria-label="Toggle theme"
        >
          <span className="sr-only">Toggle theme</span>
          {theme === "light" ? (
            <Moon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          ) : (
            <Sun className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          )}
        </button>
      </header>

      {/* Main Content - Centered Vertically & Horizontally */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="max-w-md w-full text-center space-y-6 sm:space-y-8 animate-fade-in">
          {/* Logo/Brand */}
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold tracking-wider text-[#1A1A1A] dark:text-white">
              <span className="tracking-widest">T</span>
              <span className="tracking-widest">A</span>
              <span className="tracking-widest">S</span>
              <span className="tracking-widest">K</span>
              <span className="tracking-widest">Y</span>
              <span className="text-[#CDA351] tracking-widest">.</span>
              <span className="text-[#CDA351] tracking-widest">A</span>
              <span className="text-[#CDA351] tracking-widest">P</span>
              <span className="text-[#CDA351] tracking-widest">P</span>
            </h1>

            {/* Gold divider */}
            <div className="w-16 sm:w-20 h-0.5 bg-[#CDA351] mx-auto"></div>

            {/* Tagline with Typewriter */}
            <div className="h-6 sm:h-8">
              <TypewriterText
                phrases={taglines}
                className="text-[#7E7E7E] dark:text-gray-400 text-base sm:text-lg font-medium"
              />
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-4 sm:pt-6 space-y-3">
            <Button
              onClick={signInWithGoogle}
              variant="outline"
              size="lg"
              className="w-full py-3 px-6 border-[#CDA351] text-[#CDA351] hover:bg-[#CDA351] hover:text-white transition-all duration-300 dark:border-[#CDA351] dark:text-[#CDA351] dark:hover:bg-[#CDA351] dark:hover:text-white hover:shadow-[0_0_15px_rgba(205,163,81,0.3)] text-sm sm:text-base"
            >
              <Chrome className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Continue with Google
            </Button>

            {/* How Tasky Works Button */}

            {/* Install App Button */}
            {!isInstalled && canInstall && (
              <Button
                onClick={handleInstallClick}
                variant="outline"
                className="border-2 border-[#CDA351] text-[#CDA351] hover:bg-[#CDA351]/10 px-8 py-6 text-lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Install App
                <Badge
                  variant="secondary"
                  className="ml-2 bg-[#CDA351]/10 text-[#CDA351] text-xs px-2 py-0.5 font-medium"
                >
                  PWA
                </Badge>
              </Button>
            )}

            {/* Monospace tagline */}
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-[#7E7E7E] dark:text-gray-400 font-mono">
              productivity without clutter
            </p>
          </div>
        </div>
        {showInstallPrompt && (
          <PWAInstallPrompt
            onClose={handleCloseInstallPrompt}
            onInstall={handleInstall}
          />
        )}
      </main>

      {/* Footer - Minimal */}
      <footer className="mt-auto border-t border-[#CDA351]/10 dark:border-gray-700/30">
        <div className="max-w-md mx-auto p-6 sm:p-8 space-y-4 text-center">
          <Button
            onClick={() => navigate("/how-it-works")}
            variant="ghost"
            size="lg"
            className="w-full py-3 px-6 text-[#7E7E7E] hover:text-[#CDA351] hover:bg-[#CDA351]/5 transition-all duration-300 dark:text-gray-400 dark:hover:text-[#CDA351] dark:hover:bg-[#CDA351]/10 text-sm sm:text-base"
          >
            <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            How Tasky Works
          </Button>
          <p className="text-xs sm:text-sm text-[#7E7E7E] dark:text-gray-400">
            © 2025 Tasky — Built for minimal distractions.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
