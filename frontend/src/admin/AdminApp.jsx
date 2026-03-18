import './admin.css';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import DeliveriesPage from './pages/DeliveriesPage';
import RobotsPage from './pages/RobotsPage';
import RevenuePage from './pages/RevenuePage';

function sectionFromPath(path) {
  const trimmed = path.replace(/^\/admin\/?/, '');
  const [section = 'dashboard'] = trimmed.split('/');
  return section || 'dashboard';
}

export default function AdminApp({ path }) {
  const section = sectionFromPath(path);

  switch (section) {
    case 'dashboard':
      return <DashboardPage />;
    case 'inventory':
    case 'products':
      return <ProductsPage />;
    case 'orders':
      return <OrdersPage />;
    case 'deliveries':
      return <DeliveriesPage />;
    case 'robots':
      return <RobotsPage />;
    case 'revenue':
      return <RevenuePage />;
    default:
      return <DashboardPage />;
  }
}
