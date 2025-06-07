import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import {
  ArrowLeft,
  Keyboard,
  Navigation,
  CheckSquare,
  Settings,
  Monitor,
  Smartphone,
  Command,
  Apple,
  Chrome,
  Target,
} from "lucide-react";
import {
  isMac,
  isDesktop,
  formatShortcutKeys,
  useKeyboardShortcuts,
  type KeyboardShortcut,
  createGlobalShortcuts,
} from "@/hooks/useKeyboardShortcuts";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { QuickNoteButton } from "@/components/QuickNoteButton";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  PageWrapper,
  Container,
  Section,
  FlexContainer,
} from "@/components/ui/layout";

interface ShortcutDisplay {
  id: string;
  description: string;
  category: "navigation" | "tasks" | "general" | "focus";
  keys: {
    mac: string[];
    windows: string[];
  };
}

const shortcuts: ShortcutDisplay[] = [
  // Navigation
  {
    id: "focus-mode",
    description: "Enter Focus Mode",
    category: "navigation",
    keys: {
      mac: ["meta", "shift", "enter"],
      windows: ["ctrl", "shift", "enter"],
    },
  },
  {
    id: "dashboard",
    description: "Return to Dashboard",
    category: "navigation",
    keys: {
      mac: ["escape"],
      windows: ["escape"],
    },
  },
  {
    id: "show-shortcuts",
    description: "Show Keyboard Shortcuts",
    category: "navigation",
    keys: {
      mac: ["meta", "/"],
      windows: ["ctrl", "/"],
    },
  },
  {
    id: "notes",
    description: "View Notes Page",
    category: "navigation",
    keys: {
      mac: ["n"],
      windows: ["n"],
    },
  },

  // Focus Mode
  {
    id: "focus-next",
    description: "Navigate to Next Task",
    category: "focus",
    keys: {
      mac: ["arrowright"],
      windows: ["arrowright"],
    },
  },
  {
    id: "focus-previous",
    description: "Navigate to Previous Task",
    category: "focus",
    keys: {
      mac: ["arrowleft"],
      windows: ["arrowleft"],
    },
  },
  {
    id: "focus-complete",
    description: "Complete Current Task",
    category: "focus",
    keys: {
      mac: ["meta", "enter"],
      windows: ["ctrl", "enter"],
    },
  },
  {
    id: "focus-pomodoro-toggle",
    description: "Pomodoro Play/Pause",
    category: "focus",
    keys: {
      mac: ["space"],
      windows: ["space"],
    },
  },
  {
    id: "focus-pomodoro",
    description: "Toggle Pomodoro Timer",
    category: "focus",
    keys: {
      mac: ["p"],
      windows: ["p"],
    },
  },
  {
    id: "focus-task-notes",
    description: "Toggle Task Notes Panel",
    category: "focus",
    keys: {
      mac: ["n"],
      windows: ["n"],
    },
  },
  {
    id: "focus-postpone",
    description: "Postpone Task to Tomorrow",
    category: "focus",
    keys: {
      mac: ["meta", "shift", "arrowright"],
      windows: ["ctrl", "shift", "arrowright"],
    },
  },
  {
    id: "focus-snooze",
    description: "Snooze Task for 2 Hours",
    category: "focus",
    keys: {
      mac: ["meta", "s"],
      windows: ["ctrl", "s"],
    },
  },
  {
    id: "focus-lock",
    description: "Toggle Focus Lock",
    category: "focus",
    keys: {
      mac: ["meta", "l"],
      windows: ["ctrl", "l"],
    },
  },
  {
    id: "focus-shortcuts",
    description: "Show/Hide Shortcuts Panel",
    category: "focus",
    keys: {
      mac: ["meta", "/"],
      windows: ["ctrl", "/"],
    },
  },
  {
    id: "focus-exit",
    description: "Exit Focus Mode",
    category: "focus",
    keys: {
      mac: ["meta", "escape"],
      windows: ["ctrl", "escape"],
    },
  },

  // Tasks
  {
    id: "add-task",
    description: "Add New Task (Dashboard)",
    category: "tasks",
    keys: {
      mac: ["meta", "j"],
      windows: ["ctrl", "j"],
    },
  },
  {
    id: "search",
    description: "Search Tasks (Dashboard)",
    category: "tasks",
    keys: {
      mac: ["meta", "k"],
      windows: ["ctrl", "k"],
    },
  },
  {
    id: "toggle-input-mode",
    description: "Toggle Smart/Traditional Input",
    category: "tasks",
    keys: {
      mac: ["i"],
      windows: ["i"],
    },
  },
  {
    id: "clear-completed",
    description: "Hide Completed Tasks",
    category: "tasks",
    keys: {
      mac: ["meta", "shift", "backspace"],
      windows: ["ctrl", "shift", "backspace"],
    },
  },

  // General
  {
    id: "quick-note",
    description: "Take a Quick Note",
    category: "general",
    keys: {
      mac: ["meta", "ctrl", "n"],
      windows: ["ctrl", "alt", "n"],
    },
  },
  {
    id: "streak-calendar",
    description: "Open Productivity Streak Calendar",
    category: "general",
    keys: {
      mac: ["s"],
      windows: ["s"],
    },
  },
  {
    id: "toggle-theme",
    description: "Toggle Dark/Light Mode",
    category: "general",
    keys: {
      mac: ["meta", "shift", "l"],
      windows: ["ctrl", "shift", "l"],
    },
  },
  {
    id: "escape",
    description: "Close Dialogs/Cancel Actions",
    category: "general",
    keys: {
      mac: ["escape"],
      windows: ["escape"],
    },
  },
];

const categoryIcons = {
  navigation: Navigation,
  tasks: CheckSquare,
  general: Settings,
  focus: Target,
};

const categoryDescriptions = {
  navigation: "Navigate between pages and modes throughout the app",
  tasks: "Manage and organize your tasks on the dashboard",
  general: "App-wide functionality, themes, and global actions",
  focus:
    "Productivity shortcuts available in Focus Mode for distraction-free work",
};

const Shortcuts = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [deviceInfo, setDeviceInfo] = useState({
    isMac: false,
    isDesktop: false,
  });
  const [showQuickNote, setShowQuickNote] = useState(false);

  useEffect(() => {
    setDeviceInfo({
      isMac: isMac(),
      isDesktop: isDesktop(),
    });
  }, []);

  // Use global shortcuts but exclude show-shortcuts since we're on this page
  const globalShortcuts = createGlobalShortcuts({
    navigate,
    openQuickNote: () => setShowQuickNote(true),
    toggleTheme: () => {
      const newTheme = theme === "light" ? "dark" : "light";
      setTheme(newTheme);
      toast.success("Theme Toggled", {
        description: `Switched to ${newTheme} mode`,
        duration: 1500,
      });
    },
    enableFocusMode: true,
    enableTaskActions: false,
  }).filter((s) => s.id !== "show-shortcuts"); // Remove show-shortcuts since we're already here

  useKeyboardShortcuts(globalShortcuts);

  const categories = ["navigation", "focus", "tasks", "general"] as const;

  if (!deviceInfo.isDesktop) {
    return (
      <PageWrapper>
        <NavBar />
        <Container size="md" padding="md">
          <Section spacing="lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-[#CDA351]/10 flex items-center justify-center">
                <Smartphone className="w-10 h-10 sm:w-12 sm:h-12 text-[#CDA351]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-white mb-3 sm:mb-4">
                Desktop Only Feature
              </h2>
              <p className="text-sm sm:text-base text-[#7E7E7E] dark:text-gray-400 max-w-md mx-auto px-4">
                Keyboard shortcuts are available on desktop devices with
                physical keyboards. Switch to a desktop or laptop to access this
                feature.
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                className="mt-4 sm:mt-6 bg-[#CDA351] hover:bg-[#CDA351]/90 text-white px-4 py-2 sm:px-6 sm:py-3"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </motion.div>
          </Section>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <NavBar />
      <Container size="lg" padding="md" className="max-w-[1400px]">
        <Section spacing="sm">
          {/* Header - More compact */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2"
          >
            <FlexContainer align="center" gap="sm">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="text-[#7E7E7E] hover:text-[#CDA351] dark:text-gray-400 dark:hover:text-[#CDA351] px-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
                  <Keyboard className="w-5 h-5 sm:w-6 sm:h-6 text-[#CDA351] flex-shrink-0" />
                  <span className="break-words">Keyboard Shortcuts</span>
                </h1>
              </div>
            </FlexContainer>

            <FlexContainer align="center" gap="sm" className="flex-shrink-0">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#CDA351]/10 border border-[#CDA351]/20">
                {deviceInfo.isMac ? (
                  <Apple className="w-3 h-3 text-[#CDA351]" />
                ) : (
                  <Monitor className="w-3 h-3 text-[#CDA351]" />
                )}
                <span className="text-xs font-medium text-[#CDA351]">
                  {deviceInfo.isMac ? "macOS" : "Windows"}
                </span>
              </div>
            </FlexContainer>
          </motion.div>

          {/* Pro Tip - More compact */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-[#CDA351]/5 to-[#E6C17A]/10 border border-[#CDA351]/20 rounded-xl p-3 mb-4"
          >
            <FlexContainer align="start" gap="sm" className="mb-2">
              <div className="w-6 h-6 rounded-full bg-[#CDA351]/20 flex items-center justify-center flex-shrink-0">
                <Command className="w-3 h-3 text-[#CDA351]" />
              </div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] dark:text-white">
                Pro Tip
              </h3>
            </FlexContainer>
            <p className="text-xs text-[#7E7E7E] dark:text-gray-400 break-words">
              Master these essential shortcuts:{" "}
              <kbd className="px-1.5 py-0.5 bg-[#CDA351]/10 text-[#CDA351] rounded text-xs font-mono">
                {deviceInfo.isMac ? "⌘ + /" : "Ctrl + /"}
              </kbd>{" "}
              for shortcuts,{" "}
              <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-mono">
                {deviceInfo.isMac ? "⌘ + Ctrl + N" : "Ctrl + Alt + N"}
              </kbd>{" "}
              for quick notes,{" "}
              <kbd className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-xs font-mono">
                {deviceInfo.isMac ? "⌘ + Shift + ↵" : "Ctrl + Shift + Enter"}
              </kbd>{" "}
              for Focus Mode.
            </p>
          </motion.div>

          {/* Shortcuts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((category, categoryIndex) => {
              const Icon = categoryIcons[category];
              const categoryShortcuts = shortcuts.filter(
                (s) => s.category === category
              );

              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + categoryIndex * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-[#CDA351]/10"
                >
                  <FlexContainer align="center" gap="sm" className="mb-2">
                    <div className="w-6 h-6 rounded-lg bg-[#CDA351]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3 h-3 text-[#CDA351]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-[#1A1A1A] dark:text-white capitalize">
                        {category}
                      </h2>
                      <p className="text-xs text-[#7E7E7E] dark:text-gray-400 break-words">
                        {categoryDescriptions[category]}
                      </p>
                    </div>
                  </FlexContainer>

                  <div className="grid gap-1.5">
                    {categoryShortcuts.map((shortcut, index) => {
                      const keys = deviceInfo.isMac
                        ? shortcut.keys.mac
                        : shortcut.keys.windows;

                      return (
                        <motion.div
                          key={shortcut.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: 0.3 + categoryIndex * 0.1 + index * 0.05,
                          }}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#FAF8F6] dark:bg-gray-700/50 hover:bg-[#CDA351]/5 dark:hover:bg-[#CDA351]/10 transition-colors gap-2"
                        >
                          <span className="text-xs text-[#1A1A1A] dark:text-white font-medium min-w-0 break-words">
                            {shortcut.description}
                          </span>
                          <FlexContainer
                            align="center"
                            gap="sm"
                            className="flex-shrink-0"
                          >
                            {keys.map((key, keyIndex) => (
                              <FlexContainer
                                key={keyIndex}
                                align="center"
                                gap="sm"
                              >
                                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-[#1A1A1A] dark:text-white shadow-sm">
                                  {formatShortcutKeys([key])}
                                </kbd>
                                {keyIndex < keys.length - 1 && (
                                  <span className="text-[#7E7E7E] dark:text-gray-400 text-xs">
                                    +
                                  </span>
                                )}
                              </FlexContainer>
                            ))}
                          </FlexContainer>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer - More compact */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-4 py-2 border-t border-[#CDA351]/10"
          >
            <p className="text-xs text-[#7E7E7E] dark:text-gray-400">
              Press{" "}
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                {deviceInfo.isMac ? "⌘" : "Ctrl"}
              </kbd>{" "}
              +{" "}
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                /
              </kbd>{" "}
              to return here
            </p>
          </motion.div>
        </Section>
      </Container>

      <QuickNoteButton
        open={showQuickNote}
        onOpenChange={setShowQuickNote}
        currentTaskId={undefined}
        currentTaskTitle={undefined}
      />
    </PageWrapper>
  );
};

export default Shortcuts;
