import { clearFrontendSession, getStoredName, getStoredRole } from '../utils/authSession';

const NAV_ITEMS = [
  { key: 'inventory', label: 'Inventory', href: '/admin/inventory', icon: 'fas fa-box' },
  { key: 'deliveries', label: 'Deliveries', href: '/admin/deliveries', icon: 'fas fa-truck' },
  { key: 'robots', label: 'Robots', href: '/admin/robots', icon: 'fas fa-robot' },
  {
    key: 'financial',
    label: 'Financial',
    href: '/admin/financial',
    icon: 'fas fa-chart-line',
    employeeRestricted: true,
  },
  {
    key: 'invite-codes',
    label: 'Invite Codes',
    href: '/admin/invite-codes',
    icon: 'fas fa-ticket-alt',
    managerOnly: true,
  },
];

const NAV_KEY_ALIASES = {
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

function normalizeNavKey(key) {
  return NAV_KEY_ALIASES[String(key || '').toLowerCase()] || 'inventory';
}

function canViewNavItem(item, role) {
  if (item.managerOnly) {
    return role === 'manager';
  }

  if (item.employeeRestricted) {
    return role !== 'employee';
  }

  return true;
}

function handleSignOut() {
  clearFrontendSession();
  window.location.href = '/';
}

function QuickPanel({ quickPanel }) {
  if (!quickPanel?.items?.length) {
    return null;
  }

  return (
    <>
      <div className="admin-sidebar-divider" />
      <div className="admin-quick-panel">
        <h3 className="admin-quick-panel-title">{quickPanel.title}</h3>
        <div className="admin-quick-panel-items">
          {quickPanel.items.map((item) => {
            if (item.value) {
              return (
                <div
                  key={item.label}
                  className={[
                    'admin-filter-item',
                    item.className || 'text-gray-600',
                    item.hoverClassName || '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span>{item.label}</span>
                  <span className={`admin-filter-badge ${item.badgeClassName || 'bg-gray-100 text-gray-700'}`}>
                    {item.value}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                className={[
                  'admin-filter-button',
                  item.className || 'text-gray-600',
                  item.hoverClassName || '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span>
                  {item.icon ? <i className={`${item.icon} mr-2`} aria-hidden="true" /> : null}
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function AdminShell({
  activeNav,
  title,
  description,
  headerAction,
  children,
  quickPanel = { title: 'Quick Filters', items: [] },
}) {
  const role = getStoredRole();
  const normalizedActiveNav = normalizeNavKey(activeNav);
  const storedName = getStoredName();
  const displayName = storedName || 'Admin User';
  const visibleNavItems = NAV_ITEMS.filter((item) => canViewNavItem(item, role));

  return (
    <div className="admin-portal">
      <div className="admin-shell-layout">
        <header className="admin-top-nav">
          <div className="admin-brand">
            <div className="admin-logo-icon">
              <i className="fas fa-store" aria-hidden="true" />
            </div>
            <h1>OFS Admin Portal</h1>
          </div>

          <div className="admin-top-actions">
            <button
              type="button"
              onClick={handleSignOut}
              className="admin-user-profile"
              title="Frontend-only sign out"
            >
              <div className="admin-avatar">
                {displayName.charAt(0).toUpperCase() || 'A'}
              </div>
              <span>{displayName}</span>
              <i className="fas fa-chevron-down admin-user-chevron" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="admin-main-container">
          <aside className="admin-sidebar custom-scrollbar">
            <ul className="admin-nav-list">
              {visibleNavItems.map((item) => {
                const active = item.key === normalizedActiveNav;

                return (
                  <li key={item.key} className="admin-nav-item">
                    <a
                      href={item.href}
                      className={`admin-nav-link${active ? ' active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <i className={`${item.icon} admin-nav-icon`} aria-hidden="true" />
                      <span>{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>

            <QuickPanel quickPanel={quickPanel} />
          </aside>

          <main className="admin-content custom-scrollbar">
            <div className="admin-page-header">
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
              {headerAction ? <div className="admin-page-actions">{headerAction}</div> : null}
            </div>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}