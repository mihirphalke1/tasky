import { Button } from "@/components/ui/button";
import {
  LogOut,
  Moon,
  Sun,
  User,
  Timer,
  Keyboard,
  StickyNote,
  Home,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { isDesktop } from "@/hooks/useKeyboardShortcuts";

const NavBar = () => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    setShowShortcuts(isDesktop());
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full py-3 px-6 mb-4 flex items-center justify-between border-b border-[#CDA351]/20 shadow-lg backdrop-blur-md bg-[#FAF8F6] dark:bg-gray-900 dark:border-[#CDA351]/10">
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-white tracking-tight">
          <span className="transition-colors duration-200 hover:text-[#CDA351]">
            T
          </span>
          <span className="transition-colors duration-200 hover:text-[#CDA351]">
            A
          </span>
          <span className="transition-colors duration-200 hover:text-[#CDA351]">
            S
          </span>
          <span className="transition-colors duration-200 hover:text-[#CDA351]">
            K
          </span>
          <span className="transition-colors duration-200 hover:text-[#CDA351]">
            Y
          </span>
          <span className="text-[#CDA351] animate-pulse">.</span>
          <span className="text-[#CDA351] font-black">A</span>
          <span className="text-[#CDA351] font-black">P</span>
          <span className="text-[#CDA351] font-black">P</span>
        </h1>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 mr-4 p-1 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-[#CDA351]/10 dark:border-[#CDA351]/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 dark:hover:bg-[#CDA351]/10 transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <Home className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline font-medium">Dashboard</span>
            <span className="sm:hidden font-medium">Home</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/notes")}
            className="text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 dark:hover:bg-[#CDA351]/10 transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <StickyNote className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline font-medium">Notes</span>
          </Button>

          {showShortcuts && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/shortcuts")}
              className="text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 dark:hover:bg-[#CDA351]/10 transition-all duration-200 transform hover:scale-105 active:scale-95 hidden md:flex"
            >
              <Keyboard className="mr-1.5 h-4 w-4" />
              <span className="font-medium">Shortcuts</span>
            </Button>
          )}
        </div>

        <Button
          size="sm"
          onClick={() => navigate("/focus")}
          className="bg-gradient-to-r from-[#CDA351] to-[#B8935A] hover:from-[#B8935A] hover:to-[#CDA351] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 border-2 border-[#CDA351]/20 hover:border-[#CDA351]/40 mx-2"
        >
          <Timer className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Focus Mode</span>
          <span className="sm:hidden">Focus</span>
          <div className="absolute inset-0 bg-white/20 rounded opacity-0 hover:opacity-100 transition-opacity duration-300" />
        </Button>

        <div className="flex items-center gap-2 ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="rounded-full h-9 w-9 transition-all duration-300 hover:scale-110 hover:bg-[#CDA351]/10 dark:hover:bg-[#CDA351]/10 active:scale-95 border border-transparent hover:border-[#CDA351]/20"
          >
            {theme === "light" ? (
              <Moon
                size={18}
                className="text-gray-600 dark:text-gray-400 transition-transform duration-300 hover:rotate-12"
              />
            ) : (
              <Sun
                size={18}
                className="text-gray-600 dark:text-gray-400 transition-transform duration-300 hover:rotate-12"
              />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 transition-all duration-300 hover:scale-110 cursor-pointer ring-2 ring-[#CDA351]/30 hover:ring-[#CDA351]/50 shadow-md hover:shadow-lg">
                {user?.photoURL ? (
                  <AvatarImage
                    src={user.photoURL}
                    alt={user.displayName || ""}
                  />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-[#CDA351]/20 to-[#CDA351]/10 text-[#CDA351] font-semibold border border-[#CDA351]/20">
                    {user?.displayName?.[0] || <User size={16} />}
                  </AvatarFallback>
                )}
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 shadow-xl border border-[#CDA351]/10"
            >
              <div className="flex items-center justify-start gap-2 p-3 bg-gradient-to-r from-[#CDA351]/5 to-transparent">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-semibold text-sm text-[#1A1A1A] dark:text-white">
                    {user?.displayName}
                  </p>
                  <p className="text-xs text-[#7E7E7E] dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-[#CDA351]/10" />
              <DropdownMenuItem
                className="cursor-pointer text-[#CDA351] hover:text-[#CDA351] hover:bg-[#CDA351]/10 focus:bg-[#CDA351]/10 transition-all duration-200 font-medium"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
