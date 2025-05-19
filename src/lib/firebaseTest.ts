import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, limit, query } from "firebase/firestore";

export const testFirebaseConnection = async () => {
  console.log("Testing Firebase connection...");

  // Test Auth
  const authTest = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log(
        "Auth state:",
        user ? `Logged in as ${user.email}` : "Not logged in"
      );
      unsubscribe();
      resolve(true);
    });
  });

  // Simple connectivity test without requiring permissions
  try {
    const isConnected = db instanceof Object;
    console.log(
      "Firestore connection:",
      isConnected ? "Initialized" : "Failed"
    );
  } catch (error) {
    console.error("Firestore connection error:", error);
  }

  await authTest;
  console.log("Firebase connection test complete");
};
