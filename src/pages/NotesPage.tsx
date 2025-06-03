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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      try {
        const [userNotes, allUserTasks] = await Promise.all([
          getNotesWithTaskDetails(user.uid),
          getTasks(user.uid),
        ]);

        setNotes(userNotes);
        setUserTasks(allUserTasks);

        // Check if we have a taskId in query params
        const taskId = searchParams.get("taskId");
        if (taskId) {
          try {
            const task = await getTaskById(taskId);
            if (task && task.userId === user.uid) {
              // Ensure user can only access their tasks
              setFocusedTask(task);
              setActiveTab("tasks");
            }
          } catch (error) {
            console.warn("Failed to load focused task:", error);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load notes", {
          description: "Please try again later",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, navigate, searchParams]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            All Notes
          </h2>
          <p className="text-muted-foreground dark:text-gray-400 mt-1">
            {filteredNotes.length}{" "}
            {filteredNotes.length === 1 ? "note" : "notes"}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
        <QuickNoteButton variant="default" size="default" />
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-[#CDA351]/10 dark:bg-[#CDA351]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Layers3 className="h-10 w-10 text-[#CDA351]" />
          </div>
          <h3 className="text-xl font-medium text-muted-foreground dark:text-gray-300 mb-3">
            {searchQuery ? "No notes found" : "No notes yet"}
          </h3>
          <p className="text-muted-foreground dark:text-gray-400 mb-8 max-w-md mx-auto">
            {searchQuery
              ? `No notes match "${searchQuery}". Try a different search term.`
              : "Create your first note to get started"}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              onClick={() => setSearchQuery("")}
              className="mr-3 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Search
            </Button>
          )}
          <QuickNoteButton variant="default" size="default" />
        </div>
      ) : (
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
                <Card className="hover:shadow-lg dark:hover:shadow-xl transition-shadow duration-200 group bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          {note.isGeneral ? (
                            <div className="flex items-center gap-2">
                              <StickyNote className="h-4 w-4 text-[#CDA351]" />
                              <span className="text-sm font-semibold text-[#CDA351]">
                                General Note
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
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

                        {note.task && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 mb-4 border border-blue-200 dark:border-blue-700">
                            <div className="flex items-center gap-2 mb-2">
                              <LinkIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                Linked Task
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-3">
                              {note.task.title}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`text-xs ${getPriorityColor(
                                  note.task.priority
                                )} dark:bg-opacity-20`}
                              >
                                {note.task.priority}
                              </Badge>
                              <Badge
                                className={`text-xs ${getSectionColor(
                                  note.task.section
                                )} dark:bg-opacity-20`}
                              >
                                {note.task.section}
                              </Badge>
                              {note.task.completed && (
                                <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {note.task && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                            onClick={() => handleTaskClick(note.task!)}
                          >
                            <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-4 pb-6 border-t border-gray-100 dark:border-gray-600">
                    <div className="flex items-center justify-between w-full text-xs text-muted-foreground dark:text-gray-400">
                      <span>
                        {format(note.createdAt, "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{note.content.length} chars</span>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            General Notes
          </h2>
          <p className="text-muted-foreground dark:text-gray-400 mt-1">
            {filteredNotes.length}{" "}
            {filteredNotes.length === 1 ? "note" : "notes"}
          </p>
        </div>
        <QuickNoteButton variant="default" size="default" />
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-[#CDA351]/10 dark:bg-[#CDA351]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <StickyNote className="h-10 w-10 text-[#CDA351]" />
          </div>
          <h3 className="text-xl font-medium text-muted-foreground dark:text-gray-300 mb-3">
            {searchQuery ? "No notes found" : "No general notes yet"}
          </h3>
          <p className="text-muted-foreground dark:text-gray-400 mb-8 max-w-md mx-auto">
            {searchQuery
              ? `No notes match "${searchQuery}"`
              : "Create your first general note"}
          </p>
          <QuickNoteButton variant="default" size="default" />
        </div>
      ) : (
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
                <Card className="hover:shadow-lg dark:hover:shadow-xl transition-shadow duration-200 group bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <StickyNote className="h-4 w-4 text-[#CDA351]" />
                        <span className="text-sm font-semibold text-[#CDA351]">
                          General Note
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(note.createdAt, {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-4 pb-6 border-t border-gray-100 dark:border-gray-600">
                    <div className="flex items-center justify-between w-full text-xs text-muted-foreground dark:text-gray-400">
                      <span>
                        {format(note.createdAt, "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{note.content.length} chars</span>
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
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-8">
            <div>
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
                {filteredNotes.length}{" "}
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
            <QuickNoteButton
              variant="default"
              size="default"
              currentTaskId={focusedTask.id}
              currentTaskTitle={focusedTask.title}
            />
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
                  <Card className="hover:shadow-lg dark:hover:shadow-xl transition-shadow duration-200 group bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            Task Note
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(note.createdAt, {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-4 pb-6 border-t border-gray-100 dark:border-gray-600">
                      <div className="flex items-center justify-between w-full text-xs text-muted-foreground dark:text-gray-400">
                        <span>
                          {format(note.createdAt, "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{note.content.length} chars</span>
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
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Tasks with Notes
            </h2>
            <p className="text-muted-foreground dark:text-gray-400 mt-1">
              {tasksWithNotes.length}{" "}
              {tasksWithNotes.length === 1 ? "task has" : "tasks have"} notes
            </p>
          </div>
        </div>

        {tasksWithNotes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Layers3 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-medium text-muted-foreground dark:text-gray-300 mb-3">
              No task notes yet
            </h3>
            <p className="text-muted-foreground dark:text-gray-400 mb-8 max-w-md mx-auto">
              Create notes for your tasks to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {tasksWithNotes.map((task) => {
                const taskNotes = getTaskNotes(task.id);
                const isExpanded = expandedTasks.has(task.id);

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="overflow-hidden bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:shadow-lg dark:hover:shadow-xl transition-shadow duration-200">
                      <CardHeader
                        className="pb-4 cursor-pointer"
                        onClick={() => toggleTaskExpansion(task.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                                {task.title}
                              </h3>
                              <Badge className="text-xs bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">
                                {taskNotes.length}{" "}
                                {taskNotes.length === 1 ? "note" : "notes"}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground dark:text-gray-400 mb-3">
                                {task.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                className={`${getPriorityColor(
                                  task.priority
                                )} text-xs dark:bg-opacity-20`}
                              >
                                {task.priority}
                              </Badge>
                              <Badge
                                className={`${getSectionColor(
                                  task.section
                                )} text-xs dark:bg-opacity-20`}
                              >
                                {task.section}
                              </Badge>
                              {task.completed && (
                                <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskClick(task);
                              }}
                              className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              View Details
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 dark:text-gray-400"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <CardContent className="pt-0 border-t border-gray-100 dark:border-gray-600">
                              <div className="space-y-4 mt-6">
                                {taskNotes.map((note) => (
                                  <div
                                    key={note.id}
                                    className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-700 group"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                          {note.content}
                                        </p>
                                        <p className="text-xs text-muted-foreground dark:text-gray-400 mt-3">
                                          {format(
                                            note.createdAt,
                                            "MMM d, yyyy 'at' h:mm a"
                                          )}
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() =>
                                          handleDeleteNote(note.id)
                                        }
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                <div className="pt-2">
                                  <QuickNoteButton
                                    variant="ghost"
                                    size="sm"
                                    currentTaskId={task.id}
                                    currentTaskTitle={task.title}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FAF8F6] dark:bg-gray-900">
      <NavBar />
      <main className="container mx-auto px-6 py-10 max-w-7xl">
        <div className="flex h-[calc(100vh-140px)] gap-8">
          {/* Left Sidebar - 30% */}
          <div className="w-[30%] flex flex-col">
            <div className="mb-8 px-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-3">
                My Notes
              </h1>
              <p className="text-muted-foreground dark:text-gray-400">
                Organize your thoughts and ideas
              </p>
            </div>

            {/* Search */}
            <div className="mb-8 px-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search notes, tasks, and tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 focus:border-[#CDA351] focus:ring-[#CDA351] dark:text-gray-100 dark:placeholder-gray-400"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-col gap-3 mb-8 px-2">
              <Button
                variant={activeTab === "all" ? "default" : "ghost"}
                className={cn(
                  "justify-start h-14 text-left px-4 py-3",
                  activeTab === "all"
                    ? "bg-[#CDA351] hover:bg-[#CDA351]/90 text-white shadow-sm"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                )}
                onClick={() => {
                  setActiveTab("all");
                  setFocusedTask(null);
                  navigate("/notes");
                }}
              >
                <Layers3 className="h-5 w-5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">All Notes</div>
                  <div className="text-xs opacity-75 mt-0.5">
                    {notes.length} total
                  </div>
                </div>
              </Button>

              <Button
                variant={activeTab === "general" ? "default" : "ghost"}
                className={cn(
                  "justify-start h-14 text-left px-4 py-3",
                  activeTab === "general"
                    ? "bg-[#CDA351] hover:bg-[#CDA351]/90 text-white shadow-sm"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                )}
                onClick={() => {
                  setActiveTab("general");
                  setFocusedTask(null);
                  navigate("/notes");
                }}
              >
                <StickyNote className="h-5 w-5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">General Notes</div>
                  <div className="text-xs opacity-75 mt-0.5">
                    {notes.filter((n) => n.isGeneral).length} notes
                  </div>
                </div>
              </Button>

              <Button
                variant={activeTab === "tasks" ? "default" : "ghost"}
                className={cn(
                  "justify-start h-14 text-left px-4 py-3",
                  activeTab === "tasks"
                    ? "bg-[#CDA351] hover:bg-[#CDA351]/90 text-white shadow-sm"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                )}
                onClick={() => {
                  setActiveTab("tasks");
                  setFocusedTask(null);
                  navigate("/notes");
                }}
              >
                <LinkIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">Task Notes</div>
                  <div className="text-xs opacity-75 mt-0.5">
                    {notes.filter((n) => !n.isGeneral).length} notes
                  </div>
                </div>
              </Button>
            </div>

            {/* Enhanced Stats */}
            <div className="mt-auto mx-2 p-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Quick Stats
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-400">
                    Total Notes:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {notes.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-400">
                    General:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {notes.filter((n) => n.isGeneral).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-400">
                    Task-linked:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {notes.filter((n) => !n.isGeneral).length}
                  </span>
                </div>
                {searchQuery && (
                  <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-muted-foreground dark:text-gray-400">
                      Search Results:
                    </span>
                    <span className="font-semibold text-[#CDA351]">
                      {filteredNotes.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Content - 70% */}
          <div className="w-[70%] flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
            <ScrollArea className="flex-1 p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-[#CDA351] border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground dark:text-gray-400">
                      Loading your notes...
                    </p>
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
    </div>
  );
};

export default NotesPage;
