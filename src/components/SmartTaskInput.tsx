import React, { useState, useRef, useEffect } from "react";
import { Task, TaskSection } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Calendar,
  Clock,
  Tag,
  Sparkles,
  Save,
  X,
  Wand2,
  Brain,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Flag,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  addDays,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";
import { cn } from "@/lib/utils";

interface SmartTaskInputProps {
  onAddTask: (task: Omit<Task, "id" | "userId">) => Promise<void>;
  className?: string;
}

interface ParsedTask {
  title: string;
  description?: string;
  dueDate?: Date | null;
  priority: "low" | "medium" | "high";
  tags: string[];
  section: TaskSection;
}

export function SmartTaskInput({ onAddTask, className }: SmartTaskInputProps) {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick date options
  const quickDateOptions = [
    { label: "Today", value: "today" },
    { label: "Tomorrow", value: "tomorrow" },
    { label: "Upcoming", value: "upcoming" },
    { label: "Someday", value: "someday" },
  ];

  // Quick priority options
  const priorityOptions = [
    { label: "High", value: "high", icon: Flag },
    { label: "Medium", value: "medium", icon: Flag },
    { label: "Low", value: "low", icon: Flag },
  ];

  // Quick tag suggestions
  const tagSuggestions = [
    "work",
    "personal",
    "urgent",
    "meeting",
    "follow-up",
    "big3",
    "project",
    "health",
    "learning",
  ];

  // Parse natural language input
  const parseInput = (text: string): ParsedTask => {
    const task: ParsedTask = {
      title: text,
      description: "",
      dueDate: null,
      priority: "medium",
      tags: [],
      section: "today",
    };

    // Extract due date
    const today = new Date();
    const tomorrow = addDays(today, 1);

    if (text.toLowerCase().includes("tomorrow")) {
      // Set to 11:59 PM by default
      task.dueDate = setHours(
        setMinutes(setSeconds(setMilliseconds(tomorrow, 0), 0), 59),
        23
      );
      task.section = "tomorrow";
    } else if (text.toLowerCase().includes("next week")) {
      const nextWeek = addDays(today, 7);
      // Set to 11:59 PM by default
      task.dueDate = setHours(
        setMinutes(setSeconds(setMilliseconds(nextWeek, 0), 0), 59),
        23
      );
      task.section = "upcoming";
    } else if (text.toLowerCase().includes("this week")) {
      const thisWeek = addDays(today, 3);
      // Set to 11:59 PM by default
      task.dueDate = setHours(
        setMinutes(setSeconds(setMilliseconds(thisWeek, 0), 0), 59),
        23
      );
      task.section = "upcoming";
    } else if (
      text.toLowerCase().includes("someday") ||
      text.toLowerCase().includes("later")
    ) {
      task.section = "someday";
    }

    // Extract priority
    if (
      text.toLowerCase().includes("urgent") ||
      text.toLowerCase().includes("asap")
    ) {
      task.priority = "high";
    } else if (text.toLowerCase().includes("low priority")) {
      task.priority = "low";
    }

    // Extract tags
    const tagMatches = tagSuggestions.filter((tag) =>
      text.toLowerCase().includes(tag.toLowerCase())
    );
    if (tagMatches.length > 0) {
      task.tags = tagMatches;
    }

    // Extract time if present (this will override the default 11:59 PM)
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      const [_, hours, minutes = "00", period] = timeMatch;
      let hour = parseInt(hours);
      if (period.toLowerCase() === "pm" && hour < 12) hour += 12;
      if (period.toLowerCase() === "am" && hour === 12) hour = 0;

      const date = task.dueDate || today;
      task.dueDate = setHours(setMinutes(date, parseInt(minutes)), hour);
    }

    return task;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInput(text);
    setShowSuggestions(text.length > 0);

    if (text.length > 0) {
      const parsed = parseInput(text);
      setParsedTask(parsed);
    } else {
      setParsedTask(null);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setIsProcessing(true);
    try {
      const task = parseInput(input);
      await onAddTask({
        title: task.title,
        description: task.description,
        completed: false,
        createdAt: new Date(),
        dueDate: task.dueDate,
        tags: task.tags,
        priority: task.priority,
        section: task.section,
        lastModified: new Date(),
      });

      setInput("");
      setParsedTask(null);
      toast.success("Task added!");
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Add a task... (e.g., 'Schedule team meeting tomorrow at 2pm urgent')"
            className={cn(
              "h-12 pl-12 pr-4 text-base border-[#CDA351]/20 focus:border-[#CDA351] focus:ring-[#CDA351]/20",
              isProcessing && "animate-pulse"
            )}
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {isProcessing ? (
              <Sparkles className="h-5 w-5 text-[#CDA351] animate-pulse" />
            ) : (
              <Wand2 className="h-5 w-5 text-[#CDA351]" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {showSuggestions && parsedTask && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-[#CDA351]/20 shadow-lg z-50"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Brain className="h-4 w-4" />
                  <span>Smart suggestions based on your input:</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {parsedTask.dueDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4 text-[#CDA351]" />
                      <span>
                        Due: {format(parsedTask.dueDate, "MMM d, h:mm a")}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Flag className="h-4 w-4 text-[#CDA351]" />
                    <span>Priority: {parsedTask.priority}</span>
                  </div>

                  {parsedTask.tags.length > 0 && (
                    <div className="flex items-center gap-2 text-sm col-span-2">
                      <Tag className="h-4 w-4 text-[#CDA351]" />
                      <div className="flex flex-wrap gap-1">
                        {parsedTask.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-[#CDA351]/10 text-[#CDA351] rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced(true)}
                    className="border-[#CDA351]/20 hover:border-[#CDA351]/40 hover:bg-[#CDA351]/5"
                  >
                    <List className="h-4 w-4 mr-2" />
                    Advanced
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="bg-[#CDA351] hover:bg-[#CDA351]/90"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Add Task
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Advanced Task Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Title</label>
              <Input
                value={parsedTask?.title || ""}
                onChange={(e) =>
                  setParsedTask((prev) =>
                    prev ? { ...prev, title: e.target.value } : null
                  )
                }
                placeholder="Enter task title..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={parsedTask?.description || ""}
                onChange={(e) =>
                  setParsedTask((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
                placeholder="Add a description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Select
                  value={parsedTask?.section}
                  onValueChange={(value) =>
                    setParsedTask((prev) =>
                      prev
                        ? {
                            ...prev,
                            section: value as TaskSection,
                            dueDate:
                              value === "today"
                                ? new Date()
                                : value === "tomorrow"
                                ? addDays(new Date(), 1)
                                : value === "upcoming"
                                ? addDays(new Date(), 3)
                                : null,
                          }
                        : null
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select due date" />
                  </SelectTrigger>
                  <SelectContent>
                    {quickDateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={parsedTask?.priority}
                  onValueChange={(value) =>
                    setParsedTask((prev) =>
                      prev
                        ? { ...prev, priority: value as ParsedTask["priority"] }
                        : null
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tagSuggestions.map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setParsedTask((prev) =>
                        prev
                          ? {
                              ...prev,
                              tags: prev.tags.includes(tag)
                                ? prev.tags.filter((t) => t !== tag)
                                : [...prev.tags, tag],
                            }
                          : null
                      )
                    }
                    className={cn(
                      "border-[#CDA351]/20 hover:border-[#CDA351]/40 hover:bg-[#CDA351]/5",
                      parsedTask?.tags.includes(tag) &&
                        "bg-[#CDA351]/10 border-[#CDA351] text-[#CDA351]"
                    )}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleSubmit();
                  setShowAdvanced(false);
                }}
                disabled={isProcessing}
                className="bg-[#CDA351] hover:bg-[#CDA351]/90"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Add Task
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
