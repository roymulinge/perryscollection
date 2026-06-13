// src/context/CartContext.jsx
// Same pattern as AuthContext but for the shopping cart.
// This gives Navbar the live item count and lets any page update the cart.

import { createContext, useContext, useEffect, useState } from "react";
import { getCart, addToCart as addToCartApi, removeFromCart as removeApi, clearCart as clearApi } from "../api/cart";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], total_items: 0, total_price: "0.00" });
  const [cartLoading, setCartLoading] = useState(false);
  const { user } = useAuth();
  // We watch `user` so we can refresh the cart when someone logs in

  // Fetch cart from the backend session
  async function refreshCart() {
    setCartLoading(true);
    try {
      const data = await getCart();
      setCart(data);
    } catch {
      // Cart fetch failed (e.g. network error) — keep existing state
    } finally {
      setCartLoading(false);
    }
  }

  useEffect(() => {
    // Load cart on mount AND whenever user changes (login/logout)
    refreshCart();
  }, [user]);

  async function addItem(productId, quantity = 1) {
    await addToCartApi(productId, quantity);
    await refreshCart(); // re-fetch so count is accurate
  }

  async function removeItem(productId) {
    await removeApi(productId);
    await refreshCart();
  }

  async function clearCart() {
    await clearApi();
    await refreshCart();
  }

  return (
    <CartContext.Provider value={{ cart, cartLoading, addItem, removeItem, clearCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}