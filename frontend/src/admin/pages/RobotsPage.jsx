import { useEffect, useState } from 'react';
import AdminShell from '../AdminShell';
import { SummaryCard, Pagination } from '../components/AdminCommon';

const API_BASE = 'http://localhost:8000';

const EMPTY_DATA = {
  summary: {
    total: 0,
    working: 0,
    charging: 0,
    offline: 0,
  },
  items: [],
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Working', label: 'Working' },
  { value: 'Charging', label: 'Charging' },
  { value: 'Offline', label: 'Offline' },
];

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusPresentation(status) {
  if (status === 'Working') {
    return {
      badgeClass: 'text-blue-700 bg-blue-100 border-blue-200',
      iconWrapClass: 'bg-blue-50 text-blue-500',
      icon: <div className="w-2.5 h-2.5 bg-blue-500 rounded-full status-pulse" />,
    };
  }

  if (status === 'Charging') {
    return {
      badgeClass: 'text-purple-700 bg-purple-100 border-purple-200',
      iconWrapClass: 'bg-purple-50 text-purple-500',
      icon: <i className="fas fa-bolt" />,
    };
  }

  return {
    badgeClass: 'text-gray-700 bg-gray-100 border-gray-200',
    iconWrapClass: 'bg-gray-100 text-gray-500',
    icon: <i className="fas fa-power-off" />,
  };
}

export default function RobotsPage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadRobots();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search, statusFilter]);

  async function loadRobots() {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set('search', search.trim());
      }

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`${API_BASE}/api/admin/robots?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to load robots');
      }

      const payload = await response.json();
      setData({
        summary: payload.summary || EMPTY_DATA.summary,
        items: payload.items || [],
      });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load robots');
      setData(EMPTY_DATA);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminShell
      activeNav="robots"
      title="Robots"
      description="Monitor the live fleet used for deliveries this week."
      topSearchPlaceholder="Search robots..."
      quickPanel={{ title: 'Overview', items: [] }}
    >
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          iconWrapClass="bg-gray-100 text-gray-600"
          iconClass="fas fa-robot"
          label="Total Fleet"
          value={data.summary.total}
        />

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-lg">
            <div className="w-3 h-3 bg-blue-500 rounded-full status-pulse" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Working</p>
            <p className="text-xl font-bold text-gray-900">{data.summary.working}</p>
          </div>
        </div>

        <SummaryCard
          iconWrapClass="bg-purple-50 text-purple-500"
          iconClass="fas fa-bolt"
          label="Charging"
          value={data.summary.charging}
        />

        <SummaryCard
          iconWrapClass="bg-gray-100 text-gray-500"
          iconClass="fas fa-power-off"
          label="Offline"
          value={data.summary.offline}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
          <div className="flex gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative w-full sm:w-64">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Robot ID..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Robot ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Delivery</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders on Route</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Started</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
                    Loading robots...
                  </td>
                </tr>
              ) : data.items.length ? (
                data.items.map((robot) => {
                  const status = getStatusPresentation(robot.status);

                  return (
                    <tr key={robot.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${status.iconWrapClass}`}>
                            <i className="fas fa-robot" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{robot.robot_id}</div>
                            <div className="text-xs text-gray-500">Fleet Unit #{robot.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border ${status.badgeClass}`}>
                          {status.icon}
                          {robot.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {robot.active_delivery_id ? `Delivery #${String(robot.active_delivery_id).padStart(3, '0')}` : '—'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {robot.active_delivery_id ? robot.active_order_count : '—'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {robot.active_delivery_id ? formatDateTime(robot.started_at) : '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
                    No robots match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          summaryText={
            <>
              <span>Showing </span>
              <span className="font-medium">{data.items.length ? 1 : 0}</span>
              <span> to </span>
              <span className="font-medium">{data.items.length}</span>
              <span> of </span>
              <span className="font-medium">{data.items.length}</span>
              <span> robots</span>
            </>
          }
          pages={[1]}
          currentPage={1}
        />
      </div>
    </AdminShell>
  );
}