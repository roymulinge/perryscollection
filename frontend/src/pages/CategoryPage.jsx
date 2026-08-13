
import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { fetchCategoryProducts } from "../api/products";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

function ProductCard({ product, onAddToCart }) {
  const [adding, setAdding] = useState(false);
  const initials = product.name.split(" ").slice(0, 2).map((w) => w[0]).join("");

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true);
    await onAddToCart(product.id);
    setAdding(false);
  }

  return (
    <Link to={`/products/${product.slug}`} className="pc-card">
      <div className="pc-card-media">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <div className="pc-card-initials">{initials}</div>
        )}

        {product.stock === 0 && (
          <div className="pc-card-oos">
            <span>Out of stock</span>
          </div>
        )}

        {product.stock > 0 && (
          <div className="pc-card-overlay">
            <button onClick={handleAdd} disabled={adding} className="pc-card-add-btn">
              {adding ? "Adding…" : "Add to Cart"}
            </button>
          </div>
        )}
      </div>

      <div className="pc-card-name">{product.name}</div>
      <div className="pc-card-price">KES {parseInt(product.price).toLocaleString()}</div>
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

  const pageStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Archivo:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

      :root{
        --paper:#FFFFFF;
        --cream:#F6F1E6;
        --ink:#221E19;
        --ink-soft:#5B564C;
        --brass:#A5793A;
        --brass-dark:#7C5A29;
        --line:#E5DFD1;
      }

      .pc-cat-page { background: var(--paper); min-height: 100vh; padding: 40px 24px 80px; font-family: 'Archivo', sans-serif; color: var(--ink); }
      .pc-cat-page * { box-sizing: border-box; }
      .pc-cat-inner { max-width: 1240px; margin: 0 auto; }

      .pc-breadcrumb { display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--ink-soft); margin-bottom: 32px; }
      .pc-breadcrumb a { color: var(--ink-soft); text-decoration: none; transition: color 0.2s; }
      .pc-breadcrumb a:hover { color: var(--ink); }
      .pc-breadcrumb i { font-size: 11px; }
      .pc-breadcrumb .current { color: var(--ink); }

      .pc-cat-title { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: clamp(32px, 4vw, 48px); margin: 0 0 8px; color: var(--ink); }
      .pc-cat-count { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; letter-spacing: 0.04em; color: var(--ink-soft); margin: 0 0 40px; }

      .pc-cat-grid-products { display: grid; grid-template-columns: repeat(4, 1fr); gap: 28px; margin-bottom: 48px; }
      .pc-card { cursor: pointer; text-decoration: none; color: inherit; display: block; }
      .pc-card-media { background: var(--cream); aspect-ratio: 4/5; border-radius: 3px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; margin-bottom: 14px; }
      .pc-card-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.35s ease; }
      .pc-card:hover .pc-card-media img { transform: scale(1.06); }
      .pc-card-initials { width: 60px; height: 60px; border-radius: 50%; background: var(--paper); border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; font-family: 'Instrument Serif', serif; font-size: 20px; color: var(--brass-dark); }
      .pc-card-oos { position: absolute; inset: 0; background: rgba(246,241,230,0.85); display: flex; align-items: center; justify-content: center; }
      .pc-card-oos span { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); }
      .pc-card-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px; background: linear-gradient(to top, rgba(246,241,230,0.95), transparent); transform: translateY(100%); transition: transform 0.25s; }
      .pc-card:hover .pc-card-overlay { transform: translateY(0); }
      .pc-card-add-btn { width: 100%; padding: 9px; background: var(--ink); color: var(--paper); border: none; border-radius: 2px; font-size: 12px; font-weight: 500; letter-spacing: 0.02em; cursor: pointer; transition: background 0.2s; }
      .pc-card-add-btn:hover { background: var(--brass-dark); }
      .pc-card-add-btn:disabled { background: var(--ink-soft); cursor: not-allowed; }
      .pc-card-name { font-size: 14.5px; font-weight: 500; margin-bottom: 3px; color: var(--ink); }
      .pc-card-price { font-family: 'IBM Plex Mono', monospace; font-size: 13.5px; color: var(--brass-dark); }

      .pc-empty { text-align: center; padding: 5rem 0; color: var(--ink-soft); }
      .pc-empty i { font-size: 44px; display: block; margin-bottom: 16px; color: var(--line); }
      .pc-empty p { font-size: 15px; margin-bottom: 20px; }

      .pc-flat-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: var(--ink); color: var(--paper); border-radius: 2px; text-decoration: none; font-size: 14px; font-weight: 500; border: none; cursor: pointer; transition: background 0.2s; }
      .pc-flat-btn:hover { background: var(--brass-dark); }

      .pc-pagination { display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; }
      .pc-page-btn { padding: 9px 14px; border-radius: 2px; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--ink-soft); border: 1px solid var(--line); background: var(--paper); display: flex; align-items: center; gap: 6px; transition: background 0.2s, color 0.2s, border-color 0.2s; }
      .pc-page-btn:hover:not(:disabled) { border-color: var(--brass); color: var(--ink); }
      .pc-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      .pc-page-btn.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }

      .pc-center { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 32px; }
      .pc-spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid var(--line); border-top-color: var(--brass); animation: pc-spin 0.8s linear infinite; }
      @keyframes pc-spin { to { transform: rotate(360deg); } }
      .pc-error-text { color: var(--oxide, #8B4632); font-size: 14px; }

      @media (max-width: 900px) {
        .pc-cat-grid-products { grid-template-columns: repeat(3, 1fr); }
      }
      @media (max-width: 700px) {
        .pc-cat-grid-products { grid-template-columns: repeat(2, 1fr); gap: 18px; }
      }
      @media (max-width: 420px) {
        .pc-cat-grid-products { grid-template-columns: 1fr; }
        .pc-cat-page { padding: 28px 16px 56px; }
      }
    `}</style>
  );

  if (loading) return (
    <div className="pc-cat-page">
      {pageStyles}
      <div className="pc-center">
        <div className="pc-spinner" />
      </div>
    </div>
  );

  if (error === "404") return (
    <div className="pc-cat-page">
      {pageStyles}
      <div className="pc-center">
        <h1 className="pc-cat-title" style={{ marginBottom: 0 }}>Category not found</h1>
        <Link to="/products" className="pc-flat-btn">Browse all products</Link>
      </div>
    </div>
  );

  if (error) return (
    <div className="pc-cat-page">
      {pageStyles}
      <div className="pc-center">
        <p className="pc-error-text">{error}</p>
        <button onClick={() => window.location.reload()} className="pc-flat-btn">Retry</button>
      </div>
    </div>
  );

  const { category, products, pagination } = data;

  return (
    <div className="pc-cat-page">
      {pageStyles}
      <div className="pc-cat-inner">

        {/* Breadcrumb */}
        <nav className="pc-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <i className="ti ti-chevron-right" aria-hidden="true" />
          <Link to="/products">Products</Link>
          <i className="ti ti-chevron-right" aria-hidden="true" />
          <span className="current">{category.name}</span>
        </nav>

        {/* Header */}
        <h1 className="pc-cat-title">{category.name}</h1>
        <p className="pc-cat-count">
          {pagination.total} {pagination.total === 1 ? "product" : "products"}
        </p>

        {/* Products grid */}
        {products.length === 0 ? (
          <div className="pc-empty">
            <i className="ti ti-package-off" aria-hidden="true" />
            <p>No products in this category yet.</p>
            <Link to="/products" className="pc-flat-btn">Browse all products</Link>
          </div>
        ) : (
          <div className="pc-cat-grid-products">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="pc-pagination">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={!pagination.has_previous}
              className="pc-page-btn"
            >
              <i className="ti ti-arrow-left" aria-hidden="true" /> Prev
            </button>

            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`pc-page-btn ${p === currentPage ? "active" : ""}`}
                aria-current={p === currentPage ? "page" : undefined}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={!pagination.has_next}
              className="pc-page-btn"
            >
              Next <i className="ti ti-arrow-right" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}