import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flame, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  getStreakData,
  debugStreakCalculation,
  recalculateStreakFromHistory,
} from "@/lib/streakService";
import { StreakData } from "@/types";
import StreakCalendar from "./StreakCalendar";
import { cn } from "@/lib/utils";

interface StreakButtonProps {
  className?: string;
}

export interface StreakButtonRef {
  openCalendar: () => void;
}

const StreakButton = forwardRef<StreakButtonRef, StreakButtonProps>(
  ({ className }, ref) => {
    const { user } = useAuth();
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Expose the openCalendar function to parent components
    useImperativeHandle(ref, () => ({
      openCalendar: handleCalendarOpen,
    }));

    // Add debug functions to window object for console access
    useEffect(() => {
      if (user?.uid) {
        (window as any).debugStreakCalculation = () =>
          debugStreakCalculation(user.uid);
        (window as any).recalculateStreakFromHistory = () =>
          recalculateStreakFromHistory(user.uid).then(() => {
            loadStreakData(); // Reload after recalculation
          });

        // Add comprehensive debugging function
        (window as any).debugStreakIssue = async () => {
          console.log("=== COMPREHENSIVE STREAK DEBUG ===");

          // 1. Check current streak data
          console.log("1. Current streak data:");
          await debugStreakCalculation(user.uid);

          // 2. Force update today's stats
          console.log("2. Forcing today's stats update:");
          const today = new Date().toISOString().split("T")[0];
          try {
            const { updateDailyStatsForDate } = await import(
              "@/lib/streakService"
            );
            await updateDailyStatsForDate(user.uid, today);
            console.log("Today's stats updated successfully");
          } catch (error) {
            console.error("Error updating today's stats:", error);
          }

          // 3. Recalculate from history
          console.log("3. Recalculating streak from history:");
          await recalculateStreakFromHistory(user.uid);

          // 4. Reload UI data
          console.log("4. Reloading UI data:");
          loadStreakData();

          console.log("=== DEBUG COMPLETE - Check the streak count now ===");
        };

        // Add function to manually set streak count for testing
        (window as any).setTestStreak = async (count: number) => {
          console.log(`Setting test streak to ${count}`);
          try {
            const { updateDoc, doc, Timestamp } = await import(
              "firebase/firestore"
            );
            const { db } = await import("@/lib/firebase");

            const streakRef = doc(db, "streakData", user.uid);
            await updateDoc(streakRef, {
              currentStreak: count,
              lastUpdated: Timestamp.fromDate(new Date()),
            });

            loadStreakData();
            console.log(`Streak set to ${count} successfully`);
          } catch (error) {
            console.error("Error setting test streak:", error);
          }
        };
      }
    }, [user?.uid]);

    const loadStreakData = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        setStreakData(null);
        return;
      }

      try {
        console.log("Loading streak data for user:", user.uid);
        setError(null);
        const data = await getStreakData(user.uid);
        setStreakData(data);
        console.log("Loaded streak data:", data);
      } catch (error) {
        console.error("Error loading streak data:", error);
        setError(error.message || "Failed to load streak data");
        // Set default streak data to prevent blank display
        setStreakData({
          id: user.uid,
          userId: user.uid,
          currentStreak: 0,
          longestStreak: 0,
          totalDaysActive: 0,
          lastActiveDate: "",
          streakThreshold: 50,
          lastUpdated: new Date(),
          streakHistory: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      // Always load data when user changes, but without delay to prevent blank states
      if (user?.uid) {
        loadStreakData();
      } else {
        setIsLoading(false);
        setStreakData(null);
      }
    }, [user?.uid]);

    // Reload streak data when calendar opens
    const handleCalendarOpen = () => {
      setIsCalendarOpen(true);
      if (user?.uid && !isLoading) {
        loadStreakData(); // Refresh data when opening calendar
      }
    };

    // Always render the button when there's a user, even during loading
    if (!user?.uid) return null;

    const getStreakDisplay = () => {
      if (isLoading) return "0"; // Show 0 instead of ... to prevent layout shift
      if (error && !streakData) return "0";
      return (streakData?.currentStreak || 0).toString();
    };

    const getStreakColor = () => {
      if (isLoading) return "text-gray-500";
      if (error && !streakData) return "text-gray-500";

      const streak = streakData?.currentStreak || 0;
      if (streak >= 30) return "text-purple-500";
      if (streak >= 14) return "text-blue-500";
      if (streak >= 7) return "text-green-500";
      if (streak >= 3) return "text-yellow-500";
      if (streak >= 1) return "text-orange-500";
      return "text-gray-500";
    };

    const getStreakMessage = () => {
      if (isLoading) return "Loading your productivity streak...";
      if (error && !streakData) return "Click to start tracking your streak!";

      const streak = streakData?.currentStreak || 0;
      if (streak === 0)
        return "Start your streak today! Complete 50% of your tasks.";
      if (streak === 1) return "Great start! Keep going!";
      if (streak < 7) return `${streak} day streak! Building momentum!`;
      if (streak < 14) return `${streak} day streak! You're on fire! 🔥`;
      if (streak < 30) return `${streak} day streak! Incredible consistency!`;
      return `${streak} day streak! You're a productivity legend! 🏆`;
    };

    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCalendarOpen}
                className={cn(
                  "text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 dark:hover:bg-[#CDA351]/10 transition-all duration-300 transform hover:scale-105 active:scale-95 relative group shadow-sm hover:shadow-md",
                  "border border-transparent hover:border-[#CDA351]/20",
                  streakData &&
                    streakData.currentStreak > 0 &&
                    "ring-1 ring-[#CDA351]/10",
                  className
                )}
              >
                <div className="flex items-center space-x-2">
                  <Flame
                    className={cn(
                      "w-4 h-4 transition-all duration-300 group-hover:scale-110",
                      getStreakColor()
                    )}
                  />
                  <span className="font-medium">
                    <span className="hidden sm:inline">Streak:</span>
                    <span
                      className={cn(
                        "ml-1 font-semibold transition-all duration-300",
                        getStreakColor(),
                        streakData &&
                          streakData.currentStreak > 0 &&
                          "drop-shadow-sm"
                      )}
                    >
                      {getStreakDisplay()}
                    </span>
                  </span>
                </div>

                {/* Streak milestone badge - Enhanced styling */}
                {!isLoading && streakData && streakData.currentStreak > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "absolute -top-2 -right-2 h-6 w-6 p-0 text-xs font-bold border-2 border-white dark:border-gray-900 transform transition-all duration-300 hover:scale-110",
                      streakData.currentStreak >= 30
                        ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white"
                        : streakData.currentStreak >= 14
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                        : streakData.currentStreak >= 7
                        ? "bg-gradient-to-br from-green-500 to-green-600 text-white"
                        : streakData.currentStreak >= 3
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white"
                        : "bg-gradient-to-br from-orange-400 to-orange-500 text-white"
                    )}
                  >
                    <span className="drop-shadow-sm">
                      {streakData.currentStreak >= 30
                        ? "🏆"
                        : streakData.currentStreak >= 14
                        ? "💎"
                        : streakData.currentStreak >= 7
                        ? "🔥"
                        : streakData.currentStreak >= 3
                        ? "⚡"
                        : "✨"}
                    </span>
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Flame className={cn("w-4 h-4", getStreakColor())} />
                  <span className="font-semibold">{getStreakMessage()}</span>
                </div>

                {!isLoading && streakData && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Best streak:</span>
                      <span className="flex items-center space-x-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>{streakData.longestStreak} days</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total active days:</span>
                      <span>{streakData.totalDaysActive}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-[#CDA351] font-medium">
                        Click to view calendar (or press S)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <StreakCalendar
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
        />
      </>
    );
  }
);

StreakButton.displayName = "StreakButton";

export default StreakButton;
