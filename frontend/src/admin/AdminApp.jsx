import './admin.css';
import ProductsPage from './pages/ProductsPage';
import DeliveriesPage from './pages/DeliveriesPage';
import RobotsPage from './pages/RobotsPage';
import RevenuePage from './pages/RevenuePage';
import InviteCodesPage from './pages/InviteCodesPage';
import { getStoredRole } from '../utils/authSession';

const SECTION_ALIASES = {
  '': 'inventory',
  dashboard: 'inventory',
  products: 'inventory',
  inventory: 'inventory',
  orders: 'deliveries',
  deliveries: 'deliveries',
  robots: 'robots',
  revenue: 'financial',
  financial: 'financial',
  'invite-codes': 'invite-codes',
};

function sectionFromPath(path = '') {
  const normalizedPath = String(path)
    .split(/[?#]/)[0]
    .replace(/^\/admin\/?/i, '')
    .replace(/^\/+|\/+$/g, '');

  const [rawSection = ''] = normalizedPath.split('/');
  return SECTION_ALIASES[rawSection.toLowerCase()] || 'inventory';
}

export default function AdminApp({ path }) {
  const section = sectionFromPath(path);
  const role = getStoredRole();
  const isEmployee = role === 'employee';
  const isManager = role === 'manager';

  switch (section) {
    case 'inventory':
      return <ProductsPage />;

    case 'deliveries':
      return <DeliveriesPage />;

    case 'robots':
      return <RobotsPage />;

    case 'financial':
      if (isEmployee) {
        return <ProductsPage />;
      }
      return <RevenuePage />;

    case 'invite-codes':
      if (!isManager) {
        return <ProductsPage />;
      }
      return <InviteCodesPage />;

    default:
      return <ProductsPage />;
  }
}