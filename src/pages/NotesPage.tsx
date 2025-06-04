import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getNotesWithTaskDetails, deleteNote } from "@/lib/focusService";
import { getTaskById, getTasks } from "@/lib/taskService";
import { Note, Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import NavBar from "@/components/NavBar";
import { QuickNoteButton } from "@/components/QuickNoteButton";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Trash2,
  Search,
  Link as LinkIcon,
  StickyNote,
  Clock,
  Calendar,
  Filter,
  FileText,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Layers3,
  Plus,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Hash,
  TrendingUp,
  Archive,
  Eye,
  MoreHorizontal,
  PenTool,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  useKeyboardShortcuts,
  type ShortcutAction,
  type KeyboardShortcut,
  createGlobalShortcuts,
} from "@/hooks/useKeyboardShortcuts";
import { useTheme } from "next-themes";

interface NoteWithTask extends Note {
  task?: Task | null;
}

type ActiveTab = "all" | "general" | "tasks";

const NotesPage = () => {
  const [notes, setNotes] = useState<NoteWithTask[]>([]);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<NoteWithTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [selectedNote, setSelectedNote] = useState<NoteWithTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [focusedTask, setFocusedTask] = useState<Task | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showQuickNote, setShowQuickNote] = useState(false);
  const { theme, setTheme } = useTheme();

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
    enableTaskActions: false, // Don't show task actions on notes page
  });

  // Enable keyboard shortcuts
  useKeyboardShortcuts(globalShortcuts);

  useEffect(() => {
    // Wait for auth to complete before checking user
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate("/");
      return;
    }

    const loadData = async () => {
      try {
        // Set up real-time listener for notes
        const notesRef = collection(db, "notes");
        const notesQuery = query(
          notesRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const unsubscribeNotes = onSnapshot(notesQuery, async (snapshot) => {
          const notesData = await Promise.all(
            snapshot.docs.map(async (doc) => {
              const data = doc.data();
              const note = {
                id: doc.id,
                userId: data.userId,
                content: data.content,
                taskId: data.taskId,
                isGeneral: data.isGeneral,
                createdAt: data.createdAt.toDate(),
              } as Note;

              if (note.taskId) {
                try {
                  const task = await getTaskById(note.taskId);
                  return { ...note, task };
                } catch (error) {
                  console.warn(
                    `Failed to fetch task details for note ${note.id}:`,
                    error
                  );
                  return { ...note, task: null };
                }
              }
              return note;
            })
          );

          setNotes(notesData);
        });

        // Load tasks
        const allUserTasks = await getTasks(user.uid);
        setUserTasks(allUserTasks);

        // Check if we have a taskId in query params
        const taskId = searchParams.get("taskId");
        if (taskId) {
          try {
            const task = await getTaskById(taskId);
            if (task && task.userId === user.uid) {
              setFocusedTask(task);
              setActiveTab("tasks");
            }
          } catch (error) {
            console.warn("Failed to load focused task:", error);
          }
        }

        setIsLoading(false);

        // Cleanup function
        return () => {
          unsubscribeNotes();
        };
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load notes", {
          description: "Please try again later",
        });
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, authLoading, navigate, searchParams]);

  // Filter notes based on active tab
  useEffect(() => {
    let filtered = [...notes];

    if (focusedTask) {
      // If we have a focused task, show only notes for that task
      filtered = filtered.filter((note) => note.taskId === focusedTask.id);
    } else {
      // Normal filtering based on active tab
      if (activeTab === "general") {
        filtered = filtered.filter((note) => note.isGeneral);
      } else if (activeTab === "tasks") {
        filtered = filtered.filter((note) => !note.isGeneral);
      }
      // For "all" tab, we don't filter - show all notes
    }

    // Apply search across all note content and task details
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.content.toLowerCase().includes(query) ||
          note.task?.title?.toLowerCase().includes(query) ||
          note.task?.description?.toLowerCase().includes(query) ||
          note.task?.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredNotes(filtered);
  }, [notes, activeTab, searchQuery, focusedTask]);

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

  const handleTaskClick = (task: Task) => {
    if (task.userId !== user?.uid) {
      toast.error("Access denied", {
        description: "You can only view your own tasks",
      });
      return;
    }
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getTaskNotes = (taskId: string) => {
    return notes.filter((note) => note.taskId === taskId);
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

  const clearTaskFilter = () => {
    setFocusedTask(null);
    navigate("/notes");
  };

  const renderAllNotesContent = () => (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#CDA351]/20 to-[#CDA351]/10 rounded-xl">
              <Layers3 className="h-6 w-6 text-[#CDA351]" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                All Notes
              </h2>
              <p className="text-muted-foreground dark:text-gray-400 flex items-center gap-2">
                <span>
                  {filteredNotes.length}{" "}
                  {filteredNotes.length === 1 ? "note" : "notes"}
                </span>
                {searchQuery && (
                  <>
                    <span>•</span>
                    <span className="text-[#CDA351] font-medium">
                      matching "{searchQuery}"
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-32 h-32 bg-gradient-to-br from-[#CDA351]/20 to-[#CDA351]/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Layers3 className="h-16 w-16 text-[#CDA351]" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {searchQuery ? "No notes found" : "Your canvas awaits"}
          </h3>
          <p className="text-muted-foreground dark:text-gray-400 mb-10 max-w-md mx-auto text-lg leading-relaxed">
            {searchQuery
              ? `No notes match "${searchQuery}". Try adjusting your search terms.`
              : "Start capturing your thoughts, ideas, and insights"}
          </p>
          <div className="flex gap-4 justify-center">
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="h-12 px-6 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Search
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {filteredNotes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#CDA351]/30 dark:hover:border-[#CDA351]/40 transition-all duration-200 hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {note.isGeneral ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#CDA351]/10 to-[#CDA351]/5 rounded-full border border-[#CDA351]/20">
                            <StickyNote className="h-4 w-4 text-[#CDA351]" />
                            <span className="text-sm font-semibold text-[#CDA351]">
                              General Note
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-full border border-blue-200 dark:border-blue-700">
                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                              Task Note
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(note.createdAt, {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        {note.task && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            onClick={() => handleTaskClick(note.task!)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Enhanced task connection display */}
                  {note.task && (
                    <div className="mx-6 mb-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                          <LinkIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                          Linked Task
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                        {note.task.title}
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`text-xs font-medium ${getPriorityColor(
                            note.task.priority
                          )} dark:bg-opacity-20`}
                        >
                          {note.task.priority} priority
                        </Badge>
                        <Badge
                          className={`text-xs font-medium ${getSectionColor(
                            note.task.section
                          )} dark:bg-opacity-20`}
                        >
                          {note.task.section}
                        </Badge>
                        {note.task.completed && (
                          <Badge className="text-xs font-medium bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <CardContent className="pt-0 pb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  </CardContent>

                  {/* Enhanced footer without Active indicator */}
                  <CardFooter className="pt-3 pb-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between w-full text-xs">
                      <div className="flex items-center gap-4 text-muted-foreground dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(note.createdAt, "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {note.content.length} characters
                        </span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  const renderGeneralNotesContent = () => (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#CDA351]/20 to-[#CDA351]/10 rounded-xl">
              <StickyNote className="h-6 w-6 text-[#CDA351]" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                General Notes
              </h2>
              <p className="text-muted-foreground dark:text-gray-400">
                {filteredNotes.length}{" "}
                {filteredNotes.length === 1 ? "note" : "notes"} • Your personal
                collection
              </p>
            </div>
          </div>
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-32 h-32 bg-gradient-to-br from-[#CDA351]/20 to-[#CDA351]/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <StickyNote className="h-16 w-16 text-[#CDA351]" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {searchQuery ? "No notes found" : "Start your journal"}
          </h3>
          <p className="text-muted-foreground dark:text-gray-400 mb-10 max-w-md mx-auto text-lg leading-relaxed">
            {searchQuery
              ? `No notes match "${searchQuery}"`
              : "Capture your thoughts, ideas, and inspiration"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          <AnimatePresence>
            {filteredNotes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#CDA351]/30 dark:hover:border-[#CDA351]/40 transition-all duration-200 hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#CDA351]/10 to-[#CDA351]/5 rounded-lg">
                          <StickyNote className="h-4 w-4 text-[#CDA351]" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-[#CDA351] block mb-1">
                            General Note
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(note.createdAt, {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 pb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  </CardContent>

                  <CardFooter className="pt-3 pb-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between w-full text-xs">
                      <div className="flex items-center gap-4 text-muted-foreground dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(note.createdAt, "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {note.content.length} characters
                        </span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  const renderTaskNotesContent = () => {
    // Get tasks that have notes
    const tasksWithNotes = userTasks.filter((task) =>
      notes.some((note) => note.taskId === task.id)
    );

    if (focusedTask) {
      return (
        <div className="space-y-8">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  Task Notes
                </h2>
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">
                  <LinkIcon className="h-3 w-3 mr-1" />
                  {focusedTask.title}
                </Badge>
              </div>
              <p className="text-muted-foreground dark:text-gray-400">
                {filteredNotes.length}
                {filteredNotes.length === 1 ? "note" : "notes"} for this task
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearTaskFilter}
                className="mt-3 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4 mr-2" />
                Show All Task Notes
              </Button>
            </div>
          </div>

          {/* Focused Task Info */}
          <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  {focusedTask.title}
                </h3>
                {focusedTask.description && (
                  <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                    {focusedTask.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={`${getPriorityColor(
                      focusedTask.priority
                    )} text-xs dark:bg-opacity-20`}
                  >
                    {focusedTask.priority}
                  </Badge>
                  <Badge
                    className={`${getSectionColor(
                      focusedTask.section
                    )} text-xs dark:bg-opacity-20`}
                  >
                    {focusedTask.section}
                  </Badge>
                  {focusedTask.completed && (
                    <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTaskClick(focusedTask)}
                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                View Details
              </Button>
            </div>
          </div>

          {/* Notes for focused task */}
          <div className="grid gap-6">
            <AnimatePresence>
              {filteredNotes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="group bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(note.createdAt, {
                            addSuffix: true,
                          })}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-3 pb-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="flex items-center justify-between w-full text-xs">
                        <div className="flex items-center gap-4 text-muted-foreground dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(note.createdAt, "MMM d, yyyy 'at' h:mm a")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {note.content.length} characters
                          </span>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl">
                <LinkIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Task Notes
                </h2>
                <p className="text-muted-foreground dark:text-gray-400">
                  Notes connected to your tasks and projects
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced task grouping */}
        {tasksWithNotes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <LinkIcon className="h-16 w-16 text-blue-500" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              No task notes yet
            </h3>
            <p className="text-muted-foreground dark:text-gray-400 mb-10 max-w-md mx-auto text-lg leading-relaxed">
              Start adding notes to your tasks to see them organized here
            </p>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="lg"
              className="h-12 px-8"
            >
              Browse Tasks
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {tasksWithNotes.map((task) => {
              const taskNotes = getTaskNotes(task.id);
              const isExpanded = expandedTasks.has(task.id);

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Enhanced task header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                          <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-2 truncate">
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge
                              className={`${getPriorityColor(
                                task.priority
                              )} font-medium`}
                            >
                              {task.priority} priority
                            </Badge>
                            <Badge
                              className={`${getSectionColor(
                                task.section
                              )} font-medium`}
                            >
                              {task.section}
                            </Badge>
                            {task.completed && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground dark:text-gray-400">
                              {taskNotes.length}{" "}
                              {taskNotes.length === 1 ? "note" : "notes"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTaskClick(task)}
                          className="h-9 w-9 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleTaskExpansion(task.id)}
                          className="h-9 w-9 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced notes display */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pl-6"
                      >
                        {taskNotes.map((note, index) => (
                          <motion.div
                            key={note.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-lg">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(note.createdAt, {
                                      addSuffix: true,
                                    })}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 opacity-0 group-hover:opacity-100 transition-all"
                                    onClick={() => handleDeleteNote(note.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0 pb-4">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                  {note.content}
                                </p>
                              </CardContent>
                              <CardFooter className="pt-3 pb-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                <div className="flex items-center justify-between w-full text-xs">
                                  <div className="flex items-center gap-4 text-muted-foreground dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(
                                        note.createdAt,
                                        "MMM d, yyyy 'at' h:mm a"
                                      )}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Hash className="h-3 w-3" />
                                      {note.content.length} characters
                                    </span>
                                  </div>
                                </div>
                              </CardFooter>
                            </Card>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF8F6] via-[#F8F6F3] to-[#F5F3F0] dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <NavBar />
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex h-[calc(100vh-120px)] gap-8">
          {/* Enhanced Left Sidebar - 30% */}
          <div className="w-[30%] flex flex-col">
            {/* Enhanced Header */}
            <div className="mb-8 px-2">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-[#CDA351]/20 to-[#CDA351]/10 rounded-2xl">
                  <BookOpen className="h-8 w-8 text-[#CDA351]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    My Notes
                  </h1>
                  <p className="text-muted-foreground dark:text-gray-400">
                    Organize your thoughts and ideas!
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Search */}
            <div className="mb-6 px-2">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-gray-400 h-5 w-5 group-focus-within:text-[#CDA351] transition-colors" />
                <Input
                  placeholder="Search notes, tasks, and content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 focus:border-[#CDA351] focus:ring-[#CDA351] dark:text-gray-100 dark:placeholder-gray-400 text-base rounded-xl shadow-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Enhanced Navigation Tabs */}
            <div className="flex flex-col gap-3 mb-8 px-2">
              <Button
                variant={activeTab === "all" ? "default" : "ghost"}
                className={cn(
                  "justify-start h-16 text-left px-5 py-4 rounded-xl transition-all duration-200",
                  activeTab === "all"
                    ? "bg-gradient-to-r from-[#CDA351] to-[#B8935A] hover:from-[#B8935A] hover:to-[#CDA351] text-white shadow-lg transform scale-105"
                    : "hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                )}
                onClick={() => {
                  setActiveTab("all");
                  setFocusedTask(null);
                  navigate("/notes");
                }}
              >
                <div className="flex items-center gap-4 w-full">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      activeTab === "all" ? "bg-white/20" : "bg-[#CDA351]/10"
                    )}
                  >
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">All Notes</div>
                    <div
                      className={cn(
                        "text-xs mt-0.5",
                        activeTab === "all"
                          ? "text-white/75"
                          : "text-muted-foreground"
                      )}
                    >
                      {notes.length} total notes
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                variant={activeTab === "general" ? "default" : "ghost"}
                className={cn(
                  "justify-start h-16 text-left px-5 py-4 rounded-xl transition-all duration-200",
                  activeTab === "general"
                    ? "bg-gradient-to-r from-[#CDA351] to-[#B8935A] hover:from-[#B8935A] hover:to-[#CDA351] text-white shadow-lg transform scale-105"
                    : "hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                )}
                onClick={() => {
                  setActiveTab("general");
                  setFocusedTask(null);
                  navigate("/notes");
                }}
              >
                <div className="flex items-center gap-4 w-full">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      activeTab === "general"
                        ? "bg-white/20"
                        : "bg-[#CDA351]/10"
                    )}
                  >
                    <StickyNote className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">General Notes</div>
                    <div
                      className={cn(
                        "text-xs mt-0.5",
                        activeTab === "general"
                          ? "text-white/75"
                          : "text-muted-foreground"
                      )}
                    >
                      {notes.filter((n) => n.isGeneral).length} personal notes
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                variant={activeTab === "tasks" ? "default" : "ghost"}
                className={cn(
                  "justify-start h-16 text-left px-5 py-4 rounded-xl transition-all duration-200",
                  activeTab === "tasks"
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg transform scale-105"
                    : "hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                )}
                onClick={() => {
                  setActiveTab("tasks");
                  setFocusedTask(null);
                  navigate("/notes");
                }}
              >
                <div className="flex items-center gap-4 w-full">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      activeTab === "tasks" ? "bg-white/20" : "bg-blue-500/10"
                    )}
                  >
                    <LinkIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Task Notes</div>
                    <div
                      className={cn(
                        "text-xs mt-0.5",
                        activeTab === "tasks"
                          ? "text-white/75"
                          : "text-muted-foreground"
                      )}
                    >
                      {notes.filter((n) => !n.isGeneral).length} linked notes
                    </div>
                  </div>
                </div>
              </Button>
            </div>

            {/* Enhanced Stats Card */}
            <div className="mt-auto mx-2 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-lg">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-gradient-to-br from-[#CDA351]/20 to-[#CDA351]/10 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-[#CDA351]" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                  Quick Stats
                </h3>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground dark:text-gray-400 font-medium">
                    Total Notes:
                  </span>
                  <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                    {notes.length}
                  </span>
                </div>
                <Separator className="dark:bg-gray-600" />
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground dark:text-gray-400 font-medium">
                    Personal:
                  </span>
                  <span className="font-semibold text-[#CDA351]">
                    {notes.filter((n) => n.isGeneral).length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground dark:text-gray-400 font-medium">
                    Task-linked:
                  </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {notes.filter((n) => !n.isGeneral).length}
                  </span>
                </div>
                {searchQuery && (
                  <>
                    <Separator className="dark:bg-gray-600" />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground dark:text-gray-400 font-medium">
                        Search Results:
                      </span>
                      <span className="font-bold text-[#CDA351]">
                        {filteredNotes.length}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Right Content - 70% */}
          <div className="w-[70%] flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-xl">
            <ScrollArea className="flex-1 p-8">
              {authLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-[#CDA351]/20 rounded-full" />
                      <div className="w-16 h-16 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin absolute inset-0" />
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground dark:text-gray-400 text-lg font-medium">
                        Authenticating...
                      </p>
                      <p className="text-muted-foreground dark:text-gray-500 text-sm mt-1">
                        Verifying your access
                      </p>
                    </div>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-[#CDA351]/20 rounded-full" />
                      <div className="w-16 h-16 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin absolute inset-0" />
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground dark:text-gray-400 text-lg font-medium">
                        Loading your notes...
                      </p>
                      <p className="text-muted-foreground dark:text-gray-500 text-sm mt-1">
                        Organizing your thoughts
                      </p>
                    </div>
                  </div>
                </div>
              ) : activeTab === "all" ? (
                renderAllNotesContent()
              ) : activeTab === "general" ? (
                renderGeneralNotesContent()
              ) : (
                renderTaskNotesContent()
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Task Details Modal */}
        <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Task Details
              </DialogTitle>
            </DialogHeader>

            {selectedTask && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">
                    {selectedTask.title}
                  </h3>
                  {selectedTask.description && (
                    <p className="text-muted-foreground dark:text-gray-400 mb-3">
                      {selectedTask.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={getPriorityColor(selectedTask.priority)}>
                    {selectedTask.priority} priority
                  </Badge>
                  <Badge className={getSectionColor(selectedTask.section)}>
                    {selectedTask.section}
                  </Badge>
                  {selectedTask.completed && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>

                {selectedTask.tags?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                      Tags:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTask.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator className="dark:bg-gray-600" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground dark:text-gray-400">
                      Created
                    </p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {format(selectedTask.createdAt, "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground dark:text-gray-400">
                      Last Modified
                    </p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDistanceToNow(selectedTask.lastModified, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {selectedTask.dueDate && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground dark:text-gray-400">
                        Due Date
                      </p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {format(
                          selectedTask.dueDate,
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => navigate(`/task/${selectedTask.id}`)}
                    className="flex-1 bg-[#CDA351] hover:bg-[#CDA351]/90 text-white"
                  >
                    View Full Task
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowTaskDetails(false)}
                    className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* Quick Note Button - Dashboard Style */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="default"
            className="rounded-full px-4 py-2 bg-[#CDA351] hover:bg-[#CDA351]/90 text-white shadow-lg flex items-center gap-2"
            onClick={() => setShowQuickNote(true)}
          >
            <PenTool className="h-5 w-5" />
            <span>Quick Note</span>
          </Button>
        </motion.div>
      </div>

      {/* Quick Note Dialog */}
      <QuickNoteButton open={showQuickNote} onOpenChange={setShowQuickNote} />
    </div>
  );
};

export default NotesPage;
