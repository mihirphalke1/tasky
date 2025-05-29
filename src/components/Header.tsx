import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

const Header = () => {
  const [greeting, setGreeting] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      let newGreeting = "";

      if (hour >= 5 && hour < 12) {
        newGreeting = "Good morning";
      } else if (hour >= 12 && hour < 17) {
        newGreeting = "Good afternoon";
      } else if (hour >= 17 && hour < 21) {
        newGreeting = "Good evening";
      } else {
        newGreeting = "Good night";
      }

      setGreeting(newGreeting);
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Get user's first name from display name
  const firstName = user?.displayName?.split(" ")[0] || "there";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-2"
    >
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        {greeting}, {firstName}{" "}
        <span className="inline-block animate-wave">!</span>
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Let's organize your day
      </p>
    </motion.div>
  );
};

export default Header;
