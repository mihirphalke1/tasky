import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  clearCompletedTasks,
  subscribeToTasks,
} from "@/lib/taskService";
import Header from "@/components/Header";
import TaskInput, { type TaskInputRef } from "@/components/TaskInput";
import NLPTaskInput, { type NLPTaskInputRef } from "@/components/NLPTaskInput";
import TaskSection from "@/components/TaskSection";
import TaskOverview from "@/components/TaskOverview";
import PendingTasksSection from "@/components/PendingTasksSection";
import NavBar from "@/components/NavBar";
import Search from "@/components/Search";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { QuickNoteButton } from "@/components/QuickNoteButton";
import { Task, TaskSection as TaskSectionType } from "@/types";
import {
  Settings2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Plus,
  PenTool,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import {
  useKeyboardShortcuts,
  type KeyboardShortcut,
  createGlobalShortcuts,
} from "@/hooks/useKeyboardShortcuts";
import { useTheme } from "next-themes";
import { getSectionFromDate } from "@/utils/taskUtils";
import { motion } from "framer-motion";
import {
  PageWrapper,
  Container,
  Section,
  FlexContainer,
} from "@/components/ui/layout";

const sections: { id: TaskSectionType; title: string }[] = [
  { id: "today", title: "Today" },
  { id: "tomorrow", title: "Tomorrow" },
  { id: "upcoming", title: "Upcoming" },
  { id: "someday", title: "Someday" },
];

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [smartInputMode, setSmartInputMode] = useState(true); // Default to smart mode
  const taskInputRef = useRef<TaskInputRef>(null);
  const nlpTaskInputRef = useRef<NLPTaskInputRef>(null);

  // Function to trigger quick note
  const openQuickNote = () => {
    setShowQuickNote(true);
    toast.success("Quick Note", {
      description: "Opening quick note dialog",
      duration: 1500,
    });
  };

  // Function to focus appropriate input
  const focusTaskInput = () => {
    if (smartInputMode) {
      nlpTaskInputRef.current?.focusInput();
    } else {
      taskInputRef.current?.focusInput();
    }
  };

  // Filter tasks for dashboard (exclude hidden tasks)
  const dashboardTasks = tasks.filter((task) => !task.hidden);

  // All tasks (including hidden) for search functionality
  const allTasks = tasks;

  // Keyboard shortcuts definitions using standardized global shortcuts
  const taskActionsShortcuts: KeyboardShortcut[] = [
    {
      id: "clear-completed",
      description: "Hide Completed Tasks",
      category: "tasks",
      keys: {
        mac: ["meta", "shift", "backspace"],
        windows: ["ctrl", "shift", "backspace"],
      },
      action: () => {
        handleClearCompleted();
        toast.success("Hide Completed", {
          description: "Completed tasks hidden from dashboard",
          duration: 1500,
        });
      },
      priority: 60,
      allowInModal: true,
    },
  ];

  // Create global shortcuts with all functionality
  const globalShortcuts = createGlobalShortcuts({
    navigate,
    openQuickNote,
    openSearch: () => setShowSearch(true),
    focusTaskInput,
    toggleSmartInput: () => {
      setSmartInputMode(!smartInputMode);
      toast.success("Input Mode Toggled", {
        description: `Switched to ${
          !smartInputMode ? "smart" : "traditional"
        } input`,
        duration: 1500,
      });
    },
    toggleTheme: () => {
      const currentTheme = theme || "light";
      const newTheme = currentTheme === "light" ? "dark" : "light";
      setTheme(newTheme);
      toast.success("Theme Toggled", {
        description: `Switched to ${newTheme} mode`,
        duration: 1500,
      });
    },
    enableFocusMode: true,
    enableTaskActions: true,
    showSmartInputToggle: true,
  });

  // Combine global shortcuts with task-specific ones
  const shortcuts = [...globalShortcuts, ...taskActionsShortcuts];

  // Enable keyboard shortcuts
  useKeyboardShortcuts(shortcuts);

  // Set up real-time task subscription
  useEffect(() => {
    // Wait for auth to complete before checking user
    if (authLoading) {
      return;
    }

    // Only redirect if auth is complete and no user is found
    if (!user) {
      console.log(
        "No authenticated user after auth completion, redirecting to landing"
      );
      navigate("/");
      return;
    }

    console.log("Setting up task subscription for authenticated user");
    setLoading(true);
    setError(null);

    let unsubscribe: (() => void) | undefined;
    let timeoutId: NodeJS.Timeout;

    const setupSubscription = async () => {
      try {
        // Add a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.log("Subscription timeout, falling back to direct fetch");
          setLoading(false);
          setError("Failed to load tasks. Please refresh the page.");
        }, 10000);

        // Subscribe to real-time task updates
        unsubscribe = subscribeToTasks(
          user.uid,
          (updatedTasks) => {
            console.log("Received task update:", updatedTasks);
            clearTimeout(timeoutId);
            setTasks(updatedTasks);
            setLoading(false);
          },
          (error: any) => {
            console.error("Error in task subscription:", error);
            clearTimeout(timeoutId);

            // Handle specific error cases
            if (error.message?.includes("requires an index")) {
              setError(
                "Setting up task synchronization. This may take a moment..."
              );
              // Try direct fetch as fallback
              getTasks(user.uid)
                .then((tasks) => {
                  setTasks(tasks);
                  setLoading(false);
                  setError(null);
                })
                .catch(() => {
                  setError("Failed to load tasks. Please refresh the page.");
                  setLoading(false);
                });
              return;
            }

            setError("Failed to load tasks. Please try refreshing the page.");
            setLoading(false);
            toast.error("Failed to load tasks");
          }
        );
      } catch (error) {
        console.error("Error setting up task subscription:", error);
        clearTimeout(timeoutId);

        // Fallback to direct fetch
        try {
          const tasks = await getTasks(user.uid);
          setTasks(tasks);
          setLoading(false);
          setError(null);
        } catch (fetchError) {
          setError("Failed to load tasks. Please try refreshing the page.");
          setLoading(false);
          toast.error("Failed to load tasks");
        }
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      console.log("Cleaning up task subscription");
      if (timeoutId) clearTimeout(timeoutId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, authLoading, navigate]);

  const handleAddTask = async (newTask: Omit<Task, "id" | "userId">) => {
    if (!user) {
      toast.error("You must be logged in to add tasks");
      return;
    }

    try {
      const taskToAdd = {
        ...newTask,
        userId: user.uid,
      };

      console.log("Adding new task:", taskToAdd);
      const taskId = await addTask(user.uid, taskToAdd);
      console.log("Task added with ID:", taskId);
      toast.success("Task added successfully");
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task. Please try again.");
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      const now = new Date();
      const taskWithTimestamp = {
        ...updatedTask,
        lastModified: now,
        // Set completedAt when task is completed
        completedAt: updatedTask.completed ? now : null,
        // Ensure section is always derived from due date
        section: getSectionFromDate(updatedTask.dueDate),
      };

      // Show completion toast immediately if task is being completed
      if (
        updatedTask.completed &&
        !tasks.find((t) => t.id === updatedTask.id)?.completed
      ) {
        toast.success("Task completed! 🎉");
        // Trigger confetti for completed tasks
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#CDA351", "#F6E6CC", "#8B6B2E"],
        });
      }

      // Update in the backend - let real-time subscription handle UI updates
      await updateTask(updatedTask.id, taskWithTimestamp);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleClearCompleted = async () => {
    if (!user) return;

    try {
      const completedCount = dashboardTasks.filter(
        (task) => task.completed && !task.hidden
      ).length;

      if (completedCount === 0) {
        toast.info("No completed tasks to hide");
        return;
      }

      await clearCompletedTasks(user.uid);
      toast.success(
        `${completedCount} completed task${
          completedCount === 1 ? "" : "s"
        } hidden from dashboard`,
        {
          description: "Tasks are still accessible via search",
          duration: 3000,
        }
      );
    } catch (error) {
      console.error("Error hiding completed tasks:", error);
      toast.error("Failed to hide completed tasks");
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const task = tasks.find((t) => t.id === draggableId);

    if (!task) return;

    // If moving to a different section, update the due date to match the section
    if (source.droppableId !== destination.droppableId) {
      const targetSection = destination.droppableId as TaskSectionType;
      let newDueDate: Date | null = task.dueDate;

      // Set appropriate due date for the target section
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + 2);

      switch (targetSection) {
        case "today":
          newDueDate = today;
          break;
        case "tomorrow":
          newDueDate = tomorrow;
          break;
        case "upcoming":
          newDueDate = nextDay;
          break;
        case "someday":
          newDueDate = null;
          break;
      }

      const updatedTask = {
        ...task,
        dueDate: newDueDate,
        section: getSectionFromDate(newDueDate),
        lastModified: new Date(),
      };

      try {
        // Update in the backend - let real-time subscription handle UI updates
        await updateTask(task.id, updatedTask);
      } catch (error) {
        console.error("Error moving task:", error);
        toast.error("Failed to move task");
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[#CDA351]">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <Button
            onClick={() => {
              setLoading(true);
              getTasks(user.uid);
            }}
            className="bg-[#CDA351] hover:bg-[#CDA351]/90 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <NavBar />
      <Container size="xl" padding="md">
        <Section spacing="md">
          <FlexContainer
            direction="row"
            justify="between"
            align="center"
            gap="md"
            wrap
            className="mb-4 sm:mb-6 md:mb-8"
          >
            <Header onSearchClick={() => setShowSearch(true)} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[#7E7E7E] hover:text-[#CDA351] dark:text-gray-400 dark:hover:text-[#CDA351] h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 self-end sm:self-auto"
                >
                  <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleClearCompleted}>
                  Hide completed tasks
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </FlexContainer>

          <TaskOverview tasks={dashboardTasks} />

          {/* Task Input Toggle */}
          <FlexContainer justify="center" className="mb-4 sm:mb-6 px-2 sm:px-4">
            <div className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg border-2 border-[#CDA351]/20 dark:border-[#CDA351]/30 w-full max-w-xs sm:max-w-sm md:max-w-md">
              <div className="flex items-center">
                <Button
                  variant={!smartInputMode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSmartInputMode(false)}
                  className={`rounded-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 transition-all duration-200 flex-1 text-xs sm:text-sm md:text-base ${
                    !smartInputMode
                      ? "bg-[#CDA351] hover:bg-[#CDA351]/90 text-white shadow-md"
                      : "text-gray-600 hover:text-[#CDA351] hover:bg-[#CDA351]/10 dark:text-gray-300 dark:hover:text-[#CDA351]"
                  }`}
                >
                  <Plus size={12} className="mr-1 sm:mr-2 md:size-14" />
                  <span className="hidden xs:inline">Traditional</span>
                  <span className="xs:hidden">Trad</span>
                </Button>
                <Button
                  variant={smartInputMode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSmartInputMode(true)}
                  className={`rounded-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 transition-all duration-200 flex-1 text-xs sm:text-sm md:text-base ${
                    smartInputMode
                      ? "bg-gradient-to-r from-[#CDA351] to-[#E6C17A] hover:from-[#CDA351]/90 hover:to-[#E6C17A]/90 text-white shadow-md"
                      : "text-gray-600 hover:text-[#CDA351] hover:bg-[#CDA351]/10 dark:text-gray-300 dark:hover:text-[#CDA351]"
                  }`}
                >
                  <Sparkles size={12} className="mr-1 sm:mr-2 md:size-14" />
                  <span className="hidden xs:inline">Smart Input</span>
                  <span className="xs:hidden">Smart</span>
                </Button>
              </div>
            </div>
          </FlexContainer>

          {/* Conditional Task Input Rendering */}
          {smartInputMode ? (
            <NLPTaskInput onAddTask={handleAddTask} ref={nlpTaskInputRef} />
          ) : (
            <TaskInput onAddTask={handleAddTask} ref={taskInputRef} />
          )}

          <PendingTasksSection
            tasks={dashboardTasks}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />

          <div className="space-y-6 sm:space-y-8">
            {sections.map((section) => (
              <TaskSection
                key={section.id}
                title={section.title}
                tasks={dashboardTasks}
                section={section.id}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </Section>
      </Container>

      {showSearch && (
        <Search tasks={allTasks} onClose={() => setShowSearch(false)} />
      )}

      {/* Global Quick Note Button */}
      <div className="fixed bottom-4 sm:bottom-6 md:bottom-8 right-4 sm:right-6 md:right-8 z-40 flex gap-3 sm:gap-4">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="default"
            className="rounded-full px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 bg-[#CDA351] hover:bg-[#CDA351]/90 text-white shadow-lg flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base font-medium"
            onClick={openQuickNote}
          >
            <PenTool className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Quick Note</span>
            <span className="sm:hidden">Note</span>
          </Button>
        </motion.div>
        <QuickNoteButton
          open={showQuickNote}
          onOpenChange={setShowQuickNote}
          currentTaskId={undefined}
          currentTaskTitle={undefined}
          size="icon"
        />
      </div>

      <PWAInstallPrompt />
    </PageWrapper>
  );
};

export default Index;
