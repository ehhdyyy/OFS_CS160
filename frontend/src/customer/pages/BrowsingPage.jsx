import { useEffect, useMemo, useState } from 'react';
import { getStoredName } from '../../utils/authSession';
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
  if (product?.image) {
    return product.image;
  }

  const category = String(product?.category || '').toLowerCase();

  if (category.includes('produce') || category.includes('fruit') || category.includes('vegetable')) {
    return makePlaceholder('Fresh Produce');
  }

  if (category.includes('dairy')) {
    return makePlaceholder('Dairy', '#eff6ff', '#1d4ed8');
  }

  if (category.includes('drink') || category.includes('beverage')) {
    return makePlaceholder('Drinks', '#fff7ed', '#c2410c');
  }

  if (category.includes('pantry')) {
    return makePlaceholder('Pantry', '#fefce8', '#a16207');
  }

  if (category.includes('meat')) {
    return makePlaceholder('Meat & Poultry', '#fef2f2', '#b91c1c');
  }

  if (category.includes('bakery')) {
    return makePlaceholder('Bakery', '#fdf4ff', '#86198f');
  }

  return makePlaceholder('OFS Product');
}

export default function BrowsingPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [filters, setFilters] = useState({
    category: [],
    search: '',
    priceRange: 'all',
    weightRange: 'all',
    availability: 'all',
  });
  const [cart, setCart] = useState([]);

  const storedName = getStoredName();
  const profileInitial = storedName?.trim()?.charAt(0)?.toUpperCase() || 'C';

  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await fetch(`${API_BASE}/api/products`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to load products (${response.status})`);
        }

        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load products');
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  const categoryOptions = useMemo(() => {
    return [...new Set(products.map((product) => product.category).filter(Boolean))].sort();
  }, [products]);

  function toggleCategory(category) {
    setFilters((previous) => {
      const exists = previous.category.includes(category);

      return {
        ...previous,
        category: exists
          ? previous.category.filter((item) => item !== category)
          : [...previous.category, category],
      };
    });
  }

  function matchesPriceRange(price, range) {
    if (range === 'all') return true;
    if (range === 'under5') return price < 5;
    if (range === '5to10') return price >= 5 && price <= 10;
    if (range === 'over10') return price > 10;
    return true;
  }

  function matchesWeightRange(weightLbs, range) {
    if (range === 'all') return true;
    if (range === 'under1') return weightLbs < 1;
    if (range === '1to10') return weightLbs >= 1 && weightLbs <= 10;
    if (range === 'over10') return weightLbs > 10;
    return true;
  }

  function addToCart(product) {
    setCart((previous) => {
      const existingItem = previous.find((item) => item.id === product.id);

      if (existingItem) {
        return previous.map((item) => (
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        ));
      }

      return [
        ...previous,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          qty: 1,
        },
      ];
    });
  }

  function changeQuantity(productId, delta) {
    setCart((previous) => (
      previous
        .map((item) => (
          item.id === productId ? { ...item, qty: item.qty + delta } : item
        ))
        .filter((item) => item.qty > 0)
    ));
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const productName = String(product.name || '').toLowerCase();
      const searchTerm = filters.search.toLowerCase();

      const matchesSearch = productName.includes(searchTerm);
      const matchesCategory = filters.category.length === 0 || filters.category.includes(product.category);
      const matchesAvailability =
        filters.availability === 'all' ||
        (filters.availability === 'stocked' && Boolean(product.is_available));
      const matchesPrice = matchesPriceRange(Number(product.price), filters.priceRange);
      const matchesWeight = matchesWeightRange(Number(product.weight_lbs), filters.weightRange);

      return matchesSearch && matchesCategory && matchesAvailability && matchesPrice && matchesWeight;
    });
  }, [products, filters]);

  const cartItemCount = useMemo(() => (
    cart.reduce((total, item) => total + item.qty, 0)
  ), [cart]);

  const cartTotal = useMemo(() => (
    cart.reduce((total, item) => total + item.price * item.qty, 0)
  ), [cart]);

  return (
    <>
      <nav className="customer-navbar">
        <a className="customer-navbar-logo" href="/home">
          <div className="customer-logo-icon">🛒</div>
          <span className="customer-logo-text">OFS</span>
        </a>

        <ul className="customer-navbar-links">
          <li><a href="/home">Home</a></li>
          <li><a href="#browse-products">Shop</a></li>
          <li><a href="#browse-filters">Filters</a></li>
          <li><a href="#browse-cart">Cart</a></li>
        </ul>

        <button className="customer-profile-btn" type="button" title={storedName || 'Customer'}>
          <div className="customer-profile-avatar customer-profile-avatar-fallback">{profileInitial}</div>
        </button>
      </nav>

      <div className="customer-browse-page">
        <aside className="customer-filter-panel" id="browse-filters">
          <div className="customer-filter-section customer-filter-section-intro">
            <h2 className="customer-section-title">Filters</h2>
            <p className="customer-helper-text">Browse grocery items without changing your backend.</p>
          </div>

          <div className="customer-filter-section">
            <h3>Categories</h3>
            {categoryOptions.length === 0 ? (
              <p className="customer-helper-text">No categories loaded yet.</p>
            ) : (
              categoryOptions.map((category) => (
                <label key={category}>
                  <input
                    type="checkbox"
                    checked={filters.category.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  {category}
                </label>
              ))
            )}
          </div>

          <div className="customer-filter-section">
            <h3>Price Range</h3>

            <label>
              <input
                type="radio"
                name="priceRange"
                checked={filters.priceRange === 'all'}
                onChange={() => setFilters((previous) => ({ ...previous, priceRange: 'all' }))}
              />
              All
            </label>

            <label>
              <input
                type="radio"
                name="priceRange"
                checked={filters.priceRange === 'under5'}
                onChange={() => setFilters((previous) => ({ ...previous, priceRange: 'under5' }))}
              />
              Under $5
            </label>

            <label>
              <input
                type="radio"
                name="priceRange"
                checked={filters.priceRange === '5to10'}
                onChange={() => setFilters((previous) => ({ ...previous, priceRange: '5to10' }))}
              />
              $5 - $10
            </label>

            <label>
              <input
                type="radio"
                name="priceRange"
                checked={filters.priceRange === 'over10'}
                onChange={() => setFilters((previous) => ({ ...previous, priceRange: 'over10' }))}
              />
              Over $10
            </label>
          </div>

          <div className="customer-filter-section">
            <h3>Weight Range</h3>

            <label>
              <input
                type="radio"
                name="weightRange"
                checked={filters.weightRange === 'all'}
                onChange={() => setFilters((previous) => ({ ...previous, weightRange: 'all' }))}
              />
              All
            </label>

            <label>
              <input
                type="radio"
                name="weightRange"
                checked={filters.weightRange === 'under1'}
                onChange={() => setFilters((previous) => ({ ...previous, weightRange: 'under1' }))}
              />
              Under 1 lb
            </label>

            <label>
              <input
                type="radio"
                name="weightRange"
                checked={filters.weightRange === '1to10'}
                onChange={() => setFilters((previous) => ({ ...previous, weightRange: '1to10' }))}
              />
              1 - 10 lb
            </label>

            <label>
              <input
                type="radio"
                name="weightRange"
                checked={filters.weightRange === 'over10'}
                onChange={() => setFilters((previous) => ({ ...previous, weightRange: 'over10' }))}
              />
              Over 10 lb
            </label>
          </div>

          <div className="customer-filter-section">
            <h3>Availability</h3>

            <label>
              <input
                type="radio"
                name="availability"
                checked={filters.availability === 'all'}
                onChange={() => setFilters((previous) => ({ ...previous, availability: 'all' }))}
              />
              All
            </label>

            <label>
              <input
                type="radio"
                name="availability"
                checked={filters.availability === 'stocked'}
                onChange={() => setFilters((previous) => ({ ...previous, availability: 'stocked' }))}
              />
              Stocked
            </label>
          </div>
        </aside>

        <main className="customer-inventory-panel" id="browse-products">
          <div className="customer-inventory-topbar">
            <input
              type="text"
              placeholder="Search for products..."
              value={filters.search}
              onChange={(event) => {
                const { value } = event.target;
                setFilters((previous) => ({ ...previous, search: value }));
              }}
            />
          </div>

          <div className="customer-inventory-status">
            {isLoading && <p>Loading products…</p>}
            {!isLoading && errorMessage && <p className="customer-error-text">{errorMessage}</p>}
            {!isLoading && !errorMessage && (
              <p>
                Showing <strong>{filteredProducts.length}</strong> product{filteredProducts.length === 1 ? '' : 's'}
              </p>
            )}
          </div>

          {!isLoading && !errorMessage && filteredProducts.length === 0 ? (
            <div className="customer-empty-state">
              <h3>No products match these filters</h3>
              <p>Try clearing a filter or search term.</p>
            </div>
          ) : (
            <div className="customer-product-grid">
              {filteredProducts.map((product) => (
                <div className="customer-product-card" key={product.id}>
                  <img src={getFallbackImage(product)} alt={product.name} />
                  <p className="customer-product-category">{product.category}</p>
                  <h3>{product.name}</h3>
                  <p className="customer-product-weight">{Number(product.weight_lbs).toFixed(2)} lbs</p>
                  <div className="customer-product-bottom">
                    <span className="customer-product-price">${Number(product.price).toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={!product.is_available}
                      title={product.is_available ? 'Add to cart' : 'Out of stock'}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <aside className="customer-cart-panel" id="browse-cart">
          <div className="customer-cart-header">
            <h2>Cart</h2>
            <span className="customer-cart-badge">{cartItemCount}</span>
          </div>

          {cart.length === 0 ? (
            <div className="customer-cart-empty">
              <p>No items yet.</p>
              <span>Add products from the center panel.</span>
            </div>
          ) : (
            <>
              <div className="customer-cart-list">
                {cart.map((item) => (
                  <div className="customer-cart-row" key={item.id}>
                    <div>
                      <p className="customer-cart-product-name">{item.name}</p>
                      <p className="customer-cart-product-price">${(item.price * item.qty).toFixed(2)}</p>
                    </div>

                    <div className="customer-cart-controls">
                      <button type="button" onClick={() => changeQuantity(item.id, -1)}>−</button>
                      <span>{item.qty}</span>
                      <button type="button" onClick={() => changeQuantity(item.id, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="customer-cart-summary">
                <div className="customer-cart-total">
                  <span>Total</span>
                  <strong>${cartTotal.toFixed(2)}</strong>
                </div>
                <button className="customer-checkout-btn" type="button">Checkout</button>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
