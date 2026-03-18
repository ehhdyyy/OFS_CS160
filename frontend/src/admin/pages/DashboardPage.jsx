import AdminShell from '../AdminShell';
import { DASHBOARD_ACTIVITY, DASHBOARD_STATS } from '../data/adminData';

function TrendIndicator({ stat }) {
  if (stat.trendType === 'neutral') {
    return <div className="dashboard-stat-trend dashboard-trend-neutral">{stat.trend}</div>;
  }

  const toneClass = stat.trendType === 'accent' ? 'dashboard-trend-accent' : 'dashboard-trend-up';

  return (
    <div className={`dashboard-stat-trend ${toneClass}`}>
      <i className="fas fa-caret-up" aria-hidden="true" />
      <span>{stat.trend}</span>
    </div>
  );
}

function DashboardStatCard({ stat }) {
  return (
    <article className={`dashboard-stat-card dashboard-card-${stat.tone}`}>
      <div className="dashboard-stat-header">
        <div>
          <div className="dashboard-stat-title">{stat.title}</div>
          <div className="dashboard-stat-value">{stat.value}</div>
        </div>
        <div className={`dashboard-stat-icon dashboard-icon-${stat.tone}`}>
          <i className={stat.iconClass} aria-hidden="true" />
        </div>
      </div>

      <TrendIndicator stat={stat} />

      <div className="dashboard-stat-progress" aria-hidden="true">
        <div className={`dashboard-stat-progress-bar dashboard-progress-${stat.tone}`} />
      </div>
    </article>
  );
}

function DashboardActivityItem({ item }) {
  return (
    <div className="dashboard-activity-item">
      <div className={`dashboard-activity-icon dashboard-activity-${item.tone}`}>
        <i className={item.iconClass} aria-hidden="true" />
      </div>
      <div className="dashboard-activity-content">
        <div className="dashboard-activity-title">{item.title}</div>
        <div className="dashboard-activity-desc">{item.description}</div>
        <div className="dashboard-activity-time">{item.time}</div>
      </div>
    </div>
  );
}

function DashboardRevenueChart() {
  return (
    <div className="dashboard-chart-container" aria-label="Revenue overview chart">
      <svg className="dashboard-chart-svg" viewBox="0 0 600 250" preserveAspectRatio="xMidYMid meet" role="img">
        <line x1="40" y1="20" x2="600" y2="20" stroke="#f1f5f9" strokeWidth="1" />
        <line x1="40" y1="70" x2="600" y2="70" stroke="#f1f5f9" strokeWidth="1" />
        <line x1="40" y1="120" x2="600" y2="120" stroke="#f1f5f9" strokeWidth="1" />
        <line x1="40" y1="170" x2="600" y2="170" stroke="#f1f5f9" strokeWidth="1" />
        <line x1="40" y1="220" x2="600" y2="220" stroke="#e2e8f0" strokeWidth="1" />

        <text x="30" y="24" fill="#94a3b8" fontSize="10" textAnchor="end">2,500</text>
        <text x="30" y="74" fill="#94a3b8" fontSize="10" textAnchor="end">2,000</text>
        <text x="30" y="124" fill="#94a3b8" fontSize="10" textAnchor="end">1,500</text>
        <text x="30" y="174" fill="#94a3b8" fontSize="10" textAnchor="end">1,000</text>
        <text x="30" y="224" fill="#94a3b8" fontSize="10" textAnchor="end">500</text>
        <text x="30" y="240" fill="#94a3b8" fontSize="10" textAnchor="end">0</text>

        <text x="60" y="240" fill="#94a3b8" fontSize="10" textAnchor="middle">Mon</text>
        <text x="140" y="240" fill="#94a3b8" fontSize="10" textAnchor="middle">Tue</text>
        <text x="220" y="240" fill="#94a3b8" fontSize="10" textAnchor="middle">Wed</text>
        <text x="310" y="240" fill="#94a3b8" fontSize="10" textAnchor="middle">Thu</text>
        <text x="400" y="240" fill="#94a3b8" fontSize="10" textAnchor="middle">Fri</text>
        <text x="480" y="240" fill="#94a3b8" fontSize="10" textAnchor="middle">Sat</text>
        <text x="560" y="240" fill="#94a3b8" fontSize="10" textAnchor="middle">Sun</text>

        <path
          d="M 60 180 C 100 130, 110 110, 140 120 C 180 130, 190 150, 220 145 C 260 135, 280 80, 310 90 C 350 100, 360 120, 400 115 C 440 110, 450 70, 480 80 C 520 90, 560 100, 600 110 L 600 220 L 60 220 Z"
          fill="rgba(59, 130, 246, 0.22)"
        />

        <path
          d="M 60 180 C 100 130, 110 110, 140 120 C 180 130, 190 150, 220 145 C 260 135, 280 80, 310 90 C 350 100, 360 120, 400 115 C 440 110, 450 70, 480 80 C 520 90, 560 100, 600 110"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx="60" cy="180" r="3.5" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
        <circle cx="140" cy="120" r="3.5" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
        <circle cx="220" cy="145" r="3.5" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
        <circle cx="310" cy="90" r="3.5" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
        <circle cx="400" cy="115" r="3.5" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
        <circle cx="480" cy="80" r="3.5" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AdminShell
      activeNav="dashboard"
      title="Dashboard Overview"
      description="System metrics and recent activity"
      topSearchPlaceholder="Search..."
      quickPanel={{
        title: 'Quick Filters',
        items: [
          {
            label: 'Active Robots',
            value: '12',
            badgeClassName: 'bg-green-100 text-green-700',
          },
          {
            label: 'Pending Deliveries',
            value: '5',
            badgeClassName: 'bg-orange-100 text-orange-700',
          },
        ],
      }}
    >
      <section className="dashboard-stats-grid">
        {DASHBOARD_STATS.map((stat) => (
          <DashboardStatCard key={stat.key} stat={stat} />
        ))}
      </section>

      <section className="dashboard-bottom-grid">
        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3 className="dashboard-panel-title">Revenue Overview</h3>
            <div className="dashboard-time-toggle" role="group" aria-label="Revenue time range">
              <button type="button">7D</button>
              <button type="button" className="active">30D</button>
              <button type="button">90D</button>
            </div>
          </div>
          <DashboardRevenueChart />
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3 className="dashboard-panel-title">Recent Activity</h3>
          </div>
          <div className="dashboard-activity-list">
            {DASHBOARD_ACTIVITY.map((item) => (
              <DashboardActivityItem key={item.title} item={item} />
            ))}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
