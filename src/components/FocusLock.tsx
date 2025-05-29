import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Lock, Unlock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FocusLockProps {
  isLocked: boolean;
  onToggle: (locked: boolean) => void;
}

export function FocusLock({ isLocked, onToggle }: FocusLockProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Request notification permission when component mounts
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  const handleToggle = () => {
    if (!isLocked && !isEnabled) {
      setShowConfirmDialog(true);
    } else {
      handleDisable();
    }
  };

  const handleEnable = () => {
    setIsEnabled(true);
    onToggle(true);
    setShowConfirmDialog(false);
    toast.success("Focus Lock enabled", {
      description:
        "You won't be able to exit until you disable Focus Lock. All navigation and keyboard shortcuts are disabled.",
      duration: 4000,
    });
  };

  const handleDisable = () => {
    setIsEnabled(false);
    onToggle(false);
    toast.success("Focus Lock disabled", {
      description:
        "You can now exit Focus Mode. Press Escape twice to confirm exit.",
      duration: 3000,
    });
  };

  return (
    <>
      <Button
        variant={isLocked ? "default" : "ghost"}
        size="sm"
        onClick={handleToggle}
        className={cn(
          "relative transition-all duration-200",
          isLocked
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <AnimatePresence mode="wait">
          {isLocked ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Lock className="h-4 w-4" />
              <span>Focus Locked</span>
            </motion.div>
          ) : (
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Unlock className="h-4 w-4" />
              <span>Focus Lock</span>
            </motion.div>
          )}
        </AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
          />
        )}
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Enable Focus Lock?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                When enabled, you won't be able to exit Focus Mode until you
                disable Focus Lock.
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Escape key will be disabled</li>
                <li>Exit button will be locked</li>
                <li>Browser back button will be blocked</li>
                <li>All keyboard shortcuts will be disabled</li>
                <li>Browser notifications will be enabled</li>
                <li>You'll need to manually disable Focus Lock to exit</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEnable}
              className="bg-red-500 hover:bg-red-600"
            >
              Enable Focus Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
