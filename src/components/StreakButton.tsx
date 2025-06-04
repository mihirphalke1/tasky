import React, { useState, useEffect } from "react";
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
import { getStreakData, createSampleStreakData } from "@/lib/streakService";
import { StreakData } from "@/types";
import StreakCalendar from "./StreakCalendar";
import { cn } from "@/lib/utils";

interface StreakButtonProps {
  className?: string;
}

const StreakButton: React.FC<StreakButtonProps> = ({ className }) => {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStreakData = async () => {
    if (!user?.uid) {
      setIsLoading(false);
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
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Debug function to create sample data
  const createSampleData = async () => {
    if (!user?.uid) return;

    try {
      console.log("Creating sample streak data...");
      await createSampleStreakData(user.uid);
      console.log("Sample data created, reloading...");
      await loadStreakData();
    } catch (error) {
      console.error("Error creating sample data:", error);
    }
  };

  // Make the function available globally for testing
  useEffect(() => {
    if (user?.uid) {
      (window as any).createSampleStreakData = () => createSampleData();
      (window as any).reloadStreakData = () => loadStreakData();
    }
  }, [user?.uid]);

  useEffect(() => {
    // Delay loading to ensure user is authenticated
    const timeout = setTimeout(() => {
      loadStreakData();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [user?.uid]);

  // Reload streak data when calendar opens
  const handleCalendarOpen = () => {
    setIsCalendarOpen(true);
    loadStreakData(); // Refresh data when opening calendar
  };

  if (!user) return null;

  const getStreakDisplay = () => {
    if (isLoading) return "...";
    if (error) return "!";
    if (!streakData) return "0";
    return streakData.currentStreak.toString();
  };

  const getStreakColor = () => {
    if (isLoading) return "text-gray-500";
    if (error) return "text-red-500";
    if (!streakData) return "text-gray-500";

    const streak = streakData.currentStreak;
    if (streak >= 30) return "text-purple-500";
    if (streak >= 14) return "text-blue-500";
    if (streak >= 7) return "text-green-500";
    if (streak >= 3) return "text-yellow-500";
    if (streak >= 1) return "text-orange-500";
    return "text-gray-500";
  };

  const getStreakMessage = () => {
    if (isLoading) return "Loading streak data...";
    if (error) return `Error: ${error}`;
    if (!streakData) return "Loading...";

    const streak = streakData.currentStreak;
    if (streak === 0) return "Start your streak today!";
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
                "text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 dark:hover:bg-[#CDA351]/10 transition-all duration-200 transform hover:scale-105 active:scale-95 relative",
                className
              )}
            >
              <div className="flex items-center space-x-2">
                <Flame className={cn("w-4 h-4", getStreakColor())} />
                <span className="font-medium">
                  <span className="hidden sm:inline">Streak:</span>
                  <span className={cn("ml-1 font-semibold", getStreakColor())}>
                    {getStreakDisplay()}
                  </span>
                </span>
              </div>

              {/* Streak milestone badge */}
              {!isLoading &&
                !error &&
                streakData &&
                streakData.currentStreak > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "absolute -top-1 -right-1 h-5 w-5 p-0 text-xs border-2 border-white dark:border-gray-900",
                      streakData.currentStreak >= 30
                        ? "bg-purple-500 text-white"
                        : streakData.currentStreak >= 14
                        ? "bg-blue-500 text-white"
                        : streakData.currentStreak >= 7
                        ? "bg-green-500 text-white"
                        : streakData.currentStreak >= 3
                        ? "bg-yellow-500 text-white"
                        : "bg-orange-500 text-white"
                    )}
                  >
                    {streakData.currentStreak >= 30
                      ? "🏆"
                      : streakData.currentStreak >= 14
                      ? "💎"
                      : streakData.currentStreak >= 7
                      ? "🔥"
                      : streakData.currentStreak >= 3
                      ? "⚡"
                      : "✨"}
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

              {!isLoading && !error && streakData && (
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
                      Click to view detailed calendar
                    </span>
                  </div>
                </div>
              )}

              {/* Debug button for development */}
              {process.env.NODE_ENV === "development" && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={createSampleData}
                    className="w-full text-xs"
                  >
                    Create Sample Data
                  </Button>
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
};

export default StreakButton;
