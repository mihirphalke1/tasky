import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  Chrome,
  Download,
  Plus,
  MessageSquare,
  Search,
  Keyboard,
  Timer,
  Zap,
  Moon,
  Sun,
  Target,
  Clock,
  Coffee,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Calendar,
  ListChecks,
  Brain,
  Sparkles,
  BarChart3,
  Settings,
  ArrowLeft,
} from "lucide-react";

// Animated SVG Components
const AnimatedTimer = () => (
  <motion.svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-primary"
    initial={{ rotate: 0 }}
    animate={{ rotate: 360 }}
    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
  >
    <circle cx="12" cy="12" r="10" />
    <motion.path
      d="M12 6v6l4 2"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  </motion.svg>
);

const AnimatedChecklist = () => (
  <motion.div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <motion.div
        key={i}
        className="flex items-center gap-2"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: i * 0.2 }}
      >
        <motion.div
          className="h-2 w-2 rounded-full bg-primary"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
        <motion.div
          className="h-4 bg-primary/20 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.5, delay: i * 0.2 }}
        />
      </motion.div>
    ))}
  </motion.div>
);

const AnimatedStreak = () => (
  <motion.div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((day) => (
      <motion.div
        key={day}
        className="h-2 w-2 rounded-full bg-primary"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: day * 0.1,
        }}
      />
    ))}
  </motion.div>
);

const AnimatedPomodoro = () => (
  <motion.div className="relative w-32 h-32">
    <motion.div
      className="absolute inset-0 rounded-full border-4 border-primary"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    />
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <motion.div
        className="text-2xl font-bold text-primary"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        25:00
      </motion.div>
    </motion.div>
    <motion.div
      className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.7 }}
    >
      <Coffee className="h-6 w-6 text-primary" />
    </motion.div>
  </motion.div>
);

const steps = [
  {
    title: "Smart Task Management",
    description:
      "Add tasks naturally using our AI-powered input. Just type like you're talking to a friend.",
    icon: <Brain className="h-12 w-12 text-primary" />,
    features: [
      "Natural language input (e.g., 'Call mom tomorrow high priority')",
      "Automatic date and priority detection",
      "Quick task creation with keyboard shortcuts",
      "Smart categorization and organization",
    ],
    image: (
      <motion.div
        className="relative w-full h-64 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-4">
          <motion.div
            className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm font-medium">
              "Schedule team meeting for next Monday"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-detected: Monday, Medium Priority
            </p>
          </motion.div>
          <motion.div
            className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-sm font-medium">
              "Buy groceries tomorrow high priority"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-detected: Tomorrow, High Priority
            </p>
          </motion.div>
        </div>
      </motion.div>
    ),
  },
  {
    title: "Focus Mode & Pomodoro",
    description:
      "Stay productive with distraction-free focus sessions and the Pomodoro technique.",
    icon: <Timer className="h-12 w-12 text-primary" />,
    features: [
      "Distraction-free environment",
      "Pomodoro timer (25/5/15 intervals)",
      "Set intentions for each session",
      "Track your daily streaks",
      "Customizable timer settings",
    ],
    image: (
      <motion.div
        className="relative w-full h-64 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 flex items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AnimatedPomodoro />
      </motion.div>
    ),
  },
  {
    title: "Smart Notes & Organization",
    description:
      "Capture ideas and organize them with our powerful note-taking system.",
    icon: <MessageSquare className="h-12 w-12 text-primary" />,
    features: [
      "Quick note capture from anywhere",
      "Link notes to specific tasks",
      "Rich text formatting support",
      "Smart search across notes",
      "Organize with tags and categories",
    ],
    image: (
      <motion.div
        className="relative w-full h-64 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-3">
          <motion.div
            className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm font-medium">Project Ideas</p>
            <p className="text-xs text-muted-foreground">
              Linked to: Website Redesign
            </p>
          </motion.div>
          <motion.div
            className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-sm font-medium">Meeting Notes</p>
            <p className="text-xs text-muted-foreground">General Note</p>
          </motion.div>
        </div>
      </motion.div>
    ),
  },
  {
    title: "Progress Tracking & Analytics",
    description:
      "Stay motivated with visual progress tracking and detailed analytics.",
    icon: <BarChart3 className="h-12 w-12 text-primary" />,
    features: [
      "Daily streak tracking",
      "Visual progress charts",
      "Productivity insights",
      "Achievement badges",
      "Weekly and monthly reports",
    ],
    image: (
      <motion.div
        className="relative w-full h-64 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-4">
          <AnimatedStreak />
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-sm font-medium">5 Day Streak!</p>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </motion.div>
        </div>
      </motion.div>
    ),
  },
  {
    title: "Customization & Shortcuts",
    description:
      "Make Tasky your own with powerful customization options and keyboard shortcuts.",
    icon: <Settings className="h-12 w-12 text-primary" />,
    features: [
      "Light and dark mode",
      "Custom background images",
      "Keyboard shortcuts for power users",
      "Customizable task views",
      "Personalized organization",
    ],
    image: (
      <motion.div
        className="relative w-full h-64 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xs font-mono">⌘K</p>
            <p className="text-xs text-muted-foreground">New Task</p>
          </motion.div>
          <motion.div
            className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-xs font-mono">⌘F</p>
            <p className="text-xs text-muted-foreground">Focus Mode</p>
          </motion.div>
        </div>
      </motion.div>
    ),
  },
];

export function HowItWorks() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#FAF8F6] dark:bg-gray-900">
      {/* Mobile Back Button */}
      <div className="md:hidden p-4 pt-6 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#CDA351] font-medium"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>
      </div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#CDA351]/5 to-transparent" />
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1A1A1A] dark:text-white mb-4"
          >
            How Tasky Works
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg sm:text-xl text-[#7E7E7E] dark:text-gray-400 max-w-3xl mx-auto"
          >
            Discover how Tasky helps you stay organized and productive with its
            powerful features
          </motion.p>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-16 sm:space-y-24">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
            >
              {/* Content Section */}
              <div
                className={`space-y-6 ${index % 2 === 1 ? "lg:order-2" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#CDA351]/10">
                    {step.icon}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] dark:text-white">
                    {step.title}
                  </h2>
                </div>
                <p className="text-lg text-[#7E7E7E] dark:text-gray-400">
                  {step.description}
                </p>
                <ul className="space-y-3">
                  {step.features.map((feature, featureIndex) => (
                    <motion.li
                      key={featureIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: featureIndex * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 hover:bg-[#CDA351]/5 dark:hover:bg-[#CDA351]/10 transition-colors"
                    >
                      <CheckCircle2 className="h-5 w-5 text-[#CDA351] mt-1 flex-shrink-0" />
                      <span className="text-[#1A1A1A] dark:text-white">
                        {feature}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Image/Animation Section */}
              <div
                className={`relative ${index % 2 === 1 ? "lg:order-1" : ""}`}
              >
                {step.image}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
