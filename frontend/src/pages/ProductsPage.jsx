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
    <div className="pc-product-fallback" aria-hidden="true">
      {initials || "PC"}
    </div>
  );
}

function ProductCard({ product }) {
  const { addItem } = useCart();
  // useCart() reads from CartContext — the same cart state the Navbar
  // uses for its badge count. Calling addItem() here updates both.

  const [adding, setAdding]   = useState(false);
  const [added, setAdded]     = useState(false);

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
    <article className="pc-product-card">
      {/* Image + tags */}
      <Link
        to={`/products/${product.slug}`}
        className="pc-product-image-link"
        aria-label={product.name}
      >
        {/* ProductImage handles real image vs initials fallback */}
        <ProductImage product={product} />
        {product.featured && (
          <span className="pc-product-tag">Featured</span>
        )}
        {!product.in_stock && (
          <span className="pc-product-tag pc-product-tag-muted">Out of stock</span>
        )}
      </Link>

      {/* Text info */}
      <div className="pc-product-info">
        <p className="pc-product-category">
          {product.category_name || "Perry's Collection"}
        </p>
        <h2>
          <Link to={`/products/${product.slug}`}>{product.name}</Link>
        </h2>
        <div className="pc-product-price-row">
          <span className="pc-product-price">{formatPrice(product.price)}</span>
          {product.compare_at_price && (
            <span className="pc-product-compare">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>

        {/* Add to cart button — now actually connected to CartContext */}
        <button
          className="pc-add-button"
          type="button"
          disabled={!product.in_stock || adding}
          onClick={handleAddToCart}
          // style changes to green when item is added successfully
          style={added ? {
            background: "linear-gradient(135deg,#22c55e,#16a34a)",
            color: "#0a0603",
          } : {}}
        >
          <i
            className={`ti ${added ? "ti-check" : "ti-shopping-cart-plus"}`}
            aria-hidden="true"
          />
          {adding ? "Adding…" : added ? "Added!" : product.in_stock ? "Add to cart" : "Unavailable"}
        </button>
      </div>
    </article>
  );
}


function ProductsSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <div className="pc-product-card pc-product-card-loading" key={index}>
      <div className="pc-skeleton-image" />
      <div className="pc-skeleton-line short" />
      <div className="pc-skeleton-line" />
      <div className="pc-skeleton-line price" />
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
    if (featured === "true") return "Featured Products";
    return "All Products";
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
        .pc-products-page {
          min-height: 100vh;
          background: #120a06;
          color: #f0dba8;
        }
        .pc-products-shell {
          width: min(1200px, calc(100% - 32px));
          margin: 0 auto;
          padding: 42px 0 72px;
        }
        .pc-products-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
          gap: 28px;
          align-items: end;
          padding: 30px 0 26px;
          border-bottom: 1px solid rgba(196, 148, 72, 0.16);
        }
        .pc-products-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #c49448;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 12px;
        }
        .pc-products-hero h1 {
          margin: 0;
          color: #f0dba8;
          font-family: Georgia, serif;
          font-size: clamp(2rem, 6vw, 4rem);
          font-weight: 400;
          line-height: 1.08;
        }
        .pc-products-hero p {
          max-width: 620px;
          margin: 14px 0 0;
          color: #a8895c;
          font-size: 15px;
          line-height: 1.7;
        }
        .pc-product-search {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          padding: 12px;
          background: #1a0f08;
          border: 1px solid rgba(196, 148, 72, 0.18);
          border-radius: 8px;
        }
        .pc-product-search input {
          min-width: 0;
          height: 44px;
          border: 1px solid rgba(196, 148, 72, 0.18);
          border-radius: 7px;
          background: #120a06;
          color: #f0dba8;
          padding: 0 13px;
          font: inherit;
          outline: none;
        }
        .pc-product-search input:focus {
          border-color: rgba(196, 148, 72, 0.6);
        }
        .pc-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          padding: 22px 0;
        }
        .pc-filter-actions,
        .pc-category-chips {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pc-chip,
        .pc-page-button,
        .pc-submit-search {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 40px;
          border: 1px solid rgba(196, 148, 72, 0.24);
          border-radius: 7px;
          background: transparent;
          color: #c4ab82;
          cursor: pointer;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          padding: 0 14px;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .pc-chip:hover,
        .pc-page-button:hover,
        .pc-submit-search:hover {
          background: rgba(196, 148, 72, 0.09);
          border-color: rgba(196, 148, 72, 0.45);
          color: #e8c87a;
        }
        .pc-chip.active,
        .pc-submit-search {
          background: linear-gradient(135deg, #c49448 0%, #8b5e1a 100%);
          border-color: transparent;
          color: #120a06;
        }
        .pc-results-meta {
          color: #7f613d;
          font-size: 13px;
        }
        .pc-products-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }
        .pc-product-card {
          overflow: hidden;
          background: #1a0f08;
          border: 1px solid rgba(196, 148, 72, 0.16);
          border-radius: 8px;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .pc-product-card:hover {
          transform: translateY(-3px);
          border-color: rgba(196, 148, 72, 0.42);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.34);
        }
        .pc-product-image-link {
          position: relative;
          display: block;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          background: linear-gradient(135deg, #2a1708 0%, #120a06 100%);
          text-decoration: none;
        }
        .pc-product-image-link img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 0.25s;
        }
        .pc-product-card:hover img {
          transform: scale(1.04);
        }
        .pc-product-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c49448;
          font-family: Georgia, serif;
          font-size: 34px;
          background:
            linear-gradient(135deg, rgba(196, 148, 72, 0.12), transparent),
            #1a0f08;
        }
        .pc-product-tag {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(18, 10, 6, 0.84);
          border: 1px solid rgba(196, 148, 72, 0.24);
          color: #e8c87a;
          font-size: 11px;
          font-weight: 700;
          backdrop-filter: blur(8px);
        }
        .pc-product-tag-muted {
          left: auto;
          right: 10px;
          color: #c4ab82;
        }
        .pc-product-info {
          padding: 14px;
        }
        .pc-product-category {
          margin: 0 0 6px;
          color: #8d6f48;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .pc-product-info h2 {
          min-height: 44px;
          margin: 0 0 10px;
          font-size: 15px;
          line-height: 1.45;
        }
        .pc-product-info h2 a {
          color: #ddc799;
          text-decoration: none;
        }
        .pc-product-info h2 a:hover {
          color: #f0dba8;
        }
        .pc-product-price-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 13px;
          flex-wrap: wrap;
        }
        .pc-product-price {
          color: #c49448;
          font-size: 16px;
          font-weight: 800;
        }
        .pc-product-compare {
          color: #705335;
          font-size: 13px;
          text-decoration: line-through;
        }
        .pc-add-button {
          width: 100%;
          min-height: 40px;
          border: 0;
          border-radius: 7px;
          background: linear-gradient(135deg, #c49448 0%, #8b5e1a 100%);
          color: #120a06;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 800;
        }
        .pc-add-button:disabled {
          cursor: not-allowed;
          background: #302014;
          color: #7f613d;
        }
        .pc-state-panel {
          min-height: 260px;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 38px 20px;
          background: #1a0f08;
          border: 1px solid rgba(196, 148, 72, 0.16);
          border-radius: 8px;
        }
        .pc-state-panel h2 {
          margin: 0 0 8px;
          color: #f0dba8;
          font-size: 22px;
        }
        .pc-state-panel p {
          max-width: 440px;
          margin: 0 auto 18px;
          color: #9a7a4a;
          line-height: 1.6;
        }
        .pc-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding-top: 28px;
        }
        .pc-page-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .pc-page-status {
          color: #a8895c;
          font-size: 13px;
          min-width: 92px;
          text-align: center;
        }
        .pc-product-card-loading {
          padding-bottom: 14px;
          transform: none;
        }
        .pc-skeleton-image,
        .pc-skeleton-line {
          background: linear-gradient(90deg, #211309, #2c1a0e, #211309);
          background-size: 200% 100%;
          animation: pc-shimmer 1.2s linear infinite;
        }
        .pc-skeleton-image {
          aspect-ratio: 4 / 5;
        }
        .pc-skeleton-line {
          height: 12px;
          border-radius: 999px;
          margin: 14px 14px 0;
        }
        .pc-skeleton-line.short {
          width: 42%;
        }
        .pc-skeleton-line.price {
          width: 55%;
          height: 16px;
        }
        @keyframes pc-shimmer {
          to { background-position: -200% 0; }
        }
        @media (max-width: 980px) {
          .pc-products-hero {
            grid-template-columns: 1fr;
          }
          .pc-products-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 720px) {
          .pc-products-shell {
            width: min(100% - 24px, 1200px);
            padding-top: 24px;
          }
          .pc-products-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .pc-filter-bar {
            align-items: stretch;
          }
          .pc-filter-actions,
          .pc-category-chips {
            width: 100%;
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 2px;
          }
          .pc-chip {
            flex: 0 0 auto;
          }
          .pc-results-meta {
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .pc-product-search {
            grid-template-columns: 1fr;
          }
          .pc-products-grid {
            grid-template-columns: 1fr;
          }
          .pc-product-info h2 {
            min-height: 0;
          }
          .pc-pagination {
            gap: 8px;
          }
        }
      `}</style>

      <main className="pc-products-page">
        <div className="pc-products-shell">
          <section className="pc-products-hero" aria-labelledby="products-title">
            <div>
              <span className="pc-products-eyebrow">
                <i className="ti ti-hanger" aria-hidden="true" />
                Shop Perry's Collection
              </span>
              <h1 id="products-title">{activeTitle}</h1>
              <p>
                Browse live products from the Perry's backend catalog. Search by name,
                SKU, or description and use featured filters for new campaign picks.
              </p>
            </div>

            <form className="pc-product-search" onSubmit={handleSearch} role="search">
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search products"
                aria-label="Search products"
              />
              <button className="pc-submit-search" type="submit">
                <i className="ti ti-search" aria-hidden="true" />
                Search
              </button>
            </form>
          </section>

          <section className="pc-filter-bar" aria-label="Product filters">
            <div className="pc-filter-actions">
              <button
                className={`pc-chip ${featured !== "true" && !query ? "active" : ""}`}
                type="button"
                onClick={() => updateParams({ featured: "", q: "", page: "" })}
              >
                All
              </button>
              <button
                className={`pc-chip ${featured === "true" ? "active" : ""}`}
                type="button"
                onClick={() => updateParams({ featured: featured === "true" ? "" : "true", page: "" })}
              >
                <i className="ti ti-sparkles" aria-hidden="true" />
                Featured
              </button>
              {(query || featured) && (
                <button
                  className="pc-chip"
                  type="button"
                  onClick={() => updateParams({ featured: "", q: "", page: "" })}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="pc-category-chips" aria-label="Categories">
              {categories.slice(0, 6).map((category) => (
                <Link className="pc-chip" to={`/categories/${category.slug}`} key={category.id}>
                  {category.name}
                </Link>
              ))}
            </div>

            <div className="pc-results-meta" aria-live="polite">
              {loading ? "Loading products..." : `${pagination.total || products.length} product${(pagination.total || products.length) === 1 ? "" : "s"}`}
            </div>
          </section>

          {error ? (
            <section className="pc-state-panel" role="alert">
              <div>
                <h2>Product feed unavailable</h2>
                <p>{error}</p>
                <button className="pc-chip active" type="button" onClick={() => window.location.reload()}>
                  Retry
                </button>
              </div>
            </section>
          ) : products.length === 0 && !loading ? (
            <section className="pc-state-panel">
              <div>
                <h2>No products found</h2>
                <p>Try a different search term or clear the active filter to see more of the catalog.</p>
                <button className="pc-chip active" type="button" onClick={() => updateParams({ featured: "", q: "", page: "" })}>
                  Show all products
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="pc-products-grid" aria-label="Product results">
                {loading ? <ProductsSkeleton /> : products.map((product) => (
                  <ProductCard product={product} key={product.id} />
                ))}
              </section>

              {!loading && pagination.total_pages > 1 && (
                <nav className="pc-pagination" aria-label="Product pagination">
                  <button
                    className="pc-page-button"
                    type="button"
                    disabled={!pagination.has_previous}
                    onClick={() => goToPage(Math.max(1, page - 1))}
                  >
                    <i className="ti ti-chevron-left" aria-hidden="true" />
                    Prev
                  </button>
                  <span className="pc-page-status">
                    Page {pagination.page || page} of {pagination.total_pages}
                  </span>
                  <button
                    className="pc-page-button"
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
