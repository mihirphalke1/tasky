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
      tasksDetails: (data.tasksDetails || []).map((task: any) => ({
        ...task,
        completedAt: task.completedAt?.toDate
          ? task.completedAt.toDate()
          : task.completedAt,
      })),
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
      tasksDetails: dailyStats.tasksDetails.map((task) => ({
        ...task,
        completedAt: task.completedAt
          ? Timestamp.fromDate(task.completedAt)
          : null,
      })),
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
    console.log("Getting streak data for user:", userId);
    const streakRef = doc(db, "streakData", userId);
    const streakDoc = await getDoc(streakRef);

    if (!streakDoc.exists()) {
      console.log("No streak data found, creating initial streak data");
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

      console.log("Created initial streak data:", initialStreak);
      return initialStreak;
    }

    const data = streakDoc.data();
    const streakData = {
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

    console.log("Retrieved streak data:", streakData);
    return streakData;
  } catch (error) {
    console.error("Error getting streak data:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      userId: userId,
    });
    throw new Error(`Failed to get streak data: ${error.message}`);
  }
};

// Update streak data based on daily stats
export const updateStreakData = async (
  userId: string,
  date: string,
  isStreakDay: boolean
): Promise<StreakData> => {
  try {
    console.log("=== STREAK UPDATE DEBUG ===");
    console.log("Date:", date);
    console.log("Is Streak Day:", isStreakDay);

    const currentStreak = await getStreakData(userId);
    console.log("Current streak data:", {
      currentStreak: currentStreak.currentStreak,
      lastActiveDate: currentStreak.lastActiveDate,
      totalDaysActive: currentStreak.totalDaysActive,
    });

    const yesterday = format(subDays(parseISO(date), 1), "yyyy-MM-dd");
    console.log("Yesterday date:", yesterday);
    console.log("Last active date:", currentStreak.lastActiveDate);

    // Check if we're updating the same day multiple times
    const isUpdatingSameDay = currentStreak.lastActiveDate === date;
    const isConsecutive = currentStreak.lastActiveDate === yesterday;
    console.log("Is updating same day?", isUpdatingSameDay);
    console.log("Is consecutive?", isConsecutive);
    console.log("Date comparison details:", {
      inputDate: date,
      lastActiveDate: currentStreak.lastActiveDate,
      yesterday: yesterday,
      sameDayCheck: currentStreak.lastActiveDate === date,
      consecutiveCheck: currentStreak.lastActiveDate === yesterday,
    });

    let newCurrentStreak = currentStreak.currentStreak;
    let newLongestStreak = currentStreak.longestStreak;
    let newTotalDaysActive = currentStreak.totalDaysActive;
    let streakHistory = [...currentStreak.streakHistory];

    if (isStreakDay) {
      console.log("Processing streak day...");

      if (isUpdatingSameDay) {
        // We're updating the same day multiple times - don't change streak count
        console.log("Same day update - maintaining current streak");
        // Keep current values, don't increment
      } else if (currentStreak.lastActiveDate === yesterday) {
        // Continue existing streak
        console.log("Continuing existing streak");
        console.log("Previous streak count:", newCurrentStreak);
        newCurrentStreak += 1;
        newTotalDaysActive += 1;
        console.log("New streak count after increment:", newCurrentStreak);
      } else if (currentStreak.lastActiveDate === "") {
        // First streak day ever
        console.log("First streak day ever");
        newCurrentStreak = 1;
        newTotalDaysActive += 1;
      } else {
        // Broken streak, start new one
        console.log("Broken streak, starting new one");
        console.log(
          "Gap between",
          currentStreak.lastActiveDate,
          "and",
          yesterday
        );
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
        newTotalDaysActive += 1;
      }

      newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
    } else {
      console.log("Not a streak day, checking if streak should be broken...");
      // Not a streak day - check if we need to break the streak
      if (!isUpdatingSameDay && currentStreak.lastActiveDate === yesterday) {
        // Streak is broken
        console.log("Breaking streak");
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
      } else if (isUpdatingSameDay) {
        console.log("Same day update - no streak day, keeping current state");
        // If we're updating the same day and it's not a streak day, don't break existing streaks from previous days
      }
    }

    console.log("Final streak calculation results:", {
      newCurrentStreak,
      newLongestStreak,
      newTotalDaysActive,
      willUpdateLastActiveDate: isStreakDay
        ? date
        : currentStreak.lastActiveDate,
    });

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
    const updateData = {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      totalDaysActive: newTotalDaysActive,
      lastActiveDate: isStreakDay ? date : currentStreak.lastActiveDate,
      lastUpdated: Timestamp.fromDate(new Date()),
      streakHistory,
    };

    console.log("Saving streak data to database:", updateData);
    await updateDoc(streakRef, updateData);

    console.log("=== STREAK UPDATE COMPLETE ===");
    console.log("Final updated streak data:", updatedStreak);
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
        tasksDetails: (data.tasksDetails || []).map((task: any) => ({
          ...task,
          completedAt: task.completedAt?.toDate
            ? task.completedAt.toDate()
            : task.completedAt,
        })),
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
        tasksDetails: (data.tasksDetails || []).map((task: any) => ({
          ...task,
          completedAt: task.completedAt?.toDate
            ? task.completedAt.toDate()
            : task.completedAt,
        })),
        createdAt: data.createdAt?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
      } as DailyStats;
    });
  } catch (error) {
    console.error("Error getting daily stats range:", error);
    return [];
  }
};

// Recalculate streak data from scratch based on all daily stats
export const recalculateStreakFromHistory = async (
  userId: string
): Promise<StreakData> => {
  try {
    console.log("=== RECALCULATING STREAK FROM HISTORY ===");

    // Get all daily stats for the user, sorted by date
    const statsRef = collection(db, "dailyStats");
    const q = query(
      statsRef,
      where("userId", "==", userId),
      orderBy("date", "asc")
    );

    const querySnapshot = await getDocs(q);
    const allStats = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        date: data.date,
        streakDay: data.streakDay,
        completionPercentage: data.completionPercentage,
        tasksCompleted: data.tasksCompleted,
        tasksAssigned: data.tasksAssigned,
      };
    });

    console.log("Found daily stats for recalculation:", allStats.length);
    console.log("All stats:", allStats);

    let currentStreak = 0;
    let longestStreak = 0;
    let totalDaysActive = 0;
    let lastActiveDate = "";
    const streakHistory: Array<{
      startDate: string;
      endDate: string;
      length: number;
    }> = [];

    // Find all streak days and process them chronologically
    const streakDays = allStats.filter((stat) => stat.streakDay);
    console.log("Streak days found:", streakDays);

    if (streakDays.length === 0) {
      console.log("No streak days found");
    } else {
      let currentStreakStart = streakDays[0].date;
      let tempStreakLength = 1;
      lastActiveDate = streakDays[0].date;
      totalDaysActive = 1;

      for (let i = 1; i < streakDays.length; i++) {
        const currentDay = streakDays[i];
        const previousDay = streakDays[i - 1];

        // Calculate what the previous day should be if consecutive
        const expectedPrevDate = format(
          subDays(parseISO(currentDay.date), 1),
          "yyyy-MM-dd"
        );

        console.log(`Checking day ${currentDay.date}:`);
        console.log(`  Previous day: ${previousDay.date}`);
        console.log(`  Expected previous: ${expectedPrevDate}`);
        console.log(
          `  Is consecutive: ${previousDay.date === expectedPrevDate}`
        );

        if (previousDay.date === expectedPrevDate) {
          // Consecutive day - continue streak
          tempStreakLength += 1;
          console.log(`  Continuing streak, now ${tempStreakLength} days`);
        } else {
          // Gap found - end previous streak and start new one
          console.log(`  Gap found! Ending streak of ${tempStreakLength} days`);

          // Save the completed streak to history
          if (tempStreakLength > 0) {
            streakHistory.push({
              startDate: currentStreakStart,
              endDate: previousDay.date,
              length: tempStreakLength,
            });
          }

          // Start new streak
          currentStreakStart = currentDay.date;
          tempStreakLength = 1;
          console.log(`  Starting new streak from ${currentDay.date}`);
        }

        lastActiveDate = currentDay.date;
        totalDaysActive += 1;
        longestStreak = Math.max(longestStreak, tempStreakLength);
      }

      // The last streak is our current streak if it ends with the last day
      currentStreak = tempStreakLength;
      console.log(`Final streak length: ${currentStreak}`);
    }

    console.log("Recalculated streak data:", {
      currentStreak,
      longestStreak,
      totalDaysActive,
      lastActiveDate,
      streakHistory,
    });

    // Update the database with recalculated data
    const updatedStreak: StreakData = {
      id: userId,
      userId,
      currentStreak,
      longestStreak,
      totalDaysActive,
      lastActiveDate,
      streakThreshold: STREAK_THRESHOLD,
      lastUpdated: new Date(),
      streakHistory,
    };

    const streakRef = doc(db, "streakData", userId);
    await setDoc(streakRef, {
      ...updatedStreak,
      lastUpdated: Timestamp.fromDate(new Date()),
    });

    console.log("=== STREAK RECALCULATION COMPLETE ===");
    return updatedStreak;
  } catch (error) {
    console.error("Error recalculating streak from history:", error);
    throw new Error("Failed to recalculate streak from history");
  }
};

// Debug function to help troubleshoot streak issues
export const debugStreakCalculation = async (userId: string): Promise<void> => {
  try {
    console.log("=== STREAK DEBUG ANALYSIS ===");

    // Get current streak data
    const currentStreak = await getStreakData(userId);
    console.log("Current streak data:", currentStreak);

    // Get recent daily stats
    const statsRef = collection(db, "dailyStats");
    const q = query(
      statsRef,
      where("userId", "==", userId),
      orderBy("date", "desc"),
      limit(7) // Last 7 days
    );

    const querySnapshot = await getDocs(q);
    const recentStats = querySnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          date: data.date,
          streakDay: data.streakDay,
          completionPercentage: data.completionPercentage,
          tasksCompleted: data.tasksCompleted,
          tasksAssigned: data.tasksAssigned,
        };
      })
      .reverse(); // Reverse to get chronological order

    console.log("Recent daily stats:", recentStats);

    // Analyze streak days
    const streakDays = recentStats.filter((stat) => stat.streakDay);
    console.log("Streak days found:", streakDays);

    // Check for consecutive days
    for (let i = 1; i < streakDays.length; i++) {
      const current = streakDays[i];
      const previous = streakDays[i - 1];
      const expectedPrevDate = format(
        subDays(parseISO(current.date), 1),
        "yyyy-MM-dd"
      );
      const isConsecutive = previous.date === expectedPrevDate;

      console.log(
        `Day ${current.date} consecutive with ${previous.date}? ${isConsecutive}`
      );
      console.log(
        `Expected previous date: ${expectedPrevDate}, actual: ${previous.date}`
      );
    }

    console.log("=== STREAK DEBUG COMPLETE ===");
  } catch (error) {
    console.error("Error in streak debug analysis:", error);
  }
};
