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
  };

  const handleDayClick = async (date: string, stats: DailyStats | null) => {
    if (!user?.uid || !stats) return;

    setSelectedDate(date);
    setSelectedDayStats(stats);
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/task/${taskId}`);
    onClose();
  };

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
    if (!isStreakDay) return "bg-gray-100 dark:bg-gray-800";

    if (completionPercentage >= 90) return "bg-green-500";
    if (completionPercentage >= 70) return "bg-yellow-500";
    if (completionPercentage >= 50) return "bg-orange-500";
    return "bg-red-500";
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
              No activity on {format(parseISO(date), "MMM d")}
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
                {format(parseISO(date), "MMMM d, yyyy")}
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
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

        <div className="flex flex-col space-y-6">
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
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#CDA351]/20 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CDA351]"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 p-2"
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
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
                          "w-10 h-10 rounded-lg relative flex items-center justify-center text-sm font-medium transition-all duration-200",
                          day.isToday
                            ? "ring-2 ring-[#CDA351] ring-offset-2 dark:ring-offset-gray-900"
                            : "",
                          day.stats
                            ? "hover:scale-110 cursor-pointer shadow-sm hover:shadow-md"
                            : "text-gray-400 dark:text-gray-600",
                          getStreakColor(
                            day.isStreakDay,
                            day.stats?.completionPercentage || 0
                          )
                        )}
                        disabled={!day.stats}
                      >
                        <span
                          className={cn(
                            day.stats && day.stats.completionPercentage > 0
                              ? "text-white font-semibold"
                              : "text-gray-700 dark:text-gray-300"
                          )}
                        >
                          {day.dayOfMonth}
                        </span>

                        {/* Streak indicator */}
                        {day.isStreakDay && (
                          <Flame className="w-2 h-2 text-white absolute -top-0.5 -right-0.5" />
                        )}
                      </button>
                    </DayTooltip>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800"></div>
              <span>No activity</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>50-69%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-orange-500"></div>
              <span>70-89%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>90-100%</span>
            </div>
          </div>
        </div>

        {/* Day Detail Modal */}
        {selectedDayStats && selectedDate && (
          <Dialog
            open={!!selectedDayStats}
            onOpenChange={() => setSelectedDayStats(null)}
          >
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2 text-[#1A1A1A] dark:text-white">
                  <Calendar className="w-5 h-5 text-[#CDA351]" />
                  <span>{format(parseISO(selectedDate), "MMMM d, yyyy")}</span>
                  {selectedDayStats.streakDay && (
                    <Badge
                      variant="default"
                      className="bg-[#CDA351] text-white ml-2"
                    >
                      <Flame className="w-3 h-3 mr-1" />
                      Streak Day
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Detailed view of your productivity on this day, including all
                  tasks and focus sessions.
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
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
                  </div>

                  {/* Tasks List */}
                  {selectedDayStats.tasksDetails.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-[#1A1A1A] dark:text-white">
                        Tasks
                      </h4>
                      <div className="space-y-2">
                        {selectedDayStats.tasksDetails.map((task, index) => (
                          <Card
                            key={index}
                            className={cn(
                              "border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md",
                              task.completed
                                ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800"
                                : "border-gray-200 dark:border-gray-700"
                            )}
                            onClick={() => handleTaskClick(task.taskId)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3 flex-1">
                                  <CheckCircle2
                                    className={cn(
                                      "w-5 h-5 mt-0.5",
                                      task.completed
                                        ? "text-green-500"
                                        : "text-gray-400"
                                    )}
                                  />
                                  <div className="flex-1">
                                    <p
                                      className={cn(
                                        "font-medium",
                                        task.completed
                                          ? "text-green-800 dark:text-green-200 line-through"
                                          : "text-[#1A1A1A] dark:text-white"
                                      )}
                                    >
                                      {task.title}
                                    </p>

                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                      {task.focusTimeMinutes > 0 && (
                                        <div className="flex items-center space-x-1">
                                          <Clock className="w-3 h-3" />
                                          <span>
                                            {formatFocusTime(
                                              task.focusTimeMinutes
                                            )}
                                          </span>
                                        </div>
                                      )}
                                      {task.pomodoroCount > 0 && (
                                        <div className="flex items-center space-x-1">
                                          <Timer className="w-3 h-3" />
                                          <span>
                                            {task.pomodoroCount} pomodoros
                                          </span>
                                        </div>
                                      )}
                                      {task.completedAt && (
                                        <div className="flex items-center space-x-1">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>
                                            Completed at{" "}
                                            {format(task.completedAt, "h:mm a")}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StreakCalendar;
