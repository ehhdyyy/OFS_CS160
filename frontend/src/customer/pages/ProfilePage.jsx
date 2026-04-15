import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredName, getStoredEmail, getStoredRole, persistFrontendSession, clearFrontendSession } from '../../utils/authSession';

const API_BASE = 'http://localhost:8000';

function roleLabel(role = '') {
  const normalized = String(role || '').trim().toLowerCase();
  if (!normalized) return 'Customer';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function SectionCard({ title, children }) {
  return (
    <div className="profile-section-card">
      <h2 className="profile-section-title">{title}</h2>
      {children}
    </div>
  );
}

function StatusMessage({ status }) {
  if (!status) return null;
  return (
    <p className={`profile-status-msg ${status.ok ? 'profile-status-ok' : 'profile-status-err'}`}>
      {status.text}
    </p>
  );
}

function formatAddressSummary(address = {}) {
  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.zipCode,
    address.country,
  ]
    .map((value) => (value || '').trim())
    .filter(Boolean)
    .join(', ');
}

function formatCardNumberInput(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function PersonalInfoSection({ initialName, initialEmail, role, onSaved }) {
  const [name, setName] = useState(initialName || '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setName(initialName || '');
  }, [initialName]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/profile/personal-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to save');
      persistFrontendSession({ name: data.name, email: initialEmail, role });
      onSaved?.(data.name);
      setStatus({ ok: true, text: 'Personal info updated.' });
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Personal Info">
      <form onSubmit={handleSave} className="profile-form">
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="pi-name">Full Name</label>
          <input
            id="pi-name"
            className="profile-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="profile-form-row">
          <label className="profile-label">Email</label>
          <p className="profile-read-only">{initialEmail}</p>
        </div>
        <div className="profile-form-row">
          <label className="profile-label">Role</label>
          <p className="profile-read-only">{roleLabel(role)}</p>
        </div>
        <StatusMessage status={status} />
        <button type="submit" className="profile-save-btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </SectionCard>
  );
}

function ChangePasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    setStatus(null);
    if (next !== confirm) {
      setStatus({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    if (next.length < 8) {
      setStatus({ ok: false, text: 'New password must be at least 8 characters.' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to update password');
      setCurrent('');
      setNext('');
      setConfirm('');
      setStatus({ ok: true, text: 'Password updated.' });
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Change Password">
      <form onSubmit={handleSave} className="profile-form">
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="pw-current">Current Password</label>
          <input id="pw-current" className="profile-input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="pw-new">New Password</label>
          <input id="pw-new" className="profile-input" type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="pw-confirm">Confirm New Password</label>
          <input id="pw-confirm" className="profile-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <StatusMessage status={status} />
        <button type="submit" className="profile-save-btn" disabled={saving}>
          {saving ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </SectionCard>
  );
}

function AddressForm({ addressType, endpoint, initial, onSaved, intro, extraActions }) {
  const [fields, setFields] = useState({
    line1: initial?.line1 || '',
    line2: initial?.line2 || '',
    city: initial?.city || '',
    state: initial?.state || '',
    zipCode: initial?.zipCode || '',
    country: initial?.country || '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setFields({
      line1: initial?.line1 || '',
      line2: initial?.line2 || '',
      city: initial?.city || '',
      state: initial?.state || '',
      zipCode: initial?.zipCode || '',
      country: initial?.country || '',
    });
  }, [initial]);

  function set(key) {
    return (e) => setFields((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        line1: fields.line1.trim() || null,
        line2: fields.line2.trim() || null,
        city: fields.city.trim() || null,
        state: fields.state.trim() || null,
        zip_code: fields.zipCode.trim() || null,
        country: fields.country.trim() || null,
      };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to save');
      setStatus({ ok: true, text: `${addressType} address saved.` });
      onSaved?.({
        line1: fields.line1,
        line2: fields.line2,
        city: fields.city,
        state: fields.state,
        zipCode: fields.zipCode,
        country: fields.country,
      });
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="profile-form">
      {intro ? <p className="profile-helper-text">{intro}</p> : null}
      {extraActions ? <div className="profile-inline-actions">{extraActions}</div> : null}
      <div className="profile-form-row">
        <label className="profile-label" htmlFor={`${addressType}-line1`}>Address Line 1</label>
        <input id={`${addressType}-line1`} className="profile-input" type="text" value={fields.line1} onChange={set('line1')} placeholder="123 Main St" />
      </div>
      <div className="profile-form-row">
        <label className="profile-label" htmlFor={`${addressType}-line2`}>Address Line 2</label>
        <input id={`${addressType}-line2`} className="profile-input" type="text" value={fields.line2} onChange={set('line2')} placeholder="Apt, suite, etc. (optional)" />
      </div>
      <div className="profile-form-grid">
        <div className="profile-form-row">
          <label className="profile-label" htmlFor={`${addressType}-city`}>City</label>
          <input id={`${addressType}-city`} className="profile-input" type="text" value={fields.city} onChange={set('city')} />
        </div>
        <div className="profile-form-row">
          <label className="profile-label" htmlFor={`${addressType}-state`}>State / Province</label>
          <input id={`${addressType}-state`} className="profile-input" type="text" value={fields.state} onChange={set('state')} />
        </div>
        <div className="profile-form-row">
          <label className="profile-label" htmlFor={`${addressType}-zip`}>ZIP / Postal Code</label>
          <input id={`${addressType}-zip`} className="profile-input" type="text" value={fields.zipCode} onChange={set('zipCode')} />
        </div>
        <div className="profile-form-row">
          <label className="profile-label" htmlFor={`${addressType}-country`}>Country</label>
          <input id={`${addressType}-country`} className="profile-input" type="text" value={fields.country} onChange={set('country')} placeholder="US" />
        </div>
      </div>
      <StatusMessage status={status} />
      <button type="submit" className="profile-save-btn" disabled={saving}>
        {saving ? 'Saving…' : 'Save Address'}
      </button>
    </form>
  );
}

function PaymentMethodsSection({ paymentMethods, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardType, setCardType] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const editingMethod = paymentMethods.find((method) => method.id === editingId) || null;
  const atLimit = paymentMethods.length >= 3 && !editingMethod;

  useEffect(() => {
    if (!editingMethod) {
      setCardholderName('');
      setCardNumber('');
      setCardExpiry('');
      setCardType('');
      setMakeDefault(paymentMethods.length === 0);
      return;
    }

    setCardholderName(editingMethod.cardholderName || '');
    setCardNumber('');
    setCardExpiry(editingMethod.cardExpiry || '');
    setCardType(editingMethod.cardType || '');
    setMakeDefault(Boolean(editingMethod.isDefault));
  }, [editingMethod, paymentMethods.length]);

  async function handleSave(e) {
    e.preventDefault();
    setStatus(null);

    const last4 = cardNumber.replace(/\D/g, '').slice(-4);
    const effectiveLast4 = last4 || editingMethod?.cardLast4 || '';

    if (!cardholderName.trim()) {
      setStatus({ ok: false, text: 'Cardholder name is required.' });
      return;
    }
    if (!effectiveLast4 || effectiveLast4.length !== 4) {
      setStatus({ ok: false, text: 'Please enter a card number with at least 4 digits.' });
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingMethod
        ? `${API_BASE}/api/profile/payment-methods/${editingMethod.id}`
        : `${API_BASE}/api/profile/payment-methods`;

      const method = editingMethod ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cardholder_name: cardholderName.trim(),
          card_last4: effectiveLast4,
          card_expiry: cardExpiry.trim() || null,
          card_type: cardType.trim() || null,
          is_default: makeDefault,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to save payment method');

      setStatus({ ok: true, text: editingMethod ? 'Payment method updated.' : 'Payment method saved.' });
      setEditingId(null);
      await onRefresh?.();
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id) {
    try {
      setStatus(null);
      const res = await fetch(`${API_BASE}/api/profile/payment-methods/${id}/default`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to update default card');
      setStatus({ ok: true, text: 'Default card updated.' });
      await onRefresh?.();
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    }
  }

  async function handleDelete(id) {
    try {
      setStatus(null);
      const res = await fetch(`${API_BASE}/api/profile/payment-methods/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to delete payment method');
      if (editingId === id) {
        setEditingId(null);
      }
      setStatus({ ok: true, text: 'Payment method deleted.' });
      await onRefresh?.();
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    }
  }

  return (
    <SectionCard title="Payment Information">
      <p className="profile-helper-text">
        You can save up to 3 cards here. The selected default card will appear first during checkout, and you can still use a one-time card for a specific order without saving it.
      </p>

      <div className="profile-card-list">
        {paymentMethods.map((method) => (
          <div key={method.id} className={`profile-card-item ${method.isDefault ? 'profile-card-item-default' : ''}`}>
            <div>
              <div className="profile-card-title">
                {method.cardType || 'Saved Card'} •••• {method.cardLast4}
              </div>
              <div className="profile-card-meta">
                {method.cardholderName}
                {method.cardExpiry ? ` · Exp ${method.cardExpiry}` : ''}
              </div>
            </div>
            <div className="profile-card-actions">
              {method.isDefault ? (
                <span className="profile-card-badge">Default</span>
              ) : (
                <button type="button" className="profile-secondary-btn" onClick={() => handleSetDefault(method.id)}>
                  Make Default
                </button>
              )}
              <button type="button" className="profile-secondary-btn" onClick={() => setEditingId(method.id)}>
                Edit
              </button>
              <button type="button" className="profile-secondary-btn profile-secondary-danger" onClick={() => handleDelete(method.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSave} className="profile-form">
        <div className="profile-form-header-row">
          <h3 className="profile-subtitle">{editingMethod ? 'Edit Saved Card' : 'Add Saved Card'}</h3>
          {editingMethod ? (
            <button type="button" className="profile-secondary-btn" onClick={() => setEditingId(null)}>
              Cancel Edit
            </button>
          ) : null}
        </div>

        <div className="profile-form-row">
          <label className="profile-label" htmlFor="pay-name">Cardholder Name</label>
          <input id="pay-name" className="profile-input" type="text" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} placeholder="Jane Smith" />
        </div>
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="pay-number">Card Number</label>
          <input
            id="pay-number"
            className="profile-input"
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumberInput(e.target.value))}
            placeholder={editingMethod ? `•••• •••• •••• ${editingMethod.cardLast4}` : '•••• •••• •••• ••••'}
            maxLength={19}
            disabled={atLimit}
          />
        </div>
        <div className="profile-form-grid profile-form-grid-2">
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="pay-expiry">Expiry (MM/YYYY)</label>
            <input
              id="pay-expiry"
              className="profile-input"
              type="text"
              value={cardExpiry}
              onChange={(e) => setCardExpiry(e.target.value.replace(/[^\d/]/g, '').slice(0, 7))}
              placeholder="MM/YYYY"
              maxLength={7}
              disabled={atLimit}
            />
          </div>
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="pay-type">Card Type</label>
            <select id="pay-type" className="profile-input" value={cardType} onChange={(e) => setCardType(e.target.value)} disabled={atLimit}>
              <option value="">Select…</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Amex">American Express</option>
              <option value="Discover">Discover</option>
            </select>
          </div>
        </div>
        <label className="profile-checkbox-row">
          <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} disabled={atLimit} />
          Set as default card for checkout
        </label>
        {atLimit ? (
          <p className="profile-helper-text profile-danger-text">
            You already have 3 saved cards. Edit or delete one to save another.
          </p>
        ) : null}
        <StatusMessage status={status} />
        <button type="submit" className="profile-save-btn" disabled={saving || atLimit}>
          {saving ? 'Saving…' : editingMethod ? 'Update Saved Card' : 'Save Card'}
        </button>
      </form>
    </SectionCard>
  );
}

function DeleteAccountSection({ userEmail }) {
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const normalizedStored = String(userEmail || '').trim().toLowerCase();
  const canDelete = String(confirmEmail || '').trim().toLowerCase() === normalizedStored;

  async function handleDelete(e) {
    e.preventDefault();
    if (!canDelete || isDeleting) return;
    setIsDeleting(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: confirmEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to delete account');
      clearFrontendSession();
      window.location.href = '/';
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SectionCard title="Delete Account">
      <p className="profile-helper-text profile-danger-text">
        This will permanently delete your account and all associated data. This action cannot be undone.
      </p>
      <form onSubmit={handleDelete} className="profile-form">
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="del-email">Confirm your email to proceed</label>
          <input
            id="del-email"
            className="profile-input"
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={userEmail || 'Enter your email'}
          />
        </div>
        {errorMessage ? <p className="profile-status-msg profile-status-err">{errorMessage}</p> : null}
        <button
          type="submit"
          className="profile-delete-btn"
          disabled={!canDelete || isDeleting}
        >
          {isDeleting ? 'Deleting…' : 'Delete My Account'}
        </button>
      </form>
    </SectionCard>
  );
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState(null);
  const [loadError, setLoadError] = useState('');

  const storedName = getStoredName();
  const storedEmail = getStoredEmail();
  const storedRole = getStoredRole();
  const displayName = profileData?.name || storedName;
  const displayEmail = profileData?.email || storedEmail;

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/profile`, { credentials: 'include' });
      if (res.status === 401) {
        clearFrontendSession();
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      setProfileData(data);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Failed to load profile');
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleUseShippingForBilling() {
    if (!profileData?.shippingAddress) return;

    const shipping = profileData.shippingAddress;
    const res = await fetch(`${API_BASE}/api/profile/billing-address`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        line1: shipping.line1 || null,
        line2: shipping.line2 || null,
        city: shipping.city || null,
        state: shipping.state || null,
        zip_code: shipping.zipCode || null,
        country: shipping.country || null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to copy shipping address');
    }

    setProfileData((previous) => ({
      ...previous,
      billingAddress: { ...shipping },
    }));
  }

  const shippingSummary = useMemo(
    () => formatAddressSummary(profileData?.shippingAddress || {}),
    [profileData]
  );

  return (
    <div className="profile-page">
      <nav className="customer-navbar">
        <a className="customer-navbar-logo" href="/home">
          <div className="customer-logo-icon">🛒</div>
          <span className="customer-logo-text">OFS</span>
        </a>

        <ul className="customer-navbar-links">
          <li><a href="/home">Home</a></li>
          <li><a href="/orders">My Orders</a></li>
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="customer-profile-avatar customer-profile-avatar-fallback" style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', fontWeight: 800, fontSize: '1rem' }}>
            {displayName?.trim()?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <button
            type="button"
            onClick={() => { fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {}); clearFrontendSession(); window.location.href = '/'; }}
            style={{ padding: '0.45rem 1rem', border: '1.5px solid rgba(17,24,39,0.08)', borderRadius: '10px', background: 'rgba(253,57,57,0.92)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', fontWeight: 600, color: 'white', cursor: 'pointer' }}
          >
            Log out
          </button>
        </div>
      </nav>

      <div className="profile-content">
        <div className="profile-header">
          <div className="profile-header-avatar">
            {displayName?.trim()?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div>
            <h1 className="profile-header-name">{displayName || 'My Profile'}</h1>
            <p className="profile-header-email">{displayEmail}</p>
          </div>
        </div>

        {loadError ? (
          <p className="profile-status-msg profile-status-err">{loadError}</p>
        ) : !profileData ? (
          <p className="profile-loading">Loading profile…</p>
        ) : (
          <div className="profile-sections">
            <PersonalInfoSection
              initialName={profileData.name}
              initialEmail={profileData.email}
              role={storedRole}
              onSaved={(newName) => {
                persistFrontendSession({ name: newName, email: storedEmail, role: storedRole });
                setProfileData((previous) => ({ ...previous, name: newName }));
              }}
            />
            <ChangePasswordSection />

            <SectionCard title="Shipping Address">
              <AddressForm
                addressType="Shipping"
                endpoint="/api/profile/shipping-address"
                initial={profileData.shippingAddress}
                intro="This is the primary address we’ll suggest at checkout."
                onSaved={(nextAddress) => {
                  setProfileData((previous) => ({ ...previous, shippingAddress: nextAddress }));
                }}
              />
            </SectionCard>

            <SectionCard title="Billing Address">
              <AddressForm
                addressType="Billing"
                endpoint="/api/profile/billing-address"
                initial={profileData.billingAddress}
                intro="Use a separate billing address, or copy your shipping address in one click."
                extraActions={(
                  <button
                    type="button"
                    className="profile-secondary-btn"
                    onClick={async () => {
                      try {
                        setLoadError('');
                        await handleUseShippingForBilling();
                      } catch (error) {
                        setLoadError(error.message || 'Failed to copy shipping address');
                      }
                    }}
                    disabled={!shippingSummary}
                  >
                    Billing address is same as shipping
                  </button>
                )}
                onSaved={(nextAddress) => {
                  setProfileData((previous) => ({ ...previous, billingAddress: nextAddress }));
                }}
              />
              {shippingSummary ? (
                <p className="profile-helper-text profile-inline-note">
                  Current shipping address: {shippingSummary}
                </p>
              ) : null}
            </SectionCard>

            <PaymentMethodsSection
              paymentMethods={profileData.paymentMethods || []}
              onRefresh={loadProfile}
            />

            <DeleteAccountSection userEmail={profileData.email} />
          </div>
        )}
      </div>
    </div>
  );
}
