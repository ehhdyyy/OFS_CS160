import { useState } from "react";
import { persistFrontendSession } from "./utils/authSession";

const API_BASE = "http://localhost:8000";

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  // Read as text first, then try JSON
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // not JSON, keep text
  }

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      text ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data ?? {};
}

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);
    try {
      const data = await apiPost("/api/auth/login", { email, password });
      const { adminEnabled } = persistFrontendSession({
        email,
        name: data.name,
        role: data.role,
      });

      window.location.href = adminEnabled ? "/admin/dashboard" : "/home";
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setErrorMessage("");
    if (!name.trim()) { setErrorMessage("Please enter your name"); return; }
    setIsLoading(true);
    try {
      await apiPost("/api/auth/register", { name, email, password });
      setMode("login");
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <style>{`
        
      /* PAGE LAYOUT */
      .page-body {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(100vh - 74px);
        padding: 3rem 1.5rem;
      }

      .card {
        position: relative;
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        width: 100%;
        max-width: 1120px;
        background: rgba(255, 255, 255, 0.88);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.7);
        border-radius: 28px;
        overflow: hidden;
        box-shadow: var(--shadow-lg);
        min-height: 640px;
      }

      /* LEFT PANEL */
      .panel-left {
        position: relative;
        background:
          radial-gradient(circle at top left, rgba(255,255,255,0.22), transparent 32%),
          radial-gradient(circle at bottom right, rgba(245,158,11,0.18), transparent 26%),
          linear-gradient(145deg, #22c55e 0%, #16a34a 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 3.2rem;
        overflow: hidden;
        align-items:center;
      }

      .panel-left::before,
      .panel-left::after {
        content: "";
        position: absolute;
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
      }

      .panel-left::before {
        width: 240px;
        height: 240px;
        top: -60px;
        right: -80px;
      }

      .panel-left::after {
        width: 180px;
        height: 180px;
        bottom: -50px;
        left: -40px;
      }

      .grocery-img-wrap {
        position: relative;
        width: 100%;
        max-width: 390px;
        aspect-ratio: 1 / 1;
        background: rgba(255,255,255,0.14);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 6.5rem;
        margin-bottom: 2rem;
        overflow: hidden;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 16px 40px rgba(0,0,0,0.12);
      }

      .grocery-img-wrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 28px;
      }

      .panel-left h2 {
        font-size: 2.25rem;
        line-height: 1.1;
        font-weight: 800;
        color: var(--white);
        letter-spacing: -0.03em;
        margin-bottom: 0.9rem;
        max-width: 460px;
        text-align:center;
      }

      .panel-left p {
        font-size: 1rem;
        color: rgba(255,255,255,0.88);
        line-height: 1.75;
        max-width: 430px;
        text-align:center;
      }


      /* RIGHT PANEL */
      .panel-right {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3.5rem 3rem;
        background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.88));
      }

      .form-inner {
        width: 100%;
        max-width: 380px;
      }

      .form-inner h1 {
        font-size: 3rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: var(--text-dark);
        margin-bottom: 0.45rem;
        text-align:center;
      }

      .form-sub {
        font-size: 0.95rem;
        color: var(--text-mid);
        line-height: 1.6;
        margin-bottom: 2rem;
      }

      .field {
        margin-bottom: 1.1rem;
      }

      .field label {
        display: block;
        font-size: 0.84rem;
        font-weight: 600;
        color: var(--text-dark);
        margin-bottom: 0.5rem;
      }

      .input-wrap {
        position: relative;
      }

      .input-wrap input {
        width: 100%;
        padding: 0.95rem 2.75rem 0.95rem 1rem;
        border: 1.5px solid var(--border);
        border-radius: 14px;
        font-family: 'Inter', sans-serif;
        font-size: 0.95rem;
        color: var(--text-dark);
        background: #fff;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
        box-shadow: var(--shadow-sm);
      }

      .input-wrap input::placeholder {
        color: #b4bcc8;
      }

      .input-wrap input:focus {
        border-color: rgba(34, 197, 94, 0.65);
        box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
        transform: translateY(-1px);
      }

      .input-icon {
        position: absolute;
        right: 0.95rem;
        top: 50%;
        transform: translateY(-50%);
        color: #b0b8c5;
        font-size: 0.95rem;
        pointer-events: none;
      }

      .row-extras {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0.4rem 0 1.3rem;
        gap: 1rem;
      }

      .remember {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.84rem;
        color: var(--text-mid);
        cursor: pointer;
      }

      .remember input[type="checkbox"] {
        accent-color: var(--green);
        width: 15px;
        height: 15px;
      }

      .forgot {
        font-size: 0.84rem;
        color: var(--green-dark);
        font-weight: 600;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        font-family: 'Inter', sans-serif;
        transition: opacity 0.18s ease;
      }

      .forgot:hover {
        opacity: 0.8;
        text-decoration: underline;
      }

      .error-box {
        background: #fff5f5;
        border: 1px solid #fecaca;
        border-radius: 14px;
        padding: 0.8rem 0.95rem;
        font-size: 0.84rem;
        color: #b91c1c;
        margin-bottom: 1rem;
      }

      .btn-primary {
        width: 100%;
        padding: 0.95rem 1rem;
        background: linear-gradient(135deg, var(--green), var(--green-dark));
        color: var(--white);
        border: none;
        border-radius: 14px;
        font-family: 'Inter', sans-serif;
        font-size: 0.98rem;
        font-weight: 700;
        letter-spacing: -0.01em;
        cursor: pointer;
        transition: transform 0.16s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        box-shadow: 0 12px 24px rgba(34, 197, 94, 0.24);
      }

      .btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 16px 28px rgba(34, 197, 94, 0.28);
      }

      .btn-primary:active:not(:disabled) {
        transform: translateY(0);
      }

      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .divider {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        margin: 1.4rem 0;
        color: var(--text-light);
        font-size: 0.8rem;
        font-weight: 500;
      }

      .divider::before,
      .divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: linear-gradient(to right, transparent, var(--border), transparent);
      }

      .social-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
      }

      .btn-social {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0.82rem;
        border: 1.5px solid var(--border);
        border-radius: 14px;
        background: rgba(255,255,255,0.92);
        font-family: 'Inter', sans-serif;
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--text-dark);
        cursor: pointer;
        transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
        box-shadow: var(--shadow-sm);
      }

      .btn-social:hover {
        transform: translateY(-2px);
        border-color: rgba(17, 24, 39, 0.16);
        box-shadow: var(--shadow-md);
      }

      .g-letter {
        font-weight: 800;
        background: linear-gradient(135deg, #4285f4, #ea4335, #fbbc04, #34a853);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-size: 1rem;
      }

      .fb-letter {
        color: #1877f2;
        font-weight: 800;
        font-size: 1.05rem;
      }

      .switch-mode {
        text-align: center;
        font-size: 0.88rem;
        color: var(--text-mid);
        margin-top: 1.4rem;
      }

      .switch-mode span {
        color: var(--green-dark);
        font-weight: 700;
        cursor: pointer;
      }

      .switch-mode span:hover {
        text-decoration: underline;
      }

      /* RESPONSIVE */
      @media (max-width: 920px) {
        .card {
          grid-template-columns: 1fr;
          max-width: 620px;
        }

        .panel-left {
          min-height: 360px;
          padding: 2.5rem 2rem;
        }

        .grocery-img-wrap {
          max-width: 280px;
          margin-bottom: 1.5rem;
        }

        .panel-left h2 {
          font-size: 1.85rem;
        }
      }

      @media (max-width: 680px) {
        .navbar {
          padding: 0 1.2rem;
          height: 68px;
        }

        .navbar-links {
          display: none;
        }

        .page-body {
          padding: 1.25rem;
          min-height: calc(100vh - 68px);
        }

        .card {
          border-radius: 22px;
          min-height: auto;
        }

        .panel-left {
          display: none;
        }

        .panel-right {
          padding: 2rem 1.35rem;
        }

        .form-inner h1 {
          font-size: 1.7rem;
        }

        .social-row {
          grid-template-columns: 1fr;
        }
      }
      `}</style>

      {/* Navbar */}
      <nav className="navbar">
        <a className="navbar-logo" href="/">
          <div className="logo-icon">🛒</div>
          <span className="logo-text">OFS</span>
        </a>
        <ul className="navbar-links">
          <li><a href="/home">Home</a></li>
          <li><a href="/shop">Shop</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>

      <div className="page-body">
        <div className="card">

          {/* Left green panel */}
          <div className="panel-left">
            {/*
              TO USE YOUR ACTUAL IMAGE: replace the emoji div below with:
              <div className="grocery-img-wrap">
                <img src="/grocery-cart.png" alt="Fresh groceries" />
              </div>
              and put the image in your /public folder.
            */}
            <div className="grocery-img-wrap">🛒</div>
            <h2>Fresh Groceries Delivered</h2>
            <p>Get fresh groceries delivered to your doorstep in under 30 minutes</p>
          </div>

          {/* Right form panel */}
          <div className="panel-right">
            <div className="form-inner">
              <h1>{mode === "login" ? "Welcome Back" : "Create Account"}</h1>
              <p className="form-sub">
                {mode === "login" ? "Sign in to your OFS account" : "Join OFS and start ordering"}
              </p>

              <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
                {mode === "register" && (
                  <div className="field">
                    <label>Full Name</label>
                    <div className="input-wrap">
                      <input
                        type="text"
                        placeholder="Your full name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                      <span className="input-icon">👤</span>
                    </div>
                  </div>
                )}

                <div className="field">
                  <label>Email</label>
                  <div className="input-wrap">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                    <span className="input-icon">👤</span>
                  </div>
                </div>

                <div className="field">
                  <label>Password</label>
                  <div className="input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      maxLength={72}
                    />
                    <span
                      className="input-icon"
                      onClick={() => setShowPassword(p => !p)}
                      style={{ cursor: 'pointer', pointerEvents: 'auto', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-mid)', letterSpacing: '0.01em' }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </span>
                  </div>
                </div>

                {mode === "login" && (
                  <div className="row-extras">
                    <label className="remember">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                      />
                      Remember me
                    </label>
                    <button type="button" className="forgot">Forgot password?</button>
                  </div>
                )}

                {errorMessage && <div className="error-box">{errorMessage}</div>}

                <button className="btn-primary" type="submit" disabled={isLoading}>
                  {isLoading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
                </button>
              </form>

              {/* {mode === "login" && (
                <>
                  <div className="divider">Or continue with</div>
                  <div className="social-row">
                    <button className="btn-social">
                      <span className="g-letter">G</span> Google
                    </button>
                    <button className="btn-social">
                      <span className="fb-letter">f</span> Facebook
                    </button>
                  </div>
                </>
              )} */}

              <div className="switch-mode">
                {mode === "login" ? (
                  <>Don't have an account?{" "}
                    <span onClick={() => { setMode("register"); setErrorMessage(""); }}>
                      Create Account
                    </span>
                  </>
                ) : (
                  <>Already have an account?{" "}
                    <span onClick={() => { setMode("login"); setErrorMessage(""); }}>
                      Sign In
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
