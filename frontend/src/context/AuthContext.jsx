// src/context/AuthContext.jsx
// React Context lets you share state across the entire component tree
// without "prop drilling" (passing props through every intermediate component).
//
// Pattern: create context → provide it at the top level (App.jsx) →
// consume it anywhere with useAuth()

import { createContext, useContext, useEffect, useState } from "react";
import { getMe, logout as logoutApi } from "../api/auth";

// Step 1: Create the context object
// The argument to createContext is the DEFAULT value used when there's no Provider above.
// We set null here — any component outside our Provider will get null.
const AuthContext = createContext(null);

// Step 2: The Provider component — wraps the whole app
// It holds the actual state and exposes it via value={}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // user: null = not logged in, object = logged in user data

  const [loading, setLoading] = useState(true);
  // loading: true while we're checking if user is already logged in on page load

  useEffect(() => {
    // On app load, check if there's a stored token and fetch the user profile.
    // This "rehydrates" auth state after a page refresh.
    const token = localStorage.getItem("access_token");

    if (!token) {
      // No token stored → definitely not logged in
      setLoading(false);
      return;
    }

    // Token exists → verify it's still valid by calling /api/auth/me/
    getMe()
      .then((userData) => setUser(userData))  // token valid → set user
      .catch(() => {
        // Token expired or invalid → clear it
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      })
      .finally(() => setLoading(false));
  }, []); // [] means run once on mount

  function login(userData, tokens) {
    // Called after a successful login or register API response
    // Stores tokens in localStorage and updates React state
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
    setUser(userData);
  }

  function logout() {
    logoutApi();        // clears localStorage
    setUser(null);      // clears React state → triggers re-render
  }

  // Step 3: Expose values via the context
  // Any component that calls useAuth() gets these values
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Step 4: Custom hook — cleaner than calling useContext(AuthContext) everywhere
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // This catches mistakes where useAuth() is called outside <AuthProvider>
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}