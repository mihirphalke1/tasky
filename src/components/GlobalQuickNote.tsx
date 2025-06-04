import { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { QuickNoteButton } from "./QuickNoteButton";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { PenTool } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { getTaskById } from "@/lib/taskService";

export function GlobalQuickNote() {
  const [showQuickNote, setShowQuickNote] = useState(false);
  const location = useLocation();
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const isLandingPage = location.pathname === "/";
  const isDashboardPage = location.pathname === "/dashboard";
  const isTaskPage = location.pathname.startsWith("/task/");
  const [currentTask, setCurrentTask] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Load task details if on a task page
  useEffect(() => {
    if (isTaskPage && taskId && user) {
      getTaskById(taskId)
        .then((task) => {
          if (task) {
            setCurrentTask({
              id: task.id,
              title: task.title,
            });
          }
        })
        .catch((error) => {
          console.error("Error loading task for quick note:", error);
        });
    }
  }, [isTaskPage, taskId, user]);

  // Don't show the button on the landing page or dashboard
  if (isLandingPage || isDashboardPage) return null;

  const handleQuickNote = () => {
    setShowQuickNote(true);
    toast.success("Quick Note", {
      description: isTaskPage
        ? `Adding note to task: ${currentTask?.title}`
        : "Opening quick note dialog",
      duration: 1500,
    });
  };

  // Set up keyboard shortcut
  useKeyboardShortcuts([
    {
      id: "quick-note",
      description: "Take a Quick Note",
      category: "tasks",
      keys: {
        mac: ["meta", "ctrl", "n"],
        windows: ["ctrl", "alt", "n"],
      },
      action: handleQuickNote,
      priority: 80,
      allowInModal: true,
    },
  ]);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex gap-3">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          size="default"
          className="rounded-full px-4 py-2 bg-[#CDA351] hover:bg-[#CDA351]/90 text-white shadow-lg flex items-center gap-2"
          onClick={handleQuickNote}
        >
          <PenTool className="h-5 w-5" />
          <span>Quick Note</span>
        </Button>
      </motion.div>
      <QuickNoteButton
        open={showQuickNote}
        onOpenChange={setShowQuickNote}
        currentTaskId={currentTask?.id}
        currentTaskTitle={currentTask?.title}
        size="icon"
      />
    </div>
  );
}
