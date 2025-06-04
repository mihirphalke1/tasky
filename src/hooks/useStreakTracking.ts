import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { updateDailyStatsForDate } from "@/lib/streakService";
import { format } from "date-fns";

export const useStreakTracking = () => {
  const { user } = useAuth();
  const lastUpdateRef = useRef<string>("");

  useEffect(() => {
    if (!user?.uid) return;

    const updateTodaysStats = async () => {
      const today = format(new Date(), "yyyy-MM-dd");

      // Only update once per day to avoid excessive calls
      if (lastUpdateRef.current === today) return;

      try {
        console.log("Updating daily stats for:", user.uid, today);
        await updateDailyStatsForDate(user.uid, today);
        lastUpdateRef.current = today;
        console.log("Successfully updated daily stats");
      } catch (error) {
        console.warn("Failed to update daily stats:", error);
      }
    };

    // Delay initial update to ensure authentication is complete
    const timeout = setTimeout(() => {
      updateTodaysStats();
    }, 2000); // 2 second delay

    // Set up interval to check for day changes (every 5 minutes)
    const interval = setInterval(() => {
      const today = format(new Date(), "yyyy-MM-dd");
      if (lastUpdateRef.current !== today) {
        updateTodaysStats();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [user?.uid]);
};

export default useStreakTracking;
