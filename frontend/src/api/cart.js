// src/api/cart.js
// All shopping cart API calls.

import apiClient from "./client";

/** GET /shopping_cart/ → returns { items, total_items, total_price } */
export async function getCart() {
  const response = await apiClient.get("/shopping_cart/");
  return response.data;
}

/**
 * POST /shopping_cart/add/ → add a product to cart
 * @param {number} productId
 * @param {number} quantity
 */
export async function addToCart(productId, quantity = 1) {
  const response = await apiClient.post("/shopping_cart/add/", {
    product_id: productId,
    quantity,
  });
  return response.data;
}

/**
 * POST /shopping_cart/update/<id>/ → change quantity
 * quantity: 0 means remove the item
 */
export async function updateCartItem(productId, quantity) {
  const response = await apiClient.post(`/shopping_cart/update/${productId}/`, { quantity });
  return response.data;
}

/** DELETE /shopping_cart/remove/<id>/ → remove item */
export async function removeFromCart(productId) {
  await apiClient.delete(`/shopping_cart/remove/${productId}/`);
}

/** DELETE /shopping_cart/ → clear entire cart */
export async function clearCart() {
  await apiClient.delete("/shopping_cart/");
}