import './styles/customer.css';
import BrowsingPage from './pages/BrowsingPage';
import ProductDetailPage from './pages/ProductDetailPage';

export default function CustomerApp() {
  // Check if we're on a product detail page: /product/123
  const match = window.location.pathname.match(/^\/product\/(\d+)$/);

  if (match) {
    return (
      <div className="customer-app">
        <ProductDetailPage productId={Number(match[1])} />
      </div>
    );
  }

  return (
    <div className="customer-app">
      <BrowsingPage />
    </div>
  );
}
