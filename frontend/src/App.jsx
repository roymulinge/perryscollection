// src/App.jsx
// The root of the React app. Every provider wraps every route —
// this is why context is available everywhere.

import { Routes, Route } from "react-router-dom";

// Providers — must wrap everything
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

// Route guards — new
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute   from "./components/AdminRoute";

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
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyCodePage     from './pages/VerifyCodePage';
import ResetPasswordPage  from './pages/ResetPasswordPage';
import AccountPage from "./pages/AccountPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminDashboard    from "./pages/admin/AdminDashboard";
import AdminProducts     from "./pages/admin/AdminProducts";
import AdminProductForm  from "./pages/admin/AdminProductForm";
import AdminOrders       from "./pages/admin/AdminOrders";
import AdminCategories   from "./pages/admin/AdminCategories";
import InventoryDashboardPage from "./pages/InventoryDashboardPage";
import ProfilePage from "./pages/ProfilePage";

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
          <Route path="/checkout" element={
            <PrivateRoute><CheckoutPage /></PrivateRoute>
          } />

          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-code"     element={<VerifyCodePage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/profile" element={ <PrivateRoute><ProfilePage /></PrivateRoute>} />
          {/* Protected routes — we check auth inside the component */}
          <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
           <Route path="/orders" element={
            <PrivateRoute><OrdersPage /></PrivateRoute>
          } />

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />

          <Route path="/admin-panel/" element={
            <AdminRoute><AdminDashboard /></AdminRoute>
          } />
          <Route path="/admin-panel/products" element={
            <AdminRoute><AdminProducts /></AdminRoute>
          } />
          <Route path="/admin-panel/products/new" element={
            <AdminRoute><AdminProductForm /></AdminRoute>
          } />
          <Route path="/admin-panel/products/:id/edit" element={
            <AdminRoute><AdminProductForm /></AdminRoute>
          } />
          <Route path="/admin-panel/orders" element={
            <AdminRoute><AdminOrders /></AdminRoute>
          } />
          <Route path="/admin-panel/categories" element={
            <AdminRoute><AdminCategories /></AdminRoute>
          } />
          <Route path="/inventory" element={
            <AdminRoute><InventoryDashboardPage /></AdminRoute>
          } />
        </Routes>

        <Footer />
      </CartProvider>
    </AuthProvider>
  );
}