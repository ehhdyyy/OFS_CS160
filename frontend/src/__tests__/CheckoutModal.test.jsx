/**
 * Tests for CheckoutModal — delivery address validation and geocoding flow.
 *
 * Run:  npm run test:run -- CheckoutModal
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CheckoutModal from '../customer/pages/CheckoutModal';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_CART = [{ id: 1, product_id: 1, name: 'Test Apple', price: 1.5, quantity: 2 }];

const EMPTY_PROFILE = {
  shippingAddress: { line1: '', line2: '', city: '', state: '', zipCode: '', country: '' },
  billingAddress:  { line1: '', line2: '', city: '', state: '', zipCode: '', country: '' },
  paymentMethods:  [],
};

const SAVED_SHIPPING_PROFILE = {
  shippingAddress: {
    line1: '300 E Santa Clara St', line2: '',
    city: 'San Jose', state: 'CA', zipCode: '95113', country: 'US',
  },
  billingAddress: { line1: '', line2: '', city: '', state: '', zipCode: '', country: '' },
  paymentMethods: [],
};

const IN_BOUNDS_COORDS   = { lat: 37.335, lng: -121.885 };
const OUT_OF_BOUNDS_COORDS = { lat: 37.40, lng: -122.0 };

const GEOCODE_IN_BOUNDS = {
  status: 'OK',
  results: [{ geometry: { location: IN_BOUNDS_COORDS } }],
};
const GEOCODE_OUT_OF_BOUNDS = {
  status: 'OK',
  results: [{ geometry: { location: OUT_OF_BOUNDS_COORDS } }],
};
const GEOCODE_ZERO_RESULTS   = { status: 'ZERO_RESULTS',    results: [] };
const GEOCODE_INVALID_STATUS = { status: 'INVALID_REQUEST', results: [] };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a fetch mock that returns profileResponse for /api/* and geocodeResponse for googleapis. */
function makeFetch(geocodeResponse = GEOCODE_IN_BOUNDS, profileResponse = EMPTY_PROFILE) {
  return vi.fn((url) => {
    if (typeof url === 'string' && url.includes('googleapis.com')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(geocodeResponse) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(profileResponse) });
  });
}

function renderModal(extraProps = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    cart: MOCK_CART,
    cartTotal: 3.0,
    deliveryFee: 0,
    finalTotal: 3.0,
    onConfirmPayment: vi.fn().mockResolvedValue(undefined),
  };
  return { ...render(<CheckoutModal {...defaults} {...extraProps} />), ...defaults, ...extraProps };
}

/** Wait until the manual address form inputs are visible (profile fetch settled). */
async function waitForAddressForm() {
  return screen.findByPlaceholderText('123 Main St');
}

/** Fill all five delivery address fields with valid Downtown San Jose values. */
function fillAddress({
  line1    = '300 E Santa Clara St',
  city     = 'San Jose',
  state    = 'CA',
  zip      = '95113',
  country  = 'US',
} = {}) {
  fireEvent.change(screen.getByPlaceholderText('123 Main St'), { target: { value: line1 } });
  fireEvent.change(screen.getByPlaceholderText('San Jose'),    { target: { value: city } });
  fireEvent.change(screen.getByPlaceholderText('CA'),          { target: { value: state } });
  fireEvent.change(screen.getByPlaceholderText('95112'),       { target: { value: zip } });
  fireEvent.change(screen.getByPlaceholderText('US'),          { target: { value: country } });
}

function clickContinue() {
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

function geocodeCallCount(fetchMock) {
  return fetchMock.mock.calls.filter(([url]) =>
    typeof url === 'string' && url.includes('googleapis.com')
  ).length;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CheckoutModal — delivery address step', () => {

  // ── Field rendering ─────────────────────────────────────────────────────────

  describe('field rendering', () => {
    it('renders all five address fields', async () => {
      global.fetch = makeFetch();
      renderModal();
      await waitForAddressForm();

      expect(screen.getByPlaceholderText('123 Main St')).toBeInTheDocument(); // Street
      expect(screen.getByPlaceholderText('San Jose')).toBeInTheDocument();    // City
      expect(screen.getByPlaceholderText('CA')).toBeInTheDocument();          // State
      expect(screen.getByPlaceholderText('95112')).toBeInTheDocument();       // ZIP
      expect(screen.getByPlaceholderText('US')).toBeInTheDocument();          // Country
    });
  });

  // ── Required-field validation ────────────────────────────────────────────────

  describe('required-field validation', () => {
    it('shows per-field inline errors when all fields are empty and does not call the Geocoding API', async () => {
      global.fetch = makeFetch();
      renderModal();
      await waitForAddressForm();

      // Clear the default country value so every field is blank
      fireEvent.change(screen.getByPlaceholderText('US'), { target: { value: '' } });
      clickContinue();

      expect(screen.getByText('Address Line 1 is required.')).toBeInTheDocument();
      expect(screen.getByText('City is required.')).toBeInTheDocument();
      expect(screen.getByText('State / Province is required.')).toBeInTheDocument();
      expect(screen.getByText('ZIP / Postal Code is required.')).toBeInTheDocument();
      expect(screen.getByText('Country is required.')).toBeInTheDocument();

      // Geocoding must not have been attempted
      expect(geocodeCallCount(global.fetch)).toBe(0);
    });

    it('shows only the relevant field error when a single field is missing', async () => {
      global.fetch = makeFetch();
      renderModal();
      await waitForAddressForm();

      // Fill everything except City
      fillAddress({ city: '' });
      clickContinue();

      expect(screen.getByText('City is required.')).toBeInTheDocument();
      // Other fields are fine — no errors for them
      expect(screen.queryByText('Address Line 1 is required.')).not.toBeInTheDocument();
      expect(geocodeCallCount(global.fetch)).toBe(0);
    });
  });

  // ── Geocoding validation ─────────────────────────────────────────────────────

  describe('geocoding validation', () => {
    it('advances to the billing step when the geocoded address is inside the service area', async () => {
      global.fetch = makeFetch(GEOCODE_IN_BOUNDS);
      renderModal();
      await waitForAddressForm();

      fillAddress();
      clickContinue();

      await waitFor(() => expect(screen.getByText('Billing Address')).toBeInTheDocument());
      expect(screen.queryByPlaceholderText('123 Main St')).not.toBeInTheDocument();
    });

    it('rejects an out-of-bounds address, shows the service-area error, and stays on the address step', async () => {
      global.fetch = makeFetch(GEOCODE_OUT_OF_BOUNDS);
      renderModal();
      await waitForAddressForm();

      fillAddress();
      clickContinue();

      await waitFor(() =>
        expect(screen.getByText(/outside our downtown san jose delivery area/i)).toBeInTheDocument()
      );
      // Still on address step
      expect(screen.getByPlaceholderText('123 Main St')).toBeInTheDocument();
      expect(screen.queryByText('Billing Address')).not.toBeInTheDocument();
    });

    it('shows an error when the Geocoding API returns a non-OK status', async () => {
      global.fetch = makeFetch(GEOCODE_INVALID_STATUS);
      renderModal();
      await waitForAddressForm();

      fillAddress();
      clickContinue();

      await waitFor(() =>
        expect(screen.getByText(/address not found/i)).toBeInTheDocument()
      );
      expect(screen.queryByText('Billing Address')).not.toBeInTheDocument();
    });

    it('shows an error when the Geocoding API returns zero results', async () => {
      global.fetch = makeFetch(GEOCODE_ZERO_RESULTS);
      renderModal();
      await waitForAddressForm();

      fillAddress();
      clickContinue();

      await waitFor(() =>
        expect(screen.getByText(/address not found/i)).toBeInTheDocument()
      );
      expect(screen.queryByText('Billing Address')).not.toBeInTheDocument();
    });

    it('keeps the geocoding error visible after a field edit — clears only on re-submission', async () => {
      global.fetch = makeFetch(GEOCODE_INVALID_STATUS);
      renderModal();
      await waitForAddressForm();

      fillAddress();
      clickContinue();
      await waitFor(() => expect(screen.getByText(/address not found/i)).toBeInTheDocument());

      // Editing a field clears its inline validation error but NOT the geocoding error
      fireEvent.change(screen.getByPlaceholderText('123 Main St'), {
        target: { value: '301 E Santa Clara St' },
      });
      expect(screen.getByText(/address not found/i)).toBeInTheDocument();

      // The error is cleared on the next successful submission attempt
      global.fetch = makeFetch(GEOCODE_IN_BOUNDS);
      clickContinue();
      await waitFor(() => expect(screen.getByText('Billing Address')).toBeInTheDocument());
    });
  });

  // ── In-progress state ─────────────────────────────────────────────────────────

  describe('geocoding in-progress state', () => {
    it('disables the submit button and shows "Validating…" while geocoding is pending', async () => {
      let resolveGeocode;
      global.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.includes('googleapis.com')) {
          return new Promise((resolve) => {
            resolveGeocode = () => resolve({ ok: true, json: () => Promise.resolve(GEOCODE_IN_BOUNDS) });
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(EMPTY_PROFILE) });
      });

      renderModal();
      await waitForAddressForm();
      fillAddress();
      clickContinue();

      // Button must be disabled and labelled "Validating..." while the fetch is held
      await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Validating...' });
        expect(btn).toBeDisabled();
      });

      // Resolve geocoding and confirm transition to billing
      await act(async () => { resolveGeocode(); });
      await waitFor(() => expect(screen.getByText('Billing Address')).toBeInTheDocument());
    });
  });

  // ── handleConfirmSavedShipping ────────────────────────────────────────────────

  describe('handleConfirmSavedShipping', () => {
    it('geocodes the saved address before proceeding and advances to billing when in-bounds', async () => {
      global.fetch = makeFetch(GEOCODE_IN_BOUNDS, SAVED_SHIPPING_PROFILE);
      renderModal();

      await screen.findByText('Deliver to your saved address?');
      fireEvent.click(screen.getByRole('button', { name: 'Yes, deliver here' }));

      await waitFor(() => expect(screen.getByText('Billing Address')).toBeInTheDocument());
      expect(geocodeCallCount(global.fetch)).toBe(1);
    });

    it('shows the service-area error on the confirm step when the saved address is out of bounds', async () => {
      global.fetch = makeFetch(GEOCODE_OUT_OF_BOUNDS, SAVED_SHIPPING_PROFILE);
      renderModal();

      await screen.findByText('Deliver to your saved address?');
      fireEvent.click(screen.getByRole('button', { name: 'Yes, deliver here' }));

      await waitFor(() =>
        expect(screen.getByText(/outside our downtown san jose delivery area/i)).toBeInTheDocument()
      );
      // Stays on confirm step
      expect(screen.getByText('Deliver to your saved address?')).toBeInTheDocument();
      expect(screen.queryByText('Billing Address')).not.toBeInTheDocument();
    });

    it('keeps the confirm button in "Validating…" state while geocoding the saved address', async () => {
      let resolveGeocode;
      global.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.includes('googleapis.com')) {
          return new Promise((resolve) => {
            resolveGeocode = () => resolve({ ok: true, json: () => Promise.resolve(GEOCODE_IN_BOUNDS) });
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(SAVED_SHIPPING_PROFILE) });
      });

      renderModal();
      await screen.findByText('Deliver to your saved address?');
      fireEvent.click(screen.getByRole('button', { name: 'Yes, deliver here' }));

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Validating...' });
        expect(btn).toBeDisabled();
      });

      await act(async () => { resolveGeocode(); });
      await waitFor(() => expect(screen.getByText('Billing Address')).toBeInTheDocument());
    });
  });

  // ── submitOrder payload ───────────────────────────────────────────────────────

  describe('submitOrder payload', () => {
    it('calls onConfirmPayment with { address, lat, lng } — not a plain string', async () => {
      const onConfirmPayment = vi.fn().mockResolvedValue(undefined);
      global.fetch = makeFetch(GEOCODE_IN_BOUNDS);
      renderModal({ onConfirmPayment });

      // Step 1: fill and submit address form
      await waitForAddressForm();
      fillAddress();
      clickContinue();

      // Step 2: billing — "Use delivery address" radio is pre-selected, click Continue
      await screen.findByText('Billing Address');
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

      // Step 3: payment (no saved cards → manual card form)
      await screen.findByText('Payment Details');
      fireEvent.change(screen.getByPlaceholderText('Jane Smith'),           { target: { value: 'Test User' } });
      fireEvent.change(screen.getByPlaceholderText('1234 5678 9012 3456'), { target: { value: '1234 5678 9012 3456' } });
      fireEvent.change(screen.getByPlaceholderText('MM/YY'),                { target: { value: '12/25' } });
      fireEvent.change(screen.getByPlaceholderText('123'),                  { target: { value: '123' } });

      fireEvent.click(screen.getByRole('button', { name: /pay \$/i }));

      await waitFor(() => {
        expect(onConfirmPayment).toHaveBeenCalledTimes(1);
        const arg = onConfirmPayment.mock.calls[0][0];
        // Must be an object, not a string
        expect(typeof arg).toBe('object');
        expect(arg).toEqual({
          address: '300 E Santa Clara St, San Jose, CA, 95113, US',
          lat: IN_BOUNDS_COORDS.lat,
          lng: IN_BOUNDS_COORDS.lng,
        });
      });
    });

    it('does not call onConfirmPayment when the address is out of bounds', async () => {
      const onConfirmPayment = vi.fn();
      global.fetch = makeFetch(GEOCODE_OUT_OF_BOUNDS);
      renderModal({ onConfirmPayment });

      await waitForAddressForm();
      fillAddress();
      clickContinue();

      await waitFor(() =>
        expect(screen.getByText(/outside our downtown san jose delivery area/i)).toBeInTheDocument()
      );
      // onConfirmPayment (and therefore any backend POST) must never be called
      expect(onConfirmPayment).not.toHaveBeenCalled();
    });
  });
});
