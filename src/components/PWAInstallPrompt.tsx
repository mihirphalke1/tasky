import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { isIOS } from "@/lib/pwa-utils";

interface PWAInstallPromptProps {
  onClose: () => void;
  onInstall: () => void;
}

export function PWAInstallPrompt({
  onClose,
  onInstall,
}: PWAInstallPromptProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    setIsIOSDevice(isIOS());
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const handleInstall = () => {
    onInstall();
    handleClose();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 text-center">
              <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                Install Tasky
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {isIOSDevice
                  ? "Install Tasky on your device for a better experience"
                  : "Add Tasky to your home screen for quick access"}
              </p>
            </div>

            {isIOSDevice ? (
              <div className="mb-6 space-y-4">
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                    iOS Installation Steps:
                  </h3>
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
                    <li>Tap the Share button in your browser</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add" to install</li>
                  </ol>
                </div>
                <Button
                  onClick={handleClose}
                  className="w-full bg-[#CDA351] text-white hover:bg-[#B89141]"
                >
                  Got it
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleInstall}
                  className="w-full bg-[#CDA351] text-white hover:bg-[#B89141]"
                >
                  Install Now
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="w-full"
                >
                  Maybe Later
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const usePWAStatus = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      localStorage.setItem("pwaInstalled", "true");
      return;
    }

    // Check if previously installed
    const wasInstalled = localStorage.getItem("pwaInstalled") === "true";
    if (wasInstalled) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Don't prevent default anymore to allow Chrome's native prompt
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      setShowPrompt(true); // Show our prompt when Chrome's prompt is available
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
      localStorage.setItem("pwaInstalled", "true");
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

  const triggerInstall = async () => {
    if (!deferredPrompt) return;

    try {
      // Trigger Chrome's native install prompt
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
        setShowPrompt(false);
        localStorage.setItem("pwaInstalled", "true");
      }

      // Clear the deferred prompt after use
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Error triggering install:", error);
    }
  };

  const showInstallPrompt = () => {
    if (isInstalled) return;

    const lastShown = localStorage.getItem("lastPromptShown");
    const now = Date.now();

    if (!lastShown || now - parseInt(lastShown) > 3 * 60 * 60 * 1000) {
      // 3 hours
      setShowPrompt(true);
      localStorage.setItem("lastPromptShown", now.toString());
    }
  };

  return {
    isInstallable,
    isInstalled,
    showPrompt,
    setShowPrompt,
    triggerInstall,
    showInstallPrompt,
  };
};

export default PWAInstallPrompt;
