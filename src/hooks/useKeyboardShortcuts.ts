import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export type ShortcutAction =
  | "add-task"
  | "quick-note"
  | "focus-mode"
  | "toggle-theme"
  | "search"
  | "clear-completed"
  | "show-shortcuts"
  | "notes"
  | "escape"
  | "next-task"
  | "previous-task"
  | "toggle-focus-lock"
  | "complete-task"
  | "complete-task-alt"
  | "toggle-pomodoro"
  | "snooze-task"
  | "postpone-task"
  | "exit-focus"
  | "toggle-input-mode";

export interface KeyboardShortcut {
  id: ShortcutAction;
  description: string;
  category: "navigation" | "tasks" | "general";
  keys: {
    mac: string[];
    windows: string[];
  };
  action: () => void;
  priority?: number; // Higher priority shortcuts execute first
  allowInModal?: boolean; // Whether this shortcut works in modals
}

export const isMac = () => {
  return (
    typeof window !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0
  );
};

export const isDesktop = () => {
  return (
    typeof window !== "undefined" &&
    window.innerWidth >= 768 &&
    !("ontouchstart" in window)
  );
};

export const formatShortcutKeys = (keys: string[]): string => {
  const keyMap: Record<string, string> = {
    meta: isMac() ? "⌘" : "Ctrl",
    ctrl: "Ctrl",
    shift: "⇧",
    alt: isMac() ? "⌥" : "Alt",
    enter: "↵",
    escape: "Esc",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
  };

  return keys
    .map((key) => keyMap[key.toLowerCase()] || key.toUpperCase())
    .join(" + ");
};

// Global shortcut registry
class GlobalShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isListening = false;
  private modalDepth = 0;

  register(componentId: string, shortcuts: KeyboardShortcut[]) {
    shortcuts.forEach((shortcut) => {
      const key = `${componentId}:${shortcut.id}`;
      this.shortcuts.set(key, shortcut);
    });
    this.startListening();
  }

  unregister(componentId: string) {
    const keysToRemove = Array.from(this.shortcuts.keys()).filter((key) =>
      key.startsWith(`${componentId}:`)
    );
    keysToRemove.forEach((key) => this.shortcuts.delete(key));

    if (this.shortcuts.size === 0) {
      this.stopListening();
    }
  }

  setModalState(isModalOpen: boolean) {
    if (isModalOpen) {
      this.modalDepth++;
    } else {
      this.modalDepth = Math.max(0, this.modalDepth - 1);
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    // Allow shortcuts even when typing in certain cases, but be selective
    const isTyping =
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as any)?.contentEditable === "true";

    // Special case: Allow escape and certain global shortcuts even when typing
    const globalShortcuts = ["escape", "toggle-theme", "show-shortcuts"];
    const isGlobalShortcut = Array.from(this.shortcuts.values()).some(
      (shortcut) =>
        globalShortcuts.includes(shortcut.id) &&
        matchesShortcut(
          event,
          isMac() ? shortcut.keys.mac : shortcut.keys.windows
        )
    );

    if (isTyping && !isGlobalShortcut) {
      return;
    }

    // Get all matching shortcuts and sort by priority
    const matchingShortcuts = Array.from(this.shortcuts.values())
      .filter((shortcut) => {
        const targetKeys = isMac() ? shortcut.keys.mac : shortcut.keys.windows;
        const matches = matchesShortcut(event, targetKeys);

        // Allow shortcuts in modals if explicitly allowed or if it's a global shortcut
        const allowedInModal =
          shortcut.allowInModal || globalShortcuts.includes(shortcut.id);
        return matches && (this.modalDepth === 0 || allowedInModal);
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (matchingShortcuts.length > 0) {
      const shortcut = matchingShortcuts[0];
      event.preventDefault();
      event.stopImmediatePropagation();

      try {
        shortcut.action();
      } catch (error) {
        console.error("Error executing keyboard shortcut:", error);
        toast.error(`Failed to execute shortcut: ${shortcut.description}`);
      }
    }
  };

  private startListening() {
    if (this.isListening || !isDesktop()) return;

    this.isListening = true;
    document.addEventListener("keydown", this.handleKeyDown, {
      capture: true,
      passive: false,
    });
  }

  private stopListening() {
    if (!this.isListening) return;

    this.isListening = false;
    document.removeEventListener("keydown", this.handleKeyDown, {
      capture: true,
    });
  }
}

// Global instance
const globalShortcutManager = new GlobalShortcutManager();

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const componentIdRef = useRef(
    `component-${Math.random().toString(36).substr(2, 9)}`
  );

  useEffect(() => {
    if (!isDesktop()) return;

    const componentId = componentIdRef.current;

    // Set default priorities and modal permissions for known shortcuts
    const enhancedShortcuts = shortcuts.map((shortcut) => ({
      ...shortcut,
      priority: shortcut.priority ?? getDefaultPriority(shortcut.id),
      allowInModal: shortcut.allowInModal ?? isGlobalShortcut(shortcut.id),
    }));

    globalShortcutManager.register(componentId, enhancedShortcuts);

    return () => {
      globalShortcutManager.unregister(componentId);
    };
  }, [shortcuts]);
};

// Hook for modal components to signal their state
export const useModalShortcuts = (isOpen: boolean) => {
  useEffect(() => {
    globalShortcutManager.setModalState(isOpen);
    return () => {
      if (isOpen) {
        globalShortcutManager.setModalState(false);
      }
    };
  }, [isOpen]);
};

// Helper functions
const getDefaultPriority = (id: ShortcutAction): number => {
  const priorities: Record<ShortcutAction, number> = {
    escape: 100,
    "toggle-theme": 90,
    "show-shortcuts": 85,
    search: 80,
    "add-task": 75,
    "toggle-input-mode": 75,
    "quick-note": 75,
    "focus-mode": 70,
    notes: 65,
    "clear-completed": 60,
    "next-task": 80,
    "previous-task": 80,
    "toggle-focus-lock": 90,
    "complete-task": 85,
    "complete-task-alt": 85,
    "toggle-pomodoro": 75,
    "snooze-task": 80,
    "postpone-task": 80,
    "exit-focus": 70,
  };
  return priorities[id] || 50;
};

const isGlobalShortcut = (id: ShortcutAction): boolean => {
  const globalShortcuts: ShortcutAction[] = [
    "escape",
    "toggle-theme",
    "show-shortcuts",
    "search",
    "add-task",
    "toggle-input-mode",
    "quick-note",
  ];
  return globalShortcuts.includes(id);
};

const matchesShortcut = (event: KeyboardEvent, keys: string[]): boolean => {
  const eventKeys = [];

  // Add modifier keys
  if (event.metaKey) eventKeys.push("meta");
  if (event.ctrlKey) eventKeys.push("ctrl");
  if (event.shiftKey) eventKeys.push("shift");
  if (event.altKey) eventKeys.push("alt");

  // Handle the main key
  let mainKey = event.key.toLowerCase();

  // Normalize certain keys
  const keyNormalizations: Record<string, string> = {
    delete: "backspace",
    del: "backspace",
    " ": "space",
    arrowup: "arrowup",
    arrowdown: "arrowdown",
    arrowleft: "arrowleft",
    arrowright: "arrowright",
    escape: "escape",
    esc: "escape",
    enter: "enter",
    return: "enter",
  };

  if (keyNormalizations[mainKey]) {
    mainKey = keyNormalizations[mainKey];
  }

  eventKeys.push(mainKey);

  // Check if the arrays match exactly
  if (eventKeys.length !== keys.length) {
    return false;
  }

  return keys.every((key) => eventKeys.includes(key.toLowerCase()));
};

export const showShortcutToast = (action: string, keys: string[]) => {
  if (!isDesktop()) return;

  toast.success(`${action}`, {
    description: `Shortcut: ${formatShortcutKeys(keys)}`,
    duration: 2000,
  });
};
