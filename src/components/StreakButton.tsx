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
  createTestStreakData,
  verifyStreakCalculation,
} from "@/lib/streakService";
import { StreakData } from "@/types";
import StreakCalendar from "./StreakCalendar";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface StreakButtonProps {
  className?: string;
  variant?: "navbar" | "hamburger"; // Add variant prop for different contexts
}

export interface StreakButtonRef {
  openCalendar: () => void;
}

const StreakButton = forwardRef<StreakButtonRef, StreakButtonProps>(
  ({ className, variant = "navbar" }, ref) => {
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

        // Add function to check specific dates
        (window as any).checkDateStats = async (dateString: string) => {
          try {
            const { getDailyStats } = await import("@/lib/streakService");
            const stats = await getDailyStats(user.uid, dateString);
            console.log(`Stats for ${dateString}:`, stats);
            return stats;
          } catch (error) {
            console.error("Error checking date stats:", error);
          }
        };

        // Add function to check recent days
        (window as any).checkRecentDays = async () => {
          try {
            const { getDailyStatsRange } = await import("@/lib/streakService");
            const endDate = new Date().toISOString().split("T")[0];
            const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0];
            const stats = await getDailyStatsRange(
              user.uid,
              startDate,
              endDate
            );
            console.log("Recent 7 days stats:", stats);
            stats.forEach((stat) => {
              console.log(
                `${stat.date}: ${stat.streakDay ? "🔥" : "❌"} - ${
                  stat.completionPercentage
                }% (${stat.tasksCompleted}/${stat.tasksAssigned} tasks, ${
                  stat.focusTimeMinutes
                }min focus)`
              );
            });
            return stats;
          } catch (error) {
            console.error("Error checking recent days:", error);
          }
        };

        // Add function to manually set streak count for testing
        (window as any).setTestStreak = async (count: number) => {
          console.log(`Setting test streak to ${count}`);
          try {
            const { updateDoc, doc, Timestamp } = await import(
              "firebase/firestore"
            );

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

        // Add recalculation function
        (window as any).recalculateStreak = async () => {
          try {
            console.log("Recalculating streak from history...");
            await recalculateStreakFromHistory(user.uid);
            loadStreakData();
            console.log("Streak recalculated successfully!");
          } catch (error) {
            console.error("Error recalculating streak:", error);
          }
        };

        // Add test data creation function
        (window as any).createTestStreakData = async () => {
          try {
            console.log("Creating test streak data...");
            await createTestStreakData(user.uid);
            loadStreakData();
            console.log("Test streak data created successfully!");
          } catch (error) {
            console.error("Error creating test streak data:", error);
          }
        };

        // Add streak verification function
        (window as any).verifyStreakCalculation = async () => {
          try {
            console.log("Verifying streak calculation...");
            await verifyStreakCalculation(user.uid);
            console.log("Streak verification complete!");
          } catch (error) {
            console.error("Error verifying streak calculation:", error);
          }
        };
      }
    }, [user?.uid]);

    // Real-time Firestore subscription for instant streak updates
    useEffect(() => {
      if (!user?.uid) return;
      const streakRef = doc(db, "streakData", user.uid);
      setIsLoading(true);
      const unsubscribe = onSnapshot(
        streakRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setStreakData({
              id: snapshot.id,
              userId: data.userId,
              currentStreak: data.currentStreak || 0,
              longestStreak: data.longestStreak || 0,
              totalDaysActive: data.totalDaysActive || 0,
              lastActiveDate: data.lastActiveDate || "",
              streakThreshold: data.streakThreshold || 50,
              lastUpdated: data.lastUpdated?.toDate() || new Date(),
              streakHistory: data.streakHistory || [],
            });
            setIsLoading(false);
          } else {
            setStreakData(null);
            setIsLoading(false);
          }
        },
        (err) => {
          setError(err.message || "Failed to load streak data");
          setIsLoading(false);
        }
      );
      return () => unsubscribe();
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
      if (isLoading) return "0";
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

    // Get enhanced styling for hamburger menu
    const getHamburgerStyles = () => {
      if (variant !== "hamburger") return {};

      const streak = streakData?.currentStreak || 0;
      const baseStyles = "w-full justify-start h-12 px-4 py-3";

      if (streak >= 7) {
        return {
          className: cn(
            baseStyles,
            "bg-gradient-to-r from-[#CDA351]/10 to-[#CDA351]/5",
            "border border-[#CDA351]/20",
            "text-[#1A1A1A] dark:text-white",
            "hover:from-[#CDA351]/20 hover:to-[#CDA351]/10",
            "hover:border-[#CDA351]/30",
            "shadow-sm hover:shadow-md",
            "font-medium"
          ),
          priority: true,
        };
      } else if (streak >= 3) {
        return {
          className: cn(
            baseStyles,
            "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10",
            "border border-amber-200/50 dark:border-amber-700/50",
            "text-[#1A1A1A] dark:text-white",
            "hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/20 dark:hover:to-orange-900/20",
            "font-medium"
          ),
          priority: false,
        };
      }

      return {
        className: cn(
          baseStyles,
          "text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10"
        ),
        priority: false,
      };
    };

    const hamburgerStyles = getHamburgerStyles();
    const isHamburgerVariant = variant === "hamburger";

    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isHamburgerVariant ? "default" : "sm"}
                onClick={handleCalendarOpen}
                className={cn(
                  // Base styles for navbar variant
                  !isHamburgerVariant &&
                    "text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 dark:hover:bg-[#CDA351]/10 transition-all duration-300 transform hover:scale-105 active:scale-95 relative group shadow-sm hover:shadow-md border border-transparent hover:border-[#CDA351]/20 h-8 sm:h-9 md:h-10 px-2 sm:px-3 md:px-4",

                  // Enhanced styles for hamburger variant
                  isHamburgerVariant && hamburgerStyles.className,

                  // Common styles
                  "relative group transition-all duration-300",

                  // Ring for active streaks (both variants)
                  streakData &&
                    streakData.currentStreak > 0 &&
                    !isHamburgerVariant &&
                    "ring-1 ring-[#CDA351]/10",

                  className
                )}
              >
                <div
                  className={cn(
                    "flex items-center",
                    isHamburgerVariant ? "space-x-3" : "space-x-1 sm:space-x-2"
                  )}
                >
                  <Flame
                    className={cn(
                      isHamburgerVariant ? "w-5 h-5" : "w-3 h-3 sm:w-4 sm:h-4",
                      "transition-all duration-300 group-hover:scale-110",
                      getStreakColor()
                    )}
                  />
                  <div className="flex flex-col items-start">
                    <span
                      className={cn(
                        "font-medium",
                        isHamburgerVariant ? "text-sm" : "text-xs sm:text-sm"
                      )}
                    >
                      {isHamburgerVariant ? (
                        <span>Productivity Streak</span>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Streak:</span>
                          <span
                            className={cn(
                              "ml-0 sm:ml-1 font-semibold transition-all duration-300 text-xs sm:text-sm",
                              getStreakColor(),
                              streakData &&
                                streakData.currentStreak > 0 &&
                                "drop-shadow-sm"
                            )}
                          >
                            {getStreakDisplay()}
                          </span>
                        </>
                      )}
                    </span>
                    {isHamburgerVariant && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={cn("text-lg font-bold", getStreakColor())}
                        >
                          {streakData && streakData.currentStreak >= 30
                            ? "🏆"
                            : streakData && streakData.currentStreak >= 14
                            ? "💎"
                            : streakData && streakData.currentStreak >= 7
                            ? "🔥"
                            : streakData && streakData.currentStreak >= 3
                            ? "⚡"
                            : "🔥"}{" "}
                          {getStreakDisplay()} days
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Milestone badge for navbar variant only */}
                {!isLoading &&
                  !isHamburgerVariant &&
                  streakData &&
                  streakData.currentStreak > 0 && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "absolute -top-1 sm:-top-2 -right-1 sm:-right-2 h-4 w-4 sm:h-6 sm:w-6 p-0 text-xs font-bold border-2 border-white dark:border-gray-900 transform transition-all duration-300 hover:scale-110",
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
                      <span className="drop-shadow-sm text-xs">
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

                {/* Progress indicator for hamburger variant */}
                {isHamburgerVariant && streakData && (
                  <div className="ml-auto flex flex-col items-end gap-1">
                    {streakData.currentStreak > 0 && (
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#CDA351] to-[#E6C17A] animate-pulse"></div>
                    )}
                  </div>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side={isHamburgerVariant ? "left" : "bottom"}
              className="max-w-xs sm:max-w-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Flame
                    className={cn("w-3 h-3 sm:w-4 sm:h-4", getStreakColor())}
                  />
                  <span className="font-semibold text-xs sm:text-sm">
                    {getStreakMessage()}
                  </span>
                </div>

                {!isLoading && streakData && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Best streak:</span>
                      <span className="flex items-center space-x-1">
                        <TrendingUp className="w-2 h-2 sm:w-3 sm:h-3" />
                        <span>{streakData.longestStreak} days</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total active days:</span>
                      <span>{streakData.totalDaysActive}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-[#CDA351] font-medium text-xs">
                        <span className="hidden sm:inline">
                          Click to view calendar (or press S)
                        </span>
                        <span className="sm:hidden">Tap to view calendar</span>
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
