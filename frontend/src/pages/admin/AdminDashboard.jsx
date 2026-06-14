// src/pages/admin/AdminDashboard.jsx
// The home screen of the admin panel.
// Shows summary stats and quick links.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { fetchDashboardStats } from "../../api/admin";

// KES currency formatter
const kes = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(() => setError("Could not load dashboard stats."))
      .finally(() => setLoading(false));
  }, []); // empty array = run once on mount

  // Stat card data — defined as an array so we can .map() over them
  // instead of repeating JSX 6 times
  const statCards = stats ? [
    { label: "Total products",    value: stats.total_products,    icon: "ti-package",        sub: `${stats.active_products} active`                          },
    { label: "Total orders",      value: stats.total_orders,      icon: "ti-receipt",        sub: `${stats.pending_orders} pending`                          },
    { label: "Revenue (paid)",    value: kes.format(stats.total_revenue), icon: "ti-cash",  sub: "From paid orders", isString: true                         },
    { label: "Low stock items",   value: stats.low_stock_count,   icon: "ti-alert-triangle", sub: `${stats.out_of_stock_count} out of stock`, warn: true     },
  ] : [];

  return (
    <AdminLayout title="Dashboard">
      {error && (
        <div style={{ color: "#f87171", marginBottom: 16, fontSize: 14 }}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="ap-stat-grid">
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="ap-stat">
                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8, marginBottom: 12 }} />
                <div className="skeleton" style={{ width: "50%", height: 14, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: "70%", height: 32 }} />
              </div>
            ))
          : statCards.map((card) => (
              <div key={card.label} className="ap-stat">
                <div className="ap-stat-icon" style={card.warn ? { color: "#fbbf24" } : {}}>
                  <i className={`ti ${card.icon}`} />
                </div>
                <div className="ap-stat-label">{card.label}</div>
                <div className="ap-stat-value" style={card.warn && card.value > 0 ? { color: "#fbbf24" } : {}}>
                  {/* isString: value is already formatted (KES amount) */}
                  {card.isString ? card.value : card.value}
                </div>
                <div className="ap-stat-sub">{card.sub}</div>
              </div>
            ))
        }
      </div>

      {/* ── Quick actions ── */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7a5e3a", marginBottom: 12 }}>
          Quick actions
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/admin-panel/products/new" className="ap-btn ap-btn-primary">
            <i className="ti ti-plus" /> Add product
          </Link>
          <Link to="/admin-panel/orders?status=pending" className="ap-btn ap-btn-secondary">
            <i className="ti ti-clock" /> Pending orders
          </Link>
          <Link to="/admin-panel/stock" className="ap-btn ap-btn-secondary">
            <i className="ti ti-alert-triangle" /> Stock alerts
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}