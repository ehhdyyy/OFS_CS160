import { useEffect } from 'react';
import LoginPage from './LoginPage';
import LandingPage from './LandingPage';
import AdminApp from './admin/AdminApp';
import CustomerApp from './customer/CustomerApp';
import { isAdminUiEnabled, getStoredEmail } from './utils/authSession';

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

export default function App() {
  const path = normalizePathname(window.location.pathname);
  const adminUiEnabled = isAdminUiEnabled();

  if (path === '/admin') {
    return <RedirectPage to={adminUiEnabled ? '/admin/dashboard' : '/'} />;
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

  if (path === '/account' || path === '/customer') {
    return <RedirectPage to="/home" />;
  }

  if (path === '/home') {
    if (!getStoredEmail()) {
      return <RedirectPage to="/login" />;
    }

    if (adminUiEnabled) {
      return <RedirectPage to="/admin/dashboard" />;
    }

    return <CustomerApp />;
  }

  return <LoginPage />;
}
