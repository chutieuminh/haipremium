import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import AdminPage from './pages/AdminPage';
import GuidePage from './pages/GuidePage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './context/AuthContext';
import Toast from './components/Toast';
import { ZALO_CONTACT_URL } from './constants/contact';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname, search]);
  return null;
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      className={`scroll-top-button ${visible ? 'is-visible' : ''}`}
      type="button"
      aria-label="Cuộn lên đầu trang"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <ArrowUp size={20} />
    </button>
  );
}

function ZaloContactButton() {
  return (
    <a className="zalo-float-button" href={ZALO_CONTACT_URL} target="_blank" rel="noreferrer" aria-label="Liên hệ Zalo">
      <img src="/assets/zalo_icon.svg" alt="" />
    </a>
  );
}

function ProtectedRoute({ children, admin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="route-loading">Đang kiểm tra phiên đăng nhập...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && user.role !== 'admin') return <Navigate to="/account" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<ProtectedRoute admin><AdminPage /></ProtectedRoute>} />
      </Routes>
      <ZaloContactButton />
      <ScrollToTopButton />
      <Toast />
    </>
  );
}
