import { getStoredName, clearFrontendSession } from '../../utils/authSession';

const API_BASE = 'http://localhost:8000';

export default function CustomerAccountMenu() {
  const storedName = getStoredName();
  const profileInitial = storedName?.trim()?.charAt(0)?.toUpperCase() || 'C';

  function handleLogout() {
    fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    clearFrontendSession();
    window.location.href = '/';
  }

  return (
    <>
      <button
        className="customer-profile-btn"
        type="button"
        title="My Profile"
        onClick={() => { window.location.href = '/profile'; }}
        style={{ cursor: 'pointer' }}
      >
        <div className="customer-profile-avatar customer-profile-avatar-fallback">{profileInitial}</div>
      </button>

      <button
        type="button"
        onClick={handleLogout}
        style={{
          padding: '0.45rem 1rem',
          border: '1.5px solid var(--border)',
          borderRadius: '10px',
          background: 'rgba(253, 57, 57, 0.92)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'white',
          cursor: 'pointer',
        }}
      >
        Log out
      </button>
    </>
  );
}
