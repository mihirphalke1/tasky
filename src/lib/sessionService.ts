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
  const sessionData: SessionData = {
    userId: user.uid,
    email: user.email || "",
    displayName: user.displayName,
    photoURL: user.photoURL,
    lastLogin: Date.now(),
    sessionStart: Date.now(),
    isValid: true,
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    console.log("Session saved for user:", user.uid);
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
    if (!sessionJson) return null;

    const sessionData: SessionData = JSON.parse(sessionJson);
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

  if (!sessionData) return false;

  const currentTime = Date.now();
  const sessionAge = currentTime - sessionData.sessionStart;
  const lastActivityAge = currentTime - sessionData.lastLogin;

  // Session is valid if:
  // 1. It's marked as valid
  // 2. It's within the 7-day duration
  // 3. Last activity was within 7 days
  const isValid =
    sessionData.isValid &&
    sessionAge <= SESSION_DURATION &&
    lastActivityAge <= SESSION_DURATION;

  if (!isValid) {
    console.log("Session expired or invalid:", {
      sessionAge: Math.round(sessionAge / (24 * 60 * 60 * 1000)),
      lastActivityAge: Math.round(lastActivityAge / (24 * 60 * 60 * 1000)),
      maxDays: 7,
    });
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
  return sessionData !== null && isSessionValid(sessionData);
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
