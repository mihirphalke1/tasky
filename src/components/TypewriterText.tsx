import { useState, useEffect } from "react";

interface TypewriterTextProps {
  phrases: string[];
  className?: string;
}

const TypewriterText = ({ phrases, className = "" }: TypewriterTextProps) => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(100);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];

    if (!isDeleting && currentText === currentPhrase) {
      // Pause at the end of typing
      setTimeout(() => setIsDeleting(true), 2000);
      return;
    }

    if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const delta = isDeleting ? -1 : 1;
    const nextText = currentPhrase.substring(0, currentText.length + delta);

    const timeout = setTimeout(
      () => {
        setCurrentText(nextText);
      },
      isDeleting ? 50 : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentPhraseIndex, phrases, typingSpeed]);

  return (
    <span className={`inline-block ${className}`}>
      {currentText}
      <span className="animate-blink">|</span>
    </span>
  );
};

export default TypewriterText;
