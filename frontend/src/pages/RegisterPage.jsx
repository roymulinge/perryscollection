// src/pages/RegisterPage.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from '@react-oauth/google';
import { googleLogin } from '../api/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    password2: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.password !== form.password2) {
      setFieldErrors({ password2: "Passwords do not match." });
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      const data = await register(form);
      setAuth(data.user, { access: data.access, refresh: data.refresh });
      navigate("/");
    } catch (err) {
      if (err.response?.data && typeof err.response.data === "object") {
        const djangoErrors = err.response.data;
        const hasFieldErrors = Object.values(djangoErrors).some(Array.isArray);
        if (hasFieldErrors) {
          const flat = {};
          Object.entries(djangoErrors).forEach(([k, v]) => {
            flat[k] = Array.isArray(v) ? v.join(" ") : v;
          });
          setFieldErrors(flat);
        } else {
          setError(djangoErrors.error || "Registration failed. Please try again.");
        }
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const data = await googleLogin(credentialResponse.credential);
      setAuth(data.user, { access: data.access, refresh: data.refresh });
      const isNewUser = !data.user.profile?.phone_number &&
                      !data.user.profile?.bio &&
                      !data.user.profile?.username;
      const isAdmin = data.user.is_staff || data.user.is_shop_owner;
      if (isAdmin) {
        navigate('/admin-panel', { replace: true });
      } else if (isNewUser) {
        navigate('/profile', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    }
  }

  function handleGoogleError() {
    setError('Google sign-in was cancelled or failed.');
  }

  return (
    <>
      <style>{`
        .auth-page {
          --paper:#FFFFFF; --cream:#F6F1E6; --ink:#221E19; --ink-soft:#5B564C;
          --brass:#A5793A; --brass-dark:#7C5A29; --oxide:#8B4632; --line:#E5DFD1;
          min-height:100vh; background:var(--cream);
          display:flex; justify-content:center; align-items:center; padding:20px;
        }
        .auth-card {
          width:100%; max-width:460px; background:var(--paper);
          border:1px solid var(--line); border-radius:4px;
          padding:48px 44px;
        }
        .auth-logo { text-align:center; margin-bottom:28px; }
        .auth-logo-circle {
          width:56px; height:56px; border-radius:50%; margin:0 auto 14px;
          background:var(--ink); display:flex; align-items:center; justify-content:center;
          font-size:24px; font-weight:400; color:var(--paper); font-family:'Instrument Serif',serif;
        }
        .auth-logo-name {
          font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--ink-soft);
          letter-spacing:0.14em; text-transform:uppercase;
        }
        .auth-title {
          font-family:'Instrument Serif',serif; font-size:2rem; font-weight:400;
          color:var(--ink); text-align:center; margin:0 0 8px;
        }
        .auth-subtitle { text-align:center; color:var(--ink-soft); font-size:14px; margin:0 0 32px; font-family:'Archivo',sans-serif; }
        .auth-error {
          background:rgba(139,70,50,0.06); border:1px solid rgba(139,70,50,0.25);
          color:var(--oxide); padding:12px 16px; border-radius:3px; font-size:14px;
          margin-bottom:20px; text-align:center; font-family:'Archivo',sans-serif;
        }
        .auth-field { margin-bottom:16px; }
        .auth-label {
          display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:500;
          color:var(--ink-soft); letter-spacing:0.08em; text-transform:uppercase; margin-bottom:7px;
        }
        .auth-input {
          width:100%; height:50px; padding:0 16px; border-radius:3px;
          border:1px solid var(--line); background:var(--paper); color:var(--ink);
          font-family:'Archivo',sans-serif; font-size:15px; outline:none;
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .auth-input.has-error { border-color:var(--oxide); }
        .auth-input::placeholder { color:#B5AA98; }
        .auth-input:focus { border-color:var(--brass); box-shadow:0 0 0 3px rgba(165,121,58,0.12); }
        .auth-field-error { font-size:12px; color:var(--oxide); margin-top:5px; font-family:'Archivo',sans-serif; }
        .auth-btn {
          width:100%; height:50px; margin-top:8px; border:none; border-radius:3px;
          background:var(--ink); color:var(--paper);
          font-family:'Archivo',sans-serif; font-size:15px; font-weight:600; cursor:pointer;
          letter-spacing:0.02em; transition:background 0.2s;
        }
        .auth-btn:hover:not(:disabled) { background:var(--brass-dark); }
        .auth-btn:disabled { opacity:0.5; cursor:not-allowed; }

        /* was referenced in JSX but never defined — the "or" divider had no styling at all */
        .auth-divider {
          display:flex; align-items:center; text-align:center;
          margin:26px 0 18px; color:var(--ink-soft);
          font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase;
        }
        .auth-divider::before, .auth-divider::after {
          content:''; flex:1; height:1px; background:var(--line);
        }
        .auth-divider span { padding:0 14px; }

        .auth-footer { margin-top:24px; text-align:center; color:var(--ink-soft); font-size:14px; font-family:'Archivo',sans-serif; }
        .auth-footer a { color:var(--brass-dark); text-decoration:none; font-weight:600; }
        .auth-footer a:hover { color:var(--brass); }

        @media(max-width:520px){ .auth-card{ padding:32px 24px; } .auth-title{ font-size:1.7rem; } }
      `}</style>

      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-circle">P</div>
            <div className="auth-logo-name">Perry's Collection</div>
          </div>

          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Join Perry's Collection and start shopping</p>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {[
              { name: "full_name", label: "Full name", type: "text", placeholder: "Jane Muthoni", autoComplete: "name" },
              { name: "email", label: "Email address", type: "email", placeholder: "you@example.com", autoComplete: "email" },
              { name: "password", label: "Password", type: "password", placeholder: "At least 8 characters", autoComplete: "new-password" },
              { name: "password2", label: "Confirm password", type: "password", placeholder: "Repeat your password", autoComplete: "new-password" },
            ].map((field) => (
              <div className="auth-field" key={field.name}>
                <label className="auth-label" htmlFor={field.name}>{field.label}</label>
                <input
                  id={field.name} className={`auth-input ${fieldErrors[field.name] ? "has-error" : ""}`}
                  type={field.type} name={field.name}
                  placeholder={field.placeholder}
                  value={form[field.name]} onChange={handleChange}
                  autoComplete={field.autoComplete} required
                />
                {fieldErrors[field.name] && (
                  <p className="auth-field-error" role="alert">{fieldErrors[field.name]}</p>
                )}
              </div>
            ))}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              shape="rectangular"
              theme="outline"
              text="continue_with"
              size="large"
            />
          </div>
          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}