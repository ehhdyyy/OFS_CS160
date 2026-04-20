import { useState } from "react";

const API_BASE = "http://localhost:8000";

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // not JSON
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

export default function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await apiPost("/api/auth/reset-password", { token, new_password: password });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .page-body {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 3rem 1.5rem;
          background: linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%);
        }

        .reset-card {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 28px;
          padding: 3rem 2.5rem;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
          text-align: center;
        }

        .reset-card h1 {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-dark, #111827);
          margin-bottom: 0.5rem;
        }

        .reset-card p {
          font-size: 0.95rem;
          color: var(--text-mid, #6b7280);
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .field {
          margin-bottom: 1.1rem;
          text-align: left;
        }

        .field label {
          display: block;
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--text-dark, #111827);
          margin-bottom: 0.5rem;
        }

        .input-wrap {
          position: relative;
        }

        .input-wrap input {
          width: 100%;
          padding: 0.95rem 2.75rem 0.95rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 14px;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          color: var(--text-dark, #111827);
          background: #fff;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }

        .input-wrap input:focus {
          border-color: rgba(34, 197, 94, 0.65);
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
        }

        .input-icon {
          position: absolute;
          right: 0.95rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.78rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
        }

        .error-box {
          background: #fff5f5;
          border: 1px solid #fecaca;
          border-radius: 14px;
          padding: 0.8rem 0.95rem;
          font-size: 0.84rem;
          color: #b91c1c;
          margin-bottom: 1rem;
          text-align: left;
        }

        .success-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 14px;
          padding: 1rem;
          font-size: 0.9rem;
          color: #15803d;
          margin-bottom: 1.5rem;
        }

        .btn-primary {
          width: 100%;
          padding: 0.95rem 1rem;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-family: 'Inter', sans-serif;
          font-size: 0.98rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.2s ease, opacity 0.2s ease;
          box-shadow: 0 12px 24px rgba(34, 197, 94, 0.24);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 28px rgba(34, 197, 94, 0.28);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .back-link {
          display: inline-block;
          margin-top: 1.25rem;
          font-size: 0.88rem;
          color: #16a34a;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
        }

        .back-link:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="page-body">
        <div className="reset-card">
          <h1>New Password</h1>

          {!token ? (
            <>
              <p>This reset link is invalid or missing. Please request a new one.</p>
              <a className="back-link" href="/login">Back to Sign In</a>
            </>
          ) : success ? (
            <>
              <div className="success-box">Your password has been updated successfully!</div>
              <a className="btn-primary" href="/login" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', lineHeight: '1', paddingTop: '1rem', paddingBottom: '1rem' }}>
                Sign In
              </a>
            </>
          ) : (
            <>
              <p>Choose a new password for your OFS account.</p>
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>New Password</label>
                  <div className="input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      maxLength={72}
                    />
                    <span
                      className="input-icon"
                      onClick={() => setShowPassword(p => !p)}
                      title={showPassword ? "Hide" : "Show"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </span>
                  </div>
                </div>

                <div className="field">
                  <label>Confirm Password</label>
                  <div className="input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat your new password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      minLength={6}
                      maxLength={72}
                    />
                  </div>
                </div>

                {error && <div className="error-box">{error}</div>}

                <button className="btn-primary" type="submit" disabled={isLoading}>
                  {isLoading ? "Please wait…" : "Set New Password"}
                </button>
              </form>

              <a className="back-link" href="/login">Back to Sign In</a>
            </>
          )}
        </div>
      </div>
    </>
  );
}
