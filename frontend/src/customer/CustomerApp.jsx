import { useEffect, useState } from 'react';
import './styles/customer.css';
import BrowsingPage from './pages/BrowsingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import { getStoredUserId } from '../utils/authSession';

export default function CustomerApp() {

  const userId = getStoredUserId();
  const cartKey = `cart_user_${userId}`;

  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem(cartKey);
    return savedCart ? JSON.parse(savedCart) : [];
  })  

  useEffect(() => {
    const savedCart = localStorage.getItem(cartKey);
    setCart(savedCart ? JSON.parse(savedCart) : []);
  }, [cartKey]);

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart))
  }, [cartKey, cart]);

  function addToCart(product, quantityToAdd = 1) {
    setCart((previous) => {
      const existingItem = previous.find((item) => item.id === product.id);

      if (product.stock <= 0) return previous;

      if (existingItem) {
        const newQty = existingItem.qty + quantityToAdd;
        if (newQty > product.stock) return previous;

        return previous.map((item) =>
          item.id === product.id
            ? { ...item, qty: newQty }
            : item
        );
      }

      return [
        ...previous,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          qty: quantityToAdd,
          weight_lbs: product.weight_lbs,
        },
      ];
    });
  }
  // Check if we're on a product detail page: /product/123
  const match = window.location.pathname.match(/^\/product\/(\d+)$/);


  if (match) {
    return (
      <div className="customer-app">
        <ProductDetailPage 
          productId={Number(match[1])}
          cart = {cart}
          setCart = {setCart}
          addToCart = {addToCart}
        />
      </div>
    );
  }

  return (
    <div className="customer-app">
      <BrowsingPage
        cart = {cart}
        setCart = {setCart} 
        addToCart = {addToCart}
      />
    </div>
  );
}
