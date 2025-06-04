import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { useNavigate } from "react-router-dom";
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionDaysRemaining, setSessionDaysRemaining] = useState(0);
  const [hasShownExpiryWarning, setHasShownExpiryWarning] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const navigate = useNavigate();

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
    if (hasValidSession) {
      console.log("Valid session found, attempting automatic sign-in");
      const sessionInfo = getSessionInfo();
      if (sessionInfo) {
        console.log("Session info:", {
          userId: sessionInfo.userId,
          email: sessionInfo.email,
          daysRemaining: sessionInfo.daysRemaining,
          sessionAge: sessionInfo.sessionAgeInDays,
        });
      }
    }

    // Add timeout to prevent infinite loading
    const authTimeout = setTimeout(() => {
      if (!authInitialized) {
        console.warn(
          "Authentication initialization timeout - forcing completion"
        );
        setLoading(false);
        setAuthInitialized(true);
      }
    }, 10000); // 10 second timeout

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log(
          "Auth state changed:",
          user ? "User authenticated" : "User not authenticated"
        );

        clearTimeout(authTimeout);
        setAuthInitialized(true);

        if (user) {
          // User is signed in
          console.log("User ID:", user.uid);
          console.log("User email:", user.email);

          // Save/update session
          saveSession(user);
          setSessionDaysRemaining(getSessionTimeRemaining());

          // Show welcome back message if this was an automatic sign-in
          if (hasValidSession) {
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
        clearSession();
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up authentication listener");
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

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
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        console.log("Google sign-in successful:", result.user.uid);
        // Session will be saved in the onAuthStateChanged callback
        navigate("/dashboard");
        toast.success("Welcome to Tasky!", {
          description: "You're signed in for the next 7 days",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false);
      toast.error("Sign-in failed", {
        description: "Please try again",
        duration: 3000,
      });
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

  // Show loading spinner instead of blank screen
  if (loading && !authInitialized) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
