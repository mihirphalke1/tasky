export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type TaskPriority = "low" | "medium" | "high";

export type TaskSection = "today" | "tomorrow" | "upcoming" | "someday";

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  dueDate?: Date | null;
  tags: string[];
  priority: TaskPriority;
  section: TaskSection;
  snoozedUntil?: Date | null;
  lastModified: Date;
  hidden?: boolean;
}

// New interfaces for the enhanced features
export interface TaskIntention {
  id: string;
  taskId: string;
  intention: string;
  createdAt: Date;
  sessionStartTime: Date;
}

export interface Note {
  id: string;
  userId: string;
  content: string;
  taskId?: string; // Optional - null for general notes
  createdAt: Date;
  isGeneral: boolean; // true for general notes, false for task-linked notes
}

export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDay: string; // YYYY-MM-DD format
  totalFocusSessions: number;
  lastUpdated: Date;
}

export interface FocusSession {
  id: string;
  userId: string;
  taskId?: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  intention?: string;
  notes: string[];
  pomodoroCount: number;
  backgroundImage?: string;
  createdAt: Date;
}

export interface MotivationalQuote {
  text: string;
  author: string;
  category: "focus" | "productivity" | "mindfulness" | "success";
}
