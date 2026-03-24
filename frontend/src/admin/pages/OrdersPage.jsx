import { useEffect, useState } from 'react';
import AdminShell from '../AdminShell';

const API_BASE = 'http://localhost:8000';

const EMPTY_DATA = {
  quick_panel: [],
  cards: [],
  map_points: [],
};

function MapPoint({ point, index }) {
  const colorClass =
    point.color === 'green'
      ? 'bg-green-500'
      : point.color === 'orange'
        ? 'bg-orange-500'
        : 'bg-blue-500';

  const positions = [
    'top-1/3 left-1/2',
    'top-2/3 left-1/4',
    'top-1/4 left-3/4',
    'top-3/4 left-2/3',
  ];

  const positionClass = positions[index % positions.length];

  return (
    <div className={`absolute ${positionClass} -translate-x-1/2 -translate-y-1/2 cursor-pointer group`}>
      {point.color === 'blue' ? <div className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-75" /> : null}
      <div className={`relative w-4 h-4 rounded-full border-2 border-white shadow-md ${colorClass}`} />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {point.robotLabel} • {point.orderId}
        <div className="text-[11px] text-gray-300 mt-0.5">{point.statusLabel}</div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Status');

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const params = new URLSearchParams();
        if (search.trim()) {
          params.set('search', search.trim());
        }
        if (status !== 'All Status') {
          params.set('status', status);
        }

        const response = await fetch(`${API_BASE}/api/admin/orders?${params.toString()}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.detail || 'Failed to load orders');
        }

        const payload = await response.json();
        if (isMounted) {
          setData({
            quick_panel: payload.quick_panel || [],
            cards: payload.cards || [],
            map_points: payload.map_points || [],
          });
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Failed to load orders');
          setData(EMPTY_DATA);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();
    return () => {
      isMounted = false;
    };
  }, [search, status]);

  return (
    <AdminShell
      activeNav="orders"
      title="Orders & Deliveries"
      description="Manage recent orders and track active robotic deliveries."
      topSearchPlaceholder="Search..."
      quickPanel={{
        title: 'Quick Filters',
        items: data.quick_panel,
      }}
    >
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-shrink-0 flex-grow-0 h-full">
          <div className="p-4 border-b border-gray-100 shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
              <button type="button" className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-ellipsis-v" />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ID or name..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option>All Status</option>
                <option>In Transit</option>
                <option>Delivered</option>
                <option>Preparing</option>
              </select>
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
            {isLoading ? (
              <div className="p-4 text-sm text-gray-500">Loading orders...</div>
            ) : data.cards.length ? (
              data.cards.map((order) => (
                <div
                  key={order.id}
                  className={[
                    'p-3 mb-2 rounded-lg border cursor-pointer transition-colors relative',
                    order.active
                      ? 'bg-blue-50 border-blue-100'
                      : 'hover:bg-gray-50 border-transparent hover:border-gray-100',
                  ].join(' ')}
                >
                  {order.active ? <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg" /> : null}
                  <div className={order.active ? 'pl-2' : ''}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-gray-900 text-sm">{order.id}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.statusClass}`}>{order.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{order.detail}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500 gap-3">
                      <span className="truncate">{order.metaLeft}</span>
                      <span>{order.metaRight}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-gray-500">No orders match the current filters.</div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full min-h-[520px]">
          <div className="p-4 border-b border-gray-100 shrink-0 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Live Delivery Map</h2>
            <div className="flex gap-4 text-xs font-medium text-gray-500">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full border border-white shadow-sm" /> In Transit</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded-full border border-white shadow-sm" /> Delivered</div>
            </div>
          </div>

          <div className="flex-1 relative bg-[#e5e7eb] rounded-b-xl overflow-hidden m-1">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="absolute top-1/4 left-0 w-full h-2 bg-white opacity-40 rotate-12" />
            <div className="absolute top-1/2 left-0 w-full h-3 bg-white opacity-40 -rotate-6" />
            <div className="absolute left-1/3 top-0 w-2 h-full bg-white opacity-40" />
            <div className="absolute left-2/3 top-0 w-4 h-full bg-white opacity-40 rotate-3" />

            <div className="absolute right-4 top-4 flex flex-col gap-2">
              <button type="button" className="w-8 h-8 bg-white rounded shadow text-gray-600 hover:text-gray-900 flex items-center justify-center"><i className="fas fa-plus text-xs" /></button>
              <button type="button" className="w-8 h-8 bg-white rounded shadow text-gray-600 hover:text-gray-900 flex items-center justify-center"><i className="fas fa-minus text-xs" /></button>
            </div>

            {data.map_points.length ? (
              data.map_points.map((point, index) => <MapPoint key={`${point.orderId}-${index}`} point={point} index={index} />)
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                No active order markers to display.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
