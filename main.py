from fastapi import FastAPI, HTTPException, Response, Cookie, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Optional
from dotenv import load_dotenv
from decimal import Decimal, ROUND_HALF_UP
import jwt
import datetime
import os
import secrets
import smtplib
from email.mime.text import MIMEText
from route_service import get_delivery_route, get_progress_location, estimate_eta

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

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-env")
JWT_EXPIRY_HOURS = 24

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ── Database connection ─────────────────────────────────────────────────────
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# ── Constants ───────────────────────────────────────────────────────────────
FREE_DELIVERY_MAX_WEIGHT_LBS = Decimal("20.00")
HEAVY_ORDER_DELIVERY_FEE = Decimal("10.00")
SEVEN_DAY_WINDOW_START = datetime.date(2026, 3, 30)
SEVEN_DAY_WINDOW_END = datetime.date(2026, 4, 5)

ALLOWED_SORT_COLUMNS = {
    "id": "p.id",
    "name": "p.name",
    "price": "p.price",
    "weight": "p.weight_lbs",
    "category": "p.category",
}


# ── DB session helper ───────────────────────────────────────────────────────
def get_db():
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


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    if not EMAIL_USER or not EMAIL_PASSWORD:
        print(f"[DEV] Password reset link for {to_email}: {reset_url}")
        return

    body = f"""Hi,

You requested a password reset for your OFS account.

Click the link below to reset your password (expires in 1 hour):

{reset_url}

If you did not request this, you can safely ignore this email.

— The OFS Team
"""
    msg = MIMEText(body)
    msg["Subject"] = "Reset your OFS password"
    msg["From"] = EMAIL_USER
    msg["To"] = to_email

    with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_USER, to_email, msg.as_string())


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


# ── Formatting helpers ──────────────────────────────────────────────────────
def money_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def format_money(value) -> str:
    return f"${float(money_decimal(value)):,.2f}"


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


def robot_label(robot_id: Optional[int]) -> str:
    if not robot_id:
        return "Awaiting robot"
    return f"Robot-{int(robot_id):02d}"


def derived_product_available(stock: int) -> bool:
    return stock > 0


def delivery_status_to_legacy_order_status(delivery_status: Optional[str]) -> str:
    if delivery_status == "in_transit":
        return "out_for_delivery"
    if delivery_status == "delivered":
        return "delivered"
    if delivery_status == "failed":
        return "failed"
    return "processing"


def legacy_status_label(status: str) -> str:
    if status == "out_for_delivery":
        return "In Transit"
    if status == "delivered":
        return "Delivered"
    if status == "failed":
        return "Failed"
    return "Preparing"


def delivery_status_badge(status: str) -> dict:
    if status == "delivered":
        return {
            "status": "Delivered",
            "statusClass": "text-green-700 bg-green-100 border-green-200",
        }
    if status == "in_transit":
        return {
            "status": "In Transit",
            "statusClass": "text-blue-700 bg-blue-100 border-blue-200",
        }
    return {
        "status": "Failed",
        "statusClass": "text-red-700 bg-red-100 border-red-200",
    }


def delivery_color(status: str) -> str:
    if status == "delivered":
        return "green"
    if status == "in_transit":
        return "blue"
    return "orange"


def calculate_delivery_fee(total_weight: Decimal) -> Decimal:
    return Decimal("0.00") if total_weight < FREE_DELIVERY_MAX_WEIGHT_LBS else HEAVY_ORDER_DELIVERY_FEE


# ── Auth dependencies ───────────────────────────────────────────────────────
def require_auth(
    auth_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_jwt(auth_token)

    user = db.execute(
        text("SELECT id, name, email, role FROM users WHERE id = :id"),
        {"id": payload["sub"]},
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
    def checker(current_user: dict = Depends(require_auth)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return checker


# ── Request models ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    invite_code: Optional[str] = None


class GenerateCodeRequest(BaseModel):
    role: str
    note: Optional[str] = None


class CartItemCreateRequest(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class CartItemUpdateRequest(BaseModel):
    quantity: int = Field(ge=0)


class CheckoutRequest(BaseModel):
    delivery_address: Optional[str] = None


class DeleteAccountRequest(BaseModel):
    email: EmailStr


class AdminProductCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal = Field(gt=0)
    cost_price: Decimal = Field(ge=0)
    weight_lbs: Decimal = Field(gt=0)
    category: Optional[str] = None
    stock_quantity: int = Field(ge=0)
    low_stock_threshold: int = Field(default=10, ge=0)
    image_url: Optional[str] = None
    is_organic: bool = False


class AdminProductUpdateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal = Field(gt=0)
    cost_price: Decimal = Field(ge=0)
    weight_lbs: Decimal = Field(gt=0)
    category: Optional[str] = None
    stock_quantity: int = Field(ge=0)
    low_stock_threshold: int = Field(default=10, ge=0)
    image_url: Optional[str] = None
    is_organic: bool = False


# ── Query helpers ───────────────────────────────────────────────────────────
def get_or_create_cart_id(db: Session, user_id: int) -> int:
    row = db.execute(text("SELECT id FROM cart WHERE user_id = :uid"), {"uid": user_id}).fetchone()
    if row:
        return int(row.id)

    result = db.execute(
        text("INSERT INTO cart (user_id) VALUES (:uid)"),
        {"uid": user_id},
    )
    db.flush()
    return int(result.lastrowid)


def fetch_cart_items(db: Session, user_id: int):
    cart_id = get_or_create_cart_id(db, user_id)
    rows = db.execute(
        text(
            """
            SELECT
                ci.product_id,
                ci.quantity,
                p.name,
                p.description,
                p.price,
                p.cost_price,
                p.weight_lbs,
                p.category,
                p.is_organic,
                p.image_url,
                COALESCE(i.quantity, 0) AS stock
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            LEFT JOIN inventory i ON i.product_id = p.id
            WHERE ci.cart_id = :cart_id
            ORDER BY ci.added_at ASC, ci.id ASC
            """
        ),
        {"cart_id": cart_id},
    ).mappings().all()
    return cart_id, rows


def build_cart_payload(db: Session, user_id: int) -> dict:
    cart_id, rows = fetch_cart_items(db, user_id)

    items = []
    subtotal = Decimal("0.00")
    total_weight = Decimal("0.00")

    for row in rows:
        unit_price = money_decimal(row["price"])
        unit_cost = money_decimal(row["cost_price"])
        weight = Decimal(str(row["weight_lbs"] or 0))
        qty = int(row["quantity"] or 0)
        stock = int(row["stock"] or 0)
        line_total = unit_price * qty
        line_weight = weight * qty

        subtotal += line_total
        total_weight += line_weight

        items.append(
            {
                "product_id": int(row["product_id"]),
                "id": int(row["product_id"]),
                "name": row["name"],
                "description": row["description"],
                "price": float(unit_price),
                "unit_price": float(unit_price),
                "unit_cost": float(unit_cost),
                "quantity": qty,
                "weight_lbs": float(weight),
                "line_total": float(line_total.quantize(Decimal("0.01"))),
                "line_weight_lbs": float(line_weight.quantize(Decimal("0.01"))),
                "stock": stock,
                "is_available": derived_product_available(stock),
                "category": row["category"],
                "is_organic": bool(row["is_organic"]),
                "image_url": row["image_url"],
                "image": row["image_url"],
            }
        )

    delivery_fee = calculate_delivery_fee(total_weight) if items else Decimal("0.00")
    total = subtotal + delivery_fee

    return {
        "cart_id": cart_id,
        "items": items,
        "summary": {
            "item_count": sum(item["quantity"] for item in items),
            "unique_items": len(items),
            "subtotal": float(subtotal.quantize(Decimal("0.01"))),
            "total_weight_lbs": float(total_weight.quantize(Decimal("0.01"))),
            "delivery_fee": float(delivery_fee.quantize(Decimal("0.01"))),
            "total": float(total.quantize(Decimal("0.01"))),
            "qualifies_for_free_delivery": total_weight < FREE_DELIVERY_MAX_WEIGHT_LBS if items else True,
        },
    }


def build_product_row_payload(row) -> dict:
    stock = int(row["stock"] or 0)
    return {
        "id": int(row["id"]),
        "name": row["name"],
        "description": row["description"],
        "price": float(money_decimal(row["price"])),
        "weight_lbs": float(Decimal(str(row["weight_lbs"] or 0))),
        "category": row["category"],
        "is_available": derived_product_available(stock),
        "is_organic": bool(row["is_organic"]),
        "image_url": row["image_url"],
        "image": row["image_url"],
        "stock": stock,
    }


# ── Auth routes ─────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": body.email},
    ).fetchone()

    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    role = "customer"
    code_row = None
    if body.invite_code:
        code_row = db.execute(
            text("SELECT id, role FROM invite_codes WHERE code = :code AND used_by IS NULL"),
            {"code": body.invite_code},
        ).fetchone()
        if not code_row:
            raise HTTPException(status_code=400, detail="Invalid or already used invite code")
        role = code_row.role

    result = db.execute(
        text(
            """
            INSERT INTO users (name, email, password_hash, role)
            VALUES (:name, :email, :password_hash, :role)
            """
        ),
        {
            "name": body.name,
            "email": body.email,
            "password_hash": hash_password(body.password),
            "role": role,
        },
    )
    new_user_id = result.lastrowid

    if code_row:
        db.execute(
            text("UPDATE invite_codes SET used_by = :uid, used_at = NOW() WHERE id = :cid"),
            {"uid": new_user_id, "cid": code_row.id},
        )

    db.commit()
    return {"message": "Registration successful", "role": role}


@app.post("/api/auth/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT id, name, email, password_hash, role FROM users WHERE email = :email"),
        {"email": body.email},
    ).fetchone()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_jwt(user.id, user.role)
    cookie_kwargs = dict(
        key="auth_token",
        value=token,
        httponly=True,
        samesite="lax",
    )
    if body.remember_me:
        cookie_kwargs["max_age"] = 30 * 24 * 3600  # 30 days
    response.set_cookie(**cookie_kwargs)

    return {
        "message": "Login successful",
        "userId": user.id,
        "role": user.role,
        "name": user.name,
    }


@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("auth_token")
    return {"message": "Logged out"}


@app.post("/api/auth/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT id, email FROM users WHERE email = :email"),
        {"email": body.email},
    ).fetchone()

    # Always return success to avoid exposing whether an email is registered
    if not user:
        return {"message": "If that email is registered, a reset link has been sent."}

    token = secrets.token_urlsafe(32)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=1)

    db.execute(
        text(
            """
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES (:user_id, :token, :expires_at)
            """
        ),
        {"user_id": user.id, "token": token, "expires_at": expires_at},
    )
    db.commit()

    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    try:
        send_password_reset_email(user.email, reset_url)
    except Exception as e:
        print(f"[ERROR] Failed to send reset email: {e}")

    return {"message": "If that email is registered, a reset link has been sent."}


@app.post("/api/auth/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    row = db.execute(
        text(
            """
            SELECT id, user_id, expires_at, used
            FROM password_reset_tokens
            WHERE token = :token
            """
        ),
        {"token": body.token},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if row.used:
        raise HTTPException(status_code=400, detail="This reset link has already been used")
    if datetime.datetime.utcnow() > row.expires_at:
        raise HTTPException(status_code=400, detail="This reset link has expired")

    db.execute(
        text("UPDATE users SET password_hash = :hash WHERE id = :uid"),
        {"hash": hash_password(body.new_password), "uid": row.user_id},
    )
    db.execute(
        text("UPDATE password_reset_tokens SET used = TRUE WHERE id = :id"),
        {"id": row.id},
    )
    db.commit()

    return {"message": "Password updated successfully"}


@app.get("/api/auth/me")
def get_me(auth_token: Optional[str] = Cookie(default=None), db: Session = Depends(get_db)):
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_jwt(auth_token)
    user = db.execute(
        text("SELECT id, name, email, role, address FROM users WHERE id = :id"),
        {"id": payload["sub"]},
    ).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "userId": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "address": user.address or "",
    }


@app.delete("/api/account")
def delete_account(
    body: DeleteAccountRequest,
    response: Response,
    current_user: dict = Depends(require_auth),
    db: Session = Depends(get_db),
):
    if body.email.strip().lower() != str(current_user["email"]).strip().lower():
        raise HTTPException(status_code=400, detail="Email confirmation does not match this account")

    is_lead_admin = db.execute(
        text("SELECT is_lead_admin FROM users WHERE id = :id"),
        {"id": current_user["userId"]},
    ).fetchone()

    if is_lead_admin and bool(is_lead_admin.is_lead_admin):
        raise HTTPException(status_code=403, detail="Lead admin account cannot be deleted")

    try:
        db.execute(
            text("DELETE FROM invite_codes WHERE created_by = :uid"),
            {"uid": current_user["userId"]},
        )
        db.execute(
            text("UPDATE invite_codes SET used_by = NULL, used_at = NULL WHERE used_by = :uid"),
            {"uid": current_user["userId"]},
        )
        db.execute(
            text(
                """
                DELETE oi
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.user_id = :uid
                """
            ),
            {"uid": current_user["userId"]},
        )
        db.execute(
            text("DELETE FROM orders WHERE user_id = :uid"),
            {"uid": current_user["userId"]},
        )
        db.execute(
            text("DELETE FROM cart WHERE user_id = :uid"),
            {"uid": current_user["userId"]},
        )
        db.execute(
            text("DELETE FROM users WHERE id = :uid"),
            {"uid": current_user["userId"]},
        )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")

    response.delete_cookie("auth_token")
    return {"message": "Account deleted"}


# ── Customer product browsing ───────────────────────────────────────────────
@app.get("/api/products")
def get_products(
    search: Optional[str] = Query(default=None, description="Search by product name"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    sort: Optional[str] = Query(default="id", description="Sort column: id, name, price, weight, category"),
    order: Optional[str] = Query(default="asc", description="Sort direction: asc or desc"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    try:
        conditions = []
        params = {}

        if search:
            conditions.append("p.name LIKE :search")
            params["search"] = f"%{search}%"

        if category:
            conditions.append("p.category = :category")
            params["category"] = category

        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        sort_col = ALLOWED_SORT_COLUMNS.get(sort or "id", "p.id")
        sort_dir = "DESC" if (order or "").lower() == "desc" else "ASC"
        order_clause = f"ORDER BY {sort_col} {sort_dir}"

        total = db.execute(
            text(f"SELECT COUNT(*) FROM products p {where_clause}"),
            params,
        ).scalar() or 0

        params["limit"] = per_page
        params["offset"] = (page - 1) * per_page

        rows = db.execute(
            text(
                f"""
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.weight_lbs,
                    p.category,
                    p.is_organic,
                    p.image_url,
                    COALESCE(i.quantity, 0) AS stock
                FROM products p
                LEFT JOIN inventory i ON i.product_id = p.id
                {where_clause}
                {order_clause}
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        ).mappings().all()

        return {
            "items": [build_product_row_payload(row) for row in rows],
            "total": int(total),
            "page": page,
            "per_page": per_page,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load products: {str(e)}")


@app.get("/api/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    try:
        row = db.execute(
            text(
                """
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.weight_lbs,
                    p.category,
                    p.is_organic,
                    p.image_url,
                    COALESCE(i.quantity, 0) AS stock
                FROM products p
                LEFT JOIN inventory i ON i.product_id = p.id
                WHERE p.id = :pid
                """
            ),
            {"pid": product_id},
        ).mappings().fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Product not found")

        return build_product_row_payload(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load product: {str(e)}")


# ── Customer cart routes ────────────────────────────────────────────────────
@app.get("/api/cart")
def get_cart(
    current_user: dict = Depends(require_role("customer", "employee", "manager")),
    db: Session = Depends(get_db),
):
    try:
        return build_cart_payload(db, current_user["userId"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load cart: {str(e)}")


@app.post("/api/cart/items")
def add_cart_item(
    body: CartItemCreateRequest,
    current_user: dict = Depends(require_role("customer", "employee", "manager")),
    db: Session = Depends(get_db),
):
    try:
        cart_id = get_or_create_cart_id(db, current_user["userId"])

        product = db.execute(
            text(
                """
                SELECT p.id, p.name, COALESCE(i.quantity, 0) AS stock
                FROM products p
                LEFT JOIN inventory i ON i.product_id = p.id
                WHERE p.id = :pid
                """
            ),
            {"pid": body.product_id},
        ).fetchone()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        if int(product.stock or 0) <= 0:
            raise HTTPException(status_code=400, detail="Product is out of stock")

        existing = db.execute(
            text("SELECT quantity FROM cart_items WHERE cart_id = :cart_id AND product_id = :pid"),
            {"cart_id": cart_id, "pid": body.product_id},
        ).fetchone()

        new_qty = body.quantity + (int(existing.quantity) if existing else 0)
        if new_qty > int(product.stock or 0):
            raise HTTPException(status_code=400, detail="Requested quantity exceeds available stock")

        if existing:
            db.execute(
                text(
                    """
                    UPDATE cart_items
                    SET quantity = :qty
                    WHERE cart_id = :cart_id AND product_id = :pid
                    """
                ),
                {"qty": new_qty, "cart_id": cart_id, "pid": body.product_id},
            )
        else:
            db.execute(
                text(
                    """
                    INSERT INTO cart_items (cart_id, product_id, quantity)
                    VALUES (:cart_id, :pid, :qty)
                    """
                ),
                {"cart_id": cart_id, "pid": body.product_id, "qty": body.quantity},
            )

        db.commit()
        return build_cart_payload(db, current_user["userId"])
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add item to cart: {str(e)}")


@app.put("/api/cart/items/{product_id}")
def update_cart_item(
    product_id: int,
    body: CartItemUpdateRequest,
    current_user: dict = Depends(require_role("customer", "employee", "manager")),
    db: Session = Depends(get_db),
):
    try:
        cart_id = get_or_create_cart_id(db, current_user["userId"])

        if body.quantity == 0:
            db.execute(
                text("DELETE FROM cart_items WHERE cart_id = :cart_id AND product_id = :pid"),
                {"cart_id": cart_id, "pid": product_id},
            )
            db.commit()
            return build_cart_payload(db, current_user["userId"])

        stock_row = db.execute(
            text("SELECT COALESCE(quantity, 0) AS stock FROM inventory WHERE product_id = :pid"),
            {"pid": product_id},
        ).fetchone()
        stock = int(stock_row.stock if stock_row else 0)
        if body.quantity > stock:
            raise HTTPException(status_code=400, detail="Requested quantity exceeds available stock")

        updated = db.execute(
            text(
                """
                UPDATE cart_items
                SET quantity = :qty
                WHERE cart_id = :cart_id AND product_id = :pid
                """
            ),
            {"qty": body.quantity, "cart_id": cart_id, "pid": product_id},
        )

        if updated.rowcount == 0:
            raise HTTPException(status_code=404, detail="Cart item not found")

        db.commit()
        return build_cart_payload(db, current_user["userId"])
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update cart item: {str(e)}")


@app.delete("/api/cart/items/{product_id}")
def delete_cart_item(
    product_id: int,
    current_user: dict = Depends(require_role("customer", "employee", "manager")),
    db: Session = Depends(get_db),
):
    try:
        cart_id = get_or_create_cart_id(db, current_user["userId"])
        db.execute(
            text("DELETE FROM cart_items WHERE cart_id = :cart_id AND product_id = :pid"),
            {"cart_id": cart_id, "pid": product_id},
        )
        db.commit()
        return build_cart_payload(db, current_user["userId"])
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to remove cart item: {str(e)}")


@app.post("/api/cart/checkout")
def checkout_cart(
    body: CheckoutRequest,
    current_user: dict = Depends(require_role("customer", "employee", "manager")),
    db: Session = Depends(get_db),
):
    try:
        cart_id, cart_rows = fetch_cart_items(db, current_user["userId"])
        if not cart_rows:
            raise HTTPException(status_code=400, detail="Cart is empty")

        user_row = db.execute(
            text("SELECT address FROM users WHERE id = :uid"),
            {"uid": current_user["userId"]},
        ).fetchone()

        delivery_address = (body.delivery_address or (user_row.address if user_row else None) or "").strip()
        if not delivery_address:
            raise HTTPException(status_code=400, detail="Delivery address is required")

        subtotal = Decimal("0.00")
        total_weight = Decimal("0.00")
        line_items = []

        for row in cart_rows:
            stock = int(row["stock"] or 0)
            qty = int(row["quantity"] or 0)
            if qty > stock:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {row['name']}")

            unit_price = money_decimal(row["price"])
            unit_cost = money_decimal(row["cost_price"])
            weight = Decimal(str(row["weight_lbs"] or 0))

            subtotal += unit_price * qty
            total_weight += weight * qty
            line_items.append(
                {
                    "product_id": int(row["product_id"]),
                    "quantity": qty,
                    "unit_price": unit_price,
                    "unit_cost": unit_cost,
                }
            )

        delivery_fee = calculate_delivery_fee(total_weight)
        total_price = (subtotal + delivery_fee).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        order_result = db.execute(
            text(
                """
                INSERT INTO orders (
                    user_id, delivery_id, delivery_address, delivery_fee, total_price, total_weight, payment_status, paid_at, created_at
                ) VALUES (
                    :user_id, NULL, :delivery_address, :delivery_fee, :total_price, :total_weight, 'paid', NOW(), NOW()
                )
                """
            ),
            {
                "user_id": current_user["userId"],
                "delivery_address": delivery_address,
                "delivery_fee": float(delivery_fee),
                "total_price": float(total_price),
                "total_weight": float(total_weight.quantize(Decimal("0.01"))),
            },
        )
        order_id = int(order_result.lastrowid)

        for item in line_items:
            db.execute(
                text(
                    """
                    INSERT INTO order_items (order_id, product_id, quantity, unit_price, unit_cost)
                    VALUES (:order_id, :product_id, :quantity, :unit_price, :unit_cost)
                    """
                ),
                {
                    "order_id": order_id,
                    "product_id": item["product_id"],
                    "quantity": item["quantity"],
                    "unit_price": float(item["unit_price"]),
                    "unit_cost": float(item["unit_cost"]),
                },
            )
            db.execute(
                text(
                    """
                    UPDATE inventory
                    SET quantity = quantity - :quantity
                    WHERE product_id = :product_id AND quantity >= :quantity
                    """
                ),
                {
                    "product_id": item["product_id"],
                    "quantity": item["quantity"],
                },
            )

        db.execute(text("DELETE FROM cart_items WHERE cart_id = :cart_id"), {"cart_id": cart_id})
        db.commit()

        return {
            "message": "Checkout successful",
            "order_id": order_id,
            "payment_status": "paid",
            "delivery_fee": float(delivery_fee),
            "total_weight_lbs": float(total_weight.quantize(Decimal("0.01"))),
            "total_price": float(total_price),
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")


# ── Customer order history ──────────────────────────────────────────────────
@app.get("/api/orders/my")
def get_my_orders(
    current_user: dict = Depends(require_role("customer", "employee", "manager")),
    db: Session = Depends(get_db),
):
    try:
        order_rows = db.execute(
            text(
                """
                SELECT
                    o.id,
                    o.delivery_address,
                    o.delivery_fee,
                    o.payment_status,
                    o.paid_at,
                    o.created_at,
                    d.id AS delivery_id,
                    d.status AS delivery_status,
                    d.robot_id
                FROM orders o
                LEFT JOIN deliveries d ON d.id = o.delivery_id
                WHERE o.user_id = :uid
                ORDER BY o.created_at DESC, o.id DESC
                """
            ),
            {"uid": current_user["userId"]},
        ).mappings().all()

        orders = []
        for order_row in order_rows:
            items = db.execute(
                text(
                    """
                    SELECT
                        oi.product_id,
                        oi.quantity,
                        oi.unit_price,
                        oi.unit_cost,
                        p.name,
                        p.weight_lbs,
                        p.image_url,
                        p.category,
                        p.is_organic
                    FROM order_items oi
                    JOIN products p ON p.id = oi.product_id
                    WHERE oi.order_id = :order_id
                    ORDER BY oi.id ASC
                    """
                ),
                {"order_id": order_row["id"]},
            ).mappings().all()

            subtotal = Decimal("0.00")
            total_weight = Decimal("0.00")
            item_payload = []
            for item in items:
                qty = int(item["quantity"] or 0)
                unit_price = money_decimal(item["unit_price"])
                weight = Decimal(str(item["weight_lbs"] or 0))
                subtotal += unit_price * qty
                total_weight += weight * qty
                item_payload.append(
                    {
                        "product_id": int(item["product_id"]),
                        "name": item["name"],
                        "quantity": qty,
                        "unit_price": float(unit_price),
                        "weight_lbs": float(weight),
                        "image_url": item["image_url"],
                        "category": item["category"],
                        "is_organic": bool(item["is_organic"]),
                    }
                )

            delivery_fee = money_decimal(order_row["delivery_fee"])
            total = subtotal + delivery_fee
            orders.append(
                {
                    "id": int(order_row["id"]),
                    "delivery_id": int(order_row["delivery_id"]) if order_row["delivery_id"] else None,
                    "status": delivery_status_to_legacy_order_status(order_row["delivery_status"]),
                    "payment_status": order_row["payment_status"],
                    "delivery_address": order_row["delivery_address"],
                    "delivery_fee": float(delivery_fee),
                    "subtotal": float(subtotal.quantize(Decimal("0.01"))),
                    "total_price": float(total.quantize(Decimal("0.01"))),
                    "total_weight_lbs": float(total_weight.quantize(Decimal("0.01"))),
                    "robot_label": robot_label(order_row["robot_id"]),
                    "created_at": str(order_row["created_at"]),
                    "paid_at": str(order_row["paid_at"]) if order_row["paid_at"] else None,
                    "items": item_payload,
                }
            )

        return {"orders": orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load orders: {str(e)}")


# ── Admin dashboard + legacy admin endpoints ────────────────────────────────
@app.get("/api/admin/dashboard")
def get_admin_dashboard(
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        total_orders = db.execute(text("SELECT COUNT(*) FROM orders")).scalar() or 0
        active_deliveries = db.execute(
            text("SELECT COUNT(*) FROM deliveries WHERE status = 'in_transit'")
        ).scalar() or 0
        available_robots = db.execute(
            text("SELECT COUNT(*) FROM robots WHERE status = 'charging'")
        ).scalar() or 0
        low_stock_items = db.execute(
            text("SELECT COUNT(*) FROM inventory WHERE quantity <= low_stock_threshold")
        ).scalar() or 0
        pending_deliveries = db.execute(
            text("SELECT COUNT(*) FROM orders WHERE delivery_id IS NULL")
        ).scalar() or 0

        total_revenue = db.execute(
            text(
                """
                SELECT COALESCE(SUM(oi.quantity * oi.unit_price) + SUM(o.delivery_fee), 0)
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                WHERE o.payment_status = 'paid'
                """
            )
        ).scalar() or 0

        revenue_points = db.execute(
            text(
                """
                SELECT
                    DATE(o.created_at) AS day_key,
                    DATE_FORMAT(o.created_at, '%a') AS day_label,
                    ROUND(SUM(order_totals.subtotal + o.delivery_fee), 2) AS amount
                FROM orders o
                JOIN (
                    SELECT order_id, SUM(quantity * unit_price) AS subtotal
                    FROM order_items
                    GROUP BY order_id
                ) order_totals ON order_totals.order_id = o.id
                WHERE DATE(o.created_at) BETWEEN :start_date AND :end_date
                  AND o.payment_status = 'paid'
                GROUP BY DATE(o.created_at), DATE_FORMAT(o.created_at, '%a')
                ORDER BY day_key ASC
                """
            ),
            {
                "start_date": SEVEN_DAY_WINDOW_START,
                "end_date": SEVEN_DAY_WINDOW_END,
            },
        ).mappings().all()

        recent_orders = db.execute(
            text(
                """
                SELECT
                    o.id,
                    o.created_at,
                    u.name AS customer_name,
                    d.status AS delivery_status,
                    order_totals.subtotal + o.delivery_fee AS total_price
                FROM orders o
                LEFT JOIN users u ON u.id = o.user_id
                LEFT JOIN deliveries d ON d.id = o.delivery_id
                JOIN (
                    SELECT order_id, SUM(quantity * unit_price) AS subtotal
                    FROM order_items
                    GROUP BY order_id
                ) order_totals ON order_totals.order_id = o.id
                ORDER BY o.created_at DESC
                LIMIT 4
                """
            )
        ).mappings().all()

        robot_snapshot = db.execute(
            text(
                """
                SELECT id, status
                FROM robots
                ORDER BY
                    CASE status
                        WHEN 'offline' THEN 1
                        WHEN 'on_delivery' THEN 2
                        ELSE 3
                    END,
                    id ASC
                LIMIT 2
                """
            )
        ).mappings().all()

        activity = []
        for order in recent_orders:
            status = delivery_status_to_legacy_order_status(order["delivery_status"])
            activity.append(
                {
                    "title": f"Order #{order['id']} from {order['customer_name'] or 'Unknown customer'}",
                    "description": f"{legacy_status_label(status)} • {format_money(order['total_price'])}",
                    "time": humanize_minutes_ago(order["created_at"]),
                    "iconClass": "fas fa-shopping-cart",
                    "tone": "green" if status == "delivered" else "blue",
                }
            )

        for robot in robot_snapshot:
            status = robot["status"]
            activity.append(
                {
                    "title": f"{robot_label(robot['id'])} status update",
                    "description": status.replace("_", " ").title(),
                    "time": "Fleet snapshot",
                    "iconClass": "fas fa-robot",
                    "tone": "orange" if status == "offline" else "purple",
                }
            )

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
                "values": [float(money_decimal(row["amount"])) for row in revenue_points],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load admin dashboard: {str(e)}")


@app.get("/api/admin/products")
def get_admin_products(
    search: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
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
            text(
                f"""
                SELECT
                    p.id,
                    p.name,
                    p.category,
                    p.price,
                    p.weight_lbs,
                    p.description,
                    p.is_organic,
                    p.image_url,
                    COALESCE(i.quantity, 0) AS stock,
                    COALESCE(i.low_stock_threshold, 10) AS low_stock_threshold,
                    COALESCE(SUM(oi.quantity), 0) AS total_sold
                FROM products p
                LEFT JOIN inventory i ON i.product_id = p.id
                LEFT JOIN order_items oi ON oi.product_id = p.id
                {where_clause}
                GROUP BY
                    p.id, p.name, p.category, p.price, p.weight_lbs,
                    p.description, p.is_organic, p.image_url, i.quantity, i.low_stock_threshold
                ORDER BY p.name ASC
                """
            ),
            params,
        ).mappings().all()

        total_products = db.execute(text("SELECT COUNT(*) FROM products")).scalar() or 0
        low_stock_items = db.execute(
            text("SELECT COUNT(*) FROM inventory WHERE quantity <= low_stock_threshold")
        ).scalar() or 0
        items_sold = db.execute(text("SELECT COALESCE(SUM(quantity), 0) FROM order_items")).scalar() or 0
        active_products = db.execute(
            text("SELECT COUNT(*) FROM inventory WHERE quantity > 0")
        ).scalar() or 0

        categories = db.execute(
            text(
                """
                SELECT DISTINCT category
                FROM products
                WHERE category IS NOT NULL AND category <> ''
                ORDER BY category ASC
                """
            )
        ).scalars().all()

        items = []
        for row in rows:
            stock = int(row["stock"] or 0)
            threshold = int(row["low_stock_threshold"] or 0)
            total_sold = int(row["total_sold"] or 0)

            if stock == 0:
                status = "Out of Stock"
                status_class = "bg-red-100 text-red-800"
                progress_class = "bg-red-500"
                row_class = "bg-red-50/20"
            elif stock <= threshold:
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

            items.append(
                {
                    "id": int(row["id"]),
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
                }
            )

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
                    "value": format_count(active_products),
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
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    days: Optional[int] = Query(default=None),
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        conditions = []
        params = {}

        if search:
            conditions.append("(u.name LIKE :search OR CAST(o.id AS CHAR) LIKE :search)")
            params["search"] = f"%{search}%"

        normalized_status = None
        status_map = {
            "preparing": "processing",
            "processing": "processing",
            "in transit": "out_for_delivery",
            "out_for_delivery": "out_for_delivery",
            "delivered": "delivered",
            "failed": "failed",
        }
        if status:
            normalized_status = status_map.get(str(status).strip().lower())

        if normalized_status == "processing":
            conditions.append("o.delivery_id IS NULL")
        elif normalized_status == "out_for_delivery":
            conditions.append("d.status = 'in_transit'")
        elif normalized_status == "delivered":
            conditions.append("d.status = 'delivered'")
        elif normalized_status == "failed":
            conditions.append("d.status = 'failed'")

        if days:
            conditions.append("o.created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)")
            params["days"] = days

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        order_rows = db.execute(
            text(
                f"""
                SELECT
                    o.id,
                    o.delivery_address,
                    o.created_at,
                    u.name AS customer_name,
                    d.id AS delivery_id,
                    d.status AS delivery_status,
                    d.robot_id,
                    order_totals.subtotal + o.delivery_fee AS total_price
                FROM orders o
                LEFT JOIN users u ON u.id = o.user_id
                LEFT JOIN deliveries d ON d.id = o.delivery_id
                JOIN (
                    SELECT order_id, SUM(quantity * unit_price) AS subtotal
                    FROM order_items
                    GROUP BY order_id
                ) order_totals ON order_totals.order_id = o.id
                {where_clause}
                ORDER BY o.created_at DESC, o.id DESC
                LIMIT 12
                """
            ),
            params,
        ).mappings().all()

        active_robots = db.execute(
            text("SELECT COUNT(*) FROM robots WHERE status IN ('charging', 'on_delivery')")
        ).scalar() or 0
        pending_deliveries = db.execute(text("SELECT COUNT(*) FROM orders WHERE delivery_id IS NULL")).scalar() or 0

        map_points = []
        for row in order_rows[:4]:
            legacy_status = delivery_status_to_legacy_order_status(row["delivery_status"])
            map_points.append(
                {
                    "orderId": f"#ORD-{int(row['id']):04d}",
                    "robotLabel": robot_label(row["robot_id"]),
                    "statusLabel": legacy_status.replace("_", " ").title(),
                    "color": delivery_color(row["delivery_status"] or "processing"),
                }
            )

        cards = []
        for index, row in enumerate(order_rows):
            legacy_status = delivery_status_to_legacy_order_status(row["delivery_status"])

            if legacy_status == "out_for_delivery":
                status_label = "In Transit"
                status_class = "text-blue-700 bg-blue-100"
                detail = f"Assigned to: {robot_label(row['robot_id'])}"
                meta_right = "Out for delivery"
            elif legacy_status == "delivered":
                status_label = "Delivered"
                status_class = "text-green-700 bg-green-100"
                detail = f"Customer: {row['customer_name'] or 'Unknown customer'}"
                meta_right = "Delivered"
            elif legacy_status == "failed":
                status_label = "Failed"
                status_class = "text-red-700 bg-red-100"
                detail = f"Customer: {row['customer_name'] or 'Unknown customer'}"
                meta_right = "Delivery failed"
            else:
                status_label = "Preparing"
                status_class = "text-orange-700 bg-orange-100"
                detail = f"Customer: {row['customer_name'] or 'Unknown customer'}"
                meta_right = "Awaiting robot assignment"

            cards.append(
                {
                    "id": f"#ORD-{int(row['id']):04d}",
                    "status": status_label,
                    "statusClass": status_class,
                    "detail": detail,
                    "metaLeft": f"${float(money_decimal(row['total_price'])):.2f} • {row['delivery_address']}",
                    "metaRight": meta_right,
                    "active": index == 0,
                }
            )

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


# ── New admin endpoints for rebuilt pages ───────────────────────────────────
@app.get("/api/admin/inventory")
def get_admin_inventory(
    search: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
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
            text(
                f"""
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.cost_price,
                    p.weight_lbs,
                    p.category,
                    p.image_url,
                    p.is_organic,
                    COALESCE(i.quantity, 0) AS stock_quantity,
                    COALESCE(i.low_stock_threshold, 10) AS low_stock_threshold,
                    COALESCE(SUM(oi.quantity), 0) AS total_sold
                FROM products p
                LEFT JOIN inventory i ON i.product_id = p.id
                LEFT JOIN order_items oi ON oi.product_id = p.id
                {where_clause}
                GROUP BY
                    p.id, p.name, p.description, p.price, p.cost_price,
                    p.weight_lbs, p.category, p.image_url, p.is_organic,
                    i.quantity, i.low_stock_threshold
                ORDER BY p.name ASC
                """
            ),
            params,
        ).mappings().all()

        categories = db.execute(
            text(
                """
                SELECT DISTINCT category
                FROM products
                WHERE category IS NOT NULL AND category <> ''
                ORDER BY category ASC
                """
            )
        ).scalars().all()

        items = []
        low_stock_count = 0
        for row in rows:
            stock = int(row["stock_quantity"] or 0)
            threshold = int(row["low_stock_threshold"] or 0)
            if stock <= threshold:
                low_stock_count += 1

            items.append(
                {
                    "id": int(row["id"]),
                    "sku": f"PRD-{int(row['id']):03d}",
                    "name": row["name"],
                    "description": row["description"],
                    "price": float(money_decimal(row["price"])),
                    "cost_price": float(money_decimal(row["cost_price"])),
                    "weight_lbs": float(Decimal(str(row["weight_lbs"] or 0))),
                    "category": row["category"] or "Uncategorized",
                    "image_url": row["image_url"],
                    "is_organic": bool(row["is_organic"]),
                    "stock_quantity": stock,
                    "low_stock_threshold": threshold,
                    "is_available": derived_product_available(stock),
                    "total_sold": int(row["total_sold"] or 0),
                }
            )

        return {
            "viewer_role": current_user["role"],
            "summary": {
                "total_products": int(len(items)),
                "low_stock_items": int(low_stock_count),
                "items_sold": int(sum(item["total_sold"] for item in items)),
            },
            "categories": categories,
            "items": items,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load inventory: {str(e)}")


@app.get("/api/admin/inventory/products/{product_id}")
def get_admin_inventory_product(
    product_id: int,
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        row = db.execute(
            text(
                """
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.cost_price,
                    p.weight_lbs,
                    p.category,
                    p.image_url,
                    p.is_organic,
                    COALESCE(i.quantity, 0) AS stock_quantity,
                    COALESCE(i.low_stock_threshold, 10) AS low_stock_threshold
                FROM products p
                LEFT JOIN inventory i ON i.product_id = p.id
                WHERE p.id = :pid
                """
            ),
            {"pid": product_id},
        ).mappings().fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Product not found")

        stock = int(row["stock_quantity"] or 0)
        return {
            "id": int(row["id"]),
            "name": row["name"],
            "description": row["description"],
            "price": float(money_decimal(row["price"])),
            "cost_price": float(money_decimal(row["cost_price"])),
            "weight_lbs": float(Decimal(str(row["weight_lbs"] or 0))),
            "category": row["category"],
            "image_url": row["image_url"],
            "is_organic": bool(row["is_organic"]),
            "stock_quantity": stock,
            "low_stock_threshold": int(row["low_stock_threshold"] or 0),
            "is_available": derived_product_available(stock),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load inventory product: {str(e)}")


@app.post("/api/admin/inventory/products")
def create_admin_inventory_product(
    body: AdminProductCreateRequest,
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        result = db.execute(
            text(
                """
                INSERT INTO products (
                    name, description, price, cost_price, weight_lbs,
                    category, is_organic, image_url
                ) VALUES (
                    :name, :description, :price, :cost_price, :weight_lbs,
                    :category, :is_organic, :image_url
                )
                """
            ),
            {
                "name": body.name,
                "description": body.description,
                "price": float(body.price),
                "cost_price": float(body.cost_price),
                "weight_lbs": float(body.weight_lbs),
                "category": body.category,
                "is_organic": body.is_organic,
                "image_url": body.image_url,
            },
        )
        product_id = int(result.lastrowid)

        db.execute(
            text(
                """
                INSERT INTO inventory (product_id, quantity, low_stock_threshold)
                VALUES (:product_id, :quantity, :low_stock_threshold)
                """
            ),
            {
                "product_id": product_id,
                "quantity": body.stock_quantity,
                "low_stock_threshold": body.low_stock_threshold,
            },
        )
        db.commit()
        return get_admin_inventory_product(product_id, current_user, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")


@app.put("/api/admin/inventory/products/{product_id}")
def update_admin_inventory_product(
    product_id: int,
    body: AdminProductUpdateRequest,
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        exists = db.execute(text("SELECT id FROM products WHERE id = :pid"), {"pid": product_id}).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Product not found")

        db.execute(
            text(
                """
                UPDATE products
                SET
                    name = :name,
                    description = :description,
                    price = :price,
                    cost_price = :cost_price,
                    weight_lbs = :weight_lbs,
                    category = :category,
                    is_organic = :is_organic,
                    image_url = :image_url
                WHERE id = :pid
                """
            ),
            {
                "pid": product_id,
                "name": body.name,
                "description": body.description,
                "price": float(body.price),
                "cost_price": float(body.cost_price),
                "weight_lbs": float(body.weight_lbs),
                "category": body.category,
                "is_organic": body.is_organic,
                "image_url": body.image_url,
            },
        )

        db.execute(
            text(
                """
                INSERT INTO inventory (product_id, quantity, low_stock_threshold)
                VALUES (:pid, :quantity, :low_stock_threshold)
                ON DUPLICATE KEY UPDATE
                    quantity = VALUES(quantity),
                    low_stock_threshold = VALUES(low_stock_threshold)
                """
            ),
            {
                "pid": product_id,
                "quantity": body.stock_quantity,
                "low_stock_threshold": body.low_stock_threshold,
            },
        )

        db.commit()
        return get_admin_inventory_product(product_id, current_user, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")


@app.delete("/api/admin/inventory/products/{product_id}")
def delete_admin_inventory_product(
    product_id: int,
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        usage = db.execute(
            text("SELECT COUNT(*) FROM order_items WHERE product_id = :pid"),
            {"pid": product_id},
        ).scalar() or 0

        if usage > 0:
            raise HTTPException(status_code=400, detail="Cannot delete a product that already exists in order history")

        deleted = db.execute(text("DELETE FROM products WHERE id = :pid"), {"pid": product_id})
        if deleted.rowcount == 0:
            raise HTTPException(status_code=404, detail="Product not found")

        db.commit()
        return {"message": "Product deleted"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete product: {str(e)}")


@app.get("/api/admin/deliveries")
def get_admin_deliveries(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    days: int = Query(default=7, ge=1, le=30),
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        conditions = ["DATE(COALESCE(d.started_at, o.created_at)) >= DATE_SUB(CURDATE(), INTERVAL :days_minus_one DAY)"]
        params = {"days_minus_one": max(days - 1, 0)}

        if search:
            conditions.append(
                "(CAST(d.id AS CHAR) LIKE :search OR CAST(o.id AS CHAR) LIKE :search OR u.name LIKE :search OR o.delivery_address LIKE :search)"
            )
            params["search"] = f"%{search}%"

        normalized_status = str(status or "").strip().lower()
        if normalized_status in {"in transit", "in_transit", "delivered", "failed"}:
            params["status"] = normalized_status.replace(" ", "_")
            conditions.append("d.status = :status")

        where_clause = "WHERE " + " AND ".join(conditions)

        rows = db.execute(
            text(
                f"""
                SELECT
                    d.id,
                    d.status,
                    d.robot_id,
                    d.started_at,
                    d.completed_at,
                    COUNT(o.id) AS order_count,
                    GROUP_CONCAT(o.id ORDER BY o.id SEPARATOR ', ') AS order_ids,
                    GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') AS customer_names,
                    GROUP_CONCAT(DISTINCT o.delivery_address ORDER BY o.delivery_address SEPARATOR ' | ') AS addresses,
                    SUM(item_totals.total_weight) AS total_weight,
                    SUM(item_totals.subtotal + o.delivery_fee) AS revenue
                FROM deliveries d
                LEFT JOIN orders o ON o.delivery_id = d.id
                LEFT JOIN users u ON u.id = o.user_id
                LEFT JOIN (
                    SELECT
                        oi.order_id,
                        SUM(oi.quantity * oi.unit_price) AS subtotal,
                        SUM(oi.quantity * p.weight_lbs) AS total_weight
                    FROM order_items oi
                    JOIN products p ON p.id = oi.product_id
                    GROUP BY oi.order_id
                ) item_totals ON item_totals.order_id = o.id
                {where_clause}
                GROUP BY d.id, d.status, d.robot_id, d.started_at, d.completed_at
                ORDER BY COALESCE(d.started_at, d.completed_at) DESC, d.id DESC
                LIMIT 20
                """
            ),
            params,
        ).mappings().all()

        items = []
        for row in rows:
            badge = delivery_status_badge(row["status"])
            items.append(
                {
                    "id": f"DLV-{int(row['id']):03d}",
                    "delivery_id": int(row["id"]),
                    "status": badge["status"],
                    "statusClass": badge["statusClass"],
                    "robot_id": int(row["robot_id"]),
                    "robot_label": robot_label(row["robot_id"]),
                    "order_count": int(row["order_count"] or 0),
                    "order_ids": [int(part.strip()) for part in str(row["order_ids"] or "").split(",") if part.strip()],
                    "customer_names": row["customer_names"].split(", ") if row["customer_names"] else [],
                    "addresses": row["addresses"].split(" | ") if row["addresses"] else [],
                    "started_at": str(row["started_at"]) if row["started_at"] else None,
                    "completed_at": str(row["completed_at"]) if row["completed_at"] else None,
                    "total_weight_lbs": float(Decimal(str(row["total_weight"] or 0)).quantize(Decimal("0.01"))),
                    "revenue": float(money_decimal(row["revenue"])),
                }
            )

        map_points = [
            {
                "delivery_id": item["delivery_id"],
                "robot_label": item["robot_label"],
                "status": item["status"],
                "addresses": item["addresses"],
            }
            for item in items
        ]

        return {
            "viewer_role": current_user["role"],
            "summary": {
                "total": len(items),
                "in_transit": sum(1 for item in items if item["status"] == "In Transit"),
                "delivered": sum(1 for item in items if item["status"] == "Delivered"),
                "failed": sum(1 for item in items if item["status"] == "Failed"),
            },
            "items": items,
            "map_points": map_points,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load deliveries: {str(e)}")


@app.get("/api/admin/robots")
def get_admin_robots(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        conditions = []
        params = {}

        if search:
            conditions.append("CAST(r.id AS CHAR) LIKE :search")
            params["search"] = f"%{search}%"

        normalized_status = str(status or "").strip().lower()
        if normalized_status in {"working", "charging", "offline"}:
            if normalized_status == "working":
                conditions.append("r.status = 'on_delivery'")
            else:
                conditions.append("r.status = :status")
                params["status"] = normalized_status

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        rows = db.execute(
            text(
                f"""
                SELECT
                    r.id,
                    r.status,
                    active_delivery.id AS active_delivery_id,
                    active_delivery.started_at,
                    COUNT(active_orders.id) AS active_order_count
                FROM robots r
                LEFT JOIN deliveries active_delivery
                    ON active_delivery.robot_id = r.id AND active_delivery.status = 'in_transit'
                LEFT JOIN orders active_orders ON active_orders.delivery_id = active_delivery.id
                {where_clause}
                GROUP BY r.id, r.status, active_delivery.id, active_delivery.started_at
                ORDER BY r.id ASC
                """
            ),
            params,
        ).mappings().all()

        items = []
        for row in rows:
            raw_status = row["status"]
            display_status = "Working" if raw_status == "on_delivery" else raw_status.title()
            items.append(
                {
                    "id": int(row["id"]),
                    "robot_id": f"Robot-{int(row['id']):02d}",
                    "status": display_status,
                    "raw_status": raw_status,
                    "active_delivery_id": int(row["active_delivery_id"]) if row["active_delivery_id"] else None,
                    "active_order_count": int(row["active_order_count"] or 0),
                    "started_at": str(row["started_at"]) if row["started_at"] else None,
                }
            )

        return {
            "viewer_role": current_user["role"],
            "summary": {
                "total": len(items),
                "working": sum(1 for item in items if item["raw_status"] == "on_delivery"),
                "charging": sum(1 for item in items if item["raw_status"] == "charging"),
                "offline": sum(1 for item in items if item["raw_status"] == "offline"),
            },
            "items": items,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load robots: {str(e)}")


@app.get("/api/admin/financial")
def get_admin_financial(
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        daily_rows = db.execute(
            text(
                """
                WITH RECURSIVE days AS (
                    SELECT :start_date AS day_key
                    UNION ALL
                    SELECT DATE_ADD(day_key, INTERVAL 1 DAY)
                    FROM days
                    WHERE day_key < :end_date
                ),
                order_financials AS (
                    SELECT
                        o.id,
                        DATE(o.created_at) AS day_key,
                        SUM(oi.quantity * oi.unit_price) AS subtotal,
                        SUM(oi.quantity * oi.unit_cost) AS cost_total,
                        o.delivery_fee
                    FROM orders o
                    JOIN order_items oi ON oi.order_id = o.id
                    WHERE DATE(o.created_at) BETWEEN :start_date AND :end_date
                      AND o.payment_status = 'paid'
                    GROUP BY o.id, DATE(o.created_at), o.delivery_fee
                )
                SELECT
                    days.day_key,
                    DATE_FORMAT(days.day_key, '%a') AS day_label,
                    COALESCE(SUM(order_financials.subtotal + order_financials.delivery_fee), 0) AS revenue,
                    COALESCE(SUM(order_financials.cost_total), 0) AS costs
                FROM days
                LEFT JOIN order_financials ON order_financials.day_key = days.day_key
                GROUP BY days.day_key, DATE_FORMAT(days.day_key, '%a')
                ORDER BY days.day_key ASC
                """
            ),
            {
                "start_date": SEVEN_DAY_WINDOW_START,
                "end_date": SEVEN_DAY_WINDOW_END,
            },
        ).mappings().all()

        points = []
        total_revenue = Decimal("0.00")
        total_costs = Decimal("0.00")
        for row in daily_rows:
            revenue = money_decimal(row["revenue"])
            costs = money_decimal(row["costs"])
            profit = revenue - costs
            total_revenue += revenue
            total_costs += costs
            points.append(
                {
                    "day": row["day_label"],
                    "date": str(row["day_key"]),
                    "revenue": float(revenue),
                    "costs": float(costs),
                    "profit": float(profit.quantize(Decimal("0.01"))),
                }
            )

        total_profit = total_revenue - total_costs
        return {
            "viewer_role": current_user["role"],
            "summary": {
                "revenue": float(total_revenue.quantize(Decimal("0.01"))),
                "costs": float(total_costs.quantize(Decimal("0.01"))),
                "profit": float(total_profit.quantize(Decimal("0.01"))),
            },
            "chart": points,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load financial data: {str(e)}")


@app.get("/api/admin/revenue")
def get_admin_revenue_alias(
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    return get_admin_financial(current_user=current_user, db=db)


# ── Invite code endpoints (kept same behavior) ──────────────────────────────
@app.post("/api/admin/invite-codes")
def generate_invite_code(
    body: GenerateCodeRequest,
    current_user: dict = Depends(require_role("manager")),
    db: Session = Depends(get_db),
):
    if body.role not in ("employee", "manager"):
        raise HTTPException(status_code=400, detail="role must be 'employee' or 'manager'")

    if body.role == "manager":
        user_row = db.execute(
            text("SELECT is_lead_admin FROM users WHERE id = :id"),
            {"id": current_user["userId"]},
        ).fetchone()
        if not user_row or not user_row.is_lead_admin:
            raise HTTPException(status_code=403, detail="Only the lead admin can generate manager codes")

    code = "OFS-" + secrets.token_urlsafe(8).upper()[:8]
    db.execute(
        text(
            """
            INSERT INTO invite_codes (code, role, created_by, note)
            VALUES (:code, :role, :created_by, :note)
            """
        ),
        {
            "code": code,
            "role": body.role,
            "created_by": current_user["userId"],
            "note": body.note,
        },
    )
    db.commit()
    return {"code": code, "role": body.role}


@app.get("/api/admin/invite-codes")
def list_invite_codes(
    current_user: dict = Depends(require_role("manager")),
    db: Session = Depends(get_db),
):
    user_row = db.execute(
        text("SELECT is_lead_admin FROM users WHERE id = :id"),
        {"id": current_user["userId"]},
    ).fetchone()
    is_lead = user_row and user_row.is_lead_admin

    if is_lead:
        rows = db.execute(
            text(
                """
                SELECT ic.id, ic.code, ic.role, ic.note, ic.created_at, ic.used_at,
                       creator.name AS created_by_name,
                       used_user.name AS used_by_name
                FROM invite_codes ic
                JOIN users creator ON creator.id = ic.created_by
                LEFT JOIN users used_user ON used_user.id = ic.used_by
                ORDER BY ic.created_at DESC
                """
            )
        ).mappings().all()
    else:
        rows = db.execute(
            text(
                """
                SELECT ic.id, ic.code, ic.role, ic.note, ic.created_at, ic.used_at,
                       creator.name AS created_by_name,
                       used_user.name AS used_by_name
                FROM invite_codes ic
                JOIN users creator ON creator.id = ic.created_by
                LEFT JOIN users used_user ON used_user.id = ic.used_by
                WHERE ic.created_by = :uid
                ORDER BY ic.created_at DESC
                """
            ),
            {"uid": current_user["userId"]},
        ).mappings().all()

    return {
        "is_lead_admin": bool(is_lead),
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
    code_row = db.execute(
        text("SELECT id, created_by, used_by FROM invite_codes WHERE id = :id"),
        {"id": code_id},
    ).fetchone()

    if not code_row:
        raise HTTPException(status_code=404, detail="Invite code not found")

    if code_row.used_by is not None:
        raise HTTPException(status_code=400, detail="Cannot revoke a code that has already been used")

    user_row = db.execute(
        text("SELECT is_lead_admin FROM users WHERE id = :id"),
        {"id": current_user["userId"]},
    ).fetchone()
    is_lead = user_row and user_row.is_lead_admin

    if not is_lead and code_row.created_by != current_user["userId"]:
        raise HTTPException(status_code=403, detail="You can only revoke codes you created")

    db.execute(text("DELETE FROM invite_codes WHERE id = :id"), {"id": code_id})
    db.commit()
    return {"message": "Invite code revoked"}


# ── Order status / location tracking ────────────────────────────────────────
class AdminOrderStatusUpdate(BaseModel):
    status: str


@app.get("/api/orders/{order_id}/status")
def get_order_status(
    order_id: int,
    current_user: dict = Depends(require_auth),
    db: Session = Depends(get_db),
):
    try:
        row = db.execute(
            text(
                """
                SELECT
                    o.id,
                    o.user_id,
                    o.delivery_address,
                    o.delivery_fee,
                    o.total_price,
                    o.total_weight,
                    o.payment_status,
                    o.created_at,
                    d.id AS delivery_id,
                    d.status AS delivery_status,
                    d.robot_id,
                    d.started_at,
                    d.completed_at
                FROM orders o
                LEFT JOIN deliveries d ON d.id = o.delivery_id
                WHERE o.id = :order_id
                """
            ),
            {"order_id": order_id},
        ).mappings().fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Order not found")

        is_admin = current_user["role"] in ("manager", "employee")
        if not is_admin and int(row["user_id"]) != current_user["userId"]:
            raise HTTPException(status_code=403, detail="You can only view your own orders")

        legacy_status = delivery_status_to_legacy_order_status(row["delivery_status"])
        status_label = legacy_status_label(legacy_status)

        eta_minutes = None
        if row["delivery_status"] == "in_transit" and row["started_at"]:
            elapsed = (datetime.datetime.now() - row["started_at"]).total_seconds() / 60
            eta_minutes = max(int(30 - elapsed), 1)

        return {
            "order_id": int(row["id"]),
            "status": legacy_status,
            "status_label": status_label,
            "delivery_status": row["delivery_status"],
            "delivery_id": int(row["delivery_id"]) if row["delivery_id"] else None,
            "robot_label": robot_label(row["robot_id"]),
            "delivery_address": row["delivery_address"],
            "delivery_fee": float(money_decimal(row["delivery_fee"])),
            "total_price": float(money_decimal(row["total_price"])),
            "total_weight_lbs": float(Decimal(str(row["total_weight"] or 0)).quantize(Decimal("0.01"))),
            "payment_status": row["payment_status"],
            "eta_minutes": eta_minutes,
            "started_at": str(row["started_at"]) if row["started_at"] else None,
            "completed_at": str(row["completed_at"]) if row["completed_at"] else None,
            "created_at": str(row["created_at"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load order status: {str(e)}")


@app.get("/api/orders/{order_id}/location")
def get_order_location(
    order_id: int,
    current_user: dict = Depends(require_auth),
    db: Session = Depends(get_db),
):
    try:
        row = db.execute(
            text(
                """
                SELECT
                    o.id,
                    o.user_id,
                    o.delivery_address,
                    d.id AS delivery_id,
                    d.status AS delivery_status,
                    d.robot_id,
                    d.started_at,
                    d.completed_at
                FROM orders o
                LEFT JOIN deliveries d ON d.id = o.delivery_id
                WHERE o.id = :order_id
                """
            ),
            {"order_id": order_id},
        ).mappings().fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Order not found")

        is_admin = current_user["role"] in ("manager", "employee")
        if not is_admin and int(row["user_id"]) != current_user["userId"]:
            raise HTTPException(status_code=403, detail="You can only view your own orders")

        # Use route service for proper route + ETA calculation
        route_data = get_delivery_route(
            destination_address=row["delivery_address"],
            order_id=int(row["id"]),
        )

        if row["delivery_status"] == "delivered":
            progress_data = {
                "current_location": route_data["destination"],
                "progress": 1.0,
                "eta_minutes": 0,
            }
        elif row["delivery_status"] == "in_transit" and row["started_at"]:
            progress_data = get_progress_location(
                order_id=int(row["id"]),
                started_at=row["started_at"],
            )
        else:
            progress_data = {
                "current_location": route_data["origin"],
                "progress": 0.0,
                "eta_minutes": route_data["eta_minutes"],
            }

        return {
            "order_id": int(row["id"]),
            "delivery_status": row["delivery_status"],
            "robot_label": robot_label(row["robot_id"]),
            "progress": progress_data["progress"],
            "eta_minutes": progress_data["eta_minutes"],
            "current_location": progress_data["current_location"],
            "store_location": route_data["origin"],
            "destination_location": route_data["destination"],
            "route": route_data["route"],
            "distance_miles": route_data["distance_miles"],
            "delivery_address": row["delivery_address"],
            "route_source": route_data["source"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load order location: {str(e)}")


VALID_STATUS_TRANSITIONS = {
    "processing": ["out_for_delivery", "failed"],
    "out_for_delivery": ["delivered", "failed"],
    "delivered": [],
    "failed": [],
}


@app.patch("/api/admin/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    body: AdminOrderStatusUpdate,
    current_user: dict = Depends(require_role("manager", "employee")),
    db: Session = Depends(get_db),
):
    try:
        order_row = db.execute(
            text(
                """
                SELECT
                    o.id,
                    o.delivery_id,
                    o.total_weight,
                    d.status AS delivery_status,
                    d.robot_id
                FROM orders o
                LEFT JOIN deliveries d ON d.id = o.delivery_id
                WHERE o.id = :order_id
                """
            ),
            {"order_id": order_id},
        ).mappings().fetchone()

        if not order_row:
            raise HTTPException(status_code=404, detail="Order not found")

        current_status = delivery_status_to_legacy_order_status(order_row["delivery_status"])
        new_status = body.status.strip().lower()

        status_aliases = {
            "preparing": "processing",
            "in transit": "out_for_delivery",
            "in_transit": "out_for_delivery",
            "out for delivery": "out_for_delivery",
        }
        new_status = status_aliases.get(new_status, new_status)

        allowed = VALID_STATUS_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot transition from '{current_status}' to '{new_status}'. Allowed: {allowed}",
            )

        if new_status == "out_for_delivery":
            robot = db.execute(
                text("SELECT id FROM robots WHERE status = 'charging' ORDER BY id ASC LIMIT 1")
            ).fetchone()

            if not robot:
                raise HTTPException(status_code=400, detail="No available robots to assign")

            delivery_result = db.execute(
                text(
                    """
                    INSERT INTO deliveries (robot_id, status, started_at)
                    VALUES (:robot_id, 'in_transit', NOW())
                    """
                ),
                {"robot_id": robot.id},
            )
            delivery_id = int(delivery_result.lastrowid)

            db.execute(
                text("UPDATE orders SET delivery_id = :did WHERE id = :oid"),
                {"did": delivery_id, "oid": order_id},
            )
            db.execute(
                text("UPDATE robots SET status = 'on_delivery' WHERE id = :rid"),
                {"rid": robot.id},
            )

        elif new_status == "delivered":
            if order_row["delivery_id"]:
                db.execute(
                    text("UPDATE deliveries SET status = 'delivered', completed_at = NOW() WHERE id = :did"),
                    {"did": order_row["delivery_id"]},
                )
                if order_row["robot_id"]:
                    db.execute(
                        text("UPDATE robots SET status = 'charging' WHERE id = :rid"),
                        {"rid": order_row["robot_id"]},
                    )

        elif new_status == "failed":
            if order_row["delivery_id"]:
                db.execute(
                    text("UPDATE deliveries SET status = 'failed', completed_at = NOW() WHERE id = :did"),
                    {"did": order_row["delivery_id"]},
                )
                if order_row["robot_id"]:
                    db.execute(
                        text("UPDATE robots SET status = 'charging' WHERE id = :rid"),
                        {"rid": order_row["robot_id"]},
                    )

        db.commit()
        return get_order_status(order_id, current_user, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update order status: {str(e)}")


# ── Health check ────────────────────────────────────────────────────────────
@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
