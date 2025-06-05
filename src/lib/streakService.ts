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
import { logger } from "./logger";

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
    logger.error("Error getting daily stats:", error);
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
    logger.log("Attempting to save daily stats:", dailyStats);

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

    logger.log("Prepared stats data for Firestore:", statsData);

    if (querySnapshot.empty) {
      // Create new document
      logger.log("Creating new daily stats document");
      const docRef = await addDoc(statsRef, {
        ...statsData,
        createdAt: Timestamp.fromDate(new Date()),
      });
      logger.log("Successfully created daily stats with ID:", docRef.id);
      return docRef.id;
    } else {
      // Update existing document
      logger.log("Updating existing daily stats document");
      const doc = querySnapshot.docs[0];
      await updateDoc(doc.ref, statsData);
      logger.log("Successfully updated daily stats with ID:", doc.id);
      return doc.id;
    }
  } catch (error) {
    logger.error("Error saving daily stats:", error);
    logger.error("Error details:", {
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
    logger.log("Getting streak data for user:", userId);
    const streakRef = doc(db, "streakData", userId);
    const streakDoc = await getDoc(streakRef);

    if (!streakDoc.exists()) {
      logger.log("No streak data found, creating initial streak data");
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

      logger.log("Created initial streak data:", initialStreak);
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

    logger.log("Retrieved streak data:", streakData);
    return streakData;
  } catch (error) {
    logger.error("Error getting streak data:", error);
    logger.error("Error details:", {
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
    logger.log("=== STREAK UPDATE DEBUG ===");
    logger.log("Date:", date);
    logger.log("Is Streak Day:", isStreakDay);

    const currentStreak = await getStreakData(userId);
    logger.log("Current streak data:", {
      currentStreak: currentStreak.currentStreak,
      lastActiveDate: currentStreak.lastActiveDate,
      totalDaysActive: currentStreak.totalDaysActive,
    });

    // Instead of just checking yesterday, we need to recalculate from history
    // to ensure the streak calculation is accurate
    logger.log("Recalculating streak from history to ensure accuracy...");
    const recalculatedStreak = await recalculateStreakFromHistory(userId);

    logger.log("=== STREAK UPDATE COMPLETE ===");
    logger.log("Final updated streak data:", recalculatedStreak);
    return recalculatedStreak;
  } catch (error) {
    logger.error("Error updating streak data:", error);
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
    logger.error("Error getting monthly streak view:", error);
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
    logger.error("Error updating daily stats:", error);
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
    logger.error("Error getting daily stats range:", error);
    return [];
  }
};

// Recalculate streak data from scratch based on all daily stats
export const recalculateStreakFromHistory = async (
  userId: string
): Promise<StreakData> => {
  try {
    logger.log("=== RECALCULATING STREAK FROM HISTORY ===");

    // Get all daily stats for the user, sorted by date
    const statsRef = collection(db, "dailyStats");
    const q = query(
      statsRef,
      where("userId", "==", userId),
      orderBy("date", "asc")
    );

    const querySnapshot = await getDocs(q);
    const allStatsMap = new Map<string, any>();

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      allStatsMap.set(data.date, {
        date: data.date,
        streakDay: data.streakDay,
        completionPercentage: data.completionPercentage,
        tasksCompleted: data.tasksCompleted,
        tasksAssigned: data.tasksAssigned,
      });
    });

    logger.log("Found daily stats for recalculation:", allStatsMap.size);

    let currentStreak = 0;
    let longestStreak = 0;
    let totalDaysActive = 0;
    let lastActiveDate = "";
    const streakHistory: Array<{
      startDate: string;
      endDate: string;
      length: number;
    }> = [];

    if (allStatsMap.size === 0) {
      logger.log("No daily stats found");
    } else {
      // Get all dates and sort them
      const allDates = Array.from(allStatsMap.keys()).sort();
      logger.log("All dates with stats:", allDates);

      // Process all dates chronologically to find streaks
      const streakSequences: Array<{
        startDate: string;
        endDate: string;
        length: number;
        dates: string[];
      }> = [];

      let currentSequence: string[] = [];

      for (let i = 0; i < allDates.length; i++) {
        const currentDate = allDates[i];
        const stats = allStatsMap.get(currentDate);

        logger.log(`Checking date ${currentDate}:`, {
          streakDay: stats.streakDay,
          completionPercentage: stats.completionPercentage,
          tasksCompleted: stats.tasksCompleted,
          tasksAssigned: stats.tasksAssigned,
        });

        if (stats.streakDay) {
          totalDaysActive++;
          lastActiveDate = currentDate;

          // Check if this day continues the current sequence
          if (currentSequence.length === 0) {
            // Starting a new sequence
            currentSequence = [currentDate];
            logger.log(`Starting new sequence on ${currentDate}`);
          } else {
            // Check if this day is consecutive with the last day in the sequence
            const lastDateInSequence =
              currentSequence[currentSequence.length - 1];
            const expectedNextDate = format(
              addDays(parseISO(lastDateInSequence), 1),
              "yyyy-MM-dd"
            );

            logger.log(`Last date in sequence: ${lastDateInSequence}`);
            logger.log(`Expected next date: ${expectedNextDate}`);
            logger.log(`Current date: ${currentDate}`);

            if (currentDate === expectedNextDate) {
              // Consecutive day - add to current sequence
              currentSequence.push(currentDate);
              logger.log(
                `Adding to sequence, now ${currentSequence.length} days`
              );
            } else {
              // Gap found - save current sequence and start new one
              logger.log(
                `Gap found! Saving sequence of ${currentSequence.length} days`
              );

              if (currentSequence.length > 0) {
                streakSequences.push({
                  startDate: currentSequence[0],
                  endDate: currentSequence[currentSequence.length - 1],
                  length: currentSequence.length,
                  dates: [...currentSequence],
                });
              }

              // Start new sequence
              currentSequence = [currentDate];
              logger.log(`Starting new sequence from ${currentDate}`);
            }
          }
        } else {
          // Not a streak day - end current sequence if any
          if (currentSequence.length > 0) {
            logger.log(
              `Non-streak day ${currentDate} ends sequence of ${currentSequence.length} days`
            );

            streakSequences.push({
              startDate: currentSequence[0],
              endDate: currentSequence[currentSequence.length - 1],
              length: currentSequence.length,
              dates: [...currentSequence],
            });

            currentSequence = [];
          }
        }
      }

      // Don't forget the last sequence if it exists
      if (currentSequence.length > 0) {
        logger.log(`Adding final sequence of ${currentSequence.length} days`);
        streakSequences.push({
          startDate: currentSequence[0],
          endDate: currentSequence[currentSequence.length - 1],
          length: currentSequence.length,
          dates: [...currentSequence],
        });
      }

      logger.log("All streak sequences found:", streakSequences);

      // Calculate longest streak from all sequences
      longestStreak = Math.max(0, ...streakSequences.map((seq) => seq.length));
      logger.log(`Longest streak: ${longestStreak}`);

      // Determine current streak
      const today = format(new Date(), "yyyy-MM-dd");
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

      logger.log(`Today: ${today}, Yesterday: ${yesterday}`);

      // Find the most recent sequence and check if it's current
      if (streakSequences.length > 0) {
        const lastSequence = streakSequences[streakSequences.length - 1];
        const lastDate = lastSequence.endDate;

        logger.log(
          `Last sequence: ${lastSequence.startDate} to ${lastSequence.endDate} (${lastSequence.length} days)`
        );
        logger.log(`Last sequence dates:`, lastSequence.dates);

        // A streak is current if:
        // 1. It ends today, OR
        // 2. It ends yesterday (allowing for the user to be "in progress" for today)
        const isCurrentStreak = lastDate === today || lastDate === yesterday;

        logger.log(
          `Is current streak? ${isCurrentStreak} (last date: ${lastDate})`
        );

        if (isCurrentStreak) {
          currentStreak = lastSequence.length;
          logger.log(`Current streak: ${currentStreak}`);
        } else {
          currentStreak = 0;
          logger.log(`No current streak (last activity: ${lastDate})`);
        }

        // Add completed streaks to history (excluding the current one if applicable)
        streakSequences.forEach((seq, index) => {
          const isThisTheCurrent =
            isCurrentStreak && index === streakSequences.length - 1;
          if (!isThisTheCurrent && seq.length > 0) {
            streakHistory.push({
              startDate: seq.startDate,
              endDate: seq.endDate,
              length: seq.length,
            });
          }
        });
      }
    }

    logger.log("Final calculated streak data:", {
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

    logger.log("=== STREAK RECALCULATION COMPLETE ===");
    return updatedStreak;
  } catch (error) {
    logger.error("Error recalculating streak from history:", error);
    throw new Error("Failed to recalculate streak from history");
  }
};

// Debug function to help troubleshoot streak issues
export const debugStreakCalculation = async (userId: string): Promise<void> => {
  try {
    logger.log("=== STREAK DEBUG ANALYSIS ===");

    // Get current streak data
    const currentStreak = await getStreakData(userId);
    logger.log("Current streak data:", currentStreak);

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

    logger.log("Recent daily stats:", recentStats);

    // Analyze streak days
    const streakDays = recentStats.filter((stat) => stat.streakDay);
    logger.log("Streak days found:", streakDays);

    // Check for consecutive days
    for (let i = 1; i < streakDays.length; i++) {
      const current = streakDays[i];
      const previous = streakDays[i - 1];
      const expectedPrevDate = format(
        subDays(parseISO(current.date), 1),
        "yyyy-MM-dd"
      );
      const isConsecutive = previous.date === expectedPrevDate;

      logger.log(
        `Day ${current.date} consecutive with ${previous.date}? ${isConsecutive}`
      );
      logger.log(
        `Expected previous date: ${expectedPrevDate}, actual: ${previous.date}`
      );
    }

    logger.log("=== STREAK DEBUG COMPLETE ===");
  } catch (error) {
    logger.error("Error in streak debug analysis:", error);
  }
};

// Test function to create sample data for testing streak calculation
export const createTestStreakData = async (userId: string): Promise<void> => {
  try {
    logger.log("Creating test streak data for user:", userId);

    // Import services dynamically to avoid circular dependencies
    const { getTasks } = await import("./taskService");
    const { getFocusSessions } = await import("./focusService");

    const today = new Date();
    const testDates = [];

    // Create test data for the last 10 days
    for (let i = 9; i >= 0; i--) {
      const testDate = new Date(today);
      testDate.setDate(today.getDate() - i);
      testDates.push(format(testDate, "yyyy-MM-dd"));
    }

    logger.log("Test dates:", testDates);

    // For each test date, calculate and save daily stats
    for (const date of testDates) {
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
      logger.log(`Created test data for ${date}:`, {
        tasksAssigned: dailyStats.tasksAssigned,
        tasksCompleted: dailyStats.tasksCompleted,
        completionPercentage: dailyStats.completionPercentage,
        streakDay: dailyStats.streakDay,
      });
    }

    // Now recalculate the streak
    await recalculateStreakFromHistory(userId);

    logger.log("Test streak data creation complete!");
  } catch (error) {
    logger.error("Error creating test streak data:", error);
    throw new Error("Failed to create test streak data");
  }
};

// Enhanced debug function to verify streak calculations
export const verifyStreakCalculation = async (
  userId: string
): Promise<void> => {
  try {
    logger.log("=== VERIFYING STREAK CALCULATION ===");

    // Get all daily stats
    const statsRef = collection(db, "dailyStats");
    const q = query(
      statsRef,
      where("userId", "==", userId),
      orderBy("date", "asc")
    );

    const querySnapshot = await getDocs(q);
    const allStats = querySnapshot.docs
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
      .sort((a, b) => a.date.localeCompare(b.date));

    logger.log("=== ALL DAILY STATS (CHRONOLOGICAL) ===");
    allStats.forEach((stat, index) => {
      const status = stat.streakDay ? "🔥" : "❌";
      const percentage = stat.completionPercentage;
      logger.log(
        `${index + 1}. ${stat.date}: ${status} ${percentage}% (${
          stat.tasksCompleted
        }/${stat.tasksAssigned} tasks)`
      );
    });

    // Get current streak data
    const streakData = await getStreakData(userId);
    logger.log("\n=== CURRENT STREAK DATA ===");
    logger.log("Current streak:", streakData.currentStreak);
    logger.log("Longest streak:", streakData.longestStreak);
    logger.log("Total days active:", streakData.totalDaysActive);
    logger.log("Last active date:", streakData.lastActiveDate);
    logger.log("Streak history:", streakData.streakHistory);

    // Manual analysis of consecutive sequences
    logger.log("\n=== MANUAL SEQUENCE ANALYSIS ===");
    const streakDays = allStats.filter((stat) => stat.streakDay);

    if (streakDays.length === 0) {
      logger.log("❌ No streak days found.");
      return;
    }

    logger.log(
      `Found ${streakDays.length} streak days:`,
      streakDays.map((d) => d.date)
    );

    // Find all consecutive sequences
    const sequences = [];
    let currentSeq = [streakDays[0]];

    for (let i = 1; i < streakDays.length; i++) {
      const current = streakDays[i];
      const previous = streakDays[i - 1];

      const prevDate = parseISO(previous.date);
      const currDate = parseISO(current.date);
      const daysBetween = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      logger.log(
        `\nChecking gap between ${previous.date} and ${current.date}:`
      );
      logger.log(`  Days between: ${daysBetween}`);

      if (daysBetween === 1) {
        logger.log(`  ✅ Consecutive - adding to current sequence`);
        currentSeq.push(current);
      } else {
        logger.log(`  ❌ Gap found - ending sequence`);
        sequences.push([...currentSeq]);
        currentSeq = [current];
      }
    }

    // Add the final sequence
    sequences.push(currentSeq);

    logger.log("\n=== CONSECUTIVE SEQUENCES FOUND ===");
    sequences.forEach((sequence, index) => {
      const start = sequence[0].date;
      const end = sequence[sequence.length - 1].date;
      const length = sequence.length;
      logger.log(`Sequence ${index + 1}: ${start} to ${end} (${length} days)`);
      logger.log(`  Dates: ${sequence.map((s) => s.date).join(", ")}`);
    });

    // Determine what should be the current streak
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

    logger.log(`\n=== CURRENT STREAK ANALYSIS ===`);
    logger.log(`Today: ${today}`);
    logger.log(`Yesterday: ${yesterday}`);

    if (sequences.length > 0) {
      const lastSequence = sequences[sequences.length - 1];
      const lastDate = lastSequence[lastSequence.length - 1].date;
      const isCurrent = lastDate === today || lastDate === yesterday;

      logger.log(`Last sequence ends on: ${lastDate}`);
      logger.log(`Is this current? ${isCurrent ? "YES" : "NO"}`);

      if (isCurrent) {
        logger.log(`✅ Expected current streak: ${lastSequence.length}`);
        logger.log(
          `✅ Expected longest streak: ${Math.max(
            ...sequences.map((s) => s.length)
          )}`
        );
      } else {
        logger.log(`✅ Expected current streak: 0 (last activity too old)`);
        logger.log(
          `✅ Expected longest streak: ${Math.max(
            ...sequences.map((s) => s.length)
          )}`
        );
      }

      logger.log(`\n=== COMPARISON WITH STORED DATA ===`);
      const expectedCurrent = isCurrent ? lastSequence.length : 0;
      const expectedLongest = Math.max(...sequences.map((s) => s.length));

      logger.log(
        `Current streak: Expected ${expectedCurrent}, Got ${
          streakData.currentStreak
        } ${expectedCurrent === streakData.currentStreak ? "✅" : "❌"}`
      );
      logger.log(
        `Longest streak: Expected ${expectedLongest}, Got ${
          streakData.longestStreak
        } ${expectedLongest === streakData.longestStreak ? "✅" : "❌"}`
      );

      if (
        expectedCurrent !== streakData.currentStreak ||
        expectedLongest !== streakData.longestStreak
      ) {
        logger.log(
          `\n🔧 MISMATCH DETECTED! Run 'await recalculateStreak()' to fix.`
        );
      } else {
        logger.log(`\n✅ All calculations are correct!`);
      }
    } else {
      logger.log(`✅ Expected: No streaks (no streak days found)`);
    }

    logger.log("=== VERIFICATION COMPLETE ===");
  } catch (error) {
    logger.error("Error verifying streak calculation:", error);
  }
};
