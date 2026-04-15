import { useEffect, useState } from 'react';
import LoginPage from './LoginPage';
import LandingPage from './LandingPage';
import AdminApp from './admin/AdminApp';
import CustomerApp from './customer/CustomerApp';
import ResetPasswordPage from './ResetPasswordPage';
import { isAdminUiEnabled, getStoredEmail, persistFrontendSession } from './utils/authSession';

const API_BASE = 'http://localhost:8000';

function normalizePathname(pathname = '/') {
  if (!pathname) {
    return '/';
  }

  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
}

function RedirectPage({ to }) {
  useEffect(() => {
    if (window.location.pathname !== to) {
      window.location.replace(to);
    }
  }, [to]);

  return null;
}

/**
 * On mount, if sessionStorage is empty (e.g. after a hard refresh),
 * try to recover the session from the httpOnly JWT cookie by calling /api/auth/me.
 * Returns true once validation is complete.
 */
function useSessionRevalidation() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function revalidate() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: 'include',
        });

        if (res.ok && !cancelled) {
          const data = await res.json();
          persistFrontendSession({
            userId: data.userId,
            email: data.email,
            name: data.name,
            role: data.role,
          });
        } else if (!cancelled) {
          persistFrontendSession({ userId: '', email: '', name: '', role: '' });
        }
      } catch {
        if (!cancelled) {
          persistFrontendSession({ userId: '', email: '', name: '', role: '' });
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    revalidate();

    return () => { cancelled = true; };
  }, []);

  return ready;
}

export default function App() {
  const path = normalizePathname(window.location.pathname);

  // Public pages don't need session validation
  const isPublicPage = path === '/' || path === '' || path === '/login';

  const sessionReady = useSessionRevalidation();

  // Show nothing while revalidating on protected pages
  if (!isPublicPage && !sessionReady) {
    return null;
  }

  const adminUiEnabled = isAdminUiEnabled();

  if (path === '/admin') {
    return <RedirectPage to={adminUiEnabled ? '/admin/inventory' : '/'} />;
  }

  if (path.startsWith('/admin/')) {
    if (!adminUiEnabled) {
      return <RedirectPage to="/" />;
    }

    return <AdminApp path={path} />;
  }

  if (path === '/' || path === '') {
    return <LandingPage />;
  }

  if (path === '/login') {
    return <LoginPage />;
  }

  if (path === '/reset-password') {
    return <ResetPasswordPage />;
  }

  if (path === '/account' || path === '/customer') {
    return <RedirectPage to="/home" />;
  }

  if (path === '/home' || path.startsWith('/product/') || path === '/orders' || path === '/profile') {
    if (!getStoredEmail()) {
      return <RedirectPage to="/login" />;
    }

    if (adminUiEnabled && path === '/home') {
      return <RedirectPage to="/admin/inventory" />;
    }

    return <CustomerApp />;
  }

  return <LoginPage />;
}
