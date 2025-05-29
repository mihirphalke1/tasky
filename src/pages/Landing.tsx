import { Button } from "@/components/ui/button";
import { Chrome } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import TypewriterText from "@/components/TypewriterText";

const Landing = () => {
  const { signInWithGoogle } = useAuth();
  const { theme, setTheme } = useTheme();

  const taglines = [
    "A focused space for your tasks.",
    "Your day, your pace.",
    "No distractions. Just flow.",
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#FAF8F6] to-[#EFE7DD] dark:from-gray-900 dark:to-gray-800">
      {/* Header - Minimal */}
      <header className="w-full p-8 flex justify-end">
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm border border-[#CDA351]/20 text-[#7E7E7E] hover:text-[#CDA351] transition-all duration-300"
          aria-label="Toggle theme"
        >
          <span className="sr-only">Toggle theme</span>
          {theme === "light" ? (
            <Moon className="h-[18px] w-[18px]" />
          ) : (
            <Sun className="h-[18px] w-[18px]" />
          )}
        </button>
      </header>

      {/* Main Content - Centered Vertically & Horizontally */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
          {/* Logo/Brand */}
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-bold tracking-wider text-[#1A1A1A] dark:text-white">
              <span className="tracking-widest">T</span>
              <span className="tracking-widest">A</span>
              <span className="tracking-widest">S</span>
              <span className="tracking-widest">K</span>
              <span className="tracking-widest">Y</span>
              <span className="text-[#CDA351] tracking-widest">.</span>
              <span className="text-[#CDA351] tracking-widest">A</span>
              <span className="text-[#CDA351] tracking-widest">P</span>
              <span className="text-[#CDA351] tracking-widest">P</span>
            </h1>

            {/* Gold divider */}
            <div className="w-20 h-0.5 bg-[#CDA351] mx-auto"></div>

            {/* Tagline with Typewriter */}
            <div className="h-8">
              <TypewriterText
                phrases={taglines}
                className="text-[#7E7E7E] dark:text-gray-400 text-lg font-medium"
              />
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-6">
            <Button
              onClick={signInWithGoogle}
              variant="outline"
              size="lg"
              className="w-full py-3 px-6 border-[#CDA351] text-[#CDA351] hover:bg-[#CDA351] hover:text-white transition-all duration-300 dark:border-[#CDA351] dark:text-[#CDA351] dark:hover:bg-[#CDA351] dark:hover:text-white hover:shadow-[0_0_15px_rgba(205,163,81,0.3)]"
            >
              <Chrome className="h-5 w-5 mr-2" />
              Continue with Google
            </Button>

            {/* Monospace tagline */}
            <p className="mt-4 text-sm text-[#7E7E7E] dark:text-gray-400 font-mono">
              productivity without clutter
            </p>
          </div>
        </div>
      </main>

      {/* Footer - Minimal */}
      <footer className="p-8 text-center text-[#7E7E7E] dark:text-gray-400 text-xs">
        <p>© 2025 Tasky — Built for minimal distractions.</p>
      </footer>
    </div>
  );
};

export default Landing;
