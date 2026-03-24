import { useEffect, useState } from 'react';
import './styles/customer.css';
import BrowsingPage from './pages/BrowsingPage';
import ProductDetailPage from './pages/ProductDetailPage';

export default function CustomerApp() {

  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  })  

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart]);

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
