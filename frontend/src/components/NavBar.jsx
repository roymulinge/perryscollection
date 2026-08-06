// src/components/NavBar.jsx
// ─────────────────────────────────────────────────────────────────
// WHAT CHANGED:
// - Navbar background is now white (was dark brown/black)
// - All text/border colors flipped to dark-on-white for contrast
// - "Login" renamed to "Sign in"
// - Login/Register both now use the shared .btn-outline-shimmer
//   button style (white bg, theme text, gradient shimmer sweeps
//   in on hover) instead of two different custom-styled links
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import "../styles/buttons.css";

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const { cart } = useCart();
  const { user, logout } = useAuth();
  const cartCount = cart.total_items;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
        .pc-nav {
          position: fixed; top: 0; left: 0; right: 0;
          z-index: 100;
          transition: background 0.3s, box-shadow 0.3s;
          background: #ffffff;
          border-bottom: 1px solid rgba(196,148,72,0.25);
          box-shadow: ${scrolled ? "0 2px 20px rgba(0,0,0,0.08)" : "none"};
        }

        .pc-nav-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 1.5rem;
          height: 72px; display: flex; align-items: center;
          justify-content: space-between;
        }

        /* ── Logo zone ── */
        .pc-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
        .pc-logo-mark {
          width: 38px; height: 38px; border-radius: 50%;
          background: linear-gradient(135deg, #c49448 0%, #8b5e1a 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; font-weight: 700; color: #120a06;
          font-family: Georgia, serif; flex-shrink: 0;
        }
        .pc-logo-text { display: flex; flex-direction: column; line-height: 1.15; }
        .pc-logo-name { font-size: 15px; font-weight: 600; color: #4a2f10; letter-spacing: 0.04em; font-family: Georgia, serif; }
        .pc-logo-sub { font-size: 10px; font-weight: 400; color: #8b5e1a; letter-spacing: 0.14em; text-transform: uppercase; }

        /* ── Center nav zone ── */
        .pc-nav-center {
          display: flex; align-items: center; flex: 1;
          justify-content: center;
          gap: 0.25rem;
          margin: 0 2rem;
        }

        .pc-nav-links { display: flex; align-items: center; gap: 0.5rem; list-style: none; margin: 0; padding: 0; }
        .pc-nav-links li { position: relative; }
        .pc-nav-links a {
          display: block; padding: 0.55rem 1rem; font-size: 14px; font-weight: 500;
          color: #5a3e22; text-decoration: none; border-radius: 6px;
          letter-spacing: 0.02em; transition: color 0.2s, background 0.2s; white-space: nowrap;
        }
        .pc-nav-links a:hover { color: #8b5e1a; background: rgba(196,148,72,0.08); }

        .pc-nav-links a.active { color: #8b5e1a; }
        .pc-nav-links a.active::after {
          content: '';
          position: absolute;
          left: 1rem; right: 1rem; bottom: 2px;
          height: 2px;
          background: linear-gradient(90deg, #c49448, #8b5e1a);
          border-radius: 2px;
        }

        /* ── Right-side actions zone ── */
        .pc-nav-actions { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }

        .pc-cart-link {
          display: flex; align-items: center; gap: 7px;
          height: 38px; padding: 0 12px;
          border-radius: 8px;
          background: rgba(196,148,72,0.06);
          border: 1px solid rgba(196,148,72,0.3);
          color: #5a3e22; font-size: 13px; font-weight: 600;
          text-decoration: none;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .pc-cart-link:hover { background: rgba(196,148,72,0.12); border-color: #c49448; color: #8b5e1a; }
        .pc-cart-link i { font-size: 17px; }
        .pc-cart-count {
          min-width: 18px; height: 18px; padding: 0 4px;
          border-radius: 9px;
          background: linear-gradient(135deg, #c49448, #8b5e1a);
          color: #120a06; font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }

        .pc-account-link {
          display: flex; align-items: center; gap: 8px;
          height: 38px; padding: 0 12px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid rgba(196,148,72,0.3);
          color: #5a3e22; font-size: 13px; font-weight: 500;
          text-decoration: none; cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .pc-account-link:hover { background: rgba(196,148,72,0.08); border-color: #c49448; color: #8b5e1a; }
        .pc-account-avatar {
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg, #c49448, #8b5e1a);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: #120a06; flex-shrink: 0;
        }

        .pc-logout-btn {
          height: 38px; padding: 0 12px; font-size: 13px; font-weight: 500;
          color: #7a5e3a; background: transparent;
          border: 1px solid rgba(196,148,72,0.2); border-radius: 8px;
          cursor: pointer; transition: color 0.2s, border-color 0.2s, background 0.2s;
        }
        .pc-logout-btn:hover { color: #dc2626; border-color: rgba(220,38,38,0.3); background: rgba(220,38,38,0.06); }

        /* ── Hamburger (mobile) ── */
        .pc-hamburger {
          display: none; width: 40px; height: 40px; background: transparent;
          border: 1px solid rgba(196,148,72,0.3); border-radius: 8px; cursor: pointer;
          align-items: center; justify-content: center; color: #5a3e22; font-size: 20px;
          transition: background 0.2s;
        }
        .pc-hamburger:hover { background: rgba(196,148,72,0.08); }

        /* ── Mobile menu ── */
        .pc-mobile-menu { display: none; background: #ffffff; border-top: 1px solid rgba(196,148,72,0.2); padding: 1rem 1.5rem 1.5rem; }
        .pc-mobile-menu.open { display: block; }
        .pc-mobile-links { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
        .pc-mobile-links a, .pc-mobile-links button {
          display: flex; align-items: center; gap: 10px;
          padding: 0.75rem 0.85rem; font-size: 15px; font-weight: 500;
          color: #5a3e22; text-decoration: none; border-radius: 8px; width: 100%;
          text-align: left; background: transparent; border: none; cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .pc-mobile-links a.active { color: #8b5e1a; background: rgba(196,148,72,0.1); }
        .pc-mobile-links a:hover, .pc-mobile-links button:hover { background: rgba(196,148,72,0.08); color: #8b5e1a; }
        .pc-mobile-user-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 0.85rem; margin-bottom: 0.75rem;
          background: rgba(196,148,72,0.06); border: 1px solid rgba(196,148,72,0.2);
          border-radius: 10px;
        }

        @media (max-width: 900px) {
          .pc-nav-center { display: none; }
          .pc-account-link span, .pc-cart-link span.label { display: none; }
        }
        @media (max-width: 768px) {
          .pc-nav-actions > *:not(.pc-hamburger) { display: none; }
          .pc-hamburger { display: flex; }
        }
        @media (max-width: 480px) {
          .pc-logo-text { display: none; }
        }
      `}</style>

      <nav className="pc-nav" role="navigation" aria-label="Main navigation">
        <div className="pc-nav-inner">

          {/* ── Logo ── */}
          <Link to="/" className="pc-logo" aria-label="Perry's Collection home">
            <div className="pc-logo-mark">P</div>
            <div className="pc-logo-text">
              <span className="pc-logo-name">Perry's</span>
              <span className="pc-logo-sub">Collection</span>
            </div>
          </Link>

          {/* ── Center nav links ── */}
          <div className="pc-nav-center">
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

          {/* ── Right-side actions ── */}
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
                <Link to="/profile">
                 <span>
                  {user.full_name?.split(" ")[0] || "Account"}
                 </span>
                </Link>
                <button className="pc-logout-btn" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline-shimmer btn-sm">
                  <i className="ti ti-login" aria-hidden="true" />
                  <span>Sign in</span>
                </Link>
                <Link to="/register" className="btn-outline-shimmer btn-sm">
                  <i className="ti ti-user-plus" aria-hidden="true" />
                  <span>Register</span>
                </Link>
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
              <div className="pc-account-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                {(user.full_name || user.email)[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#4a2f10" }}>
                  {user.full_name || "Account"}
                </div>
                <div style={{ fontSize: 12, color: "#7a5e3a" }}>{user.email}</div>
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
            <li>
              <Link to="/cart">
                <i className="ti ti-shopping-cart" aria-hidden="true" />
                Cart {cartCount > 0 && `(${cartCount})`}
              </Link>
            </li>
            {user ? (
              <>
                <li><Link to="/orders"><i className="ti ti-receipt" aria-hidden="true" /> My Orders</Link></li>
                <li><Link to="/account"><i className="ti ti-user" aria-hidden="true" /> Account</Link></li>
                <li><Link to="/profile"><i className="ti ti-user" aria-hidden="true" /> Profile</Link></li>
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

      <div style={{ height: "72px" }} aria-hidden="true" />
    </>
  );
}