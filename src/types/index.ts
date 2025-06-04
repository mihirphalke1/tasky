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

// Dynamic Insights Types
export type InsightType =
  | "focus_score"
  | "streak_achievement"
  | "session_milestone"
  | "pomodoro_master"
  | "deep_work"
  | "consistency"
  | "time_management"
  | "productivity_boost"
  | "goal_achievement";

export interface TaskInsight {
  id: string;
  userId: string;
  taskId: string;
  type: InsightType;
  title: string;
  description: string;
  value: number; // The metric value that triggered this insight
  threshold: number; // The threshold that was crossed
  icon: string; // Icon name for UI display
  color: string; // Color scheme for UI (e.g., "green", "blue", "purple")
  isActive: boolean; // Whether this insight should be displayed
  createdAt: Date;
  lastTriggered: Date;
}

export interface InsightRule {
  id: string;
  userId: string;
  type: InsightType;
  title: string;
  description: string;
  icon: string;
  color: string;
  threshold: number;
  metric: string; // Which metric to evaluate (e.g., "focusScore", "totalSessions")
  comparison: "gte" | "lte" | "eq"; // greater than equal, less than equal, equal
  isActive: boolean;
  createdAt: Date;
}

// Streak Feature Types
export interface DailyStats {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  tasksAssigned: number;
  tasksCompleted: number;
  completionPercentage: number;
  focusTimeMinutes: number;
  focusSessions: number;
  pomodoroCount: number;
  streakDay: boolean; // true if the day counts towards streak
  tasksDetails: Array<{
    taskId: string;
    title: string;
    completed: boolean;
    completedAt?: Date;
    focusTimeMinutes: number;
    pomodoroCount: number;
  }>;
  createdAt: Date;
  lastUpdated: Date;
}

export interface StreakData {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
  lastActiveDate: string; // YYYY-MM-DD format
  streakThreshold: number; // minimum completion percentage to count as streak day
  lastUpdated: Date;
  streakHistory: Array<{
    startDate: string;
    endDate: string;
    length: number;
  }>;
}

export interface MonthlyStreakView {
  month: string; // YYYY-MM format
  year: number;
  monthNum: number;
  daysWithData: Array<{
    date: string;
    dayOfMonth: number;
    stats: DailyStats | null;
    isStreakDay: boolean;
    isToday: boolean;
    isCurrentMonth: boolean;
  }>;
}
