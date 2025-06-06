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
  Shield,
  Clock,
  RefreshCw,
  Menu,
  HelpCircle,
  Download,
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
import { useEffect, useState, useRef } from "react";
import {
  isDesktop,
  useKeyboardShortcuts,
  type KeyboardShortcut,
} from "@/hooks/useKeyboardShortcuts";
import StreakButton, { StreakButtonRef } from "./StreakButton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import PWAInstall from "./PWAInstall";
import ContactModal from "./ContactModal";

const NavBar = () => {
  const { user, logout, sessionDaysRemaining, extendUserSession } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(isDesktop());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const streakButtonRef = useRef<StreakButtonRef>(null);
  const [contactOpen, setContactOpen] = useState(false);

  // Check if session is near expiry (1 day or less)
  const isSessionNearExpiry = sessionDaysRemaining <= 1;

  useEffect(() => {
    const desktopState = isDesktop();
    if (showShortcuts !== desktopState) {
      setShowShortcuts(desktopState);
    }
  }, [showShortcuts]);

  // Global keyboard shortcuts available from navbar
  const globalShortcuts: KeyboardShortcut[] = [
    {
      id: "show-shortcuts",
      description: "Show Keyboard Shortcuts",
      category: "navigation",
      keys: {
        mac: ["meta", "/"],
        windows: ["ctrl", "/"],
      },
      action: () => {
        navigate("/shortcuts");
      },
      priority: 90,
      allowInModal: true,
    },
    {
      id: "streak-calendar",
      description: "Open Productivity Streak Calendar",
      category: "general",
      keys: {
        mac: ["s"],
        windows: ["s"],
      },
      action: () => {
        if (streakButtonRef.current) {
          streakButtonRef.current.openCalendar();
        } else {
          console.warn("StreakButton ref not available");
          // Fallback: could navigate to a streak page or show a toast
        }
      },
      priority: 75,
      allowInModal: true,
    },
  ];

  // Enable global keyboard shortcuts
  useKeyboardShortcuts(globalShortcuts);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full py-2 sm:py-3 px-3 sm:px-6 mb-4 flex items-center justify-between border-b border-[#CDA351]/20 shadow-lg backdrop-blur-md bg-[#FAF8F6] dark:bg-gray-900 dark:border-[#CDA351]/10">
      <div className="flex items-center">
        <h1
          className="text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-white tracking-tight cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
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

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-1">
        <div className="flex items-center gap-1 mr-4 p-1 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-[#CDA351]/10 dark:border-[#CDA351]/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 dark:hover:bg-[#CDA351]/10 transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <Home className="mr-1.5 h-4 w-4" />
            <span className="font-medium">Dashboard</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/notes")}
            className="text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 dark:hover:bg-[#CDA351]/10 transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <StickyNote className="mr-1.5 h-4 w-4" />
            <span className="font-medium">Notes</span>
          </Button>

          <div className="w-full">
            <StreakButton ref={streakButtonRef} className="w-full" />
          </div>

          {showShortcuts && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/shortcuts")}
              className="text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 dark:hover:bg-[#CDA351]/10 transition-all duration-200 transform hover:scale-105 active:scale-95"
              title="Keyboard Shortcuts (Cmd/Ctrl + /)"
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
          <span>Focus Mode</span>
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
              className="w-64 shadow-xl border border-[#CDA351]/10 flex flex-col h-full justify-between p-0"
            >
              <div className="flex items-center justify-start gap-2 p-3 bg-gradient-to-r from-[#CDA351]/5 to-transparent">
                <div className="flex flex-col space-y-1 leading-none w-full">
                  <p className="font-semibold text-sm text-[#1A1A1A] dark:text-white">
                    {user?.displayName}
                  </p>
                  <p className="text-xs text-[#7E7E7E] dark:text-gray-400">
                    {user?.email}
                  </p>

                  {/* Session Status */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <Shield
                        className={`h-3 w-3 ${
                          isSessionNearExpiry
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      />
                      <span
                        className={`text-xs font-medium ${
                          isSessionNearExpiry
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      >
                        {isSessionNearExpiry
                          ? "Session Expiring"
                          : "Session Active"}
                      </span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className={`text-xs px-2 py-0.5 ${
                            isSessionNearExpiry
                              ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
                              : "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                          }`}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {sessionDaysRemaining}d left
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Your session expires in {sessionDaysRemaining} days
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Activity automatically extends your session
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Extend Session Button - Show when near expiry */}
                  {isSessionNearExpiry && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={extendUserSession}
                        className="w-full text-xs h-7 border-[#CDA351] text-[#CDA351] hover:bg-[#CDA351] hover:text-white"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Extend Session
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator className="bg-[#CDA351]/10" />

              <div className="flex-1 flex flex-col">
                <DropdownMenuItem
                  onClick={() => {
                    setShowInstallPrompt(true);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Install App</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigate("/how-it-works");
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>How It Works</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigate("/terms");
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="font-medium">Terms & Conditions</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigate("/privacy");
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="font-medium">Privacy Policy</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setContactOpen(true)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="font-medium">Report Bug / Contact</span>
                </DropdownMenuItem>
              </div>
              <div className="border-t border-[#CDA351]/10 bg-transparent px-4 py-2">
                <DropdownMenuItem
                  className="cursor-pointer text-[#CDA351] hover:text-[#CDA351] hover:bg-[#CDA351]/10 focus:bg-[#CDA351]/10 transition-all duration-200 font-medium flex justify-center text-center gap-2"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="flex md:hidden items-center gap-2">
        {/* Focus Mode Button - Mobile */}
        <Button
          size="sm"
          onClick={() => navigate("/focus")}
          className="bg-gradient-to-r from-[#CDA351] to-[#B8935A] hover:from-[#B8935A] hover:to-[#CDA351] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-xs px-3 py-2"
        >
          <Timer className="h-4 w-4" />
        </Button>

        {/* Theme Toggle - Mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="rounded-full h-8 w-8 transition-all duration-300 hover:bg-[#CDA351]/10"
        >
          {theme === "light" ? (
            <Moon size={16} className="text-gray-600 dark:text-gray-400" />
          ) : (
            <Sun size={16} className="text-gray-600 dark:text-gray-400" />
          )}
        </Button>

        {/* Mobile Menu */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 transition-all duration-300 hover:bg-[#CDA351]/10"
            >
              <Menu size={16} className="text-gray-600 dark:text-gray-400" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <div className="flex flex-col h-full">
              {/* User Profile Header */}
              <div className="flex items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-[#CDA351]/5 to-transparent border-b border-[#CDA351]/10">
                <Avatar className="h-12 w-12 ring-2 ring-[#CDA351]/20 ring-offset-2 ring-offset-white dark:ring-offset-gray-900">
                  {user?.photoURL ? (
                    <AvatarImage
                      src={user.photoURL}
                      alt={user.displayName || ""}
                    />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-[#CDA351]/20 to-[#CDA351]/10 text-[#CDA351] font-semibold text-base">
                      {user?.displayName?.[0] || <User size={18} />}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <p className="font-semibold text-base text-[#1A1A1A] dark:text-white truncate">
                    {user?.displayName}
                  </p>
                  <p className="text-sm text-[#7E7E7E] dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 p-4 sm:p-6 space-y-3">
                <Button
                  variant="ghost"
                  onClick={() => handleNavigation("/dashboard")}
                  className="w-full justify-start text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 h-12 px-4 py-3"
                >
                  <Home className="mr-3 h-5 w-5" />
                  <span className="font-medium">Dashboard</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => handleNavigation("/notes")}
                  className="w-full justify-start text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 h-12 px-4 py-3"
                >
                  <StickyNote className="mr-3 h-5 w-5" />
                  <span className="font-medium">Notes</span>
                </Button>

                <div className="w-full">
                  <StreakButton
                    ref={streakButtonRef}
                    className="w-full rounded-lg"
                    variant="hamburger"
                  />
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowInstallPrompt(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 h-12 px-4 py-3"
                >
                  <Download className="mr-3 h-5 w-5" />
                  <span className="font-medium">Install App</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    handleNavigation("/how-it-works");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 h-12 px-4 py-3"
                >
                  <HelpCircle className="mr-3 h-5 w-5" />
                  <span className="font-medium">How It Works</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => handleNavigation("/shortcuts")}
                  className="w-full justify-start text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 h-12 px-4 py-3"
                >
                  <Keyboard className="mr-3 h-5 w-5" />
                  <span className="font-medium">Shortcuts</span>
                </Button>

                {/* Legal and Support Links */}
                <div className="pt-2 border-t border-[#CDA351]/10">
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigation("/terms")}
                    className="w-full justify-start text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 h-12 px-4 py-3"
                  >
                    <Shield className="mr-3 h-5 w-5" />
                    <span className="font-medium">Terms & Conditions</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => handleNavigation("/privacy")}
                    className="w-full justify-start text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 h-12 px-4 py-3"
                  >
                    <Shield className="mr-3 h-5 w-5" />
                    <span className="font-medium">Privacy Policy</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setContactOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-[#7E7E7E] hover:text-[#1A1A1A] dark:text-gray-400 dark:hover:text-white hover:bg-[#CDA351]/10 h-12 px-4 py-3"
                  >
                    <HelpCircle className="mr-3 h-5 w-5" />
                    <span className="font-medium">Report Bug / Contact</span>
                  </Button>
                </div>
              </div>

              {/* Session Status & Logout */}
              <div className="p-4 sm:p-6 border-t border-[#CDA351]/10 space-y-4">
                {/* Session Status */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Shield
                      className={`h-4 w-4 ${
                        isSessionNearExpiry
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        isSessionNearExpiry
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {isSessionNearExpiry
                        ? "Session Expiring"
                        : "Session Active"}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs px-3 py-1 ${
                      isSessionNearExpiry
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                    }`}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {sessionDaysRemaining}d left
                  </Badge>
                </div>

                {/* Extend Session Button */}
                {isSessionNearExpiry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={extendUserSession}
                    className="w-full text-sm h-10 border-[#CDA351] text-[#CDA351] hover:bg-[#CDA351] hover:text-white px-4 py-2"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Extend Session
                  </Button>
                )}

                {/* Logout Button */}
                <Button
                  variant="ghost"
                  onClick={logout}
                  className="w-full justify-start text-[#CDA351] hover:text-[#CDA351] hover:bg-[#CDA351]/10 h-11 px-4 py-3"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-medium">Log out</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        context="profile"
      />
    </nav>
  );
};

export default NavBar;
