import AdminShell from '../AdminShell';
import { SummaryCard, Pagination, RobotStatusBadge } from '../components/AdminCommon';
import { ROBOT_ROWS } from '../data/adminData';

export default function RobotsPage() {
  return (
    <AdminShell
      activeNav="robots"
      title="Fleet Management"
      description="Monitor robot locations, battery health, and current delivery duties."
      topSearchPlaceholder="Search..."
      quickPanel={{
        title: 'Quick Filters',
        items: [
          {
            label: 'Low Battery (<20%)',
            value: '2',
            badgeClassName: 'bg-orange-100 text-orange-700',
            hoverClassName: 'hover:text-gray-900 cursor-pointer',
          },
          {
            label: 'Needs Maintenance',
            value: '1',
            badgeClassName: 'bg-red-100 text-red-700',
            hoverClassName: 'hover:text-gray-900 cursor-pointer',
          },
        ],
      }}
      headerAction={
        <>
          <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm" type="button">
            <i className="fas fa-map-marked-alt" /> Fleet Map
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm" type="button">
            <i className="fas fa-plus" /> Register Robot
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard iconWrapClass="bg-gray-100 text-gray-600" iconClass="fas fa-robot" label="Total Fleet" value="25" />
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-lg">
            <div className="w-3 h-3 bg-blue-500 rounded-full status-pulse" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">On Duty</p>
            <p className="text-xl font-bold text-gray-900">14</p>
          </div>
        </div>
        <SummaryCard iconWrapClass="bg-purple-50 text-purple-500" iconClass="fas fa-bolt" label="Charging" value="6" />
        <SummaryCard iconWrapClass="bg-green-50 text-green-500" iconClass="fas fa-parking" label="Idle / Ready" value="4" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
          <div className="flex gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative w-full sm:w-64">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input type="text" placeholder="Search Robot ID..." className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
            </div>
            <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer">
              <option>All Statuses</option>
              <option>On Duty</option>
              <option>Idle</option>
              <option>Charging</option>
              <option>Maintenance</option>
            </select>
          </div>
          <button type="button" className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
            <i className="fas fa-filter text-xs" /> Filter by Hub
          </button>
        </div>

        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Robot ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status &amp; Duty</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Battery Life</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Location</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Delivery</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {ROBOT_ROWS.map((row) => (
                <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${row.rowClass}`.trim()}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${row.iconWrapClass}`}>
                        <i className={row.iconClass} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{row.id}</div>
                        <div className="text-xs text-gray-500">{row.model}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RobotStatusBadge row={row} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <i className={`${row.batteryIcon} text-lg w-5`} />
                      <div className="flex-1 w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${row.batteryBarClass}`} style={{ width: `${row.batteryPercent}%` }} />
                      </div>
                      <span className={`text-xs w-8 text-right ${row.batteryLabelClass}`}>{row.batteryPercent}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 truncate w-48" title={row.locationPrimary}>{row.locationPrimary}</div>
                    <div className={`text-xs ${row.locationSecondaryClass}`}>{row.locationSecondary}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.deliveryClass ? (
                      <span className={row.deliveryClass}>{row.delivery}</span>
                    ) : (
                      <div className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer">{row.delivery}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {row.actions.map((action) => (
                        <button
                          key={`${row.id}-${action.title}`}
                          type="button"
                          className={`text-gray-500 p-1.5 rounded transition-colors ${action.hoverClass}`}
                          title={action.title}
                        >
                          <i className={action.icon} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination summaryText={<><span>Showing </span><span className="font-medium">1</span><span> to </span><span className="font-medium">6</span><span> of </span><span className="font-medium">25</span><span> robots</span></>} pages={[1, 2, 3, 4]} currentPage={1} trailingLabel="5" />
      </div>
    </AdminShell>
  );
}
