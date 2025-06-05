import { db } from "./firebase";
import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  getFirestore,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { Task } from "@/types";

// Enable offline persistence
const enablePersistence = async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log("Offline persistence enabled");
  } catch (error) {
    console.warn("Error enabling offline persistence:", error);
  }
};

// Call this when the app initializes
enablePersistence();

export const getTasks = async (userId: string): Promise<Task[]> => {
  if (!userId) {
    throw new Error("User ID is required to get tasks");
  }

  try {
    const tasksRef = collection(db, "tasks");
    const q = query(
      tasksRef,
      where("userId", "==", userId),
      orderBy("lastModified", "desc")
    );

    const querySnapshot = await getDocs(q);
    console.log("Fetched tasks from Firestore:", querySnapshot.docs.length);

    const tasks = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // Ensure all date fields are properly converted from Firestore Timestamp
      const task = {
        ...data,
        id: doc.id,
        userId: data.userId || userId, // Ensure userId is always present
        title: data.title || "",
        description: data.description || null,
        completed: Boolean(data.completed),
        createdAt: data.createdAt?.toDate() || new Date(),
        lastModified: data.lastModified?.toDate() || new Date(),
        dueDate: data.dueDate?.toDate() || null,
        snoozedUntil: data.snoozedUntil?.toDate() || null,
        completedAt: data.completedAt?.toDate() || null,
        tags: Array.isArray(data.tags) ? data.tags : [],
        priority: data.priority || "medium",
        section: data.section || "today",
        hidden: Boolean(data.hidden),
      } as Task;
      console.log("Processed task:", task);
      return task;
    });

    // Sort tasks by lastModified to ensure consistent order
    const sortedTasks = tasks.sort(
      (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
    );

    console.log("Returning sorted tasks:", sortedTasks);
    return sortedTasks;
  } catch (error: any) {
    // Check if the error is due to missing index
    if (error.message?.includes("requires an index")) {
      console.warn("Index is being created. This might take a few minutes.");
      return [];
    }
    console.error("Error getting tasks:", error);
    throw new Error("Failed to get tasks from Firestore");
  }
};

// Add validation function
const validateTask = (task: Partial<Task>): void => {
  if (!task.title?.trim()) {
    throw new Error("Task title is required");
  }

  if (task.title.length > 200) {
    throw new Error("Task title must be less than 200 characters");
  }

  if (task.description && task.description.length > 1000) {
    throw new Error("Task description must be less than 1000 characters");
  }

  if (task.tags && !Array.isArray(task.tags)) {
    throw new Error("Task tags must be an array");
  }

  if (
    task.tags &&
    task.tags.some((tag) => typeof tag !== "string" || tag.length > 50)
  ) {
    throw new Error("Invalid task tags");
  }

  if (task.priority && !["low", "medium", "high"].includes(task.priority)) {
    throw new Error("Invalid task priority");
  }

  if (
    task.section &&
    !["today", "tomorrow", "upcoming", "someday"].includes(task.section)
  ) {
    throw new Error("Invalid task section");
  }
};

export const addTask = async (
  userId: string,
  task: Omit<Task, "id">
): Promise<string> => {
  if (!userId) {
    throw new Error("User ID is required to add a task");
  }

  // Validate task data
  validateTask(task);

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const tasksRef = collection(db, "tasks");
      const now = new Date();

      // Ensure all fields are properly formatted for Firestore
      const taskData = {
        userId,
        title: task.title.trim(),
        description: task.description?.trim() || null,
        completed: false,
        createdAt: Timestamp.fromDate(now),
        lastModified: Timestamp.fromDate(now),
        dueDate: task.dueDate
          ? Timestamp.fromDate(new Date(task.dueDate))
          : null,
        snoozedUntil: task.snoozedUntil
          ? Timestamp.fromDate(new Date(task.snoozedUntil))
          : null,
        tags: Array.isArray(task.tags) ? task.tags : [],
        priority: task.priority || "medium",
        section: task.section || "today",
        hidden: false, // New tasks are always visible
      };

      // Log the exact data being written to Firestore
      console.log(
        "Writing task data to Firestore:",
        JSON.stringify(taskData, null, 2)
      );

      const docRef = await addDoc(tasksRef, taskData);
      console.log("Task added successfully with ID:", docRef.id);

      // Update daily stats for today since a new task was added
      try {
        // Import dynamically to avoid circular dependencies
        const { updateDailyStatsForDate } = await import("./streakService");
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
        await updateDailyStatsForDate(userId, today);
      } catch (error) {
        console.warn("Failed to update daily stats:", error);
        // Don't throw here as the main task creation was successful
      }

      // Verify the task was added
      const verifySnapshot = await getDoc(docRef);
      if (!verifySnapshot.exists()) {
        if (retryCount === maxRetries - 1) {
          throw new Error("Failed to verify task creation");
        }
        retryCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        continue;
      }

      return docRef.id;
    } catch (error) {
      if (retryCount === maxRetries - 1) {
        console.error("Error adding task after maximum retries:", error);
        throw new Error("Failed to add task to Firestore");
      }
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
    }
  }

  throw new Error("Failed to add task after maximum retries");
};

export const updateTask = async (
  taskId: string,
  task: Partial<Task>
): Promise<void> => {
  if (!taskId) {
    throw new Error("Task ID is required to update a task");
  }

  // Validate task data
  validateTask(task);

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const taskRef = doc(db, "tasks", taskId);
      const now = new Date();

      // Get the current task to check previous completion status
      const currentTaskSnapshot = await getDoc(taskRef);
      const currentTask = currentTaskSnapshot.exists()
        ? currentTaskSnapshot.data()
        : null;

      // Ensure all fields are properly formatted for Firestore
      const taskData = {
        ...task,
        lastModified: Timestamp.fromDate(now),
        dueDate: task.dueDate
          ? Timestamp.fromDate(new Date(task.dueDate))
          : null,
        snoozedUntil: task.snoozedUntil
          ? Timestamp.fromDate(new Date(task.snoozedUntil))
          : null,
        completedAt: task.completed ? Timestamp.fromDate(now) : null,
      };

      // Log the exact data being written to Firestore
      console.log(
        "Updating task in Firestore:",
        JSON.stringify(taskData, null, 2)
      );

      await updateDoc(taskRef, taskData);
      console.log("Task updated successfully");

      // Check if task completion status changed
      const wasCompleted = currentTask?.completed || false;
      const isNowCompleted = task.completed || false;

      // If completion status changed or task was just completed, update daily stats
      if (wasCompleted !== isNowCompleted || isNowCompleted) {
        try {
          // Import dynamically to avoid circular dependencies
          const { updateDailyStatsForDate } = await import("./streakService");
          const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

          if (currentTask?.userId) {
            await updateDailyStatsForDate(currentTask.userId, today);
          }
        } catch (error) {
          console.warn("Failed to update daily stats:", error);
          // Don't throw here as the main task update was successful
        }
      }

      // Verify the task was updated
      const verifySnapshot = await getDoc(taskRef);
      if (!verifySnapshot.exists()) {
        if (retryCount === maxRetries - 1) {
          throw new Error("Failed to verify task update");
        }
        retryCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        continue;
      }

      return;
    } catch (error) {
      if (retryCount === maxRetries - 1) {
        console.error("Error updating task after maximum retries:", error);
        throw new Error("Failed to update task in Firestore");
      }
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
    }
  }

  throw new Error("Failed to update task after maximum retries");
};

export const deleteTask = async (taskId: string): Promise<void> => {
  if (!taskId) {
    throw new Error("Task ID is required to delete a task");
  }

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await deleteDoc(taskRef);

      // Verify the deletion
      const verifySnapshot = await getDoc(taskRef);
      if (verifySnapshot.exists()) {
        if (retryCount === maxRetries - 1) {
          throw new Error(
            "Failed to verify task deletion after maximum retries"
          );
        }
        retryCount++;
        continue;
      }

      return;
    } catch (error) {
      if (retryCount === maxRetries - 1) {
        console.error("Error deleting task after maximum retries:", error);
        throw new Error("Failed to delete task from Firestore");
      }
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
    }
  }

  throw new Error("Failed to delete task after maximum retries");
};

export const getTaskById = async (taskId: string): Promise<Task | null> => {
  if (!taskId) {
    throw new Error("Task ID is required to get task");
  }

  try {
    const taskRef = doc(db, "tasks", taskId);
    const snapshot = await getDoc(taskRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      ...data,
      id: snapshot.id,
      userId: data.userId,
      title: data.title || "",
      description: data.description || null,
      completed: Boolean(data.completed),
      createdAt: data.createdAt?.toDate() || new Date(),
      lastModified: data.lastModified?.toDate() || new Date(),
      dueDate: data.dueDate?.toDate() || null,
      snoozedUntil: data.snoozedUntil?.toDate() || null,
      completedAt: data.completedAt?.toDate() || null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      priority: data.priority || "medium",
      section: data.section || "today",
      hidden: Boolean(data.hidden),
    } as Task;
  } catch (error) {
    console.error("Error getting task by ID:", error);
    throw new Error("Failed to get task from Firestore");
  }
};

export const clearCompletedTasks = async (userId: string): Promise<void> => {
  if (!userId) {
    throw new Error("User ID is required to clear completed tasks");
  }

  try {
    const tasksRef = collection(db, "tasks");
    // Simplified query to avoid composite index requirement
    const q = query(
      tasksRef,
      where("userId", "==", userId),
      where("completed", "==", true)
    );

    const querySnapshot = await getDocs(q);

    // Filter out already hidden tasks in memory
    const tasksToHide = querySnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.hidden; // Only process tasks that aren't already hidden
    });

    if (tasksToHide.length === 0) {
      console.log("No completed tasks to hide");
      return;
    }

    const updatePromises = tasksToHide.map((doc) => {
      const taskRef = doc.ref;
      return updateDoc(taskRef, {
        hidden: true,
        lastModified: serverTimestamp(),
      });
    });

    await Promise.all(updatePromises);
    console.log(`Hidden ${tasksToHide.length} completed tasks`);
  } catch (error) {
    console.error("Error hiding completed tasks:", error);
    throw new Error("Failed to hide completed tasks");
  }
};

// Add real-time listener function with fallback
export const subscribeToTasks = (
  userId: string,
  onTasksUpdate: (tasks: Task[]) => void,
  onError: (error: Error) => void
) => {
  if (!userId) {
    onError(new Error("User ID is required to subscribe to tasks"));
    return () => {};
  }

  try {
    const tasksRef = collection(db, "tasks");
    const q = query(
      tasksRef,
      where("userId", "==", userId),
      orderBy("lastModified", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        try {
          const tasks = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              userId: data.userId || userId,
              title: data.title || "",
              description: data.description || null,
              completed: Boolean(data.completed),
              createdAt: data.createdAt?.toDate() || new Date(),
              lastModified: data.lastModified?.toDate() || new Date(),
              dueDate: data.dueDate?.toDate() || null,
              snoozedUntil: data.snoozedUntil?.toDate() || null,
              completedAt: data.completedAt?.toDate() || null,
              tags: Array.isArray(data.tags) ? data.tags : [],
              priority: data.priority || "medium",
              section: data.section || "today",
              hidden: Boolean(data.hidden),
            } as Task;
          });

          // Sort tasks by lastModified to ensure consistent order
          const sortedTasks = tasks.sort(
            (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
          );

          console.log("Tasks updated:", sortedTasks.length);
          onTasksUpdate(sortedTasks);
        } catch (error) {
          console.error("Error processing task snapshot:", error);
          onError(new Error("Failed to process task updates"));
        }
      },
      (error) => {
        console.error("Error in task subscription:", error);
        onError(new Error("Failed to subscribe to tasks"));
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up task subscription:", error);
    onError(new Error("Failed to set up task subscription"));
    return () => {};
  }
};

export interface FocusSession {
  id: string;
  taskId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  intention?: string;
  notes?: string[];
  completedPomodoros: number;
  backgroundImage?: string;
}

export const saveTaskIntention = async (
  taskId: string,
  intention: string,
  timestamp: Date
): Promise<void> => {
  if (!taskId || !intention) {
    throw new Error("Task ID and intention are required");
  }

  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      intention,
      intentionSetAt: Timestamp.fromDate(timestamp),
      lastModified: Timestamp.fromDate(timestamp),
    });
  } catch (error) {
    console.error("Error saving task intention:", error);
    throw new Error("Failed to save task intention");
  }
};

export const createFocusSession = async (
  userId: string,
  taskId: string,
  intention?: string,
  backgroundImage?: string
): Promise<string> => {
  if (!userId || !taskId) {
    throw new Error("User ID and task ID are required");
  }

  try {
    const sessionsRef = collection(db, "focusSessions");
    const now = new Date();

    const sessionData = {
      userId,
      taskId,
      startTime: Timestamp.fromDate(now),
      intention: intention || null,
      completedPomodoros: 0,
      backgroundImage: backgroundImage || null,
    };

    const docRef = await addDoc(sessionsRef, sessionData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating focus session:", error);
    throw new Error("Failed to create focus session");
  }
};

export const endFocusSession = async (
  sessionId: string,
  duration: number,
  notes: string[],
  completedPomodoros: number
): Promise<void> => {
  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  try {
    const sessionRef = doc(db, "focusSessions", sessionId);
    const now = new Date();

    await updateDoc(sessionRef, {
      endTime: Timestamp.fromDate(now),
      duration,
      notes,
      completedPomodoros,
      lastModified: Timestamp.fromDate(now),
    });
  } catch (error) {
    console.error("Error ending focus session:", error);
    throw new Error("Failed to end focus session");
  }
};

export const getFocusSession = async (
  sessionId: string
): Promise<FocusSession> => {
  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  try {
    const sessionRef = doc(db, "focusSessions", sessionId);
    const snapshot = await getDoc(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("Focus session not found");
    }

    const data = snapshot.data();
    return {
      id: snapshot.id,
      taskId: data.taskId,
      userId: data.userId,
      startTime: data.startTime.toDate(),
      endTime: data.endTime?.toDate(),
      duration: data.duration,
      intention: data.intention,
      notes: data.notes,
      completedPomodoros: data.completedPomodoros,
      backgroundImage: data.backgroundImage,
    };
  } catch (error) {
    console.error("Error getting focus session:", error);
    throw new Error("Failed to get focus session");
  }
};
