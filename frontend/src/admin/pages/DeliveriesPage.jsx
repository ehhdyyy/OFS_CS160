import AdminShell from '../AdminShell';
import { SummaryCard, Pagination } from '../components/AdminCommon';
import { DELIVERY_ROWS } from '../data/adminData';

export default function DeliveriesPage() {
  return (
    <AdminShell
      activeNav="deliveries"
      title="Delivery History"
      description="Track past and current deliveries, robot assignments, and route performance."
      topSearchPlaceholder="Search..."
      quickPanel={{
        title: 'Quick Filters',
        items: [
          {
            label: 'Active Routes',
            value: '12',
            badgeClassName: 'bg-blue-100 text-blue-700',
            hoverClassName: 'hover:text-gray-900 cursor-pointer',
          },
          {
            label: 'Delayed Reports',
            value: '2',
            badgeClassName: 'bg-orange-100 text-orange-700',
            hoverClassName: 'hover:text-gray-900 cursor-pointer',
          },
        ],
      }}
      headerAction={
        <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm" type="button">
          <i className="fas fa-download" /> Export Log
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <SummaryCard iconWrapClass="bg-indigo-50 text-indigo-500" iconClass="fas fa-route" label="Total Deliveries (30d)" value="3,492" />
        <SummaryCard iconWrapClass="bg-green-50 text-green-500" iconClass="fas fa-stopwatch" label="Avg. Delivery Time" value={<><span>18</span> <span className="text-sm font-medium text-gray-500">mins</span></>} />
        <SummaryCard iconWrapClass="bg-blue-50 text-blue-500" iconClass="fas fa-check-circle" label="Success Rate" value="99.4%" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
          <div className="flex gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative w-full sm:w-64">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input type="text" placeholder="Search Delivery or Order ID..." className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
            </div>
            <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer">
              <option>All Statuses</option>
              <option>Delivered</option>
              <option>In Transit</option>
              <option>Delayed</option>
              <option>Failed/Canceled</option>
            </select>
            <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer hidden md:block">
              <option>Last 7 Days</option>
              <option>Today</option>
              <option>Last 30 Days</option>
              <option>All Time</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              <i className="fas fa-sort-amount-down text-xs" /> Sort
            </button>
          </div>
        </div>

        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Details</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer &amp; Location</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Robot Assigned</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeline</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {DELIVERY_ROWS.map((delivery) => (
                <tr key={delivery.id} className={`hover:bg-gray-50 transition-colors ${delivery.rowClass}`.trim()}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 text-sm">{delivery.id}</div>
                    <div className="text-xs text-gray-500">Order: {delivery.orderId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{delivery.customer}</div>
                    <div className="text-xs text-gray-500">{delivery.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${delivery.robotTone}`}>
                        <i className="fas fa-robot" />
                      </div>
                      <span className={`text-sm font-medium ${delivery.robotLabelClass || 'text-gray-700'}`}>{delivery.robot}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{delivery.timelinePrimary}</div>
                    <div className={`text-xs ${delivery.timelineSecondaryClass}`}>{delivery.timelineSecondary}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${delivery.statusClass}`}>
                      {delivery.statusIcon ? <i className={`${delivery.statusIcon} mr-1.5 mt-0.5`} /> : null}
                      {delivery.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button type="button" className={`border px-3 py-1 rounded ${delivery.actionClass}`}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination summaryText={<><span>Showing </span><span className="font-medium">1</span><span> to </span><span className="font-medium">6</span><span> of </span><span className="font-medium">3,492</span><span> results</span></>} pages={[1, 2, 3, 'ellipsis']} currentPage={1} trailingLabel="349" />
      </div>
    </AdminShell>
  );
}
