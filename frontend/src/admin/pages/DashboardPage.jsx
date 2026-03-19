import { useEffect, useState } from 'react';
import AdminShell from '../AdminShell';

const API_BASE = 'http://localhost:8000';

const EMPTY_DATA = {
  quick_panel: [],
  stats: [],
  activity: [],
  revenue_chart: {
    labels: [],
    values: [],
  },
};

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

function buildChartPoints(values) {
  if (!values.length) {
    return [];
  }

  const max = Math.max(...values, 1);
  const width = 540;
  const height = 160;

  return values.map((value, index) => {
    const x = 60 + (values.length === 1 ? width / 2 : (index * width) / (values.length - 1));
    const y = 220 - (value / max) * height;
    return { x, y, value };
  });
}

function DashboardRevenueChart({ labels, values }) {
  const points = buildChartPoints(values);

  if (!points.length) {
    return (
      <div className="dashboard-chart-container flex items-center justify-center text-sm text-gray-500">
        No revenue data yet.
      </div>
    );
  }

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} 220 L ${points[0].x} 220 Z`;

  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => {
    const max = Math.max(...values, 1);
    return {
      y: 220 - ratio * 160,
      value: Math.round(max * ratio),
    };
  });

  return (
    <div className="dashboard-chart-container" aria-label="Revenue overview chart">
      <svg className="dashboard-chart-svg" viewBox="0 0 600 250" preserveAspectRatio="xMidYMid meet" role="img">
        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line x1="40" y1={tick.y} x2="600" y2={tick.y} stroke={tick.value === 0 ? '#e2e8f0' : '#f1f5f9'} strokeWidth="1" />
            <text x="30" y={tick.y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">
              {tick.value}
            </text>
          </g>
        ))}

        {labels.map((label, index) => (
          <text key={`${label}-${index}`} x={points[index].x} y="240" fill="#94a3b8" fontSize="10" textAnchor="middle">
            {label}
          </text>
        ))}

        <path d={areaPath} fill="rgba(59, 130, 246, 0.22)" />
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((point) => (
          <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="3.5" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
        ))}
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await fetch(`${API_BASE}/api/admin/dashboard`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.detail || 'Failed to load dashboard');
        }

        const payload = await response.json();
        if (isMounted) {
          setDashboard({
            quick_panel: payload.quick_panel || [],
            stats: payload.stats || [],
            activity: payload.activity || [],
            revenue_chart: payload.revenue_chart || EMPTY_DATA.revenue_chart,
          });
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Failed to load dashboard');
          setDashboard(EMPTY_DATA);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AdminShell
      activeNav="dashboard"
      title="Dashboard Overview"
      description="System metrics and recent activity"
      topSearchPlaceholder="Search..."
      quickPanel={{
        title: 'Quick Filters',
        items: dashboard.quick_panel,
      }}
    >
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="dashboard-stats-grid">
        {(isLoading ? [] : dashboard.stats).map((stat) => (
          <DashboardStatCard key={stat.key} stat={stat} />
        ))}
      </section>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500 shadow-sm">
          Loading dashboard data...
        </div>
      ) : (
        <section className="dashboard-bottom-grid">
          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h3 className="dashboard-panel-title">Revenue Overview</h3>
              <div className="dashboard-time-toggle" role="group" aria-label="Revenue time range">
                <button type="button" className="active">7D</button>
              </div>
            </div>
            <DashboardRevenueChart
              labels={dashboard.revenue_chart.labels || []}
              values={dashboard.revenue_chart.values || []}
            />
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h3 className="dashboard-panel-title">Recent Activity</h3>
            </div>
            <div className="dashboard-activity-list">
              {dashboard.activity.length ? (
                dashboard.activity.map((item, index) => (
                  <DashboardActivityItem key={`${item.title}-${index}`} item={item} />
                ))
              ) : (
                <div className="text-sm text-gray-500">No recent activity yet.</div>
              )}
            </div>
          </article>
        </section>
      )}
    </AdminShell>
  );
}
