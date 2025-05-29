export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type TaskPriority = "low" | "medium" | "high";

export type TaskSection = "today" | "tomorrow" | "upcoming" | "someday";

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  dueDate?: Date | null;
  tags: string[];
  priority: TaskPriority;
  section: TaskSection;
  snoozedUntil?: Date | null;
  lastModified: Date;
}
