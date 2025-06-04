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
} from "firebase/firestore";
import { TaskInsight, InsightRule, InsightType, FocusSession } from "@/types";

// Default insight rules that generate dynamic insights
const DEFAULT_INSIGHT_RULES: Omit<
  InsightRule,
  "id" | "createdAt" | "userId"
>[] = [
  {
    type: "focus_score",
    title: "Excellent Focus!",
    description:
      "Your focus efficiency is outstanding with great time management.",
    icon: "Zap",
    color: "green",
    threshold: 80,
    metric: "focusScore",
    comparison: "gte",
    isActive: true,
  },
  {
    type: "pomodoro_master",
    title: "Pomodoro Master!",
    description:
      "You've completed an impressive number of Pomodoros on this task.",
    icon: "Coffee",
    color: "red",
    threshold: 10,
    metric: "totalPomodoros",
    comparison: "gte",
    isActive: true,
  },
  {
    type: "deep_work",
    title: "Deep Work Specialist!",
    description: "Your average session length shows great sustained focus.",
    icon: "Clock",
    color: "blue",
    threshold: 60,
    metric: "avgSessionDuration",
    comparison: "gte",
    isActive: true,
  },
  {
    type: "consistency",
    title: "Consistent Performer!",
    description: "You've completed multiple focus sessions on this task.",
    icon: "Target",
    color: "purple",
    threshold: 5,
    metric: "totalSessions",
    comparison: "gte",
    isActive: true,
  },
  {
    type: "session_milestone",
    title: "Session Milestone!",
    description: "You've reached a significant number of focus sessions.",
    icon: "TrendingUp",
    color: "green",
    threshold: 15,
    metric: "totalSessions",
    comparison: "gte",
    isActive: true,
  },
  {
    type: "streak_achievement",
    title: "Focus Streak Champion!",
    description: "You're building an amazing focus streak.",
    icon: "Flame",
    color: "orange",
    threshold: 7,
    metric: "currentStreak",
    comparison: "gte",
    isActive: true,
  },
  {
    type: "productivity_boost",
    title: "Productivity Powerhouse!",
    description: "Your total focus time demonstrates exceptional dedication.",
    icon: "Battery",
    color: "yellow",
    threshold: 300, // 5 hours in minutes
    metric: "totalFocusTime",
    comparison: "gte",
    isActive: true,
  },
  {
    type: "time_management",
    title: "Time Management Expert!",
    description:
      "Your consistent session lengths show excellent time management skills.",
    icon: "Timer",
    color: "blue",
    threshold: 45,
    metric: "avgSessionDuration",
    comparison: "gte",
    isActive: true,
  },
];

// Initialize default insight rules for a user
export const initializeDefaultInsightRules = async (
  userId: string
): Promise<void> => {
  if (!userId) {
    throw new Error("User ID is required to initialize insight rules");
  }

  try {
    const rulesRef = collection(db, "insightRules");
    const q = query(rulesRef, where("userId", "==", userId));
    const existingRules = await getDocs(q);

    // Only initialize if no rules exist for this user
    if (existingRules.empty) {
      const batch = await Promise.all(
        DEFAULT_INSIGHT_RULES.map(async (rule) => {
          const ruleData = {
            ...rule,
            userId,
            createdAt: Timestamp.fromDate(new Date()),
          };
          return addDoc(rulesRef, ruleData);
        })
      );
      console.log(
        `Initialized ${batch.length} default insight rules for user ${userId}`
      );
    }
  } catch (error) {
    console.error("Error initializing default insight rules:", error);
    throw error;
  }
};

// Get insight rules for a user
export const getInsightRules = async (
  userId: string
): Promise<InsightRule[]> => {
  if (!userId) {
    throw new Error("User ID is required to get insight rules");
  }

  try {
    const rulesRef = collection(db, "insightRules");
    const q = query(
      rulesRef,
      where("userId", "==", userId),
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        title: data.title,
        description: data.description,
        icon: data.icon,
        color: data.color,
        threshold: data.threshold,
        metric: data.metric,
        comparison: data.comparison,
        isActive: data.isActive,
        createdAt: data.createdAt.toDate(),
      } as InsightRule;
    });
  } catch (error) {
    console.error("Error getting insight rules:", error);
    return [];
  }
};

// Generate insights based on analytics data
export const generateInsights = async (
  userId: string,
  taskId: string,
  analytics: {
    focusScore: number;
    totalPomodoros: number;
    avgSessionDuration: number;
    totalSessions: number;
    currentStreak: number;
    totalFocusTime: number;
  }
): Promise<TaskInsight[]> => {
  if (!userId || !taskId) {
    throw new Error("User ID and Task ID are required to generate insights");
  }

  try {
    // Get insight rules for this user
    const rules = await getInsightRules(userId);
    const generatedInsights: TaskInsight[] = [];

    for (const rule of rules) {
      // Check if the metric value meets the rule's threshold
      const metricValue = analytics[rule.metric as keyof typeof analytics];
      if (metricValue === undefined) continue;

      let shouldTrigger = false;
      switch (rule.comparison) {
        case "gte":
          shouldTrigger = metricValue >= rule.threshold;
          break;
        case "lte":
          shouldTrigger = metricValue <= rule.threshold;
          break;
        case "eq":
          shouldTrigger = metricValue === rule.threshold;
          break;
      }

      if (shouldTrigger) {
        // Check if this insight already exists for this task
        const existingInsight = await getExistingInsight(
          userId,
          taskId,
          rule.type
        );

        if (existingInsight) {
          // Update existing insight with new trigger time
          await updateInsight(existingInsight.id, {
            value: metricValue,
            lastTriggered: new Date(),
          });
          generatedInsights.push({
            ...existingInsight,
            value: metricValue,
            lastTriggered: new Date(),
          });
        } else {
          // Create new insight
          const newInsight: Omit<TaskInsight, "id"> = {
            userId,
            taskId,
            type: rule.type,
            title: rule.title,
            description: rule.description,
            value: metricValue,
            threshold: rule.threshold,
            icon: rule.icon,
            color: rule.color,
            isActive: true,
            createdAt: new Date(),
            lastTriggered: new Date(),
          };

          const insightId = await createInsight(newInsight);
          generatedInsights.push({
            id: insightId,
            ...newInsight,
          });
        }
      }
    }

    return generatedInsights;
  } catch (error) {
    console.error("Error generating insights:", error);
    return [];
  }
};

// Get existing insight for a task and type
const getExistingInsight = async (
  userId: string,
  taskId: string,
  type: InsightType
): Promise<TaskInsight | null> => {
  try {
    const insightsRef = collection(db, "taskInsights");
    const q = query(
      insightsRef,
      where("userId", "==", userId),
      where("taskId", "==", taskId),
      where("type", "==", type),
      where("isActive", "==", true)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      taskId: data.taskId,
      type: data.type,
      title: data.title,
      description: data.description,
      value: data.value,
      threshold: data.threshold,
      icon: data.icon,
      color: data.color,
      isActive: data.isActive,
      createdAt: data.createdAt.toDate(),
      lastTriggered: data.lastTriggered.toDate(),
    } as TaskInsight;
  } catch (error) {
    console.error("Error getting existing insight:", error);
    return null;
  }
};

// Create a new insight
const createInsight = async (
  insight: Omit<TaskInsight, "id">
): Promise<string> => {
  try {
    const insightsRef = collection(db, "taskInsights");
    const insightData = {
      ...insight,
      createdAt: Timestamp.fromDate(insight.createdAt),
      lastTriggered: Timestamp.fromDate(insight.lastTriggered),
    };

    const docRef = await addDoc(insightsRef, insightData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating insight:", error);
    throw error;
  }
};

// Update an existing insight
const updateInsight = async (
  insightId: string,
  updates: Partial<Pick<TaskInsight, "value" | "lastTriggered" | "isActive">>
): Promise<void> => {
  try {
    const insightRef = doc(db, "taskInsights", insightId);
    const updateData: any = { ...updates };

    if (updates.lastTriggered) {
      updateData.lastTriggered = Timestamp.fromDate(updates.lastTriggered);
    }

    await updateDoc(insightRef, updateData);
  } catch (error) {
    console.error("Error updating insight:", error);
    throw error;
  }
};

// Get insights for a specific task
export const getTaskInsights = async (
  userId: string,
  taskId: string
): Promise<TaskInsight[]> => {
  if (!userId || !taskId) {
    throw new Error("User ID and Task ID are required to get task insights");
  }

  try {
    const insightsRef = collection(db, "taskInsights");
    const q = query(
      insightsRef,
      where("userId", "==", userId),
      where("taskId", "==", taskId),
      where("isActive", "==", true),
      orderBy("lastTriggered", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        taskId: data.taskId,
        type: data.type,
        title: data.title,
        description: data.description,
        value: data.value,
        threshold: data.threshold,
        icon: data.icon,
        color: data.color,
        isActive: data.isActive,
        createdAt: data.createdAt.toDate(),
        lastTriggered: data.lastTriggered.toDate(),
      } as TaskInsight;
    });
  } catch (error) {
    console.error("Error getting task insights:", error);
    return [];
  }
};

// Delete an insight
export const deleteInsight = async (insightId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "taskInsights", insightId));
  } catch (error) {
    console.error("Error deleting insight:", error);
    throw error;
  }
};

// Deactivate an insight (soft delete)
export const deactivateInsight = async (insightId: string): Promise<void> => {
  try {
    await updateInsight(insightId, { isActive: false });
  } catch (error) {
    console.error("Error deactivating insight:", error);
    throw error;
  }
};
