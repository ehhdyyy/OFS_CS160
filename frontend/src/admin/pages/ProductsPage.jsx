import { useEffect, useMemo, useState } from 'react';
import AdminShell from '../AdminShell';
import { SummaryCard, Pagination } from '../components/AdminCommon';

const API_BASE = 'http://localhost:8000';

const LIMITS = {
  nameLength: 120,
  descriptionLength: 1000,
  price: 1000,
  costPrice: 1000,
  weightLbs: 500,
  stockQuantity: 10000,
  lowStockThreshold: 10000,
  imagePathLength: 255,
};

const EMPTY_DATA = {
  summary: {
    total_products: 0,
    low_stock_items: 0,
    items_sold: 0,
  },
  categories: [],
  items: [],
};

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  cost_price: '',
  weight_lbs: '',
  category: '',
  stock_quantity: '0',
  image_url: '',
  is_organic: false,
  low_stock_threshold: '10',
};

const EMPTY_STOCK_MODAL = {
  id: null,
  name: '',
  currentStock: 0,
  product: null,
};

function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

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

function getInventoryStatus(item) {
  const stock = Number(item.stock_quantity || 0);
  const threshold = Number(item.low_stock_threshold || 0);

  if (stock <= 0) {
    return {
      label: 'Out of Stock',
      statusClass: 'bg-red-100 text-red-800',
      rowClass: 'bg-red-50/20',
    };
  }

  if (stock <= threshold) {
    return {
      label: 'Low Stock',
      statusClass: 'bg-orange-100 text-orange-800',
      rowClass: 'bg-orange-50/30',
    };
  }

  return {
    label: 'In Stock',
    statusClass: 'bg-green-100 text-green-800',
    rowClass: '',
  };
}

function buildFormFromProduct(product) {
  if (!product) {
    return EMPTY_FORM;
  }

  return {
    name: product.name || '',
    description: product.description || '',
    price: String(product.price ?? ''),
    cost_price: String(product.cost_price ?? ''),
    weight_lbs: String(product.weight_lbs ?? ''),
    category: product.category || '',
    stock_quantity: String(product.stock_quantity ?? 0),
    image_url: product.image_url || '',
    is_organic: Boolean(product.is_organic),
    low_stock_threshold: String(product.low_stock_threshold ?? 10),
  };
}

function validateForm(form) {
  const trimmedName = form.name.trim();
  const trimmedDescription = form.description.trim();
  const trimmedCategory = form.category.trim();
  const trimmedImagePath = form.image_url.trim();

  if (!trimmedName) {
    return 'Product name is required.';
  }

  if (trimmedName.length > LIMITS.nameLength) {
    return `Product name must be ${LIMITS.nameLength} characters or less.`;
  }

  if (trimmedDescription.length > LIMITS.descriptionLength) {
    return `Description must be ${LIMITS.descriptionLength} characters or less.`;
  }

  if (!trimmedCategory) {
    return 'Category is required.';
  }

  const price = Number(form.price);
  const costPrice = Number(form.cost_price);
  const weight = Number(form.weight_lbs);
  const stockQuantity = Number(form.stock_quantity);
  const lowStockThreshold = Number(form.low_stock_threshold);

  if (!Number.isFinite(price) || price <= 0 || price > LIMITS.price) {
    return `Price must be greater than 0 and no more than ${formatCurrency(LIMITS.price)}.`;
  }

  if (!Number.isFinite(costPrice) || costPrice < 0 || costPrice > LIMITS.costPrice) {
    return `Cost price must be between 0 and ${formatCurrency(LIMITS.costPrice)}.`;
  }

  if (!Number.isFinite(weight) || weight <= 0 || weight > LIMITS.weightLbs) {
    return `Weight must be greater than 0 and no more than ${LIMITS.weightLbs} lbs.`;
  }

  if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > LIMITS.stockQuantity) {
    return `Stock quantity must be a whole number between 0 and ${formatCount(LIMITS.stockQuantity)}.`;
  }

  if (
    !Number.isInteger(lowStockThreshold) ||
    lowStockThreshold < 0 ||
    lowStockThreshold > LIMITS.lowStockThreshold
  ) {
    return `Low stock threshold must be a whole number between 0 and ${formatCount(LIMITS.lowStockThreshold)}.`;
  }

  if (trimmedImagePath) {
    if (!trimmedImagePath.startsWith('/')) {
      return 'File path must start with "/". Example: /products/apples.jpg';
    }

    if (trimmedImagePath.length > LIMITS.imagePathLength) {
      return `File path must be ${LIMITS.imagePathLength} characters or less.`;
    }
  }

  return '';
}

function buildRequestPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    price: Number(form.price),
    cost_price: Number(form.cost_price),
    weight_lbs: Number(form.weight_lbs),
    category: form.category.trim(),
    stock_quantity: Number(form.stock_quantity),
    image_url: form.image_url.trim() || null,
    is_organic: Boolean(form.is_organic),
    low_stock_threshold: Number(form.low_stock_threshold),
  };
}

function getAdjustedStock(currentStock, adjustmentType, adjustmentAmount) {
  const current = Number(currentStock || 0);
  const amount = Number(adjustmentAmount || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return current;
  }

  return adjustmentType === 'remove' ? current - amount : current + amount;
}

function validateStockAdjustment(currentStock, adjustmentType, adjustmentAmount) {
  const current = Number(currentStock || 0);
  const amount = Number(adjustmentAmount);

  if (!Number.isInteger(amount) || amount <= 0) {
    return 'Adjustment amount must be a whole number greater than 0.';
  }

  if (amount > LIMITS.stockQuantity) {
    return `Adjustment amount must be ${formatCount(LIMITS.stockQuantity)} or less.`;
  }

  if (adjustmentType === 'remove' && amount > current) {
    return 'You cannot remove more stock than is currently available.';
  }

  const nextStock = getAdjustedStock(current, adjustmentType, amount);

  if (nextStock < 0 || nextStock > LIMITS.stockQuantity) {
    return `Updated stock must stay between 0 and ${formatCount(LIMITS.stockQuantity)}.`;
  }

  return '';
}

function InventoryModal({
  isOpen,
  mode,
  form,
  onChange,
  onClose,
  onSubmit,
  isSaving,
  isLoading,
  errorMessage,
  categoryOptions,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
      <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {mode === 'edit' ? 'Edit Product' : 'Add Product'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Update shared inventory data used by both admin and customer views.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">Loading product details...</div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-5 px-6 py-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="inventory-name">
                  Product Name
                </label>
                <input
                  id="inventory-name"
                  type="text"
                  value={form.name}
                  maxLength={LIMITS.nameLength}
                  onChange={(event) => onChange('name', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="Organic Strawberries"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="inventory-description">
                  Description
                </label>
                <textarea
                  id="inventory-description"
                  rows="3"
                  value={form.description}
                  maxLength={LIMITS.descriptionLength}
                  onChange={(event) => onChange('description', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="Fresh seasonal produce delivered from local farms."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="inventory-price">
                  Price
                </label>
                <input
                  id="inventory-price"
                  type="number"
                  min="0"
                  max={LIMITS.price}
                  step="0.01"
                  value={form.price}
                  onChange={(event) => onChange('price', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="inventory-cost-price">
                  Cost Price
                </label>
                <input
                  id="inventory-cost-price"
                  type="number"
                  min="0"
                  max={LIMITS.costPrice}
                  step="0.01"
                  value={form.cost_price}
                  onChange={(event) => onChange('cost_price', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="inventory-weight">
                  Weight (lbs)
                </label>
                <input
                  id="inventory-weight"
                  type="number"
                  min="0"
                  max={LIMITS.weightLbs}
                  step="0.01"
                  value={form.weight_lbs}
                  onChange={(event) => onChange('weight_lbs', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="1.00"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="inventory-category">
                  Category
                </label>
                <select
                  id="inventory-category"
                  value={form.category}
                  onChange={(event) => onChange('category', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="inventory-stock">
                  Stock Quantity
                </label>
                <input
                  id="inventory-stock"
                  type="number"
                  min="0"
                  max={LIMITS.stockQuantity}
                  step="1"
                  value={form.stock_quantity}
                  onChange={(event) => onChange('stock_quantity', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="inventory-threshold">
                  Low Stock Threshold
                </label>
                <input
                  id="inventory-threshold"
                  type="number"
                  min="0"
                  max={LIMITS.lowStockThreshold}
                  step="1"
                  value={form.low_stock_threshold}
                  onChange={(event) => onChange('low_stock_threshold', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="10"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="inventory-image-path">
                  File Path
                </label>
                <input
                  id="inventory-image-path"
                  type="text"
                  value={form.image_url}
                  maxLength={LIMITS.imagePathLength}
                  onChange={(event) => onChange('image_url', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="/products/apples.jpg"
                />
              </div>

              <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <label className="flex items-center gap-3 text-sm font-medium text-gray-700" htmlFor="inventory-organic">
                  <input
                    id="inventory-organic"
                    type="checkbox"
                    checked={form.is_organic}
                    onChange={(event) => onChange('is_organic', event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  Organic product
                </label>
              </div>
            </div>

            {errorMessage ? (
              <div className="px-6 pb-2">
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function StockAdjustModal({
  isOpen,
  stockItem,
  adjustmentType,
  adjustmentValue,
  onTypeChange,
  onValueChange,
  onClose,
  onSubmit,
  isSaving,
  isLoading,
  errorMessage,
}) {
  if (!isOpen) {
    return null;
  }

  const nextStock = getAdjustedStock(stockItem.currentStock, adjustmentType, adjustmentValue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Adjust Stock</h3>
            <p className="mt-1 text-sm text-gray-500">
              Update stock safely without changing the rest of the product details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">Loading stock details...</div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="px-6 py-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="text-sm font-semibold text-gray-900">{stockItem.name}</div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Current Stock</span>
                  <span className="font-semibold text-gray-900">{formatCount(stockItem.currentStock)}</span>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Adjustment Type
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => onTypeChange('add')}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      adjustmentType === 'add'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <i className="fas fa-plus mr-2" />
                    Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => onTypeChange('remove')}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      adjustmentType === 'remove'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <i className="fas fa-minus mr-2" />
                    Remove Stock
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500" htmlFor="stock-adjust-amount">
                  Amount
                </label>
                <input
                  id="stock-adjust-amount"
                  type="number"
                  min="1"
                  max={LIMITS.stockQuantity}
                  step="1"
                  value={adjustmentValue}
                  onChange={(event) => onValueChange(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="0"
                />
              </div>

              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Updated Stock</span>
                  <span className={`font-semibold ${nextStock < 0 || nextStock > LIMITS.stockQuantity ? 'text-red-600' : 'text-gray-900'}`}>
                    {Number.isFinite(nextStock) ? formatCount(nextStock) : '—'}
                  </span>
                </div>
              </div>

              {errorMessage ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Updating...' : 'Update Stock'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingProductId, setEditingProductId] = useState(null);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalErrorMessage, setModalErrorMessage] = useState('');

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState(EMPTY_STOCK_MODAL);
  const [stockAdjustmentType, setStockAdjustmentType] = useState('add');
  const [stockAdjustmentValue, setStockAdjustmentValue] = useState('');
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [isStockSaving, setIsStockSaving] = useState(false);
  const [stockErrorMessage, setStockErrorMessage] = useState('');

  async function loadInventory({ nextSearch = search, nextCategory = selectedCategory } = {}) {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const params = new URLSearchParams();
      if (nextSearch.trim()) {
        params.set('search', nextSearch.trim());
      }
      if (nextCategory !== 'All Categories') {
        params.set('category', nextCategory);
      }

      const response = await fetch(`${API_BASE}/api/admin/inventory?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to load inventory');
      }

      const payload = await response.json();

      setData({
        summary: payload.summary || EMPTY_DATA.summary,
        categories: payload.categories || [],
        items: payload.items || [],
      });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load inventory');
      setData(EMPTY_DATA);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadInventory();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search, selectedCategory]);

  const inventoryCategories = useMemo(
    () => Array.from(new Set((data.categories || []).filter(Boolean))),
    [data.categories],
  );

  const categoryOptions = useMemo(
    () => ['All Categories', ...inventoryCategories],
    [inventoryCategories],
  );

  const modalCategoryOptions = useMemo(() => {
    const currentCategory = String(formState.category || '').trim();

    if (currentCategory && !inventoryCategories.includes(currentCategory)) {
      return [...inventoryCategories, currentCategory];
    }

    return inventoryCategories;
  }, [inventoryCategories, formState.category]);

  const activeProductsCount = useMemo(
    () => data.items.filter((item) => Number(item.stock_quantity || 0) > 0).length,
    [data.items],
  );

  const outOfStockCount = useMemo(
    () => data.items.filter((item) => Number(item.stock_quantity || 0) === 0).length,
    [data.items],
  );

  function handleFormChange(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateModal() {
    setModalMode('create');
    setEditingProductId(null);
    setFormState(EMPTY_FORM);
    setModalErrorMessage('');
    setIsModalLoading(false);
    setIsModalOpen(true);
  }

  async function openEditModal(productId) {
    try {
      setModalMode('edit');
      setEditingProductId(productId);
      setFormState(EMPTY_FORM);
      setModalErrorMessage('');
      setIsModalLoading(true);
      setIsModalOpen(true);

      const response = await fetch(`${API_BASE}/api/admin/inventory/products/${productId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to load product details');
      }

      const payload = await response.json();
      setFormState(buildFormFromProduct(payload));
    } catch (error) {
      setModalErrorMessage(error.message || 'Failed to load product details');
    } finally {
      setIsModalLoading(false);
    }
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setModalMode('create');
    setEditingProductId(null);
    setFormState(EMPTY_FORM);
    setModalErrorMessage('');
    setIsModalLoading(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationMessage = validateForm(formState);
    if (validationMessage) {
      setModalErrorMessage(validationMessage);
      return;
    }

    try {
      setIsSaving(true);
      setModalErrorMessage('');

      const isEdit = modalMode === 'edit' && editingProductId;
      const endpoint = isEdit
        ? `${API_BASE}/api/admin/inventory/products/${editingProductId}`
        : `${API_BASE}/api/admin/inventory/products`;

      const response = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildRequestPayload(formState)),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || `Failed to ${isEdit ? 'update' : 'create'} product`);
      }

      await response.json().catch(() => null);
      closeModal();
      loadInventory();
    } catch (error) {
      setModalErrorMessage(error.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"?\n\nProducts with order history cannot be deleted.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/inventory/products/${product.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to delete product');
      }

      loadInventory();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to delete product');
    }
  }

  async function openStockModal(productId) {
    try {
      setIsStockModalOpen(true);
      setIsStockLoading(true);
      setIsStockSaving(false);
      setStockErrorMessage('');
      setStockAdjustmentType('add');
      setStockAdjustmentValue('');
      setStockItem(EMPTY_STOCK_MODAL);

      const response = await fetch(`${API_BASE}/api/admin/inventory/products/${productId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to load stock details');
      }

      const payload = await response.json();

      setStockItem({
        id: payload.id,
        name: payload.name || 'Product',
        currentStock: Number(payload.stock_quantity || 0),
        product: payload,
      });
    } catch (error) {
      setStockErrorMessage(error.message || 'Failed to load stock details');
    } finally {
      setIsStockLoading(false);
    }
  }

  function closeStockModal() {
    if (isStockSaving) {
      return;
    }

    setIsStockModalOpen(false);
    setStockItem(EMPTY_STOCK_MODAL);
    setStockAdjustmentType('add');
    setStockAdjustmentValue('');
    setIsStockLoading(false);
    setIsStockSaving(false);
    setStockErrorMessage('');
  }

  async function handleStockSubmit(event) {
    event.preventDefault();

    const validationMessage = validateStockAdjustment(
      stockItem.currentStock,
      stockAdjustmentType,
      stockAdjustmentValue,
    );

    if (validationMessage) {
      setStockErrorMessage(validationMessage);
      return;
    }

    if (!stockItem.product || !stockItem.id) {
      setStockErrorMessage('Unable to update stock right now.');
      return;
    }

    try {
      setIsStockSaving(true);
      setStockErrorMessage('');

      const nextStock = getAdjustedStock(
        stockItem.currentStock,
        stockAdjustmentType,
        stockAdjustmentValue,
      );

      const baseForm = buildFormFromProduct(stockItem.product);
      const payload = buildRequestPayload({
        ...baseForm,
        stock_quantity: String(nextStock),
      });

      const response = await fetch(`${API_BASE}/api/admin/inventory/products/${stockItem.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        throw new Error(apiPayload.detail || 'Failed to update stock');
      }

      await response.json().catch(() => null);
      closeStockModal();
      loadInventory();
    } catch (error) {
      setStockErrorMessage(error.message || 'Failed to update stock');
    } finally {
      setIsStockSaving(false);
    }
  }

  return (
    <>
      <AdminShell
        activeNav="inventory"
        title="Inventory"
        description="Manage shared product inventory, stock levels, and catalog details."
        quickPanel={{
          title: 'Overview',
          items: [
            {
              label: 'Available Products',
              value: formatCount(activeProductsCount),
              badgeClassName: 'bg-blue-100 text-blue-700',
            },
            {
              label: 'Out of Stock',
              value: formatCount(outOfStockCount),
              badgeClassName: 'bg-red-100 text-red-700',
            },
          ],
        }}
        headerAction={
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            type="button"
            onClick={openCreateModal}
          >
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
          <SummaryCard
            iconWrapClass="bg-blue-50 text-blue-500"
            iconClass="fas fa-boxes"
            label="Total Products"
            value={formatCount(data.summary.total_products)}
          />
          <SummaryCard
            iconWrapClass="bg-red-50 text-red-500"
            iconClass="fas fa-exclamation-triangle"
            label="Low Stock Items"
            value={formatCount(data.summary.low_stock_items)}
          />
          <SummaryCard
            iconWrapClass="bg-green-50 text-green-500"
            iconClass="fas fa-chart-bar"
            label="Items Sold"
            value={formatCount(data.summary.items_sold)}
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
          </div>

          <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Weight</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Level</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sold</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500">
                      Loading inventory...
                    </td>
                  </tr>
                ) : data.items.length ? (
                  data.items.map((item) => {
                    const icon = getCategoryIcon(item);
                    const status = getInventoryStatus(item);

                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${status.rowClass}`.trim()}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${icon.iconWrapClass}`}>
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <i className={icon.iconClass} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">{item.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span>SKU: PRD-{String(item.id).padStart(3, '0')}</span>
                                {item.is_organic ? (
                                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                                    Organic
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.category || 'Uncategorized'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {Number(item.weight_lbs || 0).toFixed(2)} lbs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-sm ${
                                Number(item.stock_quantity || 0) === 0
                                  ? 'font-bold text-red-600'
                                  : Number(item.stock_quantity || 0) <= Number(item.low_stock_threshold || 0)
                                    ? 'font-bold text-orange-600'
                                    : 'font-medium text-gray-900'
                              }`}
                            >
                              {formatCount(item.stock_quantity)}
                            </span>
                            <button
                              type="button"
                              onClick={() => openStockModal(item.id)}
                              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              title={`Adjust stock for ${item.name}`}
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatCount(item.total_sold)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.statusClass}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => openEditModal(item.id)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title={`Edit ${item.name}`}
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="text-gray-400 hover:text-red-600"
                            title={`Delete ${item.name}`}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500">
                      No products match the current filters.
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
                <span> results</span>
              </>
            }
            pages={[1]}
            currentPage={1}
          />
        </div>
      </AdminShell>

      <InventoryModal
        isOpen={isModalOpen}
        mode={modalMode}
        form={formState}
        onChange={handleFormChange}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        isLoading={isModalLoading}
        errorMessage={modalErrorMessage}
        categoryOptions={modalCategoryOptions}
      />

      <StockAdjustModal
        isOpen={isStockModalOpen}
        stockItem={stockItem}
        adjustmentType={stockAdjustmentType}
        adjustmentValue={stockAdjustmentValue}
        onTypeChange={setStockAdjustmentType}
        onValueChange={setStockAdjustmentValue}
        onClose={closeStockModal}
        onSubmit={handleStockSubmit}
        isSaving={isStockSaving}
        isLoading={isStockLoading}
        errorMessage={stockErrorMessage}
      />
    </>
  );
}