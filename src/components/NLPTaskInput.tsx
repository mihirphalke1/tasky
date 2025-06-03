import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Calendar,
  Clock,
  Flag,
  Tag,
  Edit3,
  Check,
  X,
  Lightbulb,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Task, TaskPriority } from "@/types";
import {
  parseNaturalLanguageTask,
  validateParsedTask,
  getSuggestions,
  ParsedTask,
} from "@/utils/nlpParser";
import { getSectionFromDate } from "@/utils/taskUtils";
import { toast } from "sonner";

interface NLPTaskInputProps {
  onAddTask: (task: Omit<Task, "id" | "userId">) => void;
  className?: string;
}

export interface NLPTaskInputRef {
  focusInput: () => void;
  clearInput: () => void;
}

const priorityColors = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

const priorityIcons = {
  low: "🟢",
  medium: "🟡",
  high: "🔴",
};

const NLPTaskInput = forwardRef<NLPTaskInputRef, NLPTaskInputProps>(
  ({ onAddTask, className = "" }, ref) => {
    const [input, setInput] = useState("");
    const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editableTitle, setEditableTitle] = useState("");
    const [editablePriority, setEditablePriority] =
      useState<TaskPriority>("medium");
    const [editableTags, setEditableTags] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const parseTimeoutRef = useRef<NodeJS.Timeout>();

    useImperativeHandle(ref, () => ({
      focusInput: () => {
        inputRef.current?.focus();
      },
      clearInput: () => {
        setInput("");
        setParsedTask(null);
        setIsEditing(false);
        setSuggestions([]);
        setShowSuggestions(false);
      },
    }));

    // Real-time parsing with debounce
    useEffect(() => {
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }

      if (input.trim().length === 0) {
        setParsedTask(null);
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (input.trim().length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      parseTimeoutRef.current = setTimeout(() => {
        try {
          const parsed = parseNaturalLanguageTask(input);
          const validated = validateParsedTask(parsed);
          setParsedTask(validated);

          // Get suggestions
          const inputSuggestions = getSuggestions(input);
          setSuggestions(inputSuggestions);
          setShowSuggestions(inputSuggestions.length > 0);

          // Set editable values
          setEditableTitle(validated.title);
          setEditablePriority(validated.priority || "medium");
          setEditableTags(validated.tags);
        } catch (error) {
          console.error("Error parsing natural language:", error);
          setParsedTask(null);
        } finally {
          setIsLoading(false);
        }
      }, 300); // 300ms debounce

      return () => {
        if (parseTimeoutRef.current) {
          clearTimeout(parseTimeoutRef.current);
        }
      };
    }, [input]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      if (!parsedTask || !editableTitle.trim()) {
        toast.error("Please enter a valid task");
        return;
      }

      const now = new Date();
      const newTask: Omit<Task, "id" | "userId"> = {
        title: editableTitle.trim(),
        description: `Original input: "${parsedTask.originalText}"`,
        completed: false,
        createdAt: now,
        lastModified: now,
        dueDate: parsedTask.dueDate || null,
        tags: editableTags,
        priority: editablePriority,
        snoozedUntil: null,
        section: getSectionFromDate(parsedTask.dueDate || null),
      };

      onAddTask(newTask);

      // Clear the form
      setInput("");
      setParsedTask(null);
      setIsEditing(false);
      setSuggestions([]);
      setShowSuggestions(false);

      toast.success("Task added successfully!");
    };

    const handleSuggestionClick = (suggestion: string) => {
      setInput(suggestion);
      setShowSuggestions(false);
    };

    const handleTagRemove = (tagToRemove: string) => {
      setEditableTags((prev) => prev.filter((tag) => tag !== tagToRemove));
    };

    const handleTagAdd = (newTag: string) => {
      if (newTag.trim() && !editableTags.includes(newTag.trim())) {
        setEditableTags((prev) => [...prev, newTag.trim()]);
      }
    };

    const toggleEditing = () => {
      setIsEditing(!isEditing);
    };

    const confidenceColor = parsedTask
      ? parsedTask.confidence > 0.7
        ? "text-green-600"
        : parsedTask.confidence > 0.4
        ? "text-yellow-600"
        : "text-red-600"
      : "text-gray-400";

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-[#CDA351]/20 mb-8 ${className}`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gradient-to-r from-[#CDA351] to-[#E6C17A] p-3 rounded-xl">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Smart Task Input
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Just type naturally - Tasky will understand what you mean
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded dark:bg-red-900/20 dark:text-red-400">
                High: "urgent", "asap", "important"
              </span>
              <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-1 rounded dark:bg-yellow-900/20 dark:text-yellow-400">
                Medium: "normal", "regular"
              </span>
              <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded dark:bg-green-900/20 dark:text-green-400">
                Low: "when possible", "no rush", "if I have time"
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Input */}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder='Try "Call Mihir tomorrow at 5pm urgent" or "Clean desk when I have time"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full text-base h-14 pl-4 pr-12 border-2 border-[#CDA351]/20 focus:border-[#CDA351]/40 dark:focus:border-[#CDA351]/60 rounded-xl bg-white dark:bg-gray-900 focus-visible:ring-2 focus-visible:ring-[#CDA351]/30"
            />

            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-[#CDA351]/30 border-t-[#CDA351] rounded-full"
                />
              </div>
            )}
          </div>

          {/* Smart Hints */}
          <AnimatePresence>
            {input.length > 0 && !parsedTask?.priority && input.length > 5 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="text-blue-500">💡</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Tip:</strong> Add priority by saying{" "}
                    <span className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">
                      "urgent"
                    </span>
                    ,{" "}
                    <span className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">
                      "when I have time"
                    </span>
                    , or{" "}
                    <span className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">
                      "no rush"
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggestions */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Lightbulb size={16} />
                  <span>Suggestions:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs h-8 px-3 border-[#CDA351]/20 hover:border-[#CDA351]/40 hover:bg-[#CDA351]/5 dark:border-[#CDA351]/30 dark:hover:border-[#CDA351]/50 dark:hover:bg-[#CDA351]/10"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Parsed Preview */}
          <AnimatePresence>
            {parsedTask && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gradient-to-r from-[#CDA351]/5 to-[#E6C17A]/10 dark:from-[#CDA351]/10 dark:to-[#E6C17A]/20 rounded-xl p-4 border border-[#CDA351]/20 dark:border-[#CDA351]/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Preview
                    </span>
                    <div className={`text-xs ${confidenceColor}`}>
                      {Math.round(parsedTask.confidence * 100)}% confident
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleEditing}
                    className="h-8 px-2 text-[#CDA351] hover:text-[#CDA351]/80 hover:bg-[#CDA351]/10 dark:text-[#CDA351] dark:hover:text-[#CDA351]/80 dark:hover:bg-[#CDA351]/20"
                  >
                    <Edit3 size={14} />
                    {isEditing ? "Done" : "Edit"}
                  </Button>
                </div>

                <div className="space-y-3">
                  {/* Title */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16">
                      Task:
                    </span>
                    {isEditing ? (
                      <Input
                        value={editableTitle}
                        onChange={(e) => setEditableTitle(e.target.value)}
                        className="flex-1 h-8 text-sm border-[#CDA351]/20 focus:border-[#CDA351]/40"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {editableTitle}
                      </span>
                    )}
                  </div>

                  {/* Due Date */}
                  {parsedTask.dueDate && (
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-[#CDA351]" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Due:{" "}
                        {format(parsedTask.dueDate, "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  )}

                  {/* Priority */}
                  {(parsedTask.priority || editablePriority !== "medium") && (
                    <div className="flex items-center gap-2">
                      <Flag size={16} className="text-[#CDA351]" />
                      {isEditing ? (
                        <select
                          value={editablePriority}
                          onChange={(e) =>
                            setEditablePriority(e.target.value as TaskPriority)
                          }
                          className="text-sm border border-[#CDA351]/20 rounded px-2 py-1 dark:bg-gray-800 dark:border-[#CDA351]/30"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                      ) : (
                        <Badge className={priorityColors[editablePriority]}>
                          {priorityIcons[editablePriority]}{" "}
                          {editablePriority.charAt(0).toUpperCase() +
                            editablePriority.slice(1)}{" "}
                          Priority
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {editableTags.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Tag size={16} className="text-[#CDA351] mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {editableTags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs bg-[#CDA351]/10 text-[#CDA351] border-[#CDA351]/20 dark:bg-[#CDA351]/20 dark:text-[#CDA351] dark:border-[#CDA351]/30"
                          >
                            {tag}
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleTagRemove(tag)}
                                className="ml-1 text-[#CDA351] hover:text-[#CDA351]/80 dark:text-[#CDA351] dark:hover:text-[#CDA351]/80"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Original Input */}
                  <div className="pt-2 border-t border-[#CDA351]/20 dark:border-[#CDA351]/30">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Original: "{parsedTask.originalText}"
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-4 flex justify-end">
                  <Button
                    type="submit"
                    className="bg-[#CDA351] hover:bg-[#CDA351]/90 text-white px-6 h-10 shadow-lg hover:shadow-xl"
                    disabled={!editableTitle.trim()}
                  >
                    <Check size={16} className="mr-2" />
                    Add Task
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    );
  }
);

NLPTaskInput.displayName = "NLPTaskInput";

export default NLPTaskInput;
