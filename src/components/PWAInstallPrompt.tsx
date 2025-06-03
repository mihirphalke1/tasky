import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { X, Download, Smartphone, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface PWAInstallPromptProps {
  onClose?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  onClose,
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if app is already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any)?.standalone === true;
    setIsInstalled(isStandalone);

    // Check if installation prompt was dismissed recently
    const dismissedTimestamp = localStorage.getItem("pwa-install-dismissed");
    const hoursSinceDismissed = dismissedTimestamp
      ? (Date.now() - parseInt(dismissedTimestamp)) / (1000 * 60 * 60)
      : Infinity;

    // Don't show if installed or dismissed in last 24 hours
    if (isStandalone || hoursSinceDismissed < 24) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      console.log("PWA: Install prompt available");

      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      setDeferredPrompt(event);
      setCanInstall(true);

      // Show our custom prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log("PWA: App was installed");
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      toast.success("Tasky installed successfully!", {
        description: "You can now access Tasky from your home screen.",
        duration: 5000,
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        // Show iOS install instructions
        setShowPrompt(true);
        return;
      }
      toast.error("Installation not available", {
        description: "Your browser does not support app installation.",
      });
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("PWA: User accepted install");
        toast.success("Installing Tasky...", {
          description: "The app will be available on your home screen shortly.",
        });
      } else {
        console.log("PWA: User dismissed install");
        toast.info("Installation cancelled", {
          description: "You can install Tasky anytime from the browser menu.",
        });
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error("PWA: Error during installation:", error);
      toast.error("Installation failed", {
        description: "Please try again or install from your browser menu.",
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());

    if (onClose) {
      onClose();
    }

    toast.info("Install reminder dismissed", {
      description: "You can install Tasky anytime from the browser menu.",
    });
  };

  // Don't show if not installable or already installed
  if (isInstalled || (!canInstall && !isIOS)) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96"
        >
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Install Tasky</h3>
                    <p className="text-sm text-muted-foreground">
                      Get the full experience
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Works offline</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Fast loading</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Home screen access</span>
                </div>
              </div>

              {isIOS ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    To install on iOS:
                  </p>
                  <ol className="text-xs space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-xs flex items-center justify-center font-medium">
                        1
                      </span>
                      Tap the Share button in Safari
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-xs flex items-center justify-center font-medium">
                        2
                      </span>
                      Scroll down and tap "Add to Home Screen"
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-xs flex items-center justify-center font-medium">
                        3
                      </span>
                      Tap "Add" to confirm
                    </li>
                  </ol>
                  <Button
                    onClick={handleDismiss}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    Got it!
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleInstallClick}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Install App
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    variant="outline"
                    size="lg"
                    className="px-4"
                  >
                    Later
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook to check PWA installation status
export const usePWAStatus = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const checkInstallStatus = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any)?.standalone === true;
      setIsInstalled(isStandalone);
    };

    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    checkInstallStatus();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return { isInstalled, canInstall };
};

export default PWAInstallPrompt;
