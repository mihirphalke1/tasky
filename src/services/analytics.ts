// Analytics service for tracking user interactions and app metrics

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// User properties
interface UserProperties {
  user_id?: string;
  user_type?: "free" | "premium";
  device_type?: "mobile" | "desktop" | "tablet";
  platform?: string;
  browser?: string;
  language?: string;
  timezone?: string;
  screen_resolution?: string;
  first_visit_date?: string;
  last_visit_date?: string;
  total_visits?: number;
  total_tasks_created?: number;
  total_tasks_completed?: number;
  total_focus_sessions?: number;
  average_session_duration?: number;
}

// Task properties
interface TaskProperties {
  task_id: string;
  task_type: "personal" | "work" | "study";
  priority: "low" | "medium" | "high";
  due_date?: string;
  is_completed: boolean;
  completion_time?: number; // in minutes
  time_to_complete?: number; // time from creation to completion
  tags?: string[];
  subtasks_count?: number;
  attachments_count?: number;
  comments_count?: number;
}

// Session properties
interface SessionProperties {
  session_id: string;
  start_time: string;
  end_time?: string;
  duration: number;
  tasks_completed: number;
  tasks_created: number;
  interruptions: number;
  focus_score?: number;
  browser_tab_switches?: number;
  device_orientation_changes?: number;
}

class Analytics {
  private static instance: Analytics;
  private userProperties: UserProperties = {};
  private currentSessionId: string;
  private sessionStartTime: number;
  private tabSwitchCount: number = 0;
  private orientationChangeCount: number = 0;

  private constructor() {
    this.initializeUserProperties();
    this.currentSessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.initializeSessionTracking();
  }

  public static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeSessionTracking() {
    // Track tab visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.tabSwitchCount++;
        this.trackTabSwitch();
      }
    });

    // Track device orientation changes
    window.addEventListener("orientationchange", () => {
      this.orientationChangeCount++;
      this.trackOrientationChange();
    });

    // Track session end
    window.addEventListener("beforeunload", () => {
      this.endSession();
    });
  }

  private initializeUserProperties() {
    // Set initial user properties
    this.userProperties = {
      device_type: this.getDeviceType(),
      platform: navigator.platform,
      browser: this.getBrowser(),
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      first_visit_date: new Date().toISOString(),
      last_visit_date: new Date().toISOString(),
      total_visits: 1,
    };

    // Load stored user properties
    const storedProps = localStorage.getItem("user_analytics");
    if (storedProps) {
      const parsed = JSON.parse(storedProps);
      this.userProperties = {
        ...this.userProperties,
        ...parsed,
        last_visit_date: new Date().toISOString(),
        total_visits: (parsed.total_visits || 0) + 1,
      };
    }

    // Save updated properties
    localStorage.setItem("user_analytics", JSON.stringify(this.userProperties));
  }

  private getDeviceType(): "mobile" | "desktop" | "tablet" {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "tablet";
    }
    if (
      /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
        ua
      )
    ) {
      return "mobile";
    }
    return "desktop";
  }

  private getBrowser(): string {
    const ua = navigator.userAgent;
    let browser = "unknown";
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";
    return browser;
  }

  // Enhanced user tracking
  public trackUserLogin(userId: string, userType: "free" | "premium") {
    this.userProperties.user_id = userId;
    this.userProperties.user_type = userType;
    this.sendEvent("user_login", {
      user_id: userId,
      user_type: userType,
      session_id: this.currentSessionId,
      login_method: "email", // or 'google', 'github', etc.
    });
  }

  public trackUserLogout() {
    this.sendEvent("user_logout", { user_id: this.userProperties.user_id });
  }

  // Enhanced task tracking
  public trackTaskCreated(properties: TaskProperties) {
    this.userProperties.total_tasks_created =
      (this.userProperties.total_tasks_created || 0) + 1;
    this.sendEvent("task_created", {
      ...properties,
      session_id: this.currentSessionId,
      user_total_tasks: this.userProperties.total_tasks_created,
    });
  }

  public trackTaskCompleted(properties: TaskProperties) {
    this.userProperties.total_tasks_completed =
      (this.userProperties.total_tasks_completed || 0) + 1;
    const timeToComplete = properties.completion_time
      ? (Date.now() - new Date(properties.due_date || "").getTime()) /
        (1000 * 60)
      : undefined;

    this.sendEvent("task_completed", {
      ...properties,
      time_to_complete: timeToComplete,
      session_id: this.currentSessionId,
      user_total_completed: this.userProperties.total_tasks_completed,
    });
  }

  public trackTaskDeleted(properties: TaskProperties) {
    this.sendEvent("task_deleted", properties);
  }

  public trackTaskEdited(properties: TaskProperties) {
    this.sendEvent("task_edited", properties);
  }

  // Enhanced focus mode tracking
  public trackFocusSessionStarted(duration: number) {
    this.userProperties.total_focus_sessions =
      (this.userProperties.total_focus_sessions || 0) + 1;
    const sessionProps: SessionProperties = {
      session_id: this.generateSessionId(),
      start_time: new Date().toISOString(),
      duration,
      tasks_completed: 0,
      tasks_created: 0,
      interruptions: 0,
      browser_tab_switches: 0,
      device_orientation_changes: 0,
    };

    this.sendEvent("focus_session_started", {
      ...sessionProps,
      user_total_sessions: this.userProperties.total_focus_sessions,
    });
  }

  public trackFocusSessionCompleted(duration: number, tasks_completed: number) {
    const sessionDuration = (Date.now() - this.sessionStartTime) / 1000 / 60;
    const focusScore = this.calculateFocusScore(
      sessionDuration,
      tasks_completed
    );

    this.sendEvent("focus_session_completed", {
      session_id: this.currentSessionId,
      duration: sessionDuration,
      tasks_completed,
      focus_score: focusScore,
      browser_tab_switches: this.tabSwitchCount,
      device_orientation_changes: this.orientationChangeCount,
    });
  }

  private calculateFocusScore(
    duration: number,
    tasksCompleted: number
  ): number {
    // Simple focus score calculation based on session duration and tasks completed
    const baseScore = (tasksCompleted / duration) * 100;
    const interruptionPenalty =
      (this.tabSwitchCount + this.orientationChangeCount) * 5;
    return Math.max(0, baseScore - interruptionPenalty);
  }

  // New tracking methods
  public trackTabSwitch() {
    this.sendEvent("tab_switch", {
      session_id: this.currentSessionId,
      switch_count: this.tabSwitchCount,
    });
  }

  public trackOrientationChange() {
    this.sendEvent("orientation_change", {
      session_id: this.currentSessionId,
      change_count: this.orientationChangeCount,
    });
  }

  public trackFeatureUsage(
    feature: string,
    properties: Record<string, any> = {}
  ) {
    this.sendEvent("feature_used", {
      feature,
      ...properties,
      session_id: this.currentSessionId,
    });
  }

  public trackError(error: Error, context: string) {
    this.sendEvent("error_occurred", {
      error_message: error.message,
      error_stack: error.stack,
      context,
      session_id: this.currentSessionId,
      ...this.userProperties,
    });
  }

  // App usage tracking
  public trackAppOpen() {
    this.sendEvent("app_open", this.userProperties);
  }

  public trackAppClose() {
    this.sendEvent("app_close", this.userProperties);
  }

  // Performance tracking
  public trackPageLoad(time: number) {
    this.sendEvent("page_load", { load_time: time });
  }

  public trackApiCall(endpoint: string, duration: number, status: number) {
    this.sendEvent("api_call", { endpoint, duration, status });
  }

  private endSession() {
    const sessionDuration = (Date.now() - this.sessionStartTime) / 1000 / 60;
    this.sendEvent("session_end", {
      session_id: this.currentSessionId,
      duration: sessionDuration,
      browser_tab_switches: this.tabSwitchCount,
      device_orientation_changes: this.orientationChangeCount,
    });
  }

  // Helper method to send events
  private sendEvent(eventName: string, eventParams: Record<string, any>) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, {
        ...eventParams,
        ...this.userProperties,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const analytics = Analytics.getInstance();
