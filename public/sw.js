const CACHE_NAME = "tasky-v1.1.0";
const STATIC_CACHE_NAME = "tasky-static-v1.1.0";
const DYNAMIC_CACHE_NAME = "tasky-dynamic-v1.1.0";

// Debug mode flag
const isDebugMode = false; // Set to false for production

// Logger utility
const logger = {
  log: (...args) => isDebugMode && console.log(...args),
  error: (...args) => isDebugMode && console.error(...args),
  warn: (...args) => isDebugMode && console.warn(...args),
};

// Resources to cache immediately
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/focus",
  "/shortcuts",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  // Add other critical assets
];

// Resources that can be cached dynamically
const DYNAMIC_ASSETS_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /^https:\/\/cdn\.jsdelivr\.net/,
];

// Network-first patterns (Firebase, APIs)
const NETWORK_FIRST_PATTERNS = [
  /^https:\/\/.*\.firebaseio\.com/,
  /^https:\/\/.*\.googleapis\.com\/.*firestore/,
  /^https:\/\/securetoken\.googleapis\.com/,
  /^https:\/\/identitytoolkit\.googleapis\.com/,
];

// Cache-first patterns (static assets)
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:css|js)$/,
  /^https:\/\/fonts\./,
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  logger.log("Service Worker: Installing...");

  event.waitUntil(
    (async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE_NAME);
        logger.log("Service Worker: Caching static assets...");
        await staticCache.addAll(STATIC_ASSETS);
        logger.log("Service Worker: Static assets cached successfully");

        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        logger.error("Service Worker: Error during install:", error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  logger.log("Service Worker: Activating...");

  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(
          (name) =>
            name.startsWith("tasky-") &&
            name !== STATIC_CACHE_NAME &&
            name !== DYNAMIC_CACHE_NAME
        );

        await Promise.all(
          oldCaches.map((cacheName) => {
            logger.log("Service Worker: Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          })
        );

        // Take control of all clients immediately
        await self.clients.claim();
        logger.log("Service Worker: Activated successfully");
      } catch (error) {
        logger.error("Service Worker: Error during activation:", error);
      }
    })()
  );
});

// Fetch event - handle different caching strategies
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests that we don't want to cache
  if (url.origin !== self.location.origin && !shouldCacheRequest(url)) {
    return;
  }

  event.respondWith(handleFetch(event.request));
});

// Handle different fetch strategies based on request type
async function handleFetch(request) {
  const url = new URL(request.url);

  try {
    // Network-first for Firebase and API calls
    if (NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(request.url))) {
      return await networkFirst(request);
    }

    // Cache-first for static assets
    if (CACHE_FIRST_PATTERNS.some((pattern) => pattern.test(request.url))) {
      return await cacheFirst(request);
    }

    // Stale-while-revalidate for navigation and dynamic content
    if (request.mode === "navigate") {
      return await staleWhileRevalidate(request);
    }

    // Default to network-first
    return await networkFirst(request);
  } catch (error) {
    logger.error("Service Worker: Fetch error:", error);

    // Return offline fallback if available
    if (request.mode === "navigate") {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const offlineFallback = await cache.match("/");
      if (offlineFallback) {
        return offlineFallback;
      }
    }

    // Return a basic offline response
    return new Response("You are offline", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok && shouldCacheRequest(new URL(request.url))) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone()).catch((err) => {
        logger.warn("Service Worker: Failed to cache response:", err);
      });
    }

    return networkResponse;
  } catch (error) {
    logger.log("Service Worker: Network failed, trying cache...");
    const cacheResponse = await caches.match(request);
    if (cacheResponse) {
      return cacheResponse;
    }
    throw error;
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cacheResponse = await caches.match(request);
  if (cacheResponse) {
    return cacheResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone()).catch((err) => {
        logger.warn("Service Worker: Failed to cache response:", err);
      });
    }
    return networkResponse;
  } catch (error) {
    logger.error("Service Worker: Cache-first failed:", error);
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cacheResponse = await cache.match(request);

  // Start fetching in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone()).catch((err) => {
          logger.warn("Service Worker: Failed to update cache:", err);
        });
      }
      return response;
    })
    .catch((err) => {
      logger.warn("Service Worker: Background fetch failed:", err);
      return cacheResponse;
    });

  // Return cached version immediately if available
  return cacheResponse || fetchPromise;
}

// Check if request should be cached
function shouldCacheRequest(url) {
  // Don't cache Firebase Auth tokens or sensitive data
  if (url.pathname.includes("token") || url.pathname.includes("auth")) {
    return false;
  }

  // Cache external fonts and CDN resources
  if (DYNAMIC_ASSETS_PATTERNS.some((pattern) => pattern.test(url.href))) {
    return true;
  }

  // Cache same-origin requests
  return url.origin === self.location.origin;
}

// Handle background sync for offline actions
self.addEventListener("sync", (event) => {
  logger.log("Service Worker: Background sync triggered:", event.tag);

  if (event.tag === "task-sync") {
    event.waitUntil(syncOfflineTasks());
  }
});

// Sync offline tasks when connection is restored
async function syncOfflineTasks() {
  try {
    // Get pending tasks from IndexedDB or localStorage
    const pendingTasks = await getPendingOfflineTasks();

    for (const task of pendingTasks) {
      try {
        // Attempt to sync each task
        await syncTask(task);
        await removePendingTask(task.id);
      } catch (error) {
        logger.error("Service Worker: Failed to sync task:", error);
      }
    }

    logger.log("Service Worker: Offline tasks synced successfully");
  } catch (error) {
    logger.error("Service Worker: Background sync failed:", error);
  }
}

// Placeholder functions for offline task management
async function getPendingOfflineTasks() {
  // Implement IndexedDB or localStorage retrieval
  return [];
}

async function syncTask(task) {
  // Implement task sync logic
  logger.log("Syncing task:", task);
}

async function removePendingTask(taskId) {
  // Implement pending task removal
  logger.log("Removing pending task:", taskId);
}

// Handle push notifications (future feature)
self.addEventListener("push", (event) => {
  logger.log("Service Worker: Push event received");

  const options = {
    body: event.data ? event.data.text() : "You have pending tasks!",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "task-notification",
    },
    actions: [
      {
        action: "open-app",
        title: "Open Tasky",
        icon: "/icons/icon-72x72.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
        icon: "/icons/icon-72x72.png",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("Tasky Reminder", options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  logger.log("Service Worker: Notification click received");

  event.notification.close();

  if (event.action === "open-app") {
    event.waitUntil(clients.openWindow("/"));
  }
});

// Handle messages from main thread
self.addEventListener("message", (event) => {
  logger.log("Service Worker: Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

logger.log("Service Worker: Script loaded successfully");
