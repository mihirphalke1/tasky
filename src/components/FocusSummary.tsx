import { motion } from "framer-motion";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Clock, CheckCircle, Coffee, TrendingUp, Award } from "lucide-react";

interface FocusSummaryProps {
  completedTasks: number;
  totalTasks: number;
  completedPomodoros: number;
  totalFocusTime: number;
  onClose: () => void;
}

export function FocusSummary({
  completedTasks,
  totalTasks,
  completedPomodoros,
  totalFocusTime,
  onClose,
}: FocusSummaryProps) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const getProductivityScore = () => {
    const taskCompletion = (completedTasks / totalTasks) * 100;
    const pomodoroEfficiency =
      (completedPomodoros / (totalFocusTime / 25)) * 100;
    return Math.round((taskCompletion + pomodoroEfficiency) / 2);
  };

  const getAchievementMessage = () => {
    const score = getProductivityScore();
    if (score >= 90) return "Outstanding focus session! 🌟";
    if (score >= 75) return "Great work! Keep it up! 💪";
    if (score >= 50) return "Good progress! 🎯";
    return "Every session counts! 🌱";
  };

  const handleClose = () => {
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <Card className="w-full max-w-lg p-6">
        <h2 className="text-2xl font-bold mb-2 text-center">
          Focus Session Summary
        </h2>
        <p className="text-center text-muted-foreground mb-6">
          {getAchievementMessage()}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">Tasks Completed</span>
            </div>
            <p className="text-2xl font-bold">
              {completedTasks} / {totalTasks}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-blue-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Coffee className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Pomodoros</span>
            </div>
            <p className="text-2xl font-bold">{completedPomodoros}</p>
          </div>

          <div className="p-4 rounded-lg bg-green-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-green-500" />
              <span className="font-medium">Focus Time</span>
            </div>
            <p className="text-2xl font-bold">{formatTime(totalFocusTime)}</p>
          </div>

          <div className="p-4 rounded-lg bg-purple-500/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="font-medium">Productivity Score</span>
            </div>
            <p className="text-2xl font-bold">{getProductivityScore()}%</p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleClose}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Return to Dashboard
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
