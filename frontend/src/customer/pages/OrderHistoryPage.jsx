import { useEffect, useState } from 'react';
import '../styles/orderHistory.css';

const API_BASE = 'http://localhost:8000';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusBadge({ status }) {
  const map = {
    processing: { label: 'Preparing', className: 'badge-preparing' },
    out_for_delivery: { label: 'In Transit', className: 'badge-transit' },
    delivered: { label: 'Delivered', className: 'badge-delivered' },
    failed: { label: 'Failed', className: 'badge-failed' },
  };
  const info = map[status] || { label: status, className: 'badge-preparing' };
  return <span className={`order-status-badge ${info.className}`}>{info.label}</span>;
}

export default function OrderHistoryPage({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setIsLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/api/orders/my`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error(`Failed to load orders (${res.status})`);
      }
      const data = await res.json();
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  function toggleOrder(orderId) {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  }

  function goToTracking(orderId) {
    window.location.href = `/orders/${orderId}`;
  }

  return (
    <div className="order-history-page">
      <div className="order-history-header">
        <button type="button" className="order-history-back" onClick={onBack}>
          ← Back to Shop
        </button>
        <h1>My Orders</h1>
        <p className="order-history-subtitle">
          {orders.length > 0
            ? `${orders.length} order${orders.length === 1 ? '' : 's'}`
            : 'Track your past purchases'}
        </p>
      </div>

      {isLoading && (
        <div className="order-history-loading">
          <div className="spinner" />
          <p>Loading orders…</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="order-history-error">
          <p>{error}</p>
          <button type="button" onClick={loadOrders}>Retry</button>
        </div>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <div className="order-history-empty">
          <div className="empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>When you place your first order, it will appear here.</p>
          <button type="button" onClick={onBack}>Start Shopping</button>
        </div>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="order-history-list">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <div
                key={order.id}
                className={`order-card ${isExpanded ? 'expanded' : ''}`}
              >
                <button
                  type="button"
                  className="order-card-header"
                  onClick={() => toggleOrder(order.id)}
                >
                  <div className="order-card-left">
                    <span className="order-id">Order #{order.id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="order-card-right">
                    <span className="order-total">${Number(order.total_price || 0).toFixed(2)}</span>
                    <span className="order-date">{formatDate(order.created_at)}</span>
                    <span className={`order-chevron ${isExpanded ? 'rotated' : ''}`}>▸</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="order-card-body">
                    <div className="order-meta-row">
                      <div className="order-meta">
                        <span className="meta-label">Delivery</span>
                        <span className="meta-value">{order.delivery_address}</span>
                      </div>
                      <div className="order-meta">
                        <span className="meta-label">Robot</span>
                        <span className="meta-value">{order.robot_label}</span>
                      </div>
                      <div className="order-meta">
                        <span className="meta-label">Weight</span>
                        <span className="meta-value">{order.total_weight_lbs} lbs</span>
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <button
                        type="button"
                        className="order-history-track-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          goToTracking(order.id);
                        }}
                      >
                        Track order
                      </button>
                    </div>

                    <div className="order-items-table">
                      <div className="order-items-header">
                        <span>Product</span>
                        <span>Qty</span>
                        <span>Price</span>
                        <span>Subtotal</span>
                      </div>
                      {order.items.map((item, idx) => (
                        <div className="order-item-row" key={idx}>
                          <span className="item-name">{item.name}</span>
                          <span className="item-qty">{item.quantity}</span>
                          <span className="item-price">${item.unit_price.toFixed(2)}</span>
                          <span className="item-subtotal">
                            ${(item.unit_price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="order-summary-row">
                      <div className="summary-line">
                        <span>Subtotal</span>
                        <span>${Number(order.subtotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="summary-line">
                        <span>Delivery Fee</span>
                        <span>{order.delivery_fee > 0 ? `$${order.delivery_fee.toFixed(2)}` : 'Free'}</span>
                      </div>
                      <div className="summary-line total">
                        <span>Total</span>
                        <span>${order.total_price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}