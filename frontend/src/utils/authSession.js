export const ADMIN_EMAIL = 'admin@ofs.com';

const STORAGE_KEYS = {
  email: 'ofs-user-email',
  name: 'ofs-user-name',
  adminUi: 'ofs-admin-ui',
};

function safeSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email = '') {
  return normalizeEmail(email) === ADMIN_EMAIL;
}

export function persistFrontendSession({ email = '', name = '', role = '' }) {
  const storage = safeSessionStorage();
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = String(role || '').trim().toLowerCase();

  // Temporary frontend-only admin gate.
  // The current backend schema seeds admin@ofs.com with role "manager",
  // while the old frontend only checked for role === "admin".
  const adminEnabled = isAdminEmail(normalizedEmail) || normalizedRole === 'admin' || normalizedRole === 'manager';

  if (storage) {
    storage.setItem(STORAGE_KEYS.email, normalizedEmail);
    storage.setItem(STORAGE_KEYS.name, name);
    storage.setItem(STORAGE_KEYS.adminUi, adminEnabled ? 'true' : 'false');
  }

  return {
    normalizedEmail,
    normalizedRole,
    adminEnabled,
  };
}

export function clearFrontendSession() {
  const storage = safeSessionStorage();

  if (!storage) {
    return;
  }

  Object.values(STORAGE_KEYS).forEach((key) => storage.removeItem(key));
}

export function isAdminUiEnabled() {
  const storage = safeSessionStorage();
  return storage?.getItem(STORAGE_KEYS.adminUi) === 'true';
}

export function getStoredEmail() {
  const storage = safeSessionStorage();
  return storage?.getItem(STORAGE_KEYS.email) || '';
}

export function getStoredName() {
  const storage = safeSessionStorage();
  return storage?.getItem(STORAGE_KEYS.name) || '';
}
