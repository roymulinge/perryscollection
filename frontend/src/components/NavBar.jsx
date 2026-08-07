

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const { cart } = useCart();
  const { user, logout } = useAuth();
  const cartCount = cart.total_items;

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const navLinks = [
    { label: "Products", to: "/products" },
    { label: "Categories", to: "/categories" },
    { label: "New Arrivals", to: "/products?featured=true" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Archivo:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        :root{
          --paper:#FFFFFF;
          --cream:#F6F1E6;
          --ink:#221E19;
          --ink-soft:#5B564C;
          --brass:#A5793A;
          --brass-dark:#7C5A29;
          --oxide:#8B4632;
          --line:#E5DFD1;
        }

        .pc-nav {
          position: fixed; top: 0; left: 0; right: 0;
          z-index: 100;
          background: var(--paper);
          border-bottom: 1px solid var(--line);
        }

        .pc-nav-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 48px;
          height: 76px; display: flex; align-items: center;
          justify-content: space-between;
          font-family: 'Archivo', sans-serif;
        }

        /* ── Logo ── */
        .pc-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; flex-shrink: 0; }
        .pc-logo-mark {
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--ink); color: var(--paper);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Instrument Serif', serif; font-size: 20px; flex-shrink: 0;
        }
        .pc-logo-text { line-height: 1.05; }
        .pc-logo-name { font-family: 'Instrument Serif', serif; font-size: 19px; letter-spacing: 0.01em; color: var(--ink); display: block; }
        .pc-logo-sub { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: 0.18em; color: var(--ink-soft); text-transform: uppercase; }

        /* ── Center nav links ── */
        .pc-nav-links { display: flex; align-items: center; gap: 36px; list-style: none; margin: 0; padding: 0; }
        .pc-nav-links a {
          position: relative; padding-bottom: 4px; font-size: 14.5px;
          color: var(--ink-soft); text-decoration: none; transition: color 0.2s; white-space: nowrap;
        }
        .pc-nav-links a::after {
          content: ''; position: absolute; left: 0; bottom: 0; width: 0; height: 1px;
          background: var(--brass); transition: width 0.25s ease;
        }
        .pc-nav-links a:hover { color: var(--ink); }
        .pc-nav-links a:hover::after { width: 100%; }
        .pc-nav-links a.active { color: var(--ink); }
        .pc-nav-links a.active::after { width: 100%; background: var(--brass-dark); }

        /* ── Right-side actions ── */
        .pc-nav-actions { display: flex; align-items: center; gap: 26px; flex-shrink: 0; }

        .pc-cart-link {
          display: flex; align-items: center; gap: 7px;
          font-size: 14px; color: var(--ink-soft); text-decoration: none;
          transition: color 0.2s;
        }
        .pc-cart-link:hover { color: var(--ink); }
        .pc-cart-link i { font-size: 18px; }
        .pc-cart-count {
          background: var(--ink); color: var(--paper);
          font-family: 'IBM Plex Mono', monospace; font-size: 10px;
          width: 16px; height: 16px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .pc-account-link {
          display: flex; align-items: center; gap: 8px;
          font-size: 14px; color: var(--ink-soft); text-decoration: none;
          transition: color 0.2s;
        }
        .pc-account-link:hover { color: var(--ink); }
        .pc-account-avatar {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--ink); color: var(--paper);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Instrument Serif', serif; font-size: 12px; flex-shrink: 0;
        }

        .pc-signin-link { font-size: 14px; color: var(--ink-soft); text-decoration: none; transition: color 0.2s; }
        .pc-signin-link:hover { color: var(--ink); }

        .pc-logout-btn {
          font-size: 13px; color: var(--ink-soft); background: none; border: none;
          cursor: pointer; padding: 0; font-family: 'Archivo', sans-serif;
          transition: color 0.2s;
        }
        .pc-logout-btn:hover { color: var(--oxide); }

        /* ── Hamburger (mobile) ── */
        .pc-hamburger {
          display: none; width: 38px; height: 38px; background: transparent;
          border: 1px solid var(--line); border-radius: 2px; cursor: pointer;
          align-items: center; justify-content: center; color: var(--ink); font-size: 20px;
          transition: border-color 0.2s;
        }
        .pc-hamburger:hover { border-color: var(--brass); }

        /* ── Mobile menu ── */
        .pc-mobile-menu { display: none; background: var(--paper); border-top: 1px solid var(--line); padding: 1rem 24px 1.5rem; }
        .pc-mobile-menu.open { display: block; }
        .pc-mobile-links { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
        .pc-mobile-links a, .pc-mobile-links button {
          display: flex; align-items: center; gap: 10px;
          padding: 0.75rem 0.6rem; font-size: 15px; font-weight: 500;
          color: var(--ink-soft); text-decoration: none; width: 100%;
          text-align: left; background: transparent; border: none; cursor: pointer;
          font-family: 'Archivo', sans-serif;
          transition: background 0.2s, color 0.2s;
        }
        .pc-mobile-links a.active { color: var(--ink); background: var(--cream); }
        .pc-mobile-links a:hover, .pc-mobile-links button:hover { background: var(--cream); color: var(--ink); }
        .pc-mobile-user-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 0.85rem 0.6rem; margin-bottom: 0.5rem;
          border-bottom: 1px solid var(--line);
        }

        @media (max-width: 900px) {
          .pc-nav-inner { padding: 0 24px; }
          .pc-nav-links-center { display: none; }
          .pc-account-link span:not(.pc-account-avatar), .pc-signin-link, .pc-cart-link span.label { display: none; }
        }
        @media (max-width: 768px) {
          .pc-account-link, .pc-signin-link, .pc-logout-btn { display: none; }
          .pc-hamburger { display: flex; }
        }
        @media (max-width: 480px) {
          .pc-logo-text { display: none; }
          .pc-nav-actions { gap: 16px; }
        }
      `}</style>

      <nav className="pc-nav" role="navigation" aria-label="Main navigation">
        <div className="pc-nav-inner">

          {/* ── Logo ── */}
          <Link to="/" className="pc-logo" aria-label="Perry's Collection home">
            <div className="pc-logo-mark">P</div>
            <div className="pc-logo-text">
              <span className="pc-logo-name">Perry's Collection</span>
              <span className="pc-logo-sub">Est. Nairobi</span>
            </div>
          </Link>

          {/* ── Center nav links ── */}
          <div className="pc-nav-links-center">
            <ul className="pc-nav-links" role="list">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={location.pathname === link.to.split("?")[0] ? "active" : ""}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Right-side actions ──
              Cart stays visible at every width — only labels and
              the account/sign-in block fold into the hamburger. */}
          <div className="pc-nav-actions">

            <Link to="/cart" className="pc-cart-link" aria-label={`Cart, ${cartCount} items`}>
              <i className="ti ti-shopping-cart" aria-hidden="true" />
              <span className="label">Cart</span>
              {cartCount > 0 && (
                <span className="pc-cart-count">{cartCount > 9 ? "9+" : cartCount}</span>
              )}
            </Link>

            {user ? (
              <>
                <Link to="/account" className="pc-account-link">
                  <div className="pc-account-avatar">
                    {(user.full_name || user.email)[0].toUpperCase()}
                  </div>
                  <span>{user.full_name?.split(" ")[0] || "Account"}</span>
                </Link>
                <button className="pc-logout-btn" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="pc-signin-link">Sign in</Link>
                <Link to="/register" className="pc-signin-link">Register</Link>
              </>
            )}
          </div>

          {/* ── Hamburger (mobile only) ── */}
          <button
            className="pc-hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <i className={`ti ${menuOpen ? "ti-x" : "ti-menu-2"}`} aria-hidden="true" />
          </button>
        </div>

        {/* ── Mobile menu ── */}
        <div className={`pc-mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
          {user && (
            <div className="pc-mobile-user-chip">
              <div className="pc-account-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>
                {(user.full_name || user.email)[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#221E19" }}>
                  {user.full_name || "Account"}
                </div>
                <div style={{ fontSize: 12, color: "#5B564C" }}>{user.email}</div>
              </div>
            </div>
          )}

          <ul className="pc-mobile-links" role="list">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={location.pathname === link.to.split("?")[0] ? "active" : ""}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {user ? (
              <>
                <li><Link to="/orders"><i className="ti ti-receipt" aria-hidden="true" /> My Orders</Link></li>
                <li><Link to="/account"><i className="ti ti-user" aria-hidden="true" /> Account</Link></li>
                <li><button onClick={logout}><i className="ti ti-logout" aria-hidden="true" /> Logout</button></li>
              </>
            ) : (
              <>
                <li><Link to="/login"><i className="ti ti-login" aria-hidden="true" /> Sign in</Link></li>
                <li><Link to="/register"><i className="ti ti-user-plus" aria-hidden="true" /> Register</Link></li>
              </>
            )}
          </ul>
        </div>
      </nav>

      <div style={{ height: "76px" }} aria-hidden="true" />
    </>
  );
}