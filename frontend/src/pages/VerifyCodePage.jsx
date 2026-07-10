// src/pages/VerifyCodePage.jsx

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { verifyResetCode } from "../api/auth";

export default function VerifyCodePage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Read the email passed from ForgotPasswordPage via router state.
  // If state is null (user refreshed the page or navigated here directly),
  // email will be undefined — we handle that below with a redirect guard.
  const email = location.state?.email;

  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Guard: if no email in state, user got here without going through
  // ForgotPasswordPage first. Send them back to start.
  // This also handles the page-refresh case — state is lost on refresh.
  if (!email) {
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
          Request a new code
        </Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await verifyResetCode(email, code);
      // data.reset_token: the short-lived JWT from the backend
      // that proves this user passed the code verification step.
      // Pass it to ResetPasswordPage via router state — same pattern.
      navigate('/reset-password', {
        state: {
          reset_token: data.reset_token,
          email,
        }
      });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Invalid or expired code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(e) {
    // Only allow digits, max 6 characters
    // replace(/\D/g, '') strips any non-digit character as they type
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
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
        .auth-subtitle { text-align:center; color:#7a5e3a; font-size:14px; margin:0 0 8px; }
        .auth-email-display { text-align:center; color:#c49448; font-size:14px; font-weight:600; margin:0 0 28px; }
        .auth-error { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); color:#fca5a5; padding:12px 16px; border-radius:10px; font-size:14px; margin-bottom:20px; text-align:center; }
        .auth-field { margin-bottom:16px; }
        .auth-label { display:block; font-size:12px; font-weight:600; color:#9a7a4a; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:7px; }
        .code-input { width:100%; height:64px; padding:0 16px; border-radius:10px; border:1px solid rgba(196,148,72,0.2); background:#120a06; color:#f0dba8; font-size:28px; font-weight:700; letter-spacing:0.3em; outline:none; text-align:center; transition:border-color 0.2s,box-shadow 0.2s; box-sizing:border-box; }
        .code-input::placeholder { color:#5a3e22; font-size:18px; letter-spacing:0.1em; }
        .code-input:focus { border-color:#c49448; box-shadow:0 0 0 3px rgba(196,148,72,0.12); }
        .auth-btn { width:100%; height:52px; margin-top:8px; border:none; border-radius:10px; background:linear-gradient(135deg,#c49448,#8b5e1a); color:#120a06; font-size:15px; font-weight:700; cursor:pointer; transition:opacity 0.2s,transform 0.15s; }
        .auth-btn:hover:not(:disabled) { opacity:0.88; transform:translateY(-2px); }
        .auth-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .auth-footer { margin-top:24px; text-align:center; color:#7a5e3a; font-size:14px; }
        .auth-footer a { color:#c49448; text-decoration:none; font-weight:600; }
        .auth-footer a:hover { color:#e8c87a; }
        .code-length { text-align:center; font-size:12px; color:#5a3e22; margin-top:6px; }
      `}</style>

      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-circle">P</div>
            <div className="auth-logo-name">Perry's Collection</div>
          </div>

          <h1 className="auth-title">Enter your code</h1>
          <p className="auth-subtitle">We sent a 6-digit code to</p>
          {/* Show which email the code was sent to — reassures the user */}
          <p className="auth-email-display">{email}</p>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="code">Verification code</label>
              <input
                id="code"
                className="code-input"
                type="text"
                inputMode="numeric"
                // inputMode="numeric" on mobile shows the number keypad
                // instead of a full keyboard — much better UX for a 6-digit code
                placeholder="000000"
                value={code}
                onChange={handleCodeChange}
                maxLength={6}
                autoComplete="one-time-code"
                // autoComplete="one-time-code" tells iOS/Android to
                // automatically suggest the SMS/email code — works on
                // most modern mobile browsers
                autoFocus
              />
              <p className="code-length">{code.length}/6 digits</p>
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={loading || code.length !== 6}
              // Disable until all 6 digits entered — no point submitting early
            >
              {loading ? "Verifying…" : "Verify code"}
            </button>
          </form>

          <p className="auth-footer">
            Didn't get a code?{" "}
            <Link to="/forgot-password" state={{ email }}>
              Send again
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}