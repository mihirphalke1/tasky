import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { logger } from "./logger";

// Disable Firebase internal logging in production
if (process.env.NODE_ENV === "production") {
  // @ts-ignore - Firebase internal property
  window.__FIREBASE_DUMP_INTERNALS__ = false;
  // @ts-ignore - Firebase internal property
  window.__FIREBASE_DEBUG__ = false;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Configure Google provider for better UX
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Enable persistent authentication immediately - this is the default for Firebase Auth
// We're setting it explicitly to ensure it's definitely enabled
setPersistence(auth, browserLocalPersistence).catch((error) => {
  logger.error("Error enabling Auth persistence:", error);
  // Don't throw - app should still work
});

// Enable offline persistence for better data reliability
let persistenceEnabled = false;

const initializePersistence = async () => {
  try {
    await enableIndexedDbPersistence(db);
    persistenceEnabled = true;
    logger.log("Firebase offline persistence enabled");
  } catch (err: any) {
    if (err.code === "failed-precondition") {
      logger.warn("Firebase persistence failed: Multiple tabs open");
    } else if (err.code === "unimplemented") {
      logger.warn("Firebase persistence not supported in this browser");
    } else {
      logger.error("Error enabling Firebase persistence:", err);
    }
  }
};

// Initialize offline persistence
initializePersistence().catch(logger.error);

export { persistenceEnabled };
