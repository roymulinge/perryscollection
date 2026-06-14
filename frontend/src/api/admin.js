// src/api/admin.js
// All admin-panel API calls.
// Every function here requires the user to be is_staff or is_shop_owner —
// the backend enforces this; if a regular user somehow calls these,
// they get 403 and the interceptor in client.js handles it.

import apiClient from "./client";

// ── Dashboard ────────────────────────────────────────────────────

/** GET /api/admin/dashboard/ → { total_products, total_orders, ... } */
export async function fetchDashboardStats() {
  const res = await apiClient.get("/admin/dashboard/");
  return res.data;
}

// ── Products ─────────────────────────────────────────────────────

/**
 * List all products (admin view — includes inactive).
 * @param {Object} params - { page, q, category, stock }
 */
export async function fetchAdminProducts(params = {}) {
  const res = await apiClient.get("/admin/products/", { params });
  return res.data;
}

/**
 * Get a single product by ID.
 * @param {number} id
 */
export async function fetchAdminProduct(id) {
  const res = await apiClient.get(`/admin/products/${id}/`);
  return res.data;
}

/**
 * Create a new product.
 * Data is FormData (not JSON) because it includes an image file.
 * @param {FormData} formData
 */
export async function createProduct(formData) {
  const res = await apiClient.post("/admin/products/", formData, {
    // Override Content-Type — axios will set the correct multipart boundary
    // automatically when it detects a FormData object.
    // If we leave Content-Type as application/json, the file upload breaks.
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/**
 * Update a product (full or partial).
 * @param {number} id
 * @param {FormData|Object} data
 * @param {boolean} partial — true uses PATCH, false uses PUT
 */
export async function updateProduct(id, data, partial = true) {
  const isFormData = data instanceof FormData;
  const method = partial ? "patch" : "put";

  const res = await apiClient[method](`/admin/products/${id}/`, data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return res.data;
}

/**
 * Soft-delete a product (sets is_active=False).
 * @param {number} id
 */
export async function deleteProduct(id) {
  const res = await apiClient.delete(`/admin/products/${id}/`);
  return res.data;
}

/** GET /api/admin/products/low-stock/ */
export async function fetchLowStockProducts() {
  const res = await apiClient.get("/admin/products/low-stock/");
  return res.data;
}

// ── Categories ───────────────────────────────────────────────────

/** GET /api/admin/categories/ */
export async function fetchAdminCategories() {
  const res = await apiClient.get("/admin/categories/");
  return res.data;
}

/**
 * Create a new category.
 * @param {{ name: string }} data
 */
export async function createCategory(data) {
  const res = await apiClient.post("/admin/categories/", data);
  return res.data;
}

/**
 * Rename a category.
 * @param {number} id
 * @param {{ name: string }} data
 */
export async function updateCategory(id, data) {
  const res = await apiClient.patch(`/admin/categories/${id}/`, data);
  return res.data;
}

/**
 * Delete a category (fails if products exist in it).
 * @param {number} id
 */
export async function deleteCategory(id) {
  const res = await apiClient.delete(`/admin/categories/${id}/`);
  return res.data;
}

// ── Orders ───────────────────────────────────────────────────────

/**
 * List all orders.
 * @param {Object} params - { page, status, q }
 */
export async function fetchAdminOrders(params = {}) {
  const res = await apiClient.get("/admin/orders/", { params });
  return res.data;
}

/** Get a single order with all items. */
export async function fetchAdminOrder(id) {
  const res = await apiClient.get(`/admin/orders/${id}/`);
  return res.data;
}

/**
 * Update order status.
 * Triggers a notification to the customer automatically (via Django signals).
 * @param {number} id
 * @param {string} newStatus — 'pending'|'paid'|'shipped'|'delivered'|'cancelled'
 */
export async function updateOrderStatus(id, newStatus) {
  const res = await apiClient.patch(`/admin/orders/${id}/`, { status: newStatus });
  return res.data;
}