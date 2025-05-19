import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Archive,
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  CheckCircle2,
} from "lucide-react";

interface TaskOverviewProps {
  tasks: Task[];
}

const TaskOverview = ({ tasks }: TaskOverviewProps) => {
  const [showArchived, setShowArchived] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTasks = tasks.filter((task) => {
    const taskDate = new Date(task.dueDate || task.createdAt);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === today.getTime();
  });

  const completedToday = todayTasks.filter((task) => task.completed).length;
  const pendingToday = todayTasks.filter((task) => !task.completed).length;

  const stats = [
    {
      label: "Total Today",
      value: todayTasks.length,
      icon: Calendar,
      color: "text-blue-500",
    },
    {
      label: "Completed",
      value: completedToday,
      icon: CheckCircle2,
      color: "text-green-500",
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg bg-opacity-10 ${stat.color} bg-current`}
                >
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="flex justify-end mb-6">
        <Button
          variant="outline"
          size="sm"
          className="text-[#CDA351] border-[#CDA351]/20 hover:bg-[#CDA351]/10"
          onClick={() => setShowArchived(true)}
        >
          <Archive className="w-4 h-4 mr-2" />
          View Old Tasks
        </Button>
      </div>

      <Dialog open={showArchived} onOpenChange={setShowArchived}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Archived Tasks</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {tasks
              .filter((task) => task.completed)
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((task) => (
                <div
                  key={task.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <h4 className="text-gray-900 dark:text-white font-medium">
                        {task.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Completed on {format(task.createdAt, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskOverview;
