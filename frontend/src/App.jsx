import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowUp, ChevronRight, Facebook, Headset, X } from 'lucide-react';
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
import { FACEBOOK_CONTACT_URL, ZALO_CONTACT_URL } from './constants/contact';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
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

function ContactWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <button className="contact-widget__backdrop" type="button" aria-label="Đóng liên hệ" onClick={() => setOpen(false)} />}
      {open && (
        <section className="contact-widget" aria-label="Kênh hỗ trợ">
          <div className="contact-widget__head">
            <span><Headset size={24} /></span>
            <h2>Hải Premium</h2>
            <p>Chúng tôi sẽ cố gắng hỗ trợ bạn nhanh nhất có thể, trân trọng!</p>
          </div>
          <a className="contact-widget__item" href={FACEBOOK_CONTACT_URL} target="_blank" rel="noreferrer">
            <span className="contact-widget__icon contact-widget__icon--facebook"><img src="/assets/facebook_icon.svg" alt="Facebook" /></span>
            <div><strong>Facebook</strong><small>Hỗ trợ khách hàng qua Messenger</small></div>
            <ChevronRight size={18} />
          </a>
          <a className="contact-widget__item" href={ZALO_CONTACT_URL} target="_blank" rel="noreferrer">
            <span className="contact-widget__icon contact-widget__icon--zalo"><img src="/assets/zalo_icon.svg" alt="" /></span>
            <div><strong>Zalo</strong><small>Hỗ trợ khách hàng qua Zalo</small></div>
            <ChevronRight size={18} />
          </a>
          <p className="contact-widget__note">Lưu ý: Tất cả nền tảng hỗ trợ như nhau, vui lòng chỉ nhắn 1 nền tảng để được hỗ trợ nhanh nhất.</p>
        </section>
      )}
      <button className={`contact-float-button ${open ? 'is-open' : ''}`} type="button" aria-label={open ? 'Đóng liên hệ' : 'Mở liên hệ'} onClick={() => setOpen((value) => !value)}>
        {open ? <X size={30} /> : <Headset size={30} />}
      </button>
    </>
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
      <ContactWidget />
      <ScrollToTopButton />
      <Toast />
    </>
  );
}
