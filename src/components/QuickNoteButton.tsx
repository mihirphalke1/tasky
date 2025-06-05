import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { PenTool, Save, X } from "lucide-react";
import { toast } from "sonner";
import { addNote } from "@/lib/focusService";
import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

interface QuickNoteButtonProps {
  currentTaskId?: string; // If in Focus Mode, notes will be linked to this task
  currentTaskTitle?: string; // For display purposes
  className?: string;
  variant?: "default" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  open?: boolean; // External control of dialog state
  onOpenChange?: (open: boolean) => void; // External control callback
}

export function QuickNoteButton({
  currentTaskId,
  currentTaskTitle,
  className,
  variant = "default",
  size = "default",
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: QuickNoteButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const isFocusMode = location.pathname === "/focus";

  // Use external state if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = externalOnOpenChange || setInternalOpen;

  const handleSaveNote = async () => {
    if (!user || !noteContent.trim()) {
      toast.error("Please enter a note");
      return;
    }

    setIsSaving(true);

    try {
      console.log("Saving note with:", {
        userId: user.uid,
        content: noteContent.trim(),
        currentTaskId,
        isGeneral: !currentTaskId,
      });

      const noteId = await addNote(user.uid, noteContent.trim(), currentTaskId);
      console.log("Note saved successfully with ID:", noteId);

      const isLinked = !!currentTaskId;
      toast.success(isLinked ? "Task note saved!" : "General note saved!", {
        description: isLinked
          ? `Note linked to "${currentTaskTitle}"`
          : "Note saved to your general notes collection",
        duration: 3000,
      });

      setNoteContent("");
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note", {
        description: "Please try again",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveNote();
    }
  };

  if (!user) return null;

  // If externally controlled, render only the Dialog content
  if (externalOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Quick Note
            </DialogTitle>

            {currentTaskId && currentTaskTitle && (
              <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Linked to task:</span>
                  <span className="truncate">{currentTaskTitle}</span>
                </div>
                <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                  This note will be associated with your current focus task
                </p>
              </div>
            )}

            {!currentTaskId && (
              <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span>General note</span>
                </div>
                <p className="text-xs mt-1">
                  This note will be saved to your general notes
                </p>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your quick note here... (Cmd/Ctrl + Enter to save)"
              className="min-h-[120px] resize-none focus:ring-2 focus:ring-primary"
              autoFocus
            />

            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {noteContent.length}/1000 characters
                {noteContent.length > 800 && (
                  <span className="text-amber-500 ml-2">
                    {1000 - noteContent.length} characters remaining
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={
                    !noteContent.trim() || isSaving || noteContent.length > 1000
                  }
                  className="min-w-[80px]"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 p-2 rounded border">
              <strong>Tip:</strong> Use Cmd/Ctrl + Enter to quickly save your
              note
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Default rendering with DialogTrigger
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            !isFocusMode && "fixed bottom-6 right-6 z-40",
            className
          )}
        >
          <Button
            variant={variant}
            size={size}
            className={cn(
              "bg-[#CDA351] hover:bg-[#CDA351]/90 text-white shadow-lg",
              size === "icon" && "rounded-full w-12 h-12",
              className
            )}
          >
            <PenTool className="h-5 w-5" />
            {size !== "icon" && <span className="ml-2">Quick Note</span>}
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Quick Note
          </DialogTitle>

          {currentTaskId && currentTaskTitle && (
            <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium">Linked to task:</span>
                <span className="truncate">{currentTaskTitle}</span>
              </div>
              <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                This note will be associated with your current focus task
              </p>
            </div>
          )}

          {!currentTaskId && (
            <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span>General note</span>
              </div>
              <p className="text-xs mt-1">
                This note will be saved to your general notes
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your quick note here... (Cmd/Ctrl + Enter to save)"
            className="min-h-[120px] resize-none focus:ring-2 focus:ring-primary"
            autoFocus
          />

          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {noteContent.length}/1000 characters
              {noteContent.length > 800 && (
                <span className="text-amber-500 ml-2">
                  {1000 - noteContent.length} characters remaining
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={
                  !noteContent.trim() || isSaving || noteContent.length > 1000
                }
                className="min-w-[80px]"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 p-2 rounded border">
            <strong>Tip:</strong> Use Cmd/Ctrl + Enter to quickly save your note
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
