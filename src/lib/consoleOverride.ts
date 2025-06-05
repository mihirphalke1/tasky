import { logger } from "./logger";

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Check if we're in production
const isProduction = process.env.NODE_ENV === "production";

// Override console methods in production
if (isProduction) {
  // Override all console methods
  console.log = (...args: any[]) => {
    // Only allow logs from our logger
    if (args[0]?.includes("[Tasky]")) {
      originalConsole.log(...args);
    }
  };

  console.error = (...args: any[]) => {
    // Only allow errors from our logger
    if (args[0]?.includes("[Tasky]")) {
      originalConsole.error(...args);
    }
  };

  console.warn = (...args: any[]) => {
    // Only allow warnings from our logger
    if (args[0]?.includes("[Tasky]")) {
      originalConsole.warn(...args);
    }
  };

  console.info = (...args: any[]) => {
    // Only allow info from our logger
    if (args[0]?.includes("[Tasky]")) {
      originalConsole.info(...args);
    }
  };

  console.debug = (...args: any[]) => {
    // Only allow debug from our logger
    if (args[0]?.includes("[Tasky]")) {
      originalConsole.debug(...args);
    }
  };

  // Suppress common browser warnings
  const suppressWarnings = () => {
    // Suppress X-Frame-Options warnings
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args);
      } catch (error: any) {
        if (error.message?.includes("X-Frame-Options")) {
          return new Response(null, { status: 200 });
        }
        throw error;
      }
    };

    // Suppress WebSocket connection warnings
    const originalWebSocket = window.WebSocket;
    window.WebSocket = class extends originalWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        this.addEventListener("error", (event) => {
          event.stopPropagation();
        });
      }
    };
  };

  // Call suppressWarnings after a short delay to ensure it runs after other scripts
  setTimeout(suppressWarnings, 0);
}

export { originalConsole };
