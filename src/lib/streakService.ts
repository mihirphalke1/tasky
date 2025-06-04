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
  StreakData,
  MonthlyStreakView,
  Task,
  FocusSession,
} from "@/types";
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  isSameDay,
  parseISO,
} from "date-fns";

const STREAK_THRESHOLD = 50; // Default minimum completion percentage for streak

// Get daily stats for a specific date
export const getDailyStats = async (
  userId: string,
  date: string
): Promise<DailyStats | null> => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const statsRef = collection(db, "dailyStats");
    const q = query(
      statsRef,
      where("userId", "==", userId),
      where("date", "==", date)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      userId: data.userId,
      date: data.date,
      tasksAssigned: data.tasksAssigned || 0,
      tasksCompleted: data.tasksCompleted || 0,
      completionPercentage: data.completionPercentage || 0,
      focusTimeMinutes: data.focusTimeMinutes || 0,
      focusSessions: data.focusSessions || 0,
      pomodoroCount: data.pomodoroCount || 0,
      streakDay: data.streakDay || false,
      tasksDetails: data.tasksDetails || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      lastUpdated: data.lastUpdated?.toDate() || new Date(),
    } as DailyStats;
  } catch (error) {
    console.error("Error getting daily stats:", error);
    return null;
  }
};

// Calculate daily stats from tasks and focus sessions
export const calculateDailyStats = async (
  userId: string,
  date: string,
  tasks: Task[],
  focusSessions: FocusSession[]
): Promise<DailyStats> => {
  const dateObj = parseISO(date);
  const dayStart = startOfDay(dateObj);
  const dayEnd = endOfDay(dateObj);

  // Filter tasks that were created or modified on this day, or are relevant to this day
  const dayTasks = tasks.filter((task) => {
    // Include tasks that were created on this day
    const createdOnDay = task.createdAt >= dayStart && task.createdAt <= dayEnd;

    // Include tasks that were completed on this day
    const completedOnDay =
      task.completedAt &&
      task.completedAt >= dayStart &&
      task.completedAt <= dayEnd;

    // Include tasks that were modified on this day (e.g., status changed)
    const modifiedOnDay =
      task.lastModified >= dayStart && task.lastModified <= dayEnd;

    return (createdOnDay || completedOnDay || modifiedOnDay) && !task.hidden;
  });

  // Only count tasks as completed if they were actually completed on this specific day
  const completedTasks = dayTasks.filter(
    (task) =>
      task.completed &&
      task.completedAt &&
      task.completedAt >= dayStart &&
      task.completedAt <= dayEnd
  );

  // Filter focus sessions for this day
  const dayFocusSessions = focusSessions.filter((session) => {
    const sessionDate = session.startTime;
    return sessionDate >= dayStart && sessionDate <= dayEnd;
  });

  // Calculate focus time and pomodoro count
  const focusTimeMinutes = dayFocusSessions.reduce(
    (total, session) => total + (session.duration || 0),
    0
  );

  const pomodoroCount = dayFocusSessions.reduce(
    (total, session) => total + (session.pomodoroCount || 0),
    0
  );

  // Create task details
  const tasksDetails = dayTasks.map((task) => {
    const taskFocusSessions = dayFocusSessions.filter(
      (session) => session.taskId === task.id
    );
    const taskFocusTime = taskFocusSessions.reduce(
      (total, session) => total + (session.duration || 0),
      0
    );
    const taskPomodoros = taskFocusSessions.reduce(
      (total, session) => total + (session.pomodoroCount || 0),
      0
    );

    return {
      taskId: task.id,
      title: task.title,
      completed: task.completed,
      completedAt: task.completedAt,
      focusTimeMinutes: taskFocusTime,
      pomodoroCount: taskPomodoros,
    };
  });

  const tasksAssigned = dayTasks.length;
  const tasksCompleted = completedTasks.length;
  const completionPercentage =
    tasksAssigned > 0 ? Math.round((tasksCompleted / tasksAssigned) * 100) : 0;
  const streakDay =
    completionPercentage >= STREAK_THRESHOLD ||
    (tasksAssigned === 0 && focusTimeMinutes > 0);

  return {
    id: "",
    userId,
    date,
    tasksAssigned,
    tasksCompleted,
    completionPercentage,
    focusTimeMinutes,
    focusSessions: dayFocusSessions.length,
    pomodoroCount,
    streakDay,
    tasksDetails,
    createdAt: new Date(),
    lastUpdated: new Date(),
  };
};

// Save or update daily stats
export const saveDailyStats = async (
  dailyStats: DailyStats
): Promise<string> => {
  try {
    console.log("Attempting to save daily stats:", dailyStats);

    const statsRef = collection(db, "dailyStats");
    const q = query(
      statsRef,
      where("userId", "==", dailyStats.userId),
      where("date", "==", dailyStats.date)
    );

    const querySnapshot = await getDocs(q);

    const statsData = {
      userId: dailyStats.userId,
      date: dailyStats.date,
      tasksAssigned: dailyStats.tasksAssigned,
      tasksCompleted: dailyStats.tasksCompleted,
      completionPercentage: dailyStats.completionPercentage,
      focusTimeMinutes: dailyStats.focusTimeMinutes,
      focusSessions: dailyStats.focusSessions,
      pomodoroCount: dailyStats.pomodoroCount,
      streakDay: dailyStats.streakDay,
      tasksDetails: dailyStats.tasksDetails,
      lastUpdated: Timestamp.fromDate(new Date()),
    };

    console.log("Prepared stats data for Firestore:", statsData);

    if (querySnapshot.empty) {
      // Create new document
      console.log("Creating new daily stats document");
      const docRef = await addDoc(statsRef, {
        ...statsData,
        createdAt: Timestamp.fromDate(new Date()),
      });
      console.log("Successfully created daily stats with ID:", docRef.id);
      return docRef.id;
    } else {
      // Update existing document
      console.log("Updating existing daily stats document");
      const doc = querySnapshot.docs[0];
      await updateDoc(doc.ref, statsData);
      console.log("Successfully updated daily stats with ID:", doc.id);
      return doc.id;
    }
  } catch (error) {
    console.error("Error saving daily stats:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      userId: dailyStats.userId,
      date: dailyStats.date,
    });
    throw new Error(`Failed to save daily stats: ${error.message}`);
  }
};

// Get streak data for a user
export const getStreakData = async (userId: string): Promise<StreakData> => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const streakRef = doc(db, "streakData", userId);
    const streakDoc = await getDoc(streakRef);

    if (!streakDoc.exists()) {
      // Create initial streak data
      const initialStreak: StreakData = {
        id: userId,
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalDaysActive: 0,
        lastActiveDate: "",
        streakThreshold: STREAK_THRESHOLD,
        lastUpdated: new Date(),
        streakHistory: [],
      };

      await setDoc(streakRef, {
        ...initialStreak,
        lastUpdated: Timestamp.fromDate(new Date()),
      });

      return initialStreak;
    }

    const data = streakDoc.data();
    return {
      id: streakDoc.id,
      userId: data.userId,
      currentStreak: data.currentStreak || 0,
      longestStreak: data.longestStreak || 0,
      totalDaysActive: data.totalDaysActive || 0,
      lastActiveDate: data.lastActiveDate || "",
      streakThreshold: data.streakThreshold || STREAK_THRESHOLD,
      lastUpdated: data.lastUpdated?.toDate() || new Date(),
      streakHistory: data.streakHistory || [],
    } as StreakData;
  } catch (error) {
    console.error("Error getting streak data:", error);
    throw new Error("Failed to get streak data");
  }
};

// Update streak data based on daily stats
export const updateStreakData = async (
  userId: string,
  date: string,
  isStreakDay: boolean
): Promise<StreakData> => {
  try {
    const currentStreak = await getStreakData(userId);
    const yesterday = format(subDays(parseISO(date), 1), "yyyy-MM-dd");

    let newCurrentStreak = currentStreak.currentStreak;
    let newLongestStreak = currentStreak.longestStreak;
    let newTotalDaysActive = currentStreak.totalDaysActive;
    let streakHistory = [...currentStreak.streakHistory];

    if (isStreakDay) {
      // Check if this continues a streak or starts a new one
      if (currentStreak.lastActiveDate === yesterday) {
        // Continue existing streak
        newCurrentStreak += 1;
      } else if (currentStreak.lastActiveDate === "") {
        // First streak day ever
        newCurrentStreak = 1;
      } else {
        // Broken streak, start new one
        if (newCurrentStreak > 0) {
          // Save the broken streak to history
          streakHistory.push({
            startDate: format(
              subDays(
                parseISO(currentStreak.lastActiveDate),
                newCurrentStreak - 1
              ),
              "yyyy-MM-dd"
            ),
            endDate: currentStreak.lastActiveDate,
            length: newCurrentStreak,
          });
        }
        newCurrentStreak = 1;
      }

      newTotalDaysActive += 1;
      newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
    } else {
      // Not a streak day - check if we need to break the streak
      if (currentStreak.lastActiveDate === yesterday) {
        // Streak is broken
        if (newCurrentStreak > 0) {
          streakHistory.push({
            startDate: format(
              subDays(
                parseISO(currentStreak.lastActiveDate),
                newCurrentStreak - 1
              ),
              "yyyy-MM-dd"
            ),
            endDate: currentStreak.lastActiveDate,
            length: newCurrentStreak,
          });
        }
        newCurrentStreak = 0;
      }
    }

    const updatedStreak: StreakData = {
      ...currentStreak,
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      totalDaysActive: newTotalDaysActive,
      lastActiveDate: isStreakDay ? date : currentStreak.lastActiveDate,
      lastUpdated: new Date(),
      streakHistory,
    };

    // Save to database
    const streakRef = doc(db, "streakData", userId);
    await updateDoc(streakRef, {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      totalDaysActive: newTotalDaysActive,
      lastActiveDate: isStreakDay ? date : currentStreak.lastActiveDate,
      lastUpdated: Timestamp.fromDate(new Date()),
      streakHistory,
    });

    return updatedStreak;
  } catch (error) {
    console.error("Error updating streak data:", error);
    throw new Error("Failed to update streak data");
  }
};

// Get monthly view data for calendar
export const getMonthlyStreakView = async (
  userId: string,
  year: number,
  month: number
): Promise<MonthlyStreakView> => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get all daily stats for the month
    const statsRef = collection(db, "dailyStats");
    const q = query(
      statsRef,
      where("userId", "==", userId),
      where("date", ">=", format(startDate, "yyyy-MM-dd")),
      where("date", "<=", format(endDate, "yyyy-MM-dd")),
      orderBy("date", "asc")
    );

    const querySnapshot = await getDocs(q);
    const dailyStatsMap = new Map<string, DailyStats>();

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const stats: DailyStats = {
        id: doc.id,
        userId: data.userId,
        date: data.date,
        tasksAssigned: data.tasksAssigned || 0,
        tasksCompleted: data.tasksCompleted || 0,
        completionPercentage: data.completionPercentage || 0,
        focusTimeMinutes: data.focusTimeMinutes || 0,
        focusSessions: data.focusSessions || 0,
        pomodoroCount: data.pomodoroCount || 0,
        streakDay: data.streakDay || false,
        tasksDetails: data.tasksDetails || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
      };
      dailyStatsMap.set(data.date, stats);
    });

    // Create calendar data
    const daysWithData = [];
    const today = format(new Date(), "yyyy-MM-dd");

    for (let day = 1; day <= endDate.getDate(); day++) {
      const date = format(new Date(year, month - 1, day), "yyyy-MM-dd");
      const stats = dailyStatsMap.get(date) || null;

      daysWithData.push({
        date,
        dayOfMonth: day,
        stats,
        isStreakDay: stats?.streakDay || false,
        isToday: date === today,
        isCurrentMonth: true,
      });
    }

    return {
      month: format(new Date(year, month - 1), "yyyy-MM"),
      year,
      monthNum: month,
      daysWithData,
    };
  } catch (error) {
    console.error("Error getting monthly streak view:", error);
    throw new Error("Failed to get monthly streak view");
  }
};

// Update daily stats automatically (called when tasks or focus sessions change)
export const updateDailyStatsForDate = async (
  userId: string,
  date: string
): Promise<void> => {
  try {
    // Import dynamically to avoid circular dependencies
    const { getTasks } = await import("./taskService");
    const { getFocusSessions } = await import("./focusService");

    const [tasks, focusSessions] = await Promise.all([
      getTasks(userId),
      getFocusSessions(userId),
    ]);

    const dailyStats = await calculateDailyStats(
      userId,
      date,
      tasks,
      focusSessions
    );
    await saveDailyStats(dailyStats);
    await updateStreakData(userId, date, dailyStats.streakDay);
  } catch (error) {
    console.error("Error updating daily stats:", error);
  }
};

// Get range of daily stats
export const getDailyStatsRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyStats[]> => {
  try {
    const statsRef = collection(db, "dailyStats");
    const q = query(
      statsRef,
      where("userId", "==", userId),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "asc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        date: data.date,
        tasksAssigned: data.tasksAssigned || 0,
        tasksCompleted: data.tasksCompleted || 0,
        completionPercentage: data.completionPercentage || 0,
        focusTimeMinutes: data.focusTimeMinutes || 0,
        focusSessions: data.focusSessions || 0,
        pomodoroCount: data.pomodoroCount || 0,
        streakDay: data.streakDay || false,
        tasksDetails: data.tasksDetails || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
      } as DailyStats;
    });
  } catch (error) {
    console.error("Error getting daily stats range:", error);
    return [];
  }
};

// Helper function for testing - creates sample data
export const createSampleStreakData = async (userId: string): Promise<void> => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    console.log("Creating sample streak data for testing...");

    // Create some sample daily stats for the past few days
    const today = new Date();
    const dates = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(format(date, "yyyy-MM-dd"));
    }

    for (const [index, date] of dates.entries()) {
      const sampleStats: DailyStats = {
        id: "",
        userId,
        date,
        tasksAssigned: Math.floor(Math.random() * 5) + 2, // 2-6 tasks
        tasksCompleted: Math.floor(Math.random() * 4) + 1, // 1-4 completed
        completionPercentage: 0,
        focusTimeMinutes: Math.floor(Math.random() * 120) + 30, // 30-150 minutes
        focusSessions: Math.floor(Math.random() * 3) + 1, // 1-3 sessions
        pomodoroCount: Math.floor(Math.random() * 6) + 2, // 2-7 pomodoros
        streakDay: false, // Will be calculated
        tasksDetails: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      // Calculate completion percentage and streak day
      sampleStats.completionPercentage = Math.round(
        (sampleStats.tasksCompleted / sampleStats.tasksAssigned) * 100
      );
      sampleStats.streakDay =
        sampleStats.completionPercentage >= STREAK_THRESHOLD;

      // Create some sample task details
      for (let j = 0; j < sampleStats.tasksAssigned; j++) {
        sampleStats.tasksDetails.push({
          taskId: `sample-task-${date}-${j}`,
          title: `Sample Task ${j + 1}`,
          completed: j < sampleStats.tasksCompleted,
          completedAt: j < sampleStats.tasksCompleted ? new Date() : undefined,
          focusTimeMinutes: Math.floor(
            sampleStats.focusTimeMinutes / sampleStats.tasksAssigned
          ),
          pomodoroCount: Math.floor(
            sampleStats.pomodoroCount / sampleStats.tasksAssigned
          ),
        });
      }

      await saveDailyStats(sampleStats);
      await updateStreakData(userId, date, sampleStats.streakDay);
    }

    console.log("Sample streak data created successfully!");
  } catch (error) {
    console.error("Error creating sample streak data:", error);
    throw error;
  }
};
