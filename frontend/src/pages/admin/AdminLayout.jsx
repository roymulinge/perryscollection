// src/pages/admin/AdminLayout.jsx
// ─────────────────────────────────────────────────────────────────
// WHAT THIS FILE DOES:
// Every admin page imports this layout and wraps its content in it.
// AdminLayout provides three things:
//
//   1. AUTH GUARD
//      Checks if the user is logged in AND is an admin.
//      If not → redirects immediately. The page content never renders.
//
//   2. SIDEBAR
//      Navigation links to every admin section. Stays consistent
//      across all admin pages without repeating code.
//
//   3. CONTENT SHELL
//      Top bar with page title + user chip, and the main content area
//      where each page's unique content goes (the `children` prop).
//
// USAGE in any admin page:
//   <AdminLayout title="Products">
//     <YourPageContent />
//   </AdminLayout>
//
// `children` is a special React prop — whatever JSX you put between
// <AdminLayout> and </AdminLayout> tags appears where {children} is.
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// ── Sidebar navigation config ─────────────────────────────────────
// Defined outside the component so it's created ONCE, not on every
// render. If it were inside the component, JavaScript would create
// a new array object every single render — wasted memory.
const NAV_ITEMS = [
  { to: "/admin-panel",            icon: "ti-layout-dashboard", label: "Dashboard"    },
  { to: "/admin-panel/products",   icon: "ti-package",          label: "Products"     },
  { to: "/admin-panel/categories", icon: "ti-tag",              label: "Categories"   },
  { to: "/admin-panel/orders",     icon: "ti-receipt",          label: "Orders"       },
  { to: "/admin-panel/stock",      icon: "ti-alert-triangle",   label: "Low Stock"    },
  { to: "/inventory",              icon: "ti-robot",            label: "AI Inventory" },
];

// ── Component ─────────────────────────────────────────────────────
// { title, children } — destructured props.
// title:    string shown in the top bar e.g. "Products"
// children: the page-specific JSX rendered in the main content area
export default function AdminLayout({ title, children }) {

  // useAuth() reads from AuthContext — the global auth state.
  // user:    the logged-in user object, or null if not logged in
  // loading: true while AuthContext is calling getMe() on startup
  const { user, loading } = useAuth();

  // useNavigate() gives us a function to programmatically change URL.
  // We can't call it directly during render — only in useEffect or
  // event handlers. React enforces this to prevent render loops.
  const navigate = useNavigate();

  // useLocation() gives us the current URL path.
  // We use it for two things:
  //   1. Passing the current path to /login so it can redirect back
  //   2. Highlighting the active nav item in the sidebar
  const location = useLocation();

  // sidebarOpen: controls mobile sidebar visibility.
  // false = sidebar hidden (default on mobile)
  // true  = sidebar slides in when hamburger button is tapped
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── AUTH GUARD ────────────────────────────────────────────────
  // useEffect(callback, [deps]) runs the callback AFTER the component
  // renders, and again whenever anything in [deps] changes.
  //
  // WHY useEffect and not a plain if() during render?
  // navigate() cannot be called during render — React will throw an
  // error. It can only be called in useEffect or event handlers.
  // useEffect runs AFTER render, which is the safe time to navigate.
  useEffect(() => {

    // CRITICAL: don't do anything while loading is true.
    // When the app first loads, AuthContext calls getMe() to verify
    // the stored token. During that async call:
    //   loading = true, user = null
    // This looks identical to "not logged in" — if we don't wait,
    // we'd redirect every admin to /login on every page refresh.
    // `return` exits the useEffect early without doing anything.
    if (loading) return;

    // If loading is done and there's still no user → not logged in.
    // Navigate to /login and pass the current path as state so
    // LoginPage can redirect back here after a successful login.
    // { state: { from: "/admin-panel/products" } } for example.
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return; // stop here — don't run the isAdmin check below
    }

    // Check if the logged-in user has admin privileges.
    // We accept EITHER flag — is_staff (Django) OR is_shop_owner (custom).
    // || means OR: true if at least one is true.
    const isAdmin = user.is_staff || user.is_shop_owner;

    if (!isAdmin) {
      // Logged in but not an admin → send to homepage.
      // A regular customer who somehow knows the URL can't access this.
      navigate("/");
    }

  // Dependency array: this useEffect re-runs when ANY of these change.
  // user:              re-run if user logs in or out mid-session
  // loading:           re-run when the initial auth check finishes
  // navigate:          included because it's used inside (React best practice)
  // location.pathname: re-run on every page change (re-validates each time)
  }, [user, loading, navigate, location.pathname]);

  // ── RENDER GUARD ──────────────────────────────────────────────
  // This runs synchronously on every render (unlike useEffect).
  // It prevents the admin UI from flashing for one frame while
  // useEffect is queued but hasn't run yet.
  //
  // Three cases where we render nothing (null):
  //   1. loading is true   → still checking auth, don't show anything
  //   2. user is null      → not logged in, useEffect will redirect
  //   3. not an admin      → logged in but wrong role, will redirect
  //
  // null in React means "render nothing" — no DOM output at all.
  const isAdmin = user && (user.is_staff || user.is_shop_owner);
  if (loading || !isAdmin) {
    return null;
  }

  // ── If we reach here, user is authenticated AND is an admin ───
  // Safe to render the full admin layout.

  return (
    <>
      {/* All styles scoped inside a template literal string.
          This approach keeps styles co-located with the component.
          In a larger project you'd use CSS modules or styled-components. */}
      <style>{`

        /* ── Reset for admin shell ─────────────────────────────── */
        /* These override any global styles that might conflict     */
        * { box-sizing: border-box; }

        /* ── Outer shell ───────────────────────────────────────── */
        /* display:flex puts sidebar and main area side by side     */
        .ap-shell {
          display: flex;
          min-height: 100vh;         /* fill the full viewport height */
          background: #0a0603;       /* darkest background layer      */
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── Sidebar ───────────────────────────────────────────── */
        .ap-sidebar {
          width: 240px;              /* fixed sidebar width           */
          flex-shrink: 0;            /* sidebar never shrinks         */
          background: #110904;
          border-right: 1px solid rgba(196,148,72,0.12);
          display: flex;
          flex-direction: column;    /* stack brand, nav, footer      */
          position: sticky;          /* stays visible as content scrolls */
          top: 0;
          height: 100vh;             /* full viewport height          */
          overflow-y: auto;          /* scroll if nav items overflow  */
        }

        /* Brand/logo area at the top of the sidebar */
        .ap-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 20px 18px;
          border-bottom: 1px solid rgba(196,148,72,0.1);
          text-decoration: none;     /* remove link underline         */
        }

        /* The gold square icon next to "Perry's" */
        .ap-sidebar-icon {
          width: 34px; height: 34px;
          border-radius: 8px;
          background: linear-gradient(135deg, #c49448, #8b5e1a);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; color: #0a0603; flex-shrink: 0;
        }

        .ap-sidebar-name {
          font-size: 14px; font-weight: 600;
          color: #e8c87a; letter-spacing: 0.02em; line-height: 1.2;
        }

        .ap-sidebar-role {
          font-size: 10px; color: #7a5e3a;
          letter-spacing: 0.1em; text-transform: uppercase;
        }

        /* Nav section — fills remaining sidebar height */
        .ap-nav { padding: 16px 12px; flex: 1; }

        /* "MANAGEMENT" label above nav links */
        .ap-nav-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #5a3e22; padding: 0 8px; margin: 0 0 8px;
        }

        /* Each sidebar link */
        .ap-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px;
          text-decoration: none; font-size: 14px; font-weight: 500;
          color: #9a7a4a;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 2px;
        }

        .ap-nav-item i { font-size: 17px; flex-shrink: 0; }

        /* Hover state */
        .ap-nav-item:hover { background: rgba(196,148,72,0.08); color: #ddc799; }

        /* Active state — currently selected page */
        .ap-nav-item.active { background: rgba(196,148,72,0.12); color: #e8c87a; }

        /* Bottom of sidebar — "Back to store" link */
        .ap-sidebar-footer {
          padding: 16px 12px;
          border-top: 1px solid rgba(196,148,72,0.1);
        }

        .ap-sidebar-footer-link {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px;
          font-size: 13px; color: #7a5e3a; text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .ap-sidebar-footer-link:hover { background: rgba(196,148,72,0.06); color: #c4ab82; }

        /* ── Main content area ─────────────────────────────────── */
        .ap-main {
          flex: 1;                   /* takes all remaining width     */
          display: flex;
          flex-direction: column;    /* stack topbar then content     */
          min-width: 0;
          /* min-width:0 is a flex quirk fix. Without it, a flex child
             refuses to shrink below its content's natural width and
             can overflow the parent. Setting 0 allows proper shrinking. */
        }

        /* Top bar — sticky header at top of main area */
        .ap-topbar {
          height: 60px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 28px;
          border-bottom: 1px solid rgba(196,148,72,0.1);
          background: #0a0603;
          position: sticky; top: 0;
          z-index: 10;              /* stays above scrolling content  */
          gap: 16px;
        }

        .ap-topbar-title {
          font-size: 18px; font-weight: 600; color: #f0dba8;
          font-family: 'Cormorant Garamond', Georgia, serif; margin: 0;
        }

        .ap-topbar-right { display: flex; align-items: center; gap: 12px; }

        /* Pill showing the logged-in user's name */
        .ap-user-chip {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px;
          background: rgba(196,148,72,0.08);
          border: 1px solid rgba(196,148,72,0.15);
          border-radius: 20px; font-size: 13px; color: #c4ab82;
        }

        /* Hamburger button — hidden on desktop, shown on mobile */
        .ap-hamburger {
          display: none;             /* hidden by default (desktop)   */
          width: 36px; height: 36px;
          background: transparent;
          border: 1px solid rgba(196,148,72,0.2); border-radius: 8px;
          align-items: center; justify-content: center;
          color: #c4ab82; font-size: 18px; cursor: pointer;
        }

        /* Page content area */
        .ap-content { padding: 28px; flex: 1; }

        /* Dark overlay behind mobile sidebar when open */
        .ap-sidebar-overlay {
          display: none;             /* hidden until needed           */
          position: fixed; inset: 0; /* cover the entire screen      */
          background: rgba(0,0,0,0.6);
          z-index: 40;
        }
        .ap-sidebar-overlay.open { display: block; }

        /* ── Mobile responsive ─────────────────────────────────── */
        @media (max-width: 768px) {
          /* On mobile, sidebar slides in from left instead of being sticky */
          .ap-sidebar {
            position: fixed;
            left: -240px;           /* hidden off-screen by default   */
            top: 0; bottom: 0;
            z-index: 50;
            transition: left 0.25s ease; /* smooth slide animation   */
          }
          .ap-sidebar.open { left: 0; } /* slides in when open        */
          .ap-hamburger { display: flex; } /* show hamburger on mobile */
          .ap-content { padding: 16px; }
          .ap-topbar { padding: 0 16px; }
        }

        /* ── Reusable UI pieces ────────────────────────────────── */
        /* These classes are used by child pages (Products, Orders etc.)
           We define them here so every admin page gets them for free */

        .ap-card {
          background: #1a0f08;
          border: 1px solid rgba(196,148,72,0.15);
          border-radius: 12px; overflow: hidden;
        }

        /* Stats grid on the dashboard */
        .ap-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px; margin-bottom: 24px;
        }

        .ap-stat {
          background: #1a0f08;
          border: 1px solid rgba(196,148,72,0.15);
          border-radius: 12px; padding: 20px;
        }

        .ap-stat-label {
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #7a5e3a; margin-bottom: 8px;
        }

        .ap-stat-value {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 32px; font-weight: 600;
          color: #f0dba8; line-height: 1;
        }

        .ap-stat-sub { font-size: 12px; color: #7a5e3a; margin-top: 4px; }
        .ap-stat-icon { font-size: 22px; color: #c49448; margin-bottom: 12px; }

        /* Data table */
        .ap-table-wrap { overflow-x: auto; }

        .ap-table { width: 100%; border-collapse: collapse; font-size: 13px; }

        .ap-table th {
          padding: 10px 14px; text-align: left;
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #7a5e3a;
          border-bottom: 1px solid rgba(196,148,72,0.1);
          white-space: nowrap;
        }

        .ap-table td {
          padding: 12px 14px; color: #ddc799;
          border-bottom: 1px solid rgba(196,148,72,0.06);
          vertical-align: middle;
        }

        .ap-table tr:last-child td { border-bottom: none; }
        .ap-table tr:hover td { background: rgba(196,148,72,0.03); }

        /* Status badges */
        .ap-badge {
          display: inline-flex; align-items: center;
          padding: 3px 8px; border-radius: 999px;
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.04em; white-space: nowrap;
        }
        .ap-badge-green  { background: rgba(16,185,129,0.1);  color: #34d399; }
        .ap-badge-amber  { background: rgba(245,158,11,0.1);  color: #fbbf24; }
        .ap-badge-red    { background: rgba(239,68,68,0.1);   color: #f87171; }
        .ap-badge-blue   { background: rgba(59,130,246,0.1);  color: #60a5fa; }
        .ap-badge-purple { background: rgba(139,92,246,0.1);  color: #a78bfa; }
        .ap-badge-gray   { background: rgba(156,163,175,0.1); color: #9ca3af; }

        /* Action buttons */
        .ap-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          border: none; transition: opacity 0.15s, transform 0.15s;
          text-decoration: none; white-space: nowrap;
        }
        .ap-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .ap-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ap-btn-primary  { background: linear-gradient(135deg, #c49448, #8b5e1a); color: #0a0603; }
        .ap-btn-secondary { background: rgba(196,148,72,0.1); border: 1px solid rgba(196,148,72,0.2); color: #c4ab82; }
        .ap-btn-danger   { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; }
        .ap-btn-sm       { padding: 5px 10px; font-size: 12px; }

        /* Form controls */
        .ap-input {
          height: 42px; padding: 0 12px; width: 100%;
          background: #0a0603;
          border: 1px solid rgba(196,148,72,0.2); border-radius: 8px;
          color: #f0dba8; font-size: 14px; outline: none;
          transition: border-color 0.15s;
        }
        .ap-input::placeholder { color: #5a3e22; }

        .ap-select {
          height: 42px; padding: 0 12px; width: 100%;
          background: #0a0603;
          border: 1px solid rgba(196,148,72,0.2); border-radius: 8px;
          color: #f0dba8; font-size: 14px; outline: none;
          cursor: pointer; appearance: none;
        }

        .ap-textarea {
          padding: 10px 12px; width: 100%;
          background: #0a0603;
          border: 1px solid rgba(196,148,72,0.2); border-radius: 8px;
          color: #f0dba8; font-size: 14px; outline: none;
          resize: vertical; min-height: 100px; font-family: inherit;
        }

        /* Focus ring — same gold glow for all inputs */
        .ap-textarea:focus, .ap-input:focus, .ap-select:focus {
          border-color: #c49448;
          box-shadow: 0 0 0 3px rgba(196,148,72,0.1);
        }

        .ap-form-label {
          display: block; font-size: 12px; font-weight: 600;
          letter-spacing: 0.07em; text-transform: uppercase;
          color: #7a5e3a; margin-bottom: 6px;
        }

        .ap-form-group { margin-bottom: 18px; }

        /* Two-column form layout */
        .ap-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) { .ap-form-row { grid-template-columns: 1fr; } }

        /* Search bar row */
        .ap-search-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; align-items: center; }
        .ap-search-input {
          flex: 1; min-width: 200px; height: 40px; padding: 0 12px;
          background: #0a0603;
          border: 1px solid rgba(196,148,72,0.2); border-radius: 8px;
          color: #f0dba8; font-size: 14px; outline: none;
        }
        .ap-search-input:focus { border-color: #c49448; }

        /* Empty state panel */
        .ap-empty { padding: 48px 24px; text-align: center; color: #7a5e3a; }
        .ap-empty i { font-size: 40px; color: #5a3e22; margin-bottom: 12px; display: block; }
        .ap-empty p { font-size: 14px; margin: 0 0 16px; }

        /* Toast — temporary success/error message bottom-right */
        .ap-toast {
          position: fixed; bottom: 24px; right: 24px;
          padding: 12px 18px; border-radius: 10px;
          font-size: 14px; font-weight: 500; z-index: 999;
          animation: slideUp 0.25s ease; max-width: 340px;
        }
        .ap-toast-success { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; }
        .ap-toast-error   { background: rgba(239,68,68,0.15);  border: 1px solid rgba(239,68,68,0.3);  color: #f87171; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Pagination bar */
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

        /* Shimmer skeleton for loading states */
        .skeleton {
          background: linear-gradient(90deg, #1a0f08, #2c1a0e, #1a0f08);
          background-size: 200% 100%;
          animation: shimmer 1.4s linear infinite;
        }
        @keyframes shimmer { to { background-position: -200% 0; } }

      `}</style>

      {/* ── Mobile sidebar overlay ────────────────────────────────
          Clicking the dark overlay closes the sidebar.
          This is the standard mobile drawer pattern.            */}
      <div
        className={`ap-sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Outer shell ─────────────────────────────────────────── */}
      <div className="ap-shell">

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside className={`ap-sidebar ${sidebarOpen ? "open" : ""}`}>

          {/* Brand — clicking goes to the public store */}
          <Link to="/" className="ap-sidebar-brand">
            <div className="ap-sidebar-icon">
              <i className="ti ti-hanger" />
            </div>
            <div>
              <div className="ap-sidebar-name">Perry's</div>
              <div className="ap-sidebar-role">Admin Panel</div>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="ap-nav">
            <p className="ap-nav-label">Management</p>

            {NAV_ITEMS.map((item) => {
              // Active detection logic:
              // Dashboard (/admin-panel) needs EXACT match
              // because all other admin routes START WITH /admin-panel too.
              // If we used startsWith for dashboard, it would always be active.
              // For all other routes, startsWith works correctly.
              const isActive = item.to === "/admin-panel"
                ? location.pathname === "/admin-panel"
                : location.pathname.startsWith(item.to);

              return (
                <Link
                  key={item.to}           // React needs a unique key for lists
                  to={item.to}
                  className={`ap-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => setSidebarOpen(false)} // close mobile sidebar on nav
                >
                  <i className={`ti ${item.icon}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="ap-sidebar-footer">
            <Link to="/" className="ap-sidebar-footer-link">
              <i className="ti ti-arrow-left" /> Back to store
            </Link>
          </div>
        </aside>

        {/* ── MAIN AREA ────────────────────────────────────────── */}
        <div className="ap-main">

          {/* Top bar */}
          <header className="ap-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

              {/* Hamburger — only visible on mobile (CSS hides it on desktop) */}
              <button
                className="ap-hamburger"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <i className="ti ti-menu-2" />
              </button>

              {/* Page title — passed as a prop from each admin page */}
              <h1 className="ap-topbar-title">{title}</h1>
            </div>

            <div className="ap-topbar-right">
              {/* User chip — shows first name or email as fallback.
                  optional chaining (?.) prevents crash if full_name is null.
                  split(" ")[0] gets just the first word e.g. "Perry" from "Perry Admin" */}
              <div className="ap-user-chip">
                <i className="ti ti-user-circle" style={{ fontSize: 15 }} />
                {user.full_name?.split(" ")[0] || user.email}
              </div>
            </div>
          </header>

          {/* Page content — this is where each admin page renders */}
          <main className="ap-content">
            {children}
          </main>
        </div>

      </div>
    </>
  );
}