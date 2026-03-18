import { useEffect, useState } from 'react';
import { getStoredName, clearFrontendSession } from '../../utils/authSession';
import '../styles/browsing.css';

const API_BASE = 'http://localhost:8000';

function makePlaceholder(label, background = '#ecfdf5', foreground = '#166534') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="${background}" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="${foreground}">
        ${label}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getFallbackImage(product) {
  if (product?.image_url) return product.image_url;

  const category = String(product?.category || '').toLowerCase();
  if (category.includes('fruit') || category.includes('vegetable') || category.includes('produce'))
    return makePlaceholder('Fresh Produce');
  if (category.includes('dairy')) return makePlaceholder('Dairy', '#eff6ff', '#1d4ed8');
  if (category.includes('drink') || category.includes('beverage'))
    return makePlaceholder('Drinks', '#fff7ed', '#c2410c');
  if (category.includes('pantry')) return makePlaceholder('Pantry', '#fefce8', '#a16207');
  if (category.includes('meat')) return makePlaceholder('Meat & Poultry', '#fef2f2', '#b91c1c');
  if (category.includes('bakery')) return makePlaceholder('Bakery', '#fdf4ff', '#86198f');
  return makePlaceholder('OFS Product');
}

export default function ProductDetailPage({ productId }) {
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const storedName = getStoredName();
  const profileInitial = storedName?.trim()?.charAt(0)?.toUpperCase() || 'C';

  useEffect(() => {
    async function loadProduct() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await fetch(`${API_BASE}/api/products/${productId}`, {
          credentials: 'include',
        });

        if (response.status === 404) {
          throw new Error('Product not found');
        }

        if (!response.ok) {
          throw new Error(`Failed to load product (${response.status})`);
        }

        const data = await response.json();
        setProduct(data);
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load product');
      } finally {
        setIsLoading(false);
      }
    }

    loadProduct();
  }, [productId]);

  function handleAddToCart() {
    if (!product || !product.is_available || product.stock <= 0) return;
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
    // TODO: integrate with global cart state or cart API
  }

  return (
    <>
      <style>{`
        .pdp-container {
          max-width: 1000px;
          margin: 2rem auto;
          padding: 0 1.5rem;
        }

        .pdp-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-mid);
          text-decoration: none;
          margin-bottom: 1.5rem;
          transition: color 0.2s ease;
        }

        .pdp-back-link:hover {
          color: var(--green-dark);
        }

        .pdp-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.5rem;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }

        .pdp-image-wrap {
          aspect-ratio: 1 / 0.85;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8faf8;
        }

        .pdp-image-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pdp-info {
          padding: 2.5rem 2.5rem 2.5rem 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .pdp-category {
          display: inline-block;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #f97316;
          background: #fff7ed;
          padding: 4px 10px;
          border-radius: 6px;
          margin-bottom: 0.75rem;
          width: fit-content;
        }

        .pdp-name {
          font-size: 1.8rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-dark);
          margin-bottom: 0.6rem;
          line-height: 1.15;
        }

        .pdp-description {
          font-size: 1rem;
          color: var(--text-mid);
          line-height: 1.65;
          margin-bottom: 1.5rem;
        }

        .pdp-meta-row {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .pdp-meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pdp-meta-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-light);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .pdp-meta-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-dark);
        }

        .pdp-price {
          font-size: 2rem;
          font-weight: 800;
          color: #16a34a;
          margin-bottom: 1.5rem;
        }

        .pdp-stock-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          width: fit-content;
        }

        .pdp-stock-badge.in-stock {
          background: #dcfce7;
          color: #166534;
        }

        .pdp-stock-badge.low-stock {
          background: #fef3c7;
          color: #92400e;
        }

        .pdp-stock-badge.out-of-stock {
          background: #fef2f2;
          color: #991b1b;
        }

        .pdp-stock-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .in-stock .pdp-stock-dot { background: #22c55e; }
        .low-stock .pdp-stock-dot { background: #f59e0b; }
        .out-of-stock .pdp-stock-dot { background: #ef4444; }

        .pdp-quantity-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .pdp-quantity-row label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-dark);
        }

        .pdp-qty-controls {
          display: flex;
          align-items: center;
          gap: 0;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .pdp-qty-controls button {
          width: 38px;
          height: 38px;
          border: none;
          background: #f9fafb;
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-dark);
          transition: background 0.15s ease;
        }

        .pdp-qty-controls button:hover {
          background: #f0fdf4;
        }

        .pdp-qty-controls button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pdp-qty-controls span {
          width: 42px;
          text-align: center;
          font-weight: 700;
          font-size: 1rem;
          border-left: 1.5px solid var(--border);
          border-right: 1.5px solid var(--border);
          padding: 8px 0;
          background: white;
        }

        .pdp-add-btn {
          width: 100%;
          padding: 0.9rem 1rem;
          background: linear-gradient(135deg, var(--green), var(--green-dark));
          color: white;
          border: none;
          border-radius: 14px;
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.2s ease;
          box-shadow: 0 10px 24px rgba(34, 197, 94, 0.24);
        }

        .pdp-add-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(34, 197, 94, 0.3);
        }

        .pdp-add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pdp-add-btn.added {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          box-shadow: 0 10px 24px rgba(59, 130, 246, 0.24);
        }

        .pdp-organic-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #dcfce7;
          color: #166534;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 6px;
          margin-left: 8px;
        }

        .pdp-loading, .pdp-error {
          text-align: center;
          padding: 4rem 2rem;
        }

        .pdp-error {
          color: #b91c1c;
        }

        @media (max-width: 768px) {
          .pdp-card {
            grid-template-columns: 1fr;
          }

          .pdp-info {
            padding: 1.5rem;
          }

          .pdp-name {
            font-size: 1.4rem;
          }
        }
      `}</style>

      <nav className="customer-navbar">
        <a className="customer-navbar-logo" href="/home">
          <div className="customer-logo-icon">🛒</div>
          <span className="customer-logo-text">OFS</span>
        </a>

        <ul className="customer-navbar-links">
          <li><a href="/home">Home</a></li>
          <li><a href="/home#browse-products">Shop</a></li>
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="customer-profile-btn" type="button" title={storedName || 'Customer'}>
            <div className="customer-profile-avatar customer-profile-avatar-fallback">{profileInitial}</div>
          </button>
          <button
            type="button"
            onClick={() => { clearFrontendSession(); window.location.href = '/'; }}
            style={{
              padding: '0.45rem 1rem',
              border: '1.5px solid var(--border)',
              borderRadius: '10px',
              background: 'rgba(253, 57, 57, 0.92)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Log out
          </button>
        </div>
      </nav>

      <div className="pdp-container">
        <a href="/home" className="pdp-back-link">← Back to Shop</a>

        {isLoading && <div className="pdp-loading"><p>Loading product…</p></div>}

        {!isLoading && errorMessage && (
          <div className="pdp-error">
            <h2>😕 {errorMessage}</h2>
            <p style={{ marginTop: '1rem' }}><a href="/home" style={{ color: '#16a34a', fontWeight: 600 }}>Return to Shop</a></p>
          </div>
        )}

        {!isLoading && !errorMessage && product && (
          <div className="pdp-card">
            <div className="pdp-image-wrap">
              <img src={getFallbackImage(product)} alt={product.name} />
            </div>

            <div className="pdp-info">
              <div>
                <span className="pdp-category">{product.category}</span>
                {product.is_organic && <span className="pdp-organic-badge">🌿 Organic</span>}
              </div>

              <h1 className="pdp-name">{product.name}</h1>
              <p className="pdp-description">{product.description}</p>

              <div className="pdp-meta-row">
                <div className="pdp-meta-item">
                  <span className="pdp-meta-label">Weight</span>
                  <span className="pdp-meta-value">{Number(product.weight_lbs).toFixed(2)} lbs</span>
                </div>
                <div className="pdp-meta-item">
                  <span className="pdp-meta-label">Stock</span>
                  <span className="pdp-meta-value">{product.stock} units</span>
                </div>
              </div>

              <div className="pdp-price">${Number(product.price).toFixed(2)}</div>

              {(() => {
                if (!product.is_available || product.stock <= 0)
                  return <div className="pdp-stock-badge out-of-stock"><div className="pdp-stock-dot" /> Out of Stock</div>;
                if (product.stock <= 10)
                  return <div className="pdp-stock-badge low-stock"><div className="pdp-stock-dot" /> Low Stock – Only {product.stock} left</div>;
                return <div className="pdp-stock-badge in-stock"><div className="pdp-stock-dot" /> In Stock</div>;
              })()}

              <div className="pdp-quantity-row">
                <label>Quantity</label>
                <div className="pdp-qty-controls">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                className={`pdp-add-btn${addedToCart ? ' added' : ''}`}
                onClick={handleAddToCart}
                disabled={!product.is_available || product.stock <= 0}
              >
                {addedToCart ? '✓ Added to Cart' : `Add to Cart — $${(Number(product.price) * quantity).toFixed(2)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
