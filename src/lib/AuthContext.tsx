import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { useNavigate, useLocation } from "react-router-dom";
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
  // Check for valid session immediately on initialization
  const hasValidSessionOnInit = shouldAutoSignIn();

  const [user, setUser] = useState<User | null>(null);
  // If we have a valid session, don't start in loading state
  const [loading, setLoading] = useState(!hasValidSessionOnInit);
  const [sessionDaysRemaining, setSessionDaysRemaining] = useState(0);
  const [hasShownExpiryWarning, setHasShownExpiryWarning] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(hasValidSessionOnInit);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

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
    console.log("Setting up authentication state listener");

    // Check if there's a valid stored session before Firebase auth initializes
    const hasValidSession = shouldAutoSignIn();
    console.log("Has valid session on init:", hasValidSession);

    // Only set timeout if we don't have a valid session or need retry
    let authTimeout: NodeJS.Timeout | null = null;

    if (!hasValidSession || initializationAttempts > 0) {
      // Shorter, more aggressive timeout for cases without valid session
      const maxInitTime = Math.max(3000, 8000 - initializationAttempts * 1500);
      console.log(
        `Auth timeout set to ${maxInitTime}ms (attempt ${
          initializationAttempts + 1
        })`
      );

      authTimeout = setTimeout(() => {
        if (!authInitialized) {
          console.warn(
            `Authentication initialization timeout after ${maxInitTime}ms - forcing completion`
          );
          setLoading(false);
          setAuthInitialized(true);
          setInitializationAttempts((prev) => prev + 1);

          // If we have a valid session but auth hasn't initialized, show a warning
          if (hasValidSession) {
            toast.info("Authentication taking longer than expected", {
              description: "You may need to sign in again if issues persist",
              duration: 4000,
            });
          }
        }
      }, maxInitTime);
    } else {
      console.log(
        "Valid session found - skipping timeout, waiting for Firebase auth"
      );
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log(
          "Auth state changed:",
          user ? `User authenticated: ${user.email}` : "User not authenticated"
        );

        if (authTimeout) clearTimeout(authTimeout);
        setAuthInitialized(true);
        setInitializationAttempts(0); // Reset attempts on successful auth

        if (user) {
          // User is signed in
          console.log("User ID:", user.uid);
          console.log("User email:", user.email);

          // Save/update session (this will preserve existing session start time)
          saveSession(user);
          setSessionDaysRemaining(getSessionTimeRemaining());

          // Show welcome back message if this was an automatic sign-in
          if (hasValidSession) {
            const daysRemaining = getSessionTimeRemaining();
            console.log("Auto sign-in successful - session restored");
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
          } else {
            console.log("New sign-in detected");
          }

          // Automatically navigate to dashboard if the user is on the landing page
          if (location.pathname === "/") {
            navigate("/dashboard");
          }
        } else {
          // User is signed out
          console.log("No authenticated user");
          clearSession();
          setSessionDaysRemaining(0);
          setHasShownExpiryWarning(false);
        }

        setUser(user);
        setLoading(false);
      },
      (error) => {
        console.error("Auth state change error:", error);
        if (authTimeout) clearTimeout(authTimeout);
        setAuthInitialized(true);
        clearSession();
        setLoading(false);

        // Show user-friendly error message
        toast.error("Authentication Error", {
          description: "Please try signing in again",
          duration: 4000,
        });
      }
    );

    return () => {
      console.log("Cleaning up authentication listener");
      if (authTimeout) clearTimeout(authTimeout);
      unsubscribe();
    };
  }, [initializationAttempts, location.pathname, navigate]); // Removed persistenceReady dependency

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
      console.log("Attempting Google sign-in");

      // Add timeout for sign-in process
      const signInTimeout = setTimeout(() => {
        console.warn("Sign-in taking longer than expected");
        toast.info("Sign-in in progress", {
          description: "This may take a moment...",
          duration: 3000,
        });
      }, 5000);

      const result = await signInWithPopup(auth, googleProvider);
      clearTimeout(signInTimeout);

      if (result.user) {
        console.log("Google sign-in successful:", result.user.uid);
        // Session will be saved in the onAuthStateChanged callback
        navigate("/dashboard");
        toast.success("Welcome to Tasky!", {
          description: "You're signed in for the next 7 days",
          duration: 2000,
        });
      }
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      setLoading(false);

      // Handle specific error cases
      if (error.code === "auth/popup-closed-by-user") {
        toast.info("Sign-in cancelled", {
          description: "You can try again anytime",
          duration: 2000,
        });
      } else if (error.code === "auth/popup-blocked") {
        toast.error("Popup blocked", {
          description: "Please allow popups for this site and try again",
          duration: 4000,
        });
      } else {
        toast.error("Sign-in failed", {
          description: "Please check your connection and try again",
          duration: 3000,
        });
      }
    }
  };

  const logout = async () => {
    try {
      console.log("Attempting logout");
      await signOut(auth);
      clearSession();
      console.log("Logout successful");
      navigate("/");
      toast.success("Signed out", {
        description: "Come back anytime!",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Sign-out failed", {
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

  // Simplified loading screen
  if (loading && !authInitialized) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-[#CDA351]/20 rounded-full"></div>
            <div className="w-12 h-12 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin absolute inset-0"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-[#1A1A1A] dark:text-white">
              {initializationAttempts === 0
                ? "Authenticating..."
                : "Reconnecting..."}
            </p>
            <p className="text-sm text-muted-foreground">
              {initializationAttempts === 0
                ? "Checking your login status"
                : `Attempt ${initializationAttempts + 1} - Please wait`}
            </p>
            {initializationAttempts > 1 && (
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-[#CDA351] hover:underline mt-2"
              >
                Refresh page if this continues
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
