export default function LandingPage() {
  return (
    <>
      <style>{`
        /* ── NAVBAR ── */
        .lp-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(14px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2.5rem;
          height: 74px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
        }

        .lp-nav-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .lp-logo-icon {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, var(--green), var(--green-dark));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(34, 197, 94, 0.28);
          font-size: 1.1rem;
        }

        .lp-logo-text {
          font-size: 1.28rem;
          font-weight: 800;
          color: var(--text-dark);
          letter-spacing: -0.02em;
        }

        .lp-nav-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .lp-btn-ghost {
          padding: 0.55rem 1.2rem;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.92);
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-dark);
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
          box-shadow: var(--shadow-sm);
        }

        .lp-btn-ghost:hover {
          transform: translateY(-2px);
          border-color: rgba(17, 24, 39, 0.16);
          box-shadow: var(--shadow-md);
        }

        .lp-btn-solid {
          padding: 0.55rem 1.2rem;
          background: linear-gradient(135deg, var(--green), var(--green-dark));
          color: var(--white);
          border: none;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.16s ease, box-shadow 0.2s ease;
          box-shadow: 0 8px 20px rgba(34, 197, 94, 0.24);
        }

        .lp-btn-solid:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(34, 197, 94, 0.32);
        }

        /* ── HERO ── */
        .lp-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 6rem 1.5rem 5rem;
          max-width: 820px;
          margin: 0 auto;
        }

        .lp-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--green-soft);
          color: var(--green-dark);
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 0.35rem 0.9rem;
          border-radius: 999px;
          margin-bottom: 1.5rem;
        }

        .lp-hero h1 {
          font-size: clamp(2.4rem, 5vw, 3.75rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-dark);
          line-height: 1.1;
          margin-bottom: 1.25rem;
        }

        .lp-hero h1 span {
          background: linear-gradient(135deg, var(--green), var(--green-dark));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lp-hero p {
          font-size: 1.1rem;
          color: var(--text-mid);
          line-height: 1.75;
          max-width: 600px;
          margin-bottom: 2.5rem;
        }

        .lp-hero-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .lp-cta-primary {
          padding: 0.85rem 2rem;
          background: linear-gradient(135deg, var(--green), var(--green-dark));
          color: var(--white);
          border: none;
          border-radius: 14px;
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.16s ease, box-shadow 0.2s ease;
          box-shadow: 0 12px 28px rgba(34, 197, 94, 0.28);
        }

        .lp-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 32px rgba(34, 197, 94, 0.36);
        }

        .lp-cta-secondary {
          padding: 0.85rem 2rem;
          border: 1.5px solid var(--border);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.92);
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-dark);
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
          box-shadow: var(--shadow-sm);
        }

        .lp-cta-secondary:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        /* ── WHO IT'S FOR ── */
        .lp-section {
          max-width: 1120px;
          margin: 0 auto;
          padding: 4rem 1.5rem;
        }

        .lp-section-label {
          text-align: center;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--green-dark);
          margin-bottom: 0.75rem;
        }

        .lp-section-title {
          text-align: center;
          font-size: clamp(1.6rem, 3vw, 2.2rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          color: var(--text-dark);
          margin-bottom: 0.6rem;
        }

        .lp-section-sub {
          text-align: center;
          font-size: 1rem;
          color: var(--text-mid);
          max-width: 520px;
          margin: 0 auto 3rem;
          line-height: 1.7;
        }

        .lp-audience-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }

        .lp-audience-card {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 20px;
          padding: 1.75rem 1.5rem;
          text-align: center;
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .lp-audience-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .lp-audience-icon {
          font-size: 2.25rem;
          margin-bottom: 0.9rem;
        }

        .lp-audience-card h3 {
          font-size: 0.98rem;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 0.45rem;
        }

        .lp-audience-card p {
          font-size: 0.85rem;
          color: var(--text-mid);
          line-height: 1.6;
        }

        /* ── FEATURES ── */
        .lp-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }

        .lp-feature-card {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 20px;
          padding: 1.75rem 1.5rem;
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .lp-feature-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .lp-feature-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          margin-bottom: 1rem;
        }

        .lp-feature-icon-wrap.green  { background: var(--green-soft); }
        .lp-feature-icon-wrap.amber  { background: #fef3c7; }
        .lp-feature-icon-wrap.blue   { background: #eff6ff; }
        .lp-feature-icon-wrap.purple { background: #f3e8ff; }
        .lp-feature-icon-wrap.rose   { background: #fff1f2; }
        .lp-feature-icon-wrap.teal   { background: #f0fdfa; }
        .lp-feature-icon-wrap.indigo { background: #eef2ff; }
        .lp-feature-icon-wrap.orange { background: #fff7ed; }

        .lp-feature-card h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 0.5rem;
        }

        .lp-feature-card p {
          font-size: 0.875rem;
          color: var(--text-mid);
          line-height: 1.65;
        }

        /* ── DELIVERY HIGHLIGHT ── */
        .lp-highlight {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 1.5rem 5rem;
        }

        .lp-highlight-card {
          background:
            radial-gradient(circle at top left, rgba(255,255,255,0.22), transparent 32%),
            radial-gradient(circle at bottom right, rgba(245,158,11,0.18), transparent 26%),
            linear-gradient(145deg, #22c55e 0%, #16a34a 100%);
          border-radius: 28px;
          padding: 3.5rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: center;
          overflow: hidden;
          position: relative;
          box-shadow: var(--shadow-lg);
        }

        .lp-highlight-card::before {
          content: '';
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
          top: -80px;
          right: -60px;
        }

        .lp-highlight-card::after {
          content: '';
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          bottom: -60px;
          left: -40px;
        }

        .lp-highlight-text h2 {
          font-size: clamp(1.6rem, 3vw, 2.1rem);
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.025em;
          margin-bottom: 1rem;
          line-height: 1.2;
        }

        .lp-highlight-text p {
          font-size: 1rem;
          color: rgba(255,255,255,0.88);
          line-height: 1.75;
          margin-bottom: 1.75rem;
        }

        .lp-highlight-stats {
          display: flex;
          gap: 2rem;
        }

        .lp-stat {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .lp-stat-num {
          font-size: 1.75rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
        }

        .lp-stat-label {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.75);
          font-weight: 500;
        }

        .lp-highlight-visual {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .lp-step {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 16px;
          padding: 1rem 1.25rem;
          backdrop-filter: blur(4px);
        }

        .lp-step-num {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          font-weight: 800;
          color: #fff;
          flex-shrink: 0;
        }

        .lp-step-text {
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
          line-height: 1.4;
        }

        .lp-step-sub {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.7);
          margin-top: 2px;
        }

        /* ── FOOTER ── */
        .lp-footer {
          border-top: 1px solid var(--border);
          padding: 2.5rem 2.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.5);
        }

        .lp-footer-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .lp-footer-logo-icon {
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, var(--green), var(--green-dark));
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
        }

        .lp-footer-logo-text {
          font-size: 1rem;
          font-weight: 800;
          color: var(--text-dark);
          letter-spacing: -0.02em;
        }

        .lp-footer p {
          font-size: 0.84rem;
          color: var(--text-light);
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 960px) {
          .lp-audience-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .lp-features-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .lp-highlight-card {
            grid-template-columns: 1fr;
            padding: 2.5rem;
          }
        }

        @media (max-width: 640px) {
          .lp-nav {
            padding: 0 1.2rem;
          }

          .lp-hero {
            padding: 4rem 1.2rem 3.5rem;
          }

          .lp-audience-grid,
          .lp-features-grid {
            grid-template-columns: 1fr;
          }

          .lp-highlight-stats {
            gap: 1.5rem;
          }

          .lp-footer {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }
      `}</style>

      {/* Navbar */}
      <nav className="lp-nav">
        <a className="lp-nav-logo" href="/">
          <div className="lp-logo-icon">🛒</div>
          <span className="lp-logo-text">OFS</span>
        </a>
        <div className="lp-nav-actions">
          <a className="lp-btn-ghost" href="/login">Sign In</a>
          <a className="lp-btn-solid" href="/login?tab=register">Get Started</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-badge">🌿 Organic &bull; Local &bull; Downtown San Jose</div>
        <h1>
          Fresh Organic Groceries,<br />
          <span>Delivered to Your Door</span>
        </h1>
        <p>
          OFS is Downtown San Jose's organic grocery delivery service — built for SJSU students,
          busy professionals, families, and seniors who deserve quality food without the hassle
          of traffic, parking, or heavy bags.
        </p>
        <div className="lp-hero-actions">
          <a className="lp-cta-primary" href="/login?tab=register">Create Free Account</a>
          <a className="lp-cta-secondary" href="/login">Sign In</a>
        </div>
      </section>

      {/* Who it's for */}
      <section className="lp-section">
        <p className="lp-section-label">Who we serve</p>
        <h2 className="lp-section-title">Built for Downtown San Jose</h2>
        <p className="lp-section-sub">
          No car? No problem. OFS removes every barrier between you and quality organic food.
        </p>
        <div className="lp-audience-grid">
          <div className="lp-audience-card">
            <div className="lp-audience-icon">🎓</div>
            <h3>SJSU Students</h3>
            <p>No car needed — get certified organic groceries delivered right to your dorm or apartment.</p>
          </div>
          <div className="lp-audience-card">
            <div className="lp-audience-icon">💼</div>
            <h3>Busy Professionals</h3>
            <p>Skip the after-work traffic. Schedule your delivery window to arrive when you're home.</p>
          </div>
          <div className="lp-audience-card">
            <div className="lp-audience-icon">👨‍👩‍👧</div>
            <h3>Families</h3>
            <p>Browse a full catalog of organic products filtered by dietary tags to fit your family's needs.</p>
          </div>
          <div className="lp-audience-card">
            <div className="lp-audience-icon">🧓</div>
            <h3>Seniors</h3>
            <p>No heavy bags to carry. Our robotic fleet brings everything to your door.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="lp-section" style={{ paddingTop: '1rem' }}>
        <p className="lp-section-label">Features</p>
        <h2 className="lp-section-title">Everything you need, nothing you don't</h2>
        <p className="lp-section-sub">
          A complete shopping experience from browsing to doorstep delivery.
        </p>
        <div className="lp-features-grid">
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrap green">🥦</div>
            <h3>Browse & Filter the Catalog</h3>
            <p>Shop certified organic products with filters for price, weight, and dietary tags like vegan, gluten-free, and more.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrap amber">🛒</div>
            <h3>Smart Shopping Cart</h3>
            <p>Add items with real-time stock visibility — out-of-stock items are clearly flagged so you never hit a checkout surprise.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrap blue">💳</div>
            <h3>Secure Online Checkout</h3>
            <p>Weight-based delivery pricing: free for orders under 20 lbs, $10 flat for orders 20 lbs or more. Pay online, hassle-free.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrap teal">🤖</div>
            <h3>Autonomous Robotic Delivery</h3>
            <p>Our fleet batches up to 10 orders per trip (max 200 lbs) and uses optimized routes through Downtown San Jose.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrap purple">📍</div>
            <h3>Live Delivery Tracking</h3>
            <p>Watch your robot navigate in real time on a live map with a location marker and accurate ETA powered by Google Maps.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrap rose">🔐</div>
            <h3>Secure Accounts</h3>
            <p>JWT-based authentication protects your account. Role-based access separates customers from OFS staff with a dedicated admin dashboard.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrap indigo">📦</div>
            <h3>Real-time Inventory</h3>
            <p>Stock levels update instantly after every purchase. What you see in the catalog is always accurate — no surprises.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrap orange">🕐</div>
            <h3>Scheduled Deliveries</h3>
            <p>Choose your delivery window and use the "Recently Ordered" section to quickly reorder your go-to items.</p>
          </div>
        </div>
      </section>

      {/* Delivery Highlight */}
      <div className="lp-highlight">
        <div className="lp-highlight-card">
          <div className="lp-highlight-text">
            <h2>Smarter Delivery, Powered by Robots</h2>
            <p>
              OFS's self-driving robotic fleet tackles Downtown San Jose's congested streets so
              you don't have to. Orders are batched intelligently, routes are optimized, and
              you get a live map to follow every step of the journey.
            </p>
            <div className="lp-highlight-stats">
              <div className="lp-stat">
                <span className="lp-stat-num">10</span>
                <span className="lp-stat-label">orders per trip</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat-num">200lb</span>
                <span className="lp-stat-label">max capacity</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat-num">$0</span>
                <span className="lp-stat-label">delivery under 20lb</span>
              </div>
            </div>
          </div>
          <div className="lp-highlight-visual">
            <div className="lp-step">
              <div className="lp-step-num">1</div>
              <div>
                <div className="lp-step-text">Browse & add to cart</div>
                <div className="lp-step-sub">Filter by price, weight, dietary tags</div>
              </div>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">2</div>
              <div>
                <div className="lp-step-text">Checkout securely online</div>
                <div className="lp-step-sub">Weight-based fee calculated automatically</div>
              </div>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">3</div>
              <div>
                <div className="lp-step-text">Robot picks up & routes your order</div>
                <div className="lp-step-sub">Batched with nearby orders for efficiency</div>
              </div>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">4</div>
              <div>
                <div className="lp-step-text">Track live on the map</div>
                <div className="lp-step-sub">Real-time location + ETA via Google Maps</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="lp-footer">
        <a className="lp-footer-logo" href="/">
          <div className="lp-footer-logo-icon">🛒</div>
          <span className="lp-footer-logo-text">OFS</span>
        </a>
        <p>© 2025 Organic Food Service · Downtown San Jose</p>
      </footer>
    </>
  );
}
