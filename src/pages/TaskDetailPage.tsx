import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getTaskById } from "@/lib/taskService";
import {
  getNotesByTaskId,
  deleteNote,
  getFocusSessionsByTaskId,
  getTaskIntention,
} from "@/lib/focusService";
import {
  generateInsights,
  getTaskInsights,
  initializeDefaultInsightRules,
} from "@/lib/insightsService";
import { Task, Note, FocusSession, TaskIntention, TaskInsight } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NavBar from "@/components/NavBar";
import { QuickNoteButton } from "@/components/QuickNoteButton";
import { toast } from "sonner";
import { format, formatDistanceToNow, formatDuration } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Tag,
  CheckCircle2,
  StickyNote,
  Trash2,
  FileText,
  AlertCircle,
  Timer,
  Coffee,
  Target,
  Brain,
  TrendingUp,
  BarChart3,
  PauseCircle,
  PlayCircle,
  Lightbulb,
  Zap,
  Activity,
  Flame,
  Battery,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
} from "firebase/firestore";
import {
  useKeyboardShortcuts,
  type ShortcutAction,
  type KeyboardShortcut,
  createGlobalShortcuts,
} from "@/hooks/useKeyboardShortcuts";
import { useTheme } from "next-themes";

// Debug function to test task access
const debugTaskAccess = async (taskId: string, userId: string) => {
  try {
    console.log("=== DEBUG: Testing task access ===");
    console.log("TaskId:", taskId);
    console.log("UserId:", userId);

    // Import getTasks to check if user has any tasks
    const { getTasks } = await import("@/lib/taskService");
    const allUserTasks = await getTasks(userId);
    console.log("User's tasks:", allUserTasks);
    console.log("User has", allUserTasks.length, "tasks");

    // Check if the specific task exists in user's tasks
    const taskExists = allUserTasks.find((task) => task.id === taskId);
    console.log("Task exists in user's tasks:", !!taskExists);
    if (taskExists) {
      console.log("Found task:", taskExists);
    }

    // Try direct access
    const directTask = await getTaskById(taskId);
    console.log("Direct task access result:", directTask);

    console.log("=== DEBUG END ===");
    return { allUserTasks, taskExists, directTask };
  } catch (error) {
    console.error("=== DEBUG ERROR ===", error);
    throw error;
  }
};

const TaskDetailPage = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [taskIntention, setTaskIntention] = useState<TaskIntention | null>(
    null
  );
  const [taskInsights, setTaskInsights] = useState<TaskInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showQuickNote, setShowQuickNote] = useState(false);

  // Create standardized global shortcuts
  const globalShortcuts = createGlobalShortcuts({
    navigate,
    openQuickNote: () => setShowQuickNote(true),
    toggleTheme: () => {
      const newTheme = theme === "light" ? "dark" : "light";
      setTheme(newTheme);
      toast.success("Theme Toggled", {
        description: `Switched to ${newTheme} mode`,
        duration: 1500,
      });
    },
    enableFocusMode: true,
    enableTaskActions: false, // Don't show task actions on task detail page
  });

  // Enable keyboard shortcuts
  useKeyboardShortcuts(globalShortcuts);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !user.uid) {
      navigate("/");
      toast.error("Please log in to view task details");
      return;
    }

    if (!taskId) {
      setError("Task ID is required");
      setIsLoading(false);
      return;
    }

    loadTaskDetails();
  }, [user, user?.uid, authLoading, taskId, navigate]);

  // Set up real-time listeners for notes and task intentions
  useEffect(() => {
    if (!taskId || !user?.uid || authLoading) return;

    console.log(
      "Setting up real-time listeners for user:",
      user.uid,
      "task:",
      taskId
    );

    // Set up task listener for real-time task updates
    const taskRef = doc(db, "tasks", taskId);
    const taskUnsubscribe = onSnapshot(
      taskRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const updatedTask = {
            id: snapshot.id,
            userId: data.userId,
            title: data.title,
            description: data.description,
            priority: data.priority,
            section: data.section,
            tags: data.tags || [],
            completed: data.completed,
            completedAt: data.completedAt?.toDate(),
            dueDate: data.dueDate?.toDate(),
            createdAt: data.createdAt.toDate(),
            lastModified: data.lastModified.toDate(),
            status: data.status || "pending",
          } as Task;
          setTask(updatedTask);
          console.log("Task updated in real-time:", updatedTask.title);
        }
      },
      (error) => {
        console.error("Error in task listener:", error);
      }
    );

    // Set up notes listener
    const notesRef = collection(db, "notes");
    const notesQuery = query(
      notesRef,
      where("taskId", "==", taskId),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const notesUnsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        const updatedNotes = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            content: data.content,
            taskId: data.taskId,
            isGeneral: data.isGeneral,
            createdAt: data.createdAt.toDate(),
          } as Note;
        });
        setNotes(updatedNotes);
        console.log(
          "Notes updated in real-time:",
          updatedNotes.length,
          "for user:",
          user.uid
        );
      },
      (error) => {
        console.error("Error in notes listener:", error);
        // If there's an error, try to fetch notes manually as fallback
        getNotesByTaskId(taskId)
          .then((fallbackNotes) => {
            setNotes(fallbackNotes);
            console.log("Fallback notes loaded:", fallbackNotes.length);
          })
          .catch((fallbackError) => {
            console.error("Fallback notes fetch failed:", fallbackError);
          });
      }
    );

    // Set up task intentions listener
    const intentionsRef = collection(db, "taskIntentions");
    const intentionsQuery = query(
      intentionsRef,
      where("taskId", "==", taskId),
      orderBy("createdAt", "desc")
    );

    const intentionsUnsubscribe = onSnapshot(
      intentionsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          setTaskIntention({
            id: doc.id,
            taskId: data.taskId,
            intention: data.intention,
            createdAt: data.createdAt.toDate(),
            sessionStartTime: data.sessionStartTime.toDate(),
          });
        } else {
          setTaskIntention(null);
        }
        console.log("Task intentions updated in real-time");
      },
      (error) => {
        console.error("Error in intentions listener:", error);
        // Fallback
        getTaskIntention(taskId)
          .then((fallbackIntention) => {
            setTaskIntention(fallbackIntention);
            console.log("Fallback intention loaded");
          })
          .catch((fallbackError) => {
            console.error("Fallback intention fetch failed:", fallbackError);
          });
      }
    );

    // Set up focus sessions listener
    const sessionsRef = collection(db, "focusSessions");
    const sessionsQuery = query(
      sessionsRef,
      where("taskId", "==", taskId),
      where("userId", "==", user.uid),
      orderBy("startTime", "desc")
    );

    const sessionsUnsubscribe = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const updatedSessions = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            taskId: data.taskId,
            startTime: data.startTime.toDate(),
            endTime: data.endTime?.toDate(),
            duration: data.duration || 0,
            notes: data.notes || [],
            pomodoroCount: data.pomodoroCount || 0,
            intention: data.intention || "",
          } as FocusSession;
        });
        setFocusSessions(updatedSessions);
        console.log(
          "Focus sessions updated in real-time:",
          updatedSessions.length,
          "for user:",
          user.uid
        );

        // Update task completion status if needed
        if (task && updatedSessions.some((session) => session.endTime)) {
          const completedSessions = updatedSessions.filter(
            (session) => session.endTime
          );
          const totalFocusTime = completedSessions.reduce(
            (total, session) => total + session.duration,
            0
          );

          // If task is not completed and has significant focus time, mark it as in progress
          if (!task.completed && totalFocusTime > 0) {
            setTask((prev) =>
              prev ? { ...prev, status: "in_progress" } : null
            );
          }
        }
      },
      (error) => {
        console.error("Error in focus sessions listener:", error);
        // Fallback
        getFocusSessionsByTaskId(user.uid, taskId)
          .then((fallbackSessions) => {
            setFocusSessions(fallbackSessions);
            console.log(
              "Fallback focus sessions loaded:",
              fallbackSessions.length
            );
          })
          .catch((fallbackError) => {
            console.error(
              "Fallback focus sessions fetch failed:",
              fallbackError
            );
          });
      }
    );

    // Cleanup listeners on unmount
    return () => {
      console.log("Cleaning up real-time listeners");
      taskUnsubscribe();
      notesUnsubscribe();
      intentionsUnsubscribe();
      sessionsUnsubscribe();
    };
  }, [taskId, user?.uid, authLoading]);

  const loadTaskDetails = async () => {
    try {
      console.log("Loading initial task details...");
      const debugResult = await debugTaskAccess(taskId, user.uid);

      if (debugResult.taskExists && !debugResult.directTask) {
        setError(
          "Task exists but cannot be accessed directly. This might be a permissions issue."
        );
        return;
      }

      if (!debugResult.taskExists) {
        setError("Task not found in your tasks");
        return;
      }

      const taskData = debugResult.directTask || debugResult.taskExists;

      if (!taskData) {
        setError("Task not found");
        return;
      }

      if (taskData.userId !== user.uid) {
        setError("You don't have permission to view this task");
        return;
      }

      setTask(taskData);

      // Initialize insight rules for new users
      try {
        await initializeDefaultInsightRules(user.uid);
      } catch (error) {
        console.warn("Failed to initialize insight rules:", error);
      }

      // Load all related data initially to ensure persistence
      try {
        console.log("Loading initial notes...");
        const initialNotes = await getNotesByTaskId(taskId);
        setNotes(initialNotes);
        console.log("Initial notes loaded:", initialNotes.length);
      } catch (error) {
        console.warn("Failed to load initial notes:", error);
      }

      try {
        console.log("Loading initial focus sessions...");
        const initialSessions = await getFocusSessionsByTaskId(
          user.uid,
          taskId
        );
        setFocusSessions(initialSessions);
        console.log("Initial focus sessions loaded:", initialSessions.length);

        // Generate insights based on focus session data
        if (initialSessions.length > 0) {
          const completedSessions = initialSessions.filter(
            (session) => session.endTime
          );
          const totalFocusTime = completedSessions.reduce(
            (total, session) => total + session.duration,
            0
          );
          const totalPomodoros = completedSessions.reduce(
            (total, session) => total + session.pomodoroCount,
            0
          );
          const totalSessions = completedSessions.length;
          const avgSessionDuration =
            totalSessions > 0 ? Math.round(totalFocusTime / totalSessions) : 0;
          const focusScore =
            totalSessions > 0
              ? Math.min(100, (totalFocusTime / (totalSessions * 25)) * 100)
              : 0;

          // Generate insights
          try {
            const insights = await generateInsights(user.uid, taskId, {
              focusScore: Math.round(focusScore),
              totalPomodoros,
              avgSessionDuration,
              totalSessions,
              currentStreak: 0, // We'll get this from user streak
              totalFocusTime,
            });
            setTaskInsights(insights);
            console.log("Generated insights:", insights.length);
          } catch (error) {
            console.warn("Failed to generate insights:", error);
          }
        } else {
          // Load existing insights
          try {
            const existingInsights = await getTaskInsights(user.uid, taskId);
            setTaskInsights(existingInsights);
          } catch (error) {
            console.warn("Failed to load existing insights:", error);
          }
        }
      } catch (error) {
        console.warn("Failed to load initial focus sessions:", error);
      }

      try {
        console.log("Loading initial task intention...");
        const initialIntention = await getTaskIntention(taskId);
        setTaskIntention(initialIntention);
        console.log("Initial intention loaded:", !!initialIntention);
      } catch (error) {
        console.warn("Failed to load initial task intention:", error);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading task details:", error);
      setError("Failed to load task details");
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast.success("Note deleted successfully");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  // Focus Session Analytics
  const focusAnalytics = React.useMemo(() => {
    const completedSessions = focusSessions.filter(
      (session) => session.endTime
    );
    const totalFocusTime = completedSessions.reduce(
      (total, session) => total + session.duration,
      0
    );
    const totalPomodoros = completedSessions.reduce(
      (total, session) => total + session.pomodoroCount,
      0
    );
    const totalSessions = completedSessions.length;

    // Calculate average session duration
    const avgSessionDuration =
      totalSessions > 0 ? Math.round(totalFocusTime / totalSessions) : 0;

    // Calculate completion rate
    const completionRate =
      totalSessions > 0
        ? Math.round((completedSessions.length / totalSessions) * 100)
        : 0;

    // Calculate focus score based on session completion and efficiency
    const focusScore =
      totalSessions > 0
        ? Math.min(100, (totalFocusTime / (totalSessions * 25)) * 100)
        : 0;

    // Get the most recent session
    const mostRecentSession = completedSessions[0];

    // Calculate focus streak (consecutive days with completed sessions)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionsByDay = completedSessions.reduce((acc, session) => {
      const sessionDate = new Date(session.endTime);
      sessionDate.setHours(0, 0, 0, 0);
      const dayKey = sessionDate.toISOString();
      if (!acc[dayKey]) {
        acc[dayKey] = [];
      }
      acc[dayKey].push(session);
      return acc;
    }, {} as Record<string, FocusSession[]>);

    const daysWithSessions = Object.keys(sessionsByDay).sort();
    let currentStreak = 0;
    let checkingDate = today;

    while (true) {
      const dateKey = checkingDate.toISOString();
      if (sessionsByDay[dateKey]) {
        currentStreak++;
        checkingDate.setDate(checkingDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      totalFocusTime,
      totalPomodoros,
      totalSessions,
      avgSessionDuration,
      completionRate,
      currentStreak,
      mostRecentSession,
      sessionsByDay,
      completedSessions,
      focusScore: Math.round(focusScore),
    };
  }, [focusSessions]);

  // Render analytics section
  const renderAnalytics = () => {
    if (focusSessions.length === 0) {
      return (
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics
            </CardTitle>
            <CardDescription>
              No focus sessions recorded yet. Start a focus session to see your
              analytics.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Focus Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatTime(focusAnalytics.totalFocusTime)}
              </div>
              <div className="text-sm text-muted-foreground">
                {focusAnalytics.totalSessions} sessions completed
              </div>
              <Progress value={focusAnalytics.completionRate} className="h-2" />
              <div className="text-sm text-muted-foreground">
                {focusAnalytics.completionRate}% completion rate
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Productivity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {focusAnalytics.totalPomodoros}
              </div>
              <div className="text-sm text-muted-foreground">
                Pomodoros completed
              </div>
              <div className="text-sm text-muted-foreground">
                {focusAnalytics.currentStreak} day streak
              </div>
              {focusAnalytics.mostRecentSession && (
                <div className="text-sm text-muted-foreground">
                  Last session:{" "}
                  {formatDistanceToNow(
                    focusAnalytics.mostRecentSession.endTime
                  )}{" "}
                  ago
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "bg-red-500/10 text-red-600 border-red-200",
      medium: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
      low: "bg-green-500/10 text-green-600 border-green-200",
    };
    return (
      colors[priority as keyof typeof colors] ||
      "bg-gray-500/10 text-gray-600 border-gray-200"
    );
  };

  const getSectionColor = (section: string) => {
    const colors = {
      today: "bg-blue-500/10 text-blue-600 border-blue-200",
      tomorrow: "bg-purple-500/10 text-purple-600 border-purple-200",
      upcoming: "bg-orange-500/10 text-orange-600 border-orange-200",
      someday: "bg-gray-500/10 text-gray-600 border-gray-200",
    };
    return (
      colors[section as keyof typeof colors] ||
      "bg-gray-500/10 text-gray-600 border-gray-200"
    );
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Data validation and recovery mechanism
  useEffect(() => {
    if (!user?.uid || !taskId || isLoading) return;

    // Set up a periodic check to ensure data is still loaded
    const dataValidationInterval = setInterval(() => {
      // Check if we have the basic data we need
      if (!task) {
        console.warn("Task data missing, attempting recovery...");
        loadTaskDetails();
        return;
      }

      // Validate that user still owns the task
      if (task.userId !== user.uid) {
        console.error("Task ownership mismatch, redirecting...");
        navigate("/dashboard");
        return;
      }

      console.log("Data validation passed:", {
        task: !!task,
        notes: notes.length,
        sessions: focusSessions.length,
        intention: !!taskIntention,
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(dataValidationInterval);
  }, [
    user?.uid,
    taskId,
    task,
    notes.length,
    focusSessions.length,
    taskIntention,
    isLoading,
    navigate,
  ]);

  // Recovery mechanism for lost real-time connections
  useEffect(() => {
    if (!user?.uid || !taskId || isLoading) return;

    const recoveryTimeout = setTimeout(() => {
      // If after 5 seconds we still don't have basic data, try recovery
      if (!task && !error) {
        console.warn("Data not loaded after timeout, attempting recovery...");
        loadTaskDetails();
      }
    }, 5000);

    return () => clearTimeout(recoveryTimeout);
  }, [user?.uid, taskId, task, error, isLoading]);

  if (!user) return null;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] dark:bg-gray-900">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">
                {authLoading ? "Authenticating..." : "Loading task details..."}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] dark:bg-gray-900">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {error || "Task not found"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              The task you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F6] dark:bg-gray-900">
      <NavBar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Task Details & Analytics
            </h1>
            <p className="text-muted-foreground">
              Comprehensive overview of your task progress and focus sessions
            </p>
          </div>
          <QuickNoteButton
            currentTaskId={task.id}
            currentTaskTitle={task.title}
            variant="default"
            size="default"
          />
        </div>

        {/* Task Information Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{task.title}</CardTitle>
                {task.description && (
                  <CardDescription className="text-base">
                    {task.description}
                  </CardDescription>
                )}
              </div>
              {task.completed && (
                <Badge className="bg-green-500/10 text-green-600 border-green-200">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Completed
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Priority
                </p>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Section
                </p>
                <Badge className={getSectionColor(task.section)}>
                  {task.section}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </p>
                <p className="text-sm">
                  {format(task.createdAt, "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Last Modified
                </p>
                <p className="text-sm">
                  {formatDistanceToNow(task.lastModified, { addSuffix: true })}
                </p>
              </div>
            </div>

            {task.tags && task.tags.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {task.dueDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                <span>
                  Due: {format(task.dueDate, "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            )}

            {task.completed && task.completedAt && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Completed:{" "}
                  {format(task.completedAt, "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Focus Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Focus Time
                  </p>
                  <p className="text-2xl font-bold text-[#CDA351]">
                    {formatTime(focusAnalytics.totalFocusTime)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-[#CDA351]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pomodoros
                  </p>
                  <p className="text-2xl font-bold text-red-500">
                    {focusAnalytics.totalPomodoros}
                  </p>
                </div>
                <Coffee className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Focus Sessions
                  </p>
                  <p className="text-2xl font-bold text-blue-500">
                    {focusAnalytics.totalSessions}
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Focus Score
                  </p>
                  <p className="text-2xl font-bold text-green-500">
                    {focusAnalytics.focusScore}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
              <Progress
                value={focusAnalytics.focusScore}
                className="mt-2 h-1"
              />
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="focus-sessions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="focus-sessions"
              className="flex items-center gap-2"
            >
              <Timer className="h-4 w-4" />
              Focus Sessions
            </TabsTrigger>
            <TabsTrigger value="intentions" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Intentions
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Focus Sessions Tab */}
          <TabsContent value="focus-sessions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Focus Sessions
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>
                  {focusAnalytics.totalSessions}{" "}
                  {focusAnalytics.totalSessions === 1 ? "session" : "sessions"}
                </span>
              </div>
            </div>

            {focusAnalytics.completedSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#CDA351]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Timer className="h-8 w-8 text-[#CDA351]" />
                </div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No focus sessions yet
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Start your first focus session for this task from the
                  dashboard
                </p>
                <Button onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                <AnimatePresence>
                  {focusAnalytics.completedSessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <PlayCircle className="h-5 w-5 text-[#CDA351]" />
                                  <span className="font-medium">
                                    {format(
                                      session.startTime,
                                      "MMM d, yyyy 'at' h:mm a"
                                    )}
                                  </span>
                                </div>
                                {session.endTime && (
                                  <>
                                    <span className="text-muted-foreground">
                                      →
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <PauseCircle className="h-5 w-5 text-red-500" />
                                      <span className="text-muted-foreground">
                                        {format(session.endTime, "h:mm a")}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground mb-1">
                                    Duration
                                  </p>
                                  <p className="font-medium">
                                    {formatTime(session.duration)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">
                                    Pomodoros
                                  </p>
                                  <p className="font-medium flex items-center gap-1">
                                    <Coffee className="h-4 w-4 text-red-500" />
                                    {session.pomodoroCount}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">
                                    Notes
                                  </p>
                                  <p className="font-medium">
                                    {session.notes.length} notes
                                  </p>
                                </div>
                              </div>

                              {session.intention && (
                                <div className="mt-4 p-3 bg-[#CDA351]/10 rounded-lg border border-[#CDA351]/20">
                                  <p className="text-sm font-medium text-[#CDA351] mb-1">
                                    Session Intention:
                                  </p>
                                  <p className="text-sm italic">
                                    "{session.intention}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Intentions Tab */}
          <TabsContent value="intentions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Task Intentions
              </h2>
            </div>

            <Card>
              <CardContent className="pt-6">
                {taskIntention ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Lightbulb className="h-6 w-6 text-[#CDA351]" />
                      <div>
                        <h3 className="font-medium">Current Intention</h3>
                        <p className="text-sm text-muted-foreground">
                          Set on{" "}
                          {format(
                            taskIntention.createdAt,
                            "MMM d, yyyy 'at' h:mm a"
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-[#CDA351]/10 rounded-lg border border-[#CDA351]/20">
                      <p className="text-lg italic">
                        "{taskIntention.intention}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      No intention set
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Set an intention when you start your next focus session
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Task Notes
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <StickyNote className="h-4 w-4" />
                <span>
                  {notes.length} {notes.length === 1 ? "note" : "notes"}
                </span>
              </div>
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#CDA351]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <StickyNote className="h-8 w-8 text-[#CDA351]" />
                </div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No notes yet
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Create your first note for this task using the button above
                </p>
                <QuickNoteButton
                  currentTaskId={task.id}
                  currentTaskTitle={task.title}
                  variant="default"
                  size="default"
                />
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <AnimatePresence>
                  {notes.map((note, index) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-md transition-shadow duration-200 group">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-[#CDA351]" />
                              <span className="text-sm font-medium text-[#CDA351]">
                                Task Note
                              </span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(note.createdAt, {
                                  addSuffix: true,
                                })}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
                            <span>
                              {format(
                                note.createdAt,
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </span>
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>{note.content.length} chars</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Detailed Analytics
              </h2>
            </div>

            <div className="grid gap-6">
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#CDA351]">
                        {formatTime(focusAnalytics.avgSessionDuration)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Average Session Length
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">
                        {focusAnalytics.totalSessions > 0
                          ? Math.round(
                              (focusAnalytics.totalPomodoros /
                                focusAnalytics.totalSessions) *
                                10
                            ) / 10
                          : 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Pomodoros per Session
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-500">
                        {focusAnalytics.focusScore}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Focus Efficiency
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-500">
                        {focusAnalytics.totalSessions}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Sessions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Productivity Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Productivity Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {taskInsights.length === 0 ? (
                      <p className="text-muted-foreground">
                        Complete some focus sessions to see insights here.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {taskInsights.map((insight) => {
                          // Function to get the appropriate icon component
                          const getInsightIcon = (iconName: string) => {
                            switch (iconName) {
                              case "Zap":
                                return <Zap className="h-5 w-5" />;
                              case "Coffee":
                                return <Coffee className="h-5 w-5" />;
                              case "Clock":
                                return <Clock className="h-5 w-5" />;
                              case "Target":
                                return <Target className="h-5 w-5" />;
                              case "TrendingUp":
                                return <TrendingUp className="h-5 w-5" />;
                              case "Flame":
                                return <Flame className="h-5 w-5" />;
                              case "Battery":
                                return <Battery className="h-5 w-5" />;
                              case "Timer":
                                return <Timer className="h-5 w-5" />;
                              default:
                                return <Lightbulb className="h-5 w-5" />;
                            }
                          };

                          // Function to get the appropriate color classes
                          const getColorClasses = (color: string) => {
                            switch (color) {
                              case "green":
                                return {
                                  bg: "bg-green-50 dark:bg-green-950/20",
                                  text: "text-green-600",
                                };
                              case "red":
                                return {
                                  bg: "bg-red-50 dark:bg-red-950/20",
                                  text: "text-red-600",
                                };
                              case "blue":
                                return {
                                  bg: "bg-blue-50 dark:bg-blue-950/20",
                                  text: "text-blue-600",
                                };
                              case "purple":
                                return {
                                  bg: "bg-purple-50 dark:bg-purple-950/20",
                                  text: "text-purple-600",
                                };
                              case "yellow":
                                return {
                                  bg: "bg-yellow-50 dark:bg-yellow-950/20",
                                  text: "text-yellow-600",
                                };
                              case "orange":
                                return {
                                  bg: "bg-orange-50 dark:bg-orange-950/20",
                                  text: "text-orange-600",
                                };
                              default:
                                return {
                                  bg: "bg-gray-50 dark:bg-gray-950/20",
                                  text: "text-gray-600",
                                };
                            }
                          };

                          const colorClasses = getColorClasses(insight.color);

                          return (
                            <motion.div
                              key={insight.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex items-center gap-3 p-3 ${colorClasses.bg} rounded-lg`}
                            >
                              <div className={colorClasses.text}>
                                {getInsightIcon(insight.icon)}
                              </div>
                              <div>
                                <p className="text-sm">
                                  <strong>{insight.title}</strong>{" "}
                                  {insight.description}
                                </p>
                                {insight.value !== undefined &&
                                  insight.threshold !== undefined && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Value: {insight.value} (threshold:{" "}
                                      {insight.threshold})
                                    </p>
                                  )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Quick Note Dialog */}
      <QuickNoteButton
        currentTaskId={task?.id}
        currentTaskTitle={task?.title}
        open={showQuickNote}
        onOpenChange={setShowQuickNote}
      />
    </div>
  );
};

export default TaskDetailPage;
