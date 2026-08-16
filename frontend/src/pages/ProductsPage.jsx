import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchCategories, fetchProducts } from "../api/products";
import { useCart } from "../context/CartContext";

const currency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? currency.format(numeric) : "KES 0";
}

function ProductImage({ product }) {
  const initials = product.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

  if (product.image_url) {
    return <img src={product.image_url} alt={product.name} loading="lazy" />;
  }

  return (
    <div className="pcp-card-initials" aria-hidden="true">
      {initials || "PC"}
    </div>
  );
}

function ProductCard({ product }) {
  const { addItem } = useCart();
  // useCart() reads from CartContext — the same cart state the Navbar
  // uses for its badge count. Calling addItem() here updates both.

  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAddToCart(e) {
    // We need to stop this click from bubbling up.
    // The button is inside an <article> — if click bubbled,
    // the Link wrapping the image would navigate away.
    e.stopPropagation();

    if (!product.in_stock || adding) return;

    setAdding(true);
    try {
      await addItem(product.id, 1);
      // POST /api/shopping_cart/add/ → { product_id, quantity: 1 }
      // CartContext refreshes the cart and the Navbar badge updates

      setAdded(true);
      setTimeout(() => setAdded(false), 2000); // reset after 2 seconds
    } catch {
      // Silently fail — user can retry
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="pcp-card">
      {/* Image + tags */}
      <Link
        to={`/products/${product.slug}`}
        className="pcp-card-media"
        aria-label={product.name}
      >
        {product.featured && <span className="pcp-card-tag">Featured</span>}
        {!product.in_stock && (
          <span className="pcp-card-tag pcp-card-tag-muted">Out of stock</span>
        )}

        {/* ProductImage handles real image vs initials fallback */}
        <ProductImage product={product} />

        <div className="pcp-card-overlay">
          <button
            className="pcp-card-add-btn"
            type="button"
            disabled={!product.in_stock || adding}
            onClick={handleAddToCart}
            data-added={added}
          >
            <i
              className={`ti ${added ? "ti-check" : "ti-shopping-cart-plus"}`}
              aria-hidden="true"
            />
            {adding ? "Adding…" : added ? "Added" : product.in_stock ? "Add to cart" : "Unavailable"}
          </button>
        </div>
      </Link>

      {/* Text info */}
      <div className="pcp-card-info">
        <p className="pcp-card-cat">
          {product.category_name || "Perry's Collection"}
        </p>
        <h2 className="pcp-card-name">
          <Link to={`/products/${product.slug}`}>{product.name}</Link>
        </h2>
        <div className="pcp-card-price-row">
          <span className="pcp-card-price">{formatPrice(product.price)}</span>
          {product.compare_at_price && (
            <span className="pcp-card-compare">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductsSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <div className="pcp-card pcp-card-loading" key={index}>
      <div className="pcp-skeleton-media" />
      <div className="pcp-skeleton-line" style={{ width: "42%" }} />
      <div className="pcp-skeleton-line" style={{ width: "80%" }} />
      <div className="pcp-skeleton-line" style={{ width: "55%", height: 16 }} />
    </div>
  ));
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const page = Number(searchParams.get("page") || 1);
  const query = searchParams.get("q") || "";
  const featured = searchParams.get("featured") || "";

  const activeTitle = useMemo(() => {
    if (query) return `Search results for "${query}"`;
    if (featured === "true") return "Featured pieces";
    return "All products";
  }, [featured, query]);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    let ignore = false;

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const data = await fetchProducts({ page, q: query, featured });
        if (!ignore) {
          setProducts(data.products || []);
          setPagination(data.pagination || {});
        }
      } catch (err) {
        if (!ignore) {
          setProducts([]);
          setError(err.message || "Products could not be loaded right now.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      ignore = true;
    };
  }, [featured, page, query]);

  useEffect(() => {
    let ignore = false;

    fetchCategories()
      .then((data) => {
        if (!ignore) setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!ignore) setCategories([]);
      });

    return () => {
      ignore = true;
    };
  }, []);

  function updateParams(nextValues) {
    const next = new URLSearchParams(searchParams);

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });

    setSearchParams(next);
  }

  function handleSearch(event) {
    event.preventDefault();
    updateParams({ q: searchInput.trim(), page: "" });
  }

  function goToPage(nextPage) {
    updateParams({ page: String(nextPage) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

        .pcp-page { background: var(--paper); font-family: 'Archivo', sans-serif; color: var(--ink); min-height: 100vh; }
        .pcp-page * { box-sizing: border-box; }
        .pcp-eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--brass-dark); display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .pcp-shell { max-width: 1240px; margin: 0 auto; padding: 0 48px 96px; }

        /* ── Hero / header ── */
        .pcp-hero { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr); gap: 32px; align-items: end; padding: 64px 0 40px; border-bottom: 1px solid var(--line); }
        .pcp-hero h1 { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: clamp(34px, 5vw, 56px); line-height: 1.08; margin: 0; color: var(--ink); }
        .pcp-hero p { font-size: 15px; line-height: 1.65; color: var(--ink-soft); max-width: 480px; margin: 14px 0 0; }

        .pcp-search { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; padding: 4px; }
        .pcp-search input { min-width: 0; height: 46px; border: 1px solid var(--line); border-radius: 3px; background: var(--cream); color: var(--ink); padding: 0 14px; font: inherit; outline: none; transition: border-color 0.2s; }
        .pcp-search input:focus { border-color: var(--brass); }
        .pcp-search-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 46px; padding: 0 20px; border: none; border-radius: 3px; background: var(--ink); color: var(--paper); font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
        .pcp-search-btn:hover { background: var(--brass-dark); }

        /* ── Filter bar ── */
        .pcp-filter-bar { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 28px 0; }
        .pcp-filter-actions, .pcp-cat-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .pcp-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 0 16px; border: 1px solid var(--line); border-radius: 999px; background: var(--paper); color: var(--ink-soft); font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none; transition: background 0.2s, border-color 0.2s, color 0.2s; }
        .pcp-chip:hover { border-color: var(--brass); color: var(--ink); background: var(--cream); }
        .pcp-chip.active { background: var(--ink); border-color: var(--ink); color: var(--paper); }
        .pcp-results-meta { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--ink-soft); }

        /* ── Product grid (matches homepage card language) ── */
        .pcp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 28px; }
        .pcp-card { display: block; }
        .pcp-card-media { position: relative; display: block; aspect-ratio: 4/5; background: var(--cream); border-radius: 3px; overflow: hidden; margin-bottom: 16px; text-decoration: none; }
        .pcp-card-media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.35s ease; }
        .pcp-card:hover .pcp-card-media img { transform: scale(1.06); }
        .pcp-card-initials { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-family: 'Instrument Serif', serif; font-size: 28px; color: var(--brass-dark); }
        .pcp-card-tag { position: absolute; top: 12px; left: 12px; background: var(--ink); color: var(--paper); font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 9px; border-radius: 2px; z-index: 1; }
        .pcp-card-tag-muted { left: auto; right: 12px; background: var(--paper); color: var(--ink-soft); border: 1px solid var(--line); }
        .pcp-card-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px; background: linear-gradient(to top, rgba(246,241,230,0.95), transparent); transform: translateY(100%); transition: transform 0.25s; }
        .pcp-card:hover .pcp-card-overlay { transform: translateY(0); }
        .pcp-card-add-btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; border: none; border-radius: 2px; background: var(--ink); color: var(--paper); font-size: 12.5px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
        .pcp-card-add-btn:hover { background: var(--brass-dark); }
        .pcp-card-add-btn:disabled { background: var(--ink-soft); cursor: not-allowed; }
        .pcp-card-add-btn[data-added="true"] { background: var(--sage); }

        .pcp-card-cat { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-soft); margin: 0 0 6px; }
        .pcp-card-name { min-height: 42px; margin: 0 0 10px; font-size: 15px; line-height: 1.4; font-weight: 500; }
        .pcp-card-name a { color: var(--ink); text-decoration: none; }
        .pcp-card-name a:hover { color: var(--brass-dark); }
        .pcp-card-price-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
        .pcp-card-price { font-family: 'IBM Plex Mono', monospace; font-size: 14px; color: var(--brass-dark); }
        .pcp-card-compare { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--ink-soft); text-decoration: line-through; }

        /* ── Empty / error states ── */
        .pcp-state-panel { min-height: 280px; display: grid; place-items: center; text-align: center; padding: 40px 20px; background: var(--cream); border: 1px solid var(--line); border-radius: 4px; }
        .pcp-state-panel h2 { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: 26px; margin: 0 0 8px; color: var(--ink); }
        .pcp-state-panel p { max-width: 440px; margin: 0 auto 20px; color: var(--ink-soft); line-height: 1.6; font-size: 14.5px; }
        .pcp-state-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 18px; height: 40px; border: none; border-radius: 3px; background: var(--ink); color: var(--paper); font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
        .pcp-state-btn:hover { background: var(--brass-dark); }

        /* ── Skeletons ── */
        @keyframes pcp-shimmer { to { background-position: -200% 0; } }
        .pcp-skeleton-media { aspect-ratio: 4/5; border-radius: 3px; margin-bottom: 16px; background: linear-gradient(90deg, var(--cream), #efe6d2, var(--cream)); background-size: 200% 100%; animation: pcp-shimmer 1.4s linear infinite; }
        .pcp-skeleton-line { height: 13px; border-radius: 3px; margin-bottom: 8px; background: linear-gradient(90deg, var(--cream), #efe6d2, var(--cream)); background-size: 200% 100%; animation: pcp-shimmer 1.4s linear infinite; }

        /* ── Pagination ── */
        .pcp-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding-top: 40px; }
        .pcp-page-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 16px; border: 1px solid var(--line); border-radius: 3px; background: var(--paper); color: var(--ink); font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.2s, border-color 0.2s; }
        .pcp-page-btn:hover:not(:disabled) { border-color: var(--brass); background: var(--cream); }
        .pcp-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pcp-page-status { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--ink-soft); min-width: 100px; text-align: center; }

        @media (max-width: 980px) {
          .pcp-hero { grid-template-columns: 1fr; }
          .pcp-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
        }
        @media (max-width: 720px) {
          .pcp-shell { padding: 0 24px 72px; }
          .pcp-hero { padding-top: 40px; }
          .pcp-grid { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; }
          .pcp-filter-bar { align-items: stretch; }
          .pcp-filter-actions, .pcp-cat-chips { width: 100%; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 2px; }
          .pcp-chip { flex: 0 0 auto; }
          .pcp-results-meta { width: 100%; }
        }
        @media (max-width: 480px) {
          .pcp-search { grid-template-columns: 1fr; }
          .pcp-grid { grid-template-columns: 1fr; }
          .pcp-card-name { min-height: 0; }
          .pcp-pagination { gap: 10px; }
        }
      `}</style>

      <main className="pcp-page">
        <div className="pcp-shell">
          <section className="pcp-hero" aria-labelledby="products-title">
            <div>
              <span className="pcp-eyebrow">
                <i className="ti ti-hanger" aria-hidden="true" />
                Shop Perry's Collection
              </span>
              <h1 id="products-title">{activeTitle}</h1>
              <p>
                Browse live products from the Perry's backend catalog. Search by name,
                SKU, or description and use featured filters for new campaign picks.
              </p>
            </div>

            <form className="pcp-search" onSubmit={handleSearch} role="search">
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search products"
                aria-label="Search products"
              />
              <button className="pcp-search-btn" type="submit">
                <i className="ti ti-search" aria-hidden="true" />
                Search
              </button>
            </form>
          </section>

          <section className="pcp-filter-bar" aria-label="Product filters">
            <div className="pcp-filter-actions">
              <button
                className={`pcp-chip ${featured !== "true" && !query ? "active" : ""}`}
                type="button"
                onClick={() => updateParams({ featured: "", q: "", page: "" })}
              >
                All
              </button>
              <button
                className={`pcp-chip ${featured === "true" ? "active" : ""}`}
                type="button"
                onClick={() => updateParams({ featured: featured === "true" ? "" : "true", page: "" })}
              >
                <i className="ti ti-sparkles" aria-hidden="true" />
                Featured
              </button>
              {(query || featured) && (
                <button
                  className="pcp-chip"
                  type="button"
                  onClick={() => updateParams({ featured: "", q: "", page: "" })}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="pcp-cat-chips" aria-label="Categories">
              {categories.slice(0, 6).map((category) => (
                <Link className="pcp-chip" to={`/categories/${category.slug}`} key={category.id}>
                  {category.name}
                </Link>
              ))}
            </div>

            <div className="pcp-results-meta" aria-live="polite">
              {loading
                ? "Loading products…"
                : `${pagination.total || products.length} product${(pagination.total || products.length) === 1 ? "" : "s"}`}
            </div>
          </section>

          {error ? (
            <section className="pcp-state-panel" role="alert">
              <div>
                <h2>Product feed unavailable</h2>
                <p>{error}</p>
                <button className="pcp-state-btn" type="button" onClick={() => window.location.reload()}>
                  Retry
                </button>
              </div>
            </section>
          ) : products.length === 0 && !loading ? (
            <section className="pcp-state-panel">
              <div>
                <h2>No products found</h2>
                <p>Try a different search term or clear the active filter to see more of the catalog.</p>
                <button className="pcp-state-btn" type="button" onClick={() => updateParams({ featured: "", q: "", page: "" })}>
                  Show all products
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="pcp-grid" aria-label="Product results">
                {loading ? <ProductsSkeleton /> : products.map((product) => (
                  <ProductCard product={product} key={product.id} />
                ))}
              </section>

              {!loading && pagination.total_pages > 1 && (
                <nav className="pcp-pagination" aria-label="Product pagination">
                  <button
                    className="pcp-page-btn"
                    type="button"
                    disabled={!pagination.has_previous}
                    onClick={() => goToPage(Math.max(1, page - 1))}
                  >
                    <i className="ti ti-chevron-left" aria-hidden="true" />
                    Prev
                  </button>
                  <span className="pcp-page-status">
                    Page {pagination.page || page} of {pagination.total_pages}
                  </span>
                  <button
                    className="pcp-page-btn"
                    type="button"
                    disabled={!pagination.has_next}
                    onClick={() => goToPage(page + 1)}
                  >
                    Next
                    <i className="ti ti-chevron-right" aria-hidden="true" />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}