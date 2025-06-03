import { useState, useEffect } from "react";
import { Task } from "@/types";
import { getRecentlyCompletedTasks } from "@/lib/taskService";
import { useAuth } from "@/lib/AuthContext";
import TaskItem from "./TaskItem";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

interface RecentlyCompletedTasksProps {
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onClose: () => void;
}

export const RecentlyCompletedTasks = ({
  onUpdateTask,
  onDeleteTask,
  onClose,
}: RecentlyCompletedTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Add keyboard shortcut to close the view
  useKeyboardShortcut({ key: "Escape" }, onClose);

  const fetchTasks = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const completedTasks = await getRecentlyCompletedTasks(user.uid);
      setTasks(completedTasks);
    } catch (error: any) {
      console.error("Error fetching completed tasks:", error);
      setError(error.message || "Failed to fetch completed tasks");
      toast.error(error.message || "Failed to fetch completed tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleRefresh = () => {
    fetchTasks();
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Loading recently completed tasks...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Recently Completed Tasks
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={onClose} variant="outline">
            Close (Esc)
          </Button>
        </div>
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <TaskItem
                task={task}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
              />
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <p>Completed {formatDistanceToNow(task.lastModified)} ago</p>
                <p>Created: {format(task.createdAt, "MMM d, yyyy h:mm a")}</p>
                {task.dueDate && (
                  <p>Due: {format(task.dueDate, "MMM d, yyyy h:mm a")}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No tasks completed in the last 7 days
        </div>
      )}
    </div>
  );
};
