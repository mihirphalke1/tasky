import React, { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { getRandomQuote } from "@/lib/quotesService";
import { motion } from "framer-motion";
import { Task } from "@/types";

interface FocusWelcomeProps {
  tasks: Task[];
  backgroundImage?: string | null;
  onStartFocus: (task: Task, intention?: string) => void;
  onExit?: () => void;
}

export function FocusWelcome({
  tasks,
  onStartFocus,
  backgroundImage,
  onExit,
}: FocusWelcomeProps) {
  const [intention, setIntention] = useState("");
  const [quote, setQuote] = useState(() => getRandomQuote());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Set quote only once when component mounts
  useEffect(() => {
    setQuote(getRandomQuote());
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#FAF8F6] dark:bg-gray-900 z-50 flex items-center justify-center"
      style={{
        backgroundImage: backgroundImage
          ? `url(${backgroundImage})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
      <Card className="w-full max-w-lg p-8 text-center relative backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
        {/* Exit button in top-right if onExit is provided */}
        {onExit && (
          <Button
            variant="ghost"
            className="absolute top-4 right-4"
            onClick={onExit}
            aria-label="Exit Focus Mode"
          >
            <span className="sr-only">Exit</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        )}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold mb-6">Welcome to Focus Mode</h2>

          {/* Motivational Quote */}
          <div className="mb-8 p-4 bg-primary/5 rounded-lg">
            <p className="text-lg italic mb-2">"{quote.quote}"</p>
            <p className="text-sm text-muted-foreground">- {quote.author}</p>
          </div>

          {/* Task Selection */}
          {!selectedTask ? (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">
                Select a Task to Focus On
              </h3>
              <div className="flex flex-col gap-2">
                {tasks.length === 0 && (
                  <p className="text-muted-foreground">
                    No tasks available for today.
                  </p>
                )}
                {tasks.map((task) => (
                  <Button
                    key={task.id}
                    variant="outline"
                    className="justify-between w-full text-left"
                    onClick={() => setSelectedTask(task)}
                  >
                    <span>{task.title}</span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        task.priority === "high"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                          : task.priority === "medium"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                      }`}
                    >
                      {task.priority.charAt(0).toUpperCase() +
                        task.priority.slice(1)}{" "}
                      Priority
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Current Task Info */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">Current Task</h3>
                <p className="text-lg mb-2">{selectedTask.title}</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm ${
                    selectedTask.priority === "high"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                      : selectedTask.priority === "medium"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
                      : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                  }`}
                >
                  {selectedTask.priority.charAt(0).toUpperCase() +
                    selectedTask.priority.slice(1)}{" "}
                  Priority
                </span>
              </div>

              {/* Intention Setting */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">
                  Set Your Intention
                </h3>
                <Textarea
                  placeholder="What do you want to achieve in this focus session?"
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  className="mb-4 min-h-[100px]"
                />
                <p className="text-sm text-muted-foreground mb-4">
                  Setting an intention helps you stay focused and motivated.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setSelectedTask(null)}
                  className="text-muted-foreground"
                >
                  Change Task
                </Button>
                <Button
                  size="lg"
                  onClick={() => onStartFocus(selectedTask, intention)}
                  className="bg-primary hover:bg-primary/90"
                >
                  Start Focusing
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </Card>
    </motion.div>
  );
}
