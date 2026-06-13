// src/pages/OrdersPage.jsx
// Shows the authenticated customer's full order history.
// Each order is expandable to see the items inside.
// Redirects to /login if not authenticated.

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";

// Status → display label + colour
const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "#c49448", bg: "rgba(196,148,72,0.1)",  border: "rgba(196,148,72,0.25)", icon: "ti-clock" },
  confirmed: { label: "Confirmed", color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.2)", icon: "ti-circle-check" },
  shipped:   { label: "Shipped",   color: "#a78bfa", bg: "rgba(167,139,250,0.08)",border: "rgba(167,139,250,0.2)", icon: "ti-truck" },
  delivered: { label: "Delivered", color: "#86efac", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.2)", icon: "ti-package" },
  cancelled: { label: "Cancelled", color: "#fca5a5", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", icon: "ti-x" },
};

const PAYMENT_CONFIG = {
  unpaid:   { label: "Unpaid",   color: "#fca5a5", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)" },
  paid:     { label: "Paid",     color: "#86efac", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.2)" },
  failed:   { label: "Failed",   color: "#fca5a5", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)" },
  refunded: { label: "Refunded", color: "#a78bfa", bg: "rgba(167,139,250,0.08)",border: "rgba(167,139,250,0.2)" },
};

function StatusBadge({ value, config }) {
  const cfg = config[value] || { label: value, color: "#c4ab82", bg: "rgba(196,148,72,0.08)", border: "rgba(196,148,72,0.2)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: 12, fontWeight: 600, color: cfg.color, letterSpacing: "0.04em",
    }}>
      {cfg.icon && <i className={`ti ${cfg.icon}`} style={{ fontSize: 11 }} aria-hidden="true" />}
      {cfg.label}
    </span>
  );
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(order.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{ background: "#1a0f08", border: "1px solid rgba(196,148,72,0.15)", borderRadius: 14, overflow: "hidden" }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: "1rem", alignItems: "center", padding: "1.25rem 1.5rem", cursor: "pointer" }}
        role="button" aria-expanded={expanded} tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
      >
        {/* Order number */}
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(196,148,72,0.08)", border: "1px solid rgba(196,148,72,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="ti ti-receipt" style={{ fontSize: 20, color: "#c49448" }} aria-hidden="true" />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#ddc799" }}>Order #{order.id}</span>
            <StatusBadge value={order.status} config={STATUS_CONFIG} />
            <StatusBadge value={order.payment_status} config={PAYMENT_CONFIG} />
          </div>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#7a5e3a" }}>{date}</span>
            <span style={{ fontSize: 13, color: "#7a5e3a" }}>{order.items?.length || 0} items</span>
            <span style={{ fontSize: 13, color: "#7a5e3a", textTransform: "capitalize" }}>{order.payment_method?.replace("_", " ")}</span>
          </div>
        </div>

        <span style={{ fontSize: 17, fontWeight: 700, color: "#e8c87a", fontFamily: "Georgia,serif", whiteSpace: "nowrap" }}>
          KES {parseInt(order.total_amount).toLocaleString()}
        </span>

        <i className={`ti ${expanded ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ color: "#5a3e22", fontSize: 18 }} aria-hidden="true" />
      </div>

      {/* Expanded items */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(196,148,72,0.1)", padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {order.items?.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                <span style={{ color: "#c4ab82" }}>
                  {item.product_name}
                  <span style={{ color: "#5a3e22" }}> × {item.quantity}</span>
                </span>
                <span style={{ color: "#ddc799", fontWeight: 500 }}>
                  KES {parseInt(item.subtotal).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Delivery address */}
          <div style={{ padding: "12px 14px", background: "rgba(196,148,72,0.04)", border: "1px solid rgba(196,148,72,0.1)", borderRadius: 10, fontSize: 13, color: "#7a5e3a", lineHeight: 1.7 }}>
            <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#9a7a4a" }}>Delivery address</p>
            <p style={{ margin: 0 }}>{order.delivery_address}</p>
          </div>

          {/* M-Pesa transaction ID */}
          {order.mpesa_transaction_id && (
            <div style={{ marginTop: "0.75rem", fontSize: 13, color: "#7a5e3a" }}>
              M-Pesa reference: <strong style={{ color: "#c4ab82" }}>{order.mpesa_transaction_id}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { state: { from: "/orders" } });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiClient.get("/orders/")
      .then((res) => setOrders(res.data.results || res.data))
      // res.data.results: if you add pagination; res.data: plain list
      .catch(() => setError("Failed to load orders. Please try again."))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || (loading && !orders.length)) return (
    <div style={styles.center}>
      <div style={styles.spinner} />
    </div>
  );

  return (
    <>
      <style>{`@keyframes pc-spin { to { transform: rotate(360deg); } }`}</style>
      <main style={{ background: "#120a06", minHeight: "100vh", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: "2rem" }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c49448", display: "block", marginBottom: 6 }}>
              My account
            </span>
            <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 400, color: "#f0dba8", margin: 0 }}>
              Order History
            </h1>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: "1.5rem" }} role="alert">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && orders.length === 0 && (
            <div style={{ textAlign: "center", padding: "5rem 0" }}>
              <i className="ti ti-package-off" style={{ fontSize: 64, color: "#2a1708", display: "block", marginBottom: "1.5rem" }} aria-hidden="true" />
              <h2 style={{ fontFamily: "Georgia,serif", fontSize: "1.5rem", color: "#f0dba8", fontWeight: 400, margin: "0 0 0.75rem" }}>
                No orders yet
              </h2>
              <p style={{ color: "#7a5e3a", fontSize: 15, margin: "0 0 2rem" }}>
                Your order history will appear here once you've placed an order.
              </p>
              <Link to="/products" style={styles.goldBtn}>Start shopping</Link>
            </div>
          )}

          {/* Orders list */}
          {orders.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}

          {/* Back link */}
          {orders.length > 0 && (
            <div style={{ marginTop: "2rem", textAlign: "center" }}>
              <Link to="/account" style={{ color: "#7a5e3a", textDecoration: "none", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-arrow-left" aria-hidden="true" /> Back to account
              </Link>
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
  goldBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "0.75rem 2rem", background: "linear-gradient(135deg,#c49448,#8b5e1a)", borderRadius: 10, color: "#120a06", fontWeight: 700, textDecoration: "none", fontSize: 14 },
};