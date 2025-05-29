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

export function PomodoroTimer({ isActive, onComplete }: PomodoroTimerProps) {
  const [settings, setSettings] = useState<TimerSettings>(() => {
    const savedSettings = localStorage.getItem("pomodoroSettings");
    return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
  });
  const [timer, setTimer] = useState(settings.focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem("pomodoroSettings", JSON.stringify(settings));
  }, [settings]);

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
        {/* Progress Ring */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              className="text-muted stroke-current"
              strokeWidth="8"
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
              strokeWidth="8"
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
            <span className="text-4xl font-mono font-bold">
              {formatTime(timer)}
            </span>
            <span className="text-sm text-muted-foreground mt-1">
              {getPhaseText()}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetTimer}
            className="text-muted-foreground hover:text-foreground"
            title="Reset Timer"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={toggleTimer}
            className={cn(
              "w-20 h-20 rounded-full",
              isRunning ? "bg-red-500 hover:bg-red-600" : "bg-primary"
            )}
          >
            {isRunning ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Coffee className="h-4 w-4" />
            <span>Completed: {completedPomodoros} pomodoros</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {settings.pomodorosUntilLongBreak -
              (completedPomodoros % settings.pomodorosUntilLongBreak)}{" "}
            until long break
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-80 bg-card border-l shadow-lg p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Timer Settings</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Focus Duration (minutes)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleSettingChange(
                          "focusDuration",
                          Math.max(1, settings.focusDuration - 1)
                        )
                      }
                    >
                      <Minus className="h-4 w-4" />
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
                      className="w-20 text-center"
                      min="1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleSettingChange(
                          "focusDuration",
                          settings.focusDuration + 1
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Short Break (minutes)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleSettingChange(
                          "shortBreakDuration",
                          Math.max(1, settings.shortBreakDuration - 1)
                        )
                      }
                    >
                      <Minus className="h-4 w-4" />
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
                      className="w-20 text-center"
                      min="1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleSettingChange(
                          "shortBreakDuration",
                          settings.shortBreakDuration + 1
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Long Break (minutes)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleSettingChange(
                          "longBreakDuration",
                          Math.max(1, settings.longBreakDuration - 1)
                        )
                      }
                    >
                      <Minus className="h-4 w-4" />
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
                      className="w-20 text-center"
                      min="1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleSettingChange(
                          "longBreakDuration",
                          settings.longBreakDuration + 1
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pomodoros until Long Break</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleSettingChange(
                          "pomodorosUntilLongBreak",
                          Math.max(1, settings.pomodorosUntilLongBreak - 1)
                        )
                      }
                    >
                      <Minus className="h-4 w-4" />
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
                      className="w-20 text-center"
                      min="1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleSettingChange(
                          "pomodorosUntilLongBreak",
                          settings.pomodorosUntilLongBreak + 1
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Auto-start Breaks</Label>
                  <Switch
                    checked={settings.autoStartBreaks}
                    onCheckedChange={(checked) =>
                      handleSettingChange("autoStartBreaks", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Auto-start Pomodoros</Label>
                  <Switch
                    checked={settings.autoStartPomodoros}
                    onCheckedChange={(checked) =>
                      handleSettingChange("autoStartPomodoros", checked)
                    }
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
