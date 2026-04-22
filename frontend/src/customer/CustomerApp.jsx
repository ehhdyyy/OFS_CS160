import { useEffect, useState } from 'react';
import './styles/customer.css';
import BrowsingPage from './pages/BrowsingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import ProfilePage from './pages/ProfilePage';
import { clearFrontendSession } from '../utils/authSession';

const API_BASE = 'http://localhost:8000';

export default function CustomerApp() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    loadCart();
  }, []);

  function handleUnauthorized() {
    clearFrontendSession();
    window.location.href = '/login';
  }

  async function loadCart() {
    try {
      const response = await fetch(`${API_BASE}/api/cart`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || `Failed to load cart (${response.status})`);
      }

      setCart(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error('Error loading cart:', error);
      setCart([]);
    }
  }

  async function addToCart(product, quantityToAdd = 1) {
    try {
      if (!product || product.stock <= 0 || quantityToAdd <= 0) return false;

      const response = await fetch(`${API_BASE}/api/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_id: product.id,
          quantity: quantityToAdd,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return false;
      }

      if (!response.ok) {
        throw new Error(data.detail || `Failed to add item (${response.status})`);
      }

      setCart(Array.isArray(data.items) ? data.items : []);
      return true;
    } catch (error) {
      console.error('Failed to add to cart:', error);
      return false;
    }
  }

  async function changeQuantity(productId, delta) {
    const existingItem = cart.find((item) => item.id === productId);
    if (!existingItem) return;

    const newQty = existingItem.quantity + delta;

    try {
      if (newQty <= 0) {
        const response = await fetch(`${API_BASE}/api/cart/items/${productId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        const data = await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(data.detail || `Failed to remove item (${response.status})`);
        }

        setCart(Array.isArray(data.items) ? data.items : []);
        return;
      }

      const response = await fetch(`${API_BASE}/api/cart/items/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity: newQty }),
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || `Failed to update item (${response.status})`);
      }

      setCart(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error('Failed to change quantity:', error);
    }
  }

  async function checkoutCart({ address, lat, lng } = {}) {
    const response = await fetch(`${API_BASE}/api/cart/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        delivery_address: address ?? null,
        delivery_lat: lat ?? null,
        delivery_lng: lng ?? null,
      }),
    });

    const data = await response.json();

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Please log in to complete your purchase.');
    }

    if (!response.ok) {
      const msg =
        response.status === 400
          ? data.detail
          : response.status === 401
            ? 'Please log in to complete your purchase.'
            : 'Something went wrong. Please try again.';

      throw new Error(msg);
    }

    setCart([]);
    window.location.href = `/orders/${data.order_id}`;
  }

  const path = window.location.pathname;
  const productMatch = path.match(/^\/product\/(\d+)$/);
  const orderMatch = path.match(/^\/orders\/(\d+)$/);

  if (path === '/profile') {
    return (
      <div className="customer-app">
        <ProfilePage />
      </div>
    );
  }

  if (path === '/orders') {
    return (
      <div className="customer-app">
        <OrderHistoryPage onBack={() => { window.location.href = '/home'; }} />
      </div>
    );
  }

  if (orderMatch) {
    return (
      <div className="customer-app">
        <OrderTrackingPage
          orderId={Number(orderMatch[1])}
          onBack={() => { window.location.href = '/orders'; }}
        />
      </div>
    );
  }

  if (productMatch) {
    return (
      <div className="customer-app">
        <ProductDetailPage
          productId={Number(productMatch[1])}
          cart={cart}
          addToCart={addToCart}
          changeQuantity={changeQuantity}
        />
      </div>
    );
  }

  return (
    <div className="customer-app">
      <BrowsingPage
        cart={cart}
        addToCart={addToCart}
        changeQuantity={changeQuantity}
        onCheckout={checkoutCart}
      />
    </div>
  );
}