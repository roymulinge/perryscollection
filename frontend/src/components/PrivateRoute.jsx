// src/components/PrivateRoute.jsx
// Wraps any route that requires the user to be logged in.
// If not authenticated → redirect to /login, remembering where they
// were trying to go so we can send them back after login.

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // loading=true means AuthContext is still calling /me/ to check
  // if there's a stored token. If we redirect now, a logged-in user
  // who refreshed the page would get kicked to /login unnecessarily.
  // Show nothing while we wait — the flicker lasts < 300ms in practice.
  if (loading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9a7a4a',
        fontSize: '14px',
      }}>
        Loading…
      </div>
    );
  }

  // Not logged in → send to /login
  // state={{ from: location.pathname }} passes the current URL to LoginPage
  // so after login, LoginPage can navigate back here automatically.
  // This is the same pattern LoginPage already reads:
  //   const from = location.state?.from || "/"
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
        // replace=true: replaces the history entry instead of pushing a new one
        // so pressing Back from /login doesn't loop them back to the protected page
      />
    );
  }

  // Logged in → render the actual page
  return children;
}