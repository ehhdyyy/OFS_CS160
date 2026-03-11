# ── Imports ────────────────────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException, Response, Cookie, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Optional
import jwt
import datetime

# ── App setup ──────────────────────────────────────────────────────────────
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config — change these to match your MySQL setup ────────────────────────
DB_USER     = "root"
DB_PASSWORD = "m0mo277&" 
DB_HOST     = "localhost"
DB_PORT     = "3306"
DB_NAME     = "ofs_db"

JWT_SECRET       = "your-secret-key-change-in-production"  # <-- change this
JWT_EXPIRY_HOURS = 24

# ── Database connection ─────────────────────────────────────────────────────
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine       = create_engine(DATABASE_URL)
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

# ── Request models ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

# ── Routes ──────────────────────────────────────────────────────────────────

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
        {"name": body.name, "email": body.email, "password_hash": hash_password(body.password)}
    )
    db.commit()
    return {"message": "Registration successful"}


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


@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("auth_token")
    return {"message": "Logged out"}


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

    return {"userId": user.id, "name": user.name, "email": user.email, "role": user.role}


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    """Quick sanity check — confirms server and DB are both reachable."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
