// src/pages/AccountPage.jsx
// Shows the logged-in user's profile. Redirects to /login if not authenticated.

import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If we've finished loading and there's no user, redirect to login
    if (!loading && !user) {
      // Pass { state: { from: "/account" } } so LoginPage can redirect back
      navigate("/login", { state: { from: "/account" } });
    }
  }, [user, loading, navigate]);

  // Still checking auth — show nothing to avoid flash
  if (loading || !user) return null;

  return (
    <>
      <style>{`
        .account-page { min-height:100vh; background:#120a06; padding:3rem 1.5rem; }
        .account-inner { max-width:680px; margin:0 auto; }
        .account-header { margin-bottom:2.5rem; }
        .account-eyebrow { font-size:12px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:#c49448; display:block; margin-bottom:8px; }
        .account-title { font-family:Georgia,serif; font-size:2.2rem; font-weight:400; color:#f0dba8; margin:0; }
        .account-card { background:#1a0f08; border:1px solid rgba(196,148,72,0.18); border-radius:16px; padding:28px 32px; margin-bottom:1.25rem; }
        .account-card h2 { font-size:14px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#c49448; margin:0 0 20px; }
        .account-row { display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid rgba(196,148,72,0.08); }
        .account-row:last-child { border-bottom:none; padding-bottom:0; }
        .account-row-label { font-size:13px; color:#7a5e3a; }
        .account-row-value { font-size:14px; color:#ddc799; font-weight:500; }
        .account-actions { display:flex; flex-direction:column; gap:0.75rem; }
        .account-action-btn { display:flex; align-items:center; gap:12px; padding:16px 20px; background:transparent; border:1px solid rgba(196,148,72,0.15); border-radius:12px; color:#c4ab82; text-decoration:none; font-size:14px; font-weight:500; cursor:pointer; transition:background 0.2s,border-color 0.2s,color 0.2s; width:100%; text-align:left; }
        .account-action-btn:hover { background:rgba(196,148,72,0.06); border-color:rgba(196,148,72,0.3); color:#e8c87a; }
        .account-action-icon { width:36px; height:36px; border-radius:8px; background:rgba(196,148,72,0.1); display:flex; align-items:center; justify-content:center; font-size:18px; color:#c49448; flex-shrink:0; }
        .account-logout { color:#ef4444; border-color:rgba(239,68,68,0.2); }
        .account-logout:hover { background:rgba(239,68,68,0.06); border-color:rgba(239,68,68,0.35); color:#f87171; }
      `}</style>

      <div className="account-page">
        <div className="account-inner">
          <div className="account-header">
            <span className="account-eyebrow">My Account</span>
            <h1 className="account-title">
              {/* Show first name if full_name has a space, otherwise show email */}
              Hello, {user.full_name?.split(" ")[0] || user.email} 👋
            </h1>
          </div>

          {/* Profile details */}
          <div className="account-card">
            <h2>Profile</h2>
            <div className="account-row">
              <span className="account-row-label">Full name</span>
              <span className="account-row-value">{user.full_name || "—"}</span>
            </div>
            <div className="account-row">
              <span className="account-row-label">Email</span>
              <span className="account-row-value">{user.email}</span>
            </div>
            <div className="account-row">
              <span className="account-row-label">Member since</span>
              <span className="account-row-value">
                {/* Format the date nicely: "June 2025" */}
                {new Date(user.date_joined).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="account-card">
            <h2>Quick links</h2>
            <div className="account-actions">
              <Link to="/orders" className="account-action-btn">
                <div className="account-action-icon"><i className="ti ti-package" /></div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>My Orders</div>
                  <div style={{ fontSize: 12, color: "#7a5e3a" }}>View your order history</div>
                </div>
                <i className="ti ti-chevron-right" style={{ marginLeft: "auto", color: "#5a3e22" }} />
              </Link>

              <Link to="/cart" className="account-action-btn">
                <div className="account-action-icon"><i className="ti ti-shopping-cart" /></div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Shopping Cart</div>
                  <div style={{ fontSize: 12, color: "#7a5e3a" }}>View your current cart</div>
                </div>
                <i className="ti ti-chevron-right" style={{ marginLeft: "auto", color: "#5a3e22" }} />
              </Link>

              <button className="account-action-btn account-logout" onClick={logout}>
                <div className="account-action-icon" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                  <i className="ti ti-logout" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Sign out</div>
                  <div style={{ fontSize: 12, color: "#7a5e3a" }}>Log out of your account</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}