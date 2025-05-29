import { useState, useEffect } from "react";
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
}

const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60; // 5 minutes in seconds

export function FocusMode({ tasks, onTaskUpdate }: FocusModeProps) {
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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Always prevent escape key default behavior
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();

        if (focusLockEnabled) {
          toast.error("Focus Lock is active", {
            description: "Please disable Focus Lock before exiting.",
            duration: 3000,
          });
          return;
        }

        if (exitIntentDetected) {
          // Second exit intent - show summary
          setShowSummary(true);
        } else {
          // First exit intent
          setExitIntentDetected(true);
          toast.info("Press Escape again to exit Focus Mode", {
            duration: 3000,
          });
        }
        return;
      }

      // Only handle other keys if focus lock is not enabled
      if (!focusLockEnabled) {
        if (e.key === "ArrowRight") {
          handleNextTask();
        }
        if (e.key === "ArrowLeft") {
          handlePreviousTask();
        }
      }
    };

    // Use capture phase to ensure our handler runs first
    window.addEventListener("keydown", handleKeyPress, true);
    return () => window.removeEventListener("keydown", handleKeyPress, true);
  }, [currentTaskIndex, focusLockEnabled, exitIntentDetected]);

  // Remove the separate keyboard handler since we handle everything in the main handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block all keyboard shortcuts when focus lock is enabled
      if (focusLockEnabled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [focusLockEnabled]);

  // Reset exit intent when focus lock is toggled
  useEffect(() => {
    if (focusLockEnabled) {
      setExitIntentDetected(false);
    }
  }, [focusLockEnabled]);

  // Filter tasks for today and not snoozed
  const todayTasks = tasks.filter((task) => {
    const taskDate = task.dueDate ? new Date(task.dueDate) : null;
    const isToday =
      taskDate &&
      (format(taskDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") ||
        task.section === "today");
    const isSnoozed =
      task.snoozedUntil && isAfter(new Date(task.snoozedUntil), today);
    return isToday && !task.completed && !isSnoozed;
  });

  // Calculate daily progress
  const progress = (completedTasks.length / todayTasks.length) * 100;

  // Reset current task index when tasks change
  useEffect(() => {
    setCurrentTaskIndex(0);
  }, [todayTasks.length]);

  // Check if all tasks are completed when entering Focus Mode
  useEffect(() => {
    if (todayTasks.length === 0) {
      setShowInitialCompletionScreen(true);
    }
  }, [todayTasks.length]);

  // Check for task completion during session
  useEffect(() => {
    if (todayTasks.length > 0 && completedTasks.length === todayTasks.length) {
      // Clear any existing auto-exit timer
      if (autoExitTimer) {
        clearTimeout(autoExitTimer);
      }

      // Show completion screen
      setShowCompletionScreen(true);
    }
  }, [completedTasks.length, todayTasks.length]);

  // Handle empty tasks state
  useEffect(() => {
    if (todayTasks.length === 0) {
      // Ensure focus lock is disabled
      if (focusLockEnabled) {
        setFocusLockEnabled(false);
      }
      // Show summary if not already showing
      if (!showSummary && !showCompletionScreen) {
        setShowSummary(true);
      }
    }
  }, [todayTasks.length, focusLockEnabled, showSummary, showCompletionScreen]);

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
  };

  const handleNextTask = () => {
    if (currentTaskIndex < todayTasks.length - 1) {
      setCurrentTaskIndex((prev) => prev + 1);
      showMindfulTransition();
    }
  };

  const handlePreviousTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex((prev) => prev - 1);
      showMindfulTransition();
    }
  };

  const showMindfulTransition = () => {
    setShowTransition(true);
    // Play a gentle sound for transition
    const audio = new Audio("/sounds/transition.mp3");
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore errors if sound can't be played
    });

    // Show transition for 3 seconds
    setTimeout(() => setShowTransition(false), 3000);
  };

  const handleMarkDone = (taskId: string) => {
    onTaskUpdate(taskId, { completed: true });
    setCompletedTasks((prev) => [...prev, taskId]);
    toast.success("Task completed! 🎉");

    // If this was the last task and focus lock is off, start auto-exit timer
    if (completedTasks.length + 1 === todayTasks.length && !focusLockEnabled) {
      const timer = setTimeout(() => {
        setShowSummary(true);
      }, 3000);
      setAutoExitTimer(timer);
    }

    handleNextTask();
  };

  const handlePostpone = (taskId: string) => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    onTaskUpdate(taskId, {
      dueDate: tomorrow,
      section: "tomorrow",
    });
    toast.success("Task moved to tomorrow");
    handleNextTask();
  };

  const handleSnooze = (taskId: string, hours: number) => {
    const snoozeUntil = addHours(today, hours);
    onTaskUpdate(taskId, { snoozedUntil: snoozeUntil });
    toast.success(`Task snoozed for ${hours} hours`);
    handleNextTask();
  };

  const handlePomodoroComplete = () => {
    setCompletedPomodoros((prev) => prev + 1);
  };

  const handleEndSession = () => {
    setShowCompletionScreen(false);
    setFocusLockEnabled(false); // Ensure focus lock is disabled
    setShowSummary(true);
  };

  const handleStayInFlow = () => {
    setShowCompletionScreen(false);
    setFocusLockEnabled(false);
    // Reset the task list to show completed tasks
    setCurrentTaskIndex(0);
  };

  const handleSummaryClose = () => {
    setShowSummary(false);
    setFocusLockEnabled(false); // Ensure focus lock is disabled
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
        totalTasks={todayTasks.length}
        completedPomodoros={completedPomodoros}
        totalFocusTime={getTotalFocusTime()}
        onClose={handleSummaryClose}
      />
    );
  }

  if (todayTasks.length === 0) {
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

  const currentTask = todayTasks[currentTaskIndex];

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
          {/* Header with Progress Ring */}
          <div className="flex items-center justify-between p-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExit}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-all duration-200",
                focusLockEnabled && "opacity-50 cursor-not-allowed"
              )}
              disabled={focusLockEnabled}
            >
              <X className="mr-2 h-4 w-4" />
              Exit Focus Mode
            </Button>
            <div className="flex items-center gap-4">
              <div className="w-32">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  {completedTasks.length} of {todayTasks.length} tasks
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
            <div className="w-[100px]"></div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center p-8">
            <AnimatePresence mode="wait">
              {showTransition ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center space-y-6"
                >
                  <div className="relative w-24 h-24 mx-auto">
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
                    <p className="text-xl text-muted-foreground">
                      Take a deep breath...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ready for the next task?
                    </p>
                  </div>
                </motion.div>
              ) : (
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
                      "p-8 hover:shadow-lg transition-shadow",
                      focusLockEnabled && "ring-2 ring-red-500/20"
                    )}
                  >
                    <div className="space-y-6">
                      {isPomodoroMode && (
                        <div className="mb-8">
                          <PomodoroTimer
                            isActive={isPomodoroMode}
                            onComplete={handlePomodoroComplete}
                          />
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-bold mb-2">
                          {currentTask.title}
                        </h2>
                        {currentTask.description && (
                          <p className="text-muted-foreground">
                            {currentTask.description}
                          </p>
                        )}
                        {currentTask.priority && (
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm mt-3 ${
                              currentTask.priority === "high"
                                ? "bg-red-100 text-red-700"
                                : currentTask.priority === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {currentTask.priority.charAt(0).toUpperCase() +
                              currentTask.priority.slice(1)}{" "}
                            Priority
                          </span>
                        )}
                      </div>

                      <div className="flex justify-center gap-4 pt-4">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => handleMarkDone(currentTask.id)}
                          className="text-green-600 hover:bg-green-50"
                        >
                          ✅ Done
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => handlePostpone(currentTask.id)}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          💭 Tomorrow
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => handleSnooze(currentTask.id, 2)}
                          className="text-purple-600 hover:bg-purple-50"
                        >
                          💤 Snooze 2h
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Hints */}
          <div className="p-4 text-center text-sm text-muted-foreground border-t">
            <p>
              Use arrow keys to navigate
              {focusLockEnabled ? (
                <span className="text-red-500 font-medium">
                  {" "}
                  • Focus Lock is active - Exit disabled
                </span>
              ) : (
                " • Press Esc to exit"
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
            totalTasks={todayTasks.length}
            completedPomodoros={completedPomodoros}
            totalFocusTime={getTotalFocusTime()}
            onClose={handleSummaryClose}
          />
        )}
      </AnimatePresence>
    </>
  );
}
