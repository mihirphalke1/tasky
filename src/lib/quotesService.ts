const motivationalQuotes = [
  {
    quote:
      "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
    author: "Stephen Covey",
  },
  {
    quote: "Focus on being productive instead of busy.",
    author: "Tim Ferriss",
  },
  {
    quote: "Where focus goes, energy flows.",
    author: "Tony Robbins",
  },
  {
    quote: "The main thing is to keep the main thing the main thing.",
    author: "Stephen Covey",
  },
  {
    quote: "Focus on the journey, not the destination.",
    author: "Greg Anderson",
  },
  {
    quote: "The successful warrior is the average man, with laser-like focus.",
    author: "Bruce Lee",
  },
  {
    quote:
      "Stay focused, go after your dreams and keep moving toward your goals.",
    author: "LL Cool J",
  },
  {
    quote: "Focus on the present moment, not the monsters of the future.",
    author: "Atticus",
  },
  {
    quote:
      "The difference between successful people and very successful people is that very successful people say 'no' to almost everything.",
    author: "Warren Buffett",
  },
  {
    quote: "Focus on the good. Focus on the positive. Focus on the now.",
    author: "Unknown",
  },
];

export const getRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
  return motivationalQuotes[randomIndex];
};
