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
  debugFocusSessionData,
  verifyFocusSessionPersistence,
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
  const [showShortcuts, setShowShortcuts] = useState(false);
  // New states for enhanced layout
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [sidePanelContent, setSidePanelContent] = useState<
    "pomodoro" | "shortcuts" | null
  >(null);

  // States for controlling pomodoro timer and quick notes
  const [pomodoroIsRunning, setPomodoroIsRunning] = useState(false);
  const [showQuickNoteDialog, setShowQuickNoteDialog] = useState(false);
  const [pomodoroToggleTrigger, setPomodoroToggleTrigger] = useState(false);

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

  // Helper functions for side panel management
  const handleTogglePomodoro = () => {
    if (showSidePanel && sidePanelContent === "pomodoro") {
      // Close side panel if pomodoro is already open
      setShowSidePanel(false);
      setSidePanelContent(null);
      setIsPomodoroMode(false);
    } else {
      // Open pomodoro side panel
      setShowSidePanel(true);
      setSidePanelContent("pomodoro");
      setIsPomodoroMode(true);
      setShowShortcuts(false);
    }
  };

  const handleToggleShortcuts = () => {
    if (showSidePanel && sidePanelContent === "shortcuts") {
      // Close side panel if shortcuts is already open
      setShowSidePanel(false);
      setSidePanelContent(null);
      setShowShortcuts(false);
    } else {
      // Open shortcuts side panel
      setShowSidePanel(true);
      setSidePanelContent("shortcuts");
      setShowShortcuts(true);
      setIsPomodoroMode(false);
    }
  };

  // Function to handle pomodoro play/pause
  const handlePomodoroPlayPause = () => {
    if (!isPomodoroMode) {
      toast.error("Pomodoro timer is not active", {
        description: "Press 'P' to open the Pomodoro timer first",
      });
      return;
    }
    // Trigger the external toggle by incrementing the trigger value
    setPomodoroToggleTrigger((prev) => !prev);
  };

  // Function to handle quick note shortcut
  const handleQuickNoteShortcut = () => {
    setShowQuickNoteDialog(true);
  };

  const handleEndFocusSession = async () => {
    if (!sessionId || !user) {
      console.warn("❌ Cannot end session: Missing session ID or user");
      navigate("/dashboard");
      return;
    }

    if (!user.uid) {
      console.error("❌ Cannot end session: User ID is missing");
      toast.error("Authentication error", {
        description: "User ID is missing. Session may not be saved properly.",
      });
      navigate("/dashboard");
      return;
    }

    try {
      console.log("🏁 Ending focus session:", sessionId, "for user:", user.uid);

      // Verify session exists before ending
      const sessionExists = await verifyFocusSessionPersistence(sessionId);
      if (!sessionExists) {
        throw new Error("Focus session not found in Firebase before ending");
      }

      const endTime = new Date();
      const totalDuration = Math.floor(
        (endTime.getTime() - sessionStartTime.getTime()) / (1000 * 60)
      ); // in minutes

      console.log("⏱️ Session duration:", totalDuration, "minutes");
      console.log("🍅 Completed pomodoros:", completedPomodoros);

      // Get session notes if any
      const sessionNotes: string[] = []; // You can implement note collection if needed

      // End the focus session with proper persistence
      await endFocusSession(
        sessionId,
        totalDuration,
        sessionNotes,
        completedPomodoros
      );

      // Verify the session was ended successfully
      const verifiedAfterEnd = await verifyFocusSessionPersistence(sessionId);
      if (!verifiedAfterEnd) {
        throw new Error("Focus session verification failed after ending");
      }

      console.log(
        "✅ Focus session ended successfully. Duration:",
        totalDuration,
        "minutes"
      );

      // Debug user's focus session data after ending
      await debugFocusSessionData(user.uid);

      // Show session summary with all the data
      setShowSessionSummary(true);

      // Reset session state
      setSessionId(null);
      setSessionIntention("");
      setCompletedPomodoros(0);

      toast.success("Focus session completed!", {
        description: `Total focus time: ${Math.floor(totalDuration / 60)}h ${
          totalDuration % 60
        }m`,
      });
    } catch (error) {
      console.error("❌ Error ending focus session:", error);
      toast.error("Failed to save focus session", {
        description: "Your session data might not have been saved properly.",
      });
      // Still navigate away even if there's an error
      navigate("/dashboard");
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
    // Cmd/Ctrl+Enter for completing task
    {
      id: "complete-task",
      description: "Complete Current Task",
      category: "tasks",
      keys: {
        mac: ["meta", "enter"],
        windows: ["ctrl", "enter"],
      },
      action: () => selectedTask && handleMarkDone(selectedTask.id),
      priority: 85,
      allowInModal: false,
    },
    // Space for pomodoro play/pause
    {
      id: "pomodoro-play-pause",
      description: "Pomodoro Play/Pause",
      category: "tasks",
      keys: {
        mac: ["space"],
        windows: ["space"],
      },
      action: handlePomodoroPlayPause,
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
      action: handleTogglePomodoro,
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
    // Show shortcuts panel
    {
      id: "show-shortcuts",
      description: "Show/Hide Shortcuts",
      category: "general",
      keys: {
        mac: ["meta", "/"],
        windows: ["ctrl", "/"],
      },
      action: handleToggleShortcuts,
      priority: 95,
      allowInModal: true,
    },
    // Quick note shortcut
    {
      id: "quick-note",
      description: "Quick Note",
      category: "general",
      keys: {
        mac: ["meta", "ctrl", "n"],
        windows: ["ctrl", "alt", "n"],
      },
      action: handleQuickNoteShortcut,
      priority: 85,
      allowInModal: true,
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
    if (!user) {
      console.error("❌ Cannot start focus session: User not authenticated");
      toast.error("Authentication required", {
        description: "Please sign in to start a focus session",
      });
      return;
    }

    if (!user.uid) {
      console.error("❌ Cannot start focus session: User ID is missing");
      toast.error("Authentication error", {
        description: "User ID is missing. Please try signing in again.",
      });
      return;
    }

    try {
      console.log("🚀 Starting focus session for user:", user.uid);
      console.log("📋 Task:", task.id, "Intention:", intention);

      // Debug current user's focus session data
      await debugFocusSessionData(user.uid);

      // Load previous intention for this task
      try {
        const previousIntention = await getTaskIntention(task.id);
        setPreviousTaskIntention(previousIntention?.intention || null);
        console.log(
          "💭 Previous intention loaded:",
          previousIntention?.intention
        );
      } catch (error) {
        console.error("⚠️ Error loading previous intention:", error);
      }

      // Store the initial session tasks (all tasks for today at session start)
      setSessionTasks(processedTasks);
      setSelectedTask(task);
      setShowWelcome(false);
      setSessionStartTime(new Date());
      setSessionIntention(intention || "");

      // Create focus session with proper error handling
      console.log("🔥 Creating focus session...");
      const sessionId = await createFocusSession(
        user.uid,
        task.id,
        intention,
        backgroundImage
      );
      console.log("✅ Focus session created with ID:", sessionId);
      setSessionId(sessionId);

      // Verify the session was created successfully
      const verified = await verifyFocusSessionPersistence(sessionId);
      if (!verified) {
        throw new Error("Focus session was not properly saved to Firebase");
      }

      // Save task intention if provided
      if (intention) {
        try {
          await saveTaskIntention(task.id, intention, new Date());
          console.log("💾 Task intention saved successfully");
        } catch (error) {
          console.error("⚠️ Error saving task intention:", error);
          // Don't fail the entire session start if intention save fails
        }
      }

      // Update user streak
      try {
        const updatedStreak = await updateUserStreak(user.uid);
        setCurrentStreak(updatedStreak.currentStreak);
        setLongestStreak(updatedStreak.longestStreak);
        console.log("🔥 User streak updated:", updatedStreak);
      } catch (error) {
        console.error("⚠️ Error updating user streak:", error);
        // Don't fail the entire session start if streak update fails
      }

      toast.success("Focus session started!", {
        description: intention
          ? "Good luck with your intention!"
          : "Stay focused and productive!",
      });
    } catch (error) {
      console.error("❌ Error starting focus session:", error);
      toast.error("Failed to start focus session", {
        description: "Please try again. Check your internet connection.",
      });
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
                onClick={handleTogglePomodoro}
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
                onClick={handleTogglePomodoro}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleShortcuts}
                  className="text-[#1A1A1A] dark:text-white hover:text-[#CDA351] dark:hover:text-[#CDA351]"
                >
                  <span className="text-lg">⌘</span>
                </Button>
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
          </div>

          {/* Main Content Area - Now with 2x1 layout when side panel is open */}
          <div className="flex-1 flex relative overflow-hidden">
            {/* Main task content area */}
            <motion.div
              initial={false}
              animate={{
                width: showSidePanel ? "60%" : "100%",
                x: 0,
              }}
              transition={{
                duration: 0.4,
                ease: "easeInOut",
              }}
              className="flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            >
              <AnimatePresence mode="wait">
                {selectedTask ? (
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
                      <div className="space-y-4 sm:space-y-6 max-h-[80vh] overflow-y-auto">
                        {/* Intention Display - Always visible when intention is set */}
                        {sessionIntention && (
                          <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-3 sm:p-4 rounded-lg bg-gradient-to-r from-[#CDA351]/10 to-[#CDA351]/5 border border-[#CDA351]/20"
                          >
                            <div className="flex items-start gap-2 sm:gap-3">
                              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#CDA351]/20 flex items-center justify-center mt-0.5">
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
                                  className="text-xs sm:text-sm"
                                >
                                  ✨
                                </motion.div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-xs sm:text-sm font-medium text-[#CDA351] dark:text-[#CDA351] mb-1">
                                  Your Intention
                                </h3>
                                <p className="text-sm sm:text-base font-medium text-gray-800 dark:text-gray-200 leading-relaxed break-words">
                                  "{sessionIntention}"
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Previous Intention Display - Compact version for better UX */}
                        {previousTaskIntention &&
                          previousTaskIntention !== sessionIntention && (
                            <motion.div
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="mb-3 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mt-0.5">
                                  <span className="text-xs">🕐</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Previous Intention
                                  </h4>
                                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 italic break-words line-clamp-2">
                                    "{previousTaskIntention}"
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          )}

                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold mb-2 leading-tight break-words">
                            {selectedTask.title}
                          </h2>
                          {selectedTask.description && (
                            <p className="text-sm sm:text-base text-muted-foreground break-words">
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

                        {/* Mobile-Optimized Action Buttons - Always at bottom */}
                        <div className="pt-4 mt-auto">
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
                            {safeCurrentTaskIndex + 1} of{" "}
                            {processedTasks.length}
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
                  <div className="text-center text-muted-foreground">
                    <p>No task selected</p>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Side Panel - Pomodoro Timer or Shortcuts */}
            <AnimatePresence>
              {showSidePanel && (
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: "easeInOut",
                  }}
                  className="w-[40%] border-l border-[#CDA351]/30 bg-white/98 dark:bg-gray-900/98 backdrop-blur-md overflow-y-auto"
                >
                  {sidePanelContent === "pomodoro" && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-4 h-full"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-[#1A1A1A] dark:text-white">
                          Pomodoro Timer
                        </h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleTogglePomodoro}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-center h-full">
                        <PomodoroTimer
                          isActive={isPomodoroMode}
                          onComplete={handlePomodoroComplete}
                          externalToggle={pomodoroToggleTrigger}
                          onToggleChange={setPomodoroIsRunning}
                        />
                      </div>
                    </motion.div>
                  )}

                  {sidePanelContent === "shortcuts" && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-4 h-full"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-[#1A1A1A] dark:text-white">
                          Keyboard Shortcuts
                        </h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleToggleShortcuts}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Shortcuts organized by category */}
                      <div className="space-y-6">
                        {/* Task Actions */}
                        <div>
                          <h3 className="text-sm font-semibold text-[#CDA351] uppercase tracking-wide mb-3">
                            Task Actions
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Complete Task
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  Enter
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Pomodoro Play/Pause
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  Space
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Snooze Task (2h)
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  S
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Postpone to Tomorrow
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⇧
                                </kbd>
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  →
                                </kbd>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Navigation */}
                        <div>
                          <h3 className="text-sm font-semibold text-[#CDA351] uppercase tracking-wide mb-3">
                            Navigation
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Next Task
                              </span>
                              <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                →
                              </kbd>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Previous Task
                              </span>
                              <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                ←
                              </kbd>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Exit Focus Mode
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  Esc
                                </kbd>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Focus Tools */}
                        <div>
                          <h3 className="text-sm font-semibold text-[#CDA351] uppercase tracking-wide mb-3">
                            Focus Tools
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Toggle Pomodoro
                              </span>
                              <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                P
                              </kbd>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Toggle Focus Lock
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  L
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Show/Hide Shortcuts
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  /
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Quick Note
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  Ctrl
                                </kbd>
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  N
                                </kbd>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer tip */}
                      <div className="mt-8 p-3 bg-[#CDA351]/10 rounded-lg border border-[#CDA351]/20">
                        <p className="text-xs text-[#CDA351] font-medium">
                          💡 Tip: These shortcuts work even when Focus Lock is
                          enabled (except exit shortcuts)
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* External Quick Note Dialog */}
          <QuickNoteButton
            currentTaskId={selectedTask?.id}
            currentTaskTitle={selectedTask?.title}
            open={showQuickNoteDialog}
            onOpenChange={setShowQuickNoteDialog}
          />

          {/* Enhanced Mobile-Responsive Navigation Hints - Simplified */}
          <div className="p-3 sm:p-4 text-center text-xs sm:text-sm border-t border-[#CDA351]/30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleShortcuts}
                className="text-xs text-muted-foreground hover:text-[#CDA351] transition-colors"
              >
                <span className="mr-1">⌘</span>
                View Shortcuts (Press ⌘+/ for shortcuts)
              </Button>
              {focusLockEnabled ? (
                <span className="text-red-500 font-medium text-xs">
                  🔒 Focus Lock Active
                </span>
              ) : (
                <span className="text-muted-foreground text-xs"></span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
