import { Task, TimeOfDay, TaskPriority, TaskSection } from "../types";
import {
  format,
  isAfter,
  isBefore,
  startOfDay,
  addDays,
  isToday,
  isTomorrow,
  formatDistanceToNow,
} from "date-fns";

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getTimeBasedGreeting(): {
  greeting: string;
  timeOfDay: TimeOfDay;
} {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return { greeting: "Good morning", timeOfDay: "morning" };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: "Good afternoon", timeOfDay: "afternoon" };
  } else if (hour >= 17 && hour < 22) {
    return { greeting: "Good evening", timeOfDay: "evening" };
  } else {
    return { greeting: "Good night", timeOfDay: "night" };
  }
}

export function getEmojiForTimeOfDay(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case "morning":
      return "🌅";
    case "afternoon":
      return "☀️";
    case "evening":
      return "🌆";
    case "night":
      return "🌙";
    default:
      return "👋";
  }
}

export function formatDate(date: Date): string {
  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  } else if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, "h:mm a")}`;
  }
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function isOverdue(date: Date): boolean {
  return isBefore(date, new Date());
}

export function getTagColor(tag: string): string {
  const colors = [
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-yellow-100 text-yellow-800",
    "bg-purple-100 text-purple-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
  ];

  // Use the tag string to generate a consistent color
  const index =
    tag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  return colors[index];
}

export function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case "high":
      return "text-red-500";
    case "medium":
      return "text-yellow-500";
    case "low":
      return "text-green-500";
    default:
      return "text-gray-500";
  }
}

export function getPriorityLabel(priority: TaskPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function getSectionFromDate(date: Date | null | undefined): TaskSection {
  if (!date) return "someday";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextDay = new Date(today);
  nextDay.setDate(nextDay.getDate() + 2);

  const dateToCompare = new Date(date);
  dateToCompare.setHours(0, 0, 0, 0);

  if (dateToCompare.getTime() === today.getTime()) {
    return "today";
  } else if (dateToCompare.getTime() === tomorrow.getTime()) {
    return "tomorrow";
  } else if (dateToCompare.getTime() === nextDay.getTime()) {
    return "upcoming";
  } else {
    return "someday";
  }
}

export function getSectionTasks(tasks: Task[], section: TaskSection): Task[] {
  switch (section) {
    case "today":
      return tasks.filter(
        (task) =>
          task.section === "today" ||
          (task.dueDate && isToday(task.dueDate) && !task.completed)
      );
    case "tomorrow":
      return tasks.filter(
        (task) =>
          task.section === "tomorrow" ||
          (task.dueDate && isTomorrow(task.dueDate) && !task.completed)
      );
    case "upcoming":
      return tasks.filter(
        (task) =>
          task.section === "upcoming" ||
          (task.dueDate &&
            isAfter(task.dueDate, addDays(new Date(), 1)) &&
            !task.completed)
      );
    case "someday":
      return tasks.filter(
        (task) => task.section === "someday" && !task.completed
      );
    default:
      return [];
  }
}

export function getTaskStatus(task: Task): {
  label: string;
  color: string;
} {
  if (task.completed) {
    return {
      label: "Completed",
      color: "text-green-500",
    };
  }

  if (task.snoozedUntil && isAfter(task.snoozedUntil, new Date())) {
    return {
      label: `Snoozed until ${formatDate(task.snoozedUntil)}`,
      color: "text-purple-500",
    };
  }

  if (task.dueDate && isOverdue(task.dueDate)) {
    return {
      label: "Overdue",
      color: "text-red-500",
    };
  }

  return {
    label: "Active",
    color: "text-blue-500",
  };
}
