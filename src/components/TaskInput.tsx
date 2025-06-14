import { useState, forwardRef, useImperativeHandle, useRef } from "react";
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
import { getSectionFromDate } from "@/utils/taskUtils";

interface TaskInputProps {
  onAddTask: (task: Omit<Task, "id" | "userId">) => void;
}

export interface TaskInputRef {
  focusInput: () => void;
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

const TaskInput = forwardRef<TaskInputRef, TaskInputProps>(
  ({ onAddTask }, ref) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState<Date>(setEndOfDay(new Date()));
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [showDetails, setShowDetails] = useState(false);
    const [priority, setPriority] = useState<TaskPriority>("medium");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const titleInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusInput: () => {
        titleInputRef.current?.focus();
      },
    }));

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
        snoozedUntil: null,
        section: getSectionFromDate(dueDate || null),
      };

      onAddTask(newTask);

      // Reset form
      setTitle("");
      setDescription("");
      setDueDate(setEndOfDay(new Date()));
      setTags([]);
      setPriority("medium");
      setShowDetails(false);
      setShowDatePicker(false);
      setShowTimePicker(false);
    };

    const handleDateSelect = (date: Date | undefined) => {
      if (date) {
        // Preserve the current time when changing the date
        const currentHours = dueDate.getHours();
        const currentMinutes = dueDate.getMinutes();
        const newDate = setCustomTime(date, currentHours, currentMinutes);
        setDueDate(newDate);
        setShowDatePicker(false);
      } else {
        // Handle "No due date" selection
        setDueDate(null);
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
        className="w-full bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 lg:p-8 shadow-md border-2 border-[#CDA351]/20 mb-6 sm:mb-8"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-3 sm:space-y-4 md:space-y-6"
        >
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1">
              <div className="bg-[#CDA351]/10 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl">
                <Plus
                  size={20}
                  className="sm:w-6 sm:h-6 md:w-7 md:h-7 text-[#CDA351]"
                />
              </div>
              <Input
                type="text"
                placeholder="Add a new task..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 border-2 border-[#CDA351]/20 shadow-none focus-visible:ring-2 focus-visible:ring-[#CDA351]/30 text-base sm:text-lg md:text-xl font-medium h-10 sm:h-12 md:h-14 lg:h-16 px-3 sm:px-4 bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl placeholder:text-gray-400 dark:placeholder:text-gray-500"
                ref={titleInputRef}
              />
            </div>

            {/* Action buttons row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg font-medium h-8 sm:h-10 md:h-12 lg:h-14 px-2 sm:px-3 md:px-4 rounded-lg sm:rounded-xl ${
                        dueDate
                          ? "text-[#CDA351] border-[#CDA351]/40 bg-[#CDA351]/5"
                          : "border-[#CDA351]/20"
                      }`}
                    >
                      <Calendar
                        size={16}
                        className="sm:w-5 sm:h-5 md:w-6 md:h-6"
                      />
                      <span className="hidden xs:inline">
                        {dueDate ? format(dueDate, "MMM d") : "Due"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-3 sm:p-4"
                    align="start"
                    side="bottom"
                    sideOffset={5}
                  >
                    <div className="space-y-3 sm:space-y-4">
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                        {quickDateOptions.map((option) => (
                          <Button
                            key={option.label}
                            variant="outline"
                            size="sm"
                            className={`text-xs sm:text-sm ${
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
                              setShowDatePicker(false);
                            }}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <div className="border-t pt-3 sm:pt-4">
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
                            className="w-full mt-2 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs sm:text-sm"
                            onClick={() => {
                              setDueDate(null);
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
                      className={`flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg font-medium h-8 sm:h-10 md:h-12 lg:h-14 px-2 sm:px-3 md:px-4 rounded-lg sm:rounded-xl ${
                        dueDate
                          ? "text-[#CDA351] border-[#CDA351]/40 bg-[#CDA351]/5"
                          : "border-[#CDA351]/20"
                      }`}
                    >
                      <Clock
                        size={16}
                        className="sm:w-5 sm:h-5 md:w-6 md:h-6"
                      />
                      <span className="hidden xs:inline">
                        {dueDate ? format(dueDate, "h:mm a") : "Time"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-2"
                    align="start"
                    side="bottom"
                    sideOffset={5}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 max-h-[200px] overflow-y-auto">
                      {timeOptions.map((option) => (
                        <Button
                          key={option.label}
                          variant="ghost"
                          size="sm"
                          className={`text-xs sm:text-sm ${
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
                size="default"
                className="bg-[#CDA351] hover:bg-[#CDA351]/90 transition-all duration-200 text-white shadow-lg hover:shadow-xl text-sm sm:text-base md:text-lg lg:text-xl font-bold h-8 sm:h-10 md:h-12 lg:h-14 px-4 sm:px-6 md:px-8 rounded-lg sm:rounded-xl"
              >
                <span className="hidden xs:inline">Add Task</span>
                <span className="xs:hidden">Add</span>
              </Button>
            </div>
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
                  className="text-[#CDA351] hover:text-[#CDA351] hover:bg-[#CDA351]/10 text-xs sm:text-sm"
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
                className="space-y-3 sm:space-y-4"
              >
                <Textarea
                  placeholder="Add description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px] sm:min-h-[100px] resize-none border-none shadow-none focus-visible:ring-0 dark:bg-transparent text-sm sm:text-base"
                />

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex items-center gap-2 bg-[#CDA351]/5 dark:bg-[#CDA351]/10 px-3 py-2 rounded-xl flex-grow w-full sm:w-auto">
                    <Tag size={16} className="text-[#CDA351]" />
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
                      className="border-none shadow-none bg-transparent focus-visible:ring-0 p-0 h-auto text-xs sm:text-sm dark:text-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-auto p-0 text-[#CDA351] hover:text-[#CDA351]/80 text-xs sm:text-sm"
                      onClick={handleAddTag}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <Select
                      value={priority}
                      onValueChange={(value: TaskPriority) =>
                        setPriority(value)
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[120px] text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Flag
                            className={`w-3 h-3 sm:w-4 sm:h-4 ${priorityColors[priority]}`}
                          />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <motion.span
                        key={tag}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-1 bg-[#CDA351]/10 text-[#CDA351] text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-[#CDA351] hover:text-[#CDA351]/80"
                        >
                          <X size={12} className="sm:w-[14px] sm:h-[14px]" />
                        </button>
                      </motion.span>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[#CDA351] hover:text-[#CDA351] hover:bg-[#CDA351]/10 text-xs sm:text-sm"
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
  }
);

export default TaskInput;
