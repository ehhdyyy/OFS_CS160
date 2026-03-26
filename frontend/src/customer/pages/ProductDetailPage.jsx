import { useEffect, useState } from 'react';
import { getStoredName, clearFrontendSession } from '../../utils/authSession';
import '../styles/browsing.css';
import '../styles/productDetailPage.css';

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

export default function ProductDetailPage({ productId, cart, setCart, addToCart }) {
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

    addToCart(product, quantity);

    setTimeout(() => {
      window.location.href = "/home"; 
    }, 500);
  }

  return (
    <>
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
