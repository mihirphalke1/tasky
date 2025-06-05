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
  setDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  startAfter,
  limit,
  writeBatch,
} from "firebase/firestore";
import {
  DailyStats,
  Task,
  Note,
  FocusSession,
  TaskIntention,
  MotivationalQuote,
} from "@/types";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { logger } from "./logger";

// Motivational quotes data
const motivationalQuotes: MotivationalQuote[] = [
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    category: "productivity",
  },
  {
    text: "Focus on being productive instead of busy.",
    author: "Tim Ferriss",
    category: "focus",
  },
  {
    text: "Wherever you are, be there totally.",
    author: "Eckhart Tolle",
    category: "mindfulness",
  },
  {
    text: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
    category: "success",
  },
  {
    text: "The present moment is the only time over which we have dominion.",
    author: "Thich Nhat Hanh",
    category: "mindfulness",
  },
  {
    text: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle",
    category: "focus",
  },
  {
    text: "Don't wait for opportunity. Create it.",
    author: "George Bernard Shaw",
    category: "productivity",
  },
  {
    text: "The future depends on what you do today.",
    author: "Mahatma Gandhi",
    category: "success",
  },
  {
    text: "Quality is not an act, it is a habit.",
    author: "Aristotle",
    category: "productivity",
  },
  {
    text: "Mindfulness is about being fully awake in our lives.",
    author: "Jon Kabat-Zinn",
    category: "mindfulness",
  },
  {
    text: "Concentration is the secret of strength.",
    author: "Ralph Waldo Emerson",
    category: "focus",
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    category: "success",
  },
];

// Get random motivational quote
export const getRandomQuote = (): MotivationalQuote => {
  const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
  return motivationalQuotes[randomIndex];
};

// Notes Service
export const addNote = async (
  userId: string,
  content: string,
  taskId?: string
): Promise<string> => {
  try {
    const notesRef = collection(db, "notes");
    const noteData = {
      userId,
      content,
      taskId: taskId || null,
      isGeneral: !taskId,
      createdAt: Timestamp.fromDate(new Date()),
    };

    logger.log("Creating note with data:", noteData);
    const docRef = await addDoc(notesRef, noteData);
    logger.log("Note created successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    logger.error("Error adding note:", error);
    throw new Error("Failed to add note");
  }
};

export const getNotes = async (userId: string): Promise<Note[]> => {
  try {
    const notesRef = collection(db, "notes");
    const q = query(
      notesRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        content: data.content,
        taskId: data.taskId,
        isGeneral: data.isGeneral !== undefined ? data.isGeneral : !data.taskId,
        createdAt: data.createdAt.toDate(),
      } as Note;
    });
  } catch (error) {
    logger.error("Error getting notes:", error);
    return [];
  }
};

export const getNotesByTaskId = async (
  taskId: string,
  userId: string
): Promise<Note[]> => {
  try {
    const notesRef = collection(db, "notes");
    const q = query(
      notesRef,
      where("taskId", "==", taskId),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        content: data.content,
        taskId: data.taskId,
        isGeneral: false,
        createdAt: data.createdAt.toDate(),
      } as Note;
    });
  } catch (error) {
    logger.error("Error getting notes for task:", error);
    return [];
  }
};

export const getNotesWithTaskDetails = async (
  userId: string
): Promise<Array<Note & { task?: any }>> => {
  try {
    const notesRef = collection(db, "notes");
    const q = query(
      notesRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const notes: Array<Note & { task?: any }> = [];

    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      const note: Note & { task?: any } = {
        id: doc.id,
        userId: data.userId,
        content: data.content,
        taskId: data.taskId,
        isGeneral: data.isGeneral !== undefined ? data.isGeneral : !data.taskId,
        createdAt: data.createdAt.toDate(),
      };

      if (data.taskId) {
        try {
          const { getTaskById } = await import("./taskService");
          note.task = await getTaskById(data.taskId);
        } catch (error) {
          logger.warn(`Failed to load task ${data.taskId} for note ${note.id}`);
          note.task = null;
        }
      }

      notes.push(note);
    }

    return notes;
  } catch (error) {
    logger.error("Error getting notes with task details:", error);
    return [];
  }
};

export const deleteNote = async (noteId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "notes", noteId));
  } catch (error) {
    logger.error("Error deleting note:", error);
    throw new Error("Failed to delete note");
  }
};

// Task Intentions Service
export const saveTaskIntention = async (
  taskId: string,
  intention: string,
  sessionStartTime: Date
): Promise<string> => {
  try {
    const intentionsRef = collection(db, "taskIntentions");
    const intentionData = {
      taskId,
      intention,
      sessionStartTime: Timestamp.fromDate(sessionStartTime),
      createdAt: Timestamp.fromDate(new Date()),
    };

    const docRef = await addDoc(intentionsRef, intentionData);
    return docRef.id;
  } catch (error) {
    logger.error("Error saving task intention:", error);
    throw new Error("Failed to save task intention");
  }
};

export const getTaskIntention = async (
  taskId: string
): Promise<TaskIntention | null> => {
  try {
    const intentionsRef = collection(db, "taskIntentions");
    const q = query(
      intentionsRef,
      where("taskId", "==", taskId),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      taskId: data.taskId,
      intention: data.intention,
      sessionStartTime: data.sessionStartTime.toDate(),
      createdAt: data.createdAt.toDate(),
    } as TaskIntention;
  } catch (error) {
    logger.error("Error getting task intention:", error);
    return null;
  }
};

// Focus Session Service
export const createFocusSession = async (
  userId: string,
  taskId?: string,
  intention?: string,
  backgroundImage?: string
): Promise<string> => {
  if (!userId) {
    throw new Error("User ID is required to create focus session");
  }

  try {
    const sessionsRef = collection(db, "focusSessions");
    const now = new Date();

    const sessionData = {
      userId,
      taskId: taskId || null,
      startTime: Timestamp.fromDate(now),
      endTime: null,
      duration: 0,
      intention: intention || null,
      notes: [],
      pomodoroCount: 0,
      backgroundImage: backgroundImage || null,
      createdAt: Timestamp.fromDate(now),
    };

    logger.log("Creating focus session with data:", sessionData);
    const docRef = await addDoc(sessionsRef, sessionData);
    logger.log("Focus session created successfully with ID:", docRef.id);

    // Verify the document was created
    const createdDoc = await getDoc(docRef);
    if (!createdDoc.exists()) {
      throw new Error("Failed to verify focus session creation");
    }

    return docRef.id;
  } catch (error) {
    logger.error("Error in createFocusSession:", error);
    throw new Error(`Failed to create focus session: ${error.message}`);
  }
};

export const endFocusSession = async (
  sessionId: string,
  duration: number,
  notes: string[] = [],
  pomodoroCount: number = 0
): Promise<void> => {
  if (!sessionId) {
    throw new Error("Session ID is required to end focus session");
  }

  try {
    const sessionRef = doc(db, "focusSessions", sessionId);
    const now = new Date();

    // Get the session data to extract userId for daily stats update
    const sessionSnapshot = await getDoc(sessionRef);
    const sessionData = sessionSnapshot.exists()
      ? sessionSnapshot.data()
      : null;

    const updateData = {
      endTime: Timestamp.fromDate(now),
      duration,
      notes,
      pomodoroCount,
    };

    logger.log("Ending focus session with data:", updateData);
    await updateDoc(sessionRef, updateData);

    // Update daily stats if we have the session data
    if (sessionData?.userId) {
      try {
        // Import dynamically to avoid circular dependencies
        const { updateDailyStatsForDate } = await import("./streakService");
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
        await updateDailyStatsForDate(sessionData.userId, today);
        logger.log("Updated daily stats and streak after focus session");
      } catch (error) {
        logger.warn("Failed to update daily stats:", error);
        // Don't throw here as the main focus session update was successful
      }
    }

    // Verify the update was successful
    const updatedDoc = await getDoc(sessionRef);
    if (!updatedDoc.exists()) {
      throw new Error("Focus session document not found after update");
    }

    const data = updatedDoc.data();
    if (!data.endTime) {
      throw new Error("Focus session end time was not updated properly");
    }

    logger.log("Focus session ended successfully");
  } catch (error) {
    logger.error("Error in endFocusSession:", error);
    throw new Error(`Failed to end focus session: ${error.message}`);
  }
};

export const getFocusSessions = async (
  userId: string
): Promise<FocusSession[]> => {
  if (!userId) {
    throw new Error("User ID is required to get focus sessions");
  }

  const sessionsRef = collection(db, "focusSessions");
  const q = query(
    sessionsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      taskId: data.taskId,
      startTime: data.startTime.toDate(),
      endTime: data.endTime?.toDate() || null,
      duration: data.duration || 0,
      intention: data.intention,
      notes: data.notes || [],
      pomodoroCount: data.pomodoroCount || 0,
      backgroundImage: data.backgroundImage,
      createdAt: data.createdAt.toDate(),
    } as FocusSession;
  });
};

export const getFocusSessionsByTaskId = async (
  userId: string,
  taskId: string
): Promise<FocusSession[]> => {
  if (!userId || !taskId) {
    throw new Error("User ID and task ID are required");
  }

  const sessionsRef = collection(db, "focusSessions");
  const q = query(
    sessionsRef,
    where("userId", "==", userId),
    where("taskId", "==", taskId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      taskId: data.taskId,
      startTime: data.startTime.toDate(),
      endTime: data.endTime?.toDate() || null,
      duration: data.duration || 0,
      intention: data.intention,
      notes: data.notes || [],
      pomodoroCount: data.pomodoroCount || 0,
      backgroundImage: data.backgroundImage,
      createdAt: data.createdAt.toDate(),
    } as FocusSession;
  });
};

// Debug function to check focus session data
export const debugFocusSessionData = async (userId: string): Promise<void> => {
  if (!userId) {
    logger.error("No user ID provided for debug");
    return;
  }

  try {
    logger.log("🔍 Debugging focus session data for user:", userId);

    const sessionsRef = collection(db, "focusSessions");
    const q = query(
      sessionsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const sessions = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }));

    logger.log("📊 Total focus sessions found:", sessions.length);

    if (sessions.length > 0) {
      logger.log("📝 Recent sessions:");
      sessions.slice(0, 5).forEach((session, index) => {
        logger.log(`${index + 1}.`, {
          id: session.id,
          taskId: session.data.taskId,
          startTime: session.data.startTime?.toDate(),
          endTime: session.data.endTime?.toDate(),
          duration: session.data.duration,
          intention: session.data.intention,
        });
      });
    } else {
      logger.log("❌ No focus sessions found for this user");
    }

    // Check if user is properly authenticated
    logger.log("🔐 Auth check - User ID:", userId);
  } catch (error) {
    logger.error("❌ Error debugging focus session data:", error);
  }
};

// Enhanced function to verify focus session persistence
export const verifyFocusSessionPersistence = async (
  sessionId: string
): Promise<boolean> => {
  if (!sessionId) {
    logger.error("No session ID provided for verification");
    return false;
  }

  try {
    const sessionRef = doc(db, "focusSessions", sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (sessionDoc.exists()) {
      const data = sessionDoc.data();
      logger.log("✅ Focus session verified in Firebase:", {
        id: sessionId,
        userId: data.userId,
        taskId: data.taskId,
        startTime: data.startTime?.toDate(),
        endTime: data.endTime?.toDate(),
        duration: data.duration,
      });
      return true;
    } else {
      logger.error("❌ Focus session not found in Firebase:", sessionId);
      return false;
    }
  } catch (error) {
    logger.error("❌ Error verifying focus session:", error);
    return false;
  }
};
