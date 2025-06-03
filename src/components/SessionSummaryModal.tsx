import React from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  Target,
  CheckCircle,
  Coffee,
  TrendingUp,
  Lightbulb,
} from "lucide-react";

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: {
    totalTime: number;
    completedTasks: number;
    totalTasks: number;
    intention?: string;
    taskTitle?: string;
    pomodoroCount: number;
    currentStreak: number;
    longestStreak: number;
    sessionStartTime: Date;
  };
}

export function SessionSummaryModal({
  isOpen,
  onClose,
  sessionData,
}: SessionSummaryModalProps) {
  if (!isOpen) return null;

  const {
    totalTime,
    completedTasks,
    totalTasks,
    intention,
    taskTitle,
    pomodoroCount,
    currentStreak,
    longestStreak,
    sessionStartTime,
  } = sessionData;

  const getInsights = () => {
    const insights = [];

    // Time-based insights
    if (totalTime >= 60) {
      insights.push("Great job maintaining focus for over an hour!");
    } else if (totalTime >= 30) {
      insights.push("Solid 30-minute focus session!");
    }

    // Task completion insights
    const completionRate = (completedTasks / totalTasks) * 100;
    if (completionRate === 100) {
      insights.push("Perfect completion rate! You're on fire!");
    } else if (completionRate >= 75) {
      insights.push("High completion rate! Keep up the momentum!");
    }

    // Pomodoro insights
    if (pomodoroCount >= 4) {
      insights.push("Impressive number of Pomodoros completed!");
    }

    // Streak insights
    if (currentStreak > 3) {
      insights.push(
        `Amazing ${currentStreak}-day streak! You're building momentum!`
      );
    }

    return insights;
  };

  const insights = getInsights();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#FAF8F6] dark:bg-gray-900 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
      <Card className="w-full max-w-lg p-8 text-center relative backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold mb-6">
            Focus Session Complete! 🎉
          </h2>

          {/* Session Duration */}
          <div className="mb-8 p-4 bg-primary/5 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Session Duration</h3>
            </div>
            <p className="text-2xl font-bold">
              {formatDistanceToNow(sessionStartTime, { addSuffix: false })}
            </p>
          </div>

          {/* Task Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Task Progress</h3>
            </div>
            <div className="flex justify-center items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {completedTasks}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div className="text-2xl text-muted-foreground">/</div>
              <div className="text-center">
                <p className="text-3xl font-bold">{totalTasks}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </div>

          {/* Intention Recap */}
          {intention && (
            <div className="mb-8 p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">Your Intention</h3>
              </div>
              <p className="text-lg italic">"{intention}"</p>
            </div>
          )}

          {/* Pomodoro Stats */}
          {pomodoroCount > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Coffee className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">Pomodoro Stats</h3>
              </div>
              <p className="text-2xl font-bold">{pomodoroCount} completed</p>
            </div>
          )}

          {/* Streak Info */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Focus Streak</h3>
            </div>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold">{currentStreak}</p>
                <p className="text-sm text-muted-foreground">Current</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{longestStreak}</p>
                <p className="text-sm text-muted-foreground">Longest</p>
              </div>
            </div>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Insights</h3>
              <div className="space-y-2">
                {insights.map((insight, index) => (
                  <p
                    key={index}
                    className="text-sm text-muted-foreground flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            size="lg"
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Return to Dashboard
          </Button>
        </motion.div>
      </Card>
    </motion.div>
  );
}
