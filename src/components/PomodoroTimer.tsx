import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import {
  Timer,
  Play,
  Pause,
  SkipForward,
  Coffee,
  Settings,
  Plus,
  Minus,
  X,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

interface PomodoroTimerProps {
  isActive: boolean;
  onComplete: () => void;
  externalToggle?: boolean; // External control for play/pause
  onToggleChange?: (isRunning: boolean) => void; // Callback when toggle state changes
  onSettingsToggle?: (isOpen: boolean) => void; // Callback when settings panel opens/closes
}

interface TimerSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  pomodorosUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
}

const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
};

export function PomodoroTimer({
  isActive,
  onComplete,
  externalToggle,
  onToggleChange,
  onSettingsToggle,
}: PomodoroTimerProps) {
  const [settings, setSettings] = useState<TimerSettings>(() => {
    const savedSettings = localStorage.getItem("pomodoroSettings");
    return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
  });

  // Initialize timer state from localStorage or default values
  const [timer, setTimer] = useState(() => {
    if (!isActive) {
      // If timer is not active, start with default duration
      return settings.focusDuration * 60;
    }

    const savedState = localStorage.getItem("pomodoroTimerState");
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.timer || settings.focusDuration * 60;
    }
    return settings.focusDuration * 60;
  });

  const [isRunning, setIsRunning] = useState(() => {
    if (!isActive) {
      return false;
    }

    const savedState = localStorage.getItem("pomodoroTimerState");
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.isRunning || false;
    }
    return false;
  });

  const [isBreak, setIsBreak] = useState(() => {
    if (!isActive) {
      return false;
    }

    const savedState = localStorage.getItem("pomodoroTimerState");
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.isBreak || false;
    }
    return false;
  });

  const [completedPomodoros, setCompletedPomodoros] = useState(() => {
    if (!isActive) {
      return 0;
    }

    const savedState = localStorage.getItem("pomodoroTimerState");
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.completedPomodoros || 0;
    }
    return 0;
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Handle when timer becomes active for the first time in a focus session
  useEffect(() => {
    if (isActive) {
      // Check if we have any saved state
      const savedState = localStorage.getItem("pomodoroTimerState");
      if (!savedState) {
        // No saved state means this is a fresh focus session
        // Reset to default values
        setTimer(settings.focusDuration * 60);
        setIsRunning(false);
        setIsBreak(false);
        setCompletedPomodoros(0);

        // Notify parent component about the initial state
        if (onToggleChange) {
          onToggleChange(false);
        }
      }
    }
  }, [isActive, settings.focusDuration, onToggleChange]);

  // Save timer state to localStorage whenever it changes (only if active)
  useEffect(() => {
    if (isActive) {
      const timerState = {
        timer,
        isRunning,
        isBreak,
        completedPomodoros,
        lastSaved: Date.now(),
      };
      localStorage.setItem("pomodoroTimerState", JSON.stringify(timerState));
    }
  }, [timer, isRunning, isBreak, completedPomodoros, isActive]);

  // On mount, check if we need to catch up with time that passed while unmounted
  useEffect(() => {
    if (!isActive) return; // Only process catch-up if timer is active

    const currentSettings = {
      focusDuration: settings.focusDuration,
      longBreakDuration: settings.longBreakDuration,
      shortBreakDuration: settings.shortBreakDuration,
      pomodorosUntilLongBreak: settings.pomodorosUntilLongBreak,
      autoStartBreaks: settings.autoStartBreaks,
      autoStartPomodoros: settings.autoStartPomodoros,
    };

    const savedState = localStorage.getItem("pomodoroTimerState");
    if (savedState) {
      const state = JSON.parse(savedState);
      if (state.isRunning && state.lastSaved) {
        const timeElapsed = Math.floor((Date.now() - state.lastSaved) / 1000);
        const newTimer = Math.max(0, state.timer - timeElapsed);
        setTimer(newTimer);

        // If timer would have completed while unmounted, handle it
        if (newTimer === 0 && state.timer > 0) {
          // Timer completed while unmounted - trigger completion logic
          if (state.isBreak) {
            setIsBreak(false);
            setTimer(currentSettings.focusDuration * 60);
            if (currentSettings.autoStartPomodoros) {
              setIsRunning(true);
            } else {
              setIsRunning(false);
            }
          } else {
            const newCompletedPomodoros = state.completedPomodoros + 1;
            setCompletedPomodoros(newCompletedPomodoros);

            if (
              newCompletedPomodoros %
                currentSettings.pomodorosUntilLongBreak ===
              0
            ) {
              setTimer(currentSettings.longBreakDuration * 60);
            } else {
              setTimer(currentSettings.shortBreakDuration * 60);
            }
            setIsBreak(true);
            if (currentSettings.autoStartBreaks) {
              setIsRunning(true);
            } else {
              setIsRunning(false);
            }
            onComplete();
          }
        }
      }
    }
  }, [settings, onComplete, isActive]); // Added isActive dependency

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem("pomodoroSettings", JSON.stringify(settings));
  }, [settings]);

  // Notify parent component when settings panel opens/closes
  useEffect(() => {
    if (onSettingsToggle) {
      onSettingsToggle(showSettings);
    }
  }, [showSettings, onSettingsToggle]);

  // Handle external toggle control
  useEffect(() => {
    if (externalToggle !== undefined) {
      const newRunningState = !isRunning;
      setIsRunning(newRunningState);
      if (onToggleChange) {
        onToggleChange(newRunningState);
      }
      if (newRunningState && !isRunning) {
        playSound("start");
      }
    }
  }, [externalToggle]);

  // Sound effects
  const playSound = (type: "start" | "complete" | "break") => {
    const audio = new Audio();
    switch (type) {
      case "start":
        audio.src = "/sounds/start.mp3";
        break;
      case "complete":
        audio.src = "/sounds/complete.mp3";
        break;
      case "break":
        audio.src = "/sounds/break.mp3";
        break;
    }
    audio.play().catch(() => {
      // Handle autoplay restrictions
      console.log("Audio playback failed");
    });
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      if (isBreak) {
        playSound("start");
        toast.success("Break time is over! Ready to focus?");
        setIsBreak(false);
        setTimer(settings.focusDuration * 60);
        if (settings.autoStartPomodoros) {
          setIsRunning(true);
        }
      } else {
        playSound("complete");
        const newCompletedPomodoros = completedPomodoros + 1;
        setCompletedPomodoros(newCompletedPomodoros);

        if (newCompletedPomodoros % settings.pomodorosUntilLongBreak === 0) {
          toast.success("Great work! Time for a longer break.");
          setTimer(settings.longBreakDuration * 60);
        } else {
          toast.success("Pomodoro complete! Time for a break.");
          setTimer(settings.shortBreakDuration * 60);
        }
        setIsBreak(true);
        if (settings.autoStartBreaks) {
          setIsRunning(true);
        }
        onComplete();
      }
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer, isBreak, completedPomodoros, settings, onComplete]);

  const toggleTimer = () => {
    if (!isRunning) {
      playSound("start");
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setTimer(
      isBreak ? settings.shortBreakDuration * 60 : settings.focusDuration * 60
    );
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getProgress = () => {
    const total = isBreak
      ? (completedPomodoros % settings.pomodorosUntilLongBreak === 0
          ? settings.longBreakDuration
          : settings.shortBreakDuration) * 60
      : settings.focusDuration * 60;
    return ((total - timer) / total) * 100;
  };

  const getPhaseText = () => {
    if (isBreak) {
      return completedPomodoros % settings.pomodorosUntilLongBreak === 0
        ? "Long Break"
        : "Short Break";
    }
    return "Focus Time";
  };

  const handleSettingChange = (
    key: keyof TimerSettings,
    value: number | boolean
  ) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      // Update timer if duration settings change
      if (typeof value === "number" && !isRunning) {
        if (key === "focusDuration" && !isBreak) {
          setTimer(value * 60);
        } else if (
          key === "shortBreakDuration" &&
          isBreak &&
          completedPomodoros % settings.pomodorosUntilLongBreak !== 0
        ) {
          setTimer(value * 60);
        } else if (
          key === "longBreakDuration" &&
          isBreak &&
          completedPomodoros % settings.pomodorosUntilLongBreak === 0
        ) {
          setTimer(value * 60);
        }
      }
      return newSettings;
    });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative">
        {/* Progress Ring - Made responsive */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto mb-4 sm:mb-6">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              className="text-muted stroke-current"
              strokeWidth="6"
              cx="50"
              cy="50"
              r="42"
              fill="transparent"
            />
            <circle
              className={cn(
                "stroke-current transition-all duration-1000 ease-linear",
                isBreak ? "text-blue-500" : "text-primary"
              )}
              strokeWidth="6"
              strokeLinecap="round"
              cx="50"
              cy="50"
              r="42"
              fill="transparent"
              strokeDasharray={`${getProgress() * 2.64} 264`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg sm:text-2xl md:text-4xl font-mono font-bold">
              {formatTime(timer)}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {getPhaseText()}
            </span>
          </div>
        </div>

        {/* Controls - Made responsive */}
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetTimer}
            className="text-muted-foreground hover:text-foreground w-8 h-8 sm:w-10 sm:h-10 p-0"
            title="Reset Timer"
          >
            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={toggleTimer}
            className={cn(
              "w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full",
              isRunning ? "bg-red-500 hover:bg-red-600" : "bg-primary"
            )}
          >
            {isRunning ? (
              <Pause className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8" />
            ) : (
              <Play className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-muted-foreground hover:text-foreground w-8 h-8 sm:w-10 sm:h-10 p-0"
          >
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        {/* Stats - Made responsive */}
        <div className="mt-4 sm:mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Coffee className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Completed: {completedPomodoros} pomodoros</span>
          </div>
          <div className="mt-1 sm:mt-2 text-xs text-muted-foreground">
            {settings.pomodorosUntilLongBreak -
              (completedPomodoros % settings.pomodorosUntilLongBreak)}{" "}
            until long break
          </div>
        </div>

        {/* Settings Panel - Made responsive */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0.0, 0.2, 1],
              }}
              className="mt-4 sm:mt-6 overflow-hidden"
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                exit={{ y: -20 }}
                transition={{
                  duration: 0.2,
                  delay: 0.1,
                  ease: "easeOut",
                }}
                className="p-3 sm:p-4 bg-muted/50 rounded-lg border max-h-80 overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-sm sm:text-lg font-semibold">
                    Timer Settings
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(false)}
                    className="text-muted-foreground hover:text-foreground h-6 w-6 sm:h-8 sm:w-8 p-0"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">
                      Focus Duration (minutes)
                    </Label>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSettingChange(
                            "focusDuration",
                            Math.max(1, settings.focusDuration - 1)
                          )
                        }
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={settings.focusDuration}
                        onChange={(e) =>
                          handleSettingChange(
                            "focusDuration",
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-12 sm:w-16 text-center h-7 sm:h-8 text-xs sm:text-sm"
                        min="1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSettingChange(
                            "focusDuration",
                            settings.focusDuration + 1
                          )
                        }
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">
                      Short Break (minutes)
                    </Label>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSettingChange(
                            "shortBreakDuration",
                            Math.max(1, settings.shortBreakDuration - 1)
                          )
                        }
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={settings.shortBreakDuration}
                        onChange={(e) =>
                          handleSettingChange(
                            "shortBreakDuration",
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-12 sm:w-16 text-center h-7 sm:h-8 text-xs sm:text-sm"
                        min="1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSettingChange(
                            "shortBreakDuration",
                            settings.shortBreakDuration + 1
                          )
                        }
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">
                      Long Break (minutes)
                    </Label>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSettingChange(
                            "longBreakDuration",
                            Math.max(1, settings.longBreakDuration - 1)
                          )
                        }
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={settings.longBreakDuration}
                        onChange={(e) =>
                          handleSettingChange(
                            "longBreakDuration",
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-12 sm:w-16 text-center h-7 sm:h-8 text-xs sm:text-sm"
                        min="1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSettingChange(
                            "longBreakDuration",
                            settings.longBreakDuration + 1
                          )
                        }
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">
                      Pomodoros until Long Break
                    </Label>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSettingChange(
                            "pomodorosUntilLongBreak",
                            Math.max(1, settings.pomodorosUntilLongBreak - 1)
                          )
                        }
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={settings.pomodorosUntilLongBreak}
                        onChange={(e) =>
                          handleSettingChange(
                            "pomodorosUntilLongBreak",
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-12 sm:w-16 text-center h-7 sm:h-8 text-xs sm:text-sm"
                        min="1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSettingChange(
                            "pomodorosUntilLongBreak",
                            settings.pomodorosUntilLongBreak + 1
                          )
                        }
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:gap-3 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm">
                        Auto-start breaks
                      </Label>
                      <button
                        onClick={() =>
                          handleSettingChange(
                            "autoStartBreaks",
                            !settings.autoStartBreaks
                          )
                        }
                        className={`relative inline-flex h-4 w-7 sm:h-5 sm:w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          settings.autoStartBreaks
                            ? "bg-primary"
                            : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 transform rounded-full bg-white transition-transform ${
                            settings.autoStartBreaks
                              ? "translate-x-3.5 sm:translate-x-5"
                              : "translate-x-0.5 sm:translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm">
                        Auto-start pomodoros
                      </Label>
                      <button
                        onClick={() =>
                          handleSettingChange(
                            "autoStartPomodoros",
                            !settings.autoStartPomodoros
                          )
                        }
                        className={`relative inline-flex h-4 w-7 sm:h-5 sm:w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          settings.autoStartPomodoros
                            ? "bg-primary"
                            : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 transform rounded-full bg-white transition-transform ${
                            settings.autoStartPomodoros
                              ? "translate-x-3.5 sm:translate-x-5"
                              : "translate-x-0.5 sm:translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
