"""
E2E Smoke Test — Happy Path
~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Full end-to-end test: register → browse → add to cart → checkout → verify order.
This validates the complete user journey works correctly.

Run:  pytest tests/test_e2e.py -v
"""

import time
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestE2EHappyPath:
    """Complete user journey from registration to order placement."""

    def test_full_customer_journey(self):
        ts = str(int(time.time()))
        email = f"e2e_user_{ts}@ofs.com"
        password = "E2ETest1234!"

        # ── Step 1: Register ─────────────────────────────────────────
        reg_res = client.post("/api/auth/register", json={
            "name": "E2E Test User",
            "email": email,
            "password": password,
        })
        assert reg_res.status_code == 200, f"Registration failed: {reg_res.json()}"
        assert reg_res.json()["role"] == "customer"

        # ── Step 2: Login ────────────────────────────────────────────
        login_res = client.post("/api/auth/login", json={
            "email": email,
            "password": password,
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.json()}"
        cookies = login_res.cookies
        assert "auth_token" in cookies

        user_data = login_res.json()
        assert user_data["role"] == "customer"
        assert user_data["name"] == "E2E Test User"

        # ── Step 3: Verify session (/me) ─────────────────────────────
        me_res = client.get("/api/auth/me", cookies=cookies)
        assert me_res.status_code == 200
        assert me_res.json()["email"] == email

        # ── Step 4: Browse products ──────────────────────────────────
        products_res = client.get("/api/products", cookies=cookies)
        assert products_res.status_code == 200

        products = products_res.json()["items"]
        assert len(products) > 0, "No products available"

        # Find an in-stock product
        available = [p for p in products if p["is_available"] and p["stock"] > 0]
        assert len(available) > 0, "No in-stock products"

        product1 = available[0]
        product2 = available[1] if len(available) > 1 else None

        # ── Step 5: Search for a product ─────────────────────────────
        search_res = client.get(f"/api/products?search={product1['name'][:3]}", cookies=cookies)
        assert search_res.status_code == 200
        search_items = search_res.json()["items"]
        assert len(search_items) > 0, "Search returned no results"

        # ── Step 6: View product detail ──────────────────────────────
        detail_res = client.get(f"/api/products/{product1['id']}", cookies=cookies)
        assert detail_res.status_code == 200
        assert detail_res.json()["id"] == product1["id"]

        # ── Step 7: Add items to cart ────────────────────────────────
        add_res = client.post("/api/cart/items", json={
            "product_id": product1["id"],
            "quantity": 1,
        }, cookies=cookies)
        assert add_res.status_code == 200

        cart = add_res.json()
        assert len(cart["items"]) >= 1

        # Add second product if available
        if product2:
            add_res2 = client.post("/api/cart/items", json={
                "product_id": product2["id"],
                "quantity": 2,
            }, cookies=cookies)
            assert add_res2.status_code == 200

        # ── Step 8: Verify cart state ────────────────────────────────
        cart_res = client.get("/api/cart", cookies=cookies)
        assert cart_res.status_code == 200
        cart_data = cart_res.json()
        assert len(cart_data["items"]) >= 1
        assert cart_data["summary"]["subtotal"] > 0
        assert cart_data["summary"]["total"] > 0
        assert cart_data["summary"]["total_weight_lbs"] > 0

        # ── Step 9: Checkout ─────────────────────────────────────────
        checkout_res = client.post("/api/cart/checkout", json={
            "delivery_address": "100 E2E Test Blvd, San Jose, CA 95112",
        }, cookies=cookies)
        assert checkout_res.status_code == 200, f"Checkout failed: {checkout_res.json()}"

        order_data = checkout_res.json()
        assert order_data["message"] == "Checkout successful"
        assert order_data["payment_status"] == "paid"
        order_id = order_data["order_id"]
        assert order_id > 0

        # ── Step 10: Cart should be empty ────────────────────────────
        empty_cart = client.get("/api/cart", cookies=cookies)
        assert empty_cart.status_code == 200
        assert len(empty_cart.json()["items"]) == 0

        # ── Step 11: Order appears in history ────────────────────────
        history_res = client.get("/api/orders/my", cookies=cookies)
        assert history_res.status_code == 200
        orders = history_res.json()["orders"]
        order_ids = [o["id"] for o in orders]
        assert order_id in order_ids, f"Order {order_id} not in history"

        placed_order = next(o for o in orders if o["id"] == order_id)
        assert placed_order["delivery_address"] == "100 E2E Test Blvd, San Jose, CA 95112"
        assert placed_order["status"] == "processing"
        assert len(placed_order["items"]) >= 1

        # ── Step 12: Check order status ──────────────────────────────
        status_res = client.get(f"/api/orders/{order_id}/status", cookies=cookies)
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["order_id"] == order_id
        assert status_data["status"] == "processing"
        assert status_data["status_label"] == "Preparing"

        # ── Step 13: Logout ──────────────────────────────────────────
        logout_res = client.post("/api/auth/logout", cookies=cookies)
        assert logout_res.status_code == 200

        # ── Step 14: Cannot access protected routes after logout ─────
        c = TestClient(app)
        me_after = c.get("/api/auth/me")
        assert me_after.status_code == 401


class TestE2EAdminFlow:
    """Admin flow: login → view dashboard → manage inventory → dispatch order."""

    def test_admin_management_journey(self):
        # ── Login as manager ─────────────────────────────────────────
        login_res = client.post("/api/auth/login", json={
            "email": "admin@ofs.com",
            "password": "admin123",
        })
        assert login_res.status_code == 200
        cookies = login_res.cookies
        assert login_res.json()["role"] == "manager"

        # ── View dashboard ───────────────────────────────────────────
        dash_res = client.get("/api/admin/dashboard", cookies=cookies)
        assert dash_res.status_code == 200
        dash = dash_res.json()
        assert "stats" in dash
        assert "activity" in dash

        # ── View inventory ───────────────────────────────────────────
        inv_res = client.get("/api/admin/inventory", cookies=cookies)
        assert inv_res.status_code == 200
        assert len(inv_res.json()["items"]) > 0

        # ── Create a product ─────────────────────────────────────────
        create_res = client.post("/api/admin/inventory/products", json={
            "name": "E2E Admin Product",
            "description": "Created during E2E test",
            "price": 12.99,
            "cost_price": 7.00,
            "weight_lbs": 2.0,
            "category": "Test",
            "stock_quantity": 25,
            "low_stock_threshold": 5,
            "is_organic": True,
        }, cookies=cookies)
        assert create_res.status_code == 200
        new_product_id = create_res.json()["id"]

        # ── Update the product ───────────────────────────────────────
        update_res = client.put(f"/api/admin/inventory/products/{new_product_id}", json={
            "name": "E2E Admin Product Updated",
            "price": 14.99,
            "cost_price": 8.00,
            "weight_lbs": 2.5,
            "category": "Test",
            "stock_quantity": 30,
            "low_stock_threshold": 5,
            "is_organic": True,
        }, cookies=cookies)
        assert update_res.status_code == 200
        assert update_res.json()["name"] == "E2E Admin Product Updated"
        assert update_res.json()["stock_quantity"] == 30

        # ── View orders ──────────────────────────────────────────────
        orders_res = client.get("/api/admin/orders", cookies=cookies)
        assert orders_res.status_code == 200
        assert "cards" in orders_res.json()

        # ── View deliveries ──────────────────────────────────────────
        del_res = client.get("/api/admin/deliveries", cookies=cookies)
        assert del_res.status_code == 200

        # ── View robots ──────────────────────────────────────────────
        rob_res = client.get("/api/admin/robots", cookies=cookies)
        assert rob_res.status_code == 200
        assert rob_res.json()["summary"]["total"] > 0

        # ── View financials ──────────────────────────────────────────
        fin_res = client.get("/api/admin/financial", cookies=cookies)
        assert fin_res.status_code == 200

        # ── Delete test product ──────────────────────────────────────
        del_prod = client.delete(f"/api/admin/inventory/products/{new_product_id}", cookies=cookies)
        assert del_prod.status_code == 200

        # ── Generate invite code ─────────────────────────────────────
        invite_res = client.post("/api/admin/invite-codes", json={
            "role": "employee",
            "note": "E2E test invite",
        }, cookies=cookies)
        assert invite_res.status_code == 200
        assert invite_res.json()["code"].startswith("OFS-")
