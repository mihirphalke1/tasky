import { useState, useEffect, useMemo } from "react";
import { Task } from "../types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  format,
  isAfter,
  isBefore,
  addHours,
  startOfDay,
  endOfDay,
  differenceInMinutes,
} from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  X,
  Timer,
  Play,
  Pause,
  SkipForward,
  Coffee,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";
import { PomodoroTimer } from "./PomodoroTimer";
import { FocusLock } from "./FocusLock";
import { FocusSummary } from "./FocusSummary";

interface FocusModeProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onFocusLockChange?: (locked: boolean) => void;
}

const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60; // 5 minutes in seconds

export function FocusMode({
  tasks,
  onTaskUpdate,
  onFocusLockChange,
}: FocusModeProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const today = new Date();

  // State machine states
  const [focusModeActive, setFocusModeActive] = useState(true);
  const [focusLockEnabled, setFocusLockEnabled] = useState(false);
  const [exitIntentDetected, setExitIntentDetected] = useState(false);

  // Other states
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isPomodoroMode, setIsPomodoroMode] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [showInitialCompletionScreen, setShowInitialCompletionScreen] =
    useState(false);
  const [autoExitTimer, setAutoExitTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  // Enhanced task filtering, prioritization, and validation
  const processedTasks = useMemo(() => {
    try {
      if (!Array.isArray(tasks)) {
        console.warn("Tasks is not an array:", tasks);
        return [];
      }

      // Filter tasks for today and validate data
      const validTasks = tasks.filter((task) => {
        // Comprehensive validation
        if (!task || typeof task !== "object" || !task.id || !task.title) {
          console.warn("Invalid task found:", task);
          return false;
        }

        // Skip completed and hidden tasks
        if (task.completed || task.hidden) {
          return false;
        }

        // Include snoozed tasks in Focus Mode - Focus Mode should show all work including snoozed items
        // Users should be able to see and work on snoozed tasks during focus sessions
        // The snooze check is removed to allow snoozed tasks to appear in Focus Mode

        // Check if task is for today
        try {
          const taskDate = task.dueDate ? new Date(task.dueDate) : null;
          const isToday =
            taskDate &&
            (format(taskDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") ||
              task.section === "today");

          // Include tasks marked as 'today' section or due today
          return isToday || task.section === "today";
        } catch (error) {
          console.warn("Error processing task date:", task.dueDate, error);
          // If there's an error with dates, include task if section is 'today'
          return task.section === "today";
        }
      });

      // Sort by priority: high -> medium -> low, then by creation date
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const sortedTasks = validTasks.sort((a, b) => {
        // First sort by priority
        const priorityA = priorityOrder[a.priority] ?? 1; // Default to medium
        const priorityB = priorityOrder[b.priority] ?? 1;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // If same priority, sort by creation date (newer first)
        try {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        } catch (error) {
          console.warn("Error sorting by date:", error);
          return 0;
        }
      });

      console.log(`Processed ${sortedTasks.length} valid tasks for focus mode`);
      return sortedTasks;
    } catch (error) {
      console.error("Error processing tasks for focus mode:", error);
      return [];
    }
  }, [tasks, today]);

  // Safe progress calculation with validation
  const safeProgress = useMemo(() => {
    try {
      if (processedTasks.length === 0) return 0;
      const completedCount = Math.max(0, completedTasks.length);
      const totalCount = Math.max(1, processedTasks.length);
      const progress = Math.min(100, (completedCount / totalCount) * 100);
      return Math.round(progress);
    } catch (error) {
      console.error("Error calculating progress:", error);
      return 0;
    }
  }, [completedTasks.length, processedTasks.length]);

  // Safe current task index management
  const safeCurrentTaskIndex = useMemo(() => {
    const maxIndex = Math.max(0, processedTasks.length - 1);
    return Math.min(currentTaskIndex, maxIndex);
  }, [currentTaskIndex, processedTasks.length]);

  // Get current task with validation
  const currentTask = useMemo(() => {
    try {
      if (processedTasks.length === 0) return null;
      const task = processedTasks[safeCurrentTaskIndex];
      if (!task || !task.id || !task.title) {
        console.warn("Invalid current task:", task);
        return null;
      }
      return task;
    } catch (error) {
      console.error("Error getting current task:", error);
      return null;
    }
  }, [processedTasks, safeCurrentTaskIndex]);

  // Reset current task index when tasks change
  useEffect(() => {
    if (processedTasks.length === 0) {
      setCurrentTaskIndex(0);
      return;
    }

    // If current index is out of bounds, reset to 0
    if (currentTaskIndex >= processedTasks.length) {
      setCurrentTaskIndex(0);
    }
  }, [processedTasks.length]);

  // Handle initial state based on available tasks
  useEffect(() => {
    if (processedTasks.length === 0 && !showSummary && !showCompletionScreen) {
      setShowInitialCompletionScreen(true);
    }
  }, [processedTasks.length, showSummary, showCompletionScreen]);

  // Check for session completion
  useEffect(() => {
    const allTasksCompleted =
      processedTasks.length > 0 &&
      completedTasks.length >= processedTasks.length;

    if (allTasksCompleted && !showCompletionScreen && !showSummary) {
      // Clear any existing auto-exit timer
      if (autoExitTimer) {
        clearTimeout(autoExitTimer);
        setAutoExitTimer(null);
      }

      // Show completion screen
      setShowCompletionScreen(true);
    }
  }, [
    completedTasks.length,
    processedTasks.length,
    showCompletionScreen,
    showSummary,
    autoExitTimer,
  ]);

  // Handle empty tasks state with proper cleanup
  useEffect(() => {
    if (processedTasks.length === 0) {
      // Disable focus lock for safety
      if (focusLockEnabled) {
        setFocusLockEnabled(false);
        if (onFocusLockChange) {
          onFocusLockChange(false);
        }
      }

      // Clear any timers
      if (autoExitTimer) {
        clearTimeout(autoExitTimer);
        setAutoExitTimer(null);
      }
    }
  }, [
    processedTasks.length,
    focusLockEnabled,
    onFocusLockChange,
    autoExitTimer,
  ]);

  // Add history state when entering focus mode
  useEffect(() => {
    window.history.pushState({ focusMode: true }, "");
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (focusLockEnabled) {
        // Prevent back navigation when locked
        window.history.pushState({ focusMode: true }, "");
        toast.error("Focus Lock is active", {
          description: "Please disable Focus Lock before exiting.",
          duration: 3000,
        });
      } else if (exitIntentDetected) {
        // Second exit intent - show summary
        setShowSummary(true);
      } else {
        // First exit intent - set exit intent
        setExitIntentDetected(true);
        toast.info("Press Escape again to exit Focus Mode", {
          duration: 3000,
        });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.focusMode) {
        window.history.back();
      }
    };
  }, [focusLockEnabled, exitIntentDetected]);

  // Enhanced keyboard shortcuts with mobile considerations
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't interfere if user is typing
      const isTyping =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as any)?.contentEditable === "true";

      if (isTyping) return;

      // Skip keyboard shortcuts on mobile devices
      const isMobile = window.innerWidth < 768 || "ontouchstart" in window;
      if (isMobile) return;

      // Handle arrow keys for navigation (only if focus lock is not enabled)
      if (!focusLockEnabled) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          handleNextTask();
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          handlePreviousTask();
          return;
        }
      }

      // Handle task actions (work even with focus lock)
      if (currentTask) {
        if (e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          handleMarkDone(currentTask.id);
          return;
        }

        // Ctrl/Cmd + Right Arrow = Postpone to tomorrow
        if ((e.metaKey || e.ctrlKey) && e.key === "ArrowRight") {
          e.preventDefault();
          handlePostpone(currentTask.id);
          return;
        }

        // Ctrl/Cmd + S = Snooze task
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
          e.preventDefault();
          handleSnooze(currentTask.id, 2);
          return;
        }

        // P = Toggle Pomodoro mode
        if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          setIsPomodoroMode(!isPomodoroMode);
          return;
        }
      }

      // Let global shortcuts handle escape and other commands
      // Focus lock will still prevent exit via the global escape handler
    };

    // Use normal event listener (not capture) to avoid conflicting with global shortcuts
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentTaskIndex, focusLockEnabled, currentTask, isPomodoroMode]);

  // Handle focus lock keyboard blocking separately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only block non-global shortcuts when focus lock is enabled
      if (focusLockEnabled) {
        // Allow global shortcuts like theme toggle and shortcuts page
        const isGlobalShortcut =
          (e.metaKey || e.ctrlKey) &&
          (e.key === "/" || (e.shiftKey && e.key.toLowerCase() === "l"));

        if (!isGlobalShortcut) {
          e.preventDefault();
          e.stopPropagation();

          if (e.key === "Escape") {
            toast.error("Focus Lock is active", {
              description: "Please disable Focus Lock before exiting.",
              duration: 3000,
            });
          }
        }
      }
    };

    if (focusLockEnabled) {
      window.addEventListener("keydown", handleKeyDown, true);
      return () => window.removeEventListener("keydown", handleKeyDown, true);
    }
  }, [focusLockEnabled]);

  // Reset exit intent when focus lock is toggled
  useEffect(() => {
    if (focusLockEnabled) {
      setExitIntentDetected(false);
    }
  }, [focusLockEnabled]);

  // Calculate daily progress
  const progress = safeProgress;

  // Check if all tasks are completed when entering Focus Mode
  useEffect(() => {
    if (processedTasks.length === 0) {
      setShowInitialCompletionScreen(true);
    }
  }, [processedTasks.length]);

  // Handle visibility change for notifications
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPomodoroMode) {
        // Show notification when user switches tabs
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Focus Mode Active", {
            body: focusLockEnabled
              ? "Focus Lock is enabled. Stay focused and complete your tasks!"
              : "Don't forget to stay focused!",
            icon: "/favicon.ico",
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPomodoroMode, focusLockEnabled]);

  const handleExit = () => {
    if (focusLockEnabled) {
      toast.error("Cannot exit while Focus Lock is active", {
        description: "Please disable Focus Lock before exiting.",
        duration: 3000,
      });
      return;
    }

    if (exitIntentDetected) {
      setShowSummary(true);
    } else {
      setExitIntentDetected(true);
      toast.info("Press Exit again to confirm", {
        duration: 3000,
      });
    }
  };

  const handleFocusLockToggle = (locked: boolean) => {
    setFocusLockEnabled(locked);
    setExitIntentDetected(false); // Reset exit intent when lock state changes

    if (locked) {
      toast.success("Focus Lock enabled", {
        description: "You won't be able to exit until you disable Focus Lock.",
        duration: 4000,
      });
    }

    if (onFocusLockChange) {
      onFocusLockChange(locked);
    }
  };

  // Enhanced navigation with bounds checking and error handling
  const handleNextTask = () => {
    try {
      if (processedTasks.length === 0) {
        console.warn("No tasks available for navigation");
        return;
      }

      const maxIndex = processedTasks.length - 1;
      if (safeCurrentTaskIndex < maxIndex) {
        setCurrentTaskIndex((prev) => Math.min(prev + 1, maxIndex));
        showMindfulTransition();
      } else {
        // At the end, show completion if all tasks are done
        const allCompleted = completedTasks.length >= processedTasks.length;
        if (allCompleted) {
          setShowCompletionScreen(true);
        } else {
          toast.info("You've reached the last task!");
        }
      }
    } catch (error) {
      console.error("Error navigating to next task:", error);
      toast.error("Navigation error occurred");
    }
  };

  const handlePreviousTask = () => {
    try {
      if (processedTasks.length === 0) {
        console.warn("No tasks available for navigation");
        return;
      }

      if (safeCurrentTaskIndex > 0) {
        setCurrentTaskIndex((prev) => Math.max(prev - 1, 0));
        showMindfulTransition();
      } else {
        toast.info("You're at the first task!");
      }
    } catch (error) {
      console.error("Error navigating to previous task:", error);
      toast.error("Navigation error occurred");
    }
  };

  const showMindfulTransition = () => {
    try {
      setShowTransition(true);
      // Play a gentle sound for transition
      const audio = new Audio("/sounds/transition.mp3");
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors if sound can't be played
      });

      // Show transition for 3 seconds
      setTimeout(() => setShowTransition(false), 3000);
    } catch (error) {
      console.error("Error in transition:", error);
      // Fallback: just hide transition immediately
      setShowTransition(false);
    }
  };

  // Enhanced task completion with validation and error handling
  const handleMarkDone = (taskId: string) => {
    try {
      if (!taskId || !currentTask || currentTask.id !== taskId) {
        console.error("Invalid task ID or current task mismatch");
        toast.error("Error completing task");
        return;
      }

      // Update the task
      onTaskUpdate(taskId, { completed: true });

      // Track completion
      setCompletedTasks((prev) => {
        if (!prev.includes(taskId)) {
          return [...prev, taskId];
        }
        return prev; // Avoid duplicates
      });

      toast.success("Task completed! 🎉");

      // Check if this was the last task
      const newCompletedCount = completedTasks.includes(taskId)
        ? completedTasks.length
        : completedTasks.length + 1;

      if (newCompletedCount >= processedTasks.length && !focusLockEnabled) {
        // All tasks completed, show completion screen after a delay
        const timer = setTimeout(() => {
          setShowCompletionScreen(true);
        }, 1500); // Give time for celebration
        setAutoExitTimer(timer);
      } else {
        // Move to next task
        handleNextTask();
      }
    } catch (error) {
      console.error("Error marking task as done:", error);
      toast.error("Failed to complete task");
    }
  };

  const handlePostpone = (taskId: string) => {
    try {
      if (!taskId || !currentTask || currentTask.id !== taskId) {
        console.error("Invalid task ID for postponing");
        toast.error("Error postponing task");
        return;
      }

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      onTaskUpdate(taskId, {
        dueDate: tomorrow,
        section: "tomorrow",
      });

      toast.success("Task moved to tomorrow");
      handleNextTask();
    } catch (error) {
      console.error("Error postponing task:", error);
      toast.error("Failed to postpone task");
    }
  };

  const handleSnooze = (taskId: string, hours: number) => {
    try {
      if (!taskId || !currentTask || currentTask.id !== taskId) {
        console.error("Invalid task ID for snoozing");
        toast.error("Error snoozing task");
        return;
      }

      if (!hours || hours <= 0) {
        console.error("Invalid snooze duration:", hours);
        toast.error("Invalid snooze duration");
        return;
      }

      const snoozeUntil = addHours(today, hours);
      onTaskUpdate(taskId, { snoozedUntil: snoozeUntil });
      toast.success(`Task snoozed for ${hours} hours`);
      handleNextTask();
    } catch (error) {
      console.error("Error snoozing task:", error);
      toast.error("Failed to snooze task");
    }
  };

  const handlePomodoroComplete = () => {
    setCompletedPomodoros((prev) => prev + 1);
  };

  const handleEndSession = () => {
    setShowCompletionScreen(false);
    setFocusLockEnabled(false); // Ensure focus lock is disabled
    if (onFocusLockChange) {
      onFocusLockChange(false);
    }
    setShowSummary(true);
  };

  const handleStayInFlow = () => {
    setShowCompletionScreen(false);
    setFocusLockEnabled(false);
    if (onFocusLockChange) {
      onFocusLockChange(false);
    }
    // Reset the task list to show completed tasks
    setCurrentTaskIndex(0);
  };

  const handleSummaryClose = () => {
    setShowSummary(false);
    setFocusLockEnabled(false); // Ensure focus lock is disabled
    if (onFocusLockChange) {
      onFocusLockChange(false);
    }
    // Wait for the exit animation to complete before navigating
    setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 300);
  };

  const getTotalFocusTime = () => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - sessionStartTime.getTime()) / (1000 * 60)
    );
    return diffInMinutes;
  };

  if (showInitialCompletionScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background z-50 flex items-center justify-center"
      >
        <Card className="w-full max-w-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">🎉 All tasks complete!</h2>
          <p className="text-muted-foreground mb-8">
            Great job! You've completed all your tasks for today.
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="text-green-600 hover:bg-green-50"
            >
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (showCompletionScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background z-50 flex items-center justify-center"
      >
        <Card className="w-full max-w-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">🎉 Task complete!</h2>
          <p className="text-muted-foreground mb-8">
            Great job! Would you like to end your focus session or stay in flow?
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setShowCompletionScreen(false);
                setShowSummary(true);
              }}
              className="text-green-600 hover:bg-green-50"
            >
              End Session
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setShowCompletionScreen(false);
                setCurrentTaskIndex(0);
              }}
              className="text-blue-600 hover:bg-blue-50"
            >
              Stay in Flow
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (showSummary) {
    return (
      <FocusSummary
        completedTasks={completedTasks.length}
        totalTasks={processedTasks.length}
        completedPomodoros={completedPomodoros}
        totalFocusTime={getTotalFocusTime()}
        onClose={handleSummaryClose}
      />
    );
  }

  if (processedTasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background z-50 flex items-center justify-center"
      >
        <div className="text-center text-muted-foreground py-8">
          <p className="text-lg mb-2">All tasks completed! 🎉</p>
          <p className="text-sm mb-4">
            Great job! Time to review your session.
          </p>
          <Button
            onClick={() => setShowSummary(true)}
            variant="outline"
            className="text-green-600 hover:bg-green-50"
          >
            View Session Summary
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 bg-background z-50",
          focusLockEnabled && "ring-4 ring-red-500/20"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Mobile-Responsive Header with Progress */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b gap-3 sm:gap-0">
            {/* Mobile: Exit button and main controls */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExit}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-all duration-200 text-sm sm:text-base",
                  focusLockEnabled && "opacity-50 cursor-not-allowed"
                )}
                disabled={focusLockEnabled}
              >
                <X className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Exit Focus Mode</span>
                <span className="sm:hidden">Exit</span>
              </Button>

              {/* Mobile: Show progress inline */}
              <div className="flex items-center gap-2 sm:hidden">
                <div className="w-20">
                  <Progress value={progress} className="h-2" />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {completedTasks.length}/{processedTasks.length}
                </span>
              </div>
            </div>

            {/* Desktop: Centered controls */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="w-32">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  {completedTasks.length} of {processedTasks.length} tasks
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPomodoroMode(!isPomodoroMode)}
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  isPomodoroMode && "text-primary"
                )}
              >
                <Timer className="mr-2 h-4 w-4" />
                Pomodoro
              </Button>
              <FocusLock
                isLocked={focusLockEnabled}
                onToggle={handleFocusLockToggle}
              />
            </div>

            {/* Mobile: Secondary controls */}
            <div className="flex sm:hidden items-center justify-between w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPomodoroMode(!isPomodoroMode)}
                className={cn(
                  "text-muted-foreground hover:text-foreground text-sm",
                  isPomodoroMode && "text-primary"
                )}
              >
                <Timer className="mr-2 h-4 w-4" />
                Pomodoro
              </Button>
              <FocusLock
                isLocked={focusLockEnabled}
                onToggle={handleFocusLockToggle}
              />
            </div>

            <div className="hidden sm:block w-[100px]"></div>
          </div>

          {/* Main Content with Mobile Optimizations */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
            <AnimatePresence mode="wait">
              {showTransition ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center space-y-4 sm:space-y-6"
                >
                  <div className="relative w-16 h-16 sm:w-24 sm:h-24 mx-auto">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 3,
                        repeat: 0,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 rounded-full bg-primary/10"
                    />
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 3,
                        repeat: 0,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-2 rounded-full bg-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg sm:text-xl text-muted-foreground">
                      Take a deep breath...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ready for the next task?
                    </p>
                  </div>
                </motion.div>
              ) : currentTask ? (
                <motion.div
                  key={currentTask.id}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-2xl"
                >
                  <Card
                    className={cn(
                      "p-4 sm:p-8 hover:shadow-lg transition-shadow mx-2 sm:mx-0",
                      focusLockEnabled && "ring-2 ring-red-500/20"
                    )}
                  >
                    <div className="space-y-4 sm:space-y-6">
                      {isPomodoroMode && (
                        <div className="mb-4 sm:mb-8">
                          <PomodoroTimer
                            isActive={isPomodoroMode}
                            onComplete={handlePomodoroComplete}
                          />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold mb-2 leading-tight">
                          {currentTask.title}
                        </h2>
                        {currentTask.description && (
                          <p className="text-sm sm:text-base text-muted-foreground">
                            {currentTask.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {currentTask.priority && (
                            <span
                              className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${
                                currentTask.priority === "high"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                                  : currentTask.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                              }`}
                            >
                              {currentTask.priority.charAt(0).toUpperCase() +
                                currentTask.priority.slice(1)}{" "}
                              Priority
                            </span>
                          )}
                          {currentTask.snoozedUntil && (
                            <span className="inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                              💤 Previously Snoozed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mobile-Optimized Action Buttons */}
                      <div className="pt-4">
                        {/* Mobile: Stack buttons vertically */}
                        <div className="flex flex-col sm:hidden gap-3">
                          <Button
                            size="lg"
                            onClick={() => handleMarkDone(currentTask.id)}
                            className="bg-green-600 hover:bg-green-700 text-white w-full h-12 text-base font-medium"
                          >
                            ✅ Mark Done
                          </Button>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => handlePostpone(currentTask.id)}
                              className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 h-12"
                            >
                              💭 Tomorrow
                            </Button>
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => handleSnooze(currentTask.id, 2)}
                              className="text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 h-12"
                            >
                              💤 Snooze 2h
                            </Button>
                          </div>
                        </div>

                        {/* Desktop: Horizontal layout */}
                        <div className="hidden sm:flex justify-center gap-4">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handleMarkDone(currentTask.id)}
                            className="text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                          >
                            ✅ Done
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handlePostpone(currentTask.id)}
                            className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                          >
                            💭 Tomorrow
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handleSnooze(currentTask.id, 2)}
                            className="text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                          >
                            💤 Snooze 2h
                          </Button>
                        </div>
                      </div>

                      {/* Mobile: Navigation Controls */}
                      <div className="flex sm:hidden justify-between items-center pt-4 border-t">
                        <Button
                          variant="ghost"
                          size="lg"
                          onClick={handlePreviousTask}
                          disabled={safeCurrentTaskIndex === 0}
                          className="flex-1 text-muted-foreground"
                        >
                          ← Previous
                        </Button>
                        <div className="px-4 text-sm text-muted-foreground">
                          {safeCurrentTaskIndex + 1} of {processedTasks.length}
                        </div>
                        <Button
                          variant="ghost"
                          size="lg"
                          onClick={handleNextTask}
                          disabled={
                            safeCurrentTaskIndex === processedTasks.length - 1
                          }
                          className="flex-1 text-muted-foreground"
                        >
                          Next →
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4 px-4"
                >
                  <div className="text-4xl sm:text-6xl mb-4">🎯</div>
                  <h2 className="text-xl sm:text-2xl font-bold text-muted-foreground">
                    No Tasks Available
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    All tasks are complete or no tasks are scheduled for today.
                  </p>
                  <Button
                    onClick={handleExit}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    Exit Focus Mode
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Enhanced Mobile-Responsive Navigation Hints */}
          <div className="p-3 sm:p-4 text-center text-xs sm:text-sm text-muted-foreground border-t space-y-2">
            {/* Desktop keyboard shortcuts */}
            <div className="hidden sm:flex flex-wrap justify-center gap-4">
              <span>←→ Navigate tasks</span>
              <span>Space Mark done</span>
              <span>⌘→ Postpone</span>
              <span>⌘S Snooze</span>
              <span>P Pomodoro</span>
            </div>
            {/* Mobile touch instructions */}
            <div className="sm:hidden">
              <span>Tap buttons above to interact with tasks</span>
            </div>
            <p>
              {focusLockEnabled ? (
                <span className="text-red-500 font-medium">
                  Focus Lock is active - Exit disabled
                </span>
              ) : (
                <>
                  <span className="hidden sm:inline">Press Esc to exit</span>
                  <span className="sm:hidden">
                    Tap Exit to leave Focus Mode
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Focus Summary */}
      <AnimatePresence>
        {showSummary && (
          <FocusSummary
            completedTasks={completedTasks.length}
            totalTasks={processedTasks.length}
            completedPomodoros={completedPomodoros}
            totalFocusTime={getTotalFocusTime()}
            onClose={handleSummaryClose}
          />
        )}
      </AnimatePresence>
    </>
  );
}
