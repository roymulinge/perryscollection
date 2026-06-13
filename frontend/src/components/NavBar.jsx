// src/components/NavBar.jsx
// Updated to read real cart count from CartContext
// and show user-aware links (Account vs Login/Register)

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Real data from context — replaces const [cartCount] = useState(0)
  const { cart } = useCart();
  const { user, logout } = useAuth();
  const cartCount = cart.total_items; // live count from backend

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // Build nav links dynamically based on auth state
  // Logged-in users see Account + Logout instead of Login + Register
  const navLinks = [
    { label: "Shop", to: "/products" },
    { label: "Categories", to: "/categories" },
    { label: "New Arrivals", to: "/products?featured=true" },
    ...(user
      ? [
          { label: "My Orders", to: "/orders" },
          { label: "Account", to: "/account" },
        ]
      : [
          { label: "Login", to: "/login" },
          { label: "Register", to: "/register" },
        ]),
  ];

  return (
    <>
      <style>{`
        .pc-nav {
          position: fixed; top: 0; left: 0; right: 0;
          z-index: 100;
          transition: background 0.3s, box-shadow 0.3s;
          background: ${scrolled ? "rgba(18,10,6,0.97)" : "rgba(18,10,6,0.85)"};
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(196,148,72,0.18);
          box-shadow: ${scrolled ? "0 2px 24px rgba(0,0,0,0.45)" : "none"};
        }
        .pc-nav-inner {
          max-width: 1200px; margin: 0 auto; padding: 0 1.5rem;
          height: 68px; display: flex; align-items: center;
          justify-content: space-between; gap: 2rem;
        }
        .pc-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
        .pc-logo-mark {
          width: 38px; height: 38px; border-radius: 50%;
          background: linear-gradient(135deg, #c49448 0%, #8b5e1a 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; font-weight: 700; color: #120a06;
          font-family: Georgia, serif; flex-shrink: 0;
        }
        .pc-logo-text { display: flex; flex-direction: column; line-height: 1.15; }
        .pc-logo-name { font-size: 15px; font-weight: 600; color: #e8c87a; letter-spacing: 0.04em; font-family: Georgia, serif; }
        .pc-logo-sub { font-size: 10px; font-weight: 400; color: #9a7a4a; letter-spacing: 0.14em; text-transform: uppercase; }
        .pc-nav-links { display: flex; align-items: center; gap: 0.25rem; list-style: none; margin: 0; padding: 0; }
        .pc-nav-links a {
          display: block; padding: 0.45rem 0.85rem; font-size: 14px; font-weight: 500;
          color: #c4ab82; text-decoration: none; border-radius: 6px;
          letter-spacing: 0.02em; transition: color 0.2s, background 0.2s; white-space: nowrap;
        }
        .pc-nav-links a:hover, .pc-nav-links a.active { color: #e8c87a; background: rgba(196,148,72,0.1); }
        .pc-nav-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
        .pc-icon-btn {
          position: relative; width: 38px; height: 38px; border-radius: 8px;
          background: transparent; border: 1px solid rgba(196,148,72,0.2);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #c4ab82; font-size: 18px;
          transition: background 0.2s, color 0.2s, border-color 0.2s; text-decoration: none;
        }
        .pc-icon-btn:hover { background: rgba(196,148,72,0.1); color: #e8c87a; border-color: rgba(196,148,72,0.4); }
        .pc-cart-badge {
          position: absolute; top: -4px; right: -4px;
          width: 16px; height: 16px; background: #c49448; border-radius: 50%;
          font-size: 9px; font-weight: 700; color: #120a06;
          display: flex; align-items: center; justify-content: center; border: 2px solid #120a06;
        }
        .pc-cta-btn {
          padding: 0.45rem 1.1rem;
          background: linear-gradient(135deg, #c49448 0%, #8b5e1a 100%);
          border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
          color: #120a06; cursor: pointer; text-decoration: none;
          transition: opacity 0.2s, transform 0.15s; white-space: nowrap;
        }
        .pc-cta-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .pc-logout-btn {
          padding: 0.45rem 0.85rem; font-size: 14px; font-weight: 500;
          color: #c4ab82; background: transparent; border: none; border-radius: 6px;
          cursor: pointer; letter-spacing: 0.02em; transition: color 0.2s, background 0.2s;
        }
        .pc-logout-btn:hover { color: #e8c87a; background: rgba(196,148,72,0.1); }
        .pc-hamburger {
          display: none; width: 38px; height: 38px; background: transparent;
          border: 1px solid rgba(196,148,72,0.2); border-radius: 8px; cursor: pointer;
          align-items: center; justify-content: center; color: #c4ab82; font-size: 20px;
          transition: background 0.2s;
        }
        .pc-hamburger:hover { background: rgba(196,148,72,0.1); }
        .pc-mobile-menu { display: none; background: rgba(18,10,6,0.98); border-top: 1px solid rgba(196,148,72,0.15); padding: 1rem 1.5rem 1.5rem; }
        .pc-mobile-menu.open { display: block; }
        .pc-mobile-links { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
        .pc-mobile-links a, .pc-mobile-links button {
          display: block; padding: 0.65rem 0.75rem; font-size: 15px; font-weight: 500;
          color: #c4ab82; text-decoration: none; border-radius: 8px; width: 100%;
          text-align: left; background: transparent; border: none; cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .pc-mobile-links a:hover, .pc-mobile-links button:hover { background: rgba(196,148,72,0.1); color: #e8c87a; }
        .pc-mobile-actions { display: flex; gap: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(196,148,72,0.12); }
        .pc-mobile-actions .pc-icon-btn { flex: 1; width: auto; justify-content: center; gap: 8px; font-size: 14px; }
        @media (max-width: 768px) { .pc-nav-links { display: none; } .pc-cta-btn { display: none; } .pc-hamburger { display: flex; } }
        @media (max-width: 480px) { .pc-logo-text { display: none; } }
      `}</style>

      <nav className="pc-nav" role="navigation" aria-label="Main navigation">
        <div className="pc-nav-inner">
          <Link to="/" className="pc-logo" aria-label="Perry's Collection home">
            <div className="pc-logo-mark">P</div>
            <div className="pc-logo-text">
              <span className="pc-logo-name">Perry's</span>
              <span className="pc-logo-sub">Collection</span>
            </div>
          </Link>

          <ul className="pc-nav-links" role="list">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={location.pathname === link.to ? "active" : ""}>
                  {link.label}
                </Link>
              </li>
            ))}
            {/* Logout button only for logged-in users */}
            {user && (
              <li>
                <button className="pc-logout-btn" onClick={logout}>
                  Logout
                </button>
              </li>
            )}
          </ul>

          <div className="pc-nav-actions">
            <Link to="/cart" className="pc-icon-btn" aria-label={`Cart, ${cartCount} items`}>
              <i className="ti ti-shopping-cart" aria-hidden="true" />
              {/* Only show badge if cart has items */}
              {cartCount > 0 && (
                <span className="pc-cart-badge" aria-hidden="true">
                  {cartCount > 9 ? "9+" : cartCount}
                  {/* Cap at 9+ so badge doesn't overflow */}
                </span>
              )}
            </Link>
            <Link to={user ? "/account" : "/login"} className="pc-icon-btn" aria-label="Account">
              <i className="ti ti-user" aria-hidden="true" />
            </Link>
            <Link to="/products" className="pc-cta-btn">Shop Now</Link>
          </div>

          <button
            className="pc-hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <i className={`ti ${menuOpen ? "ti-x" : "ti-menu-2"}`} aria-hidden="true" />
          </button>
        </div>

        <div className={`pc-mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
          <ul className="pc-mobile-links" role="list">
            {navLinks.map((link) => (
              <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
            ))}
            {user && <li><button onClick={logout}>Logout</button></li>}
          </ul>
          <div className="pc-mobile-actions">
            <Link to="/cart" className="pc-icon-btn" aria-label="Cart">
              <i className="ti ti-shopping-cart" aria-hidden="true" />
              Cart {cartCount > 0 && `(${cartCount})`}
            </Link>
            <Link to={user ? "/account" : "/login"} className="pc-icon-btn">
              <i className="ti ti-user" aria-hidden="true" /> Account
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ height: "68px" }} aria-hidden="true" />
    </>
  );
}