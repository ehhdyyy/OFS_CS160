/**
 * Validates a structured address object and checks whether it falls within
 * the Downtown San Jose, CA service area. Shared by the Checkout billing
 * form and the Profile address forms so validation logic is never duplicated.
 *
 * @param {{ line1?: string, city?: string, state?: string, zipCode?: string, country?: string }} addr
 * @returns {{ errors: Record<string, string>, serviceAreaWarning: string|null, isValid: boolean }}
 */
export function validateAddress({ line1 = '', city = '', state = '', zipCode = '', country = '' }) {
  const errors = {};

  const l1 = (line1 || '').trim();
  if (!l1) {
    errors.line1 = 'Address Line 1 is required.';
  } else if (/^\d+$/.test(l1)) {
    errors.line1 = 'Address cannot be numbers only.';
  } else if (!/^[A-Za-z0-9 ,.\-#]+$/.test(l1)) {
    errors.line1 = 'Only letters, numbers, spaces, commas, periods, hyphens, and # are allowed.';
  }

  const c = (city || '').trim();
  if (!c) {
    errors.city = 'City is required.';
  } else if (!/^[A-Za-z ]+$/.test(c)) {
    errors.city = 'City must contain letters and spaces only.';
  }

  const s = (state || '').trim();
  if (!s) {
    errors.state = 'State / Province is required.';
  } else if (!/^[A-Za-z]+$/.test(s)) {
    errors.state = 'State / Province must contain letters only.';
  } else if (s.length < 2 || s.length > 50) {
    errors.state = 'State / Province must be 2–50 characters.';
  }

  const z = (zipCode || '').trim();
  if (!z) {
    errors.zipCode = 'ZIP / Postal Code is required.';
  } else if (!/^\d{5}(-\d{4})?$/.test(z) && !/^(?=.*\d)[A-Z0-9 -]{3,10}$/i.test(z)) {
    errors.zipCode = 'Enter a valid ZIP / postal code (e.g., 95112 or 95112-3456).';
  }

  const co = (country || '').trim();
  if (!co) {
    errors.country = 'Country is required.';
  }

  const cityMatch = c.toLowerCase() === 'san jose';
  const stateMatch = ['ca', 'california'].includes(s.toLowerCase());
  const serviceAreaWarning =
    c && s && !(cityMatch && stateMatch)
      ? 'Our robotic delivery service covers Downtown San Jose, CA. Delivery outside this area may not be available.'
      : null;

  return { errors, serviceAreaWarning, isValid: Object.keys(errors).length === 0 };
}

/**
 * Geocode a formatted address string via the Google Maps Geocoding API.
 * Returns { lat, lng } on success, or null if the address cannot be resolved.
 *
 * @param {string} formattedAddress
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function geocodeToCoords(formattedAddress) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || (typeof window !== 'undefined' && window.GOOGLE_MAPS_API_KEY) || '';
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formattedAddress)}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed.');
  const data = await res.json();
  if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) return null;
  const result = data.results[0];
  if (result.partial_match) return null;
  const loc = result.geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}
