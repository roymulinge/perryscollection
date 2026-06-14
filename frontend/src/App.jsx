// src/App.jsx
// The root of the React app. Every provider wraps every route —
// this is why context is available everywhere.

import { Routes, Route } from "react-router-dom";

// Providers — must wrap everything
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

// Layout components
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";

// Pages
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CategoryPage from "./pages/CategoryPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AccountPage from "./pages/AccountPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminDashboard    from "./pages/admin/AdminDashboard";
import AdminProducts     from "./pages/admin/AdminProducts";
import AdminProductForm  from "./pages/admin/AdminProductForm";
import AdminOrders       from "./pages/admin/AdminOrders";
import AdminCategories   from "./pages/admin/AdminCategories";

export default function App() {
  return (
    // AuthProvider first because CartProvider uses useAuth()
    <AuthProvider>
      <CartProvider>
        <NavBar />

        <Routes>
          {/* Public routes — anyone can access */}
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/categories" element={<ProductsPage />} />
          {/* ↑ Categories list reuses ProductsPage with no filter */}
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />

          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes — we check auth inside the component */}
          <Route path="/account" element={<AccountPage />} />
          <Route path="/orders" element={<OrdersPage />} />

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />

          <Route path="/admin-panel"                         element={<AdminDashboard />}   />
          <Route path="/admin-panel/products"                element={<AdminProducts />}    />
          <Route path="/admin-panel/products/new"            element={<AdminProductForm />} />
          <Route path="/admin-panel/products/:id/edit"       element={<AdminProductForm />} />
          <Route path="/admin-panel/orders"                  element={<AdminOrders />}      />
          <Route path="/admin-panel/categories"              element={<AdminCategories />}  />
        </Routes>

        <Footer />
      </CartProvider>
    </AuthProvider>
  );
}