import { useState, useEffect } from "react";
import { Task } from "@/types";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import TaskItem from "./TaskItem";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useKeyboardShortcuts,
  useModalShortcuts,
  type KeyboardShortcut,
} from "@/hooks/useKeyboardShortcuts";

interface SearchTasksProps {
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onClose: () => void;
}

export const SearchTasks = ({
  onUpdateTask,
  onDeleteTask,
  onClose,
}: SearchTasksProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Use modal shortcuts hook to signal that this modal is open
  useModalShortcuts(true);

  // Add keyboard shortcut to close the view with high priority for modal context
  const shortcuts: KeyboardShortcut[] = [
    {
      id: "escape",
      description: "Close Search",
      category: "navigation",
      keys: {
        mac: ["escape"],
        windows: ["escape"],
      },
      action: onClose,
      priority: 100,
      allowInModal: true,
    },
  ];

  useKeyboardShortcuts(shortcuts);

  // Clear error when search query changes
  useEffect(() => {
    setError(null);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!user || !searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      // Note: This would need to be implemented in taskService
      // const results = await searchTasks(user.uid, searchQuery.trim());
      // setSearchResults(results);
      setSearchResults([]); // Placeholder until search is implemented
    } catch (error: any) {
      console.error("Error searching tasks:", error);
      setError(error.message || "Failed to search tasks");
      toast.error(error.message || "Failed to search tasks");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setError(null);
  };

  // Handle search on Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Search Tasks
        </h2>
        <Button onClick={onClose} variant="outline">
          Close (Esc)
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search tasks by title, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10"
            disabled={isSearching}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          variant="default"
        >
          {isSearching ? "Searching..." : "Search"}
        </Button>
        {searchQuery && (
          <Button
            onClick={handleClearSearch}
            variant="ghost"
            disabled={isSearching}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {error && (
        <div className="text-center text-red-500 dark:text-red-400 py-4">
          {error}
        </div>
      )}

      {isSearching ? (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-500 dark:text-gray-400">
            Searching tasks...
          </div>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Found {searchResults.length} tasks
          </h2>
          <div className="space-y-2">
            {searchResults.map((task) => (
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
                  <p>Created: {format(task.createdAt, "MMM d, yyyy h:mm a")}</p>
                  <p>
                    Last Modified:{" "}
                    {format(task.lastModified, "MMM d, yyyy h:mm a")}
                  </p>
                  {task.dueDate && (
                    <p>Due: {format(task.dueDate, "MMM d, yyyy h:mm a")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : searchQuery && !isSearching ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No tasks found matching "{searchQuery}"
        </div>
      ) : null}
    </div>
  );
};
