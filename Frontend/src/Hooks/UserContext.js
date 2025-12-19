import { createContext, useState, useEffect } from "react";
import { apiService } from "../services/apiService";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Initialize user from localStorage if available (using existing key for compatibility)
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("userDetails");
      return savedUser ? JSON.parse(savedUser) : "";
    } catch (error) {
      console.error("Error loading user from localStorage:", error);
      return "";
    }
  });
  
  const [paper, setPaper] = useState("");
  const [paperList, setPaperList] = useState([]);
  const [notes, setNotes] = useState([]);

  // Save user to localStorage whenever user state changes (using existing key for compatibility)
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem("userDetails", JSON.stringify(user));
      } else {
        localStorage.removeItem("userDetails");
      }
    } catch (error) {
      console.error("Error saving user to localStorage:", error);
    }
  }, [user]);

  // Enhanced setUser function that handles localStorage (prefetching disabled for debugging)
  const setUserWithPersistence = (userData) => {
    setUser(userData);
    // Temporarily disable prefetching to debug login issues
    // if (userData && userData._id) {
    //   apiService.prefetchCommonData(userData);
    // }
  };

  // Prefetch data when user is loaded from localStorage (disabled for debugging)
  useEffect(() => {
    // Temporarily disable prefetching to debug login issues
    // if (user && user._id) {
    //   apiService.prefetchCommonData(user);
    // }
  }, [user]);

  return (
    <UserContext.Provider
      value={{
        user,
        setUser: setUserWithPersistence,
        paper,
        setPaper,
        paperList,
        setPaperList,
        notes,
        setNotes,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;