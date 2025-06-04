import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Shortcuts from "./pages/Shortcuts";
import NotesPage from "./pages/NotesPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import { AuthProvider } from "./lib/AuthContext";
import { useEffect } from "react";
import { testFirebaseConnection } from "./lib/firebaseTest";
import FocusMode from "./pages/FocusMode";
import { useStreakTracking } from "./hooks/useStreakTracking";

const queryClient = new QueryClient();

const AppContent = () => {
  // Initialize streak tracking
  useStreakTracking();

  useEffect(() => {
    testFirebaseConnection();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Index />} />
        <Route path="/focus" element={<FocusMode />} />
        <Route path="/shortcuts" element={<Shortcuts />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/task/:taskId" element={<TaskDetailPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <TooltipProvider>
              <AppContent />
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
