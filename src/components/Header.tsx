import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { Search } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { isMac } from "@/hooks/useKeyboardShortcuts";

interface HeaderProps {
  onSearchClick: () => void;
}

const Header = ({ onSearchClick }: HeaderProps) => {
  const [greeting, setGreeting] = useState("");
  const [timeEmoji, setTimeEmoji] = useState("");
  const { user } = useAuth();
  const { theme } = useTheme();
  const isMacOS = isMac();

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      let newGreeting = "";
      let emoji = "";

      if (hour >= 5 && hour < 12) {
        newGreeting = "Good morning";
        emoji = "☀️";
      } else if (hour >= 12 && hour < 17) {
        newGreeting = "Good afternoon";
        emoji = "🌤️";
      } else if (hour >= 17 && hour < 21) {
        newGreeting = "Good evening";
        emoji = "🌅";
      } else {
        newGreeting = "Good night";
        emoji = "🌙";
      }

      setGreeting(newGreeting);
      setTimeEmoji(emoji);
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Get user's first name from display name
  const firstName = user?.displayName?.split(" ")[0] || "there";

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-white text-center">
          {greeting}, {firstName}
        </h1>
        <span className="text-xl sm:text-2xl">{timeEmoji}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Button
          variant="outline"
          onClick={onSearchClick}
          className="w-full h-12 sm:h-14 text-base sm:text-lg font-medium bg-card hover:bg-accent/50 border-2 border-[#CDA351]/20 hover:border-[#CDA351] text-[#7E7E7E] hover:text-[#CDA351] dark:text-gray-400 dark:hover:text-[#CDA351] transition-all duration-300 shadow-sm hover:shadow-md"
        >
          <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
          <span className="hidden xs:inline">Search tasks</span>
          <span className="xs:hidden">Search</span>
          <kbd className="ml-2 sm:ml-3 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs sm:text-sm bg-muted rounded border hidden sm:inline-block">
            {isMacOS ? "⌘K" : "Ctrl+K"}
          </kbd>
        </Button>
      </motion.div>
    </div>
  );
};

export default Header;
