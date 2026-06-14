// src/pages/admin/AdminProductForm.jsx
// Shared form for both ADD and EDIT product.
// When `id` is in the URL params → edit mode.
// When not → create mode.

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { fetchAdminProduct, fetchAdminCategories, createProduct, updateProduct } from "../../api/admin";

export default function AdminProductForm() {
  const { id } = useParams();
  // useParams reads the :id from the URL.
  // /admin-panel/products/new        → id = undefined  → create mode
  // /admin-panel/products/42/edit    → id = "42"       → edit mode
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit); // only show loading in edit mode
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);

  // Form state — mirrors the fields in AdminProductSerializer
  const [form, setForm] = useState({
    name: "", sku: "", description: "",
    price: "", compare_at_price: "",
    stock: "0", low_stock_threshold: "5",
    available: true, is_active: true, featured: false,
    category: "", image: null,
  });

  // Load categories and (in edit mode) the existing product
  useEffect(() => {
    async function init() {
      try {
        const cats = await fetchAdminCategories();
        setCategories(cats);

        if (isEdit) {
          const product = await fetchAdminProduct(id);
          // Populate form with existing data
          setForm({
            name: product.name || "",
            sku: product.sku || "",
            description: product.description || "",
            price: product.price || "",
            compare_at_price: product.compare_at_price || "",
            stock: String(product.stock ?? 0),
            low_stock_threshold: String(product.low_stock_threshold ?? 5),
            available: product.available ?? true,
            is_active: product.is_active ?? true,
            featured: product.featured ?? false,
            category: String(product.category ?? ""),
            image: null, // don't pre-fill — only change if user picks a new one
          });
          if (product.image_url) setImagePreview(product.image_url);
        }
      } catch (err) {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value, type, checked, files } = e.target;

    if (type === "checkbox") {
      // Checkboxes use `checked` not `value`
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "file") {
      // Store the File object for upload and create a preview URL
      const file = files[0];
      setForm((prev) => ({ ...prev, image: file }));
      // URL.createObjectURL: creates a temporary URL for a local file
      // so we can display it in an <img> without uploading first
      if (file) setImagePreview(URL.createObjectURL(file));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    // Clear field error on change
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});

    // Build FormData — necessary because we may have an image file
    // FormData allows sending files + text fields in the same HTTP request
    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (key === "image" && !value) return; // skip if no new image selected
      if (value === null || value === undefined) return;
      // FormData.append(key, value) adds a field
      // Boolean values must be converted to strings — FormData is text-based
      formData.append(key, typeof value === "boolean" ? String(value) : value);
    });

    try {
      if (isEdit) {
        await updateProduct(id, formData);
      } else {
        await createProduct(formData);
      }
      navigate("/admin-panel/products");
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        // Field-level errors from Django serializer
        const flat = {};
        Object.entries(data).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? v.join(" ") : String(v);
        });
        setFieldErrors(flat);
        setError("Please fix the errors below.");
      } else {
        setError("Save failed. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout title={isEdit ? "Edit Product" : "Add Product"}>
        <div style={{ color: "#7a5e3a", padding: 40, textAlign: "center" }}>Loading…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isEdit ? "Edit Product" : "Add Product"}>
      <div style={{ maxWidth: 780 }}>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", padding: "12px 16px", borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
            <i className="ti ti-alert-circle" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ── Basic info ── */}
          <div className="ap-card" style={{ marginBottom: 20, padding: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c49448", marginBottom: 20 }}>
              Basic information
            </p>

            <div className="ap-form-group">
              <label className="ap-form-label">Product name *</label>
              <input className="ap-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Premium Leather Tote" required />
              {fieldErrors.name && <p style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>{fieldErrors.name}</p>}
            </div>

            <div className="ap-form-row">
              <div className="ap-form-group">
                <label className="ap-form-label">SKU (leave blank to auto-generate)</label>
                <input className="ap-input" name="sku" value={form.sku} onChange={handleChange} placeholder="PC-001" />
                {fieldErrors.sku && <p style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>{fieldErrors.sku}</p>}
              </div>
              <div className="ap-form-group">
                <label className="ap-form-label">Category *</label>
                <select className="ap-select" name="category" value={form.category} onChange={handleChange} required>
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {fieldErrors.category && <p style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>{fieldErrors.category}</p>}
              </div>
            </div>

            <div className="ap-form-group">
              <label className="ap-form-label">Description</label>
              <textarea className="ap-textarea" name="description" value={form.description} onChange={handleChange} placeholder="Describe the product…" rows={4} />
            </div>
          </div>

          {/* ── Pricing ── */}
          <div className="ap-card" style={{ marginBottom: 20, padding: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c49448", marginBottom: 20 }}>
              Pricing
            </p>
            <div className="ap-form-row">
              <div className="ap-form-group">
                <label className="ap-form-label">Price (KES) *</label>
                <input className="ap-input" name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={handleChange} placeholder="0.00" required />
                {fieldErrors.price && <p style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>{fieldErrors.price}</p>}
              </div>
              <div className="ap-form-group">
                <label className="ap-form-label">Compare-at price (optional sale display)</label>
                <input className="ap-input" name="compare_at_price" type="number" min="0" step="0.01" value={form.compare_at_price} onChange={handleChange} placeholder="0.00" />
                {fieldErrors.compare_at_price && <p style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>{fieldErrors.compare_at_price}</p>}
              </div>
            </div>
          </div>

          {/* ── Inventory ── */}
          <div className="ap-card" style={{ marginBottom: 20, padding: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c49448", marginBottom: 20 }}>
              Inventory
            </p>
            <div className="ap-form-row">
              <div className="ap-form-group">
                <label className="ap-form-label">Stock quantity *</label>
                <input className="ap-input" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required />
              </div>
              <div className="ap-form-group">
                <label className="ap-form-label">Low stock alert threshold</label>
                <input className="ap-input" name="low_stock_threshold" type="number" min="1" value={form.low_stock_threshold} onChange={handleChange} />
                <p style={{ fontSize: 11, color: "#7a5e3a", marginTop: 4 }}>Alert when stock drops to this number</p>
              </div>
            </div>

            {/* Checkbox toggles */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[
                { name: "available", label: "Available to customers" },
                { name: "is_active", label: "Active (visible in store)" },
                { name: "featured", label: "Featured on homepage" },
              ].map(({ name, label }) => (
                <label key={name} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#c4ab82" }}>
                  <input
                    type="checkbox" name={name}
                    checked={form[name]} onChange={handleChange}
                    style={{ width: 16, height: 16, accentColor: "#c49448", cursor: "pointer" }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* ── Image ── */}
          <div className="ap-card" style={{ marginBottom: 24, padding: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c49448", marginBottom: 20 }}>
              Product image
            </p>

            {imagePreview && (
              <img
                src={imagePreview} alt="Preview"
                style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 14, border: "1px solid rgba(196,148,72,0.2)" }}
              />
            )}

            <input
              type="file" name="image" accept="image/*"
              onChange={handleChange} id="image-upload"
              style={{ display: "none" }}
            />
            {/* Custom styled file button — the real input is hidden */}
            <label htmlFor="image-upload" className="ap-btn ap-btn-secondary" style={{ cursor: "pointer", display: "inline-flex" }}>
              <i className="ti ti-upload" />
              {imagePreview ? "Change image" : "Upload image"}
            </label>
            <p style={{ fontSize: 11, color: "#5a3e22", marginTop: 8 }}>
              JPG, PNG, WebP. Max 5MB. Images are resized to 1200×1200 automatically.
            </p>
          </div>

          {/* ── Submit ── */}
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="ap-btn ap-btn-primary" disabled={saving}>
              <i className={`ti ${saving ? "ti-loader" : "ti-check"}`} />
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
            </button>
            <button type="button" className="ap-btn ap-btn-secondary" onClick={() => navigate("/admin-panel/products")}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}