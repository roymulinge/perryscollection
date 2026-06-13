// src/pages/CartPage.jsx
// Shows the current cart contents. Lets users change quantities and remove items.
// Uses CartContext — no direct API calls here, everything goes through the context.
// Unauthenticated users can view the cart (it'll just be empty).

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
    // No need to setRemoving(false) — component unmounts after removal
  }

  const initials = item.product.name.split(" ").slice(0, 2).map((w) => w[0]).join("");
  const subtotal = parseFloat(item.product.price) * item.quantity;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "80px 1fr auto",
      gap: "1.25rem",
      alignItems: "center",
      padding: "1.25rem",
      background: "#1a0f08",
      border: "1px solid rgba(196,148,72,0.15)",
      borderRadius: 12,
      opacity: removing ? 0.5 : 1,
      transition: "opacity 0.3s",
    }}>
      {/* Thumbnail */}
      <Link to={`/products/${item.product.slug}`}>
        <div style={{
          width: 80, height: 80, borderRadius: 10,
          background: "linear-gradient(135deg,#2a1708,#1a0f08)",
          border: "1px solid rgba(196,148,72,0.12)",
          overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {item.product.image ? (
            <img src={item.product.image} alt={item.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 18, fontWeight: 600, color: "#c49448", fontFamily: "Georgia,serif" }}>{initials}</span>
          )}
        </div>
      </Link>

      {/* Details */}
      <div>
        <Link to={`/products/${item.product.slug}`} style={{ textDecoration: "none" }}>
          <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 500, color: "#ddc799", lineHeight: 1.3 }}>
            {item.product.name}
          </p>
        </Link>
        {item.product.category && (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#7a5e3a" }}>{item.product.category.name}</p>
        )}
        <p style={{ margin: "0 0 10px", fontSize: 14, color: "#c49448", fontWeight: 600 }}>
          KES {parseInt(item.product.price).toLocaleString()} each
        </p>

        {/* Quantity controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={item.quantity <= 1 || updating}
            style={styles.qtyBtn}
            aria-label="Decrease quantity"
          >
            <i className="ti ti-minus" aria-hidden="true" />
          </button>
          <span style={{ minWidth: 28, textAlign: "center", fontSize: 15, fontWeight: 600, color: "#f0dba8" }}>
            {updating ? "…" : item.quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={updating}
            style={styles.qtyBtn}
            aria-label="Increase quantity"
          >
            <i className="ti ti-plus" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Subtotal + remove */}
      <div style={{ textAlign: "right" }}>
        <p style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#e8c87a", fontFamily: "Georgia,serif" }}>
          KES {subtotal.toLocaleString()}
        </p>
        <button
          onClick={handleRemove}
          disabled={removing}
          style={styles.removeBtn}
          aria-label={`Remove ${item.product.name} from cart`}
        >
          <i className="ti ti-trash" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { cart, cartLoading, removeItem, updateCartItem, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    if (!window.confirm("Remove all items from your cart?")) return;
    setClearing(true);
    await clearCart();
    setClearing(false);
  }

  const items = cart.items || [];
  const total = parseFloat(cart.total_price || 0);
  const deliveryThreshold = 3000;
  const freeDelivery = total >= deliveryThreshold;
  const amountToFreeDelivery = deliveryThreshold - total;

  if (cartLoading) return (
    <div style={styles.center}>
      <div style={styles.spinner} />
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pc-spin { to { transform: rotate(360deg); } }
        .cart-qty-btn { width:32px;height:32px;border-radius:7px;border:1px solid rgba(196,148,72,0.22);background:transparent;color:#c4ab82;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s; }
        .cart-qty-btn:hover:not(:disabled){ background:rgba(196,148,72,0.1); }
        .cart-qty-btn:disabled{ opacity:0.35;cursor:not-allowed; }
        @media(max-width:700px){ .cart-layout{ grid-template-columns:1fr !important; } }
      `}</style>

      <main style={{ background: "#120a06", minHeight: "100vh", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c49448", display: "block", marginBottom: 6 }}>
                Shopping
              </span>
              <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 400, color: "#f0dba8", margin: 0 }}>
                Your Cart
                {items.length > 0 && <span style={{ fontSize: "1rem", color: "#7a5e3a", fontFamily: "sans-serif", fontWeight: 400, marginLeft: 12 }}>({items.length} {items.length === 1 ? "item" : "items"})</span>}
              </h1>
            </div>
            {items.length > 0 && (
              <button onClick={handleClear} disabled={clearing} style={styles.clearBtn}>
                {clearing ? "Clearing…" : "Clear cart"}
              </button>
            )}
          </div>

          {/* Empty state */}
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "6rem 0" }}>
              <i className="ti ti-shopping-cart-off" style={{ fontSize: 64, color: "#2a1708", display: "block", marginBottom: "1.5rem" }} aria-hidden="true" />
              <h2 style={{ fontFamily: "Georgia,serif", fontSize: "1.6rem", color: "#f0dba8", fontWeight: 400, margin: "0 0 0.75rem" }}>
                Your cart is empty
              </h2>
              <p style={{ color: "#7a5e3a", fontSize: 15, margin: "0 0 2rem" }}>
                Browse our collection and find something you love.
              </p>
              <Link to="/products" style={styles.goldBtn}>
                <i className="ti ti-arrow-left" aria-hidden="true" /> Browse products
              </Link>
            </div>
          ) : (
            <div className="cart-layout" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "2rem", alignItems: "start" }}>

              {/* Items list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Free delivery progress bar */}
                {!freeDelivery && (
                  <div style={{
                    padding: "1rem 1.25rem", borderRadius: 10,
                    background: "rgba(196,148,72,0.06)", border: "1px solid rgba(196,148,72,0.15)",
                    fontSize: 13, color: "#c4ab82",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span>Add <strong style={{ color: "#e8c87a" }}>KES {amountToFreeDelivery.toLocaleString()}</strong> more for free Nairobi delivery</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(196,148,72,0.12)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg,#c49448,#8b5e1a)", width: `${Math.min(100, (total / deliveryThreshold) * 100).toFixed(1)}%`, transition: "width 0.4s" }} />
                    </div>
                  </div>
                )}
                {freeDelivery && (
                  <div style={{ padding: "0.75rem 1.25rem", borderRadius: 10, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)", fontSize: 13, color: "#86efac", display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="ti ti-truck" aria-hidden="true" /> You qualify for free delivery in Nairobi!
                  </div>
                )}

                {items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                    onUpdate={updateCartItem}
                  />
                ))}

                <Link to="/products" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "#7a5e3a", textDecoration: "none", padding: "0.5rem 0" }}>
                  <i className="ti ti-arrow-left" aria-hidden="true" /> Continue shopping
                </Link>
              </div>

              {/* Order summary */}
              <div style={{
                background: "#1a0f08",
                border: "1px solid rgba(196,148,72,0.18)",
                borderRadius: 16, padding: "1.75rem",
                position: "sticky", top: 88,
              }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c49448", margin: "0 0 1.5rem" }}>
                  Order Summary
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div style={styles.summaryRow}>
                    <span>Subtotal ({cart.total_items} items)</span>
                    <span>KES {total.toLocaleString()}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span>Delivery</span>
                    <span style={{ color: freeDelivery ? "#86efac" : "#c4ab82" }}>
                      {freeDelivery ? "Free" : "Calculated at checkout"}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid rgba(196,148,72,0.12)", paddingTop: "1.25rem", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#ddc799" }}>Total</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: "#e8c87a", fontFamily: "Georgia,serif" }}>
                      KES {total.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!user) {
                      navigate("/login", { state: { from: "/checkout" } });
                    } else {
                      navigate("/checkout");
                    }
                  }}
                  style={{
                    width: "100%", height: 52, border: "none", borderRadius: 12,
                    background: "linear-gradient(135deg,#c49448,#8b5e1a)",
                    color: "#120a06", fontSize: 15, fontWeight: 700, cursor: "pointer",
                    letterSpacing: "0.03em", transition: "opacity 0.2s,transform 0.15s",
                  }}
                  onMouseEnter={(e) => { e.target.style.opacity = "0.88"; e.target.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.target.style.opacity = "1"; e.target.style.transform = "none"; }}
                >
                  {user ? "Proceed to Checkout" : "Sign in to Checkout"}
                </button>

                {/* Payment icons */}
                <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "1rem" }}>
                  {[
                    { icon: "ti-device-mobile", label: "M-Pesa" },
                    { icon: "ti-cash", label: "Cash on Delivery" },
                  ].map((p) => (
                    <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#5a3e22" }}>
                      <i className={`ti ${p.icon}`} aria-hidden="true" style={{ fontSize: 16, color: "#7a5e3a" }} /> {p.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

const styles = {
  center: { minHeight: "60vh", background: "#120a06", display: "flex", alignItems: "center", justifyContent: "center" },
  spinner: { width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(196,148,72,0.15)", borderTopColor: "#c49448", animation: "pc-spin 0.8s linear infinite" },
  goldBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "0.75rem 2rem", background: "linear-gradient(135deg,#c49448,#8b5e1a)", borderRadius: 10, color: "#120a06", fontWeight: 700, textDecoration: "none", fontSize: 14, border: "none", cursor: "pointer" },
  qtyBtn: { width: 32, height: 32, borderRadius: 7, border: "1px solid rgba(196,148,72,0.22)", background: "transparent", color: "#c4ab82", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  removeBtn: { width: 32, height: 32, borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" },
  clearBtn: { padding: "0.45rem 1rem", background: "transparent", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#ef4444", fontSize: 13, cursor: "pointer", transition: "background 0.2s" },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 14, color: "#7a5e3a" },
};