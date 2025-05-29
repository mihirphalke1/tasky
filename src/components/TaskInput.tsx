import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Flag, Plus, Tag, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  format,
  addDays,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";
import { Task, TaskPriority, TaskSection } from "@/types";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

interface TaskInputProps {
  onAddTask: (task: Omit<Task, "id" | "userId">) => void;
}

const priorityColors = {
  low: "text-green-500",
  medium: "text-yellow-500",
  high: "text-red-500",
};

// Helper function to set time to 11:59 PM
const setEndOfDay = (date: Date): Date => {
  return setMilliseconds(
    setSeconds(setMinutes(setHours(date, 23), 59), 59),
    999
  );
};

// Helper function to set custom time
const setCustomTime = (date: Date, hours: number, minutes: number): Date => {
  return setMilliseconds(
    setSeconds(setMinutes(setHours(date, hours), minutes), 0),
    0
  );
};

const TaskInput = ({ onAddTask }: TaskInputProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>(setEndOfDay(new Date()));
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [section, setSection] = useState<TaskSection>("today");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }

    const now = new Date();
    const newTask: Omit<Task, "id" | "userId"> = {
      title: title.trim(),
      description: description.trim() || null,
      completed: false,
      createdAt: now,
      lastModified: now,
      dueDate: dueDate || null,
      tags: tags || [],
      priority,
      section,
      snoozedUntil: null,
    };

    onAddTask(newTask);

    // Reset form
    setTitle("");
    setDescription("");
    setDueDate(setEndOfDay(new Date()));
    setTags([]);
    setPriority("medium");
    setSection("today");
    setShowDetails(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const getSectionFromDate = (date: Date | null): TaskSection => {
    if (!date) return "someday";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 2);

    const dateToCompare = new Date(date);
    dateToCompare.setHours(0, 0, 0, 0);

    if (dateToCompare.getTime() === today.getTime()) {
      return "today";
    } else if (dateToCompare.getTime() === tomorrow.getTime()) {
      return "tomorrow";
    } else if (dateToCompare.getTime() === nextDay.getTime()) {
      return "upcoming";
    } else {
      return "someday";
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Preserve the current time when changing the date
      const currentHours = dueDate.getHours();
      const currentMinutes = dueDate.getMinutes();
      const newDate = setCustomTime(date, currentHours, currentMinutes);
      setDueDate(newDate);
      setSection(getSectionFromDate(newDate));
      setShowDatePicker(false);
    } else {
      // Handle "No due date" selection
      setDueDate(null);
      setSection("someday");
      setShowDatePicker(false);
    }
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    const newDate = new Date(dueDate);
    setDueDate(setCustomTime(newDate, hours, minutes));
    setShowTimePicker(false);
  };

  const quickDateOptions = [
    { label: "No due date", value: null },
    { label: "Today", value: setEndOfDay(new Date()) },
    { label: "Tomorrow", value: setEndOfDay(addDays(new Date(), 1)) },
    { label: "Next Day", value: setEndOfDay(addDays(new Date(), 2)) },
    { label: "Next Week", value: setEndOfDay(addDays(new Date(), 7)) },
  ];

  // Generate time options for every 30 minutes
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = (i % 2) * 30;
    return {
      label: format(setCustomTime(new Date(), hours, minutes), "h:mm a"),
      hours,
      minutes,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-[#CDA351]/10 mb-8"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#CDA351]/10 p-3 rounded-xl">
            <Plus size={24} className="text-[#CDA351]" />
          </div>
          <Input
            type="text"
            placeholder="Add a new task..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 border-none shadow-none focus-visible:ring-0 text-lg text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:bg-transparent"
          />
          <div className="flex items-center gap-2">
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-2 ${
                    dueDate ? "text-[#CDA351] border-[#CDA351]/20" : ""
                  }`}
                >
                  <Calendar size={18} />
                  {dueDate ? format(dueDate, "MMM d") : "Due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-4"
                align="start"
                side="right"
                sideOffset={5}
              >
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {quickDateOptions.map((option) => (
                      <Button
                        key={option.label}
                        variant="outline"
                        size="sm"
                        className={`${
                          (dueDate &&
                            option.value &&
                            format(dueDate, "yyyy-MM-dd") ===
                              format(option.value, "yyyy-MM-dd")) ||
                          (!dueDate && !option.value)
                            ? "bg-[#CDA351]/10 text-[#CDA351] border-[#CDA351]/20"
                            : ""
                        }`}
                        onClick={() => {
                          setDueDate(option.value);
                          if (option.value) {
                            setSection(getSectionFromDate(option.value));
                          } else {
                            setSection("someday");
                          }
                          setShowDatePicker(false);
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    <CalendarComponent
                      mode="single"
                      selected={dueDate || undefined}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                    {dueDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setDueDate(null);
                          setSection("someday");
                          setShowDatePicker(false);
                        }}
                      >
                        Clear date
                      </Button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={showTimePicker} onOpenChange={setShowTimePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-2 ${
                    dueDate ? "text-[#CDA351] border-[#CDA351]/20" : ""
                  }`}
                >
                  <Clock size={18} />
                  {dueDate ? format(dueDate, "h:mm a") : "Time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-2"
                align="start"
                side="right"
                sideOffset={5}
              >
                <div className="grid grid-cols-4 gap-1 max-h-[200px] overflow-y-auto">
                  {timeOptions.map((option) => (
                    <Button
                      key={option.label}
                      variant="ghost"
                      size="sm"
                      className={`${
                        dueDate &&
                        dueDate.getHours() === option.hours &&
                        dueDate.getMinutes() === option.minutes
                          ? "bg-[#CDA351]/10 text-[#CDA351]"
                          : ""
                      }`}
                      onClick={() =>
                        handleTimeSelect(option.hours, option.minutes)
                      }
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button
            type="submit"
            size="lg"
            className="bg-[#CDA351] hover:bg-[#CDA351]/90 transition-all duration-200 text-white shadow-sm hover:shadow-md"
          >
            Add
          </Button>
        </div>

        <AnimatePresence>
          {!showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[#CDA351] hover:text-[#CDA351] hover:bg-[#CDA351]/10"
                onClick={() => setShowDetails(true)}
              >
                + Add details
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <Textarea
                placeholder="Add description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] resize-none border-none shadow-none focus-visible:ring-0 dark:bg-transparent"
              />

              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 bg-[#CDA351]/5 dark:bg-[#CDA351]/10 px-4 py-2 rounded-xl flex-grow">
                  <Tag size={18} className="text-[#CDA351]" />
                  <Input
                    type="text"
                    placeholder="Add tags..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="border-none shadow-none bg-transparent focus-visible:ring-0 p-0 h-auto text-sm dark:text-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-auto p-0 text-[#CDA351] hover:text-[#CDA351]/80"
                    onClick={handleAddTag}
                  >
                    Add
                  </Button>
                </div>

                <Select
                  value={priority}
                  onValueChange={(value: TaskPriority) => setPriority(value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <div className="flex items-center gap-2">
                      <Flag className={`w-4 h-4 ${priorityColors[priority]}`} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={section}
                  onValueChange={(value: TaskSection) => setSection(value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="tomorrow">Tomorrow</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="someday">Someday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <motion.span
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-1 bg-[#CDA351]/10 text-[#CDA351] text-sm font-medium px-3 py-1 rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-[#CDA351] hover:text-[#CDA351]/80"
                      >
                        <X size={14} />
                      </button>
                    </motion.span>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[#CDA351] hover:text-[#CDA351] hover:bg-[#CDA351]/10"
                onClick={() => setShowDetails(false)}
              >
                - Hide details
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
};

export default TaskInput;
