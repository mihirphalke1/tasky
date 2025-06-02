import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Sun, Heart, Star } from "lucide-react";

const positiveQuotes = [
  {
    text: "Today is a blank canvas. Paint something beautiful.",
    author: "Unknown",
    icon: Sun,
  },
  {
    text: "Sometimes the most productive thing you can do is relax.",
    author: "Mark Black",
    icon: Heart,
  },
  {
    text: "Every moment is a fresh beginning.",
    author: "T.S. Eliot",
    icon: Sparkles,
  },
  {
    text: "You have permission to rest. You are not responsible for fixing everything.",
    author: "Unknown",
    icon: Star,
  },
  {
    text: "Peace begins with a smile.",
    author: "Mother Teresa",
    icon: Heart,
  },
  {
    text: "Today you are you! That is truer than true!",
    author: "Dr. Seuss",
    icon: Star,
  },
  {
    text: "Take time to enjoy the simple things in life.",
    author: "Unknown",
    icon: Sun,
  },
  {
    text: "Breathe in peace, breathe out stress.",
    author: "Unknown",
    icon: Sparkles,
  },
  {
    text: "You are exactly where you need to be.",
    author: "Unknown",
    icon: Heart,
  },
  {
    text: "Sometimes the best thing to do is nothing at all.",
    author: "Unknown",
    icon: Star,
  },
  {
    text: "Today is a gift. That's why it's called the present.",
    author: "Eleanor Roosevelt",
    icon: Sun,
  },
  {
    text: "Rest when you're weary. Refresh and renew yourself.",
    author: "Dalai Lama",
    icon: Sparkles,
  },
];

const PositiveQuotes = () => {
  const [currentQuote, setCurrentQuote] = useState(positiveQuotes[0]);

  useEffect(() => {
    // Select a random quote on component mount
    const randomIndex = Math.floor(Math.random() * positiveQuotes.length);
    setCurrentQuote(positiveQuotes[randomIndex]);
  }, []);

  const IconComponent = currentQuote.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-br from-[#CDA351]/5 to-[#E6C17A]/10 dark:from-[#CDA351]/10 dark:to-[#E6C17A]/20 rounded-2xl p-8 text-center border border-[#CDA351]/20"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#CDA351]/20 flex items-center justify-center"
      >
        <IconComponent className="w-8 h-8 text-[#CDA351]" />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-bold text-[#1A1A1A] dark:text-white mb-4"
      >
        No Tasks Today! 🌟
      </motion.h3>

      <motion.blockquote
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-lg italic text-[#7E7E7E] dark:text-gray-300 mb-4 leading-relaxed"
      >
        "{currentQuote.text}"
      </motion.blockquote>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-sm font-medium text-[#CDA351] mb-6"
      >
        — {currentQuote.author}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="text-sm text-[#7E7E7E] dark:text-gray-400"
      >
        Enjoy your free time! You can always add tasks when you're ready.
      </motion.div>
    </motion.div>
  );
};

export default PositiveQuotes;
