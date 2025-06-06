import { logger } from "./logger";

// Store original console for development purposes
export const originalConsole = { ...console };

// Check if we're in production
const isProduction = process.env.NODE_ENV === "production";

// Override console methods in production
if (isProduction) {
  // Suppress all console output in production
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};

  // Keep error logging for critical issues
  console.error = (...args) => {
    // Only log critical errors that need attention
    const errorString = args.join(" ");
    if (!shouldSuppressError(errorString)) {
      originalConsole.error(...args);
    }
  };

  // Suppress specific errors
  const suppressPatterns = [
    /WebSocket connection/i,
    /Background sync supported/i,
    /Service Worker:/i,
    /Failed to load resource:/i,
    /ws:\/\//i,
  ];

  function shouldSuppressError(errorString: string): boolean {
    return suppressPatterns.some((pattern) => pattern.test(errorString));
  }

  // Suppress common browser warnings
  const suppressWarnings = () => {
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

    // Suppress fetch errors for specific cases
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args);
      } catch (error: any) {
        if (
          error.message?.includes("X-Frame-Options") ||
          error.message?.includes("Failed to fetch")
        ) {
          return new Response(null, { status: 200 });
        }
        throw error;
      }
    };
  };

  // Call suppressWarnings after a short delay
  setTimeout(suppressWarnings, 0);
}
