import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { subscribeToTasks, updateTask } from "@/lib/taskService";
import { Task } from "@/types";
import { FocusMode as FocusModeComponent } from "@/components/FocusMode";
import { toast } from "sonner";
import {
  useKeyboardShortcuts,
  type KeyboardShortcut,
} from "@/hooks/useKeyboardShortcuts";

const FocusMode = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exitIntentDetected, setExitIntentDetected] = useState(false);
  const [focusLockEnabled, setFocusLockEnabled] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Filter out hidden tasks for focus mode
  const visibleTasks = tasks.filter((task) => !task.hidden);

  // Keyboard shortcuts for Focus Mode
  const shortcuts: KeyboardShortcut[] = [
    {
      id: "escape",
      description: "Exit Focus Mode",
      category: "navigation",
      keys: {
        mac: ["escape"],
        windows: ["escape"],
      },
      action: () => {
        // Check focus lock first
        if (focusLockEnabled) {
          toast.error("Focus Lock is active", {
            description: "Please disable Focus Lock before exiting.",
            duration: 3000,
          });
          return;
        }

        if (exitIntentDetected) {
          // Second exit intent - actually exit
          navigate("/dashboard");
          toast.success("Focus Mode", {
            description: "Returning to dashboard",
            duration: 1500,
          });
        } else {
          // First exit intent
          setExitIntentDetected(true);
          toast.info("Press Escape again to exit Focus Mode", {
            duration: 3000,
          });
          // Reset exit intent after 5 seconds
          setTimeout(() => setExitIntentDetected(false), 5000);
        }
      },
      priority: 100,
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
        navigate("/shortcuts");
      },
      priority: 90,
      allowInModal: true,
    },
  ];

  // Enable keyboard shortcuts
  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    // Wait for auth to complete before checking user
    if (authLoading) {
      return;
    }

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
  }, [user, authLoading, navigate]);

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

  const handleFocusLockChange = (locked: boolean) => {
    setFocusLockEnabled(locked);
    if (locked) {
      setExitIntentDetected(false); // Reset exit intent when locked
    }
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#FAF8F6] to-[#EFE7DD] dark:from-gray-900 dark:to-gray-800 z-50 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 border-4 border-[#CDA351]/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin absolute inset-0"></div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-wider text-[#1A1A1A] dark:text-white">
              <span className="tracking-widest">T</span>
              <span className="tracking-widest">A</span>
              <span className="tracking-widest">S</span>
              <span className="tracking-widest">K</span>
              <span className="tracking-widest">Y</span>
              <span className="text-[#CDA351] tracking-widest">.</span>
              <span className="text-[#CDA351] tracking-widest">A</span>
              <span className="text-[#CDA351] tracking-widest">P</span>
              <span className="text-[#CDA351] tracking-widest">P</span>
            </h2>
            <div className="w-12 h-0.5 bg-[#CDA351] mx-auto"></div>
            <p className="text-lg font-medium text-[#1A1A1A] dark:text-white">
              Authenticating...
            </p>
            <p className="text-sm text-[#7E7E7E] dark:text-gray-400 font-medium">
              Checking your session
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#FAF8F6] to-[#EFE7DD] dark:from-gray-900 dark:to-gray-800 z-50 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 border-4 border-[#CDA351]/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin absolute inset-0"></div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-wider text-[#1A1A1A] dark:text-white">
              <span className="tracking-widest">T</span>
              <span className="tracking-widest">A</span>
              <span className="tracking-widest">S</span>
              <span className="tracking-widest">K</span>
              <span className="tracking-widest">Y</span>
              <span className="text-[#CDA351] tracking-widest">.</span>
              <span className="text-[#CDA351] tracking-widest">A</span>
              <span className="text-[#CDA351] tracking-widest">P</span>
              <span className="text-[#CDA351] tracking-widest">P</span>
            </h2>
            <div className="w-12 h-0.5 bg-[#CDA351] mx-auto"></div>
            <p className="text-lg font-medium text-[#1A1A1A] dark:text-white">
              Loading focus mode...
            </p>
            <p className="text-sm text-[#7E7E7E] dark:text-gray-400 font-medium">
              Preparing your focus environment
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#FAF8F6] dark:bg-gray-900 z-50 flex items-center justify-center">
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

  return (
    <FocusModeComponent
      tasks={visibleTasks}
      onTaskUpdate={handleTaskUpdate}
      onFocusLockChange={handleFocusLockChange}
    />
  );
};

export default FocusMode;
