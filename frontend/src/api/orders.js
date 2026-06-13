// src/api/orders.js

import apiClient from "./client";

/**
 * POST /checkout/ → place an order from the current cart
 * @param {Object} shippingData - { email, full_name, address_line1, city, postal_code, country }
 */
export async function placeOrder(shippingData) {
  const response = await apiClient.post("/checkout/", shippingData);
  return response.data;
}

/** GET /checkout/orders/ → my order history (requires auth) */
export async function getOrders() {
  const response = await apiClient.get("/checkout/orders/");
  return response.data;
}

/** GET /checkout/orders/<id>/ → single order detail */
export async function getOrder(orderId) {
  const response = await apiClient.get(`/checkout/orders/${orderId}/`);
  return response.data;
}