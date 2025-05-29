import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { subscribeToTasks, updateTask } from "@/lib/taskService";
import { Task } from "@/types";
import { FocusMode as FocusModeComponent } from "@/components/FocusMode";
import { toast } from "sonner";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

const FocusMode = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Add keyboard shortcut to exit Focus Mode
  useKeyboardShortcut({ key: "Escape" }, () => navigate("/dashboard"));

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
        unsubscribe = subscribeToTasks(
          user.uid,
          (updatedTasks) => {
            console.log("Received task update:", updatedTasks);
            setTasks(updatedTasks);
            setLoading(false);
          },
          (error: any) => {
            console.error("Error in task subscription:", error);
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

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, navigate]);

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const updatedTask = {
        ...task,
        ...updates,
        lastModified: new Date(),
      };

      // Optimistically update the task in the UI
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t.id === taskId ? updatedTask : t))
      );

      // Update in the backend
      await updateTask(taskId, updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading your focus mode...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-primary hover:underline"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <FocusModeComponent tasks={tasks} onTaskUpdate={handleTaskUpdate} />;
};

export default FocusMode;
