// src/pages/admin/AdminProducts.jsx
// Product list with search, filter, inline quick-actions.

import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { fetchAdminProducts, deleteProduct, updateProduct } from "../../api/admin";

const kes = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

// STATUS_BADGE: maps boolean/stock state to a badge style class
function StockBadge({ product }) {
  if (product.stock === 0)            return <span className="ap-badge ap-badge-red">Out of stock</span>;
  if (product.is_low_stock)           return <span className="ap-badge ap-badge-amber">Low stock ({product.stock})</span>;
  return <span className="ap-badge ap-badge-green">{product.stock} in stock</span>;
}

export default function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ products: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");

  const page = Number(searchParams.get("page") || 1);
  const q    = searchParams.get("q") || "";

  // showToast: displays a temporary success/error message
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000); // auto-dismiss after 3s
  }

  // load: fetches products based on current URL params
  // useCallback memoises the function so it doesn't recreate on every render
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminProducts({ page, q });
      setData(result);
    } catch {
      showToast("Failed to load products.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, q]); // recreate only when page or q changes

  // Run load whenever page or q changes
  useEffect(() => { load(); }, [load]);

  function updateParams(next) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => v ? params.set(k, v) : params.delete(k));
    setSearchParams(params);
  }

  function handleSearch(e) {
    e.preventDefault();
    updateParams({ q: searchInput.trim(), page: "" });
  }

  async function handleToggleFeatured(product) {
    try {
      await updateProduct(product.id, { featured: !product.featured });
      showToast(`${product.name} ${!product.featured ? "marked featured" : "unmarked"}.`);
      load(); // refresh the list
    } catch {
      showToast("Update failed.", "error");
    }
  }

  async function handleDelete(product) {
    // window.confirm shows a native browser dialog — simple, no extra library needed
    if (!window.confirm(`Deactivate "${product.name}"? It won't be visible to customers.`)) return;
    try {
      await deleteProduct(product.id);
      showToast(`"${product.name}" deactivated.`);
      load();
    } catch {
      showToast("Delete failed.", "error");
    }
  }

  return (
    <AdminLayout title="Products">
      {/* Toast */}
      {toast && (
        <div className={`ap-toast ap-toast-${toast.type}`}>
          <i className={`ti ti-${toast.type === "success" ? "check" : "alert-circle"}`} /> {toast.msg}
        </div>
      )}

      {/* Search + Add button */}
      <div className="ap-search-bar">
        <form onSubmit={handleSearch} style={{ display: "contents" }}>
          <input
            className="ap-search-input"
            placeholder="Search by name, SKU, description…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="ap-btn ap-btn-secondary">
            <i className="ti ti-search" /> Search
          </button>
        </form>
        {q && (
          <button className="ap-btn ap-btn-secondary" onClick={() => { setSearchInput(""); updateParams({ q: "", page: "" }); }}>
            Clear
          </button>
        )}
        <Link to="/admin-panel/products/new" className="ap-btn ap-btn-primary" style={{ marginLeft: "auto" }}>
          <i className="ti ti-plus" /> Add product
        </Link>
      </div>

      {/* Table */}
      <div className="ap-card">
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }, (_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : data.products.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="ap-empty">
                      <i className="ti ti-package-off" />
                      <p>No products found.</p>
                      <Link to="/admin-panel/products/new" className="ap-btn ap-btn-primary">
                        Add your first product
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                data.products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {/* Product image thumbnail */}
                        <div style={{
                          width: 40, height: 40, borderRadius: 6,
                          background: "#2a1708",
                          border: "1px solid rgba(196,148,72,0.15)",
                          overflow: "hidden", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, color: "#c49448", fontWeight: 600,
                        }}>
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : p.name.substring(0, 2).toUpperCase()
                          }
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#f0dba8", fontSize: 13 }}>{p.name}</div>
                          {p.featured && <span style={{ fontSize: 10, color: "#c49448" }}>★ Featured</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "#7a5e3a", fontFamily: "monospace" }}>{p.sku}</td>
                    <td>{p.category_name}</td>
                    <td style={{ fontWeight: 600 }}>{kes.format(p.price)}</td>
                    <td><StockBadge product={p} /></td>
                    <td>
                      {p.is_active
                        ? <span className="ap-badge ap-badge-green">Active</span>
                        : <span className="ap-badge ap-badge-gray">Inactive</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link to={`/admin-panel/products/${p.id}/edit`} className="ap-btn ap-btn-secondary ap-btn-sm">
                          <i className="ti ti-edit" />
                        </Link>
                        <button
                          className="ap-btn ap-btn-secondary ap-btn-sm"
                          onClick={() => handleToggleFeatured(p)}
                          title={p.featured ? "Remove from featured" : "Mark as featured"}
                        >
                          <i className={`ti ${p.featured ? "ti-star-off" : "ti-star"}`} />
                        </button>
                        <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => handleDelete(p)}>
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.pagination?.total_pages > 1 && (
          <div className="ap-pagination">
            <span className="ap-page-info">
              Page {data.pagination.page} of {data.pagination.total_pages} ({data.pagination.total} products)
            </span>
            <button
              className="ap-page-btn"
              disabled={!data.pagination.has_previous}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              <i className="ti ti-chevron-left" />
            </button>
            <button
              className="ap-page-btn"
              disabled={!data.pagination.has_next}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              <i className="ti ti-chevron-right" />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}