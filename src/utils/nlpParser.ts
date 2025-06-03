import * as chrono from "chrono-node";
import { TaskPriority } from "@/types";

export interface ParsedTask {
  title: string;
  dueDate?: Date | null;
  priority?: TaskPriority;
  tags: string[];
  originalText: string;
  confidence: number; // 0-1 scale indicating parsing confidence
}

// Priority keywords mapping
const PRIORITY_KEYWORDS = {
  high: [
    "urgent",
    "asap",
    "critical",
    "important",
    "high priority",
    "priority",
    "rush",
    "immediately",
    "right away",
    "must do",
    "need to",
    "deadline",
    "overdue",
    "emergency",
    "crucial",
    "vital",
    "pressing",
    "time sensitive",
  ],
  medium: ["normal", "medium", "regular", "standard", "default"],
  low: [
    "low",
    "minor",
    "when possible",
    "eventually",
    "sometime",
    "low priority",
    "if i have time",
    "when i can",
    "no rush",
    "not urgent",
    "casual",
    "relaxed",
    "whenever",
    "optional",
    "nice to have",
    "if possible",
    "background",
    "filler task",
    "spare time",
    "free time",
    "later",
    "not important",
    "can wait",
    "flexible",
    "easy",
    "simple",
  ],
};

// Contextual priority indicators
const CONTEXTUAL_PRIORITY = {
  high: [
    /\btoday\b/i,
    /\btonight\b/i,
    /\bnow\b/i,
    /\bthis morning\b/i,
    /\bthis afternoon\b/i,
    /\bby \d+pm\b/i,
    /\bby \d+am\b/i,
    /\bbefore.*meeting\b/i,
    /\bdue.*today\b/i,
  ],
  low: [
    /\bsometime.*week\b/i,
    /\bsometime.*month\b/i,
    /\beventually\b/i,
    /\bwhen.*free\b/i,
    /\bspare.*time\b/i,
    /\bno.*deadline\b/i,
    /\bmaybe\b/i,
    /\bmight\b/i,
    /\bcould\b/i,
    /\bif.*time\b/i,
  ],
};

// Time-based priority inference
const TIME_BASED_PRIORITY = {
  high: [
    "today",
    "tonight",
    "this morning",
    "this afternoon",
    "in an hour",
    "soon",
  ],
  medium: ["tomorrow", "this week", "next few days"],
  low: ["next week", "next month", "sometime", "eventually", "later"],
};

// Common tag patterns
const TAG_PATTERNS = [
  // Action-based tags
  { pattern: /\b(call|phone|ring)\b/i, tag: "call" },
  { pattern: /\b(email|mail|send)\b/i, tag: "email" },
  { pattern: /\b(meet|meeting|appointment)\b/i, tag: "meeting" },
  { pattern: /\b(buy|purchase|shop|shopping)\b/i, tag: "shopping" },
  { pattern: /\b(read|reading)\b/i, tag: "reading" },
  { pattern: /\b(write|writing)\b/i, tag: "writing" },
  { pattern: /\b(review|check)\b/i, tag: "review" },
  { pattern: /\b(submit|send|deliver)\b/i, tag: "submit" },
  { pattern: /\b(plan|planning|organize)\b/i, tag: "planning" },
  { pattern: /\b(workout|exercise|gym)\b/i, tag: "fitness" },
  { pattern: /\b(doctor|medical|appointment|health)\b/i, tag: "health" },

  // Context-based tags
  { pattern: /\b(work|office|job)\b/i, tag: "work" },
  { pattern: /\b(home|house|personal)\b/i, tag: "personal" },
  { pattern: /\b(family|kids|children)\b/i, tag: "family" },
  { pattern: /\b(finance|money|budget|bill|payment)\b/i, tag: "finance" },
  { pattern: /\b(travel|trip|vacation)\b/i, tag: "travel" },
  { pattern: /\b(school|study|learn|course)\b/i, tag: "education" },
];

// Time-related keywords that help identify scheduling
const TIME_INDICATORS = [
  "today",
  "tomorrow",
  "tonight",
  "morning",
  "afternoon",
  "evening",
  "night",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "weekend",
  "weekday",
  "next week",
  "next month",
  "this week",
  "this month",
  "am",
  "pm",
  "at",
  "by",
  "before",
  "after",
  "until",
  "deadline",
];

export function parseNaturalLanguageTask(input: string): ParsedTask {
  const trimmedInput = input.trim();
  let confidence = 0.5; // Base confidence

  // Parse date and time using chrono-node
  const parsedDates = chrono.parse(trimmedInput);
  let dueDate: Date | null = null;
  let dateText = "";

  if (parsedDates.length > 0) {
    const parsed = parsedDates[0];
    dueDate = parsed.start.date();
    dateText = parsed.text;
    confidence += 0.3; // Increase confidence if we found a date
  }

  // Extract priority
  const priority = extractPriority(trimmedInput);
  if (priority) {
    confidence += 0.1;
  }

  // Extract tags
  const tags = extractTags(trimmedInput);
  if (tags.length > 0) {
    confidence += 0.1;
  }

  // Extract title by removing date/time references and priority keywords
  const title = extractTitle(trimmedInput, dateText, priority, tags);

  // Ensure confidence doesn't exceed 1
  confidence = Math.min(confidence, 1);

  return {
    title: title || trimmedInput, // Fallback to original input if no title extracted
    dueDate,
    priority,
    tags,
    originalText: trimmedInput,
    confidence,
  };
}

function extractPriority(text: string): TaskPriority | undefined {
  const lowerText = text.toLowerCase();

  // First check for negated high priority phrases (these should be low priority)
  const negatedHighPriority = [
    "no rush",
    "not urgent",
    "not important",
    "not critical",
    "no hurry",
    "not asap",
    "no deadline",
    "not priority",
  ];

  if (negatedHighPriority.some((phrase) => lowerText.includes(phrase))) {
    return "low";
  }

  // Check for explicit priority keywords using word boundaries
  if (
    PRIORITY_KEYWORDS.high.some((keyword) => {
      const regex = new RegExp(
        `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      );
      return regex.test(lowerText);
    })
  ) {
    return "high";
  }

  if (
    PRIORITY_KEYWORDS.low.some((keyword) => {
      const regex = new RegExp(
        `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      );
      return regex.test(lowerText);
    })
  ) {
    return "low";
  }

  if (
    PRIORITY_KEYWORDS.medium.some((keyword) => {
      const regex = new RegExp(
        `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      );
      return regex.test(lowerText);
    })
  ) {
    return "medium";
  }

  // Check for contextual patterns
  if (CONTEXTUAL_PRIORITY.high.some((pattern) => pattern.test(text))) {
    return "high";
  }

  if (CONTEXTUAL_PRIORITY.low.some((pattern) => pattern.test(text))) {
    return "low";
  }

  // Check for exclamation marks as high priority indicators
  if (text.includes("!") || text.includes("!!")) {
    return "high";
  }

  // Check for question marks or uncertain language (often lower priority)
  if (text.includes("?") || /\b(maybe|might|could|perhaps)\b/i.test(text)) {
    return "low";
  }

  // Time-based priority inference
  for (const [priority, timeWords] of Object.entries(TIME_BASED_PRIORITY)) {
    if (timeWords.some((timeWord) => lowerText.includes(timeWord))) {
      return priority as TaskPriority;
    }
  }

  return undefined;
}

function extractTags(text: string): string[] {
  const tags: Set<string> = new Set();

  // Apply tag patterns
  TAG_PATTERNS.forEach(({ pattern, tag }) => {
    if (pattern.test(text)) {
      tags.add(tag);
    }
  });

  // Look for explicit hashtags
  const hashtagMatches = text.match(/#(\w+)/g);
  if (hashtagMatches) {
    hashtagMatches.forEach((hashtag) => {
      tags.add(hashtag.substring(1).toLowerCase());
    });
  }

  // Look for @ mentions as context tags
  const mentionMatches = text.match(/@(\w+)/g);
  if (mentionMatches) {
    mentionMatches.forEach((mention) => {
      tags.add(mention.substring(1).toLowerCase());
    });
  }

  return Array.from(tags);
}

function extractTitle(
  text: string,
  dateText: string,
  priority?: TaskPriority,
  tags: string[] = []
): string {
  let title = text;

  // Remove date/time text
  if (dateText) {
    title = title.replace(dateText, "").trim();
  }

  // Remove priority keywords
  if (priority) {
    const priorityKeywords = PRIORITY_KEYWORDS[priority];
    priorityKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      title = title.replace(regex, "").trim();
    });
  }

  // Remove hashtags and mentions (but keep the underlying words)
  title = title.replace(/#(\w+)/g, "$1");
  title = title.replace(/@(\w+)/g, "$1");

  // Remove exclamation marks used for priority
  title = title.replace(/!+/g, "").trim();

  // Remove common scheduling prepositions when they're at the end
  title = title.replace(/\b(by|at|before|after|until|on)\s*$/i, "").trim();

  // Clean up extra whitespace
  title = title.replace(/\s+/g, " ").trim();

  // Capitalize first letter
  if (title) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return title;
}

// Utility function to get suggestions based on partial input
export function getSuggestions(input: string): string[] {
  // Don't suggest if input is too short
  if (input.length < 3) {
    return [];
  }

  // Parse the current input to understand what's missing
  const parsed = parseNaturalLanguageTask(input);

  // If already has both time and priority, no suggestions needed
  const hasTimeReference = TIME_INDICATORS.some((indicator) =>
    input.toLowerCase().includes(indicator.toLowerCase())
  );
  const hasPriorityReference = parsed.priority !== undefined;

  if (hasTimeReference && hasPriorityReference) {
    return [];
  }

  // Get task type for context-aware suggestions
  const taskType = getTaskType(input);

  // Generate exactly 3 suggestions: urgent, medium, low priority
  const suggestions = generateThreePrioritySuggestions(
    input,
    taskType,
    hasTimeReference,
    hasPriorityReference
  );

  return suggestions;
}

// Generate exactly 3 suggestions covering urgent, medium, and low priority
function generateThreePrioritySuggestions(
  input: string,
  taskType: string | null,
  hasTime: boolean,
  hasPriority: boolean
): string[] {
  const now = new Date();
  const currentHour = now.getHours();

  // Determine smart time suggestions based on current time
  const timeContext = getSmartTimeContext(currentHour);

  const suggestions: string[] = [];

  // HIGH PRIORITY suggestion
  if (!hasPriority) {
    suggestions.push(`${input} urgent`);
  } else if (!hasTime) {
    suggestions.push(`${input} ${timeContext.urgent}`);
  } else {
    suggestions.push(`${input} important`);
  }

  // MEDIUM PRIORITY suggestion
  if (!hasTime) {
    const mediumTime = getContextualMediumTime(taskType, timeContext);
    suggestions.push(`${input} ${mediumTime}`);
  } else if (!hasPriority) {
    suggestions.push(`${input} normal priority`);
  } else {
    suggestions.push(`${input} regular`);
  }

  // LOW PRIORITY suggestion
  if (!hasPriority) {
    suggestions.push(`${input} when I have time`);
  } else if (!hasTime) {
    suggestions.push(`${input} ${timeContext.flexible}`);
  } else {
    suggestions.push(`${input} no rush`);
  }

  return suggestions;
}

// Get smart time context based on current hour
function getSmartTimeContext(currentHour: number): {
  urgent: string;
  medium: string;
  flexible: string;
} {
  if (currentHour >= 5 && currentHour < 12) {
    // Morning (5 AM - 12 PM)
    return {
      urgent: "today",
      medium: "this afternoon",
      flexible: "this weekend",
    };
  } else if (currentHour >= 12 && currentHour < 17) {
    // Afternoon (12 PM - 5 PM)
    return {
      urgent: "today",
      medium: "this evening",
      flexible: "tomorrow",
    };
  } else if (currentHour >= 17 && currentHour < 22) {
    // Evening (5 PM - 10 PM)
    return {
      urgent: "tonight",
      medium: "tomorrow morning",
      flexible: "this weekend",
    };
  } else {
    // Late night/Early morning (10 PM - 5 AM)
    return {
      urgent: "first thing tomorrow",
      medium: "tomorrow afternoon",
      flexible: "next week",
    };
  }
}

// Get contextual medium-priority time based on task type and time context
function getContextualMediumTime(
  taskType: string | null,
  timeContext: any
): string {
  if (!taskType) {
    return timeContext.medium;
  }

  switch (taskType) {
    case "call":
    case "email":
      return timeContext.medium; // Use time-appropriate suggestion
    case "meeting":
      return "next week"; // Meetings need more lead time
    case "shopping":
      return "this weekend"; // Shopping often happens on weekends
    case "fitness":
      return timeContext.medium; // Fitness can be flexible
    case "household":
      return "this weekend"; // Household tasks often done on weekends
    case "work":
      return timeContext.medium; // Work tasks follow business hours
    case "health":
      return "this week"; // Health appointments need reasonable scheduling
    case "finance":
      return "by end of week"; // Financial tasks often have weekly cycles
    case "learning":
      return timeContext.flexible; // Learning is usually flexible
    default:
      return timeContext.medium;
  }
}

// Helper function to identify task type
function getTaskType(input: string): string | null {
  const patterns = [
    { type: "call", pattern: /\b(call|phone|ring|dial)\b/i },
    { type: "email", pattern: /\b(email|mail|send|message)\b/i },
    { type: "meeting", pattern: /\b(meeting|meet|appointment|conference)\b/i },
    { type: "shopping", pattern: /\b(buy|purchase|shop|store|market)\b/i },
    {
      type: "household",
      pattern: /\b(clean|organize|tidy|wash|vacuum|dishes)\b/i,
    },
    { type: "fitness", pattern: /\b(workout|exercise|gym|run|jog|walk)\b/i },
    {
      type: "learning",
      pattern: /\b(read|study|learn|research|course|book)\b/i,
    },
    {
      type: "work",
      pattern: /\b(report|presentation|project|deadline|client|work)\b/i,
    },
    {
      type: "health",
      pattern: /\b(doctor|dentist|appointment|medicine|health)\b/i,
    },
    { type: "finance", pattern: /\b(pay|bill|budget|bank|money|invoice)\b/i },
  ];

  for (const { type, pattern } of patterns) {
    if (pattern.test(input)) {
      return type;
    }
  }

  return null;
}

// Get contextual time suggestions based on task type (legacy function for compatibility)
function getContextualTimeSuggestions(
  input: string,
  taskType: string
): string[] {
  const timeContext = getSmartTimeContext(new Date().getHours());
  return [
    `${input} ${timeContext.urgent}`,
    `${input} ${timeContext.medium}`,
    `${input} ${timeContext.flexible}`,
  ];
}

// Get context-specific suggestions based on task type (legacy function for compatibility)
function getTaskTypeSuggestions(input: string, taskType: string): string[] {
  return getContextualTimeSuggestions(input, taskType);
}

// Function to validate and improve parsed results
export function validateParsedTask(parsed: ParsedTask): ParsedTask {
  let improvedConfidence = parsed.confidence;

  // Increase confidence if title is reasonable length
  if (parsed.title.length >= 3 && parsed.title.length <= 100) {
    improvedConfidence += 0.1;
  }

  // Decrease confidence if title is too short or too long
  if (parsed.title.length < 3 || parsed.title.length > 100) {
    improvedConfidence -= 0.2;
  }

  // Increase confidence if we have multiple parsed elements
  const elementsFound = [
    parsed.dueDate ? 1 : 0,
    parsed.priority ? 1 : 0,
    parsed.tags.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  if (elementsFound >= 2) {
    improvedConfidence += 0.1;
  }

  return {
    ...parsed,
    confidence: Math.min(Math.max(improvedConfidence, 0), 1),
  };
}
