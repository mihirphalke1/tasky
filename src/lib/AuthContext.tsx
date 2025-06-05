import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import {
  saveSession,
  clearSession,
  refreshSession,
  extendSession,
  shouldAutoSignIn,
  getSessionTimeRemaining,
  getSessionTimeRemainingHours,
  getSessionInfo,
  isSessionNearExpiry,
} from "./sessionService";
import { toast } from "sonner";
import { logger } from "./logger";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  sessionDaysRemaining: number;
  refreshUserSession: () => void;
  extendUserSession: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Always start with loading true
  const [sessionDaysRemaining, setSessionDaysRemaining] = useState(0);
  const [hasShownExpiryWarning, setHasShownExpiryWarning] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Function to refresh the user session
  const refreshUserSession = () => {
    if (user) {
      refreshSession(user);
      setSessionDaysRemaining(getSessionTimeRemaining());
    }
  };

  // Function to extend the user session (reset 7-day period)
  const extendUserSession = () => {
    if (user) {
      extendSession(user);
      setSessionDaysRemaining(getSessionTimeRemaining());
      setHasShownExpiryWarning(false); // Reset warning flag
      toast.success("Session Extended!", {
        description: "Your session has been extended for another 7 days",
        duration: 2000,
      });
    }
  };

  useEffect(() => {
    logger.log("Setting up authentication state listener");

    // Check if we should expect a user to be signed in
    const hasValidSession = shouldAutoSignIn();
    logger.log("Has valid session on init:", hasValidSession);

    // Set up a timeout to prevent infinite loading (simplified)
    const authTimeout = setTimeout(() => {
      logger.log("Auth initialization timeout - setting loading to false");
      setLoading(false);
    }, 5000); // Simple 5-second timeout

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        logger.log(
          "Auth state changed:",
          user ? `User authenticated: ${user.email}` : "User not authenticated"
        );

        clearTimeout(authTimeout); // Clear timeout since auth state resolved

        if (user) {
          // User is signed in
          logger.log("User ID:", user.uid);
          logger.log("User email:", user.email);

          // Save/update session
          saveSession(user);
          setSessionDaysRemaining(getSessionTimeRemaining());

          // Show welcome message only on initial load with auto-sign-in
          if (isInitialLoad && hasValidSession) {
            const daysRemaining = getSessionTimeRemaining();
            if (daysRemaining > 1) {
              toast.success("Welcome back!", {
                description: `Your session is valid for ${daysRemaining} more days`,
                duration: 2000,
              });
            } else {
              toast.info("Session expiring soon", {
                description: `Your session expires in ${getSessionTimeRemainingHours()} hours`,
                duration: 3000,
              });
            }
          }
        } else {
          // User is signed out
          logger.log("No authenticated user");
          clearSession();
          setSessionDaysRemaining(0);
          setHasShownExpiryWarning(false);
        }

        setUser(user);
        setLoading(false);
        setIsInitialLoad(false);
      },
      (error) => {
        logger.error("Auth state change error:", error);
        clearTimeout(authTimeout);
        clearSession();
        setLoading(false);
        setIsInitialLoad(false);

        // Show user-friendly error message
        toast.error("Authentication Error", {
          description: "Please try signing in again",
          duration: 4000,
        });
      }
    );

    return () => {
      logger.log("Cleaning up authentication listener");
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []); // No dependencies - this effect should only run once

  // Set up session refresh interval and expiry warnings
  useEffect(() => {
    if (!user) return;

    // Refresh session every 30 minutes to keep it active
    const refreshInterval = setInterval(() => {
      refreshUserSession();

      // Check for expiry warning
      if (isSessionNearExpiry() && !hasShownExpiryWarning) {
        const hoursRemaining = getSessionTimeRemainingHours();
        setHasShownExpiryWarning(true);

        toast.warning("Session expiring soon!", {
          description: `Your session expires in ${hoursRemaining} hours. Keep using the app to extend it.`,
          duration: 5000,
          action: {
            label: "Extend Now",
            onClick: extendUserSession,
          },
        });
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Also refresh on user activity
    const handleUserActivity = () => {
      refreshUserSession();
    };

    // Add event listeners for user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];
    let lastActivity = Date.now();

    const throttledActivity = () => {
      const now = Date.now();
      // Only refresh if it's been more than 5 minutes since last refresh
      if (now - lastActivity > 5 * 60 * 1000) {
        lastActivity = now;
        handleUserActivity();
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, throttledActivity, { passive: true });
    });

    return () => {
      clearInterval(refreshInterval);
      events.forEach((event) => {
        document.removeEventListener(event, throttledActivity);
      });
    };
  }, [user, hasShownExpiryWarning]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      logger.log("Attempting Google sign-in");

      // Add timeout for sign-in process
      const signInTimeout = setTimeout(() => {
        logger.warn("Sign-in taking longer than expected");
        toast.info("Sign-in in progress", {
          description: "This may take a moment...",
          duration: 3000,
        });
      }, 5000);

      const result = await signInWithPopup(auth, googleProvider);
      clearTimeout(signInTimeout);

      if (result.user) {
        logger.log("Google sign-in successful:", result.user.uid);
        // Session will be saved in the onAuthStateChanged callback
        // Navigation will be handled by the route protection components
        toast.success("Welcome to Tasky!", {
          description: "You're signed in for the next 7 days",
          duration: 2000,
        });
      }
    } catch (error: any) {
      logger.error("Error signing in with Google:", error);
      setLoading(false);

      // Handle specific error cases
      if (error.code === "auth/popup-closed-by-user") {
        toast.info("Sign-in cancelled", {
          description: "You can try again anytime",
          duration: 2000,
        });
      } else if (error.code === "auth/popup-blocked") {
        toast.error("Popup blocked", {
          description: "Please allow popups for this site",
          duration: 3000,
        });
      } else {
        toast.error("Sign-in failed", {
          description: "Please try again",
          duration: 3000,
        });
      }
    }
  };

  const logout = async () => {
    try {
      logger.log("Attempting logout");
      await signOut(auth);
      logger.log("Logout successful");
      toast.success("Logged out successfully");
    } catch (error) {
      logger.error("Error signing out:", error);
      toast.error("Logout failed", {
        description: "Please try again",
        duration: 3000,
      });
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    logout,
    isAuthenticated: !!user,
    sessionDaysRemaining,
    refreshUserSession,
    extendUserSession,
  };

  // Show loading screen while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF8F6] to-[#EFE7DD] dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 border-4 border-[#CDA351]/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin absolute inset-0"></div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-wider text-[#1A1A1A] dark:text-white">
              <span className="tracking-widest">T</span>
              <span className="tracking-widest">A</span>
              <span className="tracking-widest">S</span>
              <span className="tracking-widest">K</span>
              <span className="tracking-widest">Y</span>
              <span className="text-[#CDA351] tracking-widest">.</span>
              <span className="text-[#CDA351] tracking-widest">A</span>
              <span className="text-[#CDA351] tracking-widest">P</span>
              <span className="text-[#CDA351] tracking-widest">P</span>
            </h2>
            <div className="w-12 h-0.5 bg-[#CDA351] mx-auto"></div>
            <p className="text-lg font-medium text-[#1A1A1A] dark:text-white">
              Authenticating...
            </p>
            <p className="text-sm text-[#7E7E7E] dark:text-gray-400 font-medium">
              Checking your session
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
