// src/pages/admin/AdminLayout.jsx
// ─────────────────────────────────────────────────────────────────
// Every admin page is wrapped by this layout.
// It gives us:
//   1. Auth guard — redirects to /login if not an admin
//   2. Sidebar navigation — consistent on every admin page
//   3. The content area on the right
//
// PATTERN: "Layout component"
// Instead of repeating the sidebar in every page, we render it once
// here and pass the page content as `children`.
// Usage: <AdminLayout title="Products"><YourPage /></AdminLayout>
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Sidebar navigation items
const NAV_ITEMS = [
  { to: "/admin-panel",            icon: "ti-layout-dashboard", label: "Dashboard"  },
  { to: "/admin-panel/products",   icon: "ti-package",          label: "Products"   },
  { to: "/admin-panel/categories", icon: "ti-tag",              label: "Categories" },
  { to: "/admin-panel/orders",     icon: "ti-receipt",          label: "Orders"     },
  { to: "/admin-panel/stock",      icon: "ti-alert-triangle",   label: "Low Stock"  },
];

export default function AdminLayout({ title, children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────
  // useEffect runs AFTER the component renders.
  // We check auth here (not during render) to avoid hydration issues.
  useEffect(() => {
    if (loading) return; // still checking — do nothing yet

    if (!user) {
      // Not logged in at all
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    if (!user.is_staff && !user.is_shop_owner) {
      // Logged in but not an admin — send them home
      navigate("/");
    }
  }, [user, loading, navigate, location.pathname]);

  // Render nothing while auth is being checked to prevent flash
  if (loading || !user || (!user.is_staff && !user.is_shop_owner)) {
    return null;
  }

  return (
    <>
      <style>{`
        /* ── Admin shell ───────────────────────────────────────── */
        .ap-shell {
          display: flex;
          min-height: 100vh;
          background: #0a0603;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── Sidebar ───────────────────────────────────────────── */
        .ap-sidebar {
          width: 240px;
          flex-shrink: 0;
          background: #110904;
          border-right: 1px solid rgba(196,148,72,0.12);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }

        .ap-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 20px 18px;
          border-bottom: 1px solid rgba(196,148,72,0.1);
          text-decoration: none;
        }

        .ap-sidebar-icon {
          width: 34px; height: 34px;
          border-radius: 8px;
          background: linear-gradient(135deg, #c49448, #8b5e1a);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; color: #0a0603; flex-shrink: 0;
        }

        .ap-sidebar-name {
          font-size: 14px;
          font-weight: 600;
          color: #e8c87a;
          letter-spacing: 0.02em;
          line-height: 1.2;
        }

        .ap-sidebar-role {
          font-size: 10px;
          color: #7a5e3a;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .ap-nav {
          padding: 16px 12px;
          flex: 1;
        }

        .ap-nav-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #5a3e22;
          padding: 0 8px;
          margin: 0 0 8px;
        }

        .ap-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          color: #9a7a4a;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 2px;
        }

        .ap-nav-item i { font-size: 17px; flex-shrink: 0; }

        .ap-nav-item:hover {
          background: rgba(196,148,72,0.08);
          color: #ddc799;
        }

        .ap-nav-item.active {
          background: rgba(196,148,72,0.12);
          color: #e8c87a;
        }

        .ap-sidebar-footer {
          padding: 16px 12px;
          border-top: 1px solid rgba(196,148,72,0.1);
        }

        .ap-sidebar-footer-link {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px;
          font-size: 13px; color: #7a5e3a;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }

        .ap-sidebar-footer-link:hover { background: rgba(196,148,72,0.06); color: #c4ab82; }

        /* ── Main area ─────────────────────────────────────────── */
        .ap-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0; /* prevents flex child from overflowing */
        }

        /* Top bar */
        .ap-topbar {
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          border-bottom: 1px solid rgba(196,148,72,0.1);
          background: #0a0603;
          position: sticky;
          top: 0;
          z-index: 10;
          gap: 16px;
        }

        .ap-topbar-title {
          font-size: 18px;
          font-weight: 600;
          color: #f0dba8;
          font-family: 'Cormorant Garamond', Georgia, serif;
          margin: 0;
        }

        .ap-topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ap-user-chip {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px;
          background: rgba(196,148,72,0.08);
          border: 1px solid rgba(196,148,72,0.15);
          border-radius: 20px;
          font-size: 13px; color: #c4ab82;
        }

        .ap-hamburger {
          display: none;
          width: 36px; height: 36px;
          background: transparent;
          border: 1px solid rgba(196,148,72,0.2);
          border-radius: 8px;
          align-items: center; justify-content: center;
          color: #c4ab82; font-size: 18px; cursor: pointer;
        }

        /* Content area */
        .ap-content {
          padding: 28px;
          flex: 1;
        }

        /* Mobile overlay sidebar */
        .ap-sidebar-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 40;
        }

        .ap-sidebar-overlay.open { display: block; }

        @media (max-width: 768px) {
          .ap-sidebar {
            position: fixed;
            left: -240px;
            top: 0; bottom: 0;
            z-index: 50;
            transition: left 0.25s ease;
          }
          .ap-sidebar.open { left: 0; }
          .ap-hamburger { display: flex; }
          .ap-content { padding: 16px; }
          .ap-topbar { padding: 0 16px; }
        }

        /* ── Reusable admin UI pieces ──────────────────────────── */
        .ap-card {
          background: #1a0f08;
          border: 1px solid rgba(196,148,72,0.15);
          border-radius: 12px;
          overflow: hidden;
        }

        .ap-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .ap-stat {
          background: #1a0f08;
          border: 1px solid rgba(196,148,72,0.15);
          border-radius: 12px;
          padding: 20px;
        }

        .ap-stat-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #7a5e3a;
          margin-bottom: 8px;
        }

        .ap-stat-value {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 32px;
          font-weight: 600;
          color: #f0dba8;
          line-height: 1;
        }

        .ap-stat-sub {
          font-size: 12px;
          color: #7a5e3a;
          margin-top: 4px;
        }

        .ap-stat-icon {
          font-size: 22px;
          color: #c49448;
          margin-bottom: 12px;
        }

        /* Table */
        .ap-table-wrap { overflow-x: auto; }

        .ap-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .ap-table th {
          padding: 10px 14px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7a5e3a;
          border-bottom: 1px solid rgba(196,148,72,0.1);
          white-space: nowrap;
        }

        .ap-table td {
          padding: 12px 14px;
          color: #ddc799;
          border-bottom: 1px solid rgba(196,148,72,0.06);
          vertical-align: middle;
        }

        .ap-table tr:last-child td { border-bottom: none; }
        .ap-table tr:hover td { background: rgba(196,148,72,0.03); }

        /* Badges */
        .ap-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .ap-badge-green  { background: rgba(16,185,129,0.1);  color: #34d399; }
        .ap-badge-amber  { background: rgba(245,158,11,0.1);  color: #fbbf24; }
        .ap-badge-red    { background: rgba(239,68,68,0.1);   color: #f87171; }
        .ap-badge-blue   { background: rgba(59,130,246,0.1);  color: #60a5fa; }
        .ap-badge-purple { background: rgba(139,92,246,0.1);  color: #a78bfa; }
        .ap-badge-gray   { background: rgba(156,163,175,0.1); color: #9ca3af; }

        /* Buttons */
        .ap-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          border: none; transition: opacity 0.15s, transform 0.15s;
          text-decoration: none; white-space: nowrap;
        }
        .ap-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .ap-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ap-btn-primary {
          background: linear-gradient(135deg, #c49448, #8b5e1a);
          color: #0a0603;
        }
        .ap-btn-secondary {
          background: rgba(196,148,72,0.1);
          border: 1px solid rgba(196,148,72,0.2);
          color: #c4ab82;
        }
        .ap-btn-danger {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
        }
        .ap-btn-sm { padding: 5px 10px; font-size: 12px; }

        /* Form inputs inside admin */
        .ap-input {
          height: 42px; padding: 0 12px; width: 100%;
          background: #0a0603;
          border: 1px solid rgba(196,148,72,0.2);
          border-radius: 8px;
          color: #f0dba8; font-size: 14px; outline: none;
          transition: border-color 0.15s;
        }
        .ap-input::placeholder { color: #5a3e22; }
        .ap-input:focus { border-color: #c49448; }

        .ap-select {
          height: 42px; padding: 0 12px; width: 100%;
          background: #0a0603;
          border: 1px solid rgba(196,148,72,0.2);
          border-radius: 8px;
          color: #f0dba8; font-size: 14px; outline: none;
          cursor: pointer; appearance: none;
        }

        .ap-textarea {
          padding: 10px 12px; width: 100%;
          background: #0a0603;
          border: 1px solid rgba(196,148,72,0.2);
          border-radius: 8px;
          color: #f0dba8; font-size: 14px; outline: none;
          resize: vertical; min-height: 100px;
          font-family: inherit;
        }
        .ap-textarea:focus, .ap-input:focus, .ap-select:focus {
          border-color: #c49448;
          box-shadow: 0 0 0 3px rgba(196,148,72,0.1);
        }

        .ap-form-label {
          display: block;
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.07em; text-transform: uppercase;
          color: #7a5e3a; margin-bottom: 6px;
        }

        .ap-form-group { margin-bottom: 18px; }
        .ap-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 600px) { .ap-form-row { grid-template-columns: 1fr; } }

        /* Search bar */
        .ap-search-bar {
          display: flex; gap: 10px; flex-wrap: wrap;
          margin-bottom: 20px; align-items: center;
        }

        .ap-search-input {
          flex: 1; min-width: 200px;
          height: 40px; padding: 0 12px;
          background: #0a0603;
          border: 1px solid rgba(196,148,72,0.2); border-radius: 8px;
          color: #f0dba8; font-size: 14px; outline: none;
        }
        .ap-search-input:focus { border-color: #c49448; }

        /* Empty / error state */
        .ap-empty {
          padding: 48px 24px;
          text-align: center;
          color: #7a5e3a;
        }
        .ap-empty i { font-size: 40px; color: #5a3e22; margin-bottom: 12px; display: block; }
        .ap-empty p { font-size: 14px; margin: 0 0 16px; }

        /* Toast notification */
        .ap-toast {
          position: fixed; bottom: 24px; right: 24px;
          padding: 12px 18px; border-radius: 10px;
          font-size: 14px; font-weight: 500;
          z-index: 999;
          animation: slideUp 0.25s ease;
          max-width: 340px;
        }
        .ap-toast-success { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; }
        .ap-toast-error   { background: rgba(239,68,68,0.15);  border: 1px solid rgba(239,68,68,0.3);  color: #f87171; }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        /* Pagination */
        .ap-pagination {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 8px; padding: 16px;
          border-top: 1px solid rgba(196,148,72,0.08);
        }
        .ap-page-btn {
          height: 32px; min-width: 32px; padding: 0 10px;
          background: transparent;
          border: 1px solid rgba(196,148,72,0.2); border-radius: 6px;
          color: #9a7a4a; font-size: 13px; cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .ap-page-btn:hover:not(:disabled) { background: rgba(196,148,72,0.08); color: #e8c87a; }
        .ap-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ap-page-info { font-size: 13px; color: #7a5e3a; }
      `}</style>

      {/* Mobile overlay */}
      <div
        className={`ap-sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="ap-shell">

        {/* ── Sidebar ── */}
        <aside className={`ap-sidebar ${sidebarOpen ? "open" : ""}`}>
          <Link to="/" className="ap-sidebar-brand">
            <div className="ap-sidebar-icon">
              <i className="ti ti-hanger" />
            </div>
            <div>
              <div className="ap-sidebar-name">Perry's</div>
              <div className="ap-sidebar-role">Admin Panel</div>
            </div>
          </Link>

          <nav className="ap-nav">
            <p className="ap-nav-label">Management</p>
            {NAV_ITEMS.map((item) => {
              // exact match for dashboard, startsWith for nested pages
              const isActive = item.to === "/admin-panel"
                ? location.pathname === "/admin-panel"
                : location.pathname.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`ap-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <i className={`ti ${item.icon}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ap-sidebar-footer">
            <Link to="/" className="ap-sidebar-footer-link">
              <i className="ti ti-arrow-left" /> Back to store
            </Link>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="ap-main">
          <header className="ap-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="ap-hamburger" onClick={() => setSidebarOpen(true)}>
                <i className="ti ti-menu-2" />
              </button>
              <h1 className="ap-topbar-title">{title}</h1>
            </div>
            <div className="ap-topbar-right">
              <div className="ap-user-chip">
                <i className="ti ti-user-circle" style={{ fontSize: 15 }} />
                {user.full_name?.split(" ")[0] || user.email}
              </div>
            </div>
          </header>

          <main className="ap-content">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}