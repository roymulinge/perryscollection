// src/pages/RegisterPage.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();

  const [form, setForm] = useState({
    full_name: "",   // maps to CustomUser.full_name on the backend
    email: "",
    password: "",
    password2: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  // fieldErrors: { email: "Email already registered", password: "Too short" }
  // These come from Django serializer validation errors

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear field error as user types — better UX than keeping stale errors
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.password !== form.password2) {
      setFieldErrors({ password2: "Passwords do not match." });
      return; // stop here, no API call
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      const data = await register(form);
      // On success: { user: {...}, access: "...", refresh: "..." }

      setAuth(data.user, { access: data.access, refresh: data.refresh });
      navigate("/");
    } catch (err) {
      // Django DRF returns field errors as: { email: ["Already exists."], password: ["Too short."] }
      if (err.response?.data && typeof err.response.data === "object") {
        const djangoErrors = err.response.data;

        // Check if it's field-level errors (object with arrays) or a general error
        const hasFieldErrors = Object.values(djangoErrors).some(Array.isArray);
        if (hasFieldErrors) {
          // Flatten arrays: { email: ["msg1", "msg2"] } → { email: "msg1 msg2" }
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

  return (
    <>
      <style>{`
        /* Reusing the same auth styles as LoginPage */
        .auth-page { min-height:100vh; background:radial-gradient(ellipse at 30% 70%, #2a1708 0%, #120a06 60%); display:flex; justify-content:center; align-items:center; padding:20px; }
        .auth-card { width:100%; max-width:480px; background:#1a0f08; border:1px solid rgba(196,148,72,0.2); border-radius:20px; padding:44px 40px; box-shadow:0 24px 64px rgba(0,0,0,0.5); }
        .auth-logo { text-align:center; margin-bottom:28px; }
        .auth-logo-circle { width:72px; height:72px; border-radius:50%; margin:0 auto 12px; background:linear-gradient(135deg,#c49448,#8b5e1a); display:flex; align-items:center; justify-content:center; font-size:30px; font-weight:700; color:#120a06; font-family:Georgia,serif; }
        .auth-logo-name { font-size:14px; color:#9a7a4a; letter-spacing:0.12em; text-transform:uppercase; }
        .auth-title { font-family:Georgia,serif; font-size:2rem; font-weight:400; color:#f0dba8; text-align:center; margin:0 0 8px; }
        .auth-subtitle { text-align:center; color:#7a5e3a; font-size:14px; margin:0 0 32px; }
        .auth-error { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); color:#fca5a5; padding:12px 16px; border-radius:10px; font-size:14px; margin-bottom:20px; text-align:center; }
        .auth-field { margin-bottom:16px; }
        .auth-label { display:block; font-size:12px; font-weight:600; color:#9a7a4a; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:7px; }
        .auth-input { width:100%; height:52px; padding:0 16px; border-radius:10px; border:1px solid rgba(196,148,72,0.2); background:#120a06; color:#f0dba8; font-size:15px; outline:none; transition:border-color 0.2s,box-shadow 0.2s; }
        .auth-input.has-error { border-color:rgba(239,68,68,0.5); }
        .auth-input::placeholder { color:#5a3e22; }
        .auth-input:focus { border-color:#c49448; box-shadow:0 0 0 3px rgba(196,148,72,0.12); }
        .auth-field-error { font-size:12px; color:#fca5a5; margin-top:5px; }
        .auth-btn { width:100%; height:52px; margin-top:8px; border:none; border-radius:10px; background:linear-gradient(135deg,#c49448,#8b5e1a); color:#120a06; font-size:15px; font-weight:700; cursor:pointer; transition:opacity 0.2s,transform 0.15s; }
        .auth-btn:hover:not(:disabled) { opacity:0.88; transform:translateY(-2px); }
        .auth-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .auth-footer { margin-top:24px; text-align:center; color:#7a5e3a; font-size:14px; }
        .auth-footer a { color:#c49448; text-decoration:none; font-weight:600; }
        .auth-footer a:hover { color:#e8c87a; }
        @media(max-width:520px){ .auth-card{ padding:32px 24px; } }
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

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}