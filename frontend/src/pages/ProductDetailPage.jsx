// src/pages/ProductDetailPage.jsx
// Fetches a single product by slug from /api/products/<slug>/
// Shows image, description, price, stock status, and Add to Cart.
// Handles loading, 404, and out-of-stock states.

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchProduct } from "../api/products";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const T = {
  paper: "#FFFFFF",
  cream: "#F6F1E6",
  ink: "#221E19",
  inkSoft: "#5B564C",
  brass: "#A5793A",
  brassDark: "#7C5A29",
  oxide: "#8B4632",
  sage: "#4d7a4d",
  line: "#E5DFD1",
};

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

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
  }, [slug]);

  async function handleAddToCart() {
    if (!user) {
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
      <Link to="/products" style={styles.darkBtn}>Browse all products</Link>
    </div>
  );

  if (error) return (
    <div style={styles.errorWrap}>
      <p style={styles.errorDesc}>{error}</p>
      <button onClick={() => window.location.reload()} style={styles.darkBtn}>Try again</button>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pc-spin { to { transform: rotate(360deg); } }
        .pc-qty-btn { width:36px;height:36px;border-radius:3px;border:1px solid #E5DFD1;background:#FFFFFF;color:#221E19;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s,border-color 0.2s; }
        .pc-qty-btn:hover:not(:disabled) { background:#F6F1E6;border-color:#A5793A; }
        .pc-qty-btn:disabled { opacity:0.35;cursor:not-allowed; }
        .pc-add-btn { flex:1;height:52px;border:none;border-radius:3px;font-size:15px;font-weight:600;cursor:pointer;letter-spacing:0.02em;transition:background 0.2s;font-family:'Archivo',sans-serif; }
        .pc-add-btn:disabled { opacity:0.55;cursor:not-allowed; }
        .pc-wish-btn { width:52px;height:52px;border-radius:3px;border:1px solid #E5DFD1;background:#FFFFFF;color:#5B564C;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s,border-color 0.2s,color 0.2s; }
        .pc-wish-btn:hover { background:#F6F1E6;border-color:#A5793A;color:#7C5A29; }
        @media(max-width:800px){
          .pd-grid { grid-template-columns:1fr !important; gap:2rem !important; }
          .pd-image-wrap { aspect-ratio:4/3 !important; }
        }
        @media(max-width:480px){
          .pd-page { padding:1.5rem 1rem !important; }
          .pd-crumb-current { max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
          .pd-actions { flex-direction:column !important; }
          .pc-wish-btn { width:100% !important; }
        }
      `}</style>

      <main className="pd-page" style={{ background: T.paper, minHeight: "100vh", padding: "2.5rem 1.5rem", fontFamily: "'Archivo',sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Breadcrumb */}
          <nav style={{ marginBottom: "2rem", display: "flex", gap: "0.5rem", alignItems: "center", fontSize: 13, color: T.inkSoft }} aria-label="Breadcrumb">
            <Link to="/" style={{ color: T.inkSoft, textDecoration: "none" }}>Home</Link>
            <i className="ti ti-chevron-right" style={{ fontSize: 12 }} aria-hidden="true" />
            <Link to="/products" style={{ color: T.inkSoft, textDecoration: "none" }}>Products</Link>
            <i className="ti ti-chevron-right" style={{ fontSize: 12 }} aria-hidden="true" />
            <span className="pd-crumb-current" style={{ color: T.ink }}>{product.name}</span>
          </nav>

          {/* Main grid */}
          <div className="pd-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3.5rem", alignItems: "start" }}>

            {/* Image */}
            <div className="pd-image-wrap" style={{
              aspectRatio: "4/5", borderRadius: 4,
              background: T.cream,
              border: `1px solid ${T.line}`,
              overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: 96, height: 96, borderRadius: "50%",
                    background: T.paper, border: `1px solid ${T.line}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 12px", fontSize: 32, fontWeight: 400,
                    color: T.brassDark, fontFamily: "'Instrument Serif',serif",
                  }}>
                    {product.name.slice(0, 2).toUpperCase()}
                  </div>
                  <p style={{ color: T.inkSoft, fontSize: 13 }}>No image available</p>
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              {product.category && (
                <Link to={`/categories/${product.category.slug}`} style={{
                  display: "inline-block", marginBottom: "1rem",
                  padding: "5px 12px", borderRadius: 20,
                  background: T.cream, border: `1px solid ${T.line}`,
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 11.5, color: T.brassDark, textDecoration: "none", letterSpacing: "0.06em",
                }}>
                  {product.category.name}
                </Link>
              )}

              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 400, color: T.ink, margin: "0 0 0.75rem", lineHeight: 1.2 }}>
                {product.name}
              </h1>

              <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "1.6rem", fontWeight: 500, color: T.brassDark, margin: "0 0 1.5rem" }}>
                KES {parseInt(product.price).toLocaleString()}
              </p>

              {/* Stock badge */}
              <div style={{ marginBottom: "1.5rem" }}>
                {!inStock && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(139,70,50,0.06)", border: "1px solid rgba(139,70,50,0.25)", fontSize: 13, color: T.oxide }}>
                    <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" /> Out of stock
                  </span>
                )}
                {lowStock && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: T.cream, border: `1px solid ${T.line}`, fontSize: 13, color: T.brassDark }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: 12 }} aria-hidden="true" /> Only {product.stock} left
                  </span>
                )}
                {inStock && !lowStock && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(77,122,77,0.07)", border: "1px solid rgba(77,122,77,0.2)", fontSize: 13, color: T.sage }}>
                    <i className="ti ti-check" style={{ fontSize: 12 }} aria-hidden="true" /> In stock
                  </span>
                )}
              </div>

              {/* Description */}
              <p style={{ fontSize: 15, lineHeight: 1.8, color: T.inkSoft, margin: "0 0 2rem", borderTop: `1px solid ${T.line}`, paddingTop: "1.5rem" }}>
                {product.description}
              </p>

              {/* Quantity + Add to cart */}
              {inStock && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 10 }}>
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
                    <span style={{ minWidth: 32, textAlign: "center", fontSize: 16, fontWeight: 600, color: T.ink }}>
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
                    <span style={{ fontSize: 13, color: T.inkSoft }}>
                      {product.stock} available
                    </span>
                  </div>

                  <div className="pd-actions" style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      className="pc-add-btn"
                      onClick={handleAddToCart}
                      disabled={adding}
                      style={{
                        background: addedFeedback ? T.sage : T.ink,
                        color: T.paper,
                      }}
                    >
                      {adding ? "Adding…" : addedFeedback ? "✓ Added to cart!" : "Add to Cart"}
                    </button>
                    {/* STUB: no wishlist backend/feature exists yet — button is
                        visually present but intentionally has no onClick.
                        Wire this up once a wishlist endpoint exists, don't
                        fake success feedback on a click that does nothing. */}
                    <button className="pc-wish-btn" aria-label="Save to wishlist (coming soon)" title="Coming soon" disabled>
                      <i className="ti ti-heart" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {/* Trust signals */}
              <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  { icon: "ti-truck", text: "Free delivery in Nairobi on orders over KES 3,000" },
                  { icon: "ti-shield-check", text: "Pay with M-Pesa or Cash on Delivery" },
                  { icon: "ti-refresh", text: "7-day hassle-free returns" },
                ].map((t) => (
                  <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: T.inkSoft }}>
                    <i className={`ti ${t.icon}`} style={{ color: T.brassDark, fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
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
  loadingWrap: { minHeight: "60vh", background: T.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" },
  spinner: { width: 32, height: 32, borderRadius: "50%", border: `3px solid ${T.line}`, borderTopColor: T.brass, animation: "pc-spin 0.8s linear infinite" },
  loadingText: { color: T.inkSoft, fontSize: 14, fontFamily: "'Archivo',sans-serif" },
  errorWrap: { minHeight: "70vh", background: T.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem", gap: "0.75rem" },
  errorCode: { fontFamily: "'Instrument Serif',serif", fontSize: 88, color: T.line, margin: 0, lineHeight: 1 },
  errorTitle: { fontFamily: "'Instrument Serif',serif", fontSize: "2rem", color: T.ink, margin: 0, fontWeight: 400 },
  errorDesc: { color: T.inkSoft, fontSize: 15, margin: 0, fontFamily: "'Archivo',sans-serif" },
  darkBtn: { marginTop: "0.5rem", display: "inline-flex", alignItems: "center", gap: 8, padding: "0.85rem 2rem", background: T.ink, borderRadius: 3, color: T.paper, fontWeight: 600, textDecoration: "none", fontSize: 14, border: "none", cursor: "pointer", fontFamily: "'Archivo',sans-serif" },
};