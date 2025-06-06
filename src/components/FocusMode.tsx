import { useState, useEffect, useMemo, useCallback, memo } from "react";
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
  Eye,
  Calendar,
  Tag,
  Flag,
  StickyNote,
  BookOpen,
  FileText,
  Plus,
  Edit3,
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
  saveTaskIntention,
  getTaskIntention,
  verifyFocusSessionPersistence,
  debugFocusSessionData,
  getNotesByTaskId,
  deleteNote,
  addNote,
} from "@/lib/focusService";
import { updateDailyStatsForDate, getStreakData } from "@/lib/streakService";
import {
  useKeyboardShortcuts,
  type ShortcutAction,
  type KeyboardShortcut,
} from "@/hooks/useKeyboardShortcuts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Note } from "@/types";

interface FocusModeProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onFocusLockChange?: (locked: boolean) => void;
}

// Task Detail Modal Component
const TaskDetailModal = memo(
  ({
    task,
    isOpen,
    onClose,
  }: {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
  }) => {
    if (!task) return null;
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-ivory to-sand dark:from-gray-900 dark:to-gray-800 border-gold/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gold to-yellow-600 bg-clip-text text-transparent">
              Task Details
            </DialogTitle>
            <DialogDescription className="text-charcoal/70 dark:text-gray-300">
              Complete information about your task
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Task Title & Status */}
            <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gold/20">
              <h3 className="text-xl font-semibold text-charcoal dark:text-white mb-2 break-words">
                {task.title}
              </h3>
              {task.description && (
                <p className="text-softgrey dark:text-gray-300 text-sm leading-relaxed break-words">
                  {task.description}
                </p>
              )}
            </div>

            {/* Task Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gold/20">
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="h-4 w-4 text-gold" />
                  <span className="text-sm font-medium text-charcoal dark:text-white">
                    Priority
                  </span>
                </div>
                <Badge
                  className={cn(
                    "text-xs font-medium",
                    task.priority === "high"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200"
                      : task.priority === "medium"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200"
                      : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200"
                  )}
                >
                  {task.priority.charAt(0).toUpperCase() +
                    task.priority.slice(1)}{" "}
                  Priority
                </Badge>
              </div>

              {/* Due Date */}
              <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gold/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-gold" />
                  <span className="text-sm font-medium text-charcoal dark:text-white">
                    Due Date
                  </span>
                </div>
                <p className="text-sm text-softgrey dark:text-gray-300">
                  {task.dueDate
                    ? format(task.dueDate, "MMMM dd, yyyy 'at' h:mm a")
                    : "No due date set"}
                </p>
              </div>

              {/* Section */}
              <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gold/20">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-gold" />
                  <span className="text-sm font-medium text-charcoal dark:text-white">
                    Section
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs border-gold/30 text-gold"
                >
                  {task.section.charAt(0).toUpperCase() + task.section.slice(1)}
                </Badge>
              </div>

              {/* Created Date */}
              <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gold/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gold" />
                  <span className="text-sm font-medium text-charcoal dark:text-white">
                    Created
                  </span>
                </div>
                <p className="text-sm text-softgrey dark:text-gray-300">
                  {format(task.createdAt, "MMMM dd, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gold/20">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-gold" />
                  <span className="text-sm font-medium text-charcoal dark:text-white">
                    Tags
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs bg-gold/10 text-gold border-gold/30 hover:bg-gold/20 transition-colors"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Status Information */}
            {(task.completed || task.snoozedUntil) && (
              <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gold/20">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-gold" />
                  <span className="text-sm font-medium text-charcoal dark:text-white">
                    Status
                  </span>
                </div>
                <div className="space-y-2">
                  {task.completed && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200">
                        Completed
                      </Badge>
                      {task.completedAt && (
                        <span className="text-xs text-softgrey dark:text-gray-400">
                          on {format(task.completedAt, "MMM dd, yyyy")}
                        </span>
                      )}
                    </div>
                  )}
                  {task.snoozedUntil &&
                    isAfter(task.snoozedUntil, new Date()) && (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200">
                          Snoozed
                        </Badge>
                        <span className="text-xs text-softgrey dark:text-gray-400">
                          until{" "}
                          {format(
                            task.snoozedUntil,
                            "MMM dd, yyyy 'at' h:mm a"
                          )}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

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
  const [isMobile, setIsMobile] = useState(false);

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
  const [animationDirection, setAnimationDirection] = useState<
    "left" | "right"
  >("right");
  const [transitionMessage, setTransitionMessage] = useState("");
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
    "pomodoro" | "shortcuts" | "notes" | null
  >(null);

  // States for controlling pomodoro timer and quick notes
  const [pomodoroIsRunning, setPomodoroIsRunning] = useState(false);
  const [showQuickNoteDialog, setShowQuickNoteDialog] = useState(false);
  const [pomodoroToggleTrigger, setPomodoroToggleTrigger] = useState(false);
  const [pomodoroTimerActive, setPomodoroTimerActive] = useState(false);
  const [pomodoroSettingsOpen, setPomodoroSettingsOpen] = useState(false);

  // Task detail modal state
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const closeTaskDetail = useCallback(() => setShowTaskDetail(false), []);

  // Notes states
  const [taskNotes, setTaskNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");

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
      setAnimationDirection("right");
      setTransitionMessage("Moving to next task...");
      setSelectedTask(processedTasks[idx + 1]);
      showMindfulTransition();
    }
  };

  const handlePreviousTask = () => {
    if (!selectedTask) return;
    const idx = processedTasks.findIndex((t) => t.id === selectedTask.id);
    if (idx > 0) {
      setAnimationDirection("left");
      setTransitionMessage("Moving to previous task...");
      setSelectedTask(processedTasks[idx - 1]);
      showMindfulTransition();
    }
  };

  const handleExit = () => {
    if (focusLockEnabled) {
      toast.error("Focus lock is enabled. Disable it first to exit.");
      return;
    }

    // Immediate UI feedback and navigation
    setIsExiting(true);

    // Clear pomodoro timer state immediately
    localStorage.removeItem("pomodoroTimerState");
    setPomodoroTimerActive(false);
    setIsPomodoroMode(false);
    setShowSidePanel(false);
    setSidePanelContent(null);
    setPomodoroIsRunning(false);

    // Show immediate feedback
    toast.success("Exiting Focus Mode...", {
      description: "Session data is being saved",
      duration: 1500,
    });

    // Navigate immediately for better UX (with tiny delay for visual feedback)
    setTimeout(() => {
      navigate("/dashboard");
    }, 100);

    // Handle session cleanup asynchronously in the background
    // This won't block the UI or navigation
    handleEndFocusSessionAsync();
  };

  const handleEndFocusSessionAsync = async () => {
    if (!sessionId || !user?.uid) {
      console.warn("❌ Cannot end session: Missing session ID or user");
      return;
    }

    try {
      console.log(
        "🏁 Ending focus session in background:",
        sessionId,
        "for user:",
        user.uid
      );

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

      // Reset session state
      setSessionId(null);
      setSessionIntention("");
      setCompletedPomodoros(0);

      // Show success toast (user will see this on dashboard)
      toast.success("Focus session saved!", {
        description: `Total focus time: ${Math.floor(totalDuration / 60)}h ${
          totalDuration % 60
        }m`,
        duration: 3000,
      });
    } catch (error) {
      console.error("❌ Error ending focus session:", error);
      // Show error toast (user will see this on dashboard)
      toast.error("Session save failed", {
        description: "Your session data might not have been saved properly.",
        duration: 4000,
      });
    }
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

      // Set transition message and direction for moving to next task
      setAnimationDirection("right");
      setTransitionMessage("Task postponed. Moving to next task...");
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

      // Set transition message and direction for moving to next task
      setAnimationDirection("right");
      setTransitionMessage(
        `Task snoozed for ${hours} hour${
          hours > 1 ? "s" : ""
        }. Moving to next task...`
      );
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
      // Don't deactivate the timer - let it keep running in background
      // setPomodoroTimerActive(false);
    } else {
      // Open pomodoro side panel
      setShowSidePanel(true);
      setSidePanelContent("pomodoro");
      setIsPomodoroMode(true);
      // Only activate timer if it's not already active
      if (!pomodoroTimerActive) {
        setPomodoroTimerActive(true);
      }
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
      // Don't affect pomodoro mode when showing shortcuts
      // Keep the timer active if it was running
    }
  };

  // Function to handle notes panel toggle
  const handleToggleNotes = () => {
    if (showSidePanel && sidePanelContent === "notes") {
      // Close side panel if notes is already open
      setShowSidePanel(false);
      setSidePanelContent(null);
    } else {
      // Open notes side panel
      setShowSidePanel(true);
      setSidePanelContent("notes");
      // Load notes for current task when opening panel
      if (selectedTask) {
        loadTaskNotes(selectedTask.id);
      }
    }
  };

  // Load notes for the current task
  const loadTaskNotes = async (taskId: string) => {
    if (!taskId || !user) return;

    setNotesLoading(true);
    try {
      const notes = await getNotesByTaskId(taskId, user.uid);
      setTaskNotes(notes);
    } catch (error) {
      console.error("Error loading task notes:", error);
      toast.error("Failed to load task notes", {
        description: "Please try again",
      });
    } finally {
      setNotesLoading(false);
    }
  };

  // Save a new note for the current task
  const handleSaveNote = async () => {
    if (!selectedTask || !newNoteContent.trim() || !user) return;

    setIsSavingNote(true);
    try {
      await addNote(user.uid, newNoteContent.trim(), selectedTask.id);

      // Reload notes
      await loadTaskNotes(selectedTask.id);
      setNewNoteContent("");

      toast.success("Note saved!", {
        description: `Note added to "${selectedTask.title}"`,
      });
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note", {
        description: "Please try again",
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  // Delete a note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setTaskNotes((prev) => prev.filter((note) => note.id !== noteId));

      toast.success("Note deleted");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note", {
        description: "Please try again",
      });
    }
  };

  // Handle editing note
  const startEditingNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditNoteContent(note.content);
  };

  const saveEditedNote = async () => {
    if (!editingNoteId || !editNoteContent.trim()) return;

    try {
      // For now, we'll implement editing by deleting and recreating the note
      // This is a simple approach - in production you might want an updateNote function
      const noteToEdit = taskNotes.find((n) => n.id === editingNoteId);
      if (!noteToEdit || !selectedTask || !user) return;

      await deleteNote(editingNoteId);

      await addNote(user.uid, editNoteContent.trim(), selectedTask.id);

      // Reload notes
      await loadTaskNotes(selectedTask.id);
      setEditingNoteId(null);
      setEditNoteContent("");

      toast.success("Note updated!");
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note", {
        description: "Please try again",
      });
    }
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditNoteContent("");
  };

  // Function to handle pomodoro play/pause
  const handlePomodoroPlayPause = () => {
    if (!pomodoroTimerActive) {
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
    // This function now just calls the same instant exit pattern
    handleExit();
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
    // Task notes shortcut - Updated to use 'N' key
    {
      id: "toggle-task-notes",
      description: "Toggle Task Notes",
      category: "general",
      keys: {
        mac: ["n"],
        windows: ["n"],
      },
      action: handleToggleNotes,
      priority: 85,
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
      const streakData = await getStreakData(user.uid);
      setCurrentStreak(streakData.currentStreak);
      setLongestStreak(streakData.longestStreak);
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

      // Clear any existing pomodoro timer state to start fresh
      localStorage.removeItem("pomodoroTimerState");
      setPomodoroTimerActive(false);
      setIsPomodoroMode(false);
      setShowSidePanel(false);
      setSidePanelContent(null);
      setPomodoroIsRunning(false);

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

      // Update daily stats and streak when starting focus session
      try {
        const today = new Date().toISOString().split("T")[0];
        await updateDailyStatsForDate(user.uid, today);
        console.log("🔥 Daily stats and streak updated");
      } catch (error) {
        console.error("⚠️ Error updating daily stats and streak:", error);
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

  // Load notes when selected task changes and notes panel is open
  useEffect(() => {
    if (showSidePanel && sidePanelContent === "notes" && selectedTask) {
      loadTaskNotes(selectedTask.id);
    }
  }, [selectedTask?.id, showSidePanel, sidePanelContent]);

  // Check for mobile viewport on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Show welcome screen first
  if (showWelcome) {
    return (
      <FocusWelcome
        tasks={processedTasks}
        onStartFocus={handleStartFocus}
        backgroundImage={backgroundImage}
        onExit={handleExit}
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
        className="fixed inset-0 bg-gradient-to-br from-ivory to-sand dark:from-gray-900 dark:to-gray-800 z-50 flex items-center justify-center"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <Card className="w-full max-w-lg p-8 text-center relative backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 border-gold/30 shadow-xl">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-gold to-yellow-600 bg-clip-text text-transparent">
            ✨ All Tasks Completed! ✨
          </h2>
          <p className="text-charcoal/70 dark:text-gray-300 mb-2">
            Fantastic work! You've finished all tasks in this focus session.
          </p>
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-6">
            Focus Lock has been automatically disabled.
          </p>
          <Button
            size="lg"
            onClick={handleEndFocusSession}
            className="bg-gradient-to-r from-gold to-yellow-600 hover:from-gold/90 hover:to-yellow-600/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
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
        className="fixed inset-0 bg-gradient-to-br from-ivory to-sand dark:from-gray-900 dark:to-gray-800 z-50 flex items-center justify-center"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <Card className="w-full max-w-lg p-8 text-center relative backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 border-gold/30 shadow-xl">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-gold to-yellow-600 bg-clip-text text-transparent">
            🎉 All Session Tasks Done! 🎉
          </h2>
          <p className="text-charcoal/70 dark:text-gray-300 mb-8">
            Excellent focus! You've completed all tasks for this session.
          </p>
          <Button
            size="lg"
            onClick={handleEndFocusSession}
            className="bg-gradient-to-r from-gold to-yellow-600 hover:from-gold/90 hover:to-yellow-600/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
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
        className="fixed inset-0 bg-gradient-to-br from-ivory to-sand dark:from-gray-900 dark:to-gray-800 z-50 flex items-center justify-center"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <Card className="w-full max-w-lg p-8 text-center relative backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 border-gold/30 shadow-xl">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-gold to-yellow-600 bg-clip-text text-transparent">
            🎉 All tasks complete!
          </h2>
          <p className="text-charcoal/70 dark:text-gray-300 mb-8">
            Great job! You've completed all your tasks for today.
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 border-green-200 hover:border-green-300 shadow-md hover:shadow-lg transition-all duration-200"
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
        className="fixed inset-0 bg-gradient-to-br from-ivory to-sand dark:from-gray-900 dark:to-gray-800 z-50 flex items-center justify-center"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <Card className="w-full max-w-lg p-8 text-center relative backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 border-gold/30 shadow-xl">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-gold to-yellow-600 bg-clip-text text-transparent">
            🎉 Task complete!
          </h2>
          <p className="text-charcoal/70 dark:text-gray-300 mb-8">
            Great job! Would you like to end your focus session or stay in flow?
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleEndFocusSession}
              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 border-green-200 hover:border-green-300 shadow-md hover:shadow-lg transition-all duration-200"
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
              className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200 hover:border-blue-300 shadow-md hover:shadow-lg transition-all duration-200"
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
        className="fixed inset-0 bg-gradient-to-br from-ivory to-sand dark:from-gray-900 dark:to-gray-800 z-50 flex items-center justify-center"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <div className="text-center py-8 relative">
          <Card className="p-8 bg-white/95 dark:bg-gray-900/95 border-gold/30 shadow-xl backdrop-blur-sm">
            <p className="text-lg mb-2 text-charcoal dark:text-white">
              All tasks completed! 🎉
            </p>
            <p className="text-sm mb-4 text-charcoal/70 dark:text-gray-300">
              Great job! Time to review your session.
            </p>
            <Button
              onClick={handleEndFocusSession}
              variant="outline"
              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 border-green-200 hover:border-green-300 shadow-md hover:shadow-lg transition-all duration-200"
            >
              View Session Summary
            </Button>
          </Card>
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
          !backgroundImage &&
            "bg-gradient-to-br from-ivory to-sand dark:from-gray-900 dark:to-gray-800",
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
        <div className="absolute inset-0 bg-black/10 dark:bg-black/30" />

        <div className="h-full flex flex-col relative">
          {/* Mobile-Responsive Header with Progress */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b gap-3 sm:gap-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-gold/30 shadow-lg">
            {/* Mobile: Exit button and main controls */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExit}
                className={cn(
                  "text-charcoal dark:text-white hover:text-gold dark:hover:text-gold hover:bg-gold/10 transition-all duration-200 text-sm sm:text-base border border-transparent hover:border-gold/30 hover:shadow-md",
                  focusLockEnabled && "opacity-50 cursor-not-allowed",
                  isExiting && "opacity-75 animate-pulse"
                )}
                disabled={focusLockEnabled || isExiting}
              >
                <X className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">
                  {isExiting ? "Exiting..." : "Exit Focus Mode"}
                </span>
                <span className="sm:hidden">
                  {isExiting ? "Exiting..." : "Exit"}
                </span>
              </Button>

              {/* Mobile: Show progress inline */}
              <div className="flex items-center gap-2 sm:hidden">
                <div className="flex items-center gap-1 px-2 py-1 bg-gold/10 border border-gold/30 rounded text-xs font-medium text-gold">
                  <span>
                    Task {safeCurrentTaskIndex + 1}/{processedTasks.length}
                  </span>
                </div>
                <div className="w-16">
                  <Progress value={safeProgress} className="h-2" />
                </div>
                <span className="text-xs text-charcoal dark:text-white whitespace-nowrap">
                  {completedTasks.length}/{sessionTasks.length}
                </span>
              </div>
            </div>

            {/* Desktop: Centered controls */}
            <div className="hidden sm:flex items-center gap-4">
              {/* Task Position Indicator */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gold/10 border border-gold/30 rounded-lg hover:bg-gold/20 transition-colors">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousTask}
                  disabled={safeCurrentTaskIndex === 0}
                  className="h-6 w-6 p-0 text-gold hover:bg-gold/20 disabled:opacity-30 transition-all duration-200"
                >
                  <ArrowLeft className="h-3 w-3" />
                </Button>
                <span className="text-sm font-semibold text-gold min-w-fit px-2">
                  Task {safeCurrentTaskIndex + 1} of {processedTasks.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextTask}
                  disabled={safeCurrentTaskIndex === processedTasks.length - 1}
                  className="h-6 w-6 p-0 text-gold hover:bg-gold/20 disabled:opacity-30 transition-all duration-200"
                >
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="w-32">
                <Progress value={safeProgress} className="h-2" />
                <p className="text-xs text-charcoal dark:text-white mt-1 text-center">
                  {completedTasks.length} of {sessionTasks.length} completed
                </p>
              </div>
              {/* Condensed Intention Reminder */}
              {sessionIntention && (
                <div className="max-w-xs">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 hover:bg-gold/20 transition-colors">
                    <span className="text-xs">✨</span>
                    <p className="text-xs text-gold font-medium truncate">
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
                  "text-charcoal dark:text-white hover:text-gold dark:hover:text-gold hover:bg-gold/10 border border-transparent hover:border-gold/30 hover:shadow-md transition-all duration-200",
                  isPomodoroMode && "text-gold bg-gold/10 border-gold/30"
                )}
              >
                <Timer className="mr-2 h-4 w-4" />
                Pomodoro
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleNotes}
                className={cn(
                  "text-charcoal dark:text-white hover:text-gold dark:hover:text-gold hover:bg-gold/10 border border-transparent hover:border-gold/30 hover:shadow-md transition-all duration-200",
                  showSidePanel &&
                    sidePanelContent === "notes" &&
                    "text-gold bg-gold/10 border-gold/30"
                )}
              >
                <StickyNote className="mr-2 h-4 w-4" />
                Task Notes
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
                  "text-charcoal dark:text-white hover:text-gold dark:hover:text-gold hover:bg-gold/10 text-sm border border-transparent hover:border-gold/30 transition-all duration-200",
                  isPomodoroMode && "text-gold bg-gold/10 border-gold/30"
                )}
              >
                <Timer className="mr-2 h-4 w-4" />
                Pomodoro
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleNotes}
                className={cn(
                  "text-charcoal dark:text-white hover:text-gold dark:hover:text-gold hover:bg-gold/10 text-sm border border-transparent hover:border-gold/30 transition-all duration-200",
                  showSidePanel &&
                    sidePanelContent === "notes" &&
                    "text-gold bg-gold/10 border-gold/30"
                )}
              >
                <StickyNote className="mr-2 h-4 w-4" />
                Notes
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
                  className="text-charcoal dark:text-white hover:text-gold dark:hover:text-gold hover:bg-gold/10 border border-transparent hover:border-gold/30 transition-all duration-200"
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
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20">
                    <span className="text-xs">✨</span>
                    <p className="text-xs text-gold font-medium truncate">
                      {sessionIntention}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area - Now with proper 50:50 layout when pomodoro is active */}
          <div className="flex-1 flex relative overflow-hidden">
            {/* Main task content area */}
            <motion.div
              initial={false}
              animate={{
                width:
                  showSidePanel && sidePanelContent === "pomodoro"
                    ? isMobile
                      ? "0%"
                      : "50%"
                    : "100%",
                x: 0,
              }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0.0, 0.2, 1],
              }}
              className={cn(
                "flex items-center justify-center p-3 sm:p-4 overflow-y-auto",
                showSidePanel &&
                  sidePanelContent === "pomodoro" &&
                  !isMobile &&
                  "border-r border-gold/20",
                isMobile &&
                  showSidePanel &&
                  sidePanelContent === "pomodoro" &&
                  "hidden"
              )}
            >
              <AnimatePresence mode="wait">
                {showTransition ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg flex items-center justify-center"
                  >
                    <Card className="p-6 text-center backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-gold/30 shadow-xl">
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.8, 1, 0.8],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          scale: {
                            duration: 2.5,
                            ease: "easeInOut",
                          },
                        }}
                        className="text-4xl mb-4"
                      >
                        ✨
                      </motion.div>
                      <h2 className="text-xl font-semibold mb-2 text-gold">
                        {transitionMessage}
                      </h2>
                      <p className="text-sm text-charcoal/70 dark:text-gray-300">
                        Take a deep breath and prepare for the next task
                      </p>
                    </Card>
                  </motion.div>
                ) : selectedTask ? (
                  <motion.div
                    key={selectedTask.id}
                    initial={{
                      opacity: 0,
                      scale: 0.85,
                      rotateY: animationDirection === "right" ? 90 : -90,
                      x: animationDirection === "right" ? 100 : -100,
                    }}
                    animate={{
                      opacity: 1,
                      scale: [0.85, 1.05, 1],
                      rotateY: 0,
                      x: 0,
                    }}
                    exit={{
                      opacity: [1, 0.8, 0],
                      scale: [1, 1.05, 0.85],
                      rotateY: animationDirection === "right" ? -90 : 90,
                      x: animationDirection === "right" ? -100 : 100,
                    }}
                    transition={{
                      duration: 0.6,
                      ease: [0.215, 0.61, 0.355, 1],
                      scale: {
                        times: [0, 0.6, 1],
                        duration: 0.6,
                        ease: "easeOut",
                      },
                    }}
                    className="w-full max-w-md"
                  >
                    <Card className="p-4 sm:p-5 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-gold/30 shadow-xl hover:shadow-2xl transition-all duration-300">
                      <div className="flex flex-col space-y-4">
                        {/* Task Header - Compact */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 text-sm text-charcoal/70 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>
                              Due:{" "}
                              {format(
                                selectedTask.dueDate || selectedTask.createdAt,
                                "MMM dd"
                              )}
                            </span>
                          </div>
                          {selectedTask.priority && (
                            <Badge
                              className={cn(
                                "text-xs font-medium",
                                selectedTask.priority === "high"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200"
                                  : selectedTask.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200"
                              )}
                            >
                              {selectedTask.priority.charAt(0).toUpperCase() +
                                selectedTask.priority.slice(1)}
                            </Badge>
                          )}
                        </div>

                        {/* Task Title and Description - Compact */}
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold mb-2 leading-tight break-words text-charcoal dark:text-white">
                            {selectedTask.title}
                          </h2>
                          {selectedTask.description && (
                            <p className="text-sm text-charcoal/70 dark:text-gray-300 break-words line-clamp-2">
                              {selectedTask.description}
                            </p>
                          )}
                        </div>

                        {/* Tags - If any */}
                        {selectedTask.tags && selectedTask.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {selectedTask.tags.slice(0, 3).map((tag, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs bg-gold/10 text-gold border-gold/30"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {selectedTask.tags.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-gray-100 text-gray-600 border-gray-300"
                              >
                                +{selectedTask.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* View Details Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTaskDetail(true)}
                          className="w-full text-gold border-gold/30 hover:bg-gold/10 hover:border-gold/50 transition-all duration-200 hover:shadow-md"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Task Details
                        </Button>

                        {/* Action Buttons - Compact */}
                        <div className="space-y-3">
                          {/* Primary Action */}
                          <Button
                            size="lg"
                            onClick={() => handleMarkDone(selectedTask.id)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white h-10 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                          >
                            ✅ Mark Done
                          </Button>

                          {/* Secondary Actions */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePostpone(selectedTask.id)}
                              className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 h-9 text-xs border-blue-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
                            >
                              💭 Tomorrow
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSnooze(selectedTask.id, 2)}
                              className="text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20 h-9 text-xs border-purple-200 hover:border-purple-300 transition-all duration-200 hover:shadow-md"
                            >
                              💤 Snooze 2h
                            </Button>
                          </div>
                        </div>

                        {/* Mobile Navigation */}
                        <div className="flex sm:hidden justify-between items-center pt-3 border-t border-gold/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePreviousTask}
                            disabled={safeCurrentTaskIndex === 0}
                            className="flex-1 text-charcoal/70 dark:text-gray-400 hover:text-gold hover:bg-gold/10 transition-all duration-200"
                          >
                            ← Previous
                          </Button>
                          <div className="px-4 text-sm text-charcoal/70 dark:text-gray-400">
                            {safeCurrentTaskIndex + 1} of{" "}
                            {processedTasks.length}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleNextTask}
                            disabled={
                              safeCurrentTaskIndex === processedTasks.length - 1
                            }
                            className="flex-1 text-charcoal/70 dark:text-gray-400 hover:text-gold hover:bg-gold/10 transition-all duration-200"
                          >
                            Next →
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ) : (
                  <div className="text-center text-charcoal/70 dark:text-gray-400">
                    <p>No task selected</p>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Pomodoro Panel - Now integrated as proper 50% split */}
            <AnimatePresence>
              {showSidePanel && sidePanelContent === "pomodoro" && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{
                    width: isMobile ? "100%" : "50%",
                    opacity: 1,
                  }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.4, 0.0, 0.2, 1],
                  }}
                  className={cn(
                    "bg-card flex flex-col overflow-hidden",
                    isMobile && "absolute inset-0 z-50"
                  )}
                >
                  {/* Pomodoro Panel Header */}
                  <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-muted/50 shrink-0">
                    <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A] dark:text-white">
                      Pomodoro Timer
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleTogglePomodoro}
                      className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Pomodoro Content */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.2,
                      delay: 0.1,
                      ease: "easeOut",
                    }}
                    className="flex-1 overflow-y-auto p-3 sm:p-4"
                  >
                    <div className="flex items-center justify-center h-full min-h-0">
                      {/* Show the same timer instance but make it visible */}
                      <div className="w-full max-w-sm">
                        <PomodoroTimer
                          isActive={pomodoroTimerActive}
                          onComplete={handlePomodoroComplete}
                          externalToggle={pomodoroToggleTrigger}
                          onToggleChange={setPomodoroIsRunning}
                          onSettingsToggle={setPomodoroSettingsOpen}
                        />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shortcuts Panel - Keep as overlay for now */}
            <AnimatePresence>
              {showSidePanel && sidePanelContent === "shortcuts" && (
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l shadow-xl z-50 flex flex-col"
                >
                  {/* Side Panel Header */}
                  <div className="flex items-center justify-between p-4 border-b bg-muted/50">
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

                  {/* Side Panel Content */}
                  <div className="flex-1 overflow-y-auto">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-4 h-full"
                    >
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
                              <div className="flex gap-1">
                                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  P
                                </kbd>
                              </div>
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
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Task Notes
                              </span>
                              <div className="flex gap-1">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes Panel - Slides from left as overlay */}
            <AnimatePresence>
              {showSidePanel && sidePanelContent === "notes" && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed left-0 top-0 bottom-0 w-full sm:w-80 md:w-96 lg:w-80 bg-card border-r shadow-xl z-50 flex flex-col"
                >
                  {/* Notes Panel Header */}
                  <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-muted/50 flex-shrink-0">
                    <h2 className="text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
                      <StickyNote className="h-4 w-4 sm:h-5 sm:w-5 text-gold" />
                      <span className="text-sm sm:text-base">Task Notes</span>
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleNotes}
                      className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Notes Panel Content */}
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-3 sm:p-4 h-full flex flex-col"
                    >
                      {selectedTask ? (
                        <div className="flex flex-col h-full space-y-3 sm:space-y-4">
                          {/* Task Info Header */}
                          <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-700 flex-shrink-0">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-xs sm:text-sm">
                              {selectedTask.title}
                            </h3>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              Notes for this task
                            </p>
                          </div>

                          {/* Add New Note */}
                          <div className="space-y-2 sm:space-y-3 flex-shrink-0">
                            <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                              Add a note:
                            </label>
                            <Textarea
                              value={newNoteContent}
                              onChange={(e) =>
                                setNewNoteContent(e.target.value)
                              }
                              placeholder="Write your note here..."
                              className="min-h-[60px] sm:min-h-[80px] resize-none text-xs sm:text-sm"
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  (e.metaKey || e.ctrlKey)
                                ) {
                                  e.preventDefault();
                                  handleSaveNote();
                                }
                              }}
                            />
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {newNoteContent.length}/500 chars •
                                Cmd/Ctrl+Enter to save
                              </span>
                              <Button
                                size="sm"
                                onClick={handleSaveNote}
                                disabled={
                                  !newNoteContent.trim() || isSavingNote
                                }
                                className="bg-gold hover:bg-gold/90 text-white text-xs px-3 py-1.5 w-full sm:w-auto"
                              >
                                {isSavingNote ? "Saving..." : "Save Note"}
                              </Button>
                            </div>
                          </div>

                          {/* Notes List */}
                          <div className="flex flex-col flex-1 space-y-2 sm:space-y-3 min-h-0">
                            <div className="flex items-center justify-between flex-shrink-0">
                              <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                                Existing Notes
                              </h4>
                              <span className="text-xs text-gray-500">
                                {taskNotes.length} note
                                {taskNotes.length !== 1 ? "s" : ""}
                              </span>
                            </div>

                            {notesLoading ? (
                              <div className="flex items-center justify-center py-6 sm:py-8">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : taskNotes.length === 0 ? (
                              <div className="text-center py-6 sm:py-8">
                                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-xs sm:text-sm text-gray-500">
                                  No notes yet
                                </p>
                                <p className="text-xs text-gray-400">
                                  Add your first note above
                                </p>
                              </div>
                            ) : (
                              <div className="flex-1 overflow-y-auto min-h-0">
                                <div className="space-y-2 sm:space-y-3 pr-1 sm:pr-2">
                                  {taskNotes.map((note) => (
                                    <div
                                      key={note.id}
                                      className="p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group hover:shadow-md transition-shadow"
                                    >
                                      {editingNoteId === note.id ? (
                                        <div className="space-y-2">
                                          <Textarea
                                            value={editNoteContent}
                                            onChange={(e) =>
                                              setEditNoteContent(e.target.value)
                                            }
                                            className="min-h-[50px] sm:min-h-[60px] text-xs sm:text-sm"
                                          />
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              onClick={saveEditedNote}
                                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 flex-1 sm:flex-none"
                                            >
                                              Save
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={cancelEditingNote}
                                              className="text-xs px-2 py-1 flex-1 sm:flex-none"
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs text-gray-500">
                                              {format(
                                                note.createdAt,
                                                "MMM d, h:mm a"
                                              )}
                                            </span>
                                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                  startEditingNote(note)
                                                }
                                                className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-blue-100 text-blue-600"
                                              >
                                                <Edit3 className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                  handleDeleteNote(note.id)
                                                }
                                                className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-red-100 text-red-600"
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                            {note.content}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <StickyNote className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-xs sm:text-sm text-gray-500">
                              No task selected
                            </p>
                            <p className="text-xs text-gray-400">
                              Select a task to view its notes
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shortcuts Panel - Mobile responsive overlay */}
            <AnimatePresence>
              {showSidePanel && sidePanelContent === "shortcuts" && (
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed right-0 top-0 bottom-0 w-full sm:w-80 md:w-96 lg:w-80 bg-card border-l shadow-xl z-50 flex flex-col"
                >
                  {/* Side Panel Header */}
                  <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-muted/50 flex-shrink-0">
                    <h2 className="text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-white">
                      <span className="text-sm sm:text-base">
                        Keyboard Shortcuts
                      </span>
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleShortcuts}
                      className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Side Panel Content */}
                  <div className="flex-1 overflow-y-auto">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-3 sm:p-4 h-full"
                    >
                      {/* Shortcuts organized by category */}
                      <div className="space-y-4 sm:space-y-6">
                        {/* Task Actions */}
                        <div>
                          <h3 className="text-xs sm:text-sm font-semibold text-[#CDA351] uppercase tracking-wide mb-2 sm:mb-3">
                            Task Actions
                          </h3>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                Complete Task
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  Enter
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                Pomodoro Play/Pause
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  Space
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                Snooze Task (2h)
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  S
                                </kbd>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Navigation */}
                        <div>
                          <h3 className="text-xs sm:text-sm font-semibold text-[#CDA351] uppercase tracking-wide mb-2 sm:mb-3">
                            Navigation
                          </h3>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                Next Task
                              </span>
                              <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                →
                              </kbd>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                Previous Task
                              </span>
                              <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                ←
                              </kbd>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                Exit Focus Mode
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  Esc
                                </kbd>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Focus Tools */}
                        <div>
                          <h3 className="text-xs sm:text-sm font-semibold text-[#CDA351] uppercase tracking-wide mb-2 sm:mb-3">
                            Focus Tools
                          </h3>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                Toggle Pomodoro
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  P
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                Toggle Focus Lock
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  L
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                Show/Hide Shortcuts
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  /
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                Quick Note
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  ⌘
                                </kbd>
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  Ctrl
                                </kbd>
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  N
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                Task Notes
                              </span>
                              <div className="flex gap-1">
                                <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                  N
                                </kbd>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer tip */}
                      <div className="mt-6 sm:mt-8 p-2 sm:p-3 bg-[#CDA351]/10 rounded-lg border border-[#CDA351]/20">
                        <p className="text-xs text-[#CDA351] font-medium">
                          💡 Tip: These shortcuts work even when Focus Lock is
                          enabled (except exit shortcuts)
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Floating Pomodoro Indicator - Shows when timer is running in background */}
          {pomodoroTimerActive &&
            (!showSidePanel || sidePanelContent !== "pomodoro") && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed bottom-4 right-4 z-40"
              >
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={handleTogglePomodoro}
                  className="flex items-center gap-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-gold/30 hover:bg-gold/10 hover:border-gold/50 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.05]"
                >
                  <Timer className="h-3 w-3 sm:h-4 sm:w-4 text-gold" />
                  <span className="text-xs sm:text-sm font-medium text-gold">
                    {pomodoroIsRunning ? "Running" : "Paused"}
                  </span>
                  {pomodoroIsRunning && (
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gold rounded-full animate-pulse" />
                  )}
                </Button>
              </motion.div>
            )}

          {/* Enhanced Mobile-Responsive Navigation Hints - Simplified */}
          <div className="p-3 sm:p-4 text-center text-xs sm:text-sm border-t border-gold/30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleShortcuts}
                className="text-xs text-charcoal/70 dark:text-gray-400 hover:text-gold hover:bg-gold/10 border border-transparent hover:border-gold/30 transition-all duration-200 hover:shadow-md px-2 sm:px-3 py-1.5"
              >
                <span className="mr-1 text-sm">⌘</span>
                <span className="hidden xs:inline">View Shortcuts</span>
                <span className="xs:hidden">Shortcuts</span>
                <span className="hidden sm:inline ml-1">(Press ⌘+/)</span>
              </Button>
              {focusLockEnabled ? (
                <span className="text-red-500 font-medium text-xs bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-full border border-red-200 dark:border-red-800">
                  🔒 <span className="hidden xs:inline">Focus Lock Active</span>
                  <span className="xs:hidden">Locked</span>
                </span>
              ) : (
                <span className="hidden sm:block text-charcoal/50 dark:text-gray-500 text-xs">
                  Press keyboard shortcuts to navigate
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Task Detail Modal */}
        <TaskDetailModal
          task={selectedTask}
          isOpen={showTaskDetail}
          onClose={closeTaskDetail}
        />
      </motion.div>
    </>
  );
}
