import { useEffect, useState } from 'react';
import './styles/customer.css';
import BrowsingPage from './pages/BrowsingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import { getStoredUserId } from '../utils/authSession';


const API_BASE = 'http://localhost:8000';

export default function CustomerApp() {
  
  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);

  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    try {
      setCartLoading(true);

      const response = await fetch(`${API_BASE}/api/cart`,{
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();

      if(!response.ok) {
        throw new Error(data.message || `Failed to load cart (${response.status})`);
      }

      setCart(Array.isArray(data.items) ? data.items : []);
    }
    catch (error) {
      console.error('Error loading cart:', error);
      setCart([]);
    }
    finally {
      setCartLoading(false);
    }
  }

  async function addToCart(product, quantityToAdd = 1) {
    try {
      if (!product || product.stock <= 0 || quantityToAdd <= 0) return;

      const response = await fetch(`${API_BASE}/api/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          product_id: product.id,
          quantity: quantityToAdd,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Failed to add item (${response.status})`);
      }

      setCart(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error('Failed to add to cart:', error);
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

        if (!response.ok) {
          throw new Error(data.detail || `Failed to remove item (${response.status})`);
        }

        setCart(Array.isArray(data.items) ? data.items : []);
        return;
      }

      const response = await fetch(`${API_BASE}/api/cart/items/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          quantity: newQty,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Failed to update item (${response.status})`);
      }

      setCart(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error('Failed to change quantity:', error);
    }
  }
  // Check if we're on a product detail page: /product/123
  const match = window.location.pathname.match(/^\/product\/(\d+)$/);


  if (match) {
    return (
      <div className="customer-app">
        <ProductDetailPage 
          productId={Number(match[1])}
          cart = {cart}
          addToCart = {addToCart}
          changeQuantity = {changeQuantity} 
        />
      </div>
    );
  }

  return (
    <div className="customer-app">
      <BrowsingPage
        cart = {cart}
        addToCart = {addToCart}
        changeQuantity = {changeQuantity}
      />
    </div>
  );
}
