import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search as SearchIcon,
  X,
  Clock,
  Calendar,
  CheckCircle2,
  Tag,
  Filter,
  ArrowUpDown,
  Loader2,
  StickyNote,
  FileText,
} from "lucide-react";
import { Task } from "@/types";
import { format, isToday, isTomorrow, isThisWeek, isThisMonth } from "date-fns";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  useKeyboardShortcuts,
  useModalShortcuts,
  type KeyboardShortcut,
} from "@/hooks/useKeyboardShortcuts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { toast } from "sonner";
import { getNotesByTaskId } from "@/lib/focusService";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";

interface SearchProps {
  tasks: Task[];
  onClose: () => void;
}

type SortOption = "recent" | "oldest" | "title" | "priority";
type FilterOption = "all" | "completed" | "pending" | "today" | "this-week";

const DEBOUNCE_DELAY = 300;

const Search = ({ tasks, onClose }: SearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [taskNotes, setTaskNotes] = useState<Record<string, any[]>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Debug logging
  useEffect(() => {
    console.log("Search component received tasks:", {
      tasksLength: tasks?.length || 0,
      tasksType: typeof tasks,
      isArray: Array.isArray(tasks),
      tasks: tasks?.slice(0, 3), // Log first 3 tasks for debugging
    });
  }, [tasks]);

  // Load notes for tasks that have them
  useEffect(() => {
    if (!user || !Array.isArray(tasks)) return;

    const loadTaskNotes = async () => {
      const notesMap: Record<string, any[]> = {};

      // Check each task for notes
      await Promise.all(
        tasks.map(async (task) => {
          try {
            const notes = await getNotesByTaskId(task.id);
            if (notes.length > 0) {
              notesMap[task.id] = notes;
            }
          } catch (error) {
            console.warn(`Failed to load notes for task ${task.id}:`, error);
          }
        })
      );

      setTaskNotes(notesMap);
    };

    loadTaskNotes();
  }, [tasks, user]);

  // Normalize tasks by ID for stable references
  const normalizedTasks = useMemo(() => {
    try {
      if (!Array.isArray(tasks)) {
        console.warn("Tasks is not an array:", tasks);
        return new Map();
      }
      const taskMap = new Map(
        tasks
          .filter((task) => task && task.id)
          .map((task) => [task.id, task] as const)
      );
      console.log("Normalized tasks:", taskMap.size);
      return taskMap;
    } catch (error) {
      console.error("Error normalizing tasks:", error);
      return new Map();
    }
  }, [tasks]);

  // Memoized search function with enhanced error handling
  const performSearch = useCallback(
    (query: string, tasksList: Task[]) => {
      console.log("Performing search with:", {
        query,
        tasksCount: tasksList?.length || 0,
        filterBy,
        sortBy,
      });

      try {
        // Validate tasks list
        if (!Array.isArray(tasksList)) {
          console.error("Invalid tasks list in performSearch:", tasksList);
          setError("Invalid task data received");
          return [];
        }

        if (tasksList.length === 0) {
          console.log("No tasks available");
          return [];
        }

        // Start with all tasks, ensuring we have valid data
        let results = tasksList.filter((task) => {
          if (!task || !task.id) {
            console.warn("Invalid task found:", task);
            return false;
          }
          return true;
        });

        console.log("Valid tasks after filtering:", results.length);

        // Apply search filter only if there's a query
        if (query.trim()) {
          const searchTerms = query.toLowerCase().split(/\s+/);
          results = results.filter((task) => {
            try {
              const searchableText = [
                task.title,
                task.description,
                task.section,
                ...(Array.isArray(task.tags) ? task.tags : []),
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              // Also search in task notes if they exist
              const taskNotesText =
                taskNotes[task.id]
                  ?.map((note) => note.content)
                  .join(" ")
                  .toLowerCase() || "";

              const fullSearchText = `${searchableText} ${taskNotesText}`;

              return searchTerms.every((term) => fullSearchText.includes(term));
            } catch (error) {
              console.error("Error filtering task:", task, error);
              return false;
            }
          });
          console.log(`Search results for "${query}":`, results.length);
        }

        // Apply status filter
        switch (filterBy) {
          case "completed":
            results = results.filter((task) => task.completed === true);
            break;
          case "pending":
            results = results.filter((task) => task.completed !== true);
            break;
          case "today":
            results = results.filter((task) => {
              if (!task.dueDate) return false;
              try {
                return isToday(new Date(task.dueDate));
              } catch {
                return false;
              }
            });
            break;
          case "this-week":
            results = results.filter((task) => {
              if (!task.dueDate) return false;
              try {
                return isThisWeek(new Date(task.dueDate));
              } catch {
                return false;
              }
            });
            break;
        }

        console.log(`Results after ${filterBy} filter:`, results.length);

        // Apply sorting
        switch (sortBy) {
          case "recent":
            results.sort((a, b) => {
              const dateA = a.lastModified
                ? new Date(a.lastModified).getTime()
                : 0;
              const dateB = b.lastModified
                ? new Date(b.lastModified).getTime()
                : 0;
              return dateB - dateA;
            });
            break;
          case "oldest":
            results.sort((a, b) => {
              const dateA = a.lastModified
                ? new Date(a.lastModified).getTime()
                : 0;
              const dateB = b.lastModified
                ? new Date(b.lastModified).getTime()
                : 0;
              return dateA - dateB;
            });
            break;
          case "title":
            results.sort((a, b) => {
              const titleA = a.title || "";
              const titleB = b.title || "";
              return titleA.localeCompare(titleB);
            });
            break;
          case "priority":
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            results.sort((a, b) => {
              const priorityA = a.priority ? priorityOrder[a.priority] || 0 : 0;
              const priorityB = b.priority ? priorityOrder[b.priority] || 0 : 0;
              return priorityA - priorityB;
            });
            break;
        }

        console.log("Final search results:", results.length);
        setError(null);
        return results;
      } catch (error) {
        console.error("Error in performSearch:", error);
        setError("Search failed. Please try again.");
        return [];
      }
    },
    [filterBy, sortBy, taskNotes]
  );

  // Memoized search results with error handling
  const searchResults = useMemo(() => {
    try {
      setIsLoading(true);
      if (!Array.isArray(tasks)) {
        console.error("Tasks prop is not an array:", tasks);
        setError("Invalid task data");
        return [];
      }

      const results = performSearch(searchQuery, tasks);
      setIsLoading(false);
      return results;
    } catch (error) {
      console.error("Error in searchResults memo:", error);
      setError("Failed to load search results");
      setIsLoading(false);
      return [];
    }
  }, [tasks, searchQuery, performSearch]);

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsSearching(true);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(false);
    }, DEBOUNCE_DELAY);
  };

  // Focus input on mount and cleanup on unmount
  useEffect(() => {
    inputRef.current?.focus();
    setIsLoading(false);

    return () => {
      isMountedRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [onClose]);

  // Use modal shortcuts hook to signal that this modal is open
  useModalShortcuts(true);

  // Search shortcut to close - now with high priority for modal context
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
      priority: 100, // High priority for modal context
      allowInModal: true,
    },
  ];

  useKeyboardShortcuts(shortcuts);

  // Helper function to safely format dates
  const safeFormatDate = (
    date: any,
    formatStr: string = "MMM d, yyyy h:mm a"
  ) => {
    try {
      if (!date) return "Unknown";
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "Invalid date";
      return format(dateObj, formatStr);
    } catch (error) {
      console.error("Error formatting date:", date, error);
      return "Invalid date";
    }
  };

  const getSectionColor = (section: string) => {
    const colors = {
      today: "bg-blue-500/10 text-blue-500",
      tomorrow: "bg-purple-500/10 text-purple-500",
      upcoming: "bg-orange-500/10 text-orange-500",
      someday: "bg-gray-500/10 text-gray-500",
    };
    return (
      colors[section as keyof typeof colors] || "bg-gray-500/10 text-gray-500"
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "bg-red-500/10 text-red-500",
      medium: "bg-yellow-500/10 text-yellow-500",
      low: "bg-green-500/10 text-green-500",
    };
    return (
      colors[priority as keyof typeof colors] || "bg-gray-500/10 text-gray-500"
    );
  };

  const getDueDateStatus = (dueDate: Date | null | undefined) => {
    if (!dueDate) return null;
    try {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) return "Invalid date";
      if (isToday(date)) return "Today";
      if (isTomorrow(date)) return "Tomorrow";
      if (isThisWeek(date)) return "This Week";
      if (isThisMonth(date)) return "This Month";
      return format(date, "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const handleTaskClick = (task: Task) => {
    onClose();
    navigate(`/task/${task.id}`);
  };

  const handleNotesClick = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    navigate(`/notes?taskId=${task.id}`);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#FAF8F6]/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="container max-w-3xl mx-auto px-4"
        >
          <div className="bg-card rounded-lg shadow-2xl border relative">
            {/* Search Header */}
            <div className="p-6 border-b space-y-4">
              {/* Search Input */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <SearchIcon className="h-5 w-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search tasks, descriptions, tags, and notes..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-10 h-12 text-lg border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted/50"
                  />
                  {(isSearching || isLoading) && (
                    <Loader2 className="h-5 w-5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-12 w-12"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Filter and Sort Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Filter Section */}
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-muted-foreground">
                    Filter by
                  </label>
                  <Select
                    value={filterBy}
                    onValueChange={(value) =>
                      setFilterBy(value as FilterOption)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tasks</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="today">Due Today</SelectItem>
                      <SelectItem value="this-week">Due This Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Section */}
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-muted-foreground">
                    Sort by
                  </label>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as SortOption)}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most Recent</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Search Results */}
            <ScrollArea className="h-[60vh]">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 text-center text-muted-foreground"
                >
                  <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
                  <p className="text-lg font-medium mb-2">Loading tasks...</p>
                </motion.div>
              ) : error ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 text-center text-red-500"
                >
                  <p className="text-lg font-medium mb-2">{error}</p>
                  <p className="text-sm">Please try again</p>
                  <Button
                    onClick={() => setError(null)}
                    className="mt-4"
                    variant="outline"
                  >
                    Retry
                  </Button>
                </motion.div>
              ) : searchResults.length > 0 ? (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>
                      {searchQuery ? (
                        <>
                          Found {searchResults.length}{" "}
                          {searchResults.length === 1 ? "task" : "tasks"}
                        </>
                      ) : (
                        <>
                          Showing {searchResults.length}{" "}
                          {searchResults.length === 1 ? "task" : "tasks"}
                        </>
                      )}
                    </span>
                    <span className="text-xs">
                      Press{" "}
                      <kbd className="px-2 py-0.5 bg-muted rounded border">
                        Esc
                      </kbd>{" "}
                      to close
                    </span>
                  </div>
                  <AnimatePresence>
                    {searchResults.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3
                                className={`font-medium text-lg ${
                                  task.completed
                                    ? "line-through text-muted-foreground"
                                    : ""
                                }`}
                              >
                                {task.title}
                              </h3>
                              {task.completed && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        Completed{" "}
                                        {safeFormatDate(task.completedAt)}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {taskNotes[task.id] &&
                                taskNotes[task.id].length > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="secondary"
                                          className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
                                          onClick={(e) =>
                                            handleNotesClick(task, e)
                                          }
                                        >
                                          <StickyNote className="h-3 w-3 mr-1" />
                                          {taskNotes[task.id].length} note
                                          {taskNotes[task.id].length !== 1
                                            ? "s"
                                            : ""}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Click to view notes for this task</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                            </div>
                            {task.description && (
                              <p
                                className={`text-sm ${
                                  task.completed
                                    ? "text-muted-foreground/70 line-through"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {task.description}
                              </p>
                            )}

                            {/* Show note preview if searched in notes */}
                            {searchQuery &&
                              taskNotes[task.id] &&
                              taskNotes[task.id].length > 0 && (
                                <div className="mt-2">
                                  {taskNotes[task.id]
                                    .filter((note) =>
                                      note.content
                                        .toLowerCase()
                                        .includes(searchQuery.toLowerCase())
                                    )
                                    .slice(0, 1)
                                    .map((note) => (
                                      <div
                                        key={note.id}
                                        className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800"
                                      >
                                        <div className="flex items-center gap-2 mb-1">
                                          <FileText className="h-3 w-3 text-blue-600" />
                                          <span className="text-xs font-medium text-blue-600">
                                            Note match
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                          {note.content}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              )}

                            <div className="flex flex-wrap gap-2">
                              <Badge
                                className={getPriorityColor(task.priority)}
                              >
                                {task.priority}
                              </Badge>
                              <Badge className={getSectionColor(task.section)}>
                                {task.section}
                              </Badge>
                              {task.tags?.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right space-y-1 min-w-[180px]">
                            <div className="flex flex-col gap-1">
                              <div className="text-xs text-muted-foreground flex flex-col items-end gap-0.5">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    Created{" "}
                                    {safeFormatDate(
                                      task.createdAt,
                                      "MMM d, h:mm a"
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    Modified{" "}
                                    {safeFormatDate(
                                      task.lastModified,
                                      "MMM d, h:mm a"
                                    )}
                                  </span>
                                </div>
                                {task.completed && task.completedAt && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    <span className="text-green-600 font-medium">
                                      Completed{" "}
                                      {safeFormatDate(
                                        task.completedAt,
                                        "MMM d, h:mm a"
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : searchQuery || filterBy !== "all" ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 text-center text-muted-foreground"
                >
                  <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">
                    No tasks found matching your criteria
                  </p>
                  <p className="text-sm">
                    Try adjusting your search or filters
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 text-center text-muted-foreground"
                >
                  <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">No tasks available</p>
                  <p className="text-sm">Create a new task to get started</p>
                </motion.div>
              )}
            </ScrollArea>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Search;
