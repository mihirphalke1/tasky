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

      // Include all tasks, even if they are snoozed
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

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-semibold text-[#1A1A1A] dark:text-white">
            Pending Tasks
          </h2>
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#CDA351]" />
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm text-[#7E7E7E] dark:text-gray-400 hidden xs:inline">
            {totalPendingTasks} task{totalPendingTasks !== 1 ? "s" : ""} with
            due dates
          </span>
          <span className="text-xs text-[#7E7E7E] dark:text-gray-400 xs:hidden">
            {totalPendingTasks} pending
          </span>
          {/* Summary badges */}
          <div className="flex gap-1 ml-1 sm:ml-2">
            {categorizedTasks.overdue.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full">
                {categorizedTasks.overdue.length}
              </span>
            )}
            {categorizedTasks.today.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-500 text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full">
                {categorizedTasks.today.length}
              </span>
            )}
            {categorizedTasks.tomorrow.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-[#CDA351]/10 text-[#CDA351] text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full">
                {categorizedTasks.tomorrow.length}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {pendingTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <TaskItem
                task={task}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
