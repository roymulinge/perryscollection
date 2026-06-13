// src/pages/CategoryPage.jsx
// Shows products filtered to a single category.
// Fetches category + its products from /api/categories/<slug>/
// Supports pagination via ?page=N query param.

import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { fetchCategoryProducts } from "../api/products";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function ProductCard({ product, onAddToCart }) {
  const [hovered, setHovered] = useState(false);
  const [adding, setAdding] = useState(false);
  const initials = product.name.split(" ").slice(0, 2).map((w) => w[0]).join("");

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true);
    await onAddToCart(product.id);
    setAdding(false);
  }

  return (
    <Link
      to={`/products/${product.slug}`}
      style={{
        display: "block", textDecoration: "none", borderRadius: 12,
        overflow: "hidden", background: "#1a0f08",
        border: `1px solid ${hovered ? "rgba(196,148,72,0.45)" : "rgba(196,148,72,0.15)"}`,
        transition: "border-color 0.25s,transform 0.25s,box-shadow 0.25s",
        transform: hovered ? "translateY(-4px)" : "none",
        boxShadow: hovered ? "0 12px 32px rgba(0,0,0,0.5)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        aspectRatio: "4/5",
        background: "linear-gradient(135deg,#2a1708 0%,#1a0f08 60%,#261505 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        {product.image ? (
          <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: "rgba(196,148,72,0.1)", border: "1px solid rgba(196,148,72,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 600, color: "#c49448", fontFamily: "Georgia,serif",
          }}>{initials}</div>
        )}
        {product.stock === 0 && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(18,10,6,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#9a7a4a", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Out of stock
            </span>
          </div>
        )}
        {/* Quick add — only show on hover for in-stock items */}
        {product.stock > 0 && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "0.75rem",
            background: "linear-gradient(to top,rgba(18,10,6,0.9) 0%,transparent 100%)",
            transform: hovered ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.25s",
          }}>
            <button
              onClick={handleAdd}
              disabled={adding}
              style={{
                width: "100%", padding: "0.5rem",
                background: adding ? "rgba(196,148,72,0.5)" : "linear-gradient(135deg,#c49448,#8b5e1a)",
                border: "none", borderRadius: 8,
                fontSize: 12, fontWeight: 700, color: "#120a06", cursor: "pointer",
              }}
            >
              {adding ? "Adding…" : "Add to Cart"}
            </button>
          </div>
        )}
      </div>
      <div style={{ padding: "0.85rem 1rem" }}>
        <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 500, color: "#ddc799", lineHeight: 1.3 }}>{product.name}</p>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#c49448" }}>
          KES {parseInt(product.price).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}

export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();

  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [data, setData] = useState(null); // { category, products, pagination }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchCategoryProducts(slug, currentPage)
      .then(setData)
      .catch((err) => {
        setError(err.response?.status === 404 ? "404" : "Failed to load category.");
      })
      .finally(() => setLoading(false));
  }, [slug, currentPage]);

  async function handleAddToCart(productId) {
    if (!user) {
      navigate("/login", { state: { from: `/categories/${slug}` } });
      return;
    }
    await addItem(productId, 1);
  }

  function goToPage(page) {
    setSearchParams({ page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return (
    <div style={styles.center}>
      <div style={styles.spinner} />
    </div>
  );

  if (error === "404") return (
    <div style={styles.center}>
      <h1 style={{ color: "#f0dba8", fontFamily: "Georgia,serif" }}>Category not found</h1>
      <Link to="/products" style={styles.goldBtn}>Browse all products</Link>
    </div>
  );

  if (error) return (
    <div style={styles.center}>
      <p style={{ color: "#fca5a5" }}>{error}</p>
      <button onClick={() => window.location.reload()} style={styles.goldBtn}>Retry</button>
    </div>
  );

  const { category, products, pagination } = data;

  return (
    <main style={{ background: "#120a06", minHeight: "100vh", padding: "2.5rem 1.5rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: "2rem", display: "flex", gap: "0.5rem", alignItems: "center", fontSize: 13, color: "#5a3e22" }} aria-label="Breadcrumb">
          <Link to="/" style={{ color: "#7a5e3a", textDecoration: "none" }}>Home</Link>
          <i className="ti ti-chevron-right" style={{ fontSize: 12 }} aria-hidden="true" />
          <Link to="/products" style={{ color: "#7a5e3a", textDecoration: "none" }}>Products</Link>
          <i className="ti ti-chevron-right" style={{ fontSize: 12 }} aria-hidden="true" />
          <span style={{ color: "#c4ab82" }}>{category.name}</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 400, color: "#f0dba8", margin: "0 0 8px" }}>
            {category.name}
          </h1>
          <p style={{ color: "#7a5e3a", fontSize: 14, margin: 0 }}>
            {pagination.total} {pagination.total === 1 ? "product" : "products"}
          </p>
        </div>

        {/* Products grid */}
        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 0", color: "#7a5e3a" }}>
            <i className="ti ti-package-off" style={{ fontSize: 48, display: "block", marginBottom: "1rem", color: "#3a2a18" }} aria-hidden="true" />
            <p style={{ fontSize: 16, marginBottom: "1.5rem" }}>No products in this category yet.</p>
            <Link to="/products" style={styles.goldBtn}>Browse all products</Link>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
            gap: "1.25rem",
            marginBottom: "3rem",
          }}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={!pagination.has_previous}
              style={{ ...styles.pageBtn, opacity: pagination.has_previous ? 1 : 0.35 }}
            >
              <i className="ti ti-arrow-left" aria-hidden="true" /> Prev
            </button>

            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                style={{
                  ...styles.pageBtn,
                  background: p === currentPage ? "linear-gradient(135deg,#c49448,#8b5e1a)" : "transparent",
                  color: p === currentPage ? "#120a06" : "#c4ab82",
                  border: p === currentPage ? "none" : "1px solid rgba(196,148,72,0.2)",
                  fontWeight: p === currentPage ? 700 : 500,
                }}
                aria-current={p === currentPage ? "page" : undefined}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={!pagination.has_next}
              style={{ ...styles.pageBtn, opacity: pagination.has_next ? 1 : 0.35 }}
            >
              Next <i className="ti ti-arrow-right" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

const styles = {
  center: { minHeight: "60vh", background: "#120a06", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "2rem" },
  spinner: { width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(196,148,72,0.15)", borderTopColor: "#c49448", animation: "pc-spin 0.8s linear infinite" },
  goldBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "0.75rem 2rem", background: "linear-gradient(135deg,#c49448,#8b5e1a)", borderRadius: 10, color: "#120a06", fontWeight: 700, textDecoration: "none", fontSize: 14, border: "none", cursor: "pointer" },
  pageBtn: { padding: "0.5rem 0.85rem", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#c4ab82", border: "1px solid rgba(196,148,72,0.2)", background: "transparent", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s,color 0.2s" },
};