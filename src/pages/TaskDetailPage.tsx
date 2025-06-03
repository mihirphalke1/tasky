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
import { Task, Note, FocusSession, TaskIntention } from "@/types";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("TaskDetailPage useEffect triggered");
    console.log("User:", user);
    console.log("User UID:", user?.uid);
    console.log("Auth loading:", authLoading);
    console.log("TaskId:", taskId);

    // Don't proceed if auth is still loading
    if (authLoading) {
      console.log("Auth still loading, waiting...");
      return;
    }

    if (!user || !user.uid) {
      console.log("No user or user.uid found, redirecting to home");
      navigate("/");
      toast.error("Please log in to view task details");
      return;
    }

    if (!taskId) {
      console.log("No taskId provided");
      setError("Task ID is required");
      setIsLoading(false);
      return;
    }

    console.log("User is authenticated, proceeding with loadTaskDetails");
    loadTaskDetails();
  }, [user, user?.uid, authLoading, taskId, navigate]);

  const loadTaskDetails = async () => {
    try {
      console.log(
        "Loading task details for taskId:",
        taskId,
        "user:",
        user?.uid
      );

      // Run debug check first
      const debugResult = await debugTaskAccess(taskId, user.uid);

      // If debug found the task in user's tasks but direct access failed, something is wrong
      if (debugResult.taskExists && !debugResult.directTask) {
        setError(
          "Task exists but cannot be accessed directly. This might be a permissions issue."
        );
        return;
      }

      // If task doesn't exist in user's tasks at all
      if (!debugResult.taskExists) {
        setError("Task not found in your tasks");
        return;
      }

      // Use the task from debug result if direct access failed but task exists
      const taskData = debugResult.directTask || debugResult.taskExists;

      if (!taskData) {
        console.log("Task not found for ID:", taskId);
        setError("Task not found");
        return;
      }

      if (taskData.userId !== user.uid) {
        console.log(
          "Permission denied: Task belongs to",
          taskData.userId,
          "but user is",
          user.uid
        );
        setError("You don't have permission to view this task");
        return;
      }

      // Load remaining data
      const [taskNotes, sessions, intention] = await Promise.all([
        getNotesByTaskId(taskId).catch((error) => {
          console.warn("Error loading notes:", error);
          return [];
        }),
        getFocusSessionsByTaskId(user.uid, taskId).catch((error) => {
          console.warn("Error loading focus sessions:", error);
          return [];
        }),
        getTaskIntention(taskId).catch((error) => {
          console.warn("Error loading task intention:", error);
          return null;
        }),
      ]);

      console.log("All data loaded successfully");
      setTask(taskData);
      setNotes(taskNotes);
      setFocusSessions(sessions);
      setTaskIntention(intention);
    } catch (error) {
      console.error("Error loading task details:", error);

      // More specific error messages
      let errorMessage = "Failed to load task details";
      let errorDescription = "Please try again later";

      if (error.code === "permission-denied") {
        errorMessage = "Permission denied";
        errorDescription = "You don't have permission to access this task";
      } else if (error.message?.includes("not found")) {
        errorMessage = "Task not found";
        errorDescription = "The task you're looking for doesn't exist";
      } else if (error.message?.includes("network")) {
        errorMessage = "Network error";
        errorDescription = "Please check your internet connection";
      }

      setError(errorMessage);
      toast.error(errorMessage, {
        description: errorDescription,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
      toast.success("Note deleted successfully");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note", {
        description: "Please try again later",
      });
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
    const averageSessionTime =
      totalSessions > 0 ? totalFocusTime / totalSessions : 0;

    // Calculate focus score based on session completion and efficiency
    const focusScore =
      totalSessions > 0
        ? Math.min(100, (totalFocusTime / (totalSessions * 25)) * 100)
        : 0;

    return {
      totalFocusTime,
      totalPomodoros,
      totalSessions,
      averageSessionTime,
      focusScore: Math.round(focusScore),
      completedSessions,
    };
  }, [focusSessions]);

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
                        {formatTime(focusAnalytics.averageSessionTime)}
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
                    {focusAnalytics.totalSessions === 0 ? (
                      <p className="text-muted-foreground">
                        Complete some focus sessions to see insights here.
                      </p>
                    ) : (
                      <>
                        {focusAnalytics.focusScore >= 80 && (
                          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <Zap className="h-5 w-5 text-green-600" />
                            <p className="text-sm">
                              <strong>Excellent focus!</strong> Your sessions
                              are highly productive with great time management.
                            </p>
                          </div>
                        )}

                        {focusAnalytics.totalPomodoros >= 10 && (
                          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                            <Coffee className="h-5 w-5 text-red-600" />
                            <p className="text-sm">
                              <strong>Pomodoro master!</strong> You've completed{" "}
                              {focusAnalytics.totalPomodoros} pomodoros on this
                              task.
                            </p>
                          </div>
                        )}

                        {focusAnalytics.averageSessionTime > 60 && (
                          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <p className="text-sm">
                              <strong>Deep work specialist!</strong> Your
                              average session length of{" "}
                              {formatTime(focusAnalytics.averageSessionTime)}{" "}
                              shows great sustained focus.
                            </p>
                          </div>
                        )}

                        {focusAnalytics.totalSessions >= 5 && (
                          <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                            <Target className="h-5 w-5 text-purple-600" />
                            <p className="text-sm">
                              <strong>Consistent performer!</strong> You've
                              completed {focusAnalytics.totalSessions} focus
                              sessions on this task.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TaskDetailPage;
