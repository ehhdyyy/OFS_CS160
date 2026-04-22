"""
Unit + Integration Tests — Cart & Checkout
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tests for cart add/update/delete, delivery fee calculation,
checkout flow, stock validation, and edge cases.

Run:  pytest tests/test_cart.py -v
"""

import pytest
from fastapi.testclient import TestClient
from main import app, calculate_delivery_fee
from decimal import Decimal

client = TestClient(app)


def login_as(email="customer@ofs.com", password="admin123"):
    """Login and return cookies."""
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.cookies


# ══════════════════════════════════════════════════════════════════════════
#  Unit tests — delivery fee calculation
# ══════════════════════════════════════════════════════════════════════════

class TestDeliveryFeeCalculation:
    """Pure function tests for calculate_delivery_fee."""

    def test_free_delivery_under_20_lbs(self):
        assert calculate_delivery_fee(Decimal("19.99")) == Decimal("0.00")

    def test_free_delivery_at_zero(self):
        assert calculate_delivery_fee(Decimal("0.00")) == Decimal("0.00")

    def test_free_delivery_at_1_lb(self):
        assert calculate_delivery_fee(Decimal("1.00")) == Decimal("0.00")

    def test_fee_at_exactly_20_lbs(self):
        """Boundary: exactly 20 lbs should trigger fee."""
        assert calculate_delivery_fee(Decimal("20.00")) == Decimal("10.00")

    def test_fee_above_20_lbs(self):
        assert calculate_delivery_fee(Decimal("25.00")) == Decimal("10.00")

    def test_fee_at_100_lbs(self):
        assert calculate_delivery_fee(Decimal("100.00")) == Decimal("10.00")

    def test_boundary_just_below_20(self):
        assert calculate_delivery_fee(Decimal("19.999")) == Decimal("0.00")


# ══════════════════════════════════════════════════════════════════════════
#  Integration tests — Cart CRUD
# ══════════════════════════════════════════════════════════════════════════

class TestCartOperations:
    """Cart add, update, remove, and fetch."""

    def test_get_cart_requires_auth(self):
        c = TestClient(app)
        res = c.get("/api/cart")
        assert res.status_code == 401

    def test_get_empty_cart(self):
        """Fresh user cart should return items list."""
        import time
        ts = str(int(time.time()))
        email = f"carttest_{ts}@ofs.com"

        client.post("/api/auth/register", json={
            "name": "Cart Tester",
            "email": email,
            "password": "Test1234!",
        })
        cookies = login_as(email, "Test1234!")

        res = client.get("/api/cart", cookies=cookies)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_add_item_to_cart(self):
        cookies = login_as()

        res = client.post("/api/cart/items", json={
            "product_id": 1,
            "quantity": 1,
        }, cookies=cookies)

        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        product_ids = [item["product_id"] for item in data["items"]]
        assert 1 in product_ids

    def test_add_item_invalid_product(self):
        cookies = login_as()

        res = client.post("/api/cart/items", json={
            "product_id": 99999,
            "quantity": 1,
        }, cookies=cookies)

        assert res.status_code == 404

    def test_add_item_zero_quantity_rejected(self):
        """Quantity must be >= 1."""
        cookies = login_as()

        res = client.post("/api/cart/items", json={
            "product_id": 1,
            "quantity": 0,
        }, cookies=cookies)

        assert res.status_code == 422  # Pydantic validation

    def test_add_item_negative_quantity_rejected(self):
        cookies = login_as()

        res = client.post("/api/cart/items", json={
            "product_id": 1,
            "quantity": -5,
        }, cookies=cookies)

        assert res.status_code == 422

    def test_update_cart_item_quantity(self):
        cookies = login_as()

        # Add first
        client.post("/api/cart/items", json={
            "product_id": 2,
            "quantity": 1,
        }, cookies=cookies)

        # Update to 2
        res = client.put("/api/cart/items/2", json={
            "quantity": 2,
        }, cookies=cookies)

        assert res.status_code == 200
        data = res.json()
        item = next((i for i in data["items"] if i["product_id"] == 2), None)
        if item:
            assert item["quantity"] == 2

    def test_update_cart_item_to_zero_removes(self):
        cookies = login_as()

        # Add first
        client.post("/api/cart/items", json={
            "product_id": 3,
            "quantity": 1,
        }, cookies=cookies)

        # Update to 0 should remove
        res = client.put("/api/cart/items/3", json={
            "quantity": 0,
        }, cookies=cookies)

        assert res.status_code == 200
        data = res.json()
        product_ids = [item["product_id"] for item in data["items"]]
        assert 3 not in product_ids

    def test_delete_cart_item(self):
        cookies = login_as()

        # Add first
        client.post("/api/cart/items", json={
            "product_id": 4,
            "quantity": 1,
        }, cookies=cookies)

        # Delete
        res = client.delete("/api/cart/items/4", cookies=cookies)
        assert res.status_code == 200
        data = res.json()
        product_ids = [item["product_id"] for item in data["items"]]
        assert 4 not in product_ids

    def test_exceeding_stock_rejected(self):
        cookies = login_as()

        res = client.post("/api/cart/items", json={
            "product_id": 1,
            "quantity": 9999,
        }, cookies=cookies)

        assert res.status_code == 400
        assert "stock" in res.json()["detail"].lower()

    def test_cart_returns_summary(self):
        cookies = login_as()

        res = client.get("/api/cart", cookies=cookies)
        assert res.status_code == 200
        data = res.json()
        assert "summary" in data
        assert "subtotal" in data["summary"]
        assert "total_weight_lbs" in data["summary"]
        assert "delivery_fee" in data["summary"]
        assert "total" in data["summary"]


# ══════════════════════════════════════════════════════════════════════════
#  Integration tests — Checkout
# ══════════════════════════════════════════════════════════════════════════

class TestCheckout:
    """Checkout flow tests."""

    def test_checkout_empty_cart_fails(self):
        import time
        ts = str(int(time.time()))
        email = f"checkout_empty_{ts}@ofs.com"

        client.post("/api/auth/register", json={
            "name": "Empty Cart",
            "email": email,
            "password": "Test1234!",
        })
        cookies = login_as(email, "Test1234!")

        res = client.post("/api/cart/checkout", json={
            "delivery_address": "123 Test St",
        }, cookies=cookies)

        assert res.status_code == 400
        assert "empty" in res.json()["detail"].lower()

    def test_checkout_no_address_and_no_profile_address_fails(self):
        import time
        ts = str(int(time.time()))
        email = f"checkout_noaddr_{ts}@ofs.com"

        client.post("/api/auth/register", json={
            "name": "No Address",
            "email": email,
            "password": "Test1234!",
        })
        cookies = login_as(email, "Test1234!")

        # Add item
        client.post("/api/cart/items", json={
            "product_id": 2,
            "quantity": 1,
        }, cookies=cookies)

        # Checkout without address
        res = client.post("/api/cart/checkout", json={}, cookies=cookies)
        assert res.status_code == 400
        assert "address" in res.json()["detail"].lower()

    def test_checkout_success(self):
        import time
        ts = str(int(time.time()))
        email = f"checkout_ok_{ts}@ofs.com"

        client.post("/api/auth/register", json={
            "name": "Checkout User",
            "email": email,
            "password": "Test1234!",
        })
        cookies = login_as(email, "Test1234!")

        # Add item
        client.post("/api/cart/items", json={
            "product_id": 2,
            "quantity": 1,
        }, cookies=cookies)

        # Checkout
        res = client.post("/api/cart/checkout", json={
            "delivery_address": "456 Checkout Ave",
        }, cookies=cookies)

        assert res.status_code == 200
        data = res.json()
        assert data["message"] == "Checkout successful"
        assert "order_id" in data
        assert data["payment_status"] == "paid"
        assert "total_price" in data

    def test_checkout_clears_cart(self):
        import time
        ts = str(int(time.time()))
        email = f"checkout_clear_{ts}@ofs.com"

        client.post("/api/auth/register", json={
            "name": "Clear Cart",
            "email": email,
            "password": "Test1234!",
        })
        cookies = login_as(email, "Test1234!")

        client.post("/api/cart/items", json={
            "product_id": 14,
            "quantity": 1,
        }, cookies=cookies)

        client.post("/api/cart/checkout", json={
            "delivery_address": "789 Clear St",
        }, cookies=cookies)

        # Cart should be empty now
        res = client.get("/api/cart", cookies=cookies)
        assert res.status_code == 200
        assert len(res.json()["items"]) == 0

    def test_checkout_requires_auth(self):
        c = TestClient(app)
        res = c.post("/api/cart/checkout", json={
            "delivery_address": "123 Test St",
        })
        assert res.status_code == 401
