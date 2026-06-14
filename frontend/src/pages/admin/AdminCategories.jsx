// src/pages/admin/AdminCategories.jsx
// Category management — add, rename, delete.

import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { fetchAdminCategories, createCategory, updateCategory, deleteCategory } from "../../api/admin";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try { setCategories(await fetchAdminCategories()); }
    catch { showToast("Failed to load categories.", "error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createCategory({ name: newName.trim() });
      setNewName("");
      showToast(`Category "${newName}" created.`);
      load();
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || "Create failed.";
      showToast(msg, "error");
    } finally { setSaving(false); }
  }

  async function handleRename(id) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updateCategory(id, { name: editName.trim() });
      setEditId(null);
      showToast("Category renamed.");
      load();
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || "Rename failed.";
      showToast(msg, "error");
    } finally { setSaving(false); }
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Delete "${cat.name}"? This will fail if it has products.`)) return;
    try {
      await deleteCategory(cat.id);
      showToast(`"${cat.name}" deleted.`);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || "Delete failed.";
      showToast(msg, "error");
    }
  }

  return (
    <AdminLayout title="Categories">
      {toast && (
        <div className={`ap-toast ap-toast-${toast.type}`}>
          <i className={`ti ti-${toast.type === "success" ? "check" : "alert-circle"}`} /> {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 600 }}>
        {/* Add new category */}
        <div className="ap-card" style={{ padding: 20, marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c49448", marginBottom: 14 }}>
            Add new category
          </p>
          <form onSubmit={handleCreate} style={{ display: "flex", gap: 10 }}>
            <input
              className="ap-input"
              placeholder="Category name e.g. Handbags"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit" className="ap-btn ap-btn-primary" disabled={saving || !newName.trim()}>
              <i className="ti ti-plus" /> Add
            </button>
          </form>
        </div>

        {/* Category list */}
        <div className="ap-card">
          {loading ? (
            <div style={{ padding: 24 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 8 }} />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="ap-empty">
              <i className="ti ti-tag-off" />
              <p>No categories yet. Add your first one above.</p>
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px", borderBottom: "1px solid rgba(196,148,72,0.06)"
              }}>
                {editId === cat.id ? (
                  // Inline edit mode
                  <>
                    <input
                      className="ap-input" value={editName} autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(cat.id)}
                      style={{ flex: 1 }}
                    />
                    <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => handleRename(cat.id)} disabled={saving}>
                      <i className="ti ti-check" />
                    </button>
                    <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => setEditId(null)}>
                      <i className="ti ti-x" />
                    </button>
                  </>
                ) : (
                  // Read mode
                  <>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, color: "#ddc799" }}>{cat.name}</span>
                      <span style={{ fontSize: 11, color: "#7a5e3a", marginLeft: 10 }}>
                        {cat.product_count} product{cat.product_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => { setEditId(cat.id); setEditName(cat.name); }}>
                      <i className="ti ti-edit" />
                    </button>
                    <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => handleDelete(cat)}>
                      <i className="ti ti-trash" />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}