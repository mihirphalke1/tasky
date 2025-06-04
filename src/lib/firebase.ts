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

// Enable persistent authentication - sessions will persist across browser restarts
const initializeAuthPersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log("Firebase Auth persistence enabled");
  } catch (error) {
    console.error("Error enabling Auth persistence:", error);
  }
};

// Enable offline persistence for better data reliability
let persistenceEnabled = false;

const initializePersistence = async () => {
  try {
    await enableIndexedDbPersistence(db);
    persistenceEnabled = true;
    console.log("Firebase offline persistence enabled");
  } catch (err: any) {
    if (err.code === "failed-precondition") {
      console.warn("Firebase persistence failed: Multiple tabs open");
    } else if (err.code === "unimplemented") {
      console.warn("Firebase persistence not supported in this browser");
    } else {
      console.error("Error enabling Firebase persistence:", err);
    }
  }
};

// Initialize persistence
initializeAuthPersistence();
initializePersistence();

export { persistenceEnabled };
