import { useEffect, useMemo, useRef, useState } from 'react';
import AdminShell from '../AdminShell';
import { SummaryCard, Pagination } from '../components/AdminCommon';

const API_BASE = window.__OFS_API_BASE_URL || 'http://localhost:8000';
const MAP_ELEMENT_ID = 'ofs-admin-delivery-map';
const ROUTE_ORDER_LIMIT = 10;
const ROUTE_WEIGHT_LIMIT_LBS = 200;
const DEFAULT_MAP_CENTER = { lat: 37.3337, lng: -121.8891 };
const OFS_HEADQUARTERS = {
  name: 'OFS Headquarters',
  address: '201 S Market St, San Jose, CA 95113',
};

const EMPTY_DATA = {
  summary: {
    total: 0,
    order_placed: 0,
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

const HISTORY_STATUS_OPTIONS = [
  { value: 'all', label: 'All History Statuses' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
];

let googleMapsPromise = null;

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

function formatDistanceMiles(distanceMeters) {
  const miles = Number(distanceMeters || 0) / 1609.344;
  return `${miles.toFixed(miles >= 10 ? 0 : 1)} mi`;
}

function formatDuration(durationSeconds) {
  const totalMinutes = Math.max(Math.round(Number(durationSeconds || 0) / 60), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${totalMinutes} min`;
  }

  if (!minutes) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

function roundWeight(value) {
  return Number(Number(value || 0).toFixed(2));
}

function formatWeight(value) {
  return `${roundWeight(value).toFixed(2)} lbs`;
}

function formatRobotLabel(robot) {
  if (robot?.robot_id) {
    return robot.robot_id;
  }

  if (robot?.robot_label) {
    return robot.robot_label;
  }

  if (robot?.name) {
    return robot.name;
  }

  const numericId = Number(robot?.id ?? robot?.robotId ?? robot?.robot_id_value);
  if (Number.isFinite(numericId) && numericId > 0) {
    return `Robot-${String(numericId).padStart(2, '0')}`;
  }

  return 'Robot';
}

function normalizeDeliveryStatus(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (normalized === 'order_placed') {
    return 'order_placed';
  }

  if (normalized === 'in_transit' || normalized === 'out_for_delivery') {
    return 'in_transit';
  }

  if (normalized === 'delivered') {
    return 'delivered';
  }

  if (normalized === 'failed') {
    return 'failed';
  }

  return '';
}

function normalizeRobotStatus(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (normalized === 'working') {
    return 'on_delivery';
  }

  return normalized;
}

function getStatusLabel(rawStatus) {
  if (rawStatus === 'order_placed') {
    return 'Order Placed';
  }

  if (rawStatus === 'in_transit') {
    return 'In Transit';
  }

  if (rawStatus === 'delivered') {
    return 'Delivered';
  }

  if (rawStatus === 'failed') {
    return 'Failed';
  }

  return 'Unknown';
}

function getStatusClass(rawStatus) {
  if (rawStatus === 'order_placed') {
    return 'text-orange-700 bg-orange-100 border-orange-200';
  }

  if (rawStatus === 'in_transit') {
    return 'text-blue-700 bg-blue-100 border-blue-200';
  }

  if (rawStatus === 'delivered') {
    return 'text-green-700 bg-green-100 border-green-200';
  }

  return 'text-red-700 bg-red-100 border-red-200';
}

function getNumericId(value) {
  if (Number.isFinite(Number(value))) {
    return Number(value);
  }

  const match = String(value || '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function getCustomerNames(value) {
  if (Array.isArray(value?.customer_names)) {
    return value.customer_names.filter(Boolean);
  }

  if (Array.isArray(value?.customers)) {
    return value.customers.filter(Boolean);
  }

  if (value?.customer_name) {
    return [value.customer_name].filter(Boolean);
  }

  if (value?.customer) {
    return [value.customer].filter(Boolean);
  }

  return [];
}

function getAddresses(value) {
  if (Array.isArray(value?.addresses) && value.addresses.length) {
    return value.addresses.filter(Boolean);
  }

  if (value?.delivery_address) {
    return [value.delivery_address].filter(Boolean);
  }

  if (value?.address) {
    return [value.address].filter(Boolean);
  }

  return [];
}

function getPrimaryAddress(value) {
  return getAddresses(value)[0] || '';
}

function toLatLngLiteral(value) {
  if (!value) {
    return null;
  }

  const lat = typeof value.lat === 'function' ? value.lat() : value.lat;
  const lng = typeof value.lng === 'function' ? value.lng() : value.lng;

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return null;
  }

  return {
    lat: Number(lat),
    lng: Number(lng),
  };
}

function buildSummary(summary, pendingCount) {
  const baseSummary = summary || {};
  const reportedTotal = Number(baseSummary.total || 0);
  const delivered = Number(baseSummary.delivered || 0);
  const failed = Number(baseSummary.failed || 0);
  const inTransit = Number(baseSummary.in_transit || 0);
  const orderPlaced = Number(baseSummary.order_placed ?? pendingCount ?? 0);
  const derivedTotal = delivered + failed + inTransit + orderPlaced;

  return {
    total: reportedTotal >= derivedTotal ? reportedTotal : derivedTotal,
    order_placed: orderPlaced,
    in_transit: inTransit,
    delivered,
    failed,
  };
}

function normalizeDeliveryRow(item, index = 0) {
  const rawStatus = normalizeDeliveryStatus(item?.raw_status || item?.status);
  const deliveryId = Number(item?.delivery_id ?? getNumericId(item?.id));

  return {
    ...item,
    table_key: `delivery-${deliveryId || index}`,
    id:
      typeof item?.id === 'string' && item.id.trim()
        ? item.id
        : `DLV-${String(deliveryId || index + 1).padStart(3, '0')}`,
    delivery_id: Number.isFinite(deliveryId) ? deliveryId : null,
    raw_status: rawStatus || 'failed',
    status: item?.status || getStatusLabel(rawStatus),
    statusClass: item?.statusClass || getStatusClass(rawStatus),
    robot_id: Number(item?.robot_id || 0) || null,
    robot_label: item?.robot_label || 'Awaiting robot',
    order_count: Number(item?.order_count || item?.order_ids?.length || 0),
    order_ids: Array.isArray(item?.order_ids) ? item.order_ids.filter(Boolean).map(Number) : [],
    customer_names: getCustomerNames(item),
    addresses: getAddresses(item),
    started_at: item?.started_at || null,
    created_at: item?.created_at || null,
    completed_at: item?.completed_at || null,
    total_weight_lbs:
      item?.total_weight_lbs === null || item?.total_weight_lbs === undefined
        ? null
        : Number(item.total_weight_lbs),
    revenue:
      item?.revenue === null || item?.revenue === undefined
        ? null
        : Number(item.revenue),
  };
}

function normalizePendingRow(item, index = 0) {
  const orderId = getNumericId(item?.pending_order_id ?? item?.order_id ?? item?.id ?? item?.orderId);
  const addresses = getAddresses(item);
  const revenue = item?.revenue ?? item?.total_price ?? item?.amount ?? null;
  const weight = item?.total_weight_lbs ?? item?.weight_lbs ?? item?.total_weight ?? null;

  return {
    ...item,
    table_key: `pending-${orderId || index}`,
    id:
      typeof item?.id === 'string' && item.id.trim()
        ? item.id
        : `ORD-${String(orderId || index + 1).padStart(4, '0')}`,
    delivery_id: null,
    pending_order_id: Number.isFinite(orderId) ? orderId : null,
    raw_status: 'order_placed',
    status: 'Order Placed',
    statusClass: getStatusClass('order_placed'),
    robot_id: null,
    robot_label: 'Awaiting robot',
    order_count: 1,
    order_ids: Number.isFinite(orderId) ? [orderId] : [],
    customer_names: getCustomerNames(item),
    addresses,
    delivery_address: item?.delivery_address || addresses[0] || '',
    started_at: null,
    created_at: item?.created_at || item?.ordered_at || item?.placed_at || null,
    completed_at: null,
    total_weight_lbs: weight === null || weight === undefined ? null : Number(weight),
    revenue: revenue === null || revenue === undefined ? null : Number(revenue),
  };
}

function extractPendingRows(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload?.pending_items)) {
    return payload.pending_items.map((item, index) => normalizePendingRow(item, index));
  }

  if (Array.isArray(payload?.order_placed_items)) {
    return payload.order_placed_items.map((item, index) => normalizePendingRow(item, index));
  }

  if (Array.isArray(payload?.items)) {
    return payload.items.map((item, index) => normalizePendingRow(item, index));
  }

  if (Array.isArray(payload?.orders)) {
    return payload.orders.map((item, index) => normalizePendingRow(item, index));
  }

  return [];
}

function getGoogleMapsApiKey() {
  if (typeof window === 'undefined') {
    return '';
  }

  const metaKey = document
    .querySelector('meta[name="google-maps-api-key"]')
    ?.getAttribute('content');

  return window.__GOOGLE_MAPS_API_KEY__ || window.GOOGLE_MAPS_API_KEY || metaKey || '';
}

function loadGoogleMapsApi() {
  if (typeof window !== 'undefined' && window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('ofs-google-maps-script');

    const handleLoad = () => {
      if (window.google?.maps) {
        resolve(window.google);
        return;
      }

      googleMapsPromise = null;
      reject(new Error('Google Maps did not finish loading.'));
    };

    const handleError = () => {
      googleMapsPromise = null;
      reject(new Error('Failed to load Google Maps.'));
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'ofs-google-maps-script';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

async function geocodeAddress(google, address) {
  if (!google?.maps?.Geocoder || !address) {
    return null;
  }

  const geocoder = new google.maps.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && Array.isArray(results) && results[0]?.geometry?.location) {
        resolve(toLatLngLiteral(results[0].geometry.location));
        return;
      }

      if (status === 'ZERO_RESULTS') {
        resolve(null);
        return;
      }

      reject(new Error(`Unable to locate ${address}.`));
    });
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    if (options.allowNotFound && response.status === 404) {
      return null;
    }

    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function getDeliveryEndpointParams(search, daysFilter) {
  const params = new URLSearchParams();
  params.set('days', daysFilter);

  if (search.trim()) {
    params.set('search', search.trim());
  }

  return params;
}

function getPendingEndpointParams(search, daysFilter) {
  const params = new URLSearchParams();
  params.set('days', daysFilter);

  if (search.trim()) {
    params.set('search', search.trim());
  }

  return params;
}

function summarizeRoute(route) {
  return {
    distance_meters: Number(route?.distanceMeters || 0),
    duration_seconds: Math.round(Number(route?.durationMillis || 0) / 1000),
    waypoint_order: Array.isArray(route?.optimizedIntermediateWaypointIndices)
      ? route.optimizedIntermediateWaypointIndices
      : [],
  };
}

function selectionKeyFromItems(items) {
  return items
    .map((item) => Number(item?.pending_order_id || 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right)
    .join(',');
}

function sumWeights(items) {
  return items.reduce((total, item) => total + Number(item?.total_weight_lbs || 0), 0);
}

function matchesHistoryStatus(item, filterValue) {
  if (filterValue === 'all') {
    return true;
  }

  return normalizeDeliveryStatus(item?.raw_status || item?.status) === normalizeDeliveryStatus(filterValue);
}

function getDirectionsErrorMessage(error) {
  const message = String(error?.message || '');

  if (message.includes('ZERO_RESULTS')) {
    return 'Google Maps could not find a drivable route for one or more selected addresses.';
  }

  if (message.includes('NOT_FOUND')) {
    return 'Google Maps could not recognize one or more selected delivery addresses.';
  }

  if (message.includes('MAX_WAYPOINTS_EXCEEDED')) {
    return 'Google Maps rejected the route because too many waypoints were selected.';
  }

  if (message.includes('OVER_QUERY_LIMIT') || message.includes('RESOURCE_EXHAUSTED')) {
    return 'Google Maps route requests are over the current quota. Try again in a moment.';
  }

  if (message.includes('REQUEST_DENIED') || message.includes('PERMISSION_DENIED')) {
    return 'Google Maps denied the route request. Confirm that this browser key belongs to the billing-enabled project and that both Maps JavaScript API and Routes API are enabled for it.';
  }

  return message || 'Unable to build a route for the selected delivery addresses.';
}

export default function DeliveriesPage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [pendingItems, setPendingItems] = useState([]);
  const [robots, setRobots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [daysFilter, setDaysFilter] = useState('7');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [selectedRobotId, setSelectedRobotId] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isRouting, setIsRouting] = useState(false);
  const [routingError, setRoutingError] = useState('');
  const [routingMessage, setRoutingMessage] = useState('');
  const [mapError, setMapError] = useState('');
  const [headquartersPosition, setHeadquartersPosition] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [routePreview, setRoutePreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const mapRef = useRef(null);
  const mapElementRef = useRef(null);
  const markerRefs = useRef([]);
  const polylineRefs = useRef([]);
  const mapsApiRef = useRef(null);
  const routesLibraryRef = useRef(null);
  const requestIdRef = useRef(0);
  const previewRequestIdRef = useRef(0);

  const availableRobots = useMemo(
    () =>
      robots.filter((robot) => {
        if (robot?.is_available === true) {
          return true;
        }

        const rawStatus = normalizeRobotStatus(robot?.raw_status || robot?.status);
        return rawStatus === 'charging' || rawStatus === 'available';
      }),
    [robots]
  );

  const historyItems = useMemo(() => data.items || [], [data.items]);

  const filteredHistoryItems = useMemo(
    () => historyItems.filter((item) => matchesHistoryStatus(item, historyStatusFilter)),
    [historyItems, historyStatusFilter]
  );

  const selectedOrderIdSet = useMemo(
    () => new Set(selectedOrderIds.map((value) => Number(value)).filter((value) => Number.isFinite(value))),
    [selectedOrderIds]
  );

  const selectedPendingItems = useMemo(
    () => pendingItems.filter((item) => selectedOrderIdSet.has(Number(item?.pending_order_id))),
    [pendingItems, selectedOrderIdSet]
  );

  const selectedOrderCount = selectedPendingItems.length;
  const selectedTotalWeight = useMemo(() => roundWeight(sumWeights(selectedPendingItems)), [selectedPendingItems]);
  const routeSelectionKey = useMemo(() => selectionKeyFromItems(selectedPendingItems), [selectedPendingItems]);

  useEffect(() => {
    if (!availableRobots.length) {
      setSelectedRobotId('');
      return;
    }

    setSelectedRobotId((currentValue) => {
      if (availableRobots.some((robot) => String(robot.id) === String(currentValue))) {
        return currentValue;
      }

      return String(availableRobots[0].id);
    });
  }, [availableRobots]);

  useEffect(() => {
    const pendingIdSet = new Set(
      pendingItems
        .map((item) => Number(item?.pending_order_id))
        .filter((value) => Number.isFinite(value) && value > 0)
    );

    setSelectedOrderIds((currentValue) => currentValue.filter((value) => pendingIdSet.has(Number(value))));
  }, [pendingItems]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      try {
        const google = await loadGoogleMapsApi();
        const routesLibrary = await google.maps.importLibrary('routes');

        if (cancelled || !mapElementRef.current) {
          return;
        }

        mapsApiRef.current = google;
        routesLibraryRef.current = routesLibrary;

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(mapElementRef.current, {
            center: DEFAULT_MAP_CENTER,
            zoom: 14,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            clickableIcons: false,
          });
        }

        const resolvedHeadquartersPosition =
          (await geocodeAddress(google, OFS_HEADQUARTERS.address).catch(() => null)) || DEFAULT_MAP_CENTER;

        if (!cancelled) {
          setHeadquartersPosition(resolvedHeadquartersPosition);
          mapRef.current.setCenter(resolvedHeadquartersPosition);
        }

        setIsMapReady(true);
      } catch (error) {
        if (!cancelled) {
          setMapError(error.message || 'Google Maps failed to load.');
          setIsMapReady(false);
        }
      }
    }

    initializeMap();

    return () => {
      cancelled = true;

      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];

      polylineRefs.current.forEach((polyline) => polyline.setMap(null));
      polylineRefs.current = [];
    };
  }, []);

  useEffect(() => {
    setRoutingError('');
    setRoutingMessage('');
    setRoutePreview(null);
    setPreviewError('');
    previewRequestIdRef.current += 1;
  }, [search, daysFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadDeliveries();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search, daysFilter]);

  useEffect(() => {
    if (!isMapReady || !mapsApiRef.current?.maps || !mapRef.current) {
      return;
    }

    const google = mapsApiRef.current;
    const activeHeadquartersPosition = headquartersPosition || DEFAULT_MAP_CENTER;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = [];

    polylineRefs.current.forEach((polyline) => polyline.setMap(null));
    polylineRefs.current = [];

    const headquartersMarker = new google.maps.Marker({
      map: mapRef.current,
      position: activeHeadquartersPosition,
      label: 'H',
      title: routePreview ? `${OFS_HEADQUARTERS.name} • Start / End` : OFS_HEADQUARTERS.name,
    });
    markerRefs.current.push(headquartersMarker);

    if (!routePreview?.route) {
      mapRef.current.setCenter(activeHeadquartersPosition);
      mapRef.current.setZoom(14);
      return;
    }

    const pathPoints = Array.isArray(routePreview.route?.path)
      ? routePreview.route.path.map(toLatLngLiteral).filter(Boolean)
      : [];

    if (pathPoints.length) {
      const polyline = new google.maps.Polyline({
        path: pathPoints,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.85,
        strokeWeight: 5,
      });
      polyline.setMap(mapRef.current);
      polylineRefs.current.push(polyline);
    }

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(activeHeadquartersPosition);
    pathPoints.forEach((point) => bounds.extend(point));

    routePreview.optimizedStops.forEach((stop, index) => {
      if (!stop?.route_position) {
        return;
      }

      const marker = new google.maps.Marker({
        map: mapRef.current,
        position: stop.route_position,
        label: String(index + 1),
        title: getPrimaryAddress(stop) || `Stop ${index + 1}`,
      });

      markerRefs.current.push(marker);
      bounds.extend(stop.route_position);
    });

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 64);
    }
  }, [headquartersPosition, isMapReady, routePreview]);

  useEffect(() => {
    if (!isMapReady || !mapsApiRef.current?.maps) {
      return;
    }

    if (!selectedPendingItems.length) {
      setRoutePreview(null);
      setPreviewError('');
      setIsPreviewLoading(false);
      return;
    }

    const previewRequestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = previewRequestId;
    setIsPreviewLoading(true);
    setPreviewError('');

    buildRoutePlan(selectedPendingItems)
      .then((plan) => {
        if (previewRequestId !== previewRequestIdRef.current) {
          return;
        }

        setRoutePreview(plan);
      })
      .catch((error) => {
        if (previewRequestId !== previewRequestIdRef.current) {
          return;
        }

        setRoutePreview(null);
        setPreviewError(getDirectionsErrorMessage(error));
      })
      .finally(() => {
        if (previewRequestId === previewRequestIdRef.current) {
          setIsPreviewLoading(false);
        }
      });
  }, [isMapReady, routeSelectionKey]);

  async function loadPendingDeliveriesFallback(currentSearch, currentDays) {
    const pendingParams = getPendingEndpointParams(currentSearch, currentDays);

    const preferredPayload = await fetchJson(`${API_BASE}/api/admin/deliveries/pending?${pendingParams.toString()}`, {
      allowNotFound: true,
    });

    return preferredPayload || { items: [] };
  }

  async function loadDeliveries() {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      setIsLoading(true);
      setErrorMessage('');

      const deliveryParams = getDeliveryEndpointParams(search, daysFilter);
      const [deliveriesPayload, robotsPayload] = await Promise.all([
        fetchJson(`${API_BASE}/api/admin/deliveries?${deliveryParams.toString()}`),
        fetchJson(`${API_BASE}/api/admin/robots`),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      const normalizedDeliveryItems = Array.isArray(deliveriesPayload?.items)
        ? deliveriesPayload.items.map((item, index) => normalizeDeliveryRow(item, index))
        : [];

      const normalizedPendingItems = Array.isArray(deliveriesPayload?.pending_items)
        ? deliveriesPayload.pending_items.map((item, index) => normalizePendingRow(item, index))
        : extractPendingRows(await loadPendingDeliveriesFallback(search, daysFilter));

      if (requestId !== requestIdRef.current) {
        return;
      }

      setData({
        summary: buildSummary(deliveriesPayload?.summary, normalizedPendingItems.length),
        items: normalizedDeliveryItems,
      });
      setPendingItems(normalizedPendingItems);
      setRobots(Array.isArray(robotsPayload?.items) ? robotsPayload.items : []);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setErrorMessage(error.message || 'Failed to load deliveries');
      setData(EMPTY_DATA);
      setPendingItems([]);
      setRobots([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function buildRoutePlan(stops) {
    if (!stops.length) {
      throw new Error('Select at least one awaiting order to preview a route.');
    }

    if (stops.length > ROUTE_ORDER_LIMIT) {
      throw new Error(`A single robot route can include at most ${ROUTE_ORDER_LIMIT} orders.`);
    }

    const totalWeight = roundWeight(sumWeights(stops));
    if (totalWeight > ROUTE_WEIGHT_LIMIT_LBS) {
      throw new Error(`Selected orders exceed the ${ROUTE_WEIGHT_LIMIT_LBS} lb robot limit.`);
    }

    const invalidStop = stops.find((stop) => !getPrimaryAddress(stop));
    if (invalidStop) {
      throw new Error(`Order ${invalidStop.id || invalidStop.pending_order_id || ''} is missing a delivery address.`);
    }

    const google = mapsApiRef.current;
    const routesLibrary = routesLibraryRef.current || (await google.maps.importLibrary('routes'));
    routesLibraryRef.current = routesLibrary;

    const { Route, RoutingPreference } = routesLibrary;
    const request = {
      origin: OFS_HEADQUARTERS.address,
      destination: OFS_HEADQUARTERS.address,
      intermediates: stops.map((stop) => ({
        location: getPrimaryAddress(stop),
      })),
      optimizeWaypointOrder: stops.length > 1,
      travelMode: 'DRIVING',
      routingPreference: RoutingPreference?.TRAFFIC_AWARE || 'TRAFFIC_AWARE',
      fields: [
        'path',
        'legs',
        'distanceMeters',
        'durationMillis',
        'optimizedIntermediateWaypointIndices',
      ],
    };

    const { routes } = await Route.computeRoutes(request);
    const route = Array.isArray(routes) ? routes[0] : null;

    if (!route) {
      throw new Error('Google Maps did not return a route for the selected delivery addresses.');
    }

    const waypointOrder = Array.isArray(route.optimizedIntermediateWaypointIndices)
      ? route.optimizedIntermediateWaypointIndices
      : [];
    const orderedStops = waypointOrder.length ? waypointOrder.map((index) => stops[index]).filter(Boolean) : stops;
    const stopLocations = Array.isArray(route.legs)
      ? route.legs.slice(0, orderedStops.length).map((leg) => toLatLngLiteral(leg?.endLocation))
      : [];

    const optimizedStops = orderedStops.map((stop, index) => ({
      ...stop,
      route_position: stopLocations[index] || null,
    }));

    return {
      selectionKey: selectionKeyFromItems(stops),
      route,
      optimizedStops,
      routeSummary: {
        ...summarizeRoute(route),
        order_count: optimizedStops.length,
        total_weight_lbs: totalWeight,
      },
    };
  }

  async function persistRouteAssignment(routePlan) {
    const orderIds = routePlan.optimizedStops
      .map((stop) => stop.pending_order_id)
      .filter((value) => Number.isFinite(Number(value)));

    const payload = {
      robot_id: Number(selectedRobotId),
      order_ids: orderIds,
      status: 'in_transit',
      origin: {
        name: OFS_HEADQUARTERS.name,
        address: OFS_HEADQUARTERS.address,
        latitude: Number((headquartersPosition || DEFAULT_MAP_CENTER).lat),
        longitude: Number((headquartersPosition || DEFAULT_MAP_CENTER).lng),
      },
      stops: routePlan.optimizedStops.map((stop, index) => ({
        order_id: stop.pending_order_id,
        address: getPrimaryAddress(stop),
        sequence: index + 1,
        latitude: Number(stop.route_position?.lat),
        longitude: Number(stop.route_position?.lng),
      })),
      route: routePlan.routeSummary,
    };

    const endpoints = [`${API_BASE}/api/admin/deliveries/route`, `${API_BASE}/api/admin/deliveries/assign`];

    let missingEndpointCount = 0;

    for (const endpoint of endpoints) {
      try {
        const result = await fetchJson(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
          allowNotFound: true,
        });

        if (result === null) {
          missingEndpointCount += 1;
          continue;
        }

        return result;
      } catch (error) {
        if (/not found/i.test(error.message || '')) {
          missingEndpointCount += 1;
          continue;
        }

        throw error;
      }
    }

    if (missingEndpointCount === endpoints.length) {
      throw new Error('Routing is ready, but the delivery assignment endpoint is missing.');
    }

    return null;
  }

  function getSelectionBlockReason(item) {
    const orderId = Number(item?.pending_order_id || 0);
    if (selectedOrderIdSet.has(orderId)) {
      return '';
    }

    if (!getPrimaryAddress(item)) {
      return 'Missing address';
    }

    if (selectedOrderCount >= ROUTE_ORDER_LIMIT) {
      return `Max ${ROUTE_ORDER_LIMIT} orders`;
    }

    const nextWeight = selectedTotalWeight + Number(item?.total_weight_lbs || 0);
    if (nextWeight > ROUTE_WEIGHT_LIMIT_LBS) {
      return `Over ${ROUTE_WEIGHT_LIMIT_LBS} lbs`;
    }

    return '';
  }

  function toggleOrderSelection(item) {
    const orderId = Number(item?.pending_order_id || 0);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return;
    }

    setRoutingError('');
    setRoutingMessage('');

    if (selectedOrderIdSet.has(orderId)) {
      setSelectedOrderIds((currentValue) => currentValue.filter((value) => Number(value) !== orderId));
      return;
    }

    const blockReason = getSelectionBlockReason(item);
    if (blockReason) {
      if (blockReason === 'Missing address') {
        setRoutingError('This order cannot be routed because it is missing a delivery address.');
      } else if (blockReason.startsWith('Max')) {
        setRoutingError(`You can select at most ${ROUTE_ORDER_LIMIT} awaiting orders for one robot trip.`);
      } else {
        setRoutingError(`This selection would exceed the ${ROUTE_WEIGHT_LIMIT_LBS} lb robot limit.`);
      }
      return;
    }

    setSelectedOrderIds((currentValue) => [...currentValue, orderId]);
  }

  function clearSelection() {
    setSelectedOrderIds([]);
    setRoutingError('');
    setRoutingMessage('');
  }

  async function handleRouteRobot() {
    setRoutingError('');
    setRoutingMessage('');

    if (!selectedPendingItems.length) {
      setRoutingError('Select at least one awaiting order before routing a robot.');
      return;
    }

    if (selectedPendingItems.length > ROUTE_ORDER_LIMIT) {
      setRoutingError(`A robot can only carry ${ROUTE_ORDER_LIMIT} different orders per trip.`);
      return;
    }

    if (selectedTotalWeight > ROUTE_WEIGHT_LIMIT_LBS) {
      setRoutingError(`Selected orders exceed the ${ROUTE_WEIGHT_LIMIT_LBS} lb robot capacity.`);
      return;
    }

    if (!availableRobots.length) {
      setRoutingError('No available robots are currently ready for routing.');
      return;
    }

    if (!selectedRobotId) {
      setRoutingError('Select an available robot before routing.');
      return;
    }

    if (!isMapReady || !mapsApiRef.current) {
      setRoutingError(mapError || 'Google Maps is still loading.');
      return;
    }

    const selectedRobot = availableRobots.find((robot) => String(robot.id) === String(selectedRobotId));
    if (!selectedRobot) {
      setRoutingError('The selected robot is no longer available.');
      return;
    }

    setIsRouting(true);

    try {
      const routePlan =
        routePreview?.selectionKey === routeSelectionKey ? routePreview : await buildRoutePlan(selectedPendingItems);

      setRoutePreview(routePlan);

      await persistRouteAssignment(routePlan);
      await loadDeliveries();

      setSelectedOrderIds([]);
      setRoutingMessage(
        `${formatRobotLabel(selectedRobot)} was assigned ${routePlan.optimizedStops.length} order${
          routePlan.optimizedStops.length === 1 ? '' : 's'
        } and is now in transit.`
      );
    } catch (error) {
      setRoutingError(getDirectionsErrorMessage(error));
    } finally {
      setIsRouting(false);
    }
  }

  const previewSummary = routePreview?.routeSummary || null;

  return (
    <AdminShell
      activeNav="deliveries"
      title="Deliveries"
      description="Preview optimized address-based routes, select the next robot trip, and track delivery history from one page."
      quickPanel={{ title: 'Overview', items: [] }}
    >
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
        <SummaryCard
          iconWrapClass="bg-indigo-50 text-indigo-500"
          iconClass="fas fa-route"
          label={`Total Deliveries (${daysFilter}d)`}
          value={data.summary.total}
        />
        <SummaryCard
          iconWrapClass="bg-orange-50 text-orange-500"
          iconClass="fas fa-clock"
          label="Awaiting Robot"
          value={data.summary.order_placed}
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

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Route Planner</h3>
            <p className="text-sm text-gray-500 mt-1">
              Select awaiting orders below. Google Maps will optimize the route using the real delivery addresses and return the robot to headquarters.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-80">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order, delivery, customer, or address..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

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

        <div className="relative border-b border-gray-200 bg-gray-50">
          <div ref={mapElementRef} id={MAP_ELEMENT_ID} className="h-80 w-full" />

          {!isMapReady && !mapError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/85 px-6 text-sm text-gray-500 text-center">
              Loading map...
            </div>
          ) : null}

          {mapError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/95 px-6 text-sm text-red-600 text-center">
              {mapError}
            </div>
          ) : null}

          {isMapReady && !selectedPendingItems.length && !mapError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 px-6 text-sm text-gray-500 text-center pointer-events-none">
              Select one or more awaiting orders below to preview an optimized loop from headquarters.
            </div>
          ) : null}

          {isMapReady ? (
            <div className="absolute right-4 top-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-sm">
              Start / End: {OFS_HEADQUARTERS.name}
            </div>
          ) : null}

          {isPreviewLoading && selectedPendingItems.length ? (
            <div className="absolute left-4 top-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 shadow-sm">
              Building optimized route preview...
            </div>
          ) : null}
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Selected Orders</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {selectedOrderCount} / {ROUTE_ORDER_LIMIT}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Selected Weight</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {selectedOrderCount ? formatWeight(selectedTotalWeight) : '0.00 lbs'}
              </div>
              <div className="mt-1 text-xs text-gray-500">Max {ROUTE_WEIGHT_LIMIT_LBS} lbs</div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Preview Distance</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {previewSummary ? formatDistanceMiles(previewSummary.distance_meters) : '—'}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Estimated Drive Time</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {previewSummary ? formatDuration(previewSummary.duration_seconds) : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Robot Assignment</h4>
              <p className="text-xs text-gray-500 mt-1">
                Choose a charging robot, then send the selected awaiting orders out as one optimized trip.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              <select
                value={selectedRobotId}
                onChange={(event) => setSelectedRobotId(event.target.value)}
                disabled={!availableRobots.length || !selectedOrderCount || isRouting}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 min-w-[220px]"
              >
                {availableRobots.length ? null : <option value="">No available robots</option>}
                {availableRobots.map((robot) => (
                  <option key={robot.id} value={robot.id}>
                    {formatRobotLabel(robot)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={clearSelection}
                disabled={!selectedOrderCount || isRouting}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1 disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100 disabled:cursor-not-allowed"
              >
                <i className="fas fa-times" aria-hidden="true" />
                <span>Clear Selection</span>
              </button>

              <button
                type="button"
                onClick={handleRouteRobot}
                disabled={!selectedOrderCount || !availableRobots.length || isRouting || !isMapReady || !!previewError}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:bg-gray-300 disabled:hover:bg-gray-300 disabled:cursor-not-allowed"
              >
                <i className="fas fa-robot" aria-hidden="true" />
                <span>{isRouting ? 'Routing...' : 'Route Robot'}</span>
              </button>
            </div>
          </div>

          {!availableRobots.length ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No charging robots are available right now.
            </div>
          ) : null}

          {previewError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {previewError}
            </div>
          ) : null}

          {routingError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {routingError}
            </div>
          ) : null}

          {routingMessage ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {routingMessage}
            </div>
          ) : null}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Awaiting Robot Dispatch</h3>
            <p className="text-sm text-gray-500 mt-1">
              Select the pending orders to include in the next robot route. Limit {ROUTE_ORDER_LIMIT} orders and {ROUTE_WEIGHT_LIMIT_LBS} lbs per trip.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 w-fit">
            <i className="fas fa-clipboard-list text-gray-400" aria-hidden="true" />
            <span>
              {pendingItems.length} awaiting order{pendingItems.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Address</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Placed</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Weight</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500">
                    Loading awaiting orders...
                  </td>
                </tr>
              ) : pendingItems.length ? (
                pendingItems.map((order) => {
                  const orderId = Number(order?.pending_order_id || 0);
                  const isSelected = selectedOrderIdSet.has(orderId);
                  const blockReason = getSelectionBlockReason(order);
                  const canSelect = isSelected || !blockReason;

                  return (
                    <tr
                      key={order.table_key}
                      className={`transition-colors ${isSelected ? 'bg-green-50/60' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="font-medium text-gray-900 text-sm">{order.id}</div>
                        <div className="text-xs text-gray-500 mt-1">#{order.pending_order_id || '—'}</div>
                      </td>

                      <td className="px-6 py-4 align-top text-sm text-gray-900">
                        {order.customer_names?.length ? order.customer_names.join(', ') : 'Unknown customer'}
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="text-sm text-gray-900">{getPrimaryAddress(order) || 'Missing address'}</div>
                        <div className="text-xs text-gray-500 mt-1">Start/end loop: {OFS_HEADQUARTERS.name}</div>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="text-sm text-gray-900">{formatDateTime(order.created_at)}</div>
                        <div className="text-xs text-gray-500 mt-1">Waiting for robot dispatch</div>
                      </td>

                      <td className="px-6 py-4 align-top text-sm text-gray-900">
                        {order.total_weight_lbs === null || order.total_weight_lbs === undefined
                          ? '—'
                          : formatWeight(order.total_weight_lbs)}
                      </td>

                      <td className="px-6 py-4 align-top text-sm text-gray-900">
                        {order.revenue === null || order.revenue === undefined ? '—' : formatCurrency(order.revenue)}
                      </td>

                      <td className="px-6 py-4 align-top">
                        <span
                          className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${order.statusClass}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => toggleOrderSelection(order)}
                          disabled={!canSelect}
                          title={!canSelect ? blockReason : isSelected ? 'Remove from this route' : 'Add to this route'}
                          className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                            isSelected
                              ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                              : canSelect
                                ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-300'
                                : 'border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <i className={`fas ${isSelected ? 'fa-check' : 'fa-plus'}`} aria-hidden="true" />
                          <span>{isSelected ? 'Selected' : canSelect ? 'Select' : blockReason}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500">
                    No awaiting robot deliveries match the current search and day filters.
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
              <span className="font-medium">{pendingItems.length ? 1 : 0}</span>
              <span> to </span>
              <span className="font-medium">{pendingItems.length}</span>
              <span> of </span>
              <span className="font-medium">{pendingItems.length}</span>
              <span> awaiting deliveries</span>
            </>
          }
          pages={[1]}
          currentPage={1}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Delivery History</h3>
            <p className="text-sm text-gray-500 mt-1">
              Review current and past deliveries, including active in-transit trips and mock historical data from the seed set.
            </p>
          </div>

          <select
            value={historyStatusFilter}
            onChange={(event) => setHistoryStatusFilter(event.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
          >
            {HISTORY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customers &amp; Route</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Robot</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeline</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Weight</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500">
                    Loading delivery history...
                  </td>
                </tr>
              ) : filteredHistoryItems.length ? (
                filteredHistoryItems.map((delivery) => (
                  <tr key={delivery.table_key} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-gray-900 text-sm">{delivery.id}</div>
                      <div className="text-xs text-gray-500 mt-1">Delivery #{delivery.delivery_id || '—'}</div>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="text-sm text-gray-900">
                        {delivery.order_ids?.length
                          ? delivery.order_ids.map((orderId) => `#${orderId}`).join(', ')
                          : '—'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {delivery.order_count} order{delivery.order_count === 1 ? '' : 's'}
                      </div>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="text-sm text-gray-900">
                        {delivery.customer_names?.length ? delivery.customer_names.join(', ') : 'Unknown customer'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 space-y-1">
                        {delivery.addresses?.length ? (
                          delivery.addresses.map((address, index) => (
                            <div key={`${delivery.table_key}-address-${index}`}>{address}</div>
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

                    <td className="px-6 py-4 align-top text-sm text-gray-900">
                      {delivery.total_weight_lbs === null || delivery.total_weight_lbs === undefined
                        ? '—'
                        : formatWeight(delivery.total_weight_lbs)}
                    </td>

                    <td className="px-6 py-4 align-top text-sm text-gray-900">
                      {delivery.revenue === null || delivery.revenue === undefined
                        ? '—'
                        : formatCurrency(delivery.revenue)}
                    </td>

                    <td className="px-6 py-4 align-top">
                      <span
                        className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${delivery.statusClass}`}
                      >
                        {delivery.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500">
                    No delivery history matches the current filters.
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
              <span className="font-medium">{filteredHistoryItems.length ? 1 : 0}</span>
              <span> to </span>
              <span className="font-medium">{filteredHistoryItems.length}</span>
              <span> of </span>
              <span className="font-medium">{filteredHistoryItems.length}</span>
              <span> history rows</span>
            </>
          }
          pages={[1]}
          currentPage={1}
        />
      </div>
    </AdminShell>
  );
}
