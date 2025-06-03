import { Task } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import TaskItem from "./TaskItem";
import {
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Flag,
} from "lucide-react";
import { Badge } from "./ui/badge";
import {
  isToday,
  isTomorrow,
  isPast,
  format,
  isThisWeek,
  isAfter,
} from "date-fns";
import { isOverdue } from "@/utils/taskUtils";

interface PendingTasksSectionProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const PendingTasksSection = ({
  tasks,
  onUpdateTask,
  onDeleteTask,
}: PendingTasksSectionProps) => {
  // Filter to get only incomplete tasks with due dates, excluding snoozed tasks
  const pendingTasks = tasks
    .filter((task) => {
      // Must be incomplete and have a due date
      if (task.completed || !task.dueDate) return false;

      // Exclude tasks that are still snoozed
      if (task.snoozedUntil && isAfter(task.snoozedUntil, new Date())) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by priority first, then by due date
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then sort by due date (earliest first)
      if (!a.dueDate || !b.dueDate) return 0;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  // Categorize tasks by due date status
  const categorizedTasks = {
    overdue: pendingTasks.filter(
      (task) => task.dueDate && isOverdue(task.dueDate)
    ),
    today: pendingTasks.filter((task) => task.dueDate && isToday(task.dueDate)),
    tomorrow: pendingTasks.filter(
      (task) => task.dueDate && isTomorrow(task.dueDate)
    ),
    thisWeek: pendingTasks.filter(
      (task) =>
        task.dueDate &&
        isThisWeek(task.dueDate) &&
        !isToday(task.dueDate) &&
        !isTomorrow(task.dueDate) &&
        !isOverdue(task.dueDate)
    ),
    upcoming: pendingTasks.filter(
      (task) =>
        task.dueDate &&
        !isOverdue(task.dueDate) &&
        !isToday(task.dueDate) &&
        !isTomorrow(task.dueDate) &&
        !isThisWeek(task.dueDate)
    ),
  };

  const totalPendingTasks = pendingTasks.length;

  // Don't render if no pending tasks
  if (totalPendingTasks === 0) {
    return null;
  }

  const getDueDateBadge = (task: Task) => {
    if (!task.dueDate) return null;

    const dueDate = new Date(task.dueDate);

    if (isOverdue(dueDate)) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 text-xs font-medium px-2.5 py-0.5 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          <span className="hidden sm:inline">Overdue </span>
          {format(dueDate, "MMM d")}
        </span>
      );
    } else if (isToday(dueDate)) {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-500 text-xs font-medium px-2.5 py-0.5 rounded-full">
          <Calendar className="w-3 h-3" />
          <span className="hidden sm:inline">Due </span>Today
        </span>
      );
    } else if (isTomorrow(dueDate)) {
      return (
        <span className="inline-flex items-center gap-1 bg-[#CDA351]/10 text-[#CDA351] text-xs font-medium px-2.5 py-0.5 rounded-full">
          <Calendar className="w-3 h-3" />
          <span className="hidden sm:inline">Due </span>Tomorrow
        </span>
      );
    } else if (isThisWeek(dueDate)) {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-500 text-xs font-medium px-2.5 py-0.5 rounded-full">
          <Calendar className="w-3 h-3" />
          <span className="hidden sm:inline">Due </span>
          {format(dueDate, "EEE")}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 bg-gray-500/10 text-gray-500 text-xs font-medium px-2.5 py-0.5 rounded-full">
          <Calendar className="w-3 h-3" />
          <span className="hidden sm:inline">Due </span>
          {format(dueDate, "MMM d")}
        </span>
      );
    }
  };

  const priorityColors = {
    low: "text-green-500",
    medium: "text-yellow-500",
    high: "text-red-500",
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-[#1A1A1A] dark:text-white">
            Pending Tasks
          </h2>
          <Clock className="w-5 h-5 text-[#CDA351]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#7E7E7E] dark:text-gray-400">
            {totalPendingTasks} task{totalPendingTasks !== 1 ? "s" : ""} with
            due dates
          </span>
          {/* Summary badges */}
          <div className="flex gap-1 ml-2">
            {categorizedTasks.overdue.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 text-xs font-medium px-2 py-0.5 rounded-full">
                {categorizedTasks.overdue.length}
              </span>
            )}
            {categorizedTasks.today.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-500 text-xs font-medium px-2 py-0.5 rounded-full">
                {categorizedTasks.today.length}
              </span>
            )}
            {categorizedTasks.tomorrow.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-[#CDA351]/10 text-[#CDA351] text-xs font-medium px-2 py-0.5 rounded-full">
                {categorizedTasks.tomorrow.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Priority Tasks Preview */}
      <div className="space-y-3">
        <AnimatePresence>
          {pendingTasks.slice(0, 5).map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={`group relative flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-colors ${
                task.dueDate && isOverdue(task.dueDate)
                  ? "border-red-500/20 hover:border-red-500/30 bg-red-50/50 dark:bg-red-900/10"
                  : task.dueDate && isToday(task.dueDate)
                  ? "border-blue-500/20 hover:border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10"
                  : "border-[#CDA351]/10 hover:border-[#CDA351]/20"
              }`}
            >
              <button
                className={`h-6 w-6 rounded-full border-2 transition-colors ${
                  task.completed
                    ? "bg-[#CDA351] border-[#CDA351] text-white"
                    : "border-gray-300 dark:border-gray-600 hover:border-[#CDA351]"
                }`}
                onClick={() =>
                  onUpdateTask({
                    ...task,
                    completed: true,
                    completedAt: new Date(),
                  })
                }
              >
                {task.completed && <CheckCircle2 className="h-4 w-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[#1A1A1A] dark:text-white truncate">
                    {task.title}
                  </h3>
                  <Flag
                    className={`w-4 h-4 ${priorityColors[task.priority]}`}
                  />
                </div>

                {task.description && (
                  <p className="text-sm text-[#7E7E7E] dark:text-gray-400 mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  {getDueDateBadge(task)}

                  {task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {task.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 bg-[#CDA351]/10 text-[#CDA351] text-xs font-medium px-2.5 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {task.tags.length > 2 && (
                        <span className="text-xs text-[#7E7E7E] dark:text-gray-400">
                          +{task.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {pendingTasks.length > 5 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-[#7E7E7E] dark:text-gray-400">
            and {pendingTasks.length - 5} more pending task
            {pendingTasks.length - 5 !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Quick stats - Only show if we have significant categorization */}
      {(categorizedTasks.overdue.length > 0 ||
        categorizedTasks.today.length > 0 ||
        categorizedTasks.tomorrow.length > 0) && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-red-500">
                {categorizedTasks.overdue.length}
              </div>
              <div className="text-xs text-[#7E7E7E] dark:text-gray-400">
                Overdue
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-500">
                {categorizedTasks.today.length}
              </div>
              <div className="text-xs text-[#7E7E7E] dark:text-gray-400">
                Today
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-[#CDA351]">
                {categorizedTasks.tomorrow.length}
              </div>
              <div className="text-xs text-[#7E7E7E] dark:text-gray-400">
                Tomorrow
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-500">
                {categorizedTasks.thisWeek.length +
                  categorizedTasks.upcoming.length}
              </div>
              <div className="text-xs text-[#7E7E7E] dark:text-gray-400">
                Later
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingTasksSection;
