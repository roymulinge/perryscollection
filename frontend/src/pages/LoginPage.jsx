// src/pages/LoginPage.jsx
// ─────────────────────────────────────────────────────────────────
// WHAT CHANGED FROM YOUR ORIGINAL:
// 1. Uses useAuth() context — login() stores tokens AND updates
//    React state in one call, so Navbar and AdminLayout both
//    instantly know the user is logged in
// 2. Key names: access_token / refresh_token (matches client.js)
// 3. Redirects to wherever user came from (location.state.from)
//    so if they tried /admin-panel and got redirected to /login,
//    after login they go straight back to /admin-panel
// ─────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { login } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login: setAuth } = useAuth();
  // useAuth() gives us the login() function from AuthContext.
  // We rename it setAuth to avoid clashing with the login()
  // function imported from ../api/auth above.
  // AuthContext.login() does two things at once:
  //   1. Saves tokens to localStorage under the right key names
  //   2. Sets the user object in React state
  // Without this, localStorage has the token but React doesn't
  // know the user is logged in — AdminLayout sees user=null and
  // redirects away before the page even renders.

  // location.state?.from: if AdminLayout redirected the user here
  // because they weren't logged in, it passes the original URL.
  // After login we send them back there instead of just "/".
  // The ?. is optional chaining — if state is null, don't crash.
  const from = location.state?.from || "/";

  const [form, setForm]       = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function handleChange(e) {
    // [e.target.name]: computed property key.
    // One handler for all fields. When name="email", updates form.email.
    // When name="password", updates form.password.
    // The spread ...prev keeps the other field's value unchanged.
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault(); // stop browser from reloading the page
    setLoading(true);
    setError("");

    try {
      // login() from api/auth.js calls POST /api/auth/login/
      // Django returns: { user: {...}, access: "...", refresh: "..." }
      const data = await login(form.email, form.password);

      // setAuth() = AuthContext.login()
      // Stores tokens in localStorage AND updates React user state
      // This is the critical step — without it, AdminLayout thinks
      // no one is logged in even though localStorage has the token
      setAuth(data.user, {
        access:  data.access,
        refresh: data.refresh,
      });

      if (from && from !== "/") {
        // They came from a specific URL — send them back there
        navigate(from, { replace: true });
        return; // stop here, don't fall through to role check
      }

      const isAdmin = data.user.is_staff || data.user.is_shop_owner;

      const destination = from && from !== "/" ? from : isAdmin ? "/admin-panel" : "/";
      navigate(destination, { replace: true });


    } catch (err) {
      // err.response is the axios error response object
      // err.response?.data?.error: Django's error message from LoginAPIView
      // The ?. prevents crashing if the server is down (no response at all)
      const msg = err.response?.data?.error || "Invalid email or password.";
      setError(msg);
    } finally {
      // always runs — whether try succeeded or catch ran
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .auth-page {
          min-height: 100vh;
          background: radial-gradient(ellipse at 70% 30%, #2a1708 0%, #120a06 60%);
          display: flex; justify-content: center; align-items: center; padding: 20px;
        }
        .auth-card {
          width: 100%; max-width: 460px;
          background: #1a0f08;
          border: 1px solid rgba(196,148,72,0.2);
          border-radius: 20px; padding: 44px 40px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5);
        }
        .auth-logo { text-align: center; margin-bottom: 28px; }
        .auth-logo-circle {
          width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 12px;
          background: linear-gradient(135deg, #c49448, #8b5e1a);
          display: flex; align-items: center; justify-content: center;
          font-size: 30px; font-weight: 700; color: #120a06; font-family: Georgia, serif;
        }
        .auth-logo-name { font-size: 14px; color: #9a7a4a; letter-spacing: 0.12em; text-transform: uppercase; }
        .auth-title { font-family: Georgia, serif; font-size: 2rem; font-weight: 400; color: #f0dba8; text-align: center; margin: 0 0 8px; }
        .auth-subtitle { text-align: center; color: #7a5e3a; font-size: 14px; margin: 0 0 32px; }
        .auth-error {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5; padding: 12px 16px; border-radius: 10px;
          font-size: 14px; margin-bottom: 20px; text-align: center;
        }
        .auth-field { margin-bottom: 16px; }
        .auth-label { display: block; font-size: 12px; font-weight: 600; color: #9a7a4a; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 7px; }
        .auth-input {
          width: 100%; height: 52px; padding: 0 16px;
          border-radius: 10px; border: 1px solid rgba(196,148,72,0.2);
          background: #120a06; color: #f0dba8; font-size: 15px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .auth-input::placeholder { color: #5a3e22; }
        .auth-input:focus { border-color: #c49448; box-shadow: 0 0 0 3px rgba(196,148,72,0.12); }
        .auth-btn {
          width: 100%; height: 52px; margin-top: 8px;
          border: none; border-radius: 10px;
          background: linear-gradient(135deg, #c49448, #8b5e1a);
          color: #120a06; font-size: 15px; font-weight: 700;
          cursor: pointer; letter-spacing: 0.03em;
          transition: opacity 0.2s, transform 0.15s;
        }
        .auth-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-2px); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .auth-footer { margin-top: 24px; text-align: center; color: #7a5e3a; font-size: 14px; }
        .auth-footer a { color: #c49448; text-decoration: none; font-weight: 600; }
        .auth-footer a:hover { color: #e8c87a; }
        .auth-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: rgba(196,148,72,0.15); }
        .auth-divider span { font-size: 12px; color: #5a3e22; }
        @media (max-width: 520px) { .auth-card { padding: 32px 24px; } }
      `}</style>

      <div className="auth-page">
        <div className="auth-card">

          <div className="auth-logo">
            <div className="auth-logo-circle">P</div>
            <div className="auth-logo-name">Perry's Collection</div>
          </div>

          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your account to continue</p>

          {/* Only render the error div when there IS an error.
              role="alert" makes screen readers announce it immediately. */}
          {error && <div className="auth-error" role="alert">{error}</div>}

          {/* noValidate: disables browser's built-in validation popups
              so we can control the error display ourselves */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email address</label>
              {/* htmlFor + id must match — links the label to the input
                  so clicking the label focuses the input (accessibility) */}
              <input
                id="email"
                className="auth-input"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="auth-input"
                type="password"
                name="password"
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {/* Ternary: if loading show "Signing in…" else show "Sign in" */}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </>
  );
}