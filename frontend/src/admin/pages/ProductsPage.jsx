import AdminShell from '../AdminShell';
import { SummaryCard, Pagination } from '../components/AdminCommon';
import { INVENTORY_ITEMS } from '../data/adminData';

export default function ProductsPage() {
  return (
    <AdminShell
      activeNav="products"
      title="Product Inventory"
      description="Manage organic food stock, track sales performance, and monitor inventory levels."
      topSearchPlaceholder="Search..."
      quickPanel={{
        title: 'Quick Filters',
        items: [
          {
            label: 'Low Stock Alerts',
            value: '4',
            badgeClassName: 'bg-red-100 text-red-700',
            hoverClassName: 'hover:text-gray-900 cursor-pointer',
          },
          {
            label: 'Active Promotions',
            value: '4',
            badgeClassName: 'bg-blue-100 text-blue-700',
            hoverClassName: 'hover:text-gray-900 cursor-pointer',
          },
        ],
      }}
      headerAction={
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm" type="button">
          <i className="fas fa-plus" /> Add Product
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <SummaryCard iconWrapClass="bg-blue-50 text-blue-500" iconClass="fas fa-boxes" label="Total Products" value="142" />
        <SummaryCard iconWrapClass="bg-red-50 text-red-500" iconClass="fas fa-exclamation-triangle" label="Low Stock Items" value="4" />
        <SummaryCard iconWrapClass="bg-green-50 text-green-500" iconClass="fas fa-chart-bar" label="Items Sold (30d)" value="4,892" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
          <div className="flex gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative w-full sm:w-64">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input type="text" placeholder="Search products..." className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
            </div>
            <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer">
              <option>All Categories</option>
              <option>Produce</option>
              <option>Dairy &amp; Eggs</option>
              <option>Meat &amp; Poultry</option>
              <option>Bakery</option>
              <option>Pantry</option>
            </select>
          </div>
          <button type="button" className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
            <i className="fas fa-filter text-xs" /> More Filters
          </button>
        </div>

        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Level</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sold</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {INVENTORY_ITEMS.map((item) => (
                <tr key={item.sku} className={`hover:bg-gray-50 transition-colors ${item.rowClass}`.trim()}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.iconWrapClass}`}>
                        <i className={item.iconClass} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {item.price} <span className="text-gray-500 text-xs font-normal">{item.unit}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm w-8 ${item.stock === 0 ? 'font-bold text-red-600' : item.stock <= 15 ? 'font-bold text-orange-600' : 'font-medium text-gray-900'}`}>
                        {item.stock}
                      </span>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.progressClass}`} style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.totalSold}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${item.statusClass}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button type="button" className="text-blue-600 hover:text-blue-900 mr-3">
                      <i className="fas fa-edit" />
                    </button>
                    <button type="button" className="text-gray-400 hover:text-red-600">
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination summaryText={<><span className="font-medium">Showing 1 to 11 of 142 results</span></>} pages={[1, 2]} currentPage={1} trailingLabel="3" />
      </div>
    </AdminShell>
  );
}
