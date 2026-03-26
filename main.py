# ── Imports ────────────────────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException, Response, Cookie, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Optional, List
from dotenv import load_dotenv
import jwt
import datetime
import os
import secrets

load_dotenv()

# ── App setup ──────────────────────────────────────────────────────────────
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config — keep machine-specific values in .env ──────────────────────────
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "ofs_db")

JWT_SECRET = ""  # <-- change this later
JWT_EXPIRY_HOURS = 24

# ── Database connection ─────────────────────────────────────────────────────
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def get_db():
    """Gives each request its own DB session and always closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Auth helpers ────────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_jwt(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def format_money(value) -> str:
    return f"${float(value or 0):,.2f}"


def format_count(value) -> str:
    return f"{int(value or 0):,}"


def humanize_minutes_ago(value) -> str:
    if value is None:
        return "Unknown"

    now = datetime.datetime.now(value.tzinfo) if getattr(value, "tzinfo", None) else datetime.datetime.now()
    minutes = max(int((now - value).total_seconds() // 60), 0)

    if minutes < 1:
        return "Just now"
    if minutes == 1:
        return "1 minute ago"
    if minutes < 60:
        return f"{minutes} minutes ago"

    hours = minutes // 60
    if hours == 1:
        return "1 hour ago"
    if hours < 24:
        return f"{hours} hours ago"

    days = hours // 24
    return "1 day ago" if days == 1 else f"{days} days ago"


# ── Auth middleware (reusable Depends) ──────────────────────────────────────

def require_auth(
    auth_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    """Dependency that returns the authenticated user dict or raises 401."""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_jwt(auth_token)

    user = db.execute(
        text("SELECT id, name, email, role FROM users WHERE id = :id"),
        {"id": payload["sub"]}
    ).fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "userId": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


def require_role(*allowed_roles: str):
    """Returns a dependency that checks the user has one of the allowed roles.

    Usage:  current_user: dict = Depends(require_role("manager", "employee"))
    """
    def checker(current_user: dict = Depends(require_auth)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return checker


# ── Request models ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    invite_code: Optional[str] = None


class GenerateCodeRequest(BaseModel):
    role: str  # "employee" or "manager"
    note: Optional[str] = None


# ── Routes ──────────────────────────────────────────────────────────────────

# Runs when user clicks "Create Account"
@app.post("/api/auth/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": body.email}
    ).fetchone()

    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Resolve role from invite code (defaults to customer)
    role = "customer"
    code_row = None
    if body.invite_code:
        code_row = db.execute(
            text("SELECT id, role FROM invite_codes WHERE code = :code AND used_by IS NULL"),
            {"code": body.invite_code}
        ).fetchone()
        if not code_row:
            raise HTTPException(status_code=400, detail="Invalid or already used invite code")
        role = code_row.role

    result = db.execute(
        text("""
            INSERT INTO users (name, email, password_hash, role)
            VALUES (:name, :email, :password_hash, :role)
        """),
        {
            "name": body.name,
            "email": body.email,
            "password_hash": hash_password(body.password),
            "role": role,
        }
    )
    new_user_id = result.lastrowid

    # Mark invite code as used
    if code_row:
        db.execute(
            text("UPDATE invite_codes SET used_by = :uid, used_at = NOW() WHERE id = :cid"),
            {"uid": new_user_id, "cid": code_row.id}
        )

    db.commit()
    return {"message": "Registration successful", "role": role}


# Runs when user clicks "Sign in"
@app.post("/api/auth/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT id, name, email, password_hash, role FROM users WHERE email = :email"),
        {"email": body.email}
    ).fetchone()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_jwt(user.id, user.role)

    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        max_age=JWT_EXPIRY_HOURS * 3600,
        samesite="lax",
    )

    return {
        "message": "Login successful", 
        "userId": user.id, 
        "role": user.role, 
        "name": user.name,
        }


# Runs when user logs out
@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("auth_token")
    return {"message": "Logged out"}


# Runs when frontend checks logged in user
@app.get("/api/auth/me")
def get_me(auth_token: Optional[str] = Cookie(default=None), db: Session = Depends(get_db)):
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_jwt(auth_token)

    user = db.execute(
        text("SELECT id, name, email, role FROM users WHERE id = :id"),
        {"id": payload["sub"]}
    ).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "userId": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


# ── Allowed sort columns (whitelist to prevent SQL injection) ──────────────
ALLOWED_SORT_COLUMNS = {
    "id": "p.id",
    "name": "p.name",
    "price": "p.price",
    "weight": "p.weight_lbs",
    "category": "p.category",
}


# Customer browsing page product feed
@app.get("/api/products")
def get_products(
    search: Optional[str] = Query(default=None, description="Search by product name"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    sort: Optional[str] = Query(default="id", description="Sort column: id, name, price, weight, category"),
    order: Optional[str] = Query(default="asc", description="Sort direction: asc or desc"),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    try:
        # ── Build dynamic WHERE clauses ──
        conditions = []
        params = {}

        if search:
            conditions.append("p.name LIKE :search")
            params["search"] = f"%{search}%"

        if category:
            conditions.append("p.category = :category")
            params["category"] = category

        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        # ── Sort (whitelist to prevent SQL injection) ──
        sort_col = ALLOWED_SORT_COLUMNS.get(sort, "p.id")
        sort_dir = "DESC" if order and order.lower() == "desc" else "ASC"
        order_clause = f"ORDER BY {sort_col} {sort_dir}"

        # ── Count total matching rows ──
        count_sql = f"SELECT COUNT(*) AS total FROM products p {where_clause}"
        total = db.execute(text(count_sql), params).scalar() or 0

        # ── Paginate ──
        offset = (page - 1) * per_page
        params["limit"] = per_page
        params["offset"] = offset

        query_sql = f"""
            SELECT
                p.id,
                p.name,
                p.description,
                p.price,
                p.weight_lbs,
                p.category,
                p.is_available,
                p.is_organic,
                p.image_url,
                COALESCE(i.quantity, 0) AS stock
            FROM products p
            LEFT JOIN inventory i ON i.product_id = p.id
            {where_clause}
            {order_clause}
            LIMIT :limit OFFSET :offset
        """

        rows = db.execute(text(query_sql), params).mappings().all()

        products = []
        for row in rows:
            products.append({
                "id": row["id"],
                "name": row["name"],
                "description": row["description"],
                "price": float(row["price"]) if row["price"] is not None else 0,
                "weight_lbs": float(row["weight_lbs"]) if row["weight_lbs"] is not None else 0,
                "category": row["category"],
                "is_available": bool(row["is_available"]),
                "is_organic": bool(row["is_organic"]) if row["is_organic"] is not None else False,
                "image_url": row["image_url"],
                "image": row["image_url"],
                "stock": int(row["stock"]),
            })

        return {
            "items": products,
            "total": total,
            "page": page,
            "per_page": per_page,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load products: {str(e)}")


# Admin dashboard overview
@app.get("/api/admin/dashboard")
def get_admin_dashboard(current_user: dict = Depends(require_role("manager", "employee")), db: Session = Depends(get_db)):
    try:
        total_revenue = db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM revenue")).scalar() or 0
        total_orders = db.execute(text("SELECT COUNT(*) FROM orders")).scalar() or 0
        active_deliveries = db.execute(
            text("SELECT COUNT(*) FROM deliveries WHERE status IN ('scheduled', 'in_progress')")
        ).scalar() or 0
        available_robots = db.execute(
            text("SELECT COUNT(*) FROM robots WHERE status = 'available'")
        ).scalar() or 0
        low_stock_items = db.execute(
            text("SELECT COUNT(*) FROM inventory WHERE quantity > 0 AND quantity <= 15")
        ).scalar() or 0
        pending_deliveries = db.execute(
            text("SELECT COUNT(*) FROM orders WHERE status = 'processing'")
        ).scalar() or 0

        revenue_points = db.execute(
            text("""
                SELECT
                    DATE(recorded_at) AS day_key,
                    DATE_FORMAT(recorded_at, '%a') AS day_label,
                    ROUND(SUM(amount), 2) AS amount
                FROM revenue
                WHERE recorded_at >= NOW() - INTERVAL 6 DAY
                GROUP BY DATE(recorded_at), DATE_FORMAT(recorded_at, '%a')
                ORDER BY day_key ASC
            """)
        ).mappings().all()

        recent_orders = db.execute(
            text("""
                SELECT
                    o.id,
                    o.total_price,
                    o.status,
                    o.created_at,
                    u.name AS customer_name
                FROM orders o
                LEFT JOIN users u ON u.id = o.user_id
                ORDER BY o.created_at DESC
                LIMIT 4
            """)
        ).mappings().all()

        robot_snapshot = db.execute(
            text("""
                SELECT
                    id,
                    name,
                    status,
                    battery_pct
                FROM robots
                ORDER BY
                    CASE status
                        WHEN 'maintenance' THEN 1
                        WHEN 'on_delivery' THEN 2
                        ELSE 3
                    END,
                    battery_pct ASC,
                    id ASC
                LIMIT 2
            """)
        ).mappings().all()

        activity = []
        for order in recent_orders:
            activity.append({
                "title": f"Order #{order['id']} from {order['customer_name'] or 'Unknown customer'}",
                "description": f"{order['status'].replace('_', ' ').title()} • {format_money(order['total_price'])}",
                "time": humanize_minutes_ago(order["created_at"]),
                "iconClass": "fas fa-shopping-cart",
                "tone": "green" if order["status"] == "delivered" else "blue",
            })

        for robot in robot_snapshot:
            robot_name = robot["name"] or f"Robot #{robot['id']}"
            activity.append({
                "title": f"{robot_name} status update",
                "description": f"{robot['status'].replace('_', ' ').title()} • Battery {int(robot['battery_pct'] or 0)}%",
                "time": "Fleet snapshot",
                "iconClass": "fas fa-robot",
                "tone": "orange" if robot["status"] == "maintenance" else "purple",
            })

        return {
            "viewer_role": current_user["role"],
            "quick_panel": [
                {
                    "label": "Available Robots",
                    "value": format_count(available_robots),
                    "badgeClassName": "bg-green-100 text-green-700",
                },
                {
                    "label": "Pending Deliveries",
                    "value": format_count(pending_deliveries),
                    "badgeClassName": "bg-orange-100 text-orange-700",
                },
            ],
            "stats": [
                {
                    "key": "revenue",
                    "title": "Total Revenue",
                    "value": format_money(total_revenue),
                    "trend": f"{format_count(len(revenue_points))} day snapshot",
                    "trendType": "up",
                    "iconClass": "fas fa-dollar-sign",
                    "tone": "blue",
                },
                {
                    "key": "orders",
                    "title": "Total Orders",
                    "value": format_count(total_orders),
                    "trend": f"{format_count(pending_deliveries)} processing",
                    "trendType": "up",
                    "iconClass": "fas fa-shopping-cart",
                    "tone": "green",
                },
                {
                    "key": "deliveries",
                    "title": "Active Deliveries",
                    "value": format_count(active_deliveries),
                    "trend": f"{format_count(low_stock_items)} low-stock items",
                    "trendType": "accent",
                    "iconClass": "fas fa-truck",
                    "tone": "orange",
                },
                {
                    "key": "robots",
                    "title": "Available Robots",
                    "value": format_count(available_robots),
                    "trend": "Live fleet readiness",
                    "trendType": "neutral",
                    "iconClass": "fas fa-robot",
                    "tone": "purple",
                },
            ],
            "activity": activity[:6],
            "revenue_chart": {
                "labels": [row["day_label"] for row in revenue_points],
                "values": [float(row["amount"] or 0) for row in revenue_points],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load admin dashboard: {str(e)}")


@app.get("/api/admin/products")
def get_admin_products(
    search: Optional[str] = Query(default=None, description="Search by product name"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        conditions = []
        params = {}

        if search:
            conditions.append("p.name LIKE :search")
            params["search"] = f"%{search}%"

        if category and category.lower() != "all categories":
            conditions.append("p.category = :category")
            params["category"] = category

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        rows = db.execute(
            text(f"""
                SELECT
                    p.id,
                    p.name,
                    p.category,
                    p.price,
                    p.weight_lbs,
                    p.is_available,
                    COALESCE(i.quantity, 0) AS stock,
                    COALESCE(SUM(oi.quantity), 0) AS total_sold
                FROM products p
                LEFT JOIN inventory i ON i.product_id = p.id
                LEFT JOIN order_items oi ON oi.product_id = p.id
                {where_clause}
                GROUP BY
                    p.id, p.name, p.category, p.price, p.weight_lbs, p.is_available, i.quantity
                ORDER BY p.name ASC
            """),
            params,
        ).mappings().all()

        total_products = db.execute(text("SELECT COUNT(*) FROM products")).scalar() or 0
        low_stock_items = db.execute(
            text("SELECT COUNT(*) FROM inventory WHERE quantity > 0 AND quantity <= 15")
        ).scalar() or 0
        items_sold = db.execute(
            text("SELECT COALESCE(SUM(quantity), 0) FROM order_items")
        ).scalar() or 0
        available_promotions = db.execute(
            text("SELECT COUNT(*) FROM products WHERE is_available = TRUE")
        ).scalar() or 0

        categories = db.execute(
            text("""
                SELECT DISTINCT category
                FROM products
                WHERE category IS NOT NULL AND category <> ''
                ORDER BY category ASC
            """)
        ).scalars().all()

        items = []
        for row in rows:
            stock = int(row["stock"] or 0)
            total_sold = int(row["total_sold"] or 0)

            if stock == 0:
                status = "Out of Stock"
                status_class = "bg-red-100 text-red-800"
                progress_class = "bg-red-500"
                row_class = "bg-red-50/20"
            elif stock <= 15:
                status = "Low Stock"
                status_class = "bg-orange-100 text-orange-800"
                progress_class = "bg-orange-500"
                row_class = "bg-orange-50/30"
            else:
                status = "In Stock"
                status_class = "bg-green-100 text-green-800"
                progress_class = "bg-green-500"
                row_class = ""

            progress = min(int((stock / 200) * 100), 100)

            items.append({
                "id": row["id"],
                "sku": f"PRD-{int(row['id']):03d}",
                "name": row["name"],
                "category": row["category"] or "Uncategorized",
                "price": format_money(row["price"]),
                "unit": "/ea",
                "stock": stock,
                "progress": progress,
                "progressClass": progress_class,
                "totalSold": format_count(total_sold),
                "status": status,
                "statusClass": status_class,
                "rowClass": row_class,
            })

        return {
            "viewer_role": current_user["role"],
            "summary": {
                "total_products": format_count(total_products),
                "low_stock_items": format_count(low_stock_items),
                "items_sold_30d": format_count(items_sold),
            },
            "quick_panel": [
                {
                    "label": "Low Stock Alerts",
                    "value": format_count(low_stock_items),
                    "badgeClassName": "bg-red-100 text-red-700",
                },
                {
                    "label": "Active Products",
                    "value": format_count(available_promotions),
                    "badgeClassName": "bg-blue-100 text-blue-700",
                },
            ],
            "categories": categories,
            "items": items,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load admin products: {str(e)}")


@app.get("/api/admin/orders")
def get_admin_orders(
    search: Optional[str] = Query(default=None, description="Search by customer name or order id"),
    status: Optional[str] = Query(default=None, description="Filter by order status"),
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        conditions = []
        params = {}

        if search:
            conditions.append("(u.name LIKE :search OR CAST(o.id AS CHAR) LIKE :search)")
            params["search"] = f"%{search}%"

        status_map = {
            "preparing": "processing",
            "processing": "processing",
            "in transit": "out_for_delivery",
            "out_for_delivery": "out_for_delivery",
            "delivered": "delivered",
        }
        normalized_status = status_map.get(str(status or "").strip().lower())
        if normalized_status:
            conditions.append("o.status = :status")
            params["status"] = normalized_status

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        order_rows = db.execute(
            text(f"""
                SELECT
                    o.id,
                    o.status,
                    o.total_price,
                    o.delivery_address,
                    o.created_at,
                    u.name AS customer_name,
                    r.name AS robot_name,
                    d.id AS delivery_id,
                    d.status AS delivery_status
                FROM orders o
                LEFT JOIN users u ON u.id = o.user_id
                LEFT JOIN delivery_orders do_map ON do_map.order_id = o.id
                LEFT JOIN deliveries d ON d.id = do_map.delivery_id
                LEFT JOIN robots r ON r.id = d.robot_id
                {where_clause}
                ORDER BY o.created_at DESC, o.id DESC
                LIMIT 12
            """),
            params,
        ).mappings().all()

        active_robots = db.execute(
            text("SELECT COUNT(*) FROM robots WHERE status IN ('available', 'on_delivery')")
        ).scalar() or 0
        pending_deliveries = db.execute(
            text("SELECT COUNT(*) FROM orders WHERE status = 'processing'")
        ).scalar() or 0

        map_points = []
        for row in order_rows[:4]:
            status_value = row["status"] or ""
            if status_value == "delivered":
                point_color = "green"
            elif status_value == "out_for_delivery":
                point_color = "blue"
            else:
                point_color = "orange"

            map_points.append({
                "orderId": f"#ORD-{int(row['id']):04d}",
                "robotLabel": row["robot_name"] or "Awaiting robot",
                "statusLabel": status_value.replace("_", " ").title(),
                "color": point_color,
            })

        cards = []
        for index, row in enumerate(order_rows):
            status_value = row["status"] or "processing"
            if status_value == "out_for_delivery":
                status_label = "In Transit"
                status_class = "text-blue-700 bg-blue-100"
                detail = f"Assigned to: {row['robot_name'] or 'Awaiting robot'}"
                meta_right = "Out for delivery"
            elif status_value == "delivered":
                status_label = "Delivered"
                status_class = "text-green-700 bg-green-100"
                detail = f"Customer: {row['customer_name'] or 'Unknown customer'}"
                meta_right = "Delivered"
            else:
                status_label = "Preparing"
                status_class = "text-orange-700 bg-orange-100"
                detail = f"Customer: {row['customer_name'] or 'Unknown customer'}"
                meta_right = "Awaiting robot assignment"

            cards.append({
                "id": f"#ORD-{int(row['id']):04d}",
                "status": status_label,
                "statusClass": status_class,
                "detail": detail,
                "metaLeft": f"${float(row['total_price'] or 0):.2f} • {row['delivery_address']}",
                "metaRight": meta_right,
                "active": index == 0,
            })

        return {
            "viewer_role": current_user["role"],
            "quick_panel": [
                {
                    "label": "Active Robots",
                    "value": format_count(active_robots),
                    "badgeClassName": "bg-green-100 text-green-700",
                },
                {
                    "label": "Pending Deliveries",
                    "value": format_count(pending_deliveries),
                    "badgeClassName": "bg-orange-100 text-orange-700",
                },
            ],
            "cards": cards,
            "map_points": map_points,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load admin orders: {str(e)}")


# Single product detail with stock info
@app.get("/api/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Return a single product by ID, including its current stock quantity."""
    try:
        row = db.execute(
            text("""
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.weight_lbs,
                    p.category,
                    p.is_available,
                    p.is_organic,
                    p.image_url,
                    COALESCE(i.quantity, 0) AS stock
                FROM products p
                LEFT JOIN inventory i ON i.product_id = p.id
                WHERE p.id = :pid
            """),
            {"pid": product_id}
        ).mappings().fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Product not found")

        return {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "price": float(row["price"]) if row["price"] is not None else 0,
            "weight_lbs": float(row["weight_lbs"]) if row["weight_lbs"] is not None else 0,
            "category": row["category"],
            "is_available": bool(row["is_available"]),
            "is_organic": bool(row["is_organic"]) if row["is_organic"] is not None else False,
            "image_url": row["image_url"],
            "stock": int(row["stock"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load product: {str(e)}")


# ── Invite code endpoints ────────────────────────────────────────────────────

@app.post("/api/admin/invite-codes")
def generate_invite_code(
    body: GenerateCodeRequest,
    current_user: dict = Depends(require_role("manager")),
    db: Session = Depends(get_db),
):
    """
    Managers can generate employee codes.
    Only the lead admin can generate manager codes.
    """
    if body.role not in ("employee", "manager"):
        raise HTTPException(status_code=400, detail="role must be 'employee' or 'manager'")

    if body.role == "manager":
        user_row = db.execute(
            text("SELECT is_lead_admin FROM users WHERE id = :id"),
            {"id": current_user["userId"]}
        ).fetchone()
        if not user_row or not user_row.is_lead_admin:
            raise HTTPException(status_code=403, detail="Only the lead admin can generate manager codes")

    code = "OFS-" + secrets.token_urlsafe(8).upper()[:8]

    db.execute(
        text("""
            INSERT INTO invite_codes (code, role, created_by, note)
            VALUES (:code, :role, :created_by, :note)
        """),
        {
            "code": code,
            "role": body.role,
            "created_by": current_user["userId"],
            "note": body.note,
        }
    )
    db.commit()
    return {"code": code, "role": body.role}


@app.get("/api/admin/invite-codes")
def list_invite_codes(
    current_user: dict = Depends(require_role("manager")),
    db: Session = Depends(get_db),
):
    """Returns all invite codes. Lead admin sees all; regular managers see only codes they created."""
    user_row = db.execute(
        text("SELECT is_lead_admin FROM users WHERE id = :id"),
        {"id": current_user["userId"]}
    ).fetchone()
    is_lead = user_row and user_row.is_lead_admin

    if is_lead:
        rows = db.execute(
            text("""
                SELECT ic.id, ic.code, ic.role, ic.note, ic.created_at, ic.used_at,
                       creator.name AS created_by_name,
                       used_user.name AS used_by_name
                FROM invite_codes ic
                JOIN users creator ON creator.id = ic.created_by
                LEFT JOIN users used_user ON used_user.id = ic.used_by
                ORDER BY ic.created_at DESC
            """)
        ).mappings().all()
    else:
        rows = db.execute(
            text("""
                SELECT ic.id, ic.code, ic.role, ic.note, ic.created_at, ic.used_at,
                       creator.name AS created_by_name,
                       used_user.name AS used_by_name
                FROM invite_codes ic
                JOIN users creator ON creator.id = ic.created_by
                LEFT JOIN users used_user ON used_user.id = ic.used_by
                WHERE ic.created_by = :uid
                ORDER BY ic.created_at DESC
            """),
            {"uid": current_user["userId"]}
        ).mappings().all()

    return {
        "is_lead_admin": is_lead,
        "codes": [
            {
                "id": row["id"],
                "code": row["code"],
                "role": row["role"],
                "note": row["note"],
                "created_by": row["created_by_name"],
                "used_by": row["used_by_name"],
                "used": row["used_at"] is not None,
                "created_at": str(row["created_at"]),
            }
            for row in rows
        ],
    }


@app.delete("/api/admin/invite-codes/{code_id}")
def revoke_invite_code(
    code_id: int,
    current_user: dict = Depends(require_role("manager")),
    db: Session = Depends(get_db),
):
    """Revoke (delete) an unused invite code. Managers can only revoke their own codes unless lead admin."""
    code_row = db.execute(
        text("SELECT id, created_by, used_by FROM invite_codes WHERE id = :id"),
        {"id": code_id}
    ).fetchone()

    if not code_row:
        raise HTTPException(status_code=404, detail="Invite code not found")

    if code_row.used_by is not None:
        raise HTTPException(status_code=400, detail="Cannot revoke a code that has already been used")

    user_row = db.execute(
        text("SELECT is_lead_admin FROM users WHERE id = :id"),
        {"id": current_user["userId"]}
    ).fetchone()
    is_lead = user_row and user_row.is_lead_admin

    if not is_lead and code_row.created_by != current_user["userId"]:
        raise HTTPException(status_code=403, detail="You can only revoke codes you created")

    db.execute(text("DELETE FROM invite_codes WHERE id = :id"), {"id": code_id})
    db.commit()
    return {"message": "Invite code revoked"}


# Check that database & server running
@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    """Quick sanity check — confirms server and DB are both reachable."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
