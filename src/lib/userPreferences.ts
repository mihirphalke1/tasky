import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { db } from "./firebase";
import { initializeDefaultInsightRules } from "./insightsService";
import { logger } from "./logger";

export interface UserPreferences {
  dashboardMode: "adaptive" | "traditional";
  smartInputDefault: boolean;
  hasCompletedOnboarding: boolean;
  theme: "light" | "dark" | "system";
  lastLoginDate: string;
  createdAt: Date;
  lastUpdated: Date;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  dashboardMode: "adaptive",
  smartInputDefault: true,
  hasCompletedOnboarding: false,
  theme: "system",
  lastLoginDate: "",
  createdAt: new Date(),
  lastUpdated: new Date(),
};

// Local storage keys
const STORAGE_KEYS = {
  DASHBOARD_MODE: "tasky_dashboard_mode",
  SMART_INPUT: "tasky_smart_input_default",
  ONBOARDING_COMPLETED: "tasky_onboarding_completed",
  THEME: "tasky_theme_preference",
} as const;

/**
 * Get user preferences from Firestore or localStorage fallback
 */
export const getUserPreferences = async (
  userId: string
): Promise<UserPreferences> => {
  if (!userId) {
    // Return preferences from localStorage for anonymous users
    return getLocalPreferences();
  }

  try {
    const prefsRef = doc(db, "userPreferences", userId);
    const prefsDoc = await getDoc(prefsRef);

    if (prefsDoc.exists()) {
      const data = prefsDoc.data();
      return {
        dashboardMode: data.dashboardMode || DEFAULT_PREFERENCES.dashboardMode,
        smartInputDefault:
          data.smartInputDefault !== undefined
            ? data.smartInputDefault
            : DEFAULT_PREFERENCES.smartInputDefault,
        hasCompletedOnboarding:
          data.hasCompletedOnboarding !== undefined
            ? data.hasCompletedOnboarding
            : DEFAULT_PREFERENCES.hasCompletedOnboarding,
        theme: data.theme || DEFAULT_PREFERENCES.theme,
        lastLoginDate: data.lastLoginDate || DEFAULT_PREFERENCES.lastLoginDate,
        createdAt: data.createdAt?.toDate() || DEFAULT_PREFERENCES.createdAt,
        lastUpdated:
          data.lastUpdated?.toDate() || DEFAULT_PREFERENCES.lastUpdated,
      };
    } else {
      // First time user - create default preferences and initialize insights
      const newPrefs = {
        ...DEFAULT_PREFERENCES,
        lastLoginDate: new Date().toISOString(),
      };
      await saveUserPreferences(userId, newPrefs);

      // Initialize insight rules for new user
      try {
        await initializeDefaultInsightRules(userId);
        logger.log("Initialized insight rules for new user:", userId);
      } catch (error) {
        logger.warn("Failed to initialize insight rules for new user:", error);
      }

      return newPrefs;
    }
  } catch (error) {
    logger.error("Error getting user preferences:", error);
    // Fallback to localStorage
    return getLocalPreferences();
  }
};

/**
 * Save user preferences to Firestore and localStorage
 */
export const saveUserPreferences = async (
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> => {
  const updatedPrefs = {
    ...preferences,
    lastUpdated: new Date(),
  };

  // Save to localStorage for immediate access
  if (preferences.dashboardMode) {
    localStorage.setItem(
      STORAGE_KEYS.DASHBOARD_MODE,
      preferences.dashboardMode
    );
  }
  if (preferences.smartInputDefault !== undefined) {
    localStorage.setItem(
      STORAGE_KEYS.SMART_INPUT,
      String(preferences.smartInputDefault)
    );
  }
  if (preferences.hasCompletedOnboarding !== undefined) {
    localStorage.setItem(
      STORAGE_KEYS.ONBOARDING_COMPLETED,
      String(preferences.hasCompletedOnboarding)
    );
  }
  if (preferences.theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, preferences.theme);
  }

  if (!userId) {
    return; // Don't save to Firestore for anonymous users
  }

  try {
    const prefsRef = doc(db, "userPreferences", userId);
    await setDoc(prefsRef, updatedPrefs, { merge: true });
  } catch (error) {
    logger.error("Error saving user preferences:", error);
    // Preferences are already saved to localStorage, so this is not critical
  }
};

/**
 * Get preferences from localStorage only
 */
export const getLocalPreferences = (): UserPreferences => {
  return {
    dashboardMode:
      (localStorage.getItem(STORAGE_KEYS.DASHBOARD_MODE) as
        | "adaptive"
        | "traditional") || DEFAULT_PREFERENCES.dashboardMode,
    smartInputDefault:
      localStorage.getItem(STORAGE_KEYS.SMART_INPUT) !== "false", // Default to true
    hasCompletedOnboarding:
      localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === "true",
    theme:
      (localStorage.getItem(STORAGE_KEYS.THEME) as
        | "light"
        | "dark"
        | "system") || DEFAULT_PREFERENCES.theme,
    lastLoginDate: DEFAULT_PREFERENCES.lastLoginDate,
    createdAt: DEFAULT_PREFERENCES.createdAt,
    lastUpdated: DEFAULT_PREFERENCES.lastUpdated,
  };
};

/**
 * Check if user is new (hasn't completed onboarding)
 */
export const isNewUser = async (userId: string): Promise<boolean> => {
  if (!userId) {
    return !localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
  }

  try {
    const preferences = await getUserPreferences(userId);
    return !preferences.hasCompletedOnboarding;
  } catch (error) {
    logger.error("Error checking if user is new:", error);
    return true; // Assume new user on error
  }
};

/**
 * Mark onboarding as completed
 */
export const completeOnboarding = async (
  userId: string,
  dashboardMode: "adaptive" | "traditional"
): Promise<void> => {
  const preferences: Partial<UserPreferences> = {
    hasCompletedOnboarding: true,
    dashboardMode,
    lastLoginDate: new Date().toISOString(),
  };

  await saveUserPreferences(userId, preferences);
};

/**
 * Update dashboard mode preference
 */
export const updateDashboardMode = async (
  userId: string,
  mode: "adaptive" | "traditional"
): Promise<void> => {
  await saveUserPreferences(userId, { dashboardMode: mode });
};

/**
 * Update smart input default preference
 */
export const updateSmartInputDefault = async (
  userId: string,
  enabled: boolean
): Promise<void> => {
  await saveUserPreferences(userId, { smartInputDefault: enabled });
};

/**
 * Update theme preference
 */
export const updateThemePreference = async (
  userId: string,
  theme: "light" | "dark" | "system"
): Promise<void> => {
  await saveUserPreferences(userId, { theme });
};

/**
 * Get dashboard mode preference quickly from localStorage
 */
export const getDashboardModeFromStorage = (): "adaptive" | "traditional" => {
  return (
    (localStorage.getItem(STORAGE_KEYS.DASHBOARD_MODE) as
      | "adaptive"
      | "traditional") || "adaptive"
  );
};

/**
 * Check if onboarding is completed quickly from localStorage
 */
export const isOnboardingCompletedFromStorage = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === "true";
};
