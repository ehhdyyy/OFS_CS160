import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import '../styles/orderTrackingPage.css';

const API_BASE = 'http://localhost:8000';

const robotIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const destinationIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTimeline(status) {
  if (status === 'failed') {
    return [
      { key: 'processing', label: 'Preparing', complete: true, current: false },
      { key: 'failed', label: 'Failed', complete: false, current: true },
    ];
  }

  const steps = [
    { key: 'processing', label: 'Preparing' },
    { key: 'out_for_delivery', label: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered' },
  ];

  const currentIndex =
    status === 'delivered' ? 2 :
    status === 'out_for_delivery' ? 1 :
    0;

  return steps.map((step, index) => ({
    ...step,
    complete: index < currentIndex,
    current: index === currentIndex,
  }));
}

function StatusBadge({ statusLabel }) {
  return <span className="tracking-status-badge">{statusLabel || 'Preparing'}</span>;
}

export default function OrderTrackingPage({ orderId, onBack }) {
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const robotMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const polylineRef = useRef(null);

  async function loadOrder(showRefreshState = false) {
    try {
      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError('');

      const [ordersRes, statusRes, locationRes] = await Promise.all([
        fetch(`${API_BASE}/api/orders/my`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/orders/${orderId}/status`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/orders/${orderId}/location`, { credentials: 'include' }),
      ]);

      if (ordersRes.status === 401 || statusRes.status === 401 || locationRes.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!ordersRes.ok) {
        throw new Error(`Failed to load order details (${ordersRes.status})`);
      }
      if (!statusRes.ok) {
        throw new Error(`Failed to load order status (${statusRes.status})`);
      }
      if (!locationRes.ok) {
        throw new Error(`Failed to load order location (${locationRes.status})`);
      }

      const ordersData = await ordersRes.json();
      const statusData = await statusRes.json();
      const locationData = await locationRes.json();

      const matchedOrder = Array.isArray(ordersData.orders)
        ? ordersData.orders.find((entry) => Number(entry.id) === Number(orderId))
        : null;

      if (!matchedOrder) {
        setError('Order not found.');
        return;
      }

      setOrder(matchedOrder);
      setStatus(statusData);
      setLocation(locationData);
    } catch (err) {
      setError(err.message || 'Something went wrong while loading this order.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadOrder(false);
  }, [orderId]);

  useEffect(() => {
    if (!status) return;
    if (status.status === 'delivered' || status.status === 'failed') return;

    const timer = window.setInterval(() => {
      if (!isRefreshing) loadOrder(true);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [orderId, status?.status]);

  const timeline = useMemo(
    () => getTimeline(status?.status || order?.status || 'processing'),
    [status?.status, order?.status]
  );

  const destination = useMemo(() => {
    if (location?.destination_latitude != null && location?.destination_longitude != null) {
      return [Number(location.destination_latitude), Number(location.destination_longitude)];
    }
    if (location?.destination_location?.lat != null && location?.destination_location?.lng != null) {
      return [Number(location.destination_location.lat), Number(location.destination_location.lng)];
    }
    return null;
  }, [location]);

  const robotPosition = useMemo(() => {
    if (location?.latitude != null && location?.longitude != null) {
      return [Number(location.latitude), Number(location.longitude)];
    }

    if (location?.current_location?.lat != null && location?.current_location?.lng != null) {
      return [Number(location.current_location.lat), Number(location.current_location.lng)];
    }
    return [37.3330375564865, -121.89059343162731];
  }, [location]);


  useEffect(() => {
    if (!mapContainerRef.current || !robotPosition) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(robotPosition, 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    if (!robotMarkerRef.current) {
      robotMarkerRef.current = L.marker(robotPosition, { icon: robotIcon })
        .addTo(map)
        .bindPopup('Robot');
    } else {
      robotMarkerRef.current.setLatLng(robotPosition);
    }

    if (destination) {
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = L.marker(destination, { icon: destinationIcon })
          .addTo(map)
          .bindPopup('Destination');
      } else {
        destinationMarkerRef.current.setLatLng(destination);
      }
    }

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (destination) {
      polylineRef.current = L.polyline([robotPosition, destination]).addTo(map);
      map.fitBounds(L.latLngBounds([robotPosition, destination]), { padding: [40, 40] });
    } else {
      map.setView(robotPosition, 15);
    }

    return () => {};
  }, [robotPosition, destination]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      robotMarkerRef.current = null;
      destinationMarkerRef.current = null;
      polylineRef.current = null;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="order-tracking-page">
        <div className="order-tracking-card">
          <p className="tracking-muted">Loading order…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-tracking-page">
        <div className="order-tracking-card">
          <button className="tracking-back-btn" onClick={onBack}>← Back to Orders</button>
          <h1>Order Tracking</h1>
          <p className="tracking-error">{error || 'Order unavailable.'}</p>
          <button className="tracking-primary-btn" onClick={() => loadOrder(false)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusLabel = status?.status_label || 'Preparing';
  const total = Number(order?.total_price || 0);
  const subtotal = Number(order?.subtotal || 0);
  const deliveryFee = Number(order?.delivery_fee || 0);
  const progressPercent =
    location?.progress != null ? Math.round(Number(location.progress) * 100) : 0;

  return (
    <div className="order-tracking-page">
      <div className="order-tracking-card">
        <div className="tracking-header">
          <div>
            <button className="tracking-back-btn" onClick={onBack}>← Back to Orders</button>
            <h1>Track Order #{order.id}</h1>
            <p className="tracking-muted">Placed {formatDate(order.created_at)}</p>
          </div>
          <div className="tracking-header-right">
            <StatusBadge statusLabel={statusLabel} />
            {isRefreshing ? <span className="tracking-refreshing">Refreshing…</span> : null}
          </div>
        </div>

        <div className="tracking-grid">
          <section className="tracking-panel">
            <h2>Live Map</h2>

            {robotPosition ? (
              <div className="tracking-map-wrap">
                <div ref={mapContainerRef} className="tracking-map" />
              </div>
            ) : (
              <p className="tracking-muted">Map data is not available yet.</p>
            )}

            <div className="tracking-meta-list">
              <div><span>Robot</span><strong>{status?.robot_label || order.robot_label || 'Awaiting robot'}</strong></div>
              <div><span>Payment</span><strong>{status?.payment_status || order.payment_status || 'paid'}</strong></div>
              <div><span>Delivery address</span><strong>{order.delivery_address}</strong></div>
              {status?.eta_minutes != null ? (
                <div><span>ETA</span><strong>{status.eta_minutes} min</strong></div>
              ) : null}
              <div><span>Progress</span><strong>{progressPercent}%</strong></div>
            </div>
          </section>

          <section className="tracking-panel">
            <h2>Status</h2>
            <div className="tracking-timeline">
              {timeline.map((step) => (
                <div
                  key={step.key}
                  className={`tracking-step ${step.complete ? 'complete' : ''} ${step.current ? 'current' : ''}`}
                >
                  <div className="tracking-step-dot" />
                  <div className="tracking-step-label">{step.label}</div>
                </div>
              ))}
            </div>

            <div className="tracking-items">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="tracking-item-row">
                  <div>
                    <div className="tracking-item-name">{item.name}</div>
                    <div className="tracking-item-meta">
                      Qty {item.quantity} · ${Number(item.unit_price).toFixed(2)} each
                    </div>
                  </div>
                  <div className="tracking-item-total">
                    ${(Number(item.unit_price) * Number(item.quantity)).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="tracking-summary">
              <div><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
              <div><span>Delivery</span><strong>{deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : 'Free'}</strong></div>
              <div className="tracking-summary-total"><span>Total</span><strong>${total.toFixed(2)}</strong></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}