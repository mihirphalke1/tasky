// Environment check
const isDevelopment = process.env.NODE_ENV === "development";
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

// Only log in development mode AND on localhost
const shouldLog = isDevelopment && isLocalhost;

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Override console methods in production
if (!shouldLog) {
  // Completely disable console methods in production
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Logger utility functions
export const logger = {
  log: (...args: any[]) => {
    if (shouldLog) {
      originalConsole.log("[Tasky]", ...args);
    }
  },

  error: (...args: any[]) => {
    if (shouldLog) {
      originalConsole.error("[Tasky]", ...args);
    }
  },

  warn: (...args: any[]) => {
    if (shouldLog) {
      originalConsole.warn("[Tasky]", ...args);
    }
  },

  info: (...args: any[]) => {
    if (shouldLog) {
      originalConsole.info("[Tasky]", ...args);
    }
  },

  debug: (...args: any[]) => {
    if (shouldLog) {
      originalConsole.debug("[Tasky]", ...args);
    }
  },
};
