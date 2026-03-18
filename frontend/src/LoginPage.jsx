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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --green: #2ebd4e;
          --green-dark: #25a341;
          --text-dark: #1a1a1a;
          --text-mid: #555;
          --text-light: #888;
          --border: #e0e0e0;
          --bg: #f0f2f0;
          --white: #ffffff;
        }

        body {
          font-family: 'Inter', sans-serif;
          background: var(--bg);
          min-height: 100vh;
        }

        .navbar {
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2.5rem;
          height: 60px;
          border-bottom: 1px solid #ddd;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .logo-icon {
          width: 36px; height: 36px;
          background: var(--green);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-dark);
        }

        .navbar-links {
          display: flex;
          gap: 2.5rem;
          list-style: none;
        }

        .navbar-links a {
          text-decoration: none;
          color: var(--text-mid);
          font-size: 0.93rem;
        }

        .navbar-links a:hover { color: var(--text-dark); }

        .page-body {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 60px);
          padding: 2rem;
        }

        .card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          width: 100%;
          max-width: 960px;
          background: var(--white);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 28px rgba(0,0,0,0.10);
          min-height: 560px;
        }

        .panel-left {
          background: var(--green);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding: 2rem 2.5rem 2.8rem;
        }

        .grocery-img-wrap {
          width: 88%;
          max-width: 320px;
          aspect-ratio: 4/3;
          background: rgba(255,255,255,0.18);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 6rem;
          margin-bottom: 1.6rem;
          overflow: hidden;
        }

        /* If you have the actual image, swap the emoji for an <img> tag */
        .grocery-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 14px;
        }

        .panel-left h2 {
          font-size: 1.55rem;
          font-weight: 700;
          color: var(--white);
          text-align: center;
          margin-bottom: 0.6rem;
        }

        .panel-left p {
          font-size: 0.87rem;
          color: rgba(255,255,255,0.85);
          text-align: center;
          line-height: 1.6;
          max-width: 240px;
        }

        .panel-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 3rem;
        }

        .form-inner {
          width: 100%;
          max-width: 340px;
        }

        .form-inner h1 {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 0.3rem;
        }

        .form-sub {
          font-size: 0.87rem;
          color: var(--text-light);
          margin-bottom: 1.8rem;
        }

        .field { margin-bottom: 1rem; }

        .field label {
          display: block;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-dark);
          margin-bottom: 0.4rem;
        }

        .input-wrap { position: relative; }

        .input-wrap input {
          width: 100%;
          padding: 0.72rem 2.4rem 0.72rem 0.85rem;
          border: 1.5px solid var(--border);
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          color: var(--text-dark);
          background: var(--white);
          outline: none;
          transition: border-color 0.18s;
        }

        .input-wrap input::placeholder { color: #bbb; }
        .input-wrap input:focus { border-color: var(--green); }

        .input-icon {
          position: absolute;
          right: 0.8rem;
          top: 50%;
          transform: translateY(-50%);
          color: #ccc;
          font-size: 0.95rem;
          pointer-events: none;
        }

        .row-extras {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0.2rem 0 1.2rem;
        }

        .remember {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.82rem;
          color: var(--text-mid);
          cursor: pointer;
        }

        .remember input[type="checkbox"] {
          accent-color: var(--green);
          width: 14px; height: 14px;
        }

        .forgot {
          font-size: 0.82rem;
          color: var(--green);
          font-weight: 500;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font-family: 'Inter', sans-serif;
        }

        .forgot:hover { text-decoration: underline; }

        .error-box {
          background: #fff0f0;
          border: 1px solid #f5c6c6;
          border-radius: 8px;
          padding: 0.65rem 0.85rem;
          font-size: 0.82rem;
          color: #c0392b;
          margin-bottom: 0.9rem;
        }

        .btn-primary {
          width: 100%;
          padding: 0.82rem;
          background: var(--green);
          color: var(--white);
          border: none;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 0.97rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.18s;
        }

        .btn-primary:hover:not(:disabled) { background: var(--green-dark); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.1rem 0;
          color: var(--text-light);
          font-size: 0.8rem;
        }

        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .social-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem;
          margin-bottom: 1.2rem;
        }

        .btn-social {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0.6rem;
          border: 1.5px solid var(--border);
          border-radius: 8px;
          background: var(--white);
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-dark);
          cursor: pointer;
          transition: border-color 0.15s;
        }

        .btn-social:hover { border-color: #aaa; }

        .g-letter {
          font-weight: 700;
          background: linear-gradient(135deg, #4285f4, #ea4335, #fbbc04, #34a853);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 1rem;
        }

        .fb-letter {
          color: #1877f2;
          font-weight: 700;
          font-size: 1.05rem;
        }

        .switch-mode {
          text-align: center;
          font-size: 0.84rem;
          color: var(--text-mid);
        }

        .switch-mode span {
          color: var(--green);
          font-weight: 600;
          cursor: pointer;
        }

        .switch-mode span:hover { text-decoration: underline; }

        @media (max-width: 680px) {
          .card { grid-template-columns: 1fr; }
          .panel-left { display: none; }
          .panel-right { padding: 2rem 1.5rem; }
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
                  <label>Email or Username</label>
                  <div className="input-wrap">
                    <input
                      type="email"
                      placeholder="Enter your email or username"
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
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      maxLength={72}
                    />
                    <span className="input-icon">🔒</span>
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

              {mode === "login" && (
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
              )}

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
