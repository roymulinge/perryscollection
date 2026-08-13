// src/pages/AccountPage.jsx
// Shows the logged-in user's profile. Redirects to /login if not authenticated.

import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { state: { from: "/account" } });
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <>
      <style>{`
        /* ---- Brand tokens, same as the homepage concept ---- */
        .account-page {
          --paper:#FFFFFF;
          --cream:#F6F1E6;
          --ink:#221E19;
          --ink-soft:#5B564C;
          --brass:#A5793A;
          --brass-dark:#7C5A29;
          --oxide:#8B4632;
          --line:#E5DFD1;

          min-height:100vh;
          background:var(--paper);
          padding:4rem 3rem;
        }
        .account-inner { max-width:680px; margin:0 auto; }
        .account-header { margin-bottom:2.5rem; }
        .account-eyebrow {
          font-family:'IBM Plex Mono',monospace;
          font-size:12px; font-weight:500; letter-spacing:0.14em;
          text-transform:uppercase; color:var(--brass-dark);
          display:block; margin-bottom:10px;
        }
        .account-title {
          font-family:'Instrument Serif',serif; font-weight:400;
          font-size:2.4rem; color:var(--ink); margin:0;
        }
        .account-card {
          background:var(--cream);
          border:1px solid var(--line);
          border-radius:4px;
          padding:28px 32px;
          margin-bottom:1.25rem;
        }
        .account-card h2 {
          font-family:'IBM Plex Mono',monospace;
          font-size:12px; font-weight:500; letter-spacing:0.1em;
          text-transform:uppercase; color:var(--brass-dark);
          margin:0 0 20px;
        }
        .account-row {
          display:flex; justify-content:space-between; align-items:center;
          padding:12px 0; border-bottom:1px solid var(--line);
        }
        .account-row:last-child { border-bottom:none; padding-bottom:0; }
        .account-row-label {
          font-family:'Archivo',sans-serif; font-size:13.5px; color:var(--ink-soft);
        }
        .account-row-value {
          font-family:'Archivo',sans-serif; font-size:14.5px; color:var(--ink); font-weight:500;
        }
        .account-actions { display:flex; flex-direction:column; gap:0.75rem; }
        .account-action-btn {
          display:flex; align-items:center; gap:12px;
          padding:16px 20px; background:var(--paper);
          border:1px solid var(--line); border-radius:4px;
          color:var(--ink); text-decoration:none;
          font-family:'Archivo',sans-serif; font-size:14px; font-weight:500;
          cursor:pointer; transition:background .2s, border-color .2s;
          width:100%; text-align:left;
        }
        .account-action-btn:hover {
          background:var(--cream); border-color:var(--brass);
        }
        .account-action-icon {
          width:36px; height:36px; border-radius:4px;
          background:var(--paper); border:1px solid var(--line);
          display:flex; align-items:center; justify-content:center;
          font-size:18px; color:var(--brass-dark); flex-shrink:0;
        }
        .account-action-sub { font-size:12px; color:var(--ink-soft); margin-top:2px; }
        .account-logout { color:var(--oxide); border-color:rgba(139,70,50,0.25); }
        .account-logout:hover { background:rgba(139,70,50,0.05); border-color:var(--oxide); }
        .account-logout .account-action-icon { color:var(--oxide); }
        .account-chevron { margin-left:auto; color:var(--ink-soft); }

        /* ---- Mobile ---- */
        @media (max-width: 640px) {
          .account-page { padding:2.5rem 1.25rem; }
          .account-title { font-size:1.9rem; }
          .account-card { padding:22px 20px; }
          .account-row { flex-direction:column; align-items:flex-start; gap:4px; }
          .account-action-btn { padding:14px 16px; }
        }
      `}</style>

      <div className="account-page">
        <div className="account-inner">
          <div className="account-header">
            <span className="account-eyebrow">My Account</span>
            <h1 className="account-title">
              Hello, {user.full_name?.split(" ")[0] || user.email}
            </h1>
          </div>

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
                {new Date(user.date_joined).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          <div className="account-card">
            <h2>Quick links</h2>
            <div className="account-actions">
              <Link to="/orders" className="account-action-btn">
                <div className="account-action-icon"><i className="ti ti-package" /></div>
                <div>
                  <div>My Orders</div>
                  <div className="account-action-sub">View your order history</div>
                </div>
                <i className="ti ti-chevron-right account-chevron" />
              </Link>

              <Link to="/cart" className="account-action-btn">
                <div className="account-action-icon"><i className="ti ti-shopping-cart" /></div>
                <div>
                  <div>Shopping Cart</div>
                  <div className="account-action-sub">View your current cart</div>
                </div>
                <i className="ti ti-chevron-right account-chevron" />
              </Link>

              <button className="account-action-btn account-logout" onClick={logout}>
                <div className="account-action-icon"><i className="ti ti-logout" /></div>
                <div>
                  <div>Sign out</div>
                  <div className="account-action-sub">Log out of your account</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}