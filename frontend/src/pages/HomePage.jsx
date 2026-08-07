

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchProducts, fetchCategories } from "../api/products";
import { useCart } from "../context/CartContext";
import Button from "../components/Button";

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
function ProductCard({ product }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const initials = product.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  async function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.in_stock || adding) return;

    setAdding(true);
    try {
      await addItem(product.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // addItem failed — cart context logs it, we just stop loading
    } finally {
      setAdding(false);
    }
  }

  return (
    <Link to={`/products/${product.slug}`} className="pc-card">
      <div className="pc-card-media">
        {product.featured && <span className="pc-card-tag">Featured</span>}

        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <div className="pc-card-initials">{initials}</div>
        )}

        <div className="pc-card-overlay">
          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock || adding}
            className="pc-card-add-btn"
          >
            {adding ? "Adding…" : added ? "✓ Added" : !product.in_stock ? "Out of stock" : "Add to Cart"}
          </button>
          <button
            onClick={(e) => e.preventDefault()}
            className="pc-card-wish-btn"
            aria-label="Save to wishlist"
          >
            <i className="ti ti-heart" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="pc-card-name">{product.name}</div>
      <div className="pc-card-meta">
        <span className="pc-card-cat">{product.category_name}</span>
        <span className="pc-card-price">
          KES {parseInt(product.price).toLocaleString()}
          {product.compare_at_price && (
            <span className="pc-card-compare"> KES {parseInt(product.compare_at_price).toLocaleString()}</span>
          )}
        </span>
      </div>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="pc-card">
      <div className="pc-skeleton-media" />
      <div className="pc-skeleton-line" style={{ width: "80%" }} />
      <div className="pc-skeleton-line" style={{ width: "45%" }} />
    </div>
  );
}

// ── Main HomePage component ────────────────────────────────────────
export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    setProductsLoading(true);
    fetchProducts({ featured: "true" })
      .then((data) => setFeaturedProducts(data.products || []))
      .catch(() => setFeaturedProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  useEffect(() => {
    setCategoriesLoading(true);
    fetchCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : data.results || []))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Archivo:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        :root{
          --paper:#FFFFFF;
          --cream:#F6F1E6;
          --ink:#221E19;
          --ink-soft:#5B564C;
          --brass:#A5793A;
          --brass-dark:#7C5A29;
          --oxide:#8B4632;
          --sage:#6B7259;
          --line:#E5DFD1;
        }

        .pc-home { background: var(--paper); font-family: 'Archivo', sans-serif; color: var(--ink); }
        .pc-home * { box-sizing: border-box; }
        .pc-eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--brass-dark); display: block; margin-bottom: 12px; }
        .pc-wrap { max-width: 1240px; margin: 0 auto; padding: 0 48px; }

        /* ── Hero ── */
        .pc-hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 40px; align-items: center; padding: 88px 48px 96px; max-width: 1240px; margin: 0 auto; }
        .pc-hero-title { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: clamp(40px, 5vw, 68px); line-height: 1.06; letter-spacing: -0.01em; margin: 0 0 24px; color: var(--ink); }
        .pc-hero-title em { font-style: italic; color: var(--brass-dark); }
        .pc-hero-desc { font-size: 16.5px; line-height: 1.65; color: var(--ink-soft); max-width: 440px; margin: 0 0 30px; }
        .pc-hero-actions { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 34px; }
        .pc-hero-stats { display: flex; gap: 32px; padding-top: 24px; border-top: 1px solid var(--line); }
        .pc-stat-value { font-family: 'Instrument Serif', serif; font-size: 26px; color: var(--ink); display: block; }
        .pc-stat-label { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-soft); }

        .pc-hero-art { position: relative; aspect-ratio: 1/1; background: var(--cream); border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .pc-hero-art svg { width: 72%; height: 72%; }
        .pc-hero-art .stroke { fill: none; stroke: var(--oxide); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1400; stroke-dashoffset: 1400; animation: pc-draw 2.4s ease forwards; }
        .pc-hero-art .stroke.b { stroke: var(--brass-dark); animation-delay: 0.25s; }
        .pc-hero-art .stroke.c { stroke: var(--sage); animation-delay: 0.5s; }
        .pc-hero-art .stroke.d { stroke: var(--ink-soft); animation-delay: 0.75s; }
        @keyframes pc-draw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .pc-hero-art .stroke { animation: none; stroke-dashoffset: 0; } }
        .pc-hero-art-label { position: absolute; bottom: 20px; left: 20px; font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--ink-soft); letter-spacing: 0.08em; }

        /* ── Section header pattern ── */
        .pc-section { padding: 80px 48px; max-width: 1240px; margin: 0 auto; }
        .pc-section-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 44px; gap: 16px; flex-wrap: wrap; }
        .pc-section-head h2 { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: 34px; margin: 0; color: var(--ink); }

        /* ── Categories ── */
        .pc-categories { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
        .pc-cat-grid { max-width: 1240px; margin: 0 auto; padding: 0 48px; display: grid; grid-template-columns: repeat(4, 1fr); }
        .pc-cat-item { padding: 34px 26px; border-left: 1px solid var(--line); display: flex; flex-direction: column; gap: 14px; transition: background 0.2s; cursor: pointer; text-decoration: none; color: inherit; }
        .pc-cat-item:first-child { border-left: none; }
        .pc-cat-item:hover { background: var(--cream); }
        .pc-cat-icon { font-size: 26px; color: var(--ink); }
        .pc-cat-name { font-size: 15px; font-weight: 500; color: var(--ink); }
        .pc-cat-count { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: var(--ink-soft); }

        /* ── Product grid / cards ── */
        .pc-product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 28px; }
        .pc-card { cursor: pointer; text-decoration: none; color: inherit; display: block; }
        .pc-card-media { background: var(--cream); aspect-ratio: 4/5; border-radius: 3px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; margin-bottom: 16px; }
        .pc-card-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.35s ease; }
        .pc-card:hover .pc-card-media img { transform: scale(1.06); }
        .pc-card-initials { width: 64px; height: 64px; border-radius: 50%; background: var(--paper); border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; font-family: 'Instrument Serif', serif; font-size: 22px; color: var(--brass-dark); }
        .pc-card-tag { position: absolute; top: 12px; left: 12px; background: var(--ink); color: var(--paper); font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 9px; border-radius: 2px; z-index: 1; }
        .pc-card-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px; display: flex; gap: 8px; background: linear-gradient(to top, rgba(246,241,230,0.95), transparent); transform: translateY(100%); transition: transform 0.25s; }
        .pc-card:hover .pc-card-overlay { transform: translateY(0); }
        .pc-card-add-btn { flex: 1; padding: 9px; background: var(--ink); color: var(--paper); border: none; border-radius: 2px; font-size: 12px; font-weight: 500; letter-spacing: 0.02em; cursor: pointer; transition: background 0.2s; }
        .pc-card-add-btn:hover { background: var(--brass-dark); }
        .pc-card-add-btn:disabled { background: var(--ink-soft); cursor: not-allowed; }
        .pc-card-wish-btn { width: 34px; height: 34px; flex-shrink: 0; background: var(--paper); border: 1px solid var(--line); border-radius: 2px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink); font-size: 15px; }
        .pc-card-name { font-size: 15px; font-weight: 500; margin-bottom: 4px; color: var(--ink); }
        .pc-card-meta { display: flex; justify-content: space-between; align-items: center; }
        .pc-card-cat { font-size: 12.5px; color: var(--ink-soft); }
        .pc-card-price { font-family: 'IBM Plex Mono', monospace; font-size: 13.5px; color: var(--brass-dark); }
        .pc-card-compare { color: var(--ink-soft); text-decoration: line-through; font-size: 11.5px; margin-left: 4px; }

        /* ── Skeletons ── */
        @keyframes pc-shimmer { to { background-position: -200% 0; } }
        .pc-skeleton-media { aspect-ratio: 4/5; border-radius: 3px; margin-bottom: 16px; background: linear-gradient(90deg, var(--cream), #efe6d2, var(--cream)); background-size: 200% 100%; animation: pc-shimmer 1.4s linear infinite; }
        .pc-skeleton-line { height: 13px; border-radius: 3px; margin-bottom: 8px; background: linear-gradient(90deg, var(--cream), #efe6d2, var(--cream)); background-size: 200% 100%; animation: pc-shimmer 1.4s linear infinite; }
        .pc-skeleton-cat { padding: 34px 26px; }
        .pc-skeleton-icon { width: 26px; height: 26px; border-radius: 50%; margin-bottom: 14px; background: linear-gradient(90deg, var(--cream), #efe6d2, var(--cream)); background-size: 200% 100%; animation: pc-shimmer 1.4s linear infinite; }

        /* ── Promo banner ── */
        .pc-banner { border: 1px solid var(--line); border-radius: 4px; padding: 48px; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; background: var(--cream); }
        .pc-banner-title { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: clamp(26px, 3vw, 34px); margin: 0 0 10px; color: var(--ink); line-height: 1.25; }
        .pc-banner-desc { font-size: 14.5px; color: var(--ink-soft); margin: 0; max-width: 400px; line-height: 1.6; }

        /* ── Trust signals ── */
        .pc-trust { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
        .pc-trust-item { padding: 26px 22px; display: flex; gap: 14px; align-items: flex-start; border-left: 1px solid var(--line); }
        .pc-trust-item:first-child { border-left: none; }
        .pc-trust-icon { font-size: 21px; color: var(--oxide); margin-top: 2px; flex-shrink: 0; }
        .pc-trust-title { font-size: 14px; font-weight: 500; margin: 0 0 3px; color: var(--ink); }
        .pc-trust-desc { font-size: 12px; color: var(--ink-soft); line-height: 1.5; margin: 0; }

        /* ── Philosophy band ── */
        .pc-philosophy { background: var(--ink); color: var(--paper); padding: 100px 48px; text-align: center; }
        .pc-philosophy blockquote { font-family: 'Instrument Serif', serif; font-style: italic; font-size: clamp(24px, 2.8vw, 34px); line-height: 1.4; max-width: 780px; margin: 0 auto 24px; font-weight: 400; }
        .pc-philosophy cite { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #C9A876; font-style: normal; }
        .pc-philosophy .pc-rule { width: 44px; height: 1px; background: var(--brass); margin: 0 auto 28px; }

        @media (max-width: 900px) {
          .pc-hero { grid-template-columns: 1fr; padding: 56px 24px 64px; }
          .pc-wrap, .pc-section { padding-left: 24px; padding-right: 24px; }
          .pc-cat-grid { grid-template-columns: repeat(2, 1fr); padding: 0 24px; }
          .pc-cat-item:nth-child(2) { border-left: none; }
          .pc-product-grid { grid-template-columns: repeat(2, 1fr); }
          .pc-trust { grid-template-columns: repeat(2, 1fr); }
          .pc-trust-item:nth-child(2) { border-left: none; }
          .pc-trust-item:nth-child(3) { border-left: none; }
          .pc-banner { padding: 32px 24px; }
        }
        @media (max-width: 560px) {
          .pc-hero-stats { gap: 20px; }
          .pc-trust { grid-template-columns: 1fr; }
          .pc-trust-item { border-left: none !important; border-top: 1px solid var(--line); }
          .pc-trust-item:first-child { border-top: none; }
          .pc-philosophy { padding: 64px 24px; }
        }
      `}</style>

      <main className="pc-home">

        {/* ── HERO ── */}
        <section className="pc-hero" aria-label="Hero">
          <div>
            <span className="pc-eyebrow">New arrivals, weekly</span>
            <h1 className="pc-hero-title">Style that tells<br /><em>your story.</em></h1>
            <p className="pc-hero-desc">
              Curated fashion and accessories for the modern Kenyan woman — chosen for the way they wear in, not just the way they photograph.
            </p>
            <div className="pc-hero-actions">
              <Button variant="molten" onClick={() => (window.location.href = "/products")}>
                Shop the collection <i className="ti ti-arrow-right" aria-hidden="true" />
              </Button>
              <Link to="/categories">
                <Button variant="outline">Browse categories</Button>
              </Link>
            </div>
            <div className="pc-hero-stats">
              <div><span className="pc-stat-value">500+</span><span className="pc-stat-label">Products</span></div>
              <div><span className="pc-stat-value">2k+</span><span className="pc-stat-label">Customers</span></div>
              <div><span className="pc-stat-value">NBO</span><span className="pc-stat-label">Nairobi based</span></div>
            </div>
          </div>

          <div className="pc-hero-art" aria-hidden="true">
            <svg viewBox="0 0 200 200">
              {/* Tote bag */}
              <path className="stroke a" d="M55 95 L55 78 Q55 60 73 60 L107 60 Q125 60 125 78 L125 95" />
              <path className="stroke a" d="M45 95 L135 95 L128 155 Q127 162 120 162 L60 162 Q53 162 52 155 Z" />
              {/* Dress on hanger */}
              <path className="stroke b" d="M100 35 L100 42" />
              <circle className="stroke b" cx="100" cy="30" r="6" />
              <path className="stroke b" d="M70 55 L100 42 L130 55 L140 75 L120 70 L124 110 L76 110 L80 70 L60 75 Z" />
              {/* Sunglasses */}
              <path className="stroke c" d="M35 125 Q35 118 42 118 L56 118 Q63 118 63 125 Q63 132 56 132 L42 132 Q35 132 35 125 Z" />
              <path className="stroke c" d="M137 125 Q137 118 144 118 L158 118 Q165 118 165 125 Q165 132 158 132 L144 132 Q137 132 137 125 Z" />
              <path className="stroke c" d="M63 123 Q70 120 76 123" />
              {/* Heel */}
              <path className="stroke d" d="M148 150 Q148 140 158 138 L172 135 Q178 134 178 140 L178 148 Q178 155 170 156 L150 160 Q145 161 145 156 Z" />
              <path className="stroke d" d="M150 160 L152 170" />
            </svg>
            <div className="pc-hero-art-label">FIG. 01 — THE EDIT</div>
          </div>
        </section>

        {/* ── CATEGORIES ── */}
        <div className="pc-categories">
          <div className="pc-cat-grid">
            {categoriesLoading ? (
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="pc-skeleton-cat">
                  <div className="pc-skeleton-icon" />
                  <div className="pc-skeleton-line" style={{ width: "60%", marginBottom: 0 }} />
                </div>
              ))
            ) : categories.length === 0 ? (
              <p style={{ color: "var(--ink-soft)", fontSize: 14, gridColumn: "1/-1", padding: "34px 26px" }}>
                No categories yet. <Link to="/admin-panel/categories" style={{ color: "var(--brass-dark)" }}>Add one in the admin panel →</Link>
              </p>
            ) : (
              categories.slice(0, 4).map((cat) => (
                <Link key={cat.id} to={`/categories/${cat.slug}`} className="pc-cat-item">
                  <i className={`ti ${CATEGORY_ICONS[cat.name] || "ti-tag"} pc-cat-icon`} aria-hidden="true" />
                  <div className="pc-cat-name">{cat.name}</div>
                  {cat.product_count != null && <div className="pc-cat-count">{cat.product_count} pieces</div>}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* ── FEATURED PRODUCTS ── */}
        <section className="pc-section" aria-label="Featured products">
          <div className="pc-section-head">
            <div>
              <span className="pc-eyebrow">Handpicked for you</span>
              <h2>Featured pieces</h2>
            </div>
            <Link to="/products">
              <Button variant="outline" className="btn-sm">View all <i className="ti ti-arrow-right" aria-hidden="true" /></Button>
            </Link>
          </div>

          <div className="pc-product-grid">
            {productsLoading ? (
              Array.from({ length: 8 }, (_, i) => <ProductSkeleton key={i} />)
            ) : featuredProducts.length === 0 ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem 0", color: "var(--ink-soft)" }}>
                <i className="ti ti-package-off" style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
                <p style={{ fontSize: 14, margin: "0 0 16px" }}>No featured products yet.</p>
                <Link to="/admin-panel/products"><Button variant="molten">Add products in admin →</Button></Link>
              </div>
            ) : (
              featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)
            )}
          </div>
        </section>

        {/* ── PROMO BANNER ── */}
        <section className="pc-section" style={{ paddingTop: 0 }} aria-label="Promotion">
          <div className="pc-banner">
            <div>
              <span className="pc-eyebrow" style={{ marginBottom: 8 }}>Limited time</span>
              <h2 className="pc-banner-title">Free delivery in Nairobi<br />on orders over KES 3,000</h2>
              <p className="pc-banner-desc">Shop your favourites and get them delivered same day within Nairobi CBD and select estates.</p>
            </div>
            <Link to="/products"><Button variant="molten">Shop now <i className="ti ti-arrow-right" aria-hidden="true" /></Button></Link>
          </div>
        </section>

        {/* ── TRUST SIGNALS ── */}
        <section className="pc-section" style={{ paddingTop: 0 }} aria-label="Why shop with us">
          <div className="pc-trust">
            {[
              { icon: "ti-truck",        title: "Fast delivery",     desc: "Same-day delivery within Nairobi" },
              { icon: "ti-shield-check", title: "Secure payment",    desc: "M-Pesa and Cash on Delivery" },
              { icon: "ti-refresh",      title: "Easy returns",      desc: "7-day hassle-free return policy" },
              { icon: "ti-headset",      title: "Customer support",  desc: "Chat with us on WhatsApp" },
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
        </section>

        {/* ── PHILOSOPHY BAND ── */}
        <section className="pc-philosophy">
          <div className="pc-rule"></div>
          <blockquote>"We choose pieces you'll reach for again and again — not just for the season, but for years."</blockquote>
          <cite>Perry's Collection, on what we stock</cite>
        </section>

      </main>
    </>
  );
}