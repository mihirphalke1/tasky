import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  List,
  Target,
  Calendar,
  Zap,
  Check,
  ArrowRight,
} from "lucide-react";

interface DashboardOnboardingProps {
  isOpen: boolean;
  onPreferenceSelect: (preference: "adaptive" | "traditional") => void;
  onClose: () => void;
}

export const DashboardOnboarding: React.FC<DashboardOnboardingProps> = ({
  isOpen,
  onPreferenceSelect,
  onClose,
}) => {
  const [selectedMode, setSelectedMode] = useState<
    "adaptive" | "traditional" | null
  >(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleModeSelect = (mode: "adaptive" | "traditional") => {
    setSelectedMode(mode);
    setShowPreview(true);
  };

  const handleConfirm = () => {
    if (selectedMode) {
      onPreferenceSelect(selectedMode);
      onClose();
    }
  };

  const adaptiveFeatures = [
    "Timeline view with morning, afternoon, evening tasks",
    "Gamification with streaks and achievements",
    "Smart task input with natural language",
    "Focus mode integration",
    "Visual progress tracking",
    "Motivational quotes and daily intentions",
  ];

  const traditionalFeatures = [
    "Classic task list organization",
    "Simple section-based layout (Today, Tomorrow, etc.)",
    "Quick add functionality",
    "Clean, minimal interface",
    "Familiar task management",
    "Distraction-free environment",
  ];

  const AdaptivePreview = () => (
    <div className="w-full h-40 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 rounded-lg p-4 relative overflow-hidden">
      {/* Header with progress circle */}
      <div className="flex items-center justify-center mb-2">
        <div className="w-8 h-8 rounded-full border-2 border-[#CDA351] border-t-transparent animate-spin opacity-60" />
        <span className="ml-2 text-xs text-[#CDA351] font-semibold">
          Today's Focus 75%
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <span>🌅</span>
          <div className="w-16 h-2 bg-[#CDA351]/30 rounded"></div>
          <span className="text-gray-600">Morning tasks</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span>☀️</span>
          <div className="w-20 h-2 bg-[#CDA351]/50 rounded"></div>
          <span className="text-gray-600">Afternoon focus</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span>🌙</span>
          <div className="w-12 h-2 bg-gray-200 rounded"></div>
          <span className="text-gray-400">Evening wrap-up</span>
        </div>
      </div>

      {/* Floating elements */}
      <div className="absolute top-2 right-2">
        <div className="w-4 h-4 bg-[#CDA351] rounded-full opacity-60"></div>
      </div>
      <div className="absolute bottom-2 left-6">
        <div className="text-xs text-[#CDA351] font-bold">🔥 5 day streak!</div>
      </div>
    </div>
  );

  const TraditionalPreview = () => (
    <div className="w-full h-40 bg-[#FAF8F6] dark:bg-gray-800 rounded-lg p-4 relative overflow-hidden">
      {/* Header */}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Today
        </h4>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 border border-[#CDA351] rounded"></div>
          <span className="text-gray-700 dark:text-gray-300">
            Complete project proposal
          </span>
          <Badge variant="outline" className="text-xs">
            High
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 border border-[#CDA351] rounded"></div>
          <span className="text-gray-700 dark:text-gray-300">
            Review team feedback
          </span>
          <Badge variant="outline" className="text-xs">
            Medium
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 bg-[#CDA351] rounded flex items-center justify-center">
            <Check className="w-2 h-2 text-white" />
          </div>
          <span className="text-gray-400 line-through">Morning standup</span>
        </div>
      </div>

      {/* Add task input */}
      <div className="absolute bottom-2 left-4 right-4">
        <div className="w-full h-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs flex items-center px-2 text-gray-400">
          Add a task...
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#CDA351] to-[#E6C17A] bg-clip-text text-transparent">
            Welcome to Tasky! 🎉
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose your preferred dashboard style. You can always change this
            later in settings.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!showPreview ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6"
            >
              {/* Adaptive Dashboard Option */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModeSelect("adaptive")}
                className="cursor-pointer"
              >
                <Card className="border-2 border-transparent hover:border-[#CDA351]/30 transition-all duration-200 h-full">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#CDA351] to-[#E6C17A] rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl text-[#CDA351]">
                      Adaptive Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AdaptivePreview />
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Modern, visual interface with gamification and smart
                        features.
                      </p>
                      <div className="space-y-1">
                        {adaptiveFeatures.slice(0, 3).map((feature, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                          >
                            <Check className="w-3 h-3 text-[#CDA351]" />
                            {feature}
                          </div>
                        ))}
                      </div>
                      <Badge className="bg-[#CDA351]/10 text-[#CDA351] border-[#CDA351]/20">
                        Recommended for new users
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Traditional Dashboard Option */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModeSelect("traditional")}
                className="cursor-pointer"
              >
                <Card className="border-2 border-transparent hover:border-[#CDA351]/30 transition-all duration-200 h-full">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
                      <List className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl text-gray-700 dark:text-gray-300">
                      Traditional Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TraditionalPreview />
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Clean, minimal interface focusing on essential task
                        management.
                      </p>
                      <div className="space-y-1">
                        {traditionalFeatures
                          .slice(0, 3)
                          .map((feature, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                            >
                              <Check className="w-3 h-3 text-gray-500" />
                              {feature}
                            </div>
                          ))}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-gray-600 border-gray-300"
                      >
                        Perfect for focused work
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">
                  You selected:{" "}
                  {selectedMode === "adaptive"
                    ? "Adaptive Dashboard"
                    : "Traditional Dashboard"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Here's what you can expect:
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  {selectedMode === "adaptive" ? (
                    <AdaptivePreview />
                  ) : (
                    <TraditionalPreview />
                  )}
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Key Features:</h4>
                  <div className="space-y-2">
                    {(selectedMode === "adaptive"
                      ? adaptiveFeatures
                      : traditionalFeatures
                    ).map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Check className="w-4 h-4 text-[#CDA351] flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  className="px-6"
                >
                  Back to Choose
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="bg-[#CDA351] hover:bg-[#CDA351]/90 text-white px-8"
                >
                  Continue with{" "}
                  {selectedMode === "adaptive" ? "Adaptive" : "Traditional"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardOnboarding;
