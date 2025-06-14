import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  Target,
  CheckCircle2,
  Timer,
  Zap,
  Calendar,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getMonthlyStreakView,
  getStreakData,
  getDailyStats,
} from "@/lib/streakService";
import { MonthlyStreakView, StreakData, DailyStats } from "@/types";
import { cn } from "@/lib/utils";

interface StreakCalendarProps {
  isOpen: boolean;
  onClose: () => void;
}

const StreakCalendar: React.FC<StreakCalendarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyStreakView | null>(
    null
  );
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [selectedDayStats, setSelectedDayStats] = useState<DailyStats | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);

  const loadData = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const [monthData, userStreakData] = await Promise.all([
        getMonthlyStreakView(user.uid, year, month),
        getStreakData(user.uid),
      ]);

      setMonthlyData(monthData);
      setStreakData(userStreakData);
    } catch (error) {
      console.error("Error loading streak data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, currentDate, user?.uid]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(
      direction === "prev"
        ? subMonths(currentDate, 1)
        : addMonths(currentDate, 1)
    );
    setShowDayDetail(false);
  };

  const handleDayClick = async (date: string, stats: DailyStats | null) => {
    if (!user?.uid || !stats) return;

    console.log("Day clicked:", date, stats);
    setSelectedDate(date);
    setSelectedDayStats(stats);
    setShowDayDetail(true);
  };

  const handleTaskClick = (taskId: string) => {
    console.log("Task clicked:", taskId);
    navigate(`/task/${taskId}`);
  };

  const handleBackToCalendar = () => {
    setShowDayDetail(false);
    setSelectedDayStats(null);
    setSelectedDate(null);
  };

  // Custom dialog close handler
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (showDayDetail) {
        // If trying to close while in day detail view, go back to calendar instead
        handleBackToCalendar();
        return; // Don't close the dialog
      } else {
        // If in main calendar view, allow closing
        onClose();
      }
    }
  };

  // Handle escape key to go back to calendar if in day detail view
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && showDayDetail) {
        // Prevent the default dialog escape behavior
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        handleBackToCalendar();
      }
    };

    if (isOpen && showDayDetail) {
      // Use capturing phase to intercept before the dialog
      document.addEventListener("keydown", handleEscape, { capture: true });
    }

    return () => {
      document.removeEventListener("keydown", handleEscape, { capture: true });
    };
  }, [isOpen, showDayDetail]);

  const formatFocusTime = (minutes: number): string => {
    if (minutes === 0) return "0 min";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getStreakColor = (
    isStreakDay: boolean,
    completionPercentage: number
  ) => {
    if (!isStreakDay) {
      return "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:from-gray-100 hover:to-gray-150 dark:hover:from-gray-700 dark:hover:to-gray-600";
    }

    if (completionPercentage >= 90) {
      return "bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 shadow-green-200 dark:shadow-green-900/30";
    }
    if (completionPercentage >= 70) {
      return "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 shadow-orange-200 dark:shadow-orange-900/30";
    }
    if (completionPercentage >= 50) {
      return "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-200 dark:shadow-red-900/30";
    }
    return "bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600";
  };

  const DayTooltip: React.FC<{
    date: string;
    stats: DailyStats | null;
    children: React.ReactNode;
  }> = ({ date, stats, children }) => {
    if (!stats) {
      return (
        <Popover>
          <PopoverTrigger asChild>{children}</PopoverTrigger>
          <PopoverContent className="w-64 p-3">
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              No activity on {safeFormatDate(date, "MMM d")}
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <Popover>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className="w-80 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-[#1A1A1A] dark:text-white">
                {safeFormatDate(date, "MMMM d, yyyy")}
              </h4>
              {stats.streakDay && (
                <Badge variant="default" className="bg-[#CDA351] text-white">
                  <Flame className="w-3 h-3 mr-1" />
                  Streak Day
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Progress
                </span>
                <span className="font-medium text-[#1A1A1A] dark:text-white">
                  {stats.completionPercentage}%
                </span>
              </div>
              <Progress value={stats.completionPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-[#CDA351]" />
                <div>
                  <div className="font-medium text-[#1A1A1A] dark:text-white">
                    {stats.tasksCompleted}/{stats.tasksAssigned}
                  </div>
                  <div className="text-xs text-gray-500">Tasks</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#CDA351]" />
                <div>
                  <div className="font-medium text-[#1A1A1A] dark:text-white">
                    {formatFocusTime(stats.focusTimeMinutes)}
                  </div>
                  <div className="text-xs text-gray-500">Focus Time</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Timer className="w-4 h-4 text-[#CDA351]" />
                <div>
                  <div className="font-medium text-[#1A1A1A] dark:text-white">
                    {stats.focusSessions}
                  </div>
                  <div className="text-xs text-gray-500">Sessions</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-[#CDA351]" />
                <div>
                  <div className="font-medium text-[#1A1A1A] dark:text-white">
                    {stats.pomodoroCount}
                  </div>
                  <div className="text-xs text-gray-500">Pomodoros</div>
                </div>
              </div>
            </div>

            {stats.tasksDetails.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDayClick(date, stats)}
                className="w-full mt-2 border-[#CDA351] text-[#CDA351] hover:bg-[#CDA351]/10"
              >
                View Day Details
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Utility function to safely format dates
  const safeFormatDate = (
    dateString: string,
    formatString: string,
    fallback: string = dateString
  ): string => {
    try {
      if (!dateString || typeof dateString !== "string") {
        console.warn("Invalid date string provided:", dateString);
        return fallback;
      }

      const parsedDate = parseISO(dateString);
      if (isNaN(parsedDate.getTime())) {
        console.warn("Unable to parse date:", dateString);
        return fallback;
      }

      return format(parsedDate, formatString);
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return fallback;
    }
  };

  // Utility function to safely format Date objects
  const safeFormatDateObject = (
    date: Date | undefined,
    formatString: string,
    fallback: string = "Unknown time"
  ): string => {
    try {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return fallback;
      }
      return format(date, formatString);
    } catch (error) {
      console.error("Error formatting date object:", date, error);
      return fallback;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-[#1A1A1A] dark:text-white">
            <Flame className="w-5 h-5 text-[#CDA351]" />
            <span>Productivity Streak</span>
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Track your daily productivity and maintain your streak. Complete at
            least 50% of your tasks to maintain your streak.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-6 max-h-[80vh] pb-4">
          {!showDayDetail ? (
            <>
              {/* How it works info */}

              {/* Streak Stats Header */}
              {streakData && (
                <div className="grid grid-cols-4 gap-4">
                  <Card className="border-[#CDA351]/20">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Flame className="w-5 h-5 text-[#CDA351]" />
                        <span className="text-2xl font-bold text-[#CDA351]">
                          {streakData.currentStreak}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Current Streak
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-[#CDA351]/20">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-[#CDA351]" />
                        <span className="text-2xl font-bold text-[#1A1A1A] dark:text-white">
                          {streakData.longestStreak}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Best Streak
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-[#CDA351]/20">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Calendar className="w-5 h-5 text-[#CDA351]" />
                        <span className="text-2xl font-bold text-[#1A1A1A] dark:text-white">
                          {streakData.totalDaysActive}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total Active Days
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-[#CDA351]/20">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Target className="w-5 h-5 text-[#CDA351]" />
                        <span className="text-2xl font-bold text-[#1A1A1A] dark:text-white">
                          {streakData.streakThreshold}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Streak Threshold
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Calendar Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                  className="border-[#CDA351]/20 hover:bg-[#CDA351]/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-white">
                  {format(currentDate, "MMMM yyyy")}
                </h3>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  className="border-[#CDA351]/20 hover:bg-[#CDA351]/10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="bg-gradient-to-br from-white to-[#FAF8F6] dark:from-gray-900 dark:to-gray-800 rounded-xl border border-[#CDA351]/20 p-4 shadow-sm">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-[#CDA351]/20 rounded-full"></div>
                      <div className="w-12 h-12 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Calendar Header */}
                    <div className="grid grid-cols-7 gap-2 mb-3">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (day) => (
                          <div
                            key={day}
                            className="h-8 text-center text-xs sm:text-sm font-semibold text-[#CDA351] flex items-center justify-center bg-[#CDA351]/5 rounded-lg border border-[#CDA351]/10"
                          >
                            {day}
                          </div>
                        )
                      )}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-2 auto-rows-fr">
                      {monthlyData?.daysWithData.map((day) => (
                        <DayTooltip
                          key={day.date}
                          date={day.date}
                          stats={day.stats}
                        >
                          <button
                            onClick={() =>
                              day.stats && handleDayClick(day.date, day.stats)
                            }
                            className={cn(
                              "aspect-square w-full rounded-lg relative flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-300 border-2 max-h-[60px] min-h-[40px]",
                              day.isToday
                                ? "ring-2 ring-[#CDA351] ring-offset-1 ring-offset-white dark:ring-offset-gray-900 border-[#CDA351]/50"
                                : "border-transparent",
                              day.stats
                                ? "hover:scale-105 cursor-pointer shadow-sm hover:shadow-lg hover:border-[#CDA351]/30"
                                : "text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800",
                              getStreakColor(
                                day.isStreakDay,
                                day.stats?.completionPercentage || 0
                              )
                            )}
                            disabled={!day.stats}
                          >
                            <span
                              className={cn(
                                "relative z-10",
                                day.stats && day.stats.completionPercentage > 0
                                  ? "text-white font-bold drop-shadow-sm"
                                  : "text-gray-600 dark:text-gray-400 font-medium"
                              )}
                            >
                              {day.dayOfMonth}
                            </span>

                            {/* Streak indicator - Scaled appropriately */}
                            {day.isStreakDay && (
                              <div
                                className={cn(
                                  "absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border shadow-lg",
                                  day.stats?.completionPercentage >= 90
                                    ? "bg-gradient-to-r from-[#CDA351] to-[#E6C17A] border-white"
                                    : day.stats?.completionPercentage >= 70
                                    ? "bg-gradient-to-r from-orange-400 to-orange-500 border-white"
                                    : "bg-gradient-to-r from-red-400 to-red-500 border-white"
                                )}
                              >
                                <Flame
                                  className={cn(
                                    "w-2.5 h-2.5 text-white drop-shadow-sm"
                                  )}
                                />
                              </div>
                            )}

                            {/* Today indicator - Scaled appropriately */}
                            {day.isToday && (
                              <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[#CDA351] rounded-full border border-white dark:border-gray-900 shadow-sm"></div>
                            )}
                          </button>
                        </DayTooltip>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Legend with better design */}
              <div className="bg-gradient-to-r from-[#FAF8F6] to-[#EFE7DD] dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 border border-[#CDA351]/10">
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 shadow-sm"></div>
                    <span className="text-gray-600 dark:text-gray-300 font-medium">
                      No activity
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-lg bg-red-500 border-2 border-white dark:border-gray-900 shadow-sm"></div>
                    <span className="text-gray-700 dark:text-gray-200 font-medium">
                      50-69%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-lg bg-orange-500 border-2 border-white dark:border-gray-900 shadow-sm"></div>
                    <span className="text-gray-700 dark:text-gray-200 font-medium">
                      70-89%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-lg bg-green-500 border-2 border-white dark:border-gray-900 shadow-sm"></div>
                    <span className="text-gray-700 dark:text-gray-200 font-medium">
                      90-100%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-[#CDA351] to-[#E6C17A] border-2 border-white dark:border-gray-900 shadow-sm"></div>
                      <Flame className="w-2 h-2 text-white absolute top-0.5 left-0.5" />
                    </div>
                    <span className="text-[#CDA351] font-semibold">
                      Streak day
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Day Detail View */
            selectedDayStats &&
            selectedDate && (
              <div className="space-y-6">
                {/* Header with back button */}
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToCalendar}
                    className="text-[#CDA351] hover:bg-[#CDA351]/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Calendar
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-[#CDA351]" />
                    <h2 className="text-xl font-semibold text-[#1A1A1A] dark:text-white">
                      {safeFormatDate(selectedDate, "MMMM d, yyyy")}
                    </h2>
                    {selectedDayStats.streakDay && (
                      <Badge
                        variant="default"
                        className="bg-[#CDA351] text-white"
                      >
                        <Flame className="w-3 h-3 mr-1" />
                        Streak Day
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Hidden description for accessibility */}
                <div className="sr-only">
                  <DialogDescription>
                    Detailed view of your productivity on{" "}
                    {safeFormatDate(selectedDate, "MMMM d, yyyy")}, including
                    all tasks and focus sessions. You completed{" "}
                    {selectedDayStats.tasksCompleted} out of{" "}
                    {selectedDayStats.tasksAssigned} tasks with{" "}
                    {formatFocusTime(selectedDayStats.focusTimeMinutes)} of
                    focus time.
                  </DialogDescription>
                </div>

                <ScrollArea className="max-h-[65vh] pr-4">
                  <div className="space-y-6">
                    {/* Day Overview */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="border-[#CDA351]/20">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Target className="w-8 h-8 text-[#CDA351]" />
                            <div>
                              <p className="text-2xl font-bold text-[#1A1A1A] dark:text-white">
                                {selectedDayStats.tasksCompleted}/
                                {selectedDayStats.tasksAssigned}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Tasks Completed
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-[#CDA351]/20">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Clock className="w-8 h-8 text-[#CDA351]" />
                            <div>
                              <p className="text-2xl font-bold text-[#1A1A1A] dark:text-white">
                                {formatFocusTime(
                                  selectedDayStats.focusTimeMinutes
                                )}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Focus Time
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Daily Progress
                        </span>
                        <span className="text-sm font-semibold text-[#1A1A1A] dark:text-white">
                          {selectedDayStats.completionPercentage}%
                        </span>
                      </div>
                      <Progress
                        value={selectedDayStats.completionPercentage}
                        className="h-3"
                      />
                      <div className="flex items-center justify-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
                          {selectedDayStats.completionPercentage >= 50
                            ? "🔥 Great job! This counts towards your streak"
                            : "Keep going! You need 50% completion for a streak day"}
                        </p>
                      </div>
                    </div>

                    {/* Tasks List */}
                    {selectedDayStats.tasksDetails.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-[#1A1A1A] dark:text-white flex items-center space-x-2">
                            <span>
                              Tasks ({selectedDayStats.tasksDetails.length})
                            </span>
                            {selectedDayStats.tasksDetails.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                Scrollable
                              </Badge>
                            )}
                          </h4>
                          {selectedDayStats.tasksDetails.length > 3 && (
                            <p className="text-xs text-[#CDA351] flex items-center space-x-1">
                              <span>↕</span>
                              <span>Scroll to see all</span>
                            </p>
                          )}
                        </div>

                        {/* Scrollable task list with improved layout */}
                        <div className="relative">
                          <div className="max-h-[40vh] overflow-y-auto pr-6 streak-scrollbar streak-scroll-container border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50/30 dark:bg-gray-800/30 p-4">
                            <div className="space-y-3 max-w-6xl pb-6">
                              {selectedDayStats.tasksDetails.map(
                                (task, index) => (
                                  <Card
                                    key={index}
                                    className={cn(
                                      "border cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-lg w-full shadow-sm",
                                      task.completed
                                        ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800"
                                        : "border-gray-200 dark:border-gray-700 hover:border-[#CDA351]/50 bg-white dark:bg-gray-800"
                                    )}
                                    onClick={() => handleTaskClick(task.taskId)}
                                  >
                                    <CardContent className="p-5">
                                      <div className="flex items-start justify-between space-x-6">
                                        <div className="flex items-start space-x-4 flex-1 min-w-0">
                                          <CheckCircle2
                                            className={cn(
                                              "w-4 h-4 mt-0.5 flex-shrink-0",
                                              task.completed
                                                ? "text-green-500"
                                                : "text-gray-400"
                                            )}
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p
                                              className={cn(
                                                "font-medium text-sm leading-relaxed break-words mb-3",
                                                task.completed
                                                  ? "text-green-800 dark:text-green-200 line-through"
                                                  : "text-[#1A1A1A] dark:text-white"
                                              )}
                                            >
                                              {task.title}
                                            </p>

                                            <div className="flex flex-wrap gap-2 text-xs">
                                              {task.focusTimeMinutes > 0 && (
                                                <div className="flex items-center space-x-1 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1.5 rounded text-blue-700 dark:text-blue-300">
                                                  <Clock className="w-3 h-3" />
                                                  <span>
                                                    {formatFocusTime(
                                                      task.focusTimeMinutes
                                                    )}
                                                  </span>
                                                </div>
                                              )}
                                              {task.pomodoroCount > 0 && (
                                                <div className="flex items-center space-x-1 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1.5 rounded text-purple-700 dark:text-purple-300">
                                                  <Timer className="w-3 h-3" />
                                                  <span>
                                                    {task.pomodoroCount} 🍅
                                                  </span>
                                                </div>
                                              )}
                                              {task.completedAt && (
                                                <div className="flex items-center space-x-1 bg-green-50 dark:bg-green-900/20 px-2.5 py-1.5 rounded text-green-700 dark:text-green-300">
                                                  <CheckCircle2 className="w-3 h-3" />
                                                  <span>
                                                    {safeFormatDateObject(
                                                      task.completedAt,
                                                      "h:mm a"
                                                    )}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center flex-shrink-0 bg-[#CDA351]/10 border border-[#CDA351]/30 rounded px-3 py-2">
                                          <div className="text-xs text-[#CDA351] font-semibold whitespace-nowrap">
                                            Click to view details →
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )
                              )}
                            </div>
                          </div>

                          {/* Subtle scroll indicator */}
                          {selectedDayStats.tasksDetails.length > 2 && (
                            <div className="absolute right-0 top-2 bottom-2 w-1 bg-gradient-to-b from-transparent via-[#CDA351]/20 to-transparent rounded-full pointer-events-none"></div>
                          )}
                        </div>

                        {/* Enhanced scroll indicator for many tasks */}
                        {selectedDayStats.tasksDetails.length > 5 && (
                          <div className="text-center pt-2">
                            <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-full inline-block border border-gray-200 dark:border-gray-700">
                              Showing {selectedDayStats.tasksDetails.length}{" "}
                              tasks • Scroll up/down to navigate
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Empty state with helpful information */}
                    {selectedDayStats.tasksDetails.length === 0 && (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No tasks recorded
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          No tasks were created or completed on this day.
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            💡 <strong>Tip:</strong> Create tasks and work on
                            them to build your productivity streak!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StreakCalendar;
