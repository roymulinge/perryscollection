// src/pages/ProductDetailPage.jsx
// Fetches a single product by slug from /api/products/<slug>/
// Shows image, description, price, stock status, and Add to Cart.
// Handles loading, 404, and out-of-stock states.

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchProduct } from "../api/products";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function ProductDetailPage() {
  const { slug } = useParams();
  // useParams reads :slug from the route /products/:slug

  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);
  // addedFeedback: shows "Added!" briefly after adding to cart

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchProduct(slug)
      .then(setProduct)
      .catch((err) => {
        if (err.response?.status === 404) {
          setError("404");
        } else {
          setError("Failed to load product. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [slug]); // re-fetch whenever slug changes

  async function handleAddToCart() {
    if (!user) {
      // Redirect to login, remembering to come back here
      navigate("/login", { state: { from: `/products/${slug}` } });
      return;
    }

    setAdding(true);
    try {
      await addItem(product.id, quantity);
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 2000);
    } catch {
      // addItem failed — cart context handles the state, just stop loading
    } finally {
      setAdding(false);
    }
  }

  const inStock = product?.stock > 0;
  const lowStock = product?.stock > 0 && product?.stock <= 5;

  if (loading) return (
    <div style={styles.loadingWrap}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>Loading product…</p>
    </div>
  );

  if (error === "404") return (
    <div style={styles.errorWrap}>
      <p style={styles.errorCode}>404</p>
      <h1 style={styles.errorTitle}>Product not found</h1>
      <p style={styles.errorDesc}>This product may no longer be available.</p>
      <Link to="/products" style={styles.goldBtn}>Browse all products</Link>
    </div>
  );

  if (error) return (
    <div style={styles.errorWrap}>
      <p style={styles.errorDesc}>{error}</p>
      <button onClick={() => window.location.reload()} style={styles.goldBtn}>Try again</button>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pc-spin { to { transform: rotate(360deg); } }
        .pc-qty-btn { width:36px;height:36px;border-radius:8px;border:1px solid rgba(196,148,72,0.25);background:transparent;color:#c4ab82;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s,color 0.2s; }
        .pc-qty-btn:hover:not(:disabled) { background:rgba(196,148,72,0.1);color:#e8c87a; }
        .pc-qty-btn:disabled { opacity:0.35;cursor:not-allowed; }
        .pc-add-btn { flex:1;height:52px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:0.03em;transition:opacity 0.2s,transform 0.15s; }
        .pc-add-btn:hover:not(:disabled) { opacity:0.88;transform:translateY(-2px); }
        .pc-add-btn:disabled { opacity:0.55;cursor:not-allowed; }
        .pc-wish-btn { width:52px;height:52px;border-radius:12px;border:1px solid rgba(196,148,72,0.25);background:transparent;color:#c4ab82;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s,border-color 0.2s,color 0.2s; }
        .pc-wish-btn:hover { background:rgba(196,148,72,0.08);border-color:rgba(196,148,72,0.4);color:#e8c87a; }
        @media(max-width:800px){
          .pd-grid { grid-template-columns:1fr !important; }
          .pd-image-wrap { aspect-ratio:4/3 !important; }
        }
      `}</style>

      <main style={{ background: "#120a06", minHeight: "100vh", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Breadcrumb */}
          <nav style={{ marginBottom: "2rem", display: "flex", gap: "0.5rem", alignItems: "center", fontSize: 13, color: "#5a3e22" }} aria-label="Breadcrumb">
            <Link to="/" style={{ color: "#7a5e3a", textDecoration: "none" }}>Home</Link>
            <i className="ti ti-chevron-right" style={{ fontSize: 12 }} aria-hidden="true" />
            <Link to="/products" style={{ color: "#7a5e3a", textDecoration: "none" }}>Products</Link>
            <i className="ti ti-chevron-right" style={{ fontSize: 12 }} aria-hidden="true" />
            <span style={{ color: "#c4ab82" }}>{product.name}</span>
          </nav>

          {/* Main grid */}
          <div className="pd-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3.5rem", alignItems: "start" }}>

            {/* Image */}
            <div className="pd-image-wrap" style={{
              aspectRatio: "4/5", borderRadius: 16,
              background: "linear-gradient(135deg,#2a1708 0%,#1a0f08 60%,#261505 100%)",
              border: "1px solid rgba(196,148,72,0.15)",
              overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {product.image ? (
                <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: 100, height: 100, borderRadius: "50%",
                    background: "rgba(196,148,72,0.1)", border: "1px solid rgba(196,148,72,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 12px", fontSize: 36, fontWeight: 600,
                    color: "#c49448", fontFamily: "Georgia,serif",
                  }}>
                    {product.name.slice(0, 2).toUpperCase()}
                  </div>
                  <p style={{ color: "#5a3e22", fontSize: 13 }}>No image available</p>
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              {/* Category pill */}
              {product.category && (
                <Link to={`/categories/${product.category.slug}`} style={{
                  display: "inline-block", marginBottom: "1rem",
                  padding: "4px 12px", borderRadius: 20,
                  background: "rgba(196,148,72,0.1)", border: "1px solid rgba(196,148,72,0.2)",
                  fontSize: 12, color: "#c49448", textDecoration: "none", letterSpacing: "0.06em",
                }}>
                  {product.category.name}
                </Link>
              )}

              <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 400, color: "#f0dba8", margin: "0 0 0.75rem", lineHeight: 1.2 }}>
                {product.name}
              </h1>

              <p style={{ fontSize: "2rem", fontWeight: 700, color: "#c49448", margin: "0 0 1.5rem", fontFamily: "Georgia,serif" }}>
                KES {parseInt(product.price).toLocaleString()}
              </p>

              {/* Stock badge */}
              <div style={{ marginBottom: "1.5rem" }}>
                {!inStock && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", fontSize: 13, color: "#fca5a5" }}>
                    <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" /> Out of stock
                  </span>
                )}
                {lowStock && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(196,148,72,0.1)", border: "1px solid rgba(196,148,72,0.25)", fontSize: 13, color: "#e8c87a" }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: 12 }} aria-hidden="true" /> Only {product.stock} left
                  </span>
                )}
                {inStock && !lowStock && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 13, color: "#86efac" }}>
                    <i className="ti ti-check" style={{ fontSize: 12 }} aria-hidden="true" /> In stock
                  </span>
                )}
              </div>

              {/* Description */}
              <p style={{ fontSize: 15, lineHeight: 1.8, color: "#9a7a4a", margin: "0 0 2rem", borderTop: "1px solid rgba(196,148,72,0.1)", paddingTop: "1.5rem" }}>
                {product.description}
              </p>

              {/* Quantity + Add to cart */}
              {inStock && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7a5e3a", marginBottom: 10 }}>
                    Quantity
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <button
                      className="pc-qty-btn"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <i className="ti ti-minus" aria-hidden="true" />
                    </button>
                    <span style={{ minWidth: 32, textAlign: "center", fontSize: 16, fontWeight: 600, color: "#f0dba8" }}>
                      {quantity}
                    </span>
                    <button
                      className="pc-qty-btn"
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      disabled={quantity >= product.stock}
                      aria-label="Increase quantity"
                    >
                      <i className="ti ti-plus" aria-hidden="true" />
                    </button>
                    <span style={{ fontSize: 13, color: "#5a3e22" }}>
                      {product.stock} available
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      className="pc-add-btn"
                      onClick={handleAddToCart}
                      disabled={adding}
                      style={{
                        background: addedFeedback
                          ? "linear-gradient(135deg,#22c55e,#16a34a)"
                          : "linear-gradient(135deg,#c49448,#8b5e1a)",
                        color: "#120a06",
                      }}
                    >
                      {adding ? "Adding…" : addedFeedback ? "✓ Added to cart!" : "Add to Cart"}
                    </button>
                    <button className="pc-wish-btn" aria-label="Save to wishlist">
                      <i className="ti ti-heart" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {/* Trust signals */}
              <div style={{ borderTop: "1px solid rgba(196,148,72,0.1)", paddingTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  { icon: "ti-truck", text: "Free delivery in Nairobi on orders over KES 3,000" },
                  { icon: "ti-shield-check", text: "Pay with M-Pesa or Cash on Delivery" },
                  { icon: "ti-refresh", text: "7-day hassle-free returns" },
                ].map((t) => (
                  <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#7a5e3a" }}>
                    <i className={`ti ${t.icon}`} style={{ color: "#c49448", fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
                    {t.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

const styles = {
  loadingWrap: { minHeight: "60vh", background: "#120a06", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" },
  spinner: { width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(196,148,72,0.15)", borderTopColor: "#c49448", animation: "pc-spin 0.8s linear infinite" },
  loadingText: { color: "#7a5e3a", fontSize: 14 },
  errorWrap: { minHeight: "70vh", background: "#120a06", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem", gap: "0.75rem" },
  errorCode: { fontFamily: "Georgia,serif", fontSize: 96, color: "rgba(196,148,72,0.12)", margin: 0, lineHeight: 1 },
  errorTitle: { fontFamily: "Georgia,serif", fontSize: "2rem", color: "#f0dba8", margin: 0 },
  errorDesc: { color: "#7a5e3a", fontSize: 15, margin: 0 },
  goldBtn: { marginTop: "0.5rem", display: "inline-flex", alignItems: "center", gap: 8, padding: "0.75rem 2rem", background: "linear-gradient(135deg,#c49448,#8b5e1a)", borderRadius: 10, color: "#120a06", fontWeight: 700, textDecoration: "none", fontSize: 14, border: "none", cursor: "pointer" },
};