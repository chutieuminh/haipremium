import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, CreditCard, Landmark, QrCode, ShieldCheck, Upload } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { api, assetUrl } from '../api/client';
import { formatCurrency } from '../data/products';

export default function CheckoutPage() {
  const { cart, cartTotal, setCart, notify } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const couponCode = location.state?.couponCode || '';
  const [method, setMethod] = useState('bank');
  const [order, setOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [proof, setProof] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({ bank_name: 'MB Bank', bank_account_name: 'HAI PREMIUM', bank_account_number: '0123456789', bank_qr_url: '' });
  const [form, setForm] = useState({ name: user?.fullName || '', email: user?.email || '', phone: user?.phone || '', note: '' });

  useEffect(() => {
    api.get('/settings/public').then((payload) => setSettings((current) => ({ ...current, ...payload.data }))).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) setForm((current) => ({ ...current, name: current.name || user.fullName || '', email: current.email || user.email || '', phone: current.phone || user.phone || '' }));
  }, [user]);

  const submit = async (event) => {
    event.preventDefault();
    if (!cart.length) return navigate('/products');
    setSubmitting(true);
    try {
      const payload = await api.post('/orders', {
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        note: form.note,
        paymentMethod: method,
        couponCode,
      }, { auth: true });
      setOrder(payload.data);
      setCart([]);
      notify(payload.message);
    } catch (error) {
      notify(error.message, 'error');
    } finally { setSubmitting(false); }
  };

  const uploadProof = async () => {
    if (!proof || !order) return notify('Vui lòng chọn ảnh biên lai.', 'error');
    const data = new FormData();
    data.append('proof', proof);
    setUploading(true);
    try {
      const payload = await api.post(`/orders/${order.orderCode}/payment-proof`, data, { auth: true });
      setOrder((current) => ({ ...current, orderStatus: payload.data.orderStatus, paymentProofPath: payload.data.paymentProofPath }));
      notify(payload.message);
    } catch (error) { notify(error.message, 'error'); }
    finally { setUploading(false); }
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text);
    notify('Đã sao chép thông tin', 'info');
  };

  if (order) {
    return (
      <div className="page page--muted section">
        <div className="container success-page-card">
          <span><CheckCircle2 size={54} /></span>
          <h1>Đơn hàng đã được tạo</h1>
          <p>Mã đơn hàng của bạn là <strong>{order.orderCode}</strong>. Hãy chuyển khoản đúng nội dung để hệ thống đối soát nhanh hơn.</p>
          <div className="success-order-box"><div><span>Tổng thanh toán</span><strong>{formatCurrency(order.total)}</strong></div><div><span>Trạng thái</span><b>{order.statusLabel || 'Chờ thanh toán'}</b></div></div>
          <div className="bank-details success-bank-details">
            <div><span>Ngân hàng</span><strong>{settings.bank_name}</strong></div>
            <div><span>Chủ tài khoản</span><strong>{settings.bank_account_name}</strong></div>
            <div><span>Số tài khoản</span><strong>{settings.bank_account_number}</strong><button type="button" onClick={() => copy(settings.bank_account_number)}><Copy size={15} /></button></div>
            <div><span>Nội dung</span><strong>{order.orderCode}</strong><button type="button" onClick={() => copy(order.orderCode)}><Copy size={15} /></button></div>
          </div>
          <div className="proof-upload-box">
            <label><Upload size={18} /> Ảnh biên lai (JPEG, PNG, WEBP; tối đa 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProof(event.target.files?.[0] || null)} /></label>
            <button className="button button--primary" onClick={uploadProof} disabled={!proof || uploading}>{uploading ? 'Đang gửi...' : 'Gửi biên lai'}</button>
          </div>
          <div className="success-actions"><button className="button button--primary" onClick={() => navigate('/account')}>Xem đơn hàng</button><Link className="button button--ghost" to="/">Về trang chủ</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page--muted">
      <section className="simple-page-head"><div className="container"><Link className="back-link" to="/cart"><ArrowLeft size={16} /> Quay lại giỏ hàng</Link><span className="eyebrow">Thanh toán an toàn</span><h1>Hoàn tất đơn hàng</h1><p>Kiểm tra thông tin liên hệ và chọn hình thức thanh toán.</p></div></section>
      <form className="section checkout-section" onSubmit={submit}>
        <div className="container checkout-layout">
          <div className="checkout-main">
            <section className="checkout-card">
              <div className="checkout-card__head"><span>1</span><div><h2>Thông tin nhận hàng</h2><p>Dùng để nhận thông báo và hỗ trợ đơn hàng.</p></div></div>
              <div className="form-grid">
                <label className="form-field form-field--full"><span>Họ và tên</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                <label className="form-field"><span>Email</span><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                <label className="form-field"><span>Số điện thoại</span><input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                <label className="form-field form-field--full"><span>Ghi chú (không bắt buộc)</span><textarea rows="3" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Ví dụ: ưu tiên bàn giao qua email..." /></label>
              </div>
            </section>

            <section className="checkout-card">
              <div className="checkout-card__head"><span>2</span><div><h2>Phương thức thanh toán</h2><p>Chọn cách bạn muốn thanh toán đơn hàng.</p></div></div>
              <div className="payment-methods">
                <button type="button" className={method === 'bank' ? 'active' : ''} onClick={() => setMethod('bank')}><span><Landmark /></span><div><strong>Chuyển khoản ngân hàng</strong><small>Xác nhận thủ công trong 5–15 phút</small></div><i /></button>
                <button type="button" className={method === 'qr' ? 'active' : ''} onClick={() => setMethod('qr')}><span><QrCode /></span><div><strong>Quét mã QR</strong><small>Quét nhanh bằng ứng dụng ngân hàng</small></div><i /></button>
                <button type="button" disabled><span><CreditCard /></span><div><strong>Ví điện tử</strong><small>Sắp được hỗ trợ</small></div><b>Sắp có</b></button>
              </div>
              <div className="bank-transfer-box">
                <div className="qr-placeholder">{settings.bank_qr_url ? <img src={assetUrl(settings.bank_qr_url)} alt="QR thanh toán" /> : <><QrCode size={82} /><span>QR THANH TOÁN</span></>}</div>
                <div className="bank-details"><h3>Thông tin chuyển khoản</h3><div><span>Ngân hàng</span><strong>{settings.bank_name}</strong></div><div><span>Chủ tài khoản</span><strong>{settings.bank_account_name}</strong></div><div><span>Số tài khoản</span><strong>{settings.bank_account_number}</strong><button type="button" onClick={() => copy(settings.bank_account_number)}><Copy size={15} /></button></div><small>Nội dung chuyển khoản sẽ là mã đơn được tạo sau khi bạn bấm đặt hàng.</small></div>
              </div>
            </section>
          </div>

          <aside className="checkout-summary">
            <h2>Đơn hàng của bạn</h2>
            <div className="checkout-items">{cart.map((item) => <article key={item.key}><div className="product-logo product-logo--small"><img src={assetUrl(item.logo)} alt={item.name} /></div><div><strong>{item.name}</strong><span>{item.packageLabel} × {item.quantity}</span></div><b>{formatCurrency(item.price * item.quantity)}</b></article>)}</div>
            <div className="summary-lines"><div><span>Tạm tính</span><strong>{formatCurrency(cartTotal)}</strong></div>{couponCode && <div><span>Mã giảm giá</span><strong>{couponCode}</strong></div>}<div><span>Phí xử lý</span><strong>Miễn phí</strong></div></div>
            <div className="summary-total"><span>Tổng tạm tính</span><strong>{formatCurrency(cartTotal)}</strong></div>
            <button className="button button--primary button--large button--block" type="submit" disabled={submitting}>{submitting ? 'Đang tạo đơn...' : 'Tạo đơn hàng'}</button>
            <p className="secure-note"><ShieldCheck size={17} /> Bằng việc đặt hàng, bạn đồng ý với điều khoản sử dụng và chính sách bảo hành.</p>
          </aside>
        </div>
      </form>
    </div>
  );
}
