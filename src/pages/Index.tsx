import { useState, useEffect } from "react";
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
import TaskInput from "@/components/TaskInput";
import TaskSection from "@/components/TaskSection";
import TaskOverview from "@/components/TaskOverview";
import NavBar from "@/components/NavBar";
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

const sections: { id: TaskSectionType; title: string }[] = [
  { id: "today", title: "Today" },
  { id: "tomorrow", title: "Tomorrow" },
  { id: "upcoming", title: "Upcoming" },
  { id: "someday", title: "Someday" },
];

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

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
      };

      // Optimistically update the task in the UI
      setTasks((prevTasks) => {
        const updatedTasks = prevTasks.map((task) =>
          task.id === updatedTask.id ? taskWithTimestamp : task
        );
        return updatedTasks;
      });

      // Show completion toast immediately if task is being completed
      if (updatedTask.completed) {
        toast.success("Task completed! 🎉");
        // Trigger confetti for completed tasks
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#CDA351", "#F6E6CC", "#8B6B2E"],
        });
      }

      // Update in the backend
      await updateTask(updatedTask.id, taskWithTimestamp);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");

      // Revert the optimistic update on error
      setTasks((prevTasks) => {
        const revertedTasks = prevTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task
        );
        return revertedTasks;
      });
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
      await clearCompletedTasks(user.uid);
      await getTasks(user.uid); // Reload tasks after clearing
      toast.success("Completed tasks cleared");
    } catch (error) {
      console.error("Error clearing completed tasks:", error);
      toast.error("Failed to clear completed tasks");
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const task = tasks.find((t) => t.id === draggableId);

    if (!task) return;

    // If moving to a different section
    if (source.droppableId !== destination.droppableId) {
      const updatedTask = {
        ...task,
        section: destination.droppableId as TaskSectionType,
        lastModified: new Date(),
      };

      try {
        // Optimistically update the UI
        setTasks((prevTasks) =>
          prevTasks.map((t) => (t.id === task.id ? updatedTask : t))
        );

        // Update in the backend
        await updateTask(task.id, updatedTask);
      } catch (error) {
        console.error("Error moving task:", error);
        toast.error("Failed to move task");
        await getTasks(user.uid); // Reload tasks to ensure UI is in sync
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
          <Header />
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
                Clear completed tasks
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TaskOverview tasks={tasks} />
        <TaskInput onAddTask={handleAddTask} />

        <div className="space-y-8">
          {sections.map((section) => (
            <TaskSection
              key={section.id}
              title={section.title}
              tasks={tasks}
              section={section.id}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
