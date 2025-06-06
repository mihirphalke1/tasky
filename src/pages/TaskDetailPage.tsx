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
import { format, formatDistanceToNow, formatDuration, isAfter } from "date-fns";
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
import {
  PageWrapper,
  Container,
  Section,
  FlexContainer,
} from "@/components/ui/layout";

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
  const [notesLoading, setNotesLoading] = useState(true); // Track notes loading separately
  const [notesError, setNotesError] = useState<string | null>(null); // Track notes error separately
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
            snoozedUntil: data.snoozedUntil?.toDate(),
          } as Task;
          setTask(updatedTask);
          console.log("Task updated in real-time:", updatedTask.title);
        }
      },
      (error) => {
        console.error("Error in task listener:", error);
      }
    );

    // Set up notes listener - this will handle all notes loading
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
        setNotesLoading(false); // Notes have been loaded
        setNotesError(null); // Clear any previous errors
        console.log(
          "Notes updated in real-time:",
          updatedNotes.length,
          "for user:",
          user.uid
        );
      },
      (error) => {
        console.error("Error in notes listener:", error);
        setNotesLoading(false); // Even on error, stop loading state
        setNotesError("Failed to load notes. Please refresh the page.");
        // If there's an error, try to fetch notes manually as fallback
        getNotesByTaskId(user.uid, taskId)
          .then((fallbackNotes) => {
            setNotes(fallbackNotes);
            setNotesError(null); // Clear error if fallback succeeds
            console.log("Fallback notes loaded:", fallbackNotes.length);
          })
          .catch((fallbackError) => {
            console.error("Fallback notes fetch failed:", fallbackError);
            setNotesError("Failed to load notes. Please try again later.");
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

        // Note: Task status updates will be handled separately to avoid dependency issues
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

    // Return cleanup function
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

      // Don't load initial notes here anymore - let the real-time listener handle it
      // This eliminates the race condition

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
    const checkingDate = today;

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
        navigate("/");
        return;
      }

      // Throttled logging to prevent spam
      if (Math.random() < 0.1) {
        // Only log 10% of the time
        console.log("Data validation passed:", {
          task: !!task,
          notes: notes.length,
          sessions: focusSessions.length,
          intention: !!taskIntention,
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(dataValidationInterval);
  }, [
    user?.uid,
    taskId,
    isLoading,
    // Only include essential dependencies to prevent excessive re-runs
    !!task, // Convert to boolean to reduce re-runs
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
  }, [user?.uid, taskId, isLoading]); // Simplified dependencies

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] dark:bg-gray-900">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Authenticating...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
    <PageWrapper>
      <NavBar />
      <Container size="xl" padding="md">
        <Section spacing="md">
          {/* Header */}
          <FlexContainer align="center" gap="md" className="mb-6 sm:mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Task Details & Analytics
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Comprehensive overview of your task progress and focus sessions
              </p>
            </div>
            <QuickNoteButton
              currentTaskId={task.id}
              currentTaskTitle={task.title}
              variant="default"
              size="default"
            />
          </FlexContainer>

          {/* Task Information Card */}
          <Card className="mb-4">
            <CardHeader className="p-4 pb-2">
              <FlexContainer align="start" justify="between" gap="md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg break-words">
                      {task.title}
                    </CardTitle>
                    {task.completed && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                  {task.description && (
                    <CardDescription className="text-sm break-words">
                      {task.description}
                    </CardDescription>
                  )}
                </div>
              </FlexContainer>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
                <Badge className={getSectionColor(task.section)}>
                  {task.section}
                </Badge>
                {task.tags?.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs hover:bg-[#CDA351]/20 dark:hover:bg-[#CDA351]/30 transition-colors"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {task.dueDate && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(task.dueDate, "MMM d, h:mm a")}</span>
                  </div>
                )}
                {task.completed && task.completedAt && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{format(task.completedAt, "MMM d, h:mm a")}</span>
                  </div>
                )}
                {!task.completed &&
                  task.snoozedUntil &&
                  isAfter(task.snoozedUntil, new Date()) && (
                    <div className="flex items-center gap-1 text-purple-600">
                      <Clock className="h-3 w-3" />
                      <span>{format(task.snoozedUntil, "h:mm a")}</span>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Focus Analytics Overview */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Focus</p>
                    <p className="text-base font-medium text-[#CDA351]">
                      {formatTime(focusAnalytics.totalFocusTime)}
                    </p>
                  </div>
                  <Clock className="h-4 w-4 text-[#CDA351]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pomodoros</p>
                    <p className="text-base font-medium text-red-500">
                      {focusAnalytics.totalPomodoros}
                    </p>
                  </div>
                  <Coffee className="h-4 w-4 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                    <p className="text-base font-medium text-blue-500">
                      {focusAnalytics.totalSessions}
                    </p>
                  </div>
                  <Target className="h-4 w-4 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="text-base font-medium text-green-500">
                      {focusAnalytics.focusScore}%
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <Progress
                  value={focusAnalytics.focusScore}
                  className="mt-1 h-1"
                />
              </CardContent>
            </Card>
          </div>

          <Separator className="my-6 sm:my-8" />

          {/* Detailed Information Tabs */}
          <Tabs
            defaultValue="focus-sessions"
            className="space-y-4 sm:space-y-6"
          >
            <TabsList className="grid w-full grid-cols-3 p-1">
              <TabsTrigger
                value="focus-sessions"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Focus Sessions</span>
                <span className="sm:hidden">Focus</span>
              </TabsTrigger>
              <TabsTrigger
                value="intentions"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Intentions</span>
                <span className="sm:hidden">Intent</span>
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Notes</span>
                <span className="sm:hidden">Notes</span>
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
                    {focusAnalytics.totalSessions === 1
                      ? "session"
                      : "sessions"}
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
                    {notesLoading
                      ? "Loading..."
                      : `${notes.length} ${
                          notes.length === 1 ? "note" : "notes"
                        }`}
                  </span>
                </div>
              </div>

              {notesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-[#CDA351]/20 rounded-full" />
                      <div className="w-12 h-12 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin absolute inset-0" />
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-base font-medium">
                        Loading notes...
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        Getting your task notes ready
                      </p>
                    </div>
                  </div>
                </div>
              ) : notesError ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
                    Failed to load notes
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {notesError}
                  </p>
                  <Button
                    onClick={() => {
                      setNotesLoading(true);
                      setNotesError(null);
                      // The real-time listener will automatically retry
                    }}
                    variant="outline"
                    size="default"
                  >
                    Try Again
                  </Button>
                </div>
              ) : notes.length === 0 ? (
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
          </Tabs>
        </Section>
      </Container>

      {/* Quick Note Dialog */}
      <QuickNoteButton
        currentTaskId={task?.id}
        currentTaskTitle={task?.title}
        open={showQuickNote}
        onOpenChange={setShowQuickNote}
      />
    </PageWrapper>
  );
};

export default TaskDetailPage;
