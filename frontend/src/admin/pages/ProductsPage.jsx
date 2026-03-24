import { useEffect, useMemo, useState } from 'react';
import AdminShell from '../AdminShell';
import { SummaryCard, Pagination } from '../components/AdminCommon';

const API_BASE = 'http://localhost:8000';

const EMPTY_DATA = {
  summary: {
    total_products: '0',
    low_stock_items: '0',
    items_sold_30d: '0',
  },
  quick_panel: [],
  categories: [],
  items: [],
};

function getCategoryIcon(item) {
  const category = String(item.category || '').toLowerCase();

  if (category.includes('fruit') || category.includes('vegetable') || category.includes('produce')) {
    return { iconClass: 'fas fa-leaf', iconWrapClass: 'bg-green-100 text-green-600' };
  }
  if (category.includes('dairy')) {
    return { iconClass: 'fas fa-cheese', iconWrapClass: 'bg-blue-100 text-blue-600' };
  }
  if (category.includes('meat')) {
    return { iconClass: 'fas fa-drumstick-bite', iconWrapClass: 'bg-red-100 text-red-600' };
  }
  if (category.includes('bakery')) {
    return { iconClass: 'fas fa-bread-slice', iconWrapClass: 'bg-amber-100 text-amber-700' };
  }
  if (category.includes('pantry')) {
    return { iconClass: 'fas fa-box-open', iconWrapClass: 'bg-yellow-100 text-yellow-700' };
  }
  if (category.includes('beverage')) {
    return { iconClass: 'fas fa-bottle-water', iconWrapClass: 'bg-cyan-100 text-cyan-700' };
  }

  return { iconClass: 'fas fa-box', iconWrapClass: 'bg-gray-100 text-gray-600' };
}

export default function ProductsPage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const params = new URLSearchParams();
        if (search.trim()) {
          params.set('search', search.trim());
        }
        if (selectedCategory !== 'All Categories') {
          params.set('category', selectedCategory);
        }

        const response = await fetch(`${API_BASE}/api/admin/products?${params.toString()}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.detail || 'Failed to load products');
        }

        const payload = await response.json();
        if (isMounted) {
          setData({
            summary: payload.summary || EMPTY_DATA.summary,
            quick_panel: payload.quick_panel || [],
            categories: payload.categories || [],
            items: payload.items || [],
          });
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Failed to load products');
          setData(EMPTY_DATA);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [search, selectedCategory]);

  const categoryOptions = useMemo(
    () => ['All Categories', ...data.categories],
    [data.categories],
  );

  return (
    <AdminShell
      activeNav="products"
      title="Product Inventory"
      description="Manage organic food stock, track sales performance, and monitor inventory levels."
      topSearchPlaceholder="Search..."
      quickPanel={{
        title: 'Quick Filters',
        items: data.quick_panel,
      }}
      headerAction={
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm" type="button">
          <i className="fas fa-plus" /> Add Product
        </button>
      }
    >
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <SummaryCard iconWrapClass="bg-blue-50 text-blue-500" iconClass="fas fa-boxes" label="Total Products" value={data.summary.total_products} />
        <SummaryCard iconWrapClass="bg-red-50 text-red-500" iconClass="fas fa-exclamation-triangle" label="Low Stock Items" value={data.summary.low_stock_items} />
        <SummaryCard iconWrapClass="bg-green-50 text-green-500" iconClass="fas fa-chart-bar" label="Items Sold" value={data.summary.items_sold_30d} />
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
                placeholder="Search products..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
            >
              {categoryOptions.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <button type="button" className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
            <i className="fas fa-filter text-xs" /> Live Inventory
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
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-sm text-gray-500">
                    Loading inventory...
                  </td>
                </tr>
              ) : data.items.length ? (
                data.items.map((item) => {
                  const icon = getCategoryIcon(item);

                  return (
                    <tr key={item.sku} className={`hover:bg-gray-50 transition-colors ${item.rowClass}`.trim()}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${icon.iconWrapClass}`}>
                            <i className={icon.iconClass} />
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-sm text-gray-500">
                    No products match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          summaryText={<><span className="font-medium">Showing 1 to {data.items.length} of {data.items.length} results</span></>}
          pages={[1]}
          currentPage={1}
        />
      </div>
    </AdminShell>
  );
}
