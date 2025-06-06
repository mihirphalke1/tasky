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

  const todayTasks = tasks.filter((task) => {
    return getSectionFromDate(task.dueDate) === "today";
  });

  const completedToday = todayTasks.filter((task) => task.completed).length;
  const pendingToday = todayTasks.filter((task) => !task.completed).length;
  const completionPercentage =
    todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : null;
  const hasTasksToday = todayTasks.length > 0;
  const allTasksCompleted = hasTasksToday && pendingToday === 0;

  if (!hasTasksToday) {
    return <PositiveQuotes />;
  }

  const stats = [
    {
      label: "Today",
      value: todayTasks.length,
      icon: Calendar,
      color: "text-blue-500",
    },
    {
      label: allTasksCompleted ? "Done!" : "Done",
      value: completedToday,
      icon: allTasksCompleted ? Trophy : CheckCircle2,
      color: allTasksCompleted ? "text-[#CDA351]" : "text-green-500",
      progress: completionPercentage,
      showProgress: true,
    },
    {
      label: "Left",
      value: pendingToday,
      icon: Clock,
      color: "text-amber-500",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-3 gap-3 mb-6"
    >
      {allTasksCompleted ? (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="col-span-3 bg-gradient-to-r from-[#CDA351]/10 to-[#E6C17A]/10 border border-[#CDA351]/20 rounded-xl p-3 flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5 text-[#CDA351]" />
            <h3 className="text-lg font-semibold text-[#CDA351]">
              All tasks completed! 🎉
            </h3>
          </motion.div>
        </>
      ) : (
        stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1 rounded-lg bg-opacity-10 ${stat.color} bg-current`}
                  >
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </span>
                </div>
                {stat.showProgress && stat.progress !== null ? (
                  <div className="flex items-center gap-2">
                    <CircularProgress
                      progress={stat.progress}
                      size={24}
                      className="opacity-95"
                      showPercentage={false}
                    />
                    <span
                      className={`text-xs font-medium ${
                        allTasksCompleted
                          ? "text-[#CDA351]"
                          : "bg-gradient-to-r from-[#CDA351] to-[#E6C17A] bg-clip-text text-transparent"
                      }`}
                    >
                      {Math.round(stat.progress)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stat.value}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
};

export default TaskOverview;
