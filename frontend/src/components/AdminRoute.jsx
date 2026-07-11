// src/components/AdminRoute.jsx
// Wraps any route that requires admin access (is_staff or is_shop_owner).
// Logged-in customers who try to access admin routes get redirected to /
// not to /login — they ARE authenticated, just not authorised.
// This distinction matters: authentication = who you are, authorisation = what you can do.

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  // Same loading guard as PrivateRoute — wait for AuthContext
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

  // Not logged in → /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin → / (home, not login)
  // Sending them to /login would be confusing — they ARE logged in.
  // Sending them home is the right UX. You could also show a 403 page.
  if (!user.is_staff && !user.is_shop_owner) {
    return <Navigate to="/" replace />;
  }

  // Admin → render the page
  return children;
}