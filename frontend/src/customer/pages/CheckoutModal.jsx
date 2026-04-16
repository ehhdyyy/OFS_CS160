import { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:8000';

/** Format structured address fields into a single delivery address string. */
function formatAddress(addr) {
  return [addr.line1, addr.line2, addr.city, addr.state, addr.zipCode, addr.country]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(', ');
}

function hasAddress(addr) {
  return Boolean(addr && addr.line1 && addr.city);
}

function hasSavedPaymentMethods(methods) {
  return Array.isArray(methods) && methods.length > 0;
}

export default function CheckoutModal({ isOpen, onClose, cart, cartTotal, deliveryFee, finalTotal, onConfirmPayment }) {
  /**
   * Step order:
   *   'confirm'          confirm saved shipping address
   *   'address'          manual shipping address input
   *   'billing'          billing address (same-as-shipping / confirm-saved / manual)
   *   'confirm-payment'  choose among saved cards
   *   'payment'          manual card form
   */
  const [step, setStep] = useState('address');

  // Delivery
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [savedShipping, setSavedShipping] = useState(null);

  // Billing — billingView drives the sub-UI within the billing step
  // null = "same as shipping?" question
  // 'confirm-saved' = show saved billing for approval
  // 'manual' = manual structured fields
  const [billingFields, setBillingFields] = useState({ street: '', apt: '', city: '', state: '', zip: '' });
  const [billingErrors, setBillingErrors] = useState({ street: '', city: '', state: '', zip: '' });
  const [billingView, setBillingView] = useState(null);
  const [savedBilling, setSavedBilling] = useState(null);

  // Payment
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedSavedPaymentId, setSelectedSavedPaymentId] = useState(null);
  const [savedCardCvv, setSavedCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // ── Load profile on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    setStep('address');
    setDeliveryAddress('');
    setBillingFields({ street: '', apt: '', city: '', state: '', zip: '' });
    setBillingErrors({ street: '', city: '', state: '', zip: '' });
    setBillingView(null);
    setError('');
    setSavedShipping(null);
    setSavedBilling(null);
    setSavedPaymentMethods([]);
    setSelectedSavedPaymentId(null);
    setSavedCardCvv('');
    setCardName('');
    setCardNumber('');
    setExpiry('');
    setCvv('');

    fetch(`${API_BASE}/api/profile`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const shipping = data.shippingAddress || {};
        const billing  = data.billingAddress  || {};
        const paymentMethods = Array.isArray(data.paymentMethods) ? data.paymentMethods : [];
        setSavedShipping(shipping);
        setSavedBilling(billing);
        setSavedPaymentMethods(paymentMethods);
        const defaultMethod = paymentMethods.find((method) => method.isDefault) || paymentMethods[0] || null;
        setSelectedSavedPaymentId(defaultMethod ? defaultMethod.id : null);
        if (hasAddress(shipping)) setStep('confirm');
      })
      .catch(() => {
        setSavedShipping({});
        setSavedBilling({});
        setSavedPaymentMethods([]);
        setSelectedSavedPaymentId(null);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Navigation helpers ─────────────────────────────────────────────────────

  function goToBilling() {
    setError('');
    setBillingView(null);   // always start billing from the "same as shipping?" question
    setStep('billing');
  }

  function goToPaymentStep() {
    setError('');
    if (hasSavedPaymentMethods(savedPaymentMethods)) {
      setStep('confirm-payment');
    } else {
      setStep('payment');
    }
  }

  function backFromBilling() {
    setError('');
    if (hasAddress(savedShipping)) {
      setStep('confirm');
    } else {
      setStep('address');
    }
  }

  function backFromPayment() {
    setError('');
    if (hasSavedPaymentMethods(savedPaymentMethods)) {
      setStep('confirm-payment');
      return;
    }
    setStep('billing');
  }

  // ── Formatters ─────────────────────────────────────────────────────────────

  function formatCardNumber(value) {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function formatExpiry(value) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleAddressNext(e) {
    e.preventDefault();
    setError('');
    if (!deliveryAddress.trim()) {
      setError('Please enter a delivery address.');
      return;
    }
    goToBilling();
  }

  function handleBillingManualNext(e) {
    e.preventDefault();
    const { street, city, state, zip } = billingFields;
    const errs = {
      street: street.trim() ? '' : 'Street address is required.',
      city:   city.trim()   ? '' : 'City is required.',
      state:  state.trim()  ? '' : 'State is required.',
      zip:    !zip.trim()                        ? 'ZIP code is required.'
            : !/^\d{5}$/.test(zip.trim())        ? 'ZIP code must be exactly 5 digits.'
            : '',
    };
    setBillingErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    goToPaymentStep();
  }

  async function submitOrder() {
    if (step === 'confirm-payment' && !selectedSavedPaymentId) {
      setError('Please choose a saved card or use a one-time card.');
      return;
    }
    if (step === 'confirm-payment' && savedCardCvv.length < 3) {
      setError('Please enter your card CVV.');
      return;
    }
    setIsProcessing(true);
    try {
      await onConfirmPayment(deliveryAddress.trim() || undefined);
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  }

  async function handlePayment(e) {
    e.preventDefault();
    setError('');
    const cleanCard = cardNumber.replace(/\s/g, '');
    if (!cardName.trim())         { setError('Enter the name on card.'); return; }
    if (cleanCard.length !== 16)  { setError('Enter a valid 16-digit card number.'); return; }
    if (expiry.length !== 5)      { setError('Enter a valid expiry (MM/YY).'); return; }
    if (cvv.length < 3)           { setError('Enter a valid CVV.'); return; }
    await submitOrder();
  }

  function handleClose() {
    if (isProcessing) return;
    onClose();
  }

  // ── Step indicator logic ───────────────────────────────────────────────────
  const onPaymentStep  = step === 'payment' || step === 'confirm-payment';
  const onBillingStep  = step === 'billing';
  const onDeliveryStep = step === 'confirm' || step === 'address';

  const deliveryState = onDeliveryStep ? 'active' : 'done';
  const billingState  = onDeliveryStep ? '' : onBillingStep ? 'active' : 'done';
  const paymentState  = onPaymentStep  ? 'active' : '';

  return (
    <div className="checkout-overlay" onClick={handleClose}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>

        <div className="checkout-modal-header">
          <div className="checkout-steps">
            <span className={`checkout-step ${deliveryState}`}>1. Delivery</span>
            <span className="checkout-step-sep">›</span>
            <span className={`checkout-step ${billingState}`}>2. Billing</span>
            <span className="checkout-step-sep">›</span>
            <span className={`checkout-step ${paymentState}`}>3. Payment</span>
          </div>
          <button type="button" className="checkout-modal-close" onClick={handleClose} disabled={isProcessing}>✕</button>
        </div>

        <div className="checkout-modal-body">

          {/* Order summary — always visible */}
          <div className="checkout-section">
            <h3>Order Summary</h3>
            <div className="checkout-items">
              {cart.map((item) => (
                <div key={item.id} className="checkout-item-row">
                  <span>{item.name} × {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="checkout-totals">
              <div className="checkout-total-row">
                <span>Subtotal</span><span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="checkout-total-row">
                <span>Delivery</span><span>{deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}`}</span>
              </div>
              <div className="checkout-total-row checkout-total-final">
                <span>Total</span><span>${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ── Step 1a: Confirm saved shipping ─────────────────────────── */}
          {step === 'confirm' && savedShipping && (
            <div className="checkout-section">
              <h3>Delivery Address</h3>
              <div className="checkout-saved-address-card">
                <p className="checkout-saved-address-label">Deliver to your saved address?</p>
                <p className="checkout-saved-address-value">{formatAddress(savedShipping)}</p>
              </div>
              <div className="checkout-btn-row">
                <button type="button" className="checkout-back-btn" onClick={() => setStep('address')}>
                  Use a different address
                </button>
                <button
                  type="button"
                  className="checkout-pay-btn"
                  onClick={() => { setDeliveryAddress(formatAddress(savedShipping)); goToBilling(); }}
                >
                  Yes, deliver here
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1b: Manual shipping input ──────────────────────────── */}
          {step === 'address' && (
            <form onSubmit={handleAddressNext} className="checkout-section">
              <h3>Delivery Address</h3>
              <div className="checkout-field">
                <label>Street Address</label>
                <input
                  type="text"
                  placeholder="123 Main St, City, State 12345"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
              {error && <p className="checkout-error">{error}</p>}
              <div className="checkout-btn-row">
                {hasAddress(savedShipping) && (
                  <button type="button" className="checkout-back-btn" onClick={() => { setError(''); setStep('confirm'); }}>
                    ← Back
                  </button>
                )}
                <button type="submit" className="checkout-pay-btn">Continue</button>
              </div>
            </form>
          )}

          {/* ── Step 2: Billing address ──────────────────────────────────── */}
          {step === 'billing' && (
            <div className="checkout-section">
              <h3>Billing Address</h3>

              {/* 2a — "Same as shipping?" question */}
              {billingView === null && (
                <>
                  <div className="checkout-saved-address-card">
                    <p className="checkout-saved-address-label">Is your billing address the same as your delivery address?</p>
                    <p className="checkout-saved-address-value">{deliveryAddress}</p>
                  </div>
                  <div className="checkout-btn-row">
                    <button
                      type="button"
                      className="checkout-back-btn"
                      onClick={() => {
                        setError('');
                        if (hasAddress(savedBilling)) {
                          setBillingView('confirm-saved');
                        } else {
                          setBillingView('manual');
                        }
                      }}
                    >
                      No, use different address
                    </button>
                    <button
                      type="button"
                      className="checkout-pay-btn"
                      onClick={() => goToPaymentStep()}
                    >
                      Yes, same address
                    </button>
                  </div>
                  <div className="checkout-billing-back-row">
                    <button type="button" className="checkout-text-btn" onClick={backFromBilling}>
                      ← Back to delivery
                    </button>
                  </div>
                </>
              )}

              {/* 2b — Confirm saved billing address */}
              {billingView === 'confirm-saved' && savedBilling && (
                <>
                  <div className="checkout-saved-address-card">
                    <p className="checkout-saved-address-label">Use your saved billing address?</p>
                    <p className="checkout-saved-address-value">{formatAddress(savedBilling)}</p>
                  </div>
                  {error && <p className="checkout-error">{error}</p>}
                  <div className="checkout-btn-row">
                    <button type="button" className="checkout-back-btn" onClick={() => { setError(''); setBillingView('manual'); }}>
                      Enter a different address
                    </button>
                    <button
                      type="button"
                      className="checkout-pay-btn"
                      onClick={() => goToPaymentStep()}
                    >
                      Yes, use this address
                    </button>
                  </div>
                  <div className="checkout-billing-back-row">
                    <button type="button" className="checkout-text-btn" onClick={() => { setError(''); setBillingView(null); }}>
                      ← Back
                    </button>
                  </div>
                </>
              )}

              {/* 2c — Manual billing address fields */}
              {billingView === 'manual' && (
                <form onSubmit={handleBillingManualNext}>
                  <div className="checkout-field">
                    <label>Street Address *</label>
                    <input
                      type="text"
                      placeholder="123 Main St"
                      value={billingFields.street}
                      onChange={(e) => setBillingFields((p) => ({ ...p, street: e.target.value }))}
                      className={billingErrors.street ? 'checkout-input-invalid' : ''}
                    />
                    {billingErrors.street && <span className="checkout-field-error">{billingErrors.street}</span>}
                  </div>
                  <div className="checkout-field">
                    <label>Apt / Suite / Unit</label>
                    <input
                      type="text"
                      placeholder="Apt 4B (optional)"
                      value={billingFields.apt}
                      onChange={(e) => setBillingFields((p) => ({ ...p, apt: e.target.value }))}
                    />
                  </div>
                  <div className="checkout-field-row">
                    <div className="checkout-field">
                      <label>City *</label>
                      <input
                        type="text"
                        placeholder="San Francisco"
                        value={billingFields.city}
                        onChange={(e) => setBillingFields((p) => ({ ...p, city: e.target.value }))}
                        className={billingErrors.city ? 'checkout-input-invalid' : ''}
                      />
                      {billingErrors.city && <span className="checkout-field-error">{billingErrors.city}</span>}
                    </div>
                    <div className="checkout-field">
                      <label>State *</label>
                      <input
                        type="text"
                        placeholder="CA"
                        value={billingFields.state}
                        onChange={(e) => setBillingFields((p) => ({ ...p, state: e.target.value }))}
                        className={billingErrors.state ? 'checkout-input-invalid' : ''}
                      />
                      {billingErrors.state && <span className="checkout-field-error">{billingErrors.state}</span>}
                    </div>
                  </div>
                  <div className="checkout-field" style={{ maxWidth: '160px' }}>
                    <label>ZIP Code *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="94105"
                      maxLength={5}
                      value={billingFields.zip}
                      onChange={(e) => setBillingFields((p) => ({ ...p, zip: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                      className={billingErrors.zip ? 'checkout-input-invalid' : ''}
                    />
                    {billingErrors.zip && <span className="checkout-field-error">{billingErrors.zip}</span>}
                  </div>
                  <div className="checkout-btn-row" style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="checkout-back-btn"
                      onClick={() => {
                        setError('');
                        setBillingErrors({ street: '', city: '', state: '', zip: '' });
                        setBillingView(hasAddress(savedBilling) ? 'confirm-saved' : null);
                      }}
                    >
                      ← Back
                    </button>
                    <button type="submit" className="checkout-pay-btn">Continue to Payment</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── Step 3a: Confirm saved card ──────────────────────────────── */}
          {step === 'confirm-payment' && (
            <div className="checkout-section">
              <h3>Payment Details</h3>
              <div className="checkout-saved-methods">
                {savedPaymentMethods.map((method) => (
                  <label key={method.id} className="checkout-saved-method-card">
                    <input
                      type="radio"
                      name="saved-payment-method"
                      checked={selectedSavedPaymentId === method.id}
                      onChange={() => setSelectedSavedPaymentId(method.id)}
                    />
                    <div>
                      <p className="checkout-saved-address-value">
                        {method.cardType ? `${method.cardType} ` : ''}
                        •••• •••• •••• {method.cardLast4}
                        {method.isDefault ? ' · Default' : ''}
                      </p>
                      <p className="checkout-saved-address-value" style={{ marginTop: '0.2rem', fontSize: '0.88rem' }}>
                        {method.cardholderName}
                        {method.cardExpiry ? ` · Exp ${method.cardExpiry}` : ''}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="checkout-field" style={{ maxWidth: '180px' }}>
                <label>CVV</label>
                <input
                  type="password"
                  placeholder="123"
                  value={savedCardCvv}
                  onChange={(e) => setSavedCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  disabled={isProcessing}
                  autoComplete="off"
                />
              </div>
              {error && <p className="checkout-error">{error}</p>}
              <div className="checkout-btn-row">
                <button type="button" className="checkout-back-btn" onClick={backFromPayment} disabled={isProcessing}>
                  ← Back
                </button>
                <button
                  type="button"
                  className="checkout-back-btn"
                  onClick={() => {
                    setError('');
                    setSavedCardCvv('');
                    setStep('payment');
                  }}
                  disabled={isProcessing}
                >
                  Use one-time card
                </button>
                <button type="button" className="checkout-pay-btn" onClick={submitOrder} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : `Pay $${finalTotal.toFixed(2)}`}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3b: Manual payment form ────────────────────────────── */}
          {step === 'payment' && (
            <form onSubmit={handlePayment} className="checkout-section">
              <h3>Payment Details</h3>
              <p className="checkout-field-hint">
                This card will be used for this order only and will not be saved to your profile.
              </p>
              <div className="checkout-field">
                <label>Name on Card</label>
                <input type="text" placeholder="Jane Smith" value={cardName} onChange={(e) => setCardName(e.target.value)} disabled={isProcessing} />
              </div>
              <div className="checkout-field">
                <label>Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  disabled={isProcessing}
                />
              </div>
              <div className="checkout-field-row">
                <div className="checkout-field">
                  <label>Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    disabled={isProcessing}
                  />
                </div>
                <div className="checkout-field">
                  <label>CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    disabled={isProcessing}
                  />
                </div>
              </div>
              {error && <p className="checkout-error">{error}</p>}
              <div className="checkout-btn-row">
                <button type="button" className="checkout-back-btn" onClick={backFromPayment} disabled={isProcessing}>
                  ← Back
                </button>
                <button type="submit" className="checkout-pay-btn" disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : `Pay $${finalTotal.toFixed(2)}`}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
