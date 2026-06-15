// src/pages/HomePage.jsx
// ─────────────────────────────────────────────────────────────────
// WHAT CHANGED FROM THE PLACEHOLDER VERSION:
// - Removed PLACEHOLDER_CATEGORIES and PLACEHOLDER_PRODUCTS arrays
// - Added real API calls using fetchProducts and fetchCategories
//   from api/products.js
// - Added loading skeleton states so the page doesn't flash empty
// - Added useCart() so the "Add to Cart" overlay button actually works
// - Category icons are now mapped from category name since the API
//   doesn't return icon strings — we match by name
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchProducts, fetchCategories } from "../api/products";
import { useCart } from "../context/CartContext";

// CATEGORY ICON MAP
// The API returns category names like "Bags", "Jewellery" etc.
// We map those names to Tabler icon class names for display.
// If a category name doesn't match, we fall back to "ti-tag".
const CATEGORY_ICONS = {
  "Clothing":     "ti-shirt",
  "Footwear":     "ti-shoe",
  "Accessories":  "ti-sunglasses",
  "Bags":         "ti-briefcase",
  "Jewellery":    "ti-diamond",
  "New Arrivals": "ti-sparkles",
};

// ── ProductCard ────────────────────────────────────────────────────
// Receives a real product object from the API.
// product.image_url: the full URL built by ProductListSerializer
// product.slug:      used for the detail page link
// product.in_stock:  @property from the Django model
function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // useCart() gives us the addItem() function from CartContext.
  // CartContext calls the Django cart API and refreshes the count.
  const { addItem } = useCart();

  // initials: fallback display when there's no product image.
  // "Premium Leather Tote" → takes first two words → "PL"
  const initials = product.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  async function handleAddToCart(e) {
    // e.preventDefault() stops the click from bubbling up to the
    // <Link> wrapper and navigating to the product detail page.
    e.preventDefault();
    e.stopPropagation(); // belt and braces — stops event propagation

    if (!product.in_stock || adding) return; // guard: don't double-add

    setAdding(true);
    try {
      await addItem(product.id, 1);
      // addItem(productId, quantity) → POST /api/shopping_cart/add/
      // CartContext handles the state update and navbar count refresh

      setAdded(true);
      // Show "Added!" feedback for 2 seconds then reset
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // addItem failed — cart context logs it, we just stop loading
    } finally {
      setAdding(false);
    }
  }

  return (
    <Link
      to={`/products/${product.slug}`}
      style={{
        display: "block",
        textDecoration: "none",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#1a0f08",
        border: `1px solid ${hovered ? "rgba(196,148,72,0.45)" : "rgba(196,148,72,0.15)"}`,
        transition: "border-color 0.25s, transform 0.25s, box-shadow 0.25s",
        transform: hovered ? "translateY(-4px)" : "none",
        boxShadow: hovered ? "0 12px 32px rgba(0,0,0,0.5)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image area ── */}
      <div style={{
        aspectRatio: "4/5",
        background: "linear-gradient(135deg, #2a1708 0%, #1a0f08 60%, #261505 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>

        {/* Real image from Django media server, or initials fallback */}
        {product.image_url ? (
          // image_url is built by get_image_url() in ProductListSerializer.
          // It's the full absolute URL: http://127.0.0.1:8000/media/products/...
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"  // browser loads this image only when near viewport
          />
        ) : (
          // No image uploaded in admin — show initials circle
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "rgba(196,148,72,0.12)", border: "1px solid rgba(196,148,72,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", fontWeight: "600", color: "#c49448",
            fontFamily: "Georgia, serif", letterSpacing: "0.05em",
          }}>
            {initials}
          </div>
        )}

        {/* Category pill — top left */}
        <div style={{
          position: "absolute", top: "10px", left: "10px",
          background: "rgba(18,10,6,0.78)", border: "1px solid rgba(196,148,72,0.22)",
          borderRadius: "20px", padding: "3px 10px",
          fontSize: "11px", color: "#c49448", letterSpacing: "0.06em",
          fontWeight: "500", backdropFilter: "blur(6px)",
        }}>
          {/* category_name is a flat string from ProductListSerializer */}
          {product.category_name}
        </div>

        {/* "Featured" badge — top right, only shown if product.featured=true */}
        {product.featured && (
          <div style={{
            position: "absolute", top: "10px", right: "10px",
            background: "rgba(196,148,72,0.9)",
            borderRadius: "20px", padding: "3px 10px",
            fontSize: "10px", color: "#120a06", fontWeight: "700",
            letterSpacing: "0.06em",
          }}>
            ★ Featured
          </div>
        )}

        {/* Hover overlay — slides up from bottom on hover */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "0.75rem",
          background: "linear-gradient(to top, rgba(18,10,6,0.9) 0%, transparent 100%)",
          // translateY(0) = visible, translateY(100%) = hidden below the card
          transform: hovered ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.25s",
          display: "flex", gap: "0.5rem",
        }}>
          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock || adding}
            style={{
              flex: 1, padding: "0.5rem",
              background: added
                ? "linear-gradient(135deg, #22c55e, #16a34a)"   // green = added
                : "linear-gradient(135deg, #c49448, #8b5e1a)",  // gold = default
              border: "none", borderRadius: "8px",
              fontSize: "12px", fontWeight: "600",
              color: "#120a06", cursor: adding ? "not-allowed" : "pointer",
              letterSpacing: "0.04em",
              transition: "background 0.2s",
              opacity: !product.in_stock ? 0.5 : 1,
            }}
          >
            {adding ? "Adding…" : added ? "✓ Added!" : !product.in_stock ? "Out of stock" : "Add to Cart"}
          </button>
          <button
            onClick={(e) => { e.preventDefault(); }}  // wishlist — future feature
            style={{
              width: "36px", height: "36px",
              background: "rgba(196,148,72,0.12)", border: "1px solid rgba(196,148,72,0.3)",
              borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#c49448", fontSize: "16px",
            }}
            aria-label="Save to wishlist"
          >
            <i className="ti ti-heart" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Product info ── */}
      <div style={{ padding: "0.85rem 1rem" }}>
        <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "500", color: "#ddc799", lineHeight: 1.3 }}>
          {product.name}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#c49448" }}>
            KES {parseInt(product.price).toLocaleString()}
          </p>
          {/* Strike-through compare price — only shown if set in admin */}
          {product.compare_at_price && (
            <p style={{ margin: 0, fontSize: "12px", color: "#5a3e22", textDecoration: "line-through" }}>
              KES {parseInt(product.compare_at_price).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton card — shown while products are loading ──────────────
// We render 8 of these as placeholders so the page doesn't look
// empty and then jump when data arrives.
function ProductSkeleton() {
  return (
    <div style={{
      borderRadius: "12px", overflow: "hidden",
      background: "#1a0f08", border: "1px solid rgba(196,148,72,0.1)",
    }}>
      {/* Image placeholder */}
      <div style={{
        aspectRatio: "4/5",
        background: "linear-gradient(90deg, #1a0f08, #2c1a0e, #1a0f08)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s linear infinite",
      }} />
      {/* Text placeholders */}
      <div style={{ padding: "0.85rem 1rem" }}>
        <div style={{ height: 14, borderRadius: 4, marginBottom: 8, background: "linear-gradient(90deg,#1a0f08,#2c1a0e,#1a0f08)", backgroundSize: "200% 100%", animation: "shimmer 1.4s linear infinite" }} />
        <div style={{ height: 14, borderRadius: 4, width: "60%", background: "linear-gradient(90deg,#1a0f08,#2c1a0e,#1a0f08)", backgroundSize: "200% 100%", animation: "shimmer 1.4s linear infinite" }} />
      </div>
    </div>
  );
}

// ── Main HomePage component ────────────────────────────────────────
export default function HomePage() {
  // heroVisible: controls the fade-in animation on the hero section.
  // We set it to true after a short delay so the animation is visible.
  const [heroVisible, setHeroVisible] = useState(false);

  // Real data from API — replaces the PLACEHOLDER arrays
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Trigger hero fade-in 80ms after mount
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
    // The return function is a "cleanup" — if the component unmounts
    // before 80ms, we cancel the timer to prevent a state update on
    // an unmounted component (React warns about this).
  }, []); // [] = run once on mount only

  // Fetch featured products from Django
  useEffect(() => {
    setProductsLoading(true);
    fetchProducts({ featured: "true" })
      // fetchProducts({ featured: "true" }) → GET /api/products/?featured=true
      // Django's ProductListAPIView filters by featured=True
      .then((data) => {
        // data.products is the array from Django's paginated response
        setFeaturedProducts(data.products || []);
      })
      .catch(() => {
        // If the API fails, just show an empty list — don't crash the page
        setFeaturedProducts([]);
      })
      .finally(() => setProductsLoading(false));
  }, []); // [] = fetch once on mount

  // Fetch categories separately — they have their own loading state
  useEffect(() => {
    setCategoriesLoading(true);
    fetchCategories()
      // fetchCategories() → GET /api/categories/
      // Returns a flat array of category objects
      .then((data) => {
        // The API might return an array directly or {results: [...]}
        // depending on how you've set it up — handle both cases
        setCategories(Array.isArray(data) ? data : data.results || []);
      })
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  return (
    <>
      <style>{`
        @keyframes shimmer { to { background-position: -200% 0; } }
        * { box-sizing: border-box; }
        body { background: #120a06; }
        .pc-section { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
        .pc-hero {
          min-height: calc(100vh - 68px);
          background: radial-gradient(ellipse at 60% 40%, #2a1505 0%, #120a06 65%);
          display: flex; align-items: center;
          position: relative; overflow: hidden;
          border-bottom: 1px solid rgba(196,148,72,0.12);
        }
        .pc-hero::before {
          content: '';
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c49448' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          opacity: 0.6;
        }
        .pc-hero-content {
          position: relative; z-index: 1;
          max-width: 1200px; margin: 0 auto; padding: 4rem 1.5rem;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 4rem; align-items: center;
        }
        .pc-hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(196,148,72,0.1); border: 1px solid rgba(196,148,72,0.25);
          border-radius: 20px; padding: 5px 14px;
          font-size: 12px; font-weight: 500; color: #c49448;
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 1.5rem;
        }
        .pc-hero-title {
          font-family: Georgia, serif;
          font-size: clamp(2.8rem, 5vw, 4.2rem);
          font-weight: 400; line-height: 1.12; color: #f0dba8;
          margin: 0 0 1.25rem; letter-spacing: -0.01em;
        }
        .pc-hero-title em { font-style: italic; color: #c49448; }
        .pc-hero-desc { font-size: 16px; line-height: 1.75; color: #9a7a4a; margin: 0 0 2rem; max-width: 420px; }
        .pc-hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
        .pc-btn-primary {
          display: inline-flex; align-items: center; gap: 8px; padding: 0.75rem 1.75rem;
          background: linear-gradient(135deg, #c49448 0%, #8b5e1a 100%);
          border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
          color: #120a06; cursor: pointer; text-decoration: none;
          transition: opacity 0.2s, transform 0.2s;
        }
        .pc-btn-primary:hover { opacity: 0.88; transform: translateY(-2px); }
        .pc-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px; padding: 0.75rem 1.75rem;
          background: transparent; border: 1px solid rgba(196,148,72,0.35);
          border-radius: 10px; font-size: 14px; font-weight: 500; color: #c4ab82;
          cursor: pointer; text-decoration: none;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .pc-btn-secondary:hover { background: rgba(196,148,72,0.08); border-color: rgba(196,148,72,0.55); color: #e8c87a; }
        .pc-hero-stats {
          display: flex; gap: 2rem; margin-top: 2.5rem; padding-top: 2rem;
          border-top: 1px solid rgba(196,148,72,0.12);
        }
        .pc-stat-value { font-size: 24px; font-weight: 600; color: #e8c87a; font-family: Georgia, serif; display: block; }
        .pc-stat-label { font-size: 12px; color: #7a5e3a; letter-spacing: 0.06em; text-transform: uppercase; }
        .pc-hero-visual { display: flex; align-items: center; justify-content: center; }
        .pc-hero-badge {
          width: 320px; height: 320px; border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, #2a1708 0%, #120a06 100%);
          border: 1px solid rgba(196,148,72,0.2);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0.5rem; position: relative;
        }
        .pc-hero-badge::after { content: ''; position: absolute; inset: -8px; border-radius: 50%; border: 1px solid rgba(196,148,72,0.08); }
        .pc-hero-monogram { font-family: Georgia, serif; font-size: 80px; font-weight: 400; color: #c49448; line-height: 1; opacity: 0.9; letter-spacing: -4px; }
        .pc-hero-brand { font-size: 13px; font-weight: 500; letter-spacing: 0.18em; color: #9a7a4a; text-transform: uppercase; }
        .pc-hero-since { font-size: 11px; color: #5a3e22; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 4px; }
        .pc-section-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 2rem; gap: 1rem; }
        .pc-section-label { font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #c49448; display: block; margin-bottom: 0.4rem; }
        .pc-section-title { font-family: Georgia, serif; font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 400; color: #f0dba8; margin: 0; line-height: 1.2; }
        .pc-categories-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 5rem; }
        .pc-category-card { display: block; text-decoration: none; padding: 1.5rem 1rem; background: #1a0f08; border: 1px solid rgba(196,148,72,0.15); border-radius: 12px; text-align: center; transition: background 0.2s, border-color 0.2s, transform 0.2s; }
        .pc-category-card:hover { background: rgba(196,148,72,0.07); border-color: rgba(196,148,72,0.35); transform: translateY(-3px); }
        .pc-category-icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(196,148,72,0.1); border: 1px solid rgba(196,148,72,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem; font-size: 20px; color: #c49448; transition: background 0.2s; }
        .pc-category-card:hover .pc-category-icon { background: rgba(196,148,72,0.18); }
        .pc-category-name { font-size: 13px; font-weight: 500; color: #ddc799; letter-spacing: 0.03em; }
        .pc-products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 5rem; }
        .pc-banner {
          margin: 0 0 5rem; border-radius: 16px;
          background: linear-gradient(135deg, #2a1708 0%, #1a0d06 50%, #261206 100%);
          border: 1px solid rgba(196,148,72,0.2); padding: 3.5rem 3rem;
          display: flex; align-items: center; justify-content: space-between;
          gap: 2rem; flex-wrap: wrap; position: relative; overflow: hidden;
        }
        .pc-banner::before { content: ''; position: absolute; top: -40px; right: -40px; width: 220px; height: 220px; border-radius: 50%; border: 1px solid rgba(196,148,72,0.08); }
        .pc-banner-content { position: relative; z-index: 1; }
        .pc-banner-eyebrow { font-size: 11px; font-weight: 500; letter-spacing: 0.14em; color: #c49448; text-transform: uppercase; margin-bottom: 0.75rem; display: block; }
        .pc-banner-title { font-family: Georgia, serif; font-size: clamp(1.8rem, 3.5vw, 2.6rem); font-weight: 400; color: #f0dba8; margin: 0 0 0.75rem; line-height: 1.2; }
        .pc-banner-desc { font-size: 15px; color: #9a7a4a; margin: 0; max-width: 420px; line-height: 1.65; }
        .pc-trust { margin-bottom: 5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1px; background: rgba(196,148,72,0.12); border: 1px solid rgba(196,148,72,0.12); border-radius: 12px; overflow: hidden; }
        .pc-trust-item { background: #120a06; padding: 1.5rem 1.25rem; display: flex; align-items: flex-start; gap: 0.85rem; }
        .pc-trust-icon { font-size: 22px; color: #c49448; margin-top: 2px; flex-shrink: 0; }
        .pc-trust-title { font-size: 14px; font-weight: 500; color: #ddc799; margin: 0 0 3px; }
        .pc-trust-desc { font-size: 12px; color: #7a5e3a; line-height: 1.5; }
        .pc-fade-in { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .pc-fade-in.visible { opacity: 1; transform: translateY(0); }
        @media (max-width: 900px) { .pc-hero-content { grid-template-columns: 1fr; gap: 3rem; } .pc-hero-visual { display: none; } }
        @media (max-width: 600px) { .pc-hero-stats { gap: 1.25rem; } .pc-banner { padding: 2.25rem 1.5rem; } }
      `}</style>

      <main style={{ background: "#120a06", minHeight: "100vh" }}>

        {/* ── HERO ── */}
        <section className="pc-hero" aria-label="Hero">
          <div className="pc-hero-content">
            <div className={`pc-fade-in ${heroVisible ? "visible" : ""}`} style={{ transitionDelay: "0.1s" }}>
              <div className="pc-hero-eyebrow">
                <i className="ti ti-sparkles" aria-hidden="true" />
                New Collection 2025
              </div>
              <h1 className="pc-hero-title">
                Style that tells<br /><em>your story</em>
              </h1>
              <p className="pc-hero-desc">
                Curated fashion and accessories for the modern Kenyan woman.
                Quality pieces, thoughtfully selected, delivered to your door.
              </p>
              <div className="pc-hero-actions">
                <Link to="/products" className="pc-btn-primary">
                  Shop the Collection <i className="ti ti-arrow-right" aria-hidden="true" />
                </Link>
                <Link to="/categories" className="pc-btn-secondary">Browse Categories</Link>
              </div>
              <div className="pc-hero-stats">
                <div><span className="pc-stat-value">500+</span><span className="pc-stat-label">Products</span></div>
                <div><span className="pc-stat-value">2k+</span><span className="pc-stat-label">Happy customers</span></div>
                <div><span className="pc-stat-value">NBO</span><span className="pc-stat-label">Nairobi based</span></div>
              </div>
            </div>
            <div className={`pc-hero-visual pc-fade-in ${heroVisible ? "visible" : ""}`} style={{ transitionDelay: "0.3s" }} aria-hidden="true">
              <div className="pc-hero-badge">
                <div className="pc-hero-monogram">PC</div>
                <div className="pc-hero-brand">Perry's Collection</div>
                <div className="pc-hero-since">Est. Nairobi</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CATEGORIES ── */}
        <section style={{ padding: "4.5rem 0 0" }} aria-label="Shop categories">
          <div className="pc-section">
            <div className="pc-section-header">
              <div>
                <span className="pc-section-label">Browse by</span>
                <h2 className="pc-section-title">Categories</h2>
              </div>
              <Link to="/categories" className="pc-btn-secondary" style={{ padding: "0.5rem 1.25rem", fontSize: "13px" }}>
                All categories <i className="ti ti-arrow-right" aria-hidden="true" />
              </Link>
            </div>

            <div className="pc-categories-grid">
              {categoriesLoading ? (
                // Show 6 skeleton boxes while categories load
                Array.from({ length: 6 }, (_, i) => (
                  <div key={i} style={{
                    padding: "1.5rem 1rem", background: "#1a0f08",
                    border: "1px solid rgba(196,148,72,0.1)", borderRadius: 12, textAlign: "center",
                  }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(90deg,#1a0f08,#2c1a0e,#1a0f08)", backgroundSize: "200% 100%", animation: "shimmer 1.4s linear infinite", margin: "0 auto 0.75rem" }} />
                    <div style={{ height: 12, borderRadius: 4, background: "linear-gradient(90deg,#1a0f08,#2c1a0e,#1a0f08)", backgroundSize: "200% 100%", animation: "shimmer 1.4s linear infinite", width: "60%", margin: "0 auto" }} />
                  </div>
                ))
              ) : categories.length === 0 ? (
                // No categories in the database yet — show a hint to the admin
                <p style={{ color: "#5a3e22", fontSize: 14, gridColumn: "1/-1" }}>
                  No categories yet. <Link to="/admin-panel/categories" style={{ color: "#c49448" }}>Add one in the admin panel →</Link>
                </p>
              ) : (
                categories.map((cat) => (
                  <Link key={cat.id} to={`/categories/${cat.slug}`} className="pc-category-card">
                    <div className="pc-category-icon">
                      {/* Look up icon from our map, fall back to generic tag icon */}
                      <i className={`ti ${CATEGORY_ICONS[cat.name] || "ti-tag"}`} aria-hidden="true" />
                    </div>
                    <div className="pc-category-name">{cat.name}</div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ── FEATURED PRODUCTS ── */}
        <section style={{ padding: "1rem 0 0" }} aria-label="Featured products">
          <div className="pc-section">
            <div className="pc-section-header">
              <div>
                <span className="pc-section-label">Handpicked for you</span>
                <h2 className="pc-section-title">Featured Pieces</h2>
              </div>
              <Link to="/products" className="pc-btn-secondary" style={{ padding: "0.5rem 1.25rem", fontSize: "13px" }}>
                View all <i className="ti ti-arrow-right" aria-hidden="true" />
              </Link>
            </div>

            <div className="pc-products-grid">
              {productsLoading ? (
                // Skeleton cards — 8 placeholders while products load
                Array.from({ length: 8 }, (_, i) => <ProductSkeleton key={i} />)
              ) : featuredProducts.length === 0 ? (
                // No featured products — guide the admin
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem 0", color: "#5a3e22" }}>
                  <i className="ti ti-package-off" style={{ fontSize: 40, display: "block", marginBottom: 12 }} />
                  <p style={{ fontSize: 14, margin: "0 0 16px" }}>No featured products yet.</p>
                  <Link to="/admin-panel/products" className="pc-btn-primary" style={{ display: "inline-flex" }}>
                    Add products in admin →
                  </Link>
                </div>
              ) : (
                featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
            </div>
          </div>
        </section>

        {/* ── PROMO BANNER ── */}
        <section style={{ padding: "0" }} aria-label="Promotion">
          <div className="pc-section">
            <div className="pc-banner">
              <div className="pc-banner-content">
                <span className="pc-banner-eyebrow">Limited time</span>
                <h2 className="pc-banner-title">Free delivery in Nairobi<br />on orders over KES 3,000</h2>
                <p className="pc-banner-desc">Shop your favourites and get them delivered same day within Nairobi CBD and select estates.</p>
              </div>
              <Link to="/products" className="pc-btn-primary" style={{ flexShrink: 0 }}>
                Shop now <i className="ti ti-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── TRUST SIGNALS ── */}
        <section style={{ padding: "0 0 1rem" }} aria-label="Why shop with us">
          <div className="pc-section">
            <div className="pc-trust">
              {[
                { icon: "ti-truck",        title: "Fast delivery",     desc: "Same-day delivery within Nairobi"   },
                { icon: "ti-shield-check", title: "Secure payment",    desc: "M-Pesa and Cash on Delivery"        },
                { icon: "ti-refresh",      title: "Easy returns",      desc: "7-day hassle-free return policy"    },
                { icon: "ti-headset",      title: "Customer support",  desc: "Chat with us on WhatsApp"           },
              ].map((item) => (
                <div key={item.title} className="pc-trust-item">
                  <i className={`ti ${item.icon} pc-trust-icon`} aria-hidden="true" />
                  <div>
                    <p className="pc-trust-title">{item.title}</p>
                    <p className="pc-trust-desc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </>
  );
}