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

    db.execute(
        text("""
            INSERT INTO users (name, email, password_hash, role)
            VALUES (:name, :email, :password_hash, 'customer')
        """),
        {
            "name": body.name,
            "email": body.email,
            "password_hash": hash_password(body.password),
        }
    )
    db.commit()
    return {"message": "Registration successful"}


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

    return {"message": "Login successful", "role": user.role, "name": user.name}


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
                p.image_url
            FROM products p
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
            })

        return {
            "items": products,
            "total": total,
            "page": page,
            "per_page": per_page,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load products: {str(e)}")


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


# Check that database & server running
@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    """Quick sanity check — confirms server and DB are both reachable."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")