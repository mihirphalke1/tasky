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
  Lock,
  Unlock,
  ArrowRight,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";
import { PomodoroTimer } from "./PomodoroTimer";
import { FocusLock } from "./FocusLock";
import { FocusSummary } from "./FocusSummary";
import { FocusWelcome } from "./FocusWelcome";
import { SessionSummaryModal } from "./SessionSummaryModal";
import { QuickNoteButton } from "./QuickNoteButton";
import { BackgroundUpload } from "./BackgroundUpload";
import { useAuth } from "@/lib/AuthContext";
import {
  createFocusSession,
  endFocusSession,
  updateUserStreak,
  getUserStreak,
  saveTaskIntention,
  getTaskIntention,
} from "@/lib/focusService";
import {
  useKeyboardShortcuts,
  type ShortcutAction,
  type KeyboardShortcut,
} from "@/hooks/useKeyboardShortcuts";

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
  const { user } = useAuth();
  const today = new Date();

  // State machine states
  const [focusModeActive, setFocusModeActive] = useState(true);
  const [focusLockEnabled, setFocusLockEnabled] = useState(false);
  const [exitIntentDetected, setExitIntentDetected] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSessionSummary, setShowSessionSummary] = useState(false);

  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [sessionIntention, setSessionIntention] = useState<string>("");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [previousTaskIntention, setPreviousTaskIntention] = useState<
    string | null
  >(null);

  // Other states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [isPomodoroMode, setIsPomodoroMode] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [showInitialCompletionScreen, setShowInitialCompletionScreen] =
    useState(false);
  const [showAllTasksDoneInLockMode, setShowAllTasksDoneInLockMode] =
    useState(false);
  const [showAllSessionTasksDoneScreen, setShowAllSessionTasksDoneScreen] =
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

      // Filter to show incomplete tasks that are NOT snoozed
      const validTasks = tasks.filter((task) => {
        if (!task || typeof task !== "object" || !task.id || !task.title) {
          console.warn("Invalid task found:", task);
          return false;
        }

        if (task.completed) {
          return false;
        }

        // Filter out snoozed tasks that haven't reached their snooze time yet
        if (task.snoozedUntil && isAfter(task.snoozedUntil, new Date())) {
          return false;
        }

        return true;
      });

      // Sort tasks by priority, then due date, then creation date
      return validTasks.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    } catch (error) {
      console.error("Error processing tasks:", error);
      return [];
    }
  }, [tasks]);

  // Safe task index management
  const safeCurrentTaskIndex = Math.min(
    Math.max(
      0,
      processedTasks.findIndex((t) => t.id === selectedTask?.id)
    ),
    processedTasks.length - 1
  );

  const currentTask = processedTasks[safeCurrentTaskIndex];

  // Add sessionTasks state
  const [sessionTasks, setSessionTasks] = useState<Task[]>([]);

  // Function declarations
  const handleNextTask = () => {
    if (!selectedTask) return;
    const idx = processedTasks.findIndex((t) => t.id === selectedTask.id);
    if (idx < processedTasks.length - 1) {
      setSelectedTask(processedTasks[idx + 1]);
      showMindfulTransition();
    }
  };

  const handlePreviousTask = () => {
    if (!selectedTask) return;
    const idx = processedTasks.findIndex((t) => t.id === selectedTask.id);
    if (idx > 0) {
      setSelectedTask(processedTasks[idx - 1]);
      showMindfulTransition();
    }
  };

  const handleExit = () => {
    if (focusLockEnabled) {
      toast.error("Focus lock is enabled. Disable it first to exit.");
      return;
    }
    setIsExiting(true);
    handleEndFocusSession();
  };

  const handleFocusLockToggle = (locked: boolean) => {
    setFocusLockEnabled(locked);
    onFocusLockChange?.(locked);

    // Enhanced security message
    const message = locked
      ? "Focus Lock enabled - All exit methods disabled until manually unlocked"
      : "Focus Lock disabled - You can now exit Focus Mode";

    toast.success(locked ? "Focus lock enabled" : "Focus lock disabled", {
      description: message,
      duration: locked ? 4000 : 3000,
    });
  };

  // Declare functions that will be used in keyboard shortcuts
  const handleMarkDone = (taskId: string) => {
    try {
      const task = sessionTasks.find((t) => t.id === taskId);
      if (!task) {
        console.error("Task not found in current session:", taskId);
        return;
      }

      const now = new Date();
      const updatedTaskData = {
        completed: true,
        completedAt: now,
        lastModified: now,
      };

      // Add to completed tasks list for this session
      setCompletedTasks((prev) =>
        prev.includes(taskId) ? prev : [...prev, taskId]
      );

      // Update the task globally
      onTaskUpdate(taskId, updatedTaskData);

      toast.success("Task completed! 🎉", {
        description: task.title,
        duration: 2000,
      });

      // Check if all session tasks are completed
      if (completedTasks.length + 1 >= sessionTasks.length) {
        if (focusLockEnabled) {
          handleFocusLockToggle(false); // Auto-lift lock
          setShowAllTasksDoneInLockMode(true);
        } else {
          setShowAllSessionTasksDoneScreen(true);
        }
      } else {
        setShowCompletionScreen(true);
      }
    } catch (error) {
      console.error("Error marking task as done:", error);
      toast.error("Failed to mark task as complete");
    }
  };

  const handlePostpone = (taskId: string) => {
    try {
      const task = processedTasks.find((t) => t.id === taskId);
      if (!task) return;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const updatedTask = {
        ...task,
        dueDate: tomorrow,
        section: "tomorrow" as const,
        lastModified: new Date(),
      };

      onTaskUpdate(taskId, updatedTask);
      toast.success("Task moved to tomorrow", {
        duration: 1500,
      });

      handleNextTask();
    } catch (error) {
      console.error("Error postponing task:", error);
      toast.error("Failed to postpone task");
    }
  };

  const handleSnooze = (taskId: string, hours: number) => {
    try {
      const task = processedTasks.find((t) => t.id === taskId);
      if (!task) {
        toast.error("Task not found");
        return;
      }

      const snoozeUntil = addHours(new Date(), hours);

      const updatedTask = {
        ...task,
        snoozedUntil: snoozeUntil,
        lastModified: new Date(),
      };

      onTaskUpdate(taskId, updatedTask);
      toast.success(`Task snoozed for ${hours} hour${hours > 1 ? "s" : ""}`, {
        description: `Will appear again at ${format(snoozeUntil, "h:mm a")}`,
        duration: 2000,
      });

      handleNextTask();
    } catch (error) {
      console.error("Error snoozing task:", error);
      toast.error("Failed to snooze task");
    }
  };

  const handlePomodoroComplete = () => {
    setCompletedPomodoros((prev) => prev + 1);
  };

  const getTotalFocusTime = () => {
    const diffInMinutes = differenceInMinutes(new Date(), sessionStartTime);
    return diffInMinutes;
  };

  const showMindfulTransition = () => {
    setShowTransition(true);
    setTimeout(() => {
      setShowTransition(false);
    }, 3000);
  };

  const handleEndFocusSession = async () => {
    if (!sessionId || !user) return;

    try {
      const sessionDuration = differenceInMinutes(new Date(), sessionStartTime);

      await endFocusSession(sessionId, sessionDuration, [], completedPomodoros);

      setShowSessionSummary(true);
    } catch (error) {
      console.error("Error ending focus session:", error);
      toast.error("Failed to save session data");
    }
  };

  // Enhanced keyboard shortcuts with proper focus lock handling
  const shortcuts: KeyboardShortcut[] = [
    // Arrow key navigation
    {
      id: "next-task",
      description: "Next Task",
      category: "tasks",
      keys: {
        mac: ["arrowright"],
        windows: ["arrowright"],
      },
      action: handleNextTask,
      priority: 80,
      allowInModal: false,
    },
    {
      id: "previous-task",
      description: "Previous Task",
      category: "tasks",
      keys: {
        mac: ["arrowleft"],
        windows: ["arrowleft"],
      },
      action: handlePreviousTask,
      priority: 80,
      allowInModal: false,
    },
    // Space for completing current task
    {
      id: "complete-task",
      description: "Complete Current Task",
      category: "tasks",
      keys: {
        mac: ["space"],
        windows: ["space"],
      },
      action: () => selectedTask && handleMarkDone(selectedTask.id),
      priority: 85,
      allowInModal: false,
    },
    // Cmd/Ctrl+Enter as alternative for completing task
    {
      id: "complete-task-alt",
      description: "Complete Current Task (Alt)",
      category: "tasks",
      keys: {
        mac: ["meta", "enter"],
        windows: ["ctrl", "enter"],
      },
      action: () => selectedTask && handleMarkDone(selectedTask.id),
      priority: 85,
      allowInModal: false,
    },
    // P for toggling Pomodoro
    {
      id: "toggle-pomodoro",
      description: "Toggle Pomodoro Timer",
      category: "tasks",
      keys: {
        mac: ["p"],
        windows: ["p"],
      },
      action: () => setIsPomodoroMode(!isPomodoroMode),
      priority: 75,
      allowInModal: false,
    },
    // Cmd/Ctrl+S for snoozing (with focus lock check)
    {
      id: "snooze-task",
      description: "Snooze Current Task",
      category: "tasks",
      keys: {
        mac: ["meta", "s"],
        windows: ["ctrl", "s"],
      },
      action: () => {
        if (selectedTask) {
          handleSnooze(selectedTask.id, 2);
        }
      },
      priority: 80,
      allowInModal: false,
    },
    // Cmd/Ctrl+Shift+Right for postpone
    {
      id: "postpone-task",
      description: "Postpone Task to Tomorrow",
      category: "tasks",
      keys: {
        mac: ["meta", "shift", "arrowright"],
        windows: ["ctrl", "shift", "arrowright"],
      },
      action: () => {
        if (selectedTask) {
          handlePostpone(selectedTask.id);
        }
      },
      priority: 80,
      allowInModal: false,
    },
    // Focus lock toggle (works even when locked)
    {
      id: "toggle-focus-lock",
      description: "Toggle Focus Lock",
      category: "general",
      keys: {
        mac: ["meta", "l"],
        windows: ["ctrl", "l"],
      },
      action: () => handleFocusLockToggle(!focusLockEnabled),
      priority: 90,
      allowInModal: false,
    },
    // Exit shortcut (blocked when focus lock is enabled)
    {
      id: "exit-focus",
      description: "Exit Focus Mode",
      category: "navigation",
      keys: {
        mac: ["meta", "escape"],
        windows: ["ctrl", "escape"],
      },
      action: () => {
        if (focusLockEnabled) {
          toast.error("Focus Lock is active", {
            description: "Disable Focus Lock first to exit (Cmd/Ctrl + L)",
            duration: 3000,
          });
          return;
        }
        handleExit();
      },
      priority: 70,
      allowInModal: false,
    },
  ];

  useKeyboardShortcuts(shortcuts);

  // Load background image from localStorage on mount
  useEffect(() => {
    const savedBackground = localStorage.getItem("focus-background");
    if (savedBackground) {
      setBackgroundImage(savedBackground);
    }
  }, []);

  // Load user streak data
  useEffect(() => {
    if (user) {
      loadUserStreak();
    }
  }, [user]);

  const loadUserStreak = async () => {
    if (!user) return;
    try {
      const streak = await getUserStreak(user.uid);
      setCurrentStreak(streak.currentStreak);
      setLongestStreak(streak.longestStreak);
    } catch (error) {
      console.error("Error loading user streak:", error);
    }
  };

  const handleStartFocus = async (task: Task, intention?: string) => {
    if (!user) return;

    // Load previous intention for this task
    try {
      const previousIntention = await getTaskIntention(task.id);
      setPreviousTaskIntention(previousIntention?.intention || null);
    } catch (error) {
      console.error("Error loading previous intention:", error);
    }

    // Store the initial session tasks (all tasks for today at session start)
    setSessionTasks(processedTasks);
    setSelectedTask(task);
    setShowWelcome(false);
    setSessionStartTime(new Date());
    setSessionIntention(intention || "");
    try {
      const sessionId = await createFocusSession(
        user.uid,
        task.id,
        intention,
        backgroundImage
      );
      setSessionId(sessionId);
      if (intention) {
        await saveTaskIntention(task.id, intention, new Date());
      }
      const updatedStreak = await updateUserStreak(user.uid);
      setCurrentStreak(updatedStreak.currentStreak);
      setLongestStreak(updatedStreak.longestStreak);
      toast.success("Focus session started!", {
        description: intention
          ? "Good luck with your intention!"
          : "Stay focused and productive!",
      });
    } catch (error) {
      console.error("Error starting focus session:", error);
      toast.error("Failed to start focus session");
    }
  };

  const handleSessionSummaryClose = () => {
    setShowSessionSummary(false);
    navigate("/dashboard");
  };

  // Use sessionTasks.length as denominator for progress and task count
  const safeProgress = useMemo(() => {
    try {
      if (sessionTasks.length === 0) return 0;
      const completedCount = Math.max(0, completedTasks.length);
      const totalCount = Math.max(1, sessionTasks.length);
      const progress = Math.min(100, (completedCount / totalCount) * 100);
      return Math.round(progress);
    } catch (error) {
      console.error("Error calculating progress:", error);
      return 0;
    }
  }, [completedTasks.length, sessionTasks.length]);

  // Reset current task index when tasks change
  useEffect(() => {
    if (processedTasks.length === 0) {
      setSelectedTask(null);
      return;
    }

    // If current index is out of bounds, reset to 0
    if (safeCurrentTaskIndex >= processedTasks.length) {
      setSelectedTask(processedTasks[0]);
    }
  }, [processedTasks.length]);

  // Handle initial state based on available tasks
  useEffect(() => {
    if (
      processedTasks.length === 0 &&
      !showWelcome &&
      !showSessionSummary &&
      !showCompletionScreen
    ) {
      setShowInitialCompletionScreen(true);
    }
  }, [
    processedTasks.length,
    showWelcome,
    showSessionSummary,
    showCompletionScreen,
  ]);

  // Enhanced browser navigation blocking
  useEffect(() => {
    if (!focusLockEnabled) return;

    const handlePopState = (event: PopStateEvent) => {
      if (focusLockEnabled) {
        // Prevent navigation
        event.preventDefault();
        window.history.pushState(null, "", "/focus");
        toast.error("Focus Lock is active", {
          description: "Disable Focus Lock to navigate away (Cmd/Ctrl + L)",
          duration: 3000,
        });
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (focusLockEnabled) {
        event.preventDefault();
        event.returnValue =
          "Focus Lock is active. Are you sure you want to leave?";
        return event.returnValue;
      }
    };

    // Enhanced keyboard blocking for exit attempts
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!focusLockEnabled) return;

      // Block common exit shortcuts
      const blockedKeys = [
        "F5", // Refresh
        "F11", // Fullscreen toggle
        "Tab", // Alt+Tab preparation
      ];

      const blockedCombinations = [
        event.altKey && event.key === "F4", // Alt+F4 (Windows)
        event.metaKey && event.key === "w", // Cmd+W (Mac)
        event.ctrlKey && event.key === "w", // Ctrl+W (Windows)
        event.metaKey && event.key === "q", // Cmd+Q (Mac)
        event.altKey && event.key === "Tab", // Alt+Tab
        event.metaKey && event.key === "Tab", // Cmd+Tab
        event.ctrlKey && event.key === "r", // Ctrl+R (Refresh)
        event.metaKey && event.key === "r", // Cmd+R (Refresh)
        event.ctrlKey && event.shiftKey && event.key === "I", // DevTools
        event.metaKey && event.altKey && event.key === "I", // DevTools Mac
      ];

      if (
        blockedKeys.includes(event.key) ||
        blockedCombinations.some((blocked) => blocked)
      ) {
        event.preventDefault();
        event.stopPropagation();
        toast.error("Focus Lock is active", {
          description:
            "This action is blocked. Disable Focus Lock first (Cmd/Ctrl + L)",
          duration: 2000,
        });
      }
    };

    // Push initial state
    window.history.pushState(null, "", "/focus");

    // Add event listeners
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("keydown", handleKeyDown, true); // Use capture phase

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [focusLockEnabled, navigate]);

  // Show welcome screen first
  if (showWelcome) {
    return (
      <FocusWelcome
        tasks={processedTasks}
        onStartFocus={handleStartFocus}
        backgroundImage={backgroundImage}
      />
    );
  }

  // Show session summary modal (highest priority after welcome)
  if (showSessionSummary) {
    return (
      <SessionSummaryModal
        isOpen={showSessionSummary}
        onClose={handleSessionSummaryClose}
        sessionData={{
          totalTime: getTotalFocusTime(),
          completedTasks: completedTasks.length,
          totalTasks: sessionTasks.length,
          intention: sessionIntention,
          taskTitle: selectedTask?.title || "Multiple tasks",
          pomodoroCount: completedPomodoros,
          currentStreak,
          longestStreak,
          sessionStartTime,
        }}
      />
    );
  }

  // New screen: All tasks done, Focus Lock was on and auto-disabled
  if (showAllTasksDoneInLockMode) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#FAF8F6] dark:bg-gray-900 z-50 flex items-center justify-center"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <Card className="w-full max-w-lg p-8 text-center relative backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
          <h2 className="text-3xl font-bold mb-4">
            ✨ All Tasks Completed! ✨
          </h2>
          <p className="text-muted-foreground mb-2">
            Fantastic work! You've finished all tasks in this focus session.
          </p>
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-6">
            Focus Lock has been automatically disabled.
          </p>
          <Button
            size="lg"
            onClick={handleEndFocusSession}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Exit & View Session Summary
          </Button>
        </Card>
      </motion.div>
    );
  }

  // New screen: All session tasks done, Focus Lock was not on (or already manually disabled)
  if (showAllSessionTasksDoneScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#FAF8F6] dark:bg-gray-900 z-50 flex items-center justify-center"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <Card className="w-full max-w-lg p-8 text-center relative backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
          <h2 className="text-3xl font-bold mb-4">
            🎉 All Session Tasks Done! 🎉
          </h2>
          <p className="text-muted-foreground mb-8">
            Excellent focus! You've completed all tasks for this session.
          </p>
          <Button
            size="lg"
            onClick={handleEndFocusSession}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            View Session Summary
          </Button>
        </Card>
      </motion.div>
    );
  }

  if (showInitialCompletionScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#FAF8F6] dark:bg-gray-900 z-50 flex items-center justify-center"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <Card className="w-full max-w-lg p-8 text-center relative backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
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
        className="fixed inset-0 bg-[#FAF8F6] dark:bg-gray-900 z-50 flex items-center justify-center"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <Card className="w-full max-w-lg p-8 text-center relative backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
          <h2 className="text-3xl font-bold mb-4">🎉 Task complete!</h2>
          <p className="text-muted-foreground mb-8">
            Great job! Would you like to end your focus session or stay in flow?
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleEndFocusSession}
              className="text-green-600 hover:bg-green-50"
            >
              End Session
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setShowCompletionScreen(false);
                handleNextTask();
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

  if (processedTasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#FAF8F6] dark:bg-gray-900 z-50 flex items-center justify-center"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <div className="text-center text-muted-foreground py-8 relative">
          <p className="text-lg mb-2">All tasks completed! 🎉</p>
          <p className="text-sm mb-4">
            Great job! Time to review your session.
          </p>
          <Button
            onClick={handleEndFocusSession}
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
          "fixed inset-0 z-50",
          !backgroundImage && "bg-[#FAF8F6] dark:bg-gray-900",
          focusLockEnabled && "ring-4 ring-red-500/20"
        )}
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: backgroundImage ? "cover" : undefined,
          backgroundPosition: backgroundImage ? "center" : undefined,
          backgroundRepeat: backgroundImage ? "no-repeat" : undefined,
        }}
      >
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-black/5 dark:bg-black/20" />

        <div className="h-full flex flex-col relative">
          {/* Mobile-Responsive Header with Progress */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b gap-3 sm:gap-0 bg-white/98 dark:bg-gray-900/98 backdrop-blur-md border-[#CDA351]/30 shadow-sm">
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
                  <Progress value={safeProgress} className="h-2" />
                </div>
                <span className="text-xs text-[#1A1A1A] dark:text-white whitespace-nowrap">
                  {completedTasks.length}/{sessionTasks.length}
                </span>
              </div>
            </div>

            {/* Desktop: Centered controls */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="w-32">
                <Progress value={safeProgress} className="h-2" />
                <p className="text-xs text-[#1A1A1A] dark:text-white mt-1 text-center">
                  {completedTasks.length} of {sessionTasks.length} tasks
                </p>
              </div>
              {/* Condensed Intention Reminder */}
              {sessionIntention && (
                <div className="max-w-xs">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#CDA351]/10 border border-[#CDA351]/20">
                    <span className="text-xs">✨</span>
                    <p className="text-xs text-[#CDA351] dark:text-[#CDA351] font-medium truncate">
                      {sessionIntention}
                    </p>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPomodoroMode(!isPomodoroMode)}
                className={cn(
                  "text-[#1A1A1A] dark:text-white hover:text-[#CDA351] dark:hover:text-[#CDA351]",
                  isPomodoroMode && "text-[#CDA351]"
                )}
              >
                <Timer className="mr-2 h-4 w-4" />
                Pomodoro
              </Button>
              <div className="flex items-center gap-2">
                <FocusLock
                  isLocked={focusLockEnabled}
                  onToggle={handleFocusLockToggle}
                />
                <QuickNoteButton
                  currentTaskId={selectedTask?.id}
                  currentTaskTitle={selectedTask?.title}
                  variant="ghost"
                  size="sm"
                />
              </div>
            </div>

            {/* Mobile: Secondary controls */}
            <div className="flex sm:hidden items-center justify-between w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPomodoroMode(!isPomodoroMode)}
                className={cn(
                  "text-[#1A1A1A] dark:text-white hover:text-[#CDA351] dark:hover:text-[#CDA351] text-sm",
                  isPomodoroMode && "text-[#CDA351]"
                )}
              >
                <Timer className="mr-2 h-4 w-4" />
                Pomodoro
              </Button>
              <div className="flex items-center gap-2">
                <FocusLock
                  isLocked={focusLockEnabled}
                  onToggle={handleFocusLockToggle}
                />
                <QuickNoteButton
                  currentTaskId={selectedTask?.id}
                  currentTaskTitle={selectedTask?.title}
                  variant="ghost"
                  size="sm"
                />
              </div>
            </div>

            {/* Mobile: Intention Reminder */}
            {sessionIntention && (
              <div className="flex sm:hidden justify-center w-full mt-2">
                <div className="max-w-sm">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#CDA351]/10 border border-[#CDA351]/20">
                    <span className="text-xs">✨</span>
                    <p className="text-xs text-[#CDA351] dark:text-[#CDA351] font-medium truncate">
                      {sessionIntention}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                    <p className="text-lg sm:text-xl text-white">
                      Take a deep breath...
                    </p>
                    <p className="text-sm text-white/80">
                      Ready for the next task?
                    </p>
                  </div>
                </motion.div>
              ) : selectedTask ? (
                <motion.div
                  key={selectedTask.id}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-2xl"
                >
                  <Card
                    className={cn(
                      "p-4 sm:p-8 hover:shadow-lg transition-shadow mx-2 sm:mx-0 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95",
                      focusLockEnabled && "ring-2 ring-red-500/20"
                    )}
                  >
                    <div className="space-y-4 sm:space-y-6">
                      {/* Intention Display - Always visible when intention is set */}
                      {sessionIntention && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-6 p-4 rounded-lg bg-gradient-to-r from-[#CDA351]/10 to-[#CDA351]/5 border border-[#CDA351]/20"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#CDA351]/20 flex items-center justify-center mt-0.5">
                              <motion.div
                                animate={{
                                  scale: [1, 1.1, 1],
                                  opacity: [0.8, 1, 0.8],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              >
                                ✨
                              </motion.div>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-medium text-[#CDA351] dark:text-[#CDA351] mb-1">
                                Your Intention
                              </h3>
                              <p className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                                "{sessionIntention}"
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Previous Intention Display - Show previous intention for context */}
                      {previousTaskIntention &&
                        previousTaskIntention !== sessionIntention && (
                          <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mt-0.5">
                                <span className="text-xs">🕐</span>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Previous Intention
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                  "{previousTaskIntention}"
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}

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
                          {selectedTask.title}
                        </h2>
                        {selectedTask.description && (
                          <p className="text-sm sm:text-base text-muted-foreground">
                            {selectedTask.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {selectedTask.priority && (
                            <span
                              className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${
                                selectedTask.priority === "high"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                                  : selectedTask.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                              }`}
                            >
                              {selectedTask.priority.charAt(0).toUpperCase() +
                                selectedTask.priority.slice(1)}{" "}
                              Priority
                            </span>
                          )}
                          {selectedTask.snoozedUntil && (
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
                            onClick={() => handleMarkDone(selectedTask.id)}
                            className="bg-green-600 hover:bg-green-700 text-white w-full h-12 text-base font-medium"
                          >
                            ✅ Mark Done
                          </Button>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => handlePostpone(selectedTask.id)}
                              className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 h-12"
                            >
                              💭 Tomorrow
                            </Button>
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => handleSnooze(selectedTask.id, 2)}
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
                            onClick={() => handleMarkDone(selectedTask.id)}
                            className="text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                          >
                            ✅ Done
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handlePostpone(selectedTask.id)}
                            className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                          >
                            💭 Tomorrow
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handleSnooze(selectedTask.id, 2)}
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
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    No Tasks Available
                  </h2>
                  <p className="text-white/80 text-sm sm:text-base">
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
          <div className="p-3 sm:p-4 text-center text-xs sm:text-sm border-t border-[#CDA351]/30 space-y-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm">
            {/* Desktop keyboard shortcuts */}
            <div className="hidden sm:flex flex-wrap justify-center gap-4">
              <span className="text-[#1A1A1A] dark:text-white">
                ←→ Navigate tasks
              </span>
              <span className="text-[#1A1A1A] dark:text-white">
                Space Mark done
              </span>
              <span className="text-[#1A1A1A] dark:text-white">
                ⌘⇧→ Postpone
              </span>
              <span className="text-[#1A1A1A] dark:text-white">⌘S Snooze</span>
              <span className="text-[#1A1A1A] dark:text-white">P Pomodoro</span>
            </div>
            {/* Mobile touch instructions */}
            <div className="sm:hidden">
              <span className="text-[#1A1A1A] dark:text-white">
                Tap buttons above to interact with tasks
              </span>
            </div>
            <p>
              {focusLockEnabled ? (
                <span className="text-red-500 font-medium">
                  Focus Lock is active - Exit disabled
                </span>
              ) : (
                <>
                  <span className="hidden sm:inline text-[#7E7E7E] dark:text-gray-400">
                    Press Esc to exit
                  </span>
                  <span className="sm:hidden text-[#7E7E7E] dark:text-gray-400">
                    Tap Exit to leave Focus Mode
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}
