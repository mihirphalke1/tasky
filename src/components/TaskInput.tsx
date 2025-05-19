import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Flag, Plus, Tag, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
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

const TaskInput = ({ onAddTask }: TaskInputProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [section, setSection] = useState<TaskSection>("today");

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
    setDueDate(undefined);
    setTags([]);
    setPriority("medium");
    setSection("today");
    setShowDetails(false);
  };

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

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`flex items-center gap-2 ${
                        dueDate ? "text-[#CDA351] border-[#CDA351]/20" : ""
                      }`}
                    >
                      <Calendar size={18} />
                      {dueDate ? format(dueDate, "MMM d, yyyy") : "Due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <CalendarComponent
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
