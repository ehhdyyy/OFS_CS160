import { useMemo, useState } from 'react';
import { getStoredEmail, getStoredName, getStoredRole, clearFrontendSession } from '../../utils/authSession';

const API_BASE = 'http://localhost:8000';

function roleLabel(role = '') {
  const normalized = String(role || '').trim().toLowerCase();
  if (!normalized) return 'Customer';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function CustomerAccountMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const storedName = getStoredName();
  const storedEmail = getStoredEmail();
  const storedRole = getStoredRole();
  const profileInitial = storedName?.trim()?.charAt(0)?.toUpperCase() || 'C';

  const normalizedStoredEmail = useMemo(() => String(storedEmail || '').trim().toLowerCase(), [storedEmail]);
  const canDelete = String(confirmEmail || '').trim().toLowerCase() === normalizedStoredEmail;

  async function handleDeleteAccount() {
    if (!canDelete || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMessage('');

      const response = await fetch(`${API_BASE}/api/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: confirmEmail.trim() }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to delete account');
      }

      clearFrontendSession();
      window.location.href = '/';
    } catch (error) {
      setErrorMessage(error.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  }

  function handleLogout() {
    clearFrontendSession();
    window.location.href = '/';
  }

  return (
    <>
      <div className="customer-account-menu">
        <button
          className="customer-profile-btn"
          type="button"
          title={storedName || 'Customer'}
          onClick={() => setIsOpen((previous) => !previous)}
        >
          <div className="customer-profile-avatar customer-profile-avatar-fallback">{profileInitial}</div>
        </button>

        {isOpen ? (
          <div className="customer-account-dropdown">
            <div className="customer-account-dropdown-section">
              <div className="customer-account-dropdown-label">Name</div>
              <div className="customer-account-dropdown-value">{storedName || 'Customer'}</div>
            </div>

            <div className="customer-account-dropdown-section">
              <div className="customer-account-dropdown-label">Email</div>
              <div className="customer-account-dropdown-value">{storedEmail || '—'}</div>
            </div>

            <div className="customer-account-dropdown-section">
              <div className="customer-account-dropdown-label">Role</div>
              <div className="customer-account-dropdown-value">{roleLabel(storedRole)}</div>
            </div>

            <div className="customer-account-dropdown-actions">
              <button
                type="button"
                className="customer-danger-link"
                onClick={() => {
                  setIsOpen(false);
                  setShowDeleteModal(true);
                  setErrorMessage('');
                  setConfirmEmail('');
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        ) : null}
      </div>

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

      {showDeleteModal ? (
        <div className="customer-account-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="customer-account-modal" onClick={(event) => event.stopPropagation()}>
            <div className="customer-account-modal-header">
              <h3>Delete Account</h3>
              <button type="button" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>

            <p className="customer-account-modal-copy">
              To prevent accidental deletion, enter your email address again to confirm.
            </p>

            <label className="customer-account-modal-label" htmlFor="delete-account-email">
              Confirm Email
            </label>
            <input
              id="delete-account-email"
              type="email"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              placeholder={storedEmail || 'Enter your email'}
              className="customer-account-modal-input"
            />

            {errorMessage ? <p className="customer-account-modal-error">{errorMessage}</p> : null}

            <div className="customer-account-modal-actions">
              <button
                type="button"
                className="customer-account-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="customer-account-delete"
                disabled={!canDelete || isDeleting}
                onClick={handleDeleteAccount}
              >
                {isDeleting ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
