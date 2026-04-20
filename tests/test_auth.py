"""
Unit Tests — Auth Layer
~~~~~~~~~~~~~~~~~~~~~~~
Tests for register, login, /me, logout, and role-based middleware.
Uses FastAPI's TestClient (via httpx) against the real app with a
live test database connection.

Run:  venv\Scripts\pytest tests/test_auth.py -v
"""

import pytest
from fastapi.testclient import TestClient
from main import app, get_db, hash_password, verify_password, create_jwt, decode_jwt

# ── Test client ─────────────────────────────────────────────────────────────
client = TestClient(app)

def fresh_client():
    """Returns a new TestClient with no stored cookies."""
    return TestClient(app)

# Unique email per test run to avoid collisions with seed data
import time
_ts = str(int(time.time()))
TEST_EMAIL = f"test_{_ts}@ofs.com"
TEST_PASSWORD = "Test1234!"
TEST_NAME = "Test Runner"


# ══════════════════════════════════════════════════════════════════════════
#  Helper-function unit tests
# ══════════════════════════════════════════════════════════════════════════

class TestPasswordHashing:
    """Tests for hash_password / verify_password helpers."""

    def test_hash_is_not_plain_text(self):
        hashed = hash_password("secret123")
        assert hashed != "secret123"
        assert hashed.startswith("$2b$")  # bcrypt prefix

    def test_verify_correct_password(self):
        hashed = hash_password("hello")
        assert verify_password("hello", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("hello")
        assert verify_password("wrong", hashed) is False

    def test_different_hashes_for_same_input(self):
        h1 = hash_password("abc")
        h2 = hash_password("abc")
        assert h1 != h2  # bcrypt salts are random


class TestJWT:
    """Tests for create_jwt / decode_jwt helpers."""

    def test_create_and_decode(self):
        token = create_jwt(user_id=42, role="customer")
        payload = decode_jwt(token)
        assert payload["sub"] == "42"
        assert payload["role"] == "customer"
        assert "exp" in payload

    def test_decode_invalid_token_raises(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            decode_jwt("totally.invalid.token")
        assert exc_info.value.status_code == 401


# ══════════════════════════════════════════════════════════════════════════
#  API endpoint integration tests
# ══════════════════════════════════════════════════════════════════════════

class TestRegister:
    """POST /api/auth/register"""

    def test_register_success(self):
        response = client.post("/api/auth/register", json={
            "name": TEST_NAME,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Registration successful"

    def test_register_duplicate_email(self):
        """Registering with the same email twice should fail."""
        response = client.post("/api/auth/register", json={
            "name": "Dupe",
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 409
        assert "already registered" in response.json()["detail"].lower()

    def test_register_missing_fields(self):
        """Missing required fields should fail validation."""
        response = client.post("/api/auth/register", json={
            "email": "incomplete@ofs.com",
        })
        assert response.status_code == 422  # Pydantic validation error


class TestLogin:
    """POST /api/auth/login"""

    def test_login_success(self):
        response = client.post("/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == TEST_NAME
        assert data["role"] == "customer"
        # Should set auth_token cookie
        assert "auth_token" in response.cookies

    def test_login_wrong_password(self):
        response = client.post("/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": "WrongPass!",
        })
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self):
        response = client.post("/api/auth/login", json={
            "email": "nobody@ofs.com",
            "password": "whatever",
        })
        assert response.status_code == 401

    def test_login_sets_httponly_cookie(self):
        response = client.post("/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        # Check the Set-Cookie header for httponly flag
        set_cookie = response.headers.get("set-cookie", "")
        assert "httponly" in set_cookie.lower()


class TestMe:
    """GET /api/auth/me"""

    def test_me_with_valid_session(self):
        # Login first to get cookie
        login_resp = client.post("/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        cookies = login_resp.cookies

        # Call /me with the cookie
        me_resp = client.get("/api/auth/me", cookies=cookies)
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["email"] == TEST_EMAIL
        assert data["name"] == TEST_NAME
        assert data["role"] == "customer"

    def test_me_without_cookie(self):
        c = fresh_client()
        me_resp = c.get("/api/auth/me")
        assert me_resp.status_code == 401

    def test_me_with_invalid_cookie(self):
        me_resp = client.get("/api/auth/me", cookies={"auth_token": "garbage"})
        assert me_resp.status_code == 401


class TestLogout:
    """POST /api/auth/logout"""

    def test_logout_clears_cookie(self):
        # Login first
        login_resp = client.post("/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        cookies = login_resp.cookies

        # Logout
        logout_resp = client.post("/api/auth/logout", cookies=cookies)
        assert logout_resp.status_code == 200

        # Cookie should be cleared (max-age=0 or equivalent)
        set_cookie = logout_resp.headers.get("set-cookie", "")
        # The cookie value should be empty or the max-age should be 0
        assert 'auth_token=""' in set_cookie or "max-age=0" in set_cookie.lower()


class TestAuthMiddleware:
    """Tests for require_auth and require_role dependencies."""

    def test_protected_product_detail_accessible(self):
        """Product detail should be accessible (it's a public read endpoint)."""
        response = client.get("/api/products/1")
        # Should work without auth (product endpoints are public reads)
        assert response.status_code == 200

    def test_seeded_admin_can_login(self):
        """The seeded admin@ofs.com account should work."""
        response = client.post("/api/auth/login", json={
            "email": "admin@ofs.com",
            "password": "admin123",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "manager"

    def test_seeded_employee_can_login(self):
        """The seeded employee@ofs.com account should work."""
        response = client.post("/api/auth/login", json={
            "email": "employee@ofs.com",
            "password": "admin123",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "employee"

    def test_require_auth_dependency_blocks_no_cookie(self):
        """Calling /api/auth/me without cookie should get 401."""
        c = fresh_client()
        response = c.get("/api/auth/me")
        assert response.status_code == 401
        assert "not authenticated" in response.json()["detail"].lower()

    def test_require_auth_dependency_blocks_bad_token(self):
        """Calling /api/auth/me with garbage token should get 401."""
        response = client.get("/api/auth/me", cookies={"auth_token": "bad.token.here"})
        assert response.status_code == 401


class TestProducts:
    """GET /api/products — search, filter, sort, pagination."""

    def test_products_returns_items(self):
        response = client.get("/api/products")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) > 0

    def test_products_search(self):
        response = client.get("/api/products?search=apple")
        data = response.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert "apple" in item["name"].lower()

    def test_products_category_filter(self):
        response = client.get("/api/products?category=Dairy")
        data = response.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["category"] == "Dairy"

    def test_products_pagination(self):
        response = client.get("/api/products?page=1&per_page=3")
        data = response.json()
        assert len(data["items"]) <= 3
        assert data["page"] == 1
        assert data["per_page"] == 3

    def test_products_sort_price_desc(self):
        response = client.get("/api/products?sort=price&order=desc")
        data = response.json()
        prices = [item["price"] for item in data["items"]]
        assert prices == sorted(prices, reverse=True)

    def test_product_detail(self):
        response = client.get("/api/products/1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert "name" in data
        assert "stock" in data

    def test_product_not_found(self):
        response = client.get("/api/products/99999")
        assert response.status_code == 404


class TestAdminDashboard:
    """GET /api/admin/dashboard"""

    def test_admin_dashboard_requires_admin_role(self):
        customer_login = client.post("/api/auth/login", json={
            "email": "customer@ofs.com",
            "password": "admin123",
        })
        assert customer_login.status_code == 200

        response = client.get("/api/admin/dashboard", cookies=customer_login.cookies)
        assert response.status_code == 403

    def test_admin_dashboard_returns_expected_shape_for_manager(self):
        admin_login = client.post("/api/auth/login", json={
            "email": "admin@ofs.com",
            "password": "admin123",
        })
        assert admin_login.status_code == 200

        response = client.get("/api/admin/dashboard", cookies=admin_login.cookies)
        assert response.status_code == 200

        data = response.json()
        assert "stats" in data
        assert "activity" in data
        assert "quick_panel" in data
        assert "revenue_chart" in data
        assert len(data["stats"]) == 4


class TestAdminProducts:
    """GET /api/admin/products"""

    def test_admin_products_requires_admin_role(self):
        customer_login = client.post("/api/auth/login", json={
            "email": "customer@ofs.com",
            "password": "admin123",
        })
        assert customer_login.status_code == 200

        response = client.get("/api/admin/products", cookies=customer_login.cookies)
        assert response.status_code == 403

    def test_admin_products_returns_inventory_payload(self):
        employee_login = client.post("/api/auth/login", json={
            "email": "employee@ofs.com",
            "password": "admin123",
        })
        assert employee_login.status_code == 200

        response = client.get("/api/admin/products", cookies=employee_login.cookies)
        assert response.status_code == 200

        data = response.json()
        assert "summary" in data
        assert "quick_panel" in data
        assert "categories" in data
        assert "items" in data
        assert isinstance(data["items"], list)


class TestAdminOrders:
    """GET /api/admin/orders"""

    def test_admin_orders_requires_admin_role(self):
        customer_login = client.post("/api/auth/login", json={
            "email": "customer@ofs.com",
            "password": "admin123",
        })
        assert customer_login.status_code == 200

        response = client.get("/api/admin/orders", cookies=customer_login.cookies)
        assert response.status_code == 403

    def test_admin_orders_returns_orders_payload(self):
        employee_login = client.post("/api/auth/login", json={
            "email": "employee@ofs.com",
            "password": "admin123",
        })
        assert employee_login.status_code == 200

        response = client.get("/api/admin/orders", cookies=employee_login.cookies)
        assert response.status_code == 200

        data = response.json()
        assert "quick_panel" in data
        assert "cards" in data
        assert "map_points" in data
        assert isinstance(data["cards"], list)
