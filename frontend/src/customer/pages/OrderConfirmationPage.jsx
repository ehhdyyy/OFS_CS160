import '../styles/orderConfirmation.css';

export default function OrderConfirmationPage({ order, onContinueShopping }) {
  const subtotal = order.subtotal != null ? order.subtotal : order.total_price - order.delivery_fee;
  const isInTransit = order.status === 'out_for_delivery';
  const subtitle = isInTransit
    ? `${order.robot_label || 'Your robot'} is on the way with your order.`
    : 'Thank you for your purchase. Your order is being prepared for delivery.';

  return (
    <div className="confirmation-page">
      <div className="confirmation-card">
        <div className="confirmation-icon">✓</div>
        <h1>Order Confirmed!</h1>
        <p className="confirmation-subtitle">
          {subtitle}
        </p>

        <div className="confirmation-order-id">
          Order <strong>#{order.order_id}</strong>
        </div>

        <div className="confirmation-items">
          <h3>Items Ordered</h3>
          {order.items.map((item) => (
            <div key={item.id} className="confirmation-item-row">
              <span>{item.name} × {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="confirmation-totals">
          <div className="confirmation-total-row">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="confirmation-total-row">
            <span>Delivery</span>
            <span>{order.delivery_fee === 0 ? 'Free' : `$${order.delivery_fee.toFixed(2)}`}</span>
          </div>
          <div className="confirmation-total-row confirmation-total-final">
            <span>Total Paid</span>
            <span>${order.total_price.toFixed(2)}</span>
          </div>
        </div>

        <button className="confirmation-continue-btn" onClick={onContinueShopping}>
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
