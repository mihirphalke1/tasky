// Environment check
const isDevelopment = process.env.NODE_ENV === "development";
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

// Only log in development mode AND on localhost
const shouldLog = isDevelopment && isLocalhost;

// Logger utility functions
export const logger = {
  log: (...args: any[]) => {
    if (shouldLog) {
      console.log(...args);
    }
  },

  error: (...args: any[]) => {
    if (shouldLog) {
      console.error(...args);
    }
  },

  warn: (...args: any[]) => {
    if (shouldLog) {
      console.warn(...args);
    }
  },

  info: (...args: any[]) => {
    if (shouldLog) {
      console.info(...args);
    }
  },

  debug: (...args: any[]) => {
    if (shouldLog) {
      console.debug(...args);
    }
  },
};
