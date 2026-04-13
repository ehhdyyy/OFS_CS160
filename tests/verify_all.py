"""
Comprehensive verification script — tests all new endpoints and integrations.
"""
import sys
sys.path.insert(0, ".")

from fastapi.testclient import TestClient
from main import app
from route_service import get_delivery_route, batch_route_optimization

c = TestClient(app)
passed = 0
failed = 0

def check(label, condition, detail=""):
    global passed, failed
    if condition:
        print(f"  PASS  {label}")
        passed += 1
    else:
        print(f"  FAIL  {label} -- {detail}")
        failed += 1

print("=" * 60)
print("COMPREHENSIVE VERIFICATION")
print("=" * 60)

# ── 1. Auth ──────────────────────────────────────────────────
print("\n[1] Authentication")
login = c.post("/api/auth/login", json={"email": "admin@ofs.com", "password": "admin123"})
admin_cookies = login.cookies
check("Admin login", login.status_code == 200)
check("Admin role", login.json()["role"] == "manager")

login2 = c.post("/api/auth/login", json={"email": "customer@ofs.com", "password": "admin123"})
cust_cookies = login2.cookies
check("Customer login", login2.status_code == 200)
check("Customer role", login2.json()["role"] == "customer")

# ── 2. Order Status API ─────────────────────────────────────
print("\n[2] Order Status API (GET /api/orders/{id}/status)")
r = c.get("/api/orders/1/status", cookies=admin_cookies)
check("Returns 200", r.status_code == 200)
d = r.json()
check("Has order_id", d["order_id"] == 1)
check("Has status", d["status"] in ("processing", "out_for_delivery", "delivered", "failed"))
check("Has status_label", "status_label" in d)
check("Has robot_label", "robot_label" in d)
check("Has eta_minutes", "eta_minutes" in d)
check("Has delivery_address", "delivery_address" in d)

# Auth enforcement
r_unauth = TestClient(app).get("/api/orders/1/status")
check("Rejects unauthenticated", r_unauth.status_code == 401)

# ── 3. Order Location API ───────────────────────────────────
print("\n[3] Order Location API (GET /api/orders/{id}/location)")
r = c.get("/api/orders/1/location", cookies=admin_cookies)
check("Returns 200", r.status_code == 200)
d = r.json()
check("Has current_location", "lat" in d["current_location"])
check("Has store_location", "lat" in d["store_location"])
check("Has destination_location", "lat" in d["destination_location"])
check("Has route array", isinstance(d["route"], list) and len(d["route"]) >= 3)
check("Route has waypoints", len(d["route"]) >= 5, f"got {len(d['route'])}")
check("Has distance_miles", "distance_miles" in d)
check("Has route_source", d["route_source"] == "simulated")
check("Has progress", 0 <= d["progress"] <= 1)

r_404 = c.get("/api/orders/99999/location", cookies=admin_cookies)
check("404 for bad order", r_404.status_code == 404)

# ── 4. Admin Order Status Transitions ────────────────────────
print("\n[4] Admin Order Status Transitions (PATCH /api/admin/orders/{id}/status)")
# Delivered order can't change
r = c.patch("/api/admin/orders/1/status", json={"status": "out_for_delivery"}, cookies=admin_cookies)
check("Delivered order blocked", r.status_code == 400)

r = c.patch("/api/admin/orders/1/status", json={"status": "failed"}, cookies=admin_cookies)
check("Delivered->failed blocked", r.status_code == 400)

# Customer can't do admin actions
r = c.patch("/api/admin/orders/1/status", json={"status": "delivered"}, cookies=cust_cookies)
check("Customer blocked from admin", r.status_code == 403)

# Nonexistent order
r = c.patch("/api/admin/orders/99999/status", json={"status": "delivered"}, cookies=admin_cookies)
check("404 for bad order", r.status_code == 404)

# ── 5. Admin Orders Date Filter ──────────────────────────────
print("\n[5] Admin Orders Date Filter (GET /api/admin/orders?days=N)")
r_all = c.get("/api/admin/orders", cookies=admin_cookies)
check("No filter returns cards", r_all.status_code == 200 and len(r_all.json()["cards"]) > 0)

r_7d = c.get("/api/admin/orders?days=7", cookies=admin_cookies)
check("7 day filter works", r_7d.status_code == 200)

r_30d = c.get("/api/admin/orders?days=30", cookies=admin_cookies)
check("30 day filter works", r_30d.status_code == 200)

r_status = c.get("/api/admin/orders?status=delivered", cookies=admin_cookies)
check("Status filter works", r_status.status_code == 200)

r_search = c.get("/api/admin/orders?search=Maria", cookies=admin_cookies)
check("Search filter works", r_search.status_code == 200)

r_combo = c.get("/api/admin/orders?status=delivered&days=30", cookies=admin_cookies)
check("Combined filters work", r_combo.status_code == 200)

# ── 6. Order History ─────────────────────────────────────────
print("\n[6] Customer Order History (GET /api/orders/my)")
r = c.get("/api/orders/my", cookies=cust_cookies)
check("Returns 200", r.status_code == 200)
d = r.json()
check("Has orders array", isinstance(d["orders"], list))

if len(d["orders"]) > 0:
    o = d["orders"][0]
    check("Order has id", "id" in o)
    check("Order has status", "status" in o)
    check("Order has items", isinstance(o.get("items"), list))
    check("Order has total_price", "total_price" in o)
    check("Order has delivery_address", "delivery_address" in o)

r_unauth = TestClient(app).get("/api/orders/my")
check("Rejects unauthenticated", r_unauth.status_code == 401)

# ── 7. Route Service Module ──────────────────────────────────
print("\n[7] Route Service Module (route_service.py)")
route = get_delivery_route(order_id=1)
check("Route has origin", "lat" in route["origin"])
check("Route has destination", "lat" in route["destination"])
check("Route has waypoints", len(route["route"]) >= 5)
check("Route has ETA", route["eta_minutes"] > 0)
check("Route has distance", route["distance_miles"] > 0)
check("Source is simulated", route["source"] == "simulated")

# Different orders = different destinations
r1 = get_delivery_route(order_id=1)
r2 = get_delivery_route(order_id=2)
check("Different orders -> different routes",
      r1["destination"]["lat"] != r2["destination"]["lat"])

# Batch optimization
orders = [
    {"order_id": i, "destination": {"lat": 37.33 + i * 0.002, "lng": -121.88 - i * 0.002}, "weight_lbs": 15.0}
    for i in range(12)
]
batches = batch_route_optimization(orders, max_orders=10)
check("Batch splits 12 orders", len(batches) == 2)
check("Batch 1 <= 10 orders", batches[0]["order_count"] <= 10)
check("Batch has distance", batches[0]["total_distance_miles"] > 0)
check("Batch has time estimate", batches[0]["estimated_minutes"] > 0)

# Weight-based splitting
heavy = [
    {"order_id": i, "destination": {"lat": 37.335, "lng": -121.885}, "weight_lbs": 120.0}
    for i in range(3)
]
heavy_batches = batch_route_optimization(heavy, max_weight_lbs=200.0)
check("Weight limit splits batches", len(heavy_batches) == 3)

# ── 8. Existing Endpoints Still Work ─────────────────────────
print("\n[8] Existing Endpoints Regression")
r = c.get("/api/products", cookies=cust_cookies)
check("Products API works", r.status_code == 200 and len(r.json()["items"]) > 0)

r = c.get("/api/cart", cookies=cust_cookies)
check("Cart API works", r.status_code == 200)

r = c.get("/api/admin/dashboard", cookies=admin_cookies)
check("Dashboard works", r.status_code == 200)

r = c.get("/api/admin/inventory", cookies=admin_cookies)
check("Inventory works", r.status_code == 200)

r = c.get("/api/admin/deliveries", cookies=admin_cookies)
check("Deliveries works", r.status_code == 200)

r = c.get("/api/admin/robots", cookies=admin_cookies)
check("Robots works", r.status_code == 200)

r = c.get("/api/admin/financial", cookies=admin_cookies)
check("Financial works", r.status_code == 200)

r = c.get("/api/auth/me", cookies=admin_cookies)
check("Auth /me works", r.status_code == 200)

# ── Summary ──────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
print("=" * 60)

if failed > 0:
    sys.exit(1)
