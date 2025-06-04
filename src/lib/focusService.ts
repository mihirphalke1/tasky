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
} from "firebase/firestore";
import {
  Note,
  UserStreak,
  TaskIntention,
  FocusSession,
  MotivationalQuote,
} from "@/types";
import { format } from "date-fns";

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
  if (!userId) {
    throw new Error("User ID is required to add a note");
  }

  if (!content.trim()) {
    throw new Error("Note content cannot be empty");
  }

  const notesRef = collection(db, "notes");
  const now = new Date();

  const noteData = {
    userId,
    content: content.trim(),
    taskId: taskId || null,
    isGeneral: !taskId,
    createdAt: Timestamp.fromDate(now),
  };

  const docRef = await addDoc(notesRef, noteData);
  return docRef.id;
};

export const getNotes = async (userId: string): Promise<Note[]> => {
  if (!userId) {
    throw new Error("User ID is required to get notes");
  }

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
      isGeneral: data.isGeneral,
      createdAt: data.createdAt.toDate(),
    } as Note;
  });
};

export const getNotesByTaskId = async (taskId: string): Promise<Note[]> => {
  if (!taskId) {
    throw new Error("Task ID is required to get notes");
  }

  const notesRef = collection(db, "notes");
  const q = query(
    notesRef,
    where("taskId", "==", taskId),
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
      isGeneral: data.isGeneral,
      createdAt: data.createdAt.toDate(),
    } as Note;
  });
};

export const getNotesWithTaskDetails = async (
  userId: string
): Promise<Array<Note & { task?: any }>> => {
  if (!userId) {
    throw new Error("User ID is required to get notes");
  }

  try {
    const notes = await getNotes(userId);

    // For notes linked to tasks, fetch task details
    const notesWithTasks = await Promise.all(
      notes.map(async (note) => {
        if (note.taskId) {
          try {
            // We'll import this dynamically to avoid circular imports
            const { getTaskById } = await import("./taskService");
            const task = await getTaskById(note.taskId);
            return { ...note, task };
          } catch (error) {
            console.warn(
              `Failed to fetch task details for note ${note.id}:`,
              error
            );
            return { ...note, task: null };
          }
        }
        return note;
      })
    );

    return notesWithTasks;
  } catch (error) {
    console.error("Error getting notes with task details:", error);
    throw new Error("Failed to get notes with task details");
  }
};

export const deleteNote = async (noteId: string): Promise<void> => {
  if (!noteId) {
    throw new Error("Note ID is required to delete a note");
  }

  const noteRef = doc(db, "notes", noteId);
  await deleteDoc(noteRef);
};

// Task Intentions Service
export const saveTaskIntention = async (
  taskId: string,
  intention: string,
  sessionStartTime: Date
): Promise<string> => {
  if (!taskId) {
    throw new Error("Task ID is required to save intention");
  }

  if (!intention.trim()) {
    throw new Error("Intention cannot be empty");
  }

  const intentionsRef = collection(db, "taskIntentions");
  const now = new Date();

  const intentionData = {
    taskId,
    intention: intention.trim(),
    createdAt: Timestamp.fromDate(now),
    sessionStartTime: Timestamp.fromDate(sessionStartTime),
  };

  const docRef = await addDoc(intentionsRef, intentionData);
  return docRef.id;
};

export const getTaskIntention = async (
  taskId: string
): Promise<TaskIntention | null> => {
  if (!taskId) {
    return null;
  }

  const intentionsRef = collection(db, "taskIntentions");
  const q = query(
    intentionsRef,
    where("taskId", "==", taskId),
    orderBy("createdAt", "desc")
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
    createdAt: data.createdAt.toDate(),
    sessionStartTime: data.sessionStartTime.toDate(),
  } as TaskIntention;
};

// User Streak Service
export const getUserStreak = async (userId: string): Promise<UserStreak> => {
  if (!userId) {
    throw new Error("User ID is required to get streak");
  }

  const streakRef = doc(db, "userStreaks", userId);
  const streakDoc = await getDoc(streakRef);

  if (!streakDoc.exists()) {
    // Initialize new streak
    const initialStreak: UserStreak = {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDay: "",
      totalFocusSessions: 0,
      lastUpdated: new Date(),
    };

    await setDoc(streakRef, {
      ...initialStreak,
      lastUpdated: Timestamp.fromDate(initialStreak.lastUpdated),
    });

    return initialStreak;
  }

  const data = streakDoc.data();
  return {
    userId: data.userId,
    currentStreak: data.currentStreak || 0,
    longestStreak: data.longestStreak || 0,
    lastActiveDay: data.lastActiveDay || "",
    totalFocusSessions: data.totalFocusSessions || 0,
    lastUpdated: data.lastUpdated?.toDate() || new Date(),
  } as UserStreak;
};

export const updateUserStreak = async (userId: string): Promise<UserStreak> => {
  if (!userId) {
    throw new Error("User ID is required to update streak");
  }

  const currentStreak = await getUserStreak(userId);
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  let newCurrentStreak = currentStreak.currentStreak;
  let newLongestStreak = currentStreak.longestStreak;

  // Check if this is the first session of the day
  if (currentStreak.lastActiveDay !== today) {
    if (currentStreak.lastActiveDay === yesterday) {
      // Consecutive day - increment streak
      newCurrentStreak += 1;
    } else if (currentStreak.lastActiveDay === "") {
      // First time user - start streak
      newCurrentStreak = 1;
    } else {
      // Streak broken - reset to 1
      newCurrentStreak = 1;
    }

    // Update longest streak if necessary
    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }
  }

  const updatedStreak: UserStreak = {
    userId,
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    lastActiveDay: today,
    totalFocusSessions: currentStreak.totalFocusSessions + 1,
    lastUpdated: new Date(),
  };

  const streakRef = doc(db, "userStreaks", userId);
  await setDoc(streakRef, {
    ...updatedStreak,
    lastUpdated: Timestamp.fromDate(updatedStreak.lastUpdated),
  });

  return updatedStreak;
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

    console.log("Creating focus session with data:", sessionData);
    const docRef = await addDoc(sessionsRef, sessionData);
    console.log("Focus session created successfully with ID:", docRef.id);

    // Verify the document was created
    const createdDoc = await getDoc(docRef);
    if (!createdDoc.exists()) {
      throw new Error("Failed to verify focus session creation");
    }

    return docRef.id;
  } catch (error) {
    console.error("Error in createFocusSession:", error);
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

    console.log("Ending focus session with data:", updateData);
    await updateDoc(sessionRef, updateData);

    // Update daily stats if we have the session data
    if (sessionData?.userId) {
      try {
        // Import dynamically to avoid circular dependencies
        const { updateDailyStatsForDate } = await import("./streakService");
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
        await updateDailyStatsForDate(sessionData.userId, today);
      } catch (error) {
        console.warn("Failed to update daily stats:", error);
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

    console.log("Focus session ended successfully");
  } catch (error) {
    console.error("Error in endFocusSession:", error);
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
    throw new Error("User ID and Task ID are required to get focus sessions");
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
    console.error("No user ID provided for debug");
    return;
  }

  try {
    console.log("🔍 Debugging focus session data for user:", userId);

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

    console.log("📊 Total focus sessions found:", sessions.length);

    if (sessions.length > 0) {
      console.log("📝 Recent sessions:");
      sessions.slice(0, 5).forEach((session, index) => {
        console.log(`${index + 1}.`, {
          id: session.id,
          taskId: session.data.taskId,
          startTime: session.data.startTime?.toDate(),
          endTime: session.data.endTime?.toDate(),
          duration: session.data.duration,
          intention: session.data.intention,
        });
      });
    } else {
      console.log("❌ No focus sessions found for this user");
    }

    // Check if user is properly authenticated
    console.log("🔐 Auth check - User ID:", userId);
  } catch (error) {
    console.error("❌ Error debugging focus session data:", error);
  }
};

// Enhanced function to verify focus session persistence
export const verifyFocusSessionPersistence = async (
  sessionId: string
): Promise<boolean> => {
  if (!sessionId) {
    console.error("No session ID provided for verification");
    return false;
  }

  try {
    const sessionRef = doc(db, "focusSessions", sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (sessionDoc.exists()) {
      const data = sessionDoc.data();
      console.log("✅ Focus session verified in Firebase:", {
        id: sessionId,
        userId: data.userId,
        taskId: data.taskId,
        startTime: data.startTime?.toDate(),
        endTime: data.endTime?.toDate(),
        duration: data.duration,
      });
      return true;
    } else {
      console.error("❌ Focus session not found in Firebase:", sessionId);
      return false;
    }
  } catch (error) {
    console.error("❌ Error verifying focus session:", error);
    return false;
  }
};
