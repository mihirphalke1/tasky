import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun, User, Timer, Keyboard } from "lucide-react";
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
    <nav className="sticky top-0 z-50 w-full py-4 px-6 mb-4 flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-[#CDA351]/10 dark:bg-gray-900/95 dark:border-[#CDA351]/5 shadow-sm">
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-white">
          <span>T</span>
          <span>A</span>
          <span>S</span>
          <span>K</span>
          <span>Y</span>
          <span className="text-[#CDA351]">.</span>
          <span className="text-[#CDA351]">A</span>
          <span className="text-[#CDA351]">P</span>
          <span className="text-[#CDA351]">P</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/focus")}
          className="text-[#CDA351] hover:text-[#CDA351] hover:bg-[#CDA351]/10"
        >
          <Timer className="mr-2 h-4 w-4" />
          Focus Mode
        </Button>

        {showShortcuts && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/shortcuts")}
            className="text-[#7E7E7E] hover:text-[#CDA351] hover:bg-[#CDA351]/10 dark:text-gray-400 dark:hover:text-[#CDA351]"
          >
            <Keyboard className="mr-2 h-4 w-4" />
            Shortcuts
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="rounded-full h-8 w-8 transition-transform hover:scale-110"
        >
          {theme === "light" ? (
            <Moon size={18} className="text-gray-600 dark:text-gray-400" />
          ) : (
            <Sun size={18} className="text-gray-600 dark:text-gray-400" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 transition-transform hover:scale-110 cursor-pointer ring-2 ring-[#CDA351]/20">
              {user?.photoURL ? (
                <AvatarImage src={user.photoURL} alt={user.displayName || ""} />
              ) : (
                <AvatarFallback className="bg-[#CDA351]/10 text-[#CDA351]">
                  {user?.displayName?.[0] || <User size={16} />}
                </AvatarFallback>
              )}
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium text-sm">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-[#CDA351] focus:text-[#CDA351] focus:bg-[#CDA351]/10"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default NavBar;
