import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Lock, Unlock, AlertTriangle, Shield } from "lucide-react";
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
  const [lockStartTime, setLockStartTime] = useState<Date | null>(null);

  // Sync internal state with prop
  useEffect(() => {
    setIsEnabled(isLocked);
    if (isLocked && !lockStartTime) {
      setLockStartTime(new Date());
    } else if (!isLocked) {
      setLockStartTime(null);
    }
  }, [isLocked, lockStartTime]);

  useEffect(() => {
    // Request notification permission when component mounts
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("Notification permission granted");
        }
      });
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
    setLockStartTime(new Date());
    onToggle(true);
    setShowConfirmDialog(false);

    // Show system notification if permission granted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Focus Lock Enabled", {
        body: "Exit actions are now blocked. You can only disable this lock manually.",
        icon: "/favicon.ico",
        tag: "focus-lock",
      });
    }

    toast.success("Focus Lock enabled", {
      description:
        "All exit actions blocked. Task shortcuts remain active. Use Cmd/Ctrl + L to disable.",
      duration: 4000,
    });
  };

  const handleDisable = () => {
    const wasLocked = isEnabled;
    setIsEnabled(false);
    setLockStartTime(null);
    onToggle(false);

    if (wasLocked) {
      // Calculate how long the lock was active
      const lockDuration = lockStartTime
        ? Math.round(
            (new Date().getTime() - lockStartTime.getTime()) / (1000 * 60)
          )
        : 0;

      // Show system notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Focus Lock Disabled", {
          body: `Lock was active for ${lockDuration} minutes. You can now exit Focus Mode.`,
          icon: "/favicon.ico",
          tag: "focus-lock",
        });
      }

      toast.success("Focus Lock disabled", {
        description: `Lock was active for ${lockDuration} minutes. You can now exit Focus Mode.`,
        duration: 3000,
      });
    }
  };

  const getLockDuration = () => {
    if (!lockStartTime) return 0;
    return Math.round(
      (new Date().getTime() - lockStartTime.getTime()) / (1000 * 60)
    );
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
            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg"
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
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">
                Locked ({getLockDuration()}m)
              </span>
              <span className="sm:hidden">Locked</span>
            </motion.div>
          ) : (
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Lock className="h-4 w-4" />
              <span>Focus Lock</span>
            </motion.div>
          )}
        </AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
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
            <DialogDescription className="space-y-3 pt-2">
              <p className="font-medium text-foreground">
                This will block ALL exit methods until manually disabled.
              </p>

              <div className="space-y-2 text-sm">
                <p className="font-medium text-muted-foreground">
                  Blocked Actions:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>Escape key and Exit button</li>
                  <li>Browser back/forward navigation</li>
                  <li>Page refresh (F5, Cmd/Ctrl+R)</li>
                  <li>Tab closing (Cmd/Ctrl+W)</li>
                  <li>App switching shortcuts</li>
                  <li>Developer tools access</li>
                </ul>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium text-green-600">Still Available:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>Task navigation and completion</li>
                  <li>Pomodoro timer controls</li>
                  <li>Snooze and postpone actions</li>
                  <li>Focus Lock toggle (Cmd/Ctrl + L)</li>
                </ul>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Important:</strong> You can only disable this lock
                  using the Focus Lock button or Cmd/Ctrl + L keyboard shortcut.
                </p>
              </div>
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
              <Shield className="h-4 w-4 mr-2" />
              Enable Focus Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
