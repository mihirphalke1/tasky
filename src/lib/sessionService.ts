import { User } from "firebase/auth";
import { auth } from "./firebase";

interface SessionData {
  userId: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  lastLogin: number;
  sessionStart: number;
  isValid: boolean;
}

const SESSION_STORAGE_KEY = "tasky_user_session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const SESSION_WARNING_THRESHOLD = 1 * 24 * 60 * 60 * 1000; // Warn when 1 day left

/**
 * Save user session data to localStorage
 */
export const saveSession = (user: User): void => {
  const existingSession = getStoredSession();
  const now = Date.now();

  const sessionData: SessionData = {
    userId: user.uid,
    email: user.email || "",
    displayName: user.displayName,
    photoURL: user.photoURL,
    lastLogin: now,
    // Keep existing session start time if available, otherwise start new session
    sessionStart: existingSession?.sessionStart || now,
    isValid: true,
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    console.log("Session saved for user:", user.uid, {
      sessionAge: existingSession
        ? Math.round(
            (now - (existingSession.sessionStart || now)) /
              (24 * 60 * 60 * 1000)
          )
        : 0,
      isNewSession: !existingSession,
    });
  } catch (error) {
    console.error("Error saving session:", error);
  }
};

/**
 * Get stored session data from localStorage
 */
export const getStoredSession = (): SessionData | null => {
  try {
    const sessionJson = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionJson) {
      console.log("No stored session found");
      return null;
    }

    const sessionData: SessionData = JSON.parse(sessionJson);
    console.log("Retrieved stored session:", {
      userId: sessionData.userId,
      email: sessionData.email,
      sessionAge: Math.round(
        (Date.now() - sessionData.sessionStart) / (24 * 60 * 60 * 1000)
      ),
      lastActivityAge: Math.round(
        (Date.now() - sessionData.lastLogin) / (24 * 60 * 60 * 1000)
      ),
      isValid: sessionData.isValid,
    });
    return sessionData;
  } catch (error) {
    console.error("Error parsing stored session:", error);
    clearSession();
    return null;
  }
};

/**
 * Check if the stored session is still valid (within 7 days)
 */
export const isSessionValid = (sessionData?: SessionData | null): boolean => {
  if (!sessionData) {
    sessionData = getStoredSession();
  }

  if (!sessionData) {
    console.log("No session data to validate");
    return false;
  }

  const currentTime = Date.now();
  const sessionAge = currentTime - sessionData.sessionStart;
  const lastActivityAge = currentTime - sessionData.lastLogin;

  // Session is valid if:
  // 1. It's marked as valid
  // 2. It's within the 7-day duration from session start OR last activity
  // 3. Changed logic: Either session age OR last activity age should be within 7 days (more lenient)
  const isValidByAge =
    sessionAge <= SESSION_DURATION || lastActivityAge <= SESSION_DURATION;
  const isValid = sessionData.isValid && isValidByAge;

  console.log("Session validation:", {
    sessionAgeDays: Math.round(sessionAge / (24 * 60 * 60 * 1000)),
    lastActivityDays: Math.round(lastActivityAge / (24 * 60 * 60 * 1000)),
    maxDays: 7,
    isValidByAge,
    isMarkedValid: sessionData.isValid,
    finalResult: isValid,
  });

  if (!isValid) {
    console.log("Session expired or invalid - clearing");
    clearSession();
  }

  return isValid;
};

/**
 * Check if session is approaching expiration (within 1 day)
 */
export const isSessionNearExpiry = (): boolean => {
  const sessionData = getStoredSession();
  if (!sessionData || !isSessionValid(sessionData)) return false;

  const currentTime = Date.now();
  const sessionAge = currentTime - sessionData.sessionStart;
  const timeRemaining = SESSION_DURATION - sessionAge;

  return timeRemaining <= SESSION_WARNING_THRESHOLD;
};

/**
 * Update the last login time to extend the session
 */
export const refreshSession = (user?: User): void => {
  const currentSession = getStoredSession();

  if (currentSession && isSessionValid(currentSession)) {
    currentSession.lastLogin = Date.now();

    // If user is provided, update user info in case it changed
    if (user) {
      currentSession.email = user.email || currentSession.email;
      currentSession.displayName =
        user.displayName || currentSession.displayName;
      currentSession.photoURL = user.photoURL || currentSession.photoURL;
    }

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentSession));
      console.log("Session refreshed for user:", currentSession.userId);
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  }
};

/**
 * Extend session by resetting the start time (when user performs significant activity)
 */
export const extendSession = (user?: User): void => {
  const currentSession = getStoredSession();

  if (currentSession && isSessionValid(currentSession)) {
    // Reset session start time to extend the full 7-day period
    currentSession.sessionStart = Date.now();
    currentSession.lastLogin = Date.now();

    if (user) {
      currentSession.email = user.email || currentSession.email;
      currentSession.displayName =
        user.displayName || currentSession.displayName;
      currentSession.photoURL = user.photoURL || currentSession.photoURL;
    }

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentSession));
      console.log("Session extended for user:", currentSession.userId);
    } catch (error) {
      console.error("Error extending session:", error);
    }
  }
};

/**
 * Clear the stored session
 */
export const clearSession = (): void => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    console.log("Session cleared");
  } catch (error) {
    console.error("Error clearing session:", error);
  }
};

/**
 * Get session time remaining in days
 */
export const getSessionTimeRemaining = (): number => {
  const sessionData = getStoredSession();
  if (!sessionData || !isSessionValid(sessionData)) return 0;

  const currentTime = Date.now();
  const sessionAge = currentTime - sessionData.sessionStart;
  const remainingTime = SESSION_DURATION - sessionAge;

  return Math.max(0, Math.floor(remainingTime / (24 * 60 * 60 * 1000)));
};

/**
 * Get session time remaining in hours
 */
export const getSessionTimeRemainingHours = (): number => {
  const sessionData = getStoredSession();
  if (!sessionData || !isSessionValid(sessionData)) return 0;

  const currentTime = Date.now();
  const sessionAge = currentTime - sessionData.sessionStart;
  const remainingTime = SESSION_DURATION - sessionAge;

  return Math.max(0, Math.floor(remainingTime / (60 * 60 * 1000)));
};

/**
 * Check if user should be automatically signed in based on stored session
 */
export const shouldAutoSignIn = (): boolean => {
  const sessionData = getStoredSession();
  const shouldSignIn = sessionData !== null && isSessionValid(sessionData);

  console.log("Should auto sign-in check:", {
    hasSessionData: !!sessionData,
    isSessionValid: sessionData ? isSessionValid(sessionData) : false,
    shouldSignIn,
  });

  return shouldSignIn;
};

/**
 * Get session info for debugging/display purposes
 */
export const getSessionInfo = () => {
  const sessionData = getStoredSession();
  if (!sessionData) return null;

  const currentTime = Date.now();
  const sessionAge = Math.floor(
    (currentTime - sessionData.sessionStart) / (24 * 60 * 60 * 1000)
  );
  const lastActivityAge = Math.floor(
    (currentTime - sessionData.lastLogin) / (24 * 60 * 60 * 1000)
  );
  const daysRemaining = getSessionTimeRemaining();
  const hoursRemaining = getSessionTimeRemainingHours();

  return {
    userId: sessionData.userId,
    email: sessionData.email,
    sessionAgeInDays: sessionAge,
    lastActivityDays: lastActivityAge,
    daysRemaining,
    hoursRemaining,
    isValid: isSessionValid(sessionData),
    isNearExpiry: isSessionNearExpiry(),
  };
};

/**
 * Debug function to check session persistence status
 * Use in browser console: window.debugSession()
 */
export const debugSessionPersistence = () => {
  console.log("=== SESSION PERSISTENCE DEBUG ===");

  // Check localStorage availability
  try {
    const testKey = "test_storage";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    console.log("✅ localStorage is available");
  } catch (error) {
    console.log("❌ localStorage is NOT available:", error);
    return;
  }

  // Check session data
  const sessionData = getStoredSession();
  if (!sessionData) {
    console.log("❌ No session data found in localStorage");
    return;
  }

  console.log("📋 Session Data:", sessionData);

  // Check session validity
  const isValid = isSessionValid(sessionData);
  console.log("🔍 Session Valid:", isValid);

  // Check auto sign-in status
  const shouldSignIn = shouldAutoSignIn();
  console.log("🔄 Should Auto Sign-in:", shouldSignIn);

  // Check session info
  const sessionInfo = getSessionInfo();
  console.log("📊 Session Info:", sessionInfo);

  // Check localStorage raw data
  const rawData = localStorage.getItem(SESSION_STORAGE_KEY);
  console.log("🗄️ Raw localStorage data:", rawData);

  console.log("=== END DEBUG ===");

  return {
    hasSession: !!sessionData,
    isValid,
    shouldSignIn,
    sessionInfo,
    rawData,
  };
};

// Expose debug function globally for easy access
if (typeof window !== "undefined") {
  (window as any).debugSession = debugSessionPersistence;
}
