import { useEffect, useRef, useState } from 'react';
import { getStoredName, getStoredEmail, getStoredRole, persistFrontendSession, clearFrontendSession } from '../../utils/authSession';
import { validateAddress } from '../../utils/validateAddress';

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

function normalizeAddress(address = {}) {
  return {
    line1: address?.line1 || '',
    line2: address?.line2 || '',
    city: address?.city || '',
    state: address?.state || '',
    zipCode: address?.zipCode || '',
    country: address?.country || 'US',
  };
}

function addressRequestPayload(fields) {
  return {
    line1: fields.line1.trim() || null,
    line2: fields.line2.trim() || null,
    city: fields.city.trim() || null,
    state: fields.state.trim() || null,
    zip_code: fields.zipCode.trim() || null,
    country: fields.country.trim() || null,
  };
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

// ── Personal Info ────────────────────────────────────────────────────────────
function PersonalInfoSection({ initialName, initialEmail, role }) {
  const [name, setName] = useState(initialName || '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/profile/personal-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to save');
      persistFrontendSession({ name: data.name, email: data.email, role });
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
          <label className="profile-label" htmlFor="pi-email">Email</label>
          <p id="pi-email" className="profile-read-only">{initialEmail}</p>
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

// ── Change Password ───────────────────────────────────────────────────────────
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
      setCurrent(''); setNext(''); setConfirm('');
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

// ── Address sections ──────────────────────────────────────────────────────────
function ShippingAddressSection({ initial, onSaved }) {
  const [fields, setFields] = useState(normalizeAddress(initial));
  const [fieldErrors, setFieldErrors] = useState({ line1: '', city: '', state: '', zipCode: '', country: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const hasEditedRef = useRef(false);

  useEffect(() => {
    setFields(normalizeAddress(initial));
  }, [initial]);

  function set(key) {
    return (e) => {
      hasEditedRef.current = true;
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  useEffect(() => {
    if (!hasEditedRef.current) return;

    const timeoutId = window.setTimeout(async () => {
      const { errors, serviceAreaWarning, isValid } = validateAddress(fields);
      setFieldErrors({
        line1: errors.line1 || '',
        city: errors.city || '',
        state: errors.state || '',
        zipCode: errors.zipCode || '',
        country: errors.country || '',
      });

      const isComplete = fields.line1.trim() && fields.city.trim() && fields.state.trim() && fields.zipCode.trim() && fields.country.trim();
      if (!isComplete) {
        setStatus(null);
        return;
      }
      if (!isValid) {
        setStatus({ ok: false, text: 'Enter a complete shipping address to save it.' });
        return;
      }
      if (serviceAreaWarning) {
        setStatus({ ok: false, text: serviceAreaWarning });
        return;
      }

      setSaving(true);
      try {
        const res = await fetch(`${API_BASE}/api/profile/shipping-address`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(addressRequestPayload(fields)),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'Failed to save shipping address');
        setStatus({ ok: true, text: 'Shipping address saved automatically.' });
        onSaved?.(fields);
      } catch (err) {
        setStatus({ ok: false, text: err.message });
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [fields, onSaved]);

  return (
    <SectionCard title="Shipping Address">
      <p className="profile-helper-text">
        This saves automatically after you finish typing a valid address.
      </p>
      <form className="profile-form">
      <div className="profile-form-row">
        <label className="profile-label" htmlFor="shipping-line1">Address Line 1 *</label>
        <input
          id="shipping-line1"
          className={`profile-input${fieldErrors.line1 ? ' profile-input-invalid' : ''}`}
          type="text"
          value={fields.line1}
          onChange={set('line1')}
          placeholder="123 Main St"
        />
        {fieldErrors.line1 && <span className="profile-field-error">{fieldErrors.line1}</span>}
      </div>
      <div className="profile-form-row">
        <label className="profile-label" htmlFor="shipping-line2">Address Line 2</label>
        <input id="shipping-line2" className="profile-input" type="text" value={fields.line2} onChange={set('line2')} placeholder="Apt, suite, etc. (optional)" />
      </div>
      <div className="profile-form-grid">
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="shipping-city">City *</label>
          <input
            id="shipping-city"
            className={`profile-input${fieldErrors.city ? ' profile-input-invalid' : ''}`}
            type="text"
            value={fields.city}
            onChange={set('city')}
          />
          {fieldErrors.city && <span className="profile-field-error">{fieldErrors.city}</span>}
        </div>
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="shipping-state">State / Province *</label>
          <input
            id="shipping-state"
            className={`profile-input${fieldErrors.state ? ' profile-input-invalid' : ''}`}
            type="text"
            value={fields.state}
            onChange={set('state')}
          />
          {fieldErrors.state && <span className="profile-field-error">{fieldErrors.state}</span>}
        </div>
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="shipping-zip">ZIP / Postal Code *</label>
          <input
            id="shipping-zip"
            className={`profile-input${fieldErrors.zipCode ? ' profile-input-invalid' : ''}`}
            type="text"
            value={fields.zipCode}
            onChange={set('zipCode')}
            placeholder="95112 or 95112-3456"
          />
          {fieldErrors.zipCode && <span className="profile-field-error">{fieldErrors.zipCode}</span>}
        </div>
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="shipping-country">Country *</label>
          <input
            id="shipping-country"
            className={`profile-input${fieldErrors.country ? ' profile-input-invalid' : ''}`}
            type="text"
            value={fields.country}
            onChange={set('country')}
            placeholder="US"
          />
          {fieldErrors.country && <span className="profile-field-error">{fieldErrors.country}</span>}
        </div>
      </div>
      <StatusMessage status={status} />
      {saving ? <p className="profile-helper-text">Saving shipping address…</p> : null}
      </form>
    </SectionCard>
  );
}

function BillingAddressSection({ initial, shippingAddress, onSaved }) {
  const [fields, setFields] = useState(normalizeAddress(initial));
  const [fieldErrors, setFieldErrors] = useState({ line1: '', city: '', state: '', zipCode: '', country: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setFields(normalizeAddress(initial));
  }, [initial]);

  function set(key) {
    return (e) => setFields((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setStatus(null);
    const { errors, serviceAreaWarning, isValid } = validateAddress(fields);
    setFieldErrors({
      line1: errors.line1 || '',
      city: errors.city || '',
      state: errors.state || '',
      zipCode: errors.zipCode || '',
      country: errors.country || '',
    });
    if (!isValid) return;
    if (serviceAreaWarning) {
      setStatus({ ok: false, text: serviceAreaWarning });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile/billing-address`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(addressRequestPayload(fields)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to save');
      setStatus({ ok: true, text: 'Billing address saved.' });
      onSaved?.(fields);
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Billing Address">
      <form onSubmit={handleSave} className="profile-form">
        <div className="profile-inline-actions">
          <button
            type="button"
            className="profile-secondary-btn"
            onClick={async () => {
              const shipping = normalizeAddress(shippingAddress);
              if (!shipping.line1 || !shipping.city || !shipping.state || !shipping.zipCode || !shipping.country) {
                setStatus({ ok: false, text: 'Save a complete shipping address first.' });
                return;
              }
              setFields(shipping);
              setSaving(true);
              setStatus(null);
              try {
                const res = await fetch(`${API_BASE}/api/profile/billing-address`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify(addressRequestPayload(shipping)),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.detail || 'Failed to copy shipping address');
                setStatus({ ok: true, text: 'Billing address matched to shipping address.' });
                onSaved?.(shipping);
              } catch (err) {
                setStatus({ ok: false, text: err.message });
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            Billing address is same as shipping
          </button>
        </div>
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="billing-line1">Address Line 1 *</label>
          <input
            id="billing-line1"
            className={`profile-input${fieldErrors.line1 ? ' profile-input-invalid' : ''}`}
            type="text"
            value={fields.line1}
            onChange={set('line1')}
            placeholder="123 Main St"
          />
          {fieldErrors.line1 && <span className="profile-field-error">{fieldErrors.line1}</span>}
        </div>
        <div className="profile-form-row">
          <label className="profile-label" htmlFor="billing-line2">Address Line 2</label>
          <input id="billing-line2" className="profile-input" type="text" value={fields.line2} onChange={set('line2')} placeholder="Apt, suite, etc. (optional)" />
        </div>
        <div className="profile-form-grid">
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="billing-city">City *</label>
            <input
              id="billing-city"
              className={`profile-input${fieldErrors.city ? ' profile-input-invalid' : ''}`}
              type="text"
              value={fields.city}
              onChange={set('city')}
            />
            {fieldErrors.city && <span className="profile-field-error">{fieldErrors.city}</span>}
          </div>
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="billing-state">State / Province *</label>
            <input
              id="billing-state"
              className={`profile-input${fieldErrors.state ? ' profile-input-invalid' : ''}`}
              type="text"
              value={fields.state}
              onChange={set('state')}
            />
            {fieldErrors.state && <span className="profile-field-error">{fieldErrors.state}</span>}
          </div>
        </div>
        <div className="profile-form-grid">
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="billing-zip">ZIP / Postal Code *</label>
            <input
              id="billing-zip"
              className={`profile-input${fieldErrors.zipCode ? ' profile-input-invalid' : ''}`}
              type="text"
              value={fields.zipCode}
              onChange={set('zipCode')}
              placeholder="95112 or 95112-3456"
            />
            {fieldErrors.zipCode && <span className="profile-field-error">{fieldErrors.zipCode}</span>}
          </div>
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="billing-country">Country *</label>
            <input
              id="billing-country"
              className={`profile-input${fieldErrors.country ? ' profile-input-invalid' : ''}`}
              type="text"
              value={fields.country}
              onChange={set('country')}
              placeholder="US"
            />
            {fieldErrors.country && <span className="profile-field-error">{fieldErrors.country}</span>}
          </div>
        </div>
        <StatusMessage status={status} />
        <button type="submit" className="profile-save-btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save Address'}
        </button>
      </form>
    </SectionCard>
  );
}

// ── Payment Information ───────────────────────────────────────────────────────
function PaymentInfoSection({ initialMethods = [], onSaved }) {
  const [paymentMethods, setPaymentMethods] = useState(Array.isArray(initialMethods) ? initialMethods : []);
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardType, setCardType] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setPaymentMethods(Array.isArray(initialMethods) ? initialMethods : []);
  }, [initialMethods]);

  async function refreshProfileMethods() {
    const res = await fetch(`${API_BASE}/api/profile`, { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to refresh payment methods');
    const methods = Array.isArray(data.paymentMethods) ? data.paymentMethods : [];
    setPaymentMethods(methods);
    onSaved?.(methods);
  }

  async function handleSave(e) {
    e.preventDefault();
    setStatus(null);

    const digits = cardNumber.replace(/\D/g, '');
    if (!cardholderName.trim()) {
      setStatus({ ok: false, text: 'Cardholder name is required.' });
      return;
    }
    if (digits.length !== 16) {
      setStatus({ ok: false, text: 'Enter a valid 16-digit card number.' });
      return;
    }
    if (paymentMethods.length >= 3) {
      setStatus({ ok: false, text: 'You can save up to 3 cards.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cardholder_name: cardholderName.trim(),
          card_last4: digits.slice(-4),
          card_expiry: cardExpiry.trim() || null,
          card_type: cardType.trim() || null,
          is_default: paymentMethods.length === 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to save payment method');
      setCardholderName('');
      setCardNumber('');
      setCardExpiry('');
      setCardType('');
      await refreshProfileMethods();
      setStatus({ ok: true, text: 'Payment method saved.' });
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(methodId) {
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/profile/payment-methods/${methodId}/default`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to set default card');
      await refreshProfileMethods();
      setStatus({ ok: true, text: 'Default card updated.' });
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    }
  }

  async function deleteMethod(methodId) {
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/profile/payment-methods/${methodId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to delete card');
      await refreshProfileMethods();
      setStatus({ ok: true, text: 'Payment method removed.' });
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    }
  }

  return (
    <SectionCard title="Payment Information">
      <p className="profile-helper-text">
        You can save up to 3 cards for faster checkout. CVV is never stored.
      </p>

      <div className="profile-payment-methods">
        {paymentMethods.map((method) => (
          <div key={method.id} className="profile-payment-card">
            <div>
              <p className="profile-payment-title">
                {method.cardType ? `${method.cardType} ` : ''}
                •••• •••• •••• {method.cardLast4}
                {method.isDefault ? ' · Default' : ''}
              </p>
              <p className="profile-payment-meta">
                {method.cardholderName}
                {method.cardExpiry ? ` · Exp ${method.cardExpiry}` : ''}
              </p>
            </div>
            <div className="profile-payment-actions">
              {!method.isDefault && (
                <button type="button" className="profile-secondary-btn" onClick={() => setDefault(method.id)}>
                  Make default
                </button>
              )}
              <button type="button" className="profile-secondary-btn profile-secondary-danger" onClick={() => deleteMethod(method.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {paymentMethods.length < 3 ? (
        <form onSubmit={handleSave} className="profile-form">
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
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
            />
          </div>
          <div className="profile-form-grid profile-form-grid-2">
            <div className="profile-form-row">
              <label className="profile-label" htmlFor="pay-expiry">Expiry (MM/YY)</label>
              <input
                id="pay-expiry"
                className="profile-input"
                type="text"
                inputMode="numeric"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                maxLength={5}
              />
            </div>
            <div className="profile-form-row">
              <label className="profile-label" htmlFor="pay-type">Card Type</label>
              <select id="pay-type" className="profile-input" value={cardType} onChange={(e) => setCardType(e.target.value)}>
                <option value="">Select…</option>
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="Amex">American Express</option>
                <option value="Discover">Discover</option>
              </select>
            </div>
          </div>
          <StatusMessage status={status} />
          <button type="submit" className="profile-save-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save Payment Info'}
          </button>
        </form>
      ) : (
        <>
          <StatusMessage status={status} />
          <p className="profile-helper-text profile-inline-note">You already have 3 saved cards. Delete one to add another.</p>
        </>
      )}
    </SectionCard>
  );
}

// ── Delete Account ────────────────────────────────────────────────────────────
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

// ── Main ProfilePage ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [profileData, setProfileData] = useState(null);
  const [loadError, setLoadError] = useState('');

  const storedName = getStoredName();
  const storedEmail = getStoredEmail();
  const storedRole = getStoredRole();

  useEffect(() => {
    async function loadProfile() {
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
      } catch (err) {
        setLoadError(err.message || 'Failed to load profile');
      }
    }
    loadProfile();
  }, []);

  function updateProfileSection(key, value) {
    setProfileData((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

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
            {storedName?.trim()?.charAt(0)?.toUpperCase() || 'C'}
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
            {storedName?.trim()?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div>
            <h1 className="profile-header-name">{storedName || 'My Profile'}</h1>
            <p className="profile-header-email">{storedEmail}</p>
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
            />
            <ChangePasswordSection />
            <ShippingAddressSection
              initial={profileData.shippingAddress}
              onSaved={(address) => updateProfileSection('shippingAddress', normalizeAddress(address))}
            />
            <BillingAddressSection
              initial={profileData.billingAddress}
              shippingAddress={profileData.shippingAddress}
              onSaved={(address) => updateProfileSection('billingAddress', normalizeAddress(address))}
            />
            <PaymentInfoSection
              initialMethods={profileData.paymentMethods}
              onSaved={(methods) => updateProfileSection('paymentMethods', methods)}
            />
            <DeleteAccountSection userEmail={profileData.email} />
          </div>
        )}
      </div>
    </div>
  );
}
