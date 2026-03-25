import { clearFrontendSession, getStoredName, getStoredRole } from '../utils/authSession';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin/dashboard', icon: 'fas fa-home' },
  { key: 'products', label: 'Products', href: '/admin/products', icon: 'fas fa-box' },
  { key: 'orders', label: 'Orders', href: '/admin/orders', icon: 'fas fa-shopping-cart' },
  { key: 'deliveries', label: 'Deliveries', href: '/admin/deliveries', icon: 'fas fa-truck' },
  { key: 'robots', label: 'Robots', href: '/admin/robots', icon: 'fas fa-robot' },
  { key: 'revenue', label: 'Revenue', href: '/admin/revenue', icon: 'fas fa-chart-line' },
  { key: 'invite-codes', label: 'Invite Codes', href: '/admin/invite-codes', icon: 'fas fa-ticket-alt', managerOnly: true },
];

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
  topSearchPlaceholder = 'Search...',
}) {
  const storedName = getStoredName();
  const displayName = storedName || 'Admin User';
  const isEmployee = getStoredRole() === 'employee';
  const visibleNavItems = isEmployee
    ? NAV_ITEMS.filter(item => item.key !== 'revenue' && !item.managerOnly)
    : NAV_ITEMS;

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

          <div className="admin-top-search">
            <i className="fas fa-search admin-top-search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder={topSearchPlaceholder}
              className="admin-top-search-input"
            />
          </div>

          <div className="admin-top-actions">
            <button type="button" className="admin-notification" aria-label="Notifications">
              <i className="far fa-bell" aria-hidden="true" />
              <span className="admin-notification-badge" />
            </button>

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
                const active = item.key === activeNav;

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
