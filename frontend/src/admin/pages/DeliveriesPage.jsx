import { useEffect, useState } from 'react';
import AdminShell from '../AdminShell';
import { SummaryCard, Pagination } from '../components/AdminCommon';

const API_BASE = 'http://localhost:8000';

const EMPTY_DATA = {
  summary: {
    total: 0,
    in_transit: 0,
    delivered: 0,
    failed: 0,
  },
  items: [],
};

const DAY_FILTER_OPTIONS = [
  { value: '7', label: 'Last 7 Days' },
  { value: '14', label: 'Last 14 Days' },
  { value: '30', label: 'Last 30 Days' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'In Transit', label: 'In Transit' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Failed', label: 'Failed' },
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

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

export default function DeliveriesPage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState('7');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadDeliveries();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search, statusFilter, daysFilter]);

  async function loadDeliveries() {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const params = new URLSearchParams();
      params.set('days', daysFilter);

      if (search.trim()) {
        params.set('search', search.trim());
      }

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`${API_BASE}/api/admin/deliveries?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to load deliveries');
      }

      const payload = await response.json();
      setData({
        summary: payload.summary || EMPTY_DATA.summary,
        items: payload.items || [],
      });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load deliveries');
      setData(EMPTY_DATA);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminShell
      activeNav="deliveries"
      title="Deliveries"
      description="Track current and recent deliveries, robot assignments, and weekly route activity."
      quickPanel={{ title: 'Overview', items: [] }}
    >
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <SummaryCard
          iconWrapClass="bg-indigo-50 text-indigo-500"
          iconClass="fas fa-route"
          label={`Total Deliveries (${daysFilter}d)`}
          value={data.summary.total}
        />
        <SummaryCard
          iconWrapClass="bg-blue-50 text-blue-500"
          iconClass="fas fa-truck"
          label="In Transit"
          value={data.summary.in_transit}
        />
        <SummaryCard
          iconWrapClass="bg-green-50 text-green-500"
          iconClass="fas fa-check-circle"
          label="Delivered"
          value={data.summary.delivered}
        />
        <SummaryCard
          iconWrapClass="bg-red-50 text-red-500"
          iconClass="fas fa-times-circle"
          label="Failed"
          value={data.summary.failed}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
          <div className="flex gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative w-full sm:w-72">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search delivery, order, customer, or address..."
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

            <select
              value={daysFilter}
              onChange={(event) => setDaysFilter(event.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
            >
              {DAY_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Details</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customers &amp; Route</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Robot Assigned</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeline</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Load &amp; Revenue</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-sm text-gray-500">
                    Loading deliveries...
                  </td>
                </tr>
              ) : data.items.length ? (
                data.items.map((delivery) => (
                  <tr key={delivery.delivery_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-gray-900 text-sm">{delivery.id}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Orders:{' '}
                        {delivery.order_ids?.length
                          ? delivery.order_ids.map((orderId) => `#${orderId}`).join(', ')
                          : '—'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {delivery.order_count} order{delivery.order_count === 1 ? '' : 's'}
                      </div>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="text-sm text-gray-900">
                        {delivery.customer_names?.length
                          ? delivery.customer_names.join(', ')
                          : 'Unknown customer'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 space-y-1">
                        {delivery.addresses?.length ? (
                          delivery.addresses.map((address, index) => (
                            <div key={`${delivery.delivery_id}-address-${index}`}>{address}</div>
                          ))
                        ) : (
                          <div>—</div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 bg-blue-50 text-blue-600">
                          <i className="fas fa-robot" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{delivery.robot_label}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="text-sm text-gray-900">{formatDateTime(delivery.started_at)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {delivery.completed_at ? `Completed ${formatDateTime(delivery.completed_at)}` : 'Still active'}
                      </div>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="text-sm font-medium text-gray-900">
                        {Number(delivery.total_weight_lbs || 0).toFixed(2)} lbs
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatCurrency(delivery.revenue)}
                      </div>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${delivery.statusClass}`}>
                        {delivery.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-sm text-gray-500">
                    No deliveries match the current filters.
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
              <span> deliveries</span>
            </>
          }
          pages={[1]}
          currentPage={1}
        />
      </div>
    </AdminShell>
  );
}