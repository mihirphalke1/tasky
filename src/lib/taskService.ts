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

      // Get current task data to ensure we don't lose any fields
      const currentSnapshot = await getDoc(taskRef);
      if (!currentSnapshot.exists()) {
        throw new Error("Task not found");
      }
      const currentData = currentSnapshot.data();

      // Convert all date fields to Firestore Timestamps
      const updateData = {
        ...task,
        lastModified: Timestamp.fromDate(now),
        dueDate: task.dueDate
          ? Timestamp.fromDate(new Date(task.dueDate))
          : currentData.dueDate,
        snoozedUntil: task.snoozedUntil
          ? Timestamp.fromDate(new Date(task.snoozedUntil))
          : currentData.snoozedUntil,
        completedAt: task.completedAt
          ? Timestamp.fromDate(new Date(task.completedAt))
          : task.completedAt === null
          ? null
          : currentData.completedAt,
        // Ensure arrays and other fields are properly formatted
        tags: Array.isArray(task.tags) ? task.tags : currentData.tags,
        completed:
          typeof task.completed === "boolean"
            ? task.completed
            : currentData.completed,
        priority: task.priority || currentData.priority,
        section: task.section || currentData.section,
      };

      // Remove undefined fields to prevent overwriting
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      // Log the exact data being written to Firestore
      console.log(
        "Updating task data in Firestore:",
        JSON.stringify(updateData, null, 2)
      );

      await updateDoc(taskRef, updateData);

      // Verify the update
      const verifySnapshot = await getDoc(taskRef);
      if (!verifySnapshot.exists()) {
        if (retryCount === maxRetries - 1) {
          throw new Error("Failed to verify task update");
        }
        retryCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        continue;
      }

      console.log("Task updated successfully");
      return;
    } catch (error: any) {
      console.error(
        "Error updating task (attempt",
        retryCount + 1,
        "):",
        error
      );
      if (retryCount === maxRetries - 1) {
        throw new Error("Failed to update task after multiple attempts");
      }
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
    }
  }
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
      return !Boolean(data.hidden); // Only process tasks that aren't already hidden
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

    // First try the optimized query with index
    const q = query(
      tasksRef,
      where("userId", "==", userId),
      orderBy("lastModified", "desc")
    );

    // Set up real-time listener with error handling
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log("Tasks updated in Firestore:", querySnapshot.docs.length);

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

        // Sort tasks by lastModified
        const sortedTasks = tasks.sort(
          (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
        );

        console.log("Emitting updated tasks:", sortedTasks);
        onTasksUpdate(sortedTasks);
      },
      (error: any) => {
        console.error("Error in tasks subscription:", error);

        // If the error is due to missing index, fall back to a simpler query
        if (error.message?.includes("requires an index")) {
          console.warn("Falling back to simple query without ordering");
          const fallbackQuery = query(tasksRef, where("userId", "==", userId));

          // Set up fallback listener
          const fallbackUnsubscribe = onSnapshot(
            fallbackQuery,
            (querySnapshot) => {
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

              // Sort tasks in memory
              const sortedTasks = tasks.sort(
                (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
              );

              onTasksUpdate(sortedTasks);
            },
            (fallbackError) => {
              console.error("Error in fallback subscription:", fallbackError);
              onError(fallbackError);
            }
          );

          return fallbackUnsubscribe;
        }

        onError(error);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error("Error setting up tasks subscription:", error);
    onError(error);
    return () => {};
  }
};
