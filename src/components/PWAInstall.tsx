import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Smartphone,
  Monitor,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAInstallProps {
  variant?: "button" | "notification" | "menu-item";
  onInstall?: () => void;
  className?: string;
}

export const PWAInstall: React.FC<PWAInstallProps> = ({
  variant = "button",
  onInstall,
  className,
}) => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [deviceType, setDeviceType] = useState<"mobile" | "desktop">("desktop");
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isInstalled = isStandalone || isIOSStandalone;
    setIsInstalled(isInstalled);

    // Detect device type
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    setDeviceType(isMobile ? "mobile" : "desktop");

    // Debug information
    const debug = `
      Platform: ${isMobile ? "Mobile" : "Desktop"}
      User Agent: ${navigator.userAgent}
      Is Standalone: ${isStandalone}
      Is iOS Standalone: ${isIOSStandalone}
      Is Installed: ${isInstalled}
      Location: ${window.location.href}
      HTTPS: ${window.location.protocol === "https:"}
      Localhost: ${window.location.hostname === "localhost"}
    `;
    setDebugInfo(debug);

    // For localhost testing, make the app installable after a short delay
    // This helps with testing when the beforeinstallprompt event might not fire
    if (window.location.hostname === "localhost" && !isInstalled) {
      setTimeout(() => {
        setIsInstallable(true);
        console.log("PWA: Forced installable state for localhost testing");

        // Show notification after delay for testing
        setTimeout(() => {
          if (!localStorage.getItem("pwa-install-prompted")) {
            setShowNotification(true);
          }
        }, 3000);
      }, 1000);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
      console.log("PWA: beforeinstallprompt event fired");

      // Show notification for first-time visitors after a delay
      setTimeout(() => {
        if (!localStorage.getItem("pwa-install-prompted")) {
          setShowNotification(true);
        }
      }, 5000);
    };

    // Listen for successful app install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowNotification(false);
      localStorage.setItem("pwa-installed", "true");
      console.log("PWA: App successfully installed");
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
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === "accepted") {
          localStorage.setItem("pwa-install-prompted", "true");
          onInstall?.();
          console.log("PWA: User accepted the install prompt");
        } else {
          console.log("PWA: User dismissed the install prompt");
        }

        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (error) {
        console.error("PWA: Error during installation:", error);
      }
    } else {
      // For iOS, localhost, or other browsers, show instructions
      setShowInstallPrompt(true);
      console.log("PWA: Showing manual installation instructions");
    }
  };

  const dismissNotification = () => {
    setShowNotification(false);
    localStorage.setItem("pwa-install-prompted", "true");
  };

  const getInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isLocalhost = window.location.hostname === "localhost";

    if (isLocalhost && !isIOS) {
      return (
        <div className="space-y-3 text-sm">
          <p className="font-medium">Install Tasky (Localhost Testing):</p>
          <div className="space-y-2 text-xs">
            <p>
              🔍 <strong>Chrome/Edge:</strong> Look for install button (⬇️) in
              address bar
            </p>
            <p>
              🔧 <strong>Testing tip:</strong> Try opening in Chrome/Edge, then
              check DevTools → Application → Manifest
            </p>
            <p>
              ⚠️ <strong>Note:</strong> Some PWA features require HTTPS in
              production
            </p>
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">Debug Info</summary>
            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
              {debugInfo}
            </pre>
          </details>
        </div>
      );
    }

    if (isIOS && isSafari) {
      return (
        <div className="space-y-2 text-sm">
          <p className="font-medium">Install Tasky on your iPhone/iPad:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>
              Tap the Share button <span className="font-mono">□↗</span> in
              Safari
            </li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" to install Tasky</li>
          </ol>
        </div>
      );
    }

    return (
      <div className="space-y-2 text-sm">
        <p className="font-medium">Install Tasky:</p>
        <p className="text-xs">
          Look for the install button in your browser's address bar or menu.
        </p>
      </div>
    );
  };

  if (isInstalled) {
    return variant === "menu-item" ? (
      <div className="flex items-center gap-3 px-4 py-3 text-sm text-green-600 dark:text-green-400">
        <CheckCircle className="h-4 w-4" />
        <span className="font-medium">App Installed</span>
      </div>
    ) : null;
  }

  // For localhost testing, always show the install option even if not officially installable
  const shouldShow = isInstallable || window.location.hostname === "localhost";

  if (!shouldShow && variant === "notification") {
    return null;
  }

  // Notification variant
  if (variant === "notification") {
    return (
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 max-w-sm"
          >
            <div className="bg-white dark:bg-gray-900 border border-[#CDA351]/20 rounded-lg shadow-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {deviceType === "mobile" ? (
                    <Smartphone className="h-5 w-5 text-[#CDA351]" />
                  ) : (
                    <Monitor className="h-5 w-5 text-[#CDA351]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                    Install Tasky
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Get the full app experience with offline access and quick
                    launch.
                  </p>
                  {window.location.hostname === "localhost" && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        Testing on localhost
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleInstallClick}
                      className="bg-[#CDA351] hover:bg-[#B8935A] text-white text-xs px-3 py-1.5 h-auto"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Install
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={dismissNotification}
                      className="text-xs px-2 py-1.5 h-auto"
                    >
                      Later
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={dismissNotification}
                  className="h-6 w-6 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Menu item variant
  if (variant === "menu-item") {
    return (
      <button
        onClick={handleInstallClick}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#CDA351]/10 transition-colors duration-200",
          "text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white",
          className
        )}
      >
        <div className="flex-shrink-0">
          {deviceType === "mobile" ? (
            <Smartphone className="h-4 w-4" />
          ) : (
            <Monitor className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Install App</span>
            <Badge
              variant="secondary"
              className="bg-[#CDA351]/10 text-[#CDA351] text-xs px-2 py-0.5 font-medium"
            >
              PWA
            </Badge>
            {window.location.hostname === "localhost" && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 text-xs px-1 py-0.5"
              >
                TEST
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Quick access & offline support
          </p>
        </div>
      </button>
    );
  }

  // Button variant
  return (
    <>
      <Button
        onClick={handleInstallClick}
        className={cn(
          "bg-gradient-to-r from-[#CDA351] to-[#B8935A] hover:from-[#B8935A] hover:to-[#CDA351]",
          "text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300",
          className
        )}
      >
        <Download className="h-4 w-4 mr-2" />
        Install App
      </Button>

      {/* Installation Instructions Modal/Popup */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowInstallPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-lg p-6 m-4 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                {deviceType === "mobile" ? (
                  <Smartphone className="h-6 w-6 text-[#CDA351]" />
                ) : (
                  <Monitor className="h-6 w-6 text-[#CDA351]" />
                )}
                <h3 className="text-lg font-semibold">Install Tasky</h3>
                {window.location.hostname === "localhost" && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 text-xs"
                  >
                    Testing
                  </Badge>
                )}
              </div>

              {getInstallInstructions()}

              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowInstallPrompt(false)}
                  className="flex-1"
                >
                  Got it
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PWAInstall;
