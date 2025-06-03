import { Task } from "@/types";
import { useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Circle, Clock, Calendar, CheckCircle2, Trophy } from "lucide-react";
import CircularProgress from "./CircularProgress";
import PositiveQuotes from "./PositiveQuotes";
import { getSectionFromDate } from "@/utils/taskUtils";

interface TaskOverviewProps {
  tasks: Task[];
}

const TaskOverview = ({ tasks }: TaskOverviewProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter tasks for today using the same logic as TaskSection
  const todayTasks = tasks.filter((task) => {
    return getSectionFromDate(task.dueDate) === "today";
  });

  const completedToday = todayTasks.filter((task) => task.completed).length;
  const pendingToday = todayTasks.filter((task) => !task.completed).length;

  // Updated completion percentage logic
  const completionPercentage =
    todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : null;
  const hasTasksToday = todayTasks.length > 0;
  const allTasksCompleted = hasTasksToday && pendingToday === 0;

  // Show PositiveQuotes if no tasks are planned for today
  if (!hasTasksToday) {
    return <PositiveQuotes />;
  }

  const stats = [
    {
      label: "Total Today",
      value: todayTasks.length,
      icon: Calendar,
      color: "text-blue-500",
    },
    {
      label: allTasksCompleted ? "All Complete!" : "Completed",
      value: completedToday,
      icon: allTasksCompleted ? Trophy : CheckCircle2,
      color: allTasksCompleted ? "text-[#CDA351]" : "text-green-500",
      progress: completionPercentage,
      showProgress: true,
    },
    {
      label: "Pending",
      value: pendingToday,
      icon: Clock,
      color: "text-amber-500",
    },
  ];

  return (
    <>
      {allTasksCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-[#CDA351]/10 to-[#E6C17A]/10 border border-[#CDA351]/20 rounded-2xl p-6 mb-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-6 h-6 text-[#CDA351]" />
            <h3 className="text-xl font-bold text-[#CDA351]">
              🎉 Fantastic Work!
            </h3>
          </div>
          <p className="text-[#7E7E7E] dark:text-gray-400">
            You've completed all your tasks for today. Time to celebrate!
          </p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={`p-1.5 sm:p-2 rounded-lg bg-opacity-10 ${stat.color} bg-current`}
                  >
                    <stat.icon
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </span>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </span>
              </div>

              {stat.showProgress && stat.progress !== null && (
                <div className="flex items-center gap-2 sm:gap-3 mt-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <CircularProgress
                    progress={stat.progress}
                    size={28}
                    className="opacity-95"
                    showPercentage={false}
                  />
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      allTasksCompleted
                        ? "text-[#CDA351]"
                        : "bg-gradient-to-r from-[#CDA351] to-[#E6C17A] bg-clip-text text-transparent"
                    }`}
                  >
                    {Math.round(stat.progress)}% Complete
                    {allTasksCompleted && " 🎉"}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
};

export default TaskOverview;
