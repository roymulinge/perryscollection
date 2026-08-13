// src/pages/CartPage.jsx

import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

function CartItem({ item, onRemove, onUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleQuantityChange(newQty) {
    if (newQty < 1) return;
    setUpdating(true);
    await onUpdate(item.product.id, newQty);
    setUpdating(false);
  }

  async function handleRemove() {
    setRemoving(true);
    await onRemove(item.product.id);
  }

  const subtotal = parseFloat(item.product.price) * item.quantity;
  const unavailable = item.is_available === false;
  // Options for the quantity <select> — capped at remaining stock if we know it
  const maxQty = item.stock_remaining ? Math.min(item.stock_remaining, 10) : 10;
  const qtyOptions = Array.from({ length: maxQty }, (_, i) => i + 1);

  return (
    <div className="cart-row" style={{ opacity: removing ? 0.5 : 1 }}>
      <Link to={`/products/${item.product.slug}`} className="cart-row-thumb">
        {item.product.image_url ? (
          <img src={item.product.image_url} alt={item.product.name} />
        ) : (
          <span>{item.product.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}</span>
        )}
      </Link>

      <div className="cart-row-details">
        <Link to={`/products/${item.product.slug}`} className="cart-row-name">
          {item.product.name}
        </Link>
        {item.product.category_name && (
          <p className="cart-row-meta">{item.product.category_name}</p>
        )}
        <p className="cart-row-meta">
          {unavailable ? (
            <span className="cart-row-status unavailable">
              {item.stock_remaining === 0 ? "Out of stock" : "No longer available"}
            </span>
          ) : (
            <span className="cart-row-status">In Stock ✓</span>
          )}
        </p>
        <div className="cart-row-links">
          <button onClick={handleRemove} disabled={removing}>
            {removing ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>

      <div className="cart-row-qty">
        <select
          value={item.quantity}
          disabled={updating || unavailable}
          onChange={(e) => handleQuantityChange(Number(e.target.value))}
        >
          {qtyOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="cart-row-price">
        KES {subtotal.toLocaleString()}
      </div>
    </div>
  );
}

export default function CartPage() {
  const { cart, cartLoading, removeItem, updateCartItem, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const items = cart.items || [];
  const total = parseFloat(cart.total_price || 0);
  const deliveryThreshold = 3000;
  const freeDelivery = total >= deliveryThreshold;
  const hasUnavailableItems = items.some((item) => item.is_available === false);

  function goToCheckout() {
    if (hasUnavailableItems) return;
    navigate(user ? "/checkout" : "/login", user ? undefined : { state: { from: "/checkout" } });
  }

  if (cartLoading) {
    return (
      <div className="cart-page cart-center">
        <div className="cart-spinner" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .cart-page {
          --paper:#FFFFFF; --cream:#F6F1E6; --ink:#221E19; --ink-soft:#5B564C;
          --brass:#A5793A; --brass-dark:#7C5A29; --oxide:#8B4632; --sage:#6B7259; --line:#E5DFD1;
          background:var(--paper); min-height:100vh; padding:3rem;
          font-family:'Archivo',sans-serif; color:var(--ink);
        }
        .cart-center { display:flex; align-items:center; justify-content:center; }
        .cart-spinner { width:32px;height:32px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--brass);animation:cart-spin .8s linear infinite; }
        @keyframes cart-spin { to { transform:rotate(360deg); } }

        .cart-shell { max-width:1100px; margin:0 auto; }
        .cart-header { display:flex; justify-content:space-between; align-items:baseline; padding-bottom:1.25rem; border-bottom:1px solid var(--line); margin-bottom:2rem; }
        .cart-header h1 { font-family:'Instrument Serif',serif; font-weight:400; font-size:1.9rem; margin:0; letter-spacing:0.02em; }
        .cart-header h1 span { font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--ink-soft); margin-left:10px; }
        .cart-header a { font-size:13px; color:var(--ink-soft); text-decoration:underline; }
        .cart-header a:hover { color:var(--brass-dark); }

        .cart-layout { display:grid; grid-template-columns:1fr 340px; gap:3rem; align-items:start; }
        @media (max-width:800px) { .cart-layout { grid-template-columns:1fr; } }

        .cart-row { display:grid; grid-template-columns:80px 1fr 90px 100px; gap:1.25rem; align-items:start; padding:1.5rem 0; border-bottom:1px solid var(--line); }
        @media (max-width:520px) { .cart-row { grid-template-columns:64px 1fr; grid-template-areas:"thumb details" "thumb qty" "thumb price"; row-gap:.5rem; } }
        .cart-row-thumb { width:80px; height:80px; background:var(--cream); border-radius:4px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .cart-row-thumb img { width:100%; height:100%; object-fit:cover; }
        .cart-row-thumb span { font-family:'Instrument Serif',serif; font-size:18px; color:var(--brass-dark); }
        .cart-row-name { font-size:14.5px; font-weight:500; color:var(--ink); text-decoration:none; }
        .cart-row-name:hover { color:var(--brass-dark); }
        .cart-row-meta { font-size:12.5px; color:var(--ink-soft); margin:4px 0 0; }
        .cart-row-status { color:var(--sage); }
        .cart-row-status.unavailable { color:var(--oxide); font-weight:500; }
        .cart-row-links { margin-top:8px; }
        .cart-row-links button { background:none; border:none; padding:0; font-size:12.5px; color:var(--ink-soft); text-decoration:underline; cursor:pointer; }
        .cart-row-links button:hover { color:var(--oxide); }
        .cart-row-qty select { width:64px; padding:6px 8px; border:1px solid var(--line); border-radius:3px; font-family:'IBM Plex Mono',monospace; font-size:13px; background:var(--paper); color:var(--ink); }
        .cart-row-price { font-family:'IBM Plex Mono',monospace; font-size:14px; font-weight:500; text-align:right; }

        .cart-warning { padding:0.9rem 1.1rem; border-radius:4px; background:rgba(139,70,50,0.06); border:1px solid rgba(139,70,50,0.25); font-size:13px; color:var(--oxide); margin-bottom:1.5rem; }

        .cart-btn-dark { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; height:52px; background:var(--ink); color:var(--paper); border:none; border-radius:3px; font-size:14px; font-weight:600; letter-spacing:0.03em; cursor:pointer; transition:background .2s; text-decoration:none; margin-top:1.5rem; }
        .cart-btn-dark:hover { background:var(--brass-dark); }
        .cart-btn-dark:disabled { background:var(--line); color:var(--ink-soft); cursor:not-allowed; }

        .cart-continue { display:inline-block; margin-top:1.25rem; font-size:13px; color:var(--ink-soft); text-decoration:underline; }

        .cart-summary { position:sticky; top:32px; }
        .cart-summary-agree { font-size:11.5px; color:var(--ink-soft); text-align:center; margin:10px 0 1.5rem; line-height:1.5; }
        .cart-summary-agree a { color:var(--brass-dark); }
        .cart-summary-box { border:1px solid var(--line); border-radius:4px; padding:1.5rem; }
        .cart-summary-box h2 { font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-soft); margin:0 0 1rem; }
        .cart-summary-row { display:flex; justify-content:space-between; font-size:13.5px; color:var(--ink-soft); margin-bottom:0.6rem; }
        .cart-summary-total { display:flex; justify-content:space-between; align-items:baseline; border-top:1px solid var(--line); margin-top:0.75rem; padding-top:0.9rem; }
        .cart-summary-total span:first-child { font-size:14px; font-weight:600; }
        .cart-summary-total span:last-child { font-family:'IBM Plex Mono',monospace; font-size:19px; font-weight:600; color:var(--brass-dark); }

        .cart-promo { border:1px solid var(--line); border-radius:4px; margin-top:1rem; }
        .cart-promo summary { padding:0.9rem 1.1rem; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--ink-soft); cursor:pointer; }
        .cart-promo-body { padding:0 1.1rem 1rem; display:flex; gap:8px; }
        .cart-promo-body input { flex:1; border:1px solid var(--line); border-radius:3px; padding:8px 10px; font-size:13px; }
        .cart-promo-body button { border:1px solid var(--ink); background:var(--paper); padding:0 14px; border-radius:3px; font-size:12.5px; cursor:pointer; }

        .cart-help { margin-top:1.5rem; }
        .cart-help h3 { font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--ink-soft); margin:0 0 0.75rem; }
        .cart-help a { display:block; font-size:13px; color:var(--ink); text-decoration:underline; margin-bottom:6px; }

        .cart-payments { display:flex; justify-content:center; gap:1rem; margin-top:1.5rem; font-size:11.5px; color:var(--ink-soft); }

        .cart-empty { text-align:center; padding:5rem 0; }
        .cart-empty h2 { font-family:'Instrument Serif',serif; font-weight:400; font-size:1.6rem; margin:0 0 0.5rem; }
        .cart-empty p { color:var(--ink-soft); font-size:14px; margin:0 0 1.75rem; }
      `}</style>

      <main className="cart-page">
        <div className="cart-shell">
          <div className="cart-header">
            <h1>Your Bag {items.length > 0 && <span>{items.length} {items.length === 1 ? "item" : "items"}</span>}</h1>
            <Link to="/products">Continue Shopping</Link>
          </div>

          {items.length === 0 ? (
            <div className="cart-empty">
              <h2>Your bag is empty</h2>
              <p>Browse our collection and find something you love.</p>
              <Link to="/products" className="cart-btn-dark" style={{ display: "inline-flex", width: "auto", padding: "0 2rem" }}>
                Browse products
              </Link>
            </div>
          ) : (
            <div className="cart-layout">
              <div>
                {hasUnavailableItems && (
                  <div className="cart-warning">
                    Some items in your bag are no longer available — remove them to continue to checkout.
                  </div>
                )}

                {items.map((item) => (
                  <CartItem key={item.product.id} item={item} onRemove={removeItem} onUpdate={updateCartItem} />
                ))}

                <button
                  className="cart-btn-dark"
                  onClick={goToCheckout}
                  disabled={hasUnavailableItems}
                >
                  {hasUnavailableItems ? "Remove unavailable items first" : "Checkout →"}
                </button>

                <Link to="/products" className="cart-continue">← Continue shopping</Link>
              </div>

              <div className="cart-summary">
                <button
                  className="cart-btn-dark"
                  style={{ marginTop: 0 }}
                  onClick={goToCheckout}
                  disabled={hasUnavailableItems}
                >
                  Checkout →
                </button>
                <p className="cart-summary-agree">
                  By placing your order, you agree to our <a href="/terms">Delivery Terms</a>
                </p>

                <div className="cart-summary-box">
                  <h2>Order Summary</h2>
                  <div className="cart-summary-row">
                    <span>{cart.total_items} {cart.total_items === 1 ? "product" : "products"}</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Product total</span>
                    <span>KES {total.toLocaleString()}</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Delivery</span>
                    <span style={{ color: freeDelivery ? "#4d7a4d" : "var(--ink-soft)" }}>
                      {freeDelivery ? "Free" : "Calculated at checkout"}
                    </span>
                  </div>
                  <div className="cart-summary-total">
                    <span>Total</span>
                    <span>KES {total.toLocaleString()}</span>
                  </div>
                </div>

                {/* UI stub only — no promo code backend logic wired up yet */}
                <details className="cart-promo">
                  <summary>Promo Code</summary>
                  <div className="cart-promo-body">
                    <input type="text" placeholder="Enter code" disabled />
                    <button disabled>Apply</button>
                  </div>
                </details>

                <div className="cart-help">
                  <h3>Need Help?</h3>
                  <Link to="/shipping">Shipping</Link>
                  <Link to="/returns">Returns &amp; Exchanges</Link>
                  <Link to="/contact">Contact Us</Link>
                </div>

                <div className="cart-payments">
                  <span>M-Pesa</span>
                  <span>Cash on Delivery</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}