"""
Integration Tests — Order History & Tracking
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tests for customer order history, order status tracking,
and order location APIs.

Run:  pytest tests/test_orders.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from main import app, SessionLocal

client = TestClient(app)


def login_as(email="customer@ofs.com", password="admin123"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.cookies


def login_as_manager():
    res = client.post("/api/auth/login", json={
        "email": "admin@ofs.com",
        "password": "admin123",
    })
    assert res.status_code == 200
    return res.cookies


# ══════════════════════════════════════════════════════════════════════════
#  Order History
# ══════════════════════════════════════════════════════════════════════════

class TestOrderHistory:
    """GET /api/orders/my"""

    def test_order_history_requires_auth(self):
        c = TestClient(app)
        res = c.get("/api/orders/my")
        assert res.status_code == 401

    def test_order_history_returns_orders(self):
        cookies = login_as()
        res = client.get("/api/orders/my", cookies=cookies)
        assert res.status_code == 200
        data = res.json()
        assert "orders" in data
        assert isinstance(data["orders"], list)

    def test_order_history_shape(self):
        """Orders from seed data should have correct structure."""
        cookies = login_as()
        res = client.get("/api/orders/my", cookies=cookies)
        data = res.json()

        if len(data["orders"]) > 0:
            order = data["orders"][0]
            assert "id" in order
            assert "status" in order
            assert "delivery_address" in order
            assert "delivery_fee" in order
            assert "total_price" in order
            assert "items" in order
            assert isinstance(order["items"], list)

    def test_order_items_have_details(self):
        cookies = login_as()
        res = client.get("/api/orders/my", cookies=cookies)
        data = res.json()

        if len(data["orders"]) > 0 and len(data["orders"][0]["items"]) > 0:
            item = data["orders"][0]["items"][0]
            assert "product_id" in item
            assert "name" in item
            assert "quantity" in item
            assert "unit_price" in item

    def test_different_users_see_different_orders(self):
        """Customer should only see their own orders."""
        cookies_customer = login_as("customer@ofs.com")
        cookies_maria = login_as("maria@sjsu.edu")

        res1 = client.get("/api/orders/my", cookies=cookies_customer)
        res2 = client.get("/api/orders/my", cookies=cookies_maria)

        orders1 = res1.json()["orders"]
        orders2 = res2.json()["orders"]

        ids1 = {o["id"] for o in orders1}
        ids2 = {o["id"] for o in orders2}

        # They should not overlap (different users)
        assert ids1.isdisjoint(ids2) or len(ids1) == 0 or len(ids2) == 0


# ══════════════════════════════════════════════════════════════════════════
#  Order Status Tracking
# ══════════════════════════════════════════════════════════════════════════

class TestOrderStatus:
    """GET /api/orders/{id}/status"""

    def test_status_requires_auth(self):
        c = TestClient(app)
        res = c.get("/api/orders/1/status")
        assert res.status_code == 401

    def test_status_returns_data(self):
        cookies = login_as_manager()
        res = client.get("/api/orders/1/status", cookies=cookies)
        assert res.status_code == 200
        data = res.json()
        assert "order_id" in data
        assert "status" in data
        assert "status_label" in data
        assert "delivery_address" in data
        assert "robot_label" in data

    def test_status_nonexistent_order(self):
        cookies = login_as_manager()
        res = client.get("/api/orders/99999/status", cookies=cookies)
        assert res.status_code == 404

    def test_customer_cannot_see_other_users_order(self):
        """Customer should get 403 for orders not belonging to them."""
        import time
        ts = str(int(time.time()))
        email = f"noorders_{ts}@ofs.com"

        client.post("/api/auth/register", json={
            "name": "No Orders User",
            "email": email,
            "password": "Test1234!",
        })
        cookies = login_as(email, "Test1234!")

        # Order 1 belongs to user 4 (Maria Santos)
        res = client.get("/api/orders/1/status", cookies=cookies)
        assert res.status_code == 403

    def test_admin_can_see_any_order(self):
        cookies = login_as_manager()
        res = client.get("/api/orders/1/status", cookies=cookies)
        assert res.status_code == 200

    def test_delivered_order_has_no_eta(self):
        cookies = login_as_manager()
        # Order 1 from seed is delivered
        res = client.get("/api/orders/1/status", cookies=cookies)
        data = res.json()
        assert data["eta_minutes"] is None

    def test_in_transit_order_auto_completes_after_eta(self):
        import time
        import datetime

        ts = str(int(time.time()))
        email = f"autodelivered_{ts}@ofs.com"

        client.post("/api/auth/register", json={
            "name": "Auto Delivered User",
            "email": email,
            "password": "Test1234!",
        })

        db = SessionLocal()
        try:
            user_id = db.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": email},
            ).scalar_one()

            robot_result = db.execute(
                text("INSERT INTO robots (status) VALUES ('on_delivery')")
            )
            robot_id = int(robot_result.lastrowid)

            started_at = datetime.datetime.now() - datetime.timedelta(hours=2)
            delivery_result = db.execute(
                text(
                    """
                    INSERT INTO deliveries (robot_id, status, started_at, completed_at)
                    VALUES (:robot_id, 'in_transit', :started_at, NULL)
                    """
                ),
                {"robot_id": robot_id, "started_at": started_at},
            )
            delivery_id = int(delivery_result.lastrowid)

            order_result = db.execute(
                text(
                    """
                    INSERT INTO orders (
                        user_id, delivery_id, delivery_address, delivery_fee, total_price, total_weight, payment_status, paid_at, created_at
                    ) VALUES (
                        :user_id, :delivery_id, :delivery_address, 0.00, 12.34, 2.00, 'paid', NOW(), NOW()
                    )
                    """
                ),
                {
                    "user_id": user_id,
                    "delivery_id": delivery_id,
                    "delivery_address": "1 Auto Complete Way, San Jose, CA 95112",
                },
            )
            order_id = int(order_result.lastrowid)
            db.commit()
        finally:
            db.close()

        cookies = login_as_manager()
        res = client.get(f"/api/orders/{order_id}/status", cookies=cookies)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "delivered"
        assert data["delivery_status"] == "delivered"
        assert data["eta_minutes"] is None

        db = SessionLocal()
        try:
            robot_status = db.execute(
                text("SELECT status FROM robots WHERE id = :robot_id"),
                {"robot_id": robot_id},
            ).scalar_one()
            delivery_status = db.execute(
                text("SELECT status FROM deliveries WHERE id = :delivery_id"),
                {"delivery_id": delivery_id},
            ).scalar_one()
            assert robot_status == "charging"
            assert delivery_status == "delivered"
        finally:
            db.close()


# ══════════════════════════════════════════════════════════════════════════
#  Order Location Tracking
# ══════════════════════════════════════════════════════════════════════════

class TestOrderLocation:
    """GET /api/orders/{id}/location"""

    def test_location_requires_auth(self):
        c = TestClient(app)
        res = c.get("/api/orders/1/location")
        assert res.status_code == 401

    def test_location_returns_coordinates(self):
        cookies = login_as_manager()
        res = client.get("/api/orders/1/location", cookies=cookies)
        assert res.status_code == 200
        data = res.json()
        assert "current_location" in data
        assert "store_location" in data
        assert "destination_location" in data
        assert "route" in data
        assert "progress" in data
        assert "lat" in data["current_location"]
        assert "lng" in data["current_location"]

    def test_delivered_order_progress_is_1(self):
        cookies = login_as_manager()
        # Order 1 is delivered
        res = client.get("/api/orders/1/location", cookies=cookies)
        data = res.json()
        assert data["progress"] == 1.0

    def test_location_nonexistent_order(self):
        cookies = login_as_manager()
        res = client.get("/api/orders/99999/location", cookies=cookies)
        assert res.status_code == 404

    def test_location_has_route_array(self):
        cookies = login_as_manager()
        res = client.get("/api/orders/1/location", cookies=cookies)
        data = res.json()
        assert isinstance(data["route"], list)
        assert len(data["route"]) >= 2
        for point in data["route"]:
            assert "lat" in point
            assert "lng" in point
