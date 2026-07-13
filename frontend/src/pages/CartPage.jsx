import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShieldCheck, Tag, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { api, assetUrl } from '../api/client';
import { formatCurrency } from '../data/products';
import { ZALO_CONTACT_URL } from '../constants/contact';

export default function CartPage() {
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart, notify, setCart } = useStore();
  const { user } = useAuth();
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const applyCoupon = async () => {
    if (!coupon.trim()) return notify('Vui lòng nhập mã giảm giá.', 'error');
    if (!user) return notify('Bạn cần đăng nhập để kiểm tra mã giảm giá.', 'info');
    setCheckingCoupon(true);
    try {
      const payload = await api.post('/coupons/validate', { code: coupon, subtotal: cartTotal }, { auth: true });
      setDiscount(payload.data.discountAmount);
      setCouponCode(payload.data.coupon.code);
      notify(payload.message);
    } catch (error) {
      setDiscount(0);
      setCouponCode('');
      notify(error.message, 'error');
    } finally { setCheckingCoupon(false); }
  };

  const createOrderAndContact = async () => {
    if (!user) return notify('Bạn cần đăng nhập để tạo đơn hàng trước khi liên hệ thanh toán.', 'info');
    setCreatingOrder(true);
    try {
      const payload = await api.post('/orders', {
        customerName: user.fullName || 'Khách hàng',
        customerEmail: user.email,
        customerPhone: user.phone || '0000000000',
        note: 'Khách liên hệ thanh toán qua Zalo.',
        paymentMethod: 'bank',
        couponCode,
      }, { auth: true });
      setCart([]);
      notify(`Đã tạo đơn ${payload.data.orderCode}. Đang mở Zalo để thanh toán.`);
      window.open(ZALO_CONTACT_URL, '_blank', 'noopener,noreferrer');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setCreatingOrder(false);
    }
  };

  if (!cart.length) {
    return (
      <div className="page page--muted section"><div className="container empty-state"><span className="empty-state__icon"><Trash2 /></span><h1>Giỏ hàng đang trống</h1><p>Khám phá các sản phẩm premium và chọn gói phù hợp với nhu cầu của bạn.</p><Link to="/products" className="button button--primary">Xem sản phẩm</Link></div></div>
    );
  }

  return (
    <div className="page page--muted">
      <section className="simple-page-head"><div className="container"><span className="eyebrow">Giỏ hàng</span><h1>Kiểm tra sản phẩm của bạn</h1><p>Điều chỉnh số lượng hoặc gói sản phẩm trước khi thanh toán.</p></div></section>
      <section className="section cart-page-section">
        <div className="container cart-layout">
          <div className="cart-panel">
            <div className="cart-panel__head"><div><h2>Sản phẩm đã chọn</h2><p>{cart.length} dòng sản phẩm</p></div><button className="link-danger" onClick={clearCart}><Trash2 size={16} /> Xóa tất cả</button></div>
            <div className="cart-table">
              {cart.map((item) => (
                <article className="cart-line" key={item.key}>
                  <div className="product-logo"><img src={assetUrl(item.logo)} alt={item.name} /></div>
                  <div className="cart-line__info"><Link to={`/products/${item.slug}`}>{item.name}</Link><span>{item.packageLabel}</span><small>{item.accountType}</small></div>
                  <div className="cart-line__unit"><small>Đơn giá</small><strong>{formatCurrency(item.price)}</strong></div>
                  <div className="quantity-control"><button onClick={() => updateQuantity(item.key, item.quantity - 1)}><Minus size={15} /></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.key, item.quantity + 1)}><Plus size={15} /></button></div>
                  <div className="cart-line__total"><small>Thành tiền</small><strong>{formatCurrency(item.price * item.quantity)}</strong></div>
                  <button className="remove-button" onClick={() => removeFromCart(item.key)}><Trash2 size={18} /></button>
                </article>
              ))}
            </div>
            <Link to="/products" className="text-link"><ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Tiếp tục mua sắm</Link>
          </div>

          <aside className="order-summary-card">
            <h2>Tóm tắt đơn hàng</h2>
            <div className="coupon-box"><label><Tag size={17} /> Mã giảm giá</label><div><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Nhập mã ưu đãi" /><button onClick={applyCoupon} disabled={checkingCoupon}>{checkingCoupon ? 'Đang kiểm tra' : 'Áp dụng'}</button></div><small>Thử mã: HAIPREMIUM10</small></div>
            {couponCode && <div className="applied-coupon">Đã áp dụng: <strong>{couponCode}</strong></div>}
            <div className="summary-lines"><div><span>Tạm tính</span><strong>{formatCurrency(cartTotal)}</strong></div><div><span>Giảm giá</span><strong className="success-text">-{formatCurrency(discount)}</strong></div><div><span>Phí xử lý</span><strong>Miễn phí</strong></div></div>
            <div className="summary-total"><span>Tổng thanh toán</span><strong>{formatCurrency(cartTotal - discount)}</strong></div>
            <button type="button" onClick={createOrderAndContact} disabled={creatingOrder} className="button button--primary button--large button--block">{creatingOrder ? 'Đang tạo đơn...' : 'Liên hệ thanh toán qua Zalo'} <ArrowRight size={18} /></button>
            {!user && <p className="cart-login-note">Bạn có thể nhắn Zalo để được tư vấn và chốt đơn nhanh.</p>}
            <p className="secure-note"><ShieldCheck size={17} /> Thông tin đơn hàng và bàn giao được bảo vệ.</p>
          </aside>
        </div>
      </section>
    </div>
  );
}
