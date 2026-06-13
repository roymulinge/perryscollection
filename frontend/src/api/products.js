// src/api/products.js
// Rewritten to use apiClient (axios) instead of raw fetch.
// This keeps the pattern consistent across all API files.

import apiClient from "./client";

/**
 * Fetch paginated product list with optional filters.
 * @param {Object} params - { page, q, featured }
 * @returns {{ products, pagination, filters }}
 */
export async function fetchProducts({ page = 1, q = "", featured = "" } = {}) {
  // axios handles query params via the `params` option —
  // it builds ?page=1&q=boots automatically, skipping empty values
  const response = await apiClient.get("/products/", {
    params: {
      ...(page > 1 && { page }),          // only send page if > 1
      ...(q && { q }),                    // only send q if not empty
      ...(featured && { featured }),      // only send featured if set
    },
  });
  return response.data;
}

/** Fetch all categories */
export async function fetchCategories() {
  const response = await apiClient.get("/categories/");
  return response.data;
}

/**
 * Fetch a single product by slug.
 * @param {string} slug
 */
export async function fetchProduct(slug) {
  const response = await apiClient.get(`/products/${slug}/`);
  return response.data;
}

/**
 * Fetch products in a category.
 * @param {string} slug
 * @param {number} page
 */
export async function fetchCategoryProducts(slug, page = 1) {
  const response = await apiClient.get(`/categories/${slug}/`, {
    params: { ...(page > 1 && { page }) },
  });
  return response.data;
}