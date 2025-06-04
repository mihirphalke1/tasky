import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Setting up authentication state listener");

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log(
          "Auth state changed:",
          user ? "User authenticated" : "User not authenticated"
        );
        setUser(user);
        setLoading(false);

        // Log user information for debugging
        if (user) {
          console.log("User ID:", user.uid);
          console.log("User email:", user.email);
        } else {
          console.log("No authenticated user");
        }
      },
      (error) => {
        console.error("Auth state change error:", error);
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up authentication listener");
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log("Attempting Google sign-in");
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        console.log("Google sign-in successful:", result.user.uid);
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log("Attempting logout");
      await signOut(auth);
      console.log("Logout successful");
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
