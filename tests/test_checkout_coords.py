"""
Tests — Checkout with delivery coordinates (delivery_lat / delivery_lng)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Covers:
  - CheckoutRequest Pydantic model accepts / omits the new optional fields
  - POST /api/cart/checkout writes delivery_latitude / delivery_longitude to the
    orders table when coordinates are supplied
  - Backward compatibility: requests that omit coordinates still succeed, and
    the columns are left NULL
  - Full integration: a payload containing all three fields (delivery_address,
    delivery_lat, delivery_lng) is persisted correctly end-to-end

No real Geocoding API is called — coordinates are provided directly by the
caller (the frontend geocodes before POSTing).

Run:  pytest tests/test_checkout_coords.py -v
"""

import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from main import app, engine

client = TestClient(app)

# ── shared helpers ────────────────────────────────────────────────────────────

def _register_and_login(prefix: str = "coordtest") -> tuple:
    """Register a fresh user, log in, and return (cookies, email)."""
    ts = str(int(time.time() * 1000))
    email = f"{prefix}_{ts}@ofs.com"
    client.post("/api/auth/register", json={
        "name": "Coord Test",
        "email": email,
        "password": "Test1234!",
    })
    res = client.post("/api/auth/login", json={"email": email, "password": "Test1234!"})
    assert res.status_code == 200, f"Login failed for {email}"
    return res.cookies, email


def _seed_cart(cookies, product_id: int = 2, quantity: int = 1) -> None:
    res = client.post("/api/cart/items",
                      json={"product_id": product_id, "quantity": quantity},
                      cookies=cookies)
    assert res.status_code == 200, "Failed to seed cart"


def _fetch_order_coords(order_id: int) -> tuple:
    """Return (delivery_latitude, delivery_longitude) directly from the DB."""
    with engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT delivery_latitude, delivery_longitude "
                "FROM orders WHERE id = :id"
            ),
            {"id": order_id},
        ).fetchone()
    assert row is not None, f"Order {order_id} not found in DB"
    return row.delivery_latitude, row.delivery_longitude


def _fetch_order_address_and_coords(order_id: int) -> tuple:
    """Return (delivery_address, delivery_latitude, delivery_longitude) from the DB."""
    with engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT delivery_address, delivery_latitude, delivery_longitude "
                "FROM orders WHERE id = :id"
            ),
            {"id": order_id},
        ).fetchone()
    assert row is not None, f"Order {order_id} not found in DB"
    return row.delivery_address, row.delivery_latitude, row.delivery_longitude


# ══════════════════════════════════════════════════════════════════════════════
#  Unit — CheckoutRequest Pydantic model
# ══════════════════════════════════════════════════════════════════════════════

class TestCheckoutRequestModel:
    """CheckoutRequest accepts the new optional coordinate fields."""

    def test_model_accepts_delivery_lat_and_lng(self):
        from main import CheckoutRequest
        req = CheckoutRequest(
            delivery_address="300 E Santa Clara St, San Jose, CA 95113",
            delivery_lat=37.335,
            delivery_lng=-121.885,
        )
        assert req.delivery_lat == pytest.approx(37.335)
        assert req.delivery_lng == pytest.approx(-121.885)

    def test_model_accepts_omitted_coords(self):
        """delivery_lat and delivery_lng default to None when not provided."""
        from main import CheckoutRequest
        req = CheckoutRequest(delivery_address="123 Main St")
        assert req.delivery_lat is None
        assert req.delivery_lng is None

    def test_model_accepts_explicit_none_coords(self):
        from main import CheckoutRequest
        req = CheckoutRequest(
            delivery_address="123 Main St",
            delivery_lat=None,
            delivery_lng=None,
        )
        assert req.delivery_lat is None
        assert req.delivery_lng is None

    def test_model_accepts_float_coords(self):
        """Both integer-like and full-precision floats are accepted."""
        from main import CheckoutRequest
        req = CheckoutRequest(
            delivery_address="55 S Market St",
            delivery_lat=37.0,
            delivery_lng=-121.0,
        )
        assert req.delivery_lat == pytest.approx(37.0)
        assert req.delivery_lng == pytest.approx(-121.0)


# ══════════════════════════════════════════════════════════════════════════════
#  Integration — POST /api/cart/checkout with coordinates
# ══════════════════════════════════════════════════════════════════════════════

class TestCheckoutWithCoordinates:
    """Endpoint-level tests: request body → DB state."""

    def test_checkout_without_coords_succeeds(self):
        """Backward compat: omitting delivery_lat / delivery_lng still works."""
        cookies, _ = _register_and_login("no_coords")
        _seed_cart(cookies)

        res = client.post("/api/cart/checkout", json={
            "delivery_address": "456 Test Ave, San Jose, CA 95113",
        }, cookies=cookies)

        assert res.status_code == 200
        assert "order_id" in res.json()

    def test_checkout_without_coords_leaves_db_columns_null(self):
        """When coords are omitted, delivery_latitude / delivery_longitude are NULL."""
        cookies, _ = _register_and_login("null_db")
        _seed_cart(cookies)

        res = client.post("/api/cart/checkout", json={
            "delivery_address": "789 No Coords Rd",
        }, cookies=cookies)

        assert res.status_code == 200
        lat, lng = _fetch_order_coords(res.json()["order_id"])
        assert lat is None
        assert lng is None

    def test_checkout_with_explicit_null_coords_succeeds(self):
        """Explicitly passing null for both coord fields is accepted."""
        cookies, _ = _register_and_login("null_coords")
        _seed_cart(cookies)

        res = client.post("/api/cart/checkout", json={
            "delivery_address": "123 Null Ave",
            "delivery_lat": None,
            "delivery_lng": None,
        }, cookies=cookies)

        assert res.status_code == 200

    def test_checkout_stores_coordinates_in_orders_table(self):
        """delivery_lat / delivery_lng in the request are written to the DB."""
        cookies, _ = _register_and_login("with_coords")
        _seed_cart(cookies)

        lat, lng = 37.335, -121.885
        res = client.post("/api/cart/checkout", json={
            "delivery_address": "300 E Santa Clara St, San Jose, CA 95113",
            "delivery_lat": lat,
            "delivery_lng": lng,
        }, cookies=cookies)

        assert res.status_code == 200
        db_lat, db_lng = _fetch_order_coords(res.json()["order_id"])
        assert float(db_lat) == pytest.approx(lat)
        assert float(db_lng) == pytest.approx(lng)

    def test_checkout_stores_high_precision_coordinates(self):
        """Seven decimal places of precision are preserved (DECIMAL(10,7) column)."""
        cookies, _ = _register_and_login("precision")
        _seed_cart(cookies)

        lat, lng = 37.3382657, -121.8863400
        res = client.post("/api/cart/checkout", json={
            "delivery_address": "55 S Market St, San Jose, CA 95113",
            "delivery_lat": lat,
            "delivery_lng": lng,
        }, cookies=cookies)

        assert res.status_code == 200
        db_lat, db_lng = _fetch_order_coords(res.json()["order_id"])
        assert float(db_lat) == pytest.approx(lat, abs=1e-6)
        assert float(db_lng) == pytest.approx(lng, abs=1e-6)

    def test_checkout_response_shape_unchanged(self):
        """Adding coords does not break the existing response contract."""
        cookies, _ = _register_and_login("shape")
        _seed_cart(cookies)

        res = client.post("/api/cart/checkout", json={
            "delivery_address": "100 Shape St",
            "delivery_lat": 37.335,
            "delivery_lng": -121.885,
        }, cookies=cookies)

        assert res.status_code == 200
        data = res.json()
        assert data["message"] == "Checkout successful"
        assert "order_id" in data
        assert data["payment_status"] == "paid"
        assert "total_price" in data


# ══════════════════════════════════════════════════════════════════════════════
#  Integration — full end-to-end payload verification
# ══════════════════════════════════════════════════════════════════════════════

class TestCheckoutCoordsIntegration:
    """
    Simulate the payload the frontend sends after a successful geocoding call:
    delivery_address + delivery_lat + delivery_lng all written correctly.
    """

    def test_full_payload_persists_address_and_coords(self):
        """
        The complete checkout payload (address + lat + lng) is stored exactly
        as sent, matching what the Delivery Scheduling and Route Optimization
        services will later read from the orders table.
        """
        cookies, _ = _register_and_login("integration")
        _seed_cart(cookies, product_id=3)

        address = "55 S Market St, San Jose, CA 95113"
        lat, lng = 37.3382, -121.8863

        res = client.post("/api/cart/checkout", json={
            "delivery_address": address,
            "delivery_lat": lat,
            "delivery_lng": lng,
        }, cookies=cookies)

        assert res.status_code == 200
        order_id = res.json()["order_id"]

        db_address, db_lat, db_lng = _fetch_order_address_and_coords(order_id)
        assert db_address == address
        assert float(db_lat) == pytest.approx(lat)
        assert float(db_lng) == pytest.approx(lng)

    def test_out_of_bounds_coords_are_a_frontend_concern_only(self):
        """
        The backend stores any coordinates it receives without bounds-checking —
        the Downtown San Jose boundary is enforced exclusively by the frontend
        geocoding validation before the POST is ever sent.
        """
        cookies, _ = _register_and_login("oob")
        _seed_cart(cookies, product_id=3)

        # Coordinates deliberately outside the Downtown SJ bounding box
        lat, lng = 37.40, -122.0

        res = client.post("/api/cart/checkout", json={
            "delivery_address": "999 Outside Area Rd",
            "delivery_lat": lat,
            "delivery_lng": lng,
        }, cookies=cookies)

        assert res.status_code == 200
        db_lat, db_lng = _fetch_order_coords(res.json()["order_id"])
        assert float(db_lat) == pytest.approx(lat)
        assert float(db_lng) == pytest.approx(lng)

    def test_checkout_requires_auth_even_with_coords(self):
        """Auth check is unaffected by the new coordinate fields."""
        unauthenticated = TestClient(app)
        res = unauthenticated.post("/api/cart/checkout", json={
            "delivery_address": "123 Auth Test St",
            "delivery_lat": 37.335,
            "delivery_lng": -121.885,
        })
        assert res.status_code == 401
