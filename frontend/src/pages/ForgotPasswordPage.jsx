import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export default function ForgotPasswordPage(){
 const navigate = useNavigate();

 const [email, setEmail] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");

 async function handleSubmit(e){
    e.preventDefault();
    setLoading(true);
    setError("");

    try{
        await forgotPassword(email);

        navigate('/verify-code', {state: { email }});
    }catch(err){
        setError(
            err.response?.data?.error || 
            'Something went wrong. Please try again.'
        );
    }finally{
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
        .auth-footer { margin-top:24px; text-align:center; color:#7a5e3a; font-size:14px; }
        .auth-footer a { color:#c49448; text-decoration:none; font-weight:600; }
        .auth-footer a:hover { color:#e8c87a; }
        .auth-hint { background:rgba(196,148,72,0.06); border:1px solid rgba(196,148,72,0.15); border-radius:10px; padding:12px 16px; font-size:13px; color:#9a7a4a; margin-bottom:24px; line-height:1.5; }
      `}</style>

      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-circle">P</div>
            <div className="auth-logo-name">Perry's Collection</div>
          </div>

          <h1 className="auth-title">Forgot password?</h1>
          <p className="auth-subtitle">Enter your email and we'll send you a reset code</p>

          <div className="auth-hint">
            A 6-digit code will be sent to your email address.
            It expires in 10 minutes.
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email address</label>
              <input
                id="email"
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Sending code…" : "Send reset code"}
            </button>
          </form>

          <p className="auth-footer">
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}