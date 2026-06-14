// src/pages/admin/AdminOrders.jsx
// Order management — view all orders, change status.

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { fetchAdminOrders, updateOrderStatus } from "../../api/admin";

const kes = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

// Status config: colour class and label for each order status
const STATUS = {
  pending:   { cls: "ap-badge-amber",  label: "Pending"   },
  paid:      { cls: "ap-badge-blue",   label: "Paid"      },
  shipped:   { cls: "ap-badge-purple", label: "Shipped"   },
  delivered: { cls: "ap-badge-green",  label: "Delivered" },
  cancelled: { cls: "ap-badge-red",    label: "Cancelled" },
};

const ALL_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ orders: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [updating, setUpdating] = useState(null); // id of order being updated

  const currentStatus = searchParams.get("status") || "";
  const page = Number(searchParams.get("page") || 1);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminOrders({ page, status: currentStatus });
      setData(result);
    } catch {
      showToast("Failed to load orders.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, currentStatus]);

  useEffect(() => { load(); }, [load]);

  function updateParams(next) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => v ? params.set(k, v) : params.delete(k));
    setSearchParams(params);
  }

  async function handleStatusChange(orderId, newStatus) {
    setUpdating(orderId); // show loading state on just this row
    try {
      await updateOrderStatus(orderId, newStatus);
      showToast(`Order #${orderId} status → ${newStatus}`);
      load();
    } catch {
      showToast("Update failed.", "error");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <AdminLayout title="Orders">
      {toast && (
        <div className={`ap-toast ap-toast-${toast.type}`}>
          <i className={`ti ti-${toast.type === "success" ? "check" : "alert-circle"}`} /> {toast.msg}
        </div>
      )}

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          className={`ap-btn ${!currentStatus ? "ap-btn-primary" : "ap-btn-secondary"} ap-btn-sm`}
          onClick={() => updateParams({ status: "", page: "" })}
        >All</button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            className={`ap-btn ${currentStatus === s ? "ap-btn-primary" : "ap-btn-secondary"} ap-btn-sm`}
            onClick={() => updateParams({ status: s, page: "" })}
          >
            {STATUS[s].label}
          </button>
        ))}
      </div>

      <div className="ap-card">
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Change status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }, (_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }, (_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : data.orders.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="ap-empty">
                      <i className="ti ti-receipt-off" />
                      <p>No orders found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.orders.map((order) => {
                  const s = STATUS[order.status] || STATUS.pending;
                  return (
                    <tr key={order.id}>
                      <td style={{ fontFamily: "monospace", color: "#7a5e3a" }}>#{order.id}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#f0dba8" }}>{order.full_name}</div>
                        <div style={{ fontSize: 11, color: "#7a5e3a" }}>{order.customer_email}</div>
                      </td>
                      <td style={{ fontSize: 12, color: "#7a5e3a", whiteSpace: "nowrap" }}>
                        {/* toLocaleDateString: formats the date for the user's locale */}
                        {new Date(order.created_at).toLocaleDateString("en-KE", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </td>
                      <td style={{ fontWeight: 600 }}>{kes.format(order.total_amount)}</td>
                      <td><span className={`ap-badge ${s.cls}`}>{s.label}</span></td>
                      <td>
                        {/* Status dropdown — only show next logical statuses */}
                        <select
                          className="ap-select"
                          style={{ height: 32, fontSize: 12, width: 130 }}
                          value={order.status}
                          disabled={updating === order.id}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS[s].label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {data.pagination?.total_pages > 1 && (
          <div className="ap-pagination">
            <span className="ap-page-info">
              Page {data.pagination.page} of {data.pagination.total_pages}
            </span>
            <button className="ap-page-btn" disabled={!data.pagination.has_previous} onClick={() => updateParams({ page: String(page - 1) })}>
              <i className="ti ti-chevron-left" />
            </button>
            <button className="ap-page-btn" disabled={!data.pagination.has_next} onClick={() => updateParams({ page: String(page + 1) })}>
              <i className="ti ti-chevron-right" />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}