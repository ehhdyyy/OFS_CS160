import './admin.css';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import DeliveriesPage from './pages/DeliveriesPage';
import RobotsPage from './pages/RobotsPage';
import RevenuePage from './pages/RevenuePage';
import InviteCodesPage from './pages/InviteCodesPage';
import { getStoredRole } from '../utils/authSession';

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
      if (getStoredRole() === 'employee') {
        return <DashboardPage />;
      }
      return <RevenuePage />;
    case 'invite-codes':
      if (getStoredRole() !== 'manager') {
        return <DashboardPage />;
      }
      return <InviteCodesPage />;
    default:
      return <DashboardPage />;
  }
}
