// src/pages/ResetPasswordPage.jsx

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { resetPassword } from "../api/auth";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Read reset_token passed from VerifyCodePage.
  // This is the short-lived JWT that proves the user passed code verification.
  const reset_token = location.state?.reset_token;

  const [form, setForm]       = useState({ password: "", password2: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Guard: no token means they got here without verifying a code.
  // Send them back to start — don't let them try to reset without proof.
  if (!reset_token) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#120a06',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <p style={{ color: '#f0dba8', fontSize: '16px' }}>
          Session expired. Please start again.
        </p>
        <Link
          to="/forgot-password"
          style={{ color: '#c49448', fontWeight: 600 }}
        >
          Start over
        </Link>
      </div>
    );
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.password !== form.password2) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await resetPassword(reset_token, form.password, form.password2);
      // Password changed — send to login with a success message
      // location.state on LoginPage isn't read for this, but the
      // success flag lets us show a "Password changed" banner if we want
      navigate('/login', {
        state: { message: 'Password changed successfully. Please sign in.' }
      });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Failed to reset password. Please start over.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .auth-page { min-height:100vh; background:radial-gradient(ellipse at 70% 30%,#2a1708 0%,#120a06 60%); display:flex; justify-content:center; align-items:center; padding:20px; }
        .auth-card { width:100%; max-width:460px; background:#1a0f08; border:1px solid rgba(196,148,72,0.2); border-radius:20px; padding:44px 40px; box-shadow:0 24px 64px rgba(0,0,0,0.5); }
        .auth-logo { text-align:center; margin-bottom:28px; }
        .auth-logo-circle { width:72px; height:72px; border-radius:50%; margin:0 auto 12px; background:linear-gradient(135deg,#c49448,#8b5e1a); display:flex; align-items:center; justify-content:center; font-size:30px; font-weight:700; color:#120a06; font-family:Georgia,serif; }
        .auth-logo-name { font-size:14px; color:#9a7a4a; letter-spacing:0.12em; text-transform:uppercase; }
        .auth-title { font-family:Georgia,serif; font-size:1.8rem; font-weight:400; color:#f0dba8; text-align:center; margin:0 0 8px; }
        .auth-subtitle { text-align:center; color:#7a5e3a; font-size:14px; margin:0 0 32px; }
        .auth-error { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); color:#fca5a5; padding:12px 16px; border-radius:10px; font-size:14px; margin-bottom:20px; text-align:center; }
        .auth-field { margin-bottom:16px; }
        .auth-label { display:block; font-size:12px; font-weight:600; color:#9a7a4a; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:7px; }
        .auth-input { width:100%; height:52px; padding:0 16px; border-radius:10px; border:1px solid rgba(196,148,72,0.2); background:#120a06; color:#f0dba8; font-size:15px; outline:none; transition:border-color 0.2s,box-shadow 0.2s; box-sizing:border-box; }
        .auth-input::placeholder { color:#5a3e22; }
        .auth-input:focus { border-color:#c49448; box-shadow:0 0 0 3px rgba(196,148,72,0.12); }
        .auth-btn { width:100%; height:52px; margin-top:8px; border:none; border-radius:10px; background:linear-gradient(135deg,#c49448,#8b5e1a); color:#120a06; font-size:15px; font-weight:700; cursor:pointer; transition:opacity 0.2s,transform 0.15s; }
        .auth-btn:hover:not(:disabled) { opacity:0.88; transform:translateY(-2px); }
        .auth-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .auth-hint { background:rgba(196,148,72,0.06); border:1px solid rgba(196,148,72,0.15); border-radius:10px; padding:12px 16px; font-size:13px; color:#9a7a4a; margin-bottom:24px; line-height:1.5; }
      `}</style>

      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-circle">P</div>
            <div className="auth-logo-name">Perry's Collection</div>
          </div>

          <h1 className="auth-title">New password</h1>
          <p className="auth-subtitle">Choose a strong password for your account</p>

          <div className="auth-hint">
            At least 8 characters. Use a mix of letters, numbers,
            and symbols for a stronger password.
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">New password</label>
              <input
                id="password"
                className="auth-input"
                type="password"
                name="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password2">Confirm password</label>
              <input
                id="password2"
                className="auth-input"
                type="password"
                name="password2"
                placeholder="Repeat your new password"
                value={form.password2}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Saving…" : "Set new password"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}