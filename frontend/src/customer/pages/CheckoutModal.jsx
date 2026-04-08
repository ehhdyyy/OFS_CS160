import { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:8000';

export default function CheckoutModal({ isOpen, onClose, cart, cartTotal, deliveryFee, finalTotal, onConfirmPayment }) {
  const [step, setStep] = useState('address'); // 'address' | 'payment'
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [savedAddress, setSavedAddress] = useState(null); // null = loading, '' = none
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setSavedAddress(data.address || ''))
      .catch(() => setSavedAddress(''));
  }, [isOpen]);

  if (!isOpen) return null;

  function formatCardNumber(value) {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function formatExpiry(value) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  }

  function handleAddressNext(e) {
    e.preventDefault();
    setError('');
    if (!deliveryAddress.trim() && !savedAddress) {
      setError('Please enter a delivery address.');
      return;
    }
    setStep('payment');
  }

  async function handlePayment(e) {
    e.preventDefault();
    setError('');

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (!cardName.trim()) { setError('Enter the name on card.'); return; }
    if (cleanCard.length !== 16) { setError('Enter a valid 16-digit card number.'); return; }
    if (expiry.length !== 5) { setError('Enter a valid expiry (MM/YY).'); return; }
    if (cvv.length < 3) { setError('Enter a valid CVV.'); return; }

    setIsProcessing(true);
    try {
      await onConfirmPayment(deliveryAddress.trim() || undefined);
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  }

  function handleClose() {
    if (isProcessing) return;
    onClose();
  }

  return (
    <div className="checkout-overlay" onClick={handleClose}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>

        <div className="checkout-modal-header">
          <div className="checkout-steps">
            <span className={step === 'address' ? 'checkout-step active' : 'checkout-step done'}>1. Delivery</span>
            <span className="checkout-step-sep">›</span>
            <span className={step === 'payment' ? 'checkout-step active' : 'checkout-step'}>2. Payment</span>
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
                <span>Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="checkout-total-row">
                <span>Delivery</span>
                <span>{deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}`}</span>
              </div>
              <div className="checkout-total-row checkout-total-final">
                <span>Total</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Step 1: Delivery address */}
          {step === 'address' && (
            <form onSubmit={handleAddressNext} className="checkout-section">
              <h3>Delivery Address</h3>
              <div className="checkout-field">
                <label>
                  Street Address
                  {savedAddress && <span className="checkout-field-hint"> (leave blank to use: {savedAddress})</span>}
                </label>
                <input
                  type="text"
                  placeholder="123 Main St, City, State 12345"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
              {error && <p className="checkout-error">{error}</p>}

              <button type="submit" className="checkout-pay-btn">
                Continue to Payment
              </button>
            </form>
          )}

          {/* Step 2: Payment */}
          {step === 'payment' && (
            <form onSubmit={handlePayment} className="checkout-section">
              <h3>Payment Details</h3>

              <div className="checkout-field">
                <label>Name on Card</label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  disabled={isProcessing}
                />
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
                <button type="button" className="checkout-back-btn" onClick={() => { setError(''); setStep('address'); }} disabled={isProcessing}>
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
