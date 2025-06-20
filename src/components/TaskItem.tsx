import { useState } from "react";
import { Task, TaskPriority, TaskSection } from "@/types";
import {
  Calendar,
  Check,
  Edit,
  Flag,
  Tag,
  Trash2,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  formatDate,
  getTagColor,
  isOverdue,
  getSectionFromDate,
} from "@/utils/taskUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDays, isAfter } from "date-fns";

interface TaskItemProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorityColors = {
  low: "text-green-500",
  medium: "text-yellow-500",
  high: "text-red-500",
};

const TaskItem = ({ task, onUpdate, onDelete }: TaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [tagInput, setTagInput] = useState("");

  const handleToggleComplete = () => {
    const updatedTask = {
      ...task,
      completed: !task.completed,
    };
    onUpdate(updatedTask);
  };

  const handleUpdateTask = () => {
    onUpdate({
      ...editedTask,
      lastModified: new Date(),
    });
    setIsEditing(false);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !editedTask.tags.includes(tagInput.trim())) {
      setEditedTask({
        ...editedTask,
        tags: [...editedTask.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTask({
      ...editedTask,
      tags: editedTask.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const isTaskOverdue = task.dueDate && isOverdue(task.dueDate);
  const isTaskSnoozed =
    !task.completed &&
    task.snoozedUntil &&
    isAfter(task.snoozedUntil, new Date());

  return (
    <>
      <AnimatePresence>
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`group relative flex items-start gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-[#CDA351]/10 hover:border-[#CDA351]/20 transition-colors ${
            task.completed ? "opacity-60" : ""
          }`}
        >
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 sm:h-7 sm:w-7 rounded-full border-2 transition-colors touch-manipulation ${
              task.completed
                ? "bg-[#CDA351] border-[#CDA351] text-white"
                : "border-gray-300 dark:border-gray-600 hover:border-[#CDA351]"
            }`}
            onClick={handleToggleComplete}
          >
            {task.completed && <Check className="h-3 w-3 sm:h-4 sm:w-4" />}
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={`font-medium text-sm sm:text-base text-[#1A1A1A] dark:text-white truncate ${
                  task.completed
                    ? "line-through text-[#7E7E7E] dark:text-gray-400"
                    : ""
                }`}
              >
                {task.title}
              </h3>
              <Flag
                className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                  priorityColors[task.priority]
                }`}
              />
              {isTaskSnoozed && (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  {format(task.snoozedUntil!, "h:mm a")}
                </span>
              )}
            </div>

            {task.description &&
              !task.description.startsWith("Original input:") && (
                <p className="text-xs sm:text-sm text-[#7E7E7E] dark:text-gray-400 mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}

            <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2 items-center">
              {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-[#CDA351]/10 text-[#CDA351] text-xs font-medium px-2 py-0.5 rounded-full hover:bg-[#CDA351]/20 dark:hover:bg-[#CDA351]/30 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {task.dueDate && (
                <span
                  className={`flex items-center gap-1 text-xs ${
                    isTaskOverdue && !task.completed
                      ? "text-red-500 dark:text-red-400"
                      : "text-[#7E7E7E] dark:text-gray-400"
                  }`}
                >
                  <Calendar size={10} className="sm:w-3 sm:h-3" />
                  {format(task.dueDate, "MMM d, h:mm a")}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 text-[#7E7E7E] hover:text-[#CDA351] dark:text-gray-400 dark:hover:text-[#CDA351] touch-manipulation"
              onClick={() => setIsEditing(true)}
            >
              <Edit size={14} className="sm:w-4 sm:h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 text-[#7E7E7E] hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 touch-manipulation"
              onClick={() => setIsDeleting(true)}
            >
              <Trash2 size={14} className="sm:w-4 sm:h-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Edit Task Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editedTask.title}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, title: e.target.value })
                }
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editedTask.description || ""}
                onChange={(e) =>
                  setEditedTask({
                    ...editedTask,
                    description: e.target.value || null,
                  })
                }
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={editedTask.priority}
                onValueChange={(value: TaskPriority) =>
                  setEditedTask({ ...editedTask, priority: value })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag and press Enter"
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                  className="bg-[#CDA351] hover:bg-[#CDA351]/90 text-white"
                >
                  Add
                </Button>
              </div>
              {editedTask.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {editedTask.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-[#CDA351]/10 text-[#CDA351] text-xs font-medium px-2 py-1 rounded-full"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      editedTask.dueDate
                        ? "text-[#CDA351] border-[#CDA351]/20"
                        : ""
                    }`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {editedTask.dueDate
                      ? format(editedTask.dueDate, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={editedTask.dueDate || undefined}
                    onSelect={(date) => {
                      if (date) {
                        // Set time to 11:59 PM if the date is today
                        const isToday =
                          new Date().toDateString() === date.toDateString();
                        if (isToday) {
                          date.setHours(23, 59, 59, 999);
                        }
                      }
                      const newSection = getSectionFromDate(date || null);
                      console.log(
                        "Due date changed:",
                        date,
                        "New section:",
                        newSection
                      );
                      setEditedTask((prev) => ({
                        ...prev,
                        dueDate: date || null,
                        section: newSection,
                      }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {editedTask.dueDate && (
                <p className="text-xs text-[#CDA351] font-medium">
                  Will be moved to:{" "}
                  {getSectionFromDate(editedTask.dueDate)
                    .charAt(0)
                    .toUpperCase() +
                    getSectionFromDate(editedTask.dueDate).slice(1)}{" "}
                  section
                </p>
              )}
              {!editedTask.dueDate && (
                <p className="text-xs text-gray-500">
                  Will be moved to: Someday section
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditing(false)}
              className="text-[#7E7E7E]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTask}
              className="bg-[#CDA351] hover:bg-[#CDA351]/90 text-white"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleting(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(task.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskItem;
