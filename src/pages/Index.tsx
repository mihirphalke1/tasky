import { useState, useEffect, useRef } from "react";
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
import TaskSection from "@/components/TaskSection";
import TaskOverview from "@/components/TaskOverview";
import PendingTasksSection from "@/components/PendingTasksSection";
import NavBar from "@/components/NavBar";
import Search from "@/components/Search";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { Task, TaskSection as TaskSectionType } from "@/types";
import { Settings2 } from "lucide-react";
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
} from "@/hooks/useKeyboardShortcuts";
import { useTheme } from "next-themes";
import { getSectionFromDate } from "@/utils/taskUtils";

const sections: { id: TaskSectionType; title: string }[] = [
  { id: "today", title: "Today" },
  { id: "tomorrow", title: "Tomorrow" },
  { id: "upcoming", title: "Upcoming" },
  { id: "someday", title: "Someday" },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const taskInputRef = useRef<TaskInputRef>(null);

  // Filter tasks for dashboard (exclude hidden tasks)
  const dashboardTasks = tasks.filter((task) => !task.hidden);

  // All tasks (including hidden) for search functionality
  const allTasks = tasks;

  // Keyboard shortcuts definitions
  const shortcuts: KeyboardShortcut[] = [
    {
      id: "add-task",
      description: "Add New Task",
      category: "tasks",
      keys: {
        mac: ["meta", "j"],
        windows: ["ctrl", "j"],
      },
      action: () => {
        taskInputRef.current?.focusInput();
        toast.success("Add New Task", {
          description: "Focus moved to task input",
          duration: 1500,
        });
      },
      priority: 80,
      allowInModal: true, // Allow even when modals are open
    },
    {
      id: "focus-mode",
      description: "Enter Focus Mode",
      category: "navigation",
      keys: {
        mac: ["meta", "shift", "enter"],
        windows: ["ctrl", "shift", "enter"],
      },
      action: () => {
        // Close search modal if open
        if (showSearch) {
          setShowSearch(false);
        }
        navigate("/focus");
        toast.success("Focus Mode", {
          description: "Entering focus mode",
          duration: 1500,
        });
      },
      priority: 70,
      allowInModal: true,
    },
    {
      id: "show-shortcuts",
      description: "Show Keyboard Shortcuts",
      category: "navigation",
      keys: {
        mac: ["meta", "/"],
        windows: ["ctrl", "/"],
      },
      action: () => {
        // Close search modal if open
        if (showSearch) {
          setShowSearch(false);
        }
        navigate("/shortcuts");
      },
      priority: 90,
      allowInModal: true,
    },
    {
      id: "search",
      description: "Search Tasks",
      category: "tasks",
      keys: {
        mac: ["meta", "k"],
        windows: ["ctrl", "k"],
      },
      action: () => {
        setShowSearch(true);
        toast.success("Search", {
          description: "Search tasks",
          duration: 1500,
        });
      },
      priority: 80,
      allowInModal: true,
    },
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
    {
      id: "toggle-theme",
      description: "Toggle Dark/Light Mode",
      category: "general",
      keys: {
        mac: ["meta", "shift", "l"],
        windows: ["ctrl", "shift", "l"],
      },
      action: () => {
        const currentTheme = theme || "light"; // Default to light if theme is undefined
        const newTheme = currentTheme === "light" ? "dark" : "light";
        setTheme(newTheme);
        toast.success("Theme Toggled", {
          description: `Switched to ${newTheme} mode`,
          duration: 1500,
        });
      },
      priority: 90,
      allowInModal: true, // Always allow theme toggle
    },
  ];

  // Enable keyboard shortcuts
  useKeyboardShortcuts(shortcuts);

  // Set up real-time task subscription
  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError(null);

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        // Subscribe to real-time task updates
        unsubscribe = subscribeToTasks(
          user.uid,
          (updatedTasks) => {
            console.log("Received task update:", updatedTasks);
            setTasks(updatedTasks);
            setLoading(false);
          },
          (error: any) => {
            console.error("Error in task subscription:", error);

            // Handle specific error cases
            if (error.message?.includes("requires an index")) {
              setError(
                "Setting up task synchronization. This may take a moment..."
              );
              // The fallback query will handle this case
              return;
            }

            setError("Failed to load tasks. Please try refreshing the page.");
            setLoading(false);
            toast.error("Failed to load tasks");
          }
        );
      } catch (error) {
        console.error("Error setting up task subscription:", error);
        setError("Failed to load tasks. Please try refreshing the page.");
        setLoading(false);
        toast.error("Failed to load tasks");
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      console.log("Cleaning up task subscription");
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, navigate]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-[#CDA351]">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <Header onSearchClick={() => setShowSearch(true)} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#7E7E7E] hover:text-[#CDA351] dark:text-gray-400 dark:hover:text-[#CDA351]"
              >
                <Settings2 className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClearCompleted}>
                Hide completed tasks
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TaskOverview tasks={dashboardTasks} />
        <TaskInput onAddTask={handleAddTask} ref={taskInputRef} />

        <PendingTasksSection
          tasks={dashboardTasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />

        <div className="space-y-8">
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
      </div>

      {showSearch && (
        <Search tasks={allTasks} onClose={() => setShowSearch(false)} />
      )}

      <PWAInstallPrompt />
    </div>
  );
};

export default Index;
