import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck, Bell, ChevronRight, Heart, LayoutDashboard, LifeBuoy,
  LogOut, Package, ReceiptText, Settings, ShieldCheck, ShoppingBag, Star, UserRound, WalletCards,
} from 'lucide-react';
import { formatCurrency } from '../data/products';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { api, assetUrl } from '../api/client';

const accountNav = [
  [LayoutDashboard, 'Tổng quan'],
  [ShoppingBag, 'Đơn hàng của tôi'],
  [Star, 'Đánh giá sản phẩm'],
  [Heart, 'Sản phẩm yêu thích'],
  [UserRound, 'Thông tin cá nhân'],
  [Settings, 'Đổi mật khẩu'],
  [LifeBuoy, 'Yêu cầu hỗ trợ'],
];

const statusClass = (status) => {
  if (status === 'completed') return 'completed';
  if (['processing', 'paid'].includes(status)) return 'processing';
  if (status === 'payment_review') return 'review';
  return 'pending';
};

export default function AccountPage() {
  const [active, setActive] = useState('Tổng quan');
  const [orders, setOrders] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ fullName: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [supportForm, setSupportForm] = useState({ subject: '', message: '', orderId: '' });
  const [reviewForm, setReviewForm] = useState({ orderItemId: '', rating: 5, content: '' });
  const [ratingDragging, setRatingDragging] = useState(false);
  const { favorites, notify } = useStore();
  const { user, updateProfile, logout } = useAuth();
  const { products } = useCatalog();
  const navigate = useNavigate();

  const loadAccount = async () => {
    setLoading(true);
    try {
      const [orderPayload, supportPayload] = await Promise.all([
        api.get('/orders/my-orders', { auth: true }),
        api.get('/support-requests', { auth: true }),
      ]);
      setOrders(orderPayload.data);
      setSupportRequests(supportPayload.data);
    } catch (error) { notify(error.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setProfile({ fullName: user?.fullName || '', phone: user?.phone || '' });
    loadAccount();
  }, [user?.id]);

  const favoriteProducts = useMemo(() => products.filter((product) => favorites.includes(Number(product.id))), [products, favorites]);
  const completedOrders = orders.filter((order) => order.orderStatus === 'completed');
  const reviewableItems = completedOrders.flatMap((order) => (order.items || []).map((item) => ({ ...item, orderCode: order.orderCode, orderCreatedAt: order.createdAt })));
  const pendingReviewItems = reviewableItems.filter((item) => !item.review);
  const totalSpent = completedOrders.reduce((sum, order) => sum + Number(order.total), 0);

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      await updateProfile(profile);
      notify('Cập nhật thông tin thành công.');
    } catch (error) { notify(error.message, 'error'); }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify('Mật khẩu mới nhập lại không khớp.', 'error');
      return;
    }
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }, { auth: true });
      notify('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      await logout();
      navigate('/login');
    } catch (error) { notify(error.message, 'error'); }
  };

  const sendSupport = async (event) => {
    event.preventDefault();
    try {
      const payload = await api.post('/support-requests', {
        subject: supportForm.subject,
        message: supportForm.message,
        orderId: supportForm.orderId || undefined,
      }, { auth: true });
      setSupportRequests((current) => [payload.data, ...current]);
      setSupportForm({ subject: '', message: '', orderId: '' });
      notify(payload.message);
    } catch (error) { notify(error.message, 'error'); }
  };

  const sendReview = async (event) => {
    event.preventDefault();
    const selectedItem = reviewableItems.find((item) => item.id === Number(reviewForm.orderItemId));
    if (!selectedItem) {
      notify('Vui lòng chọn sản phẩm cần đánh giá.', 'error');
      return;
    }
    if (selectedItem.review) {
      notify('Tài khoản/sản phẩm này đã được đánh giá một lần.', 'error');
      setReviewForm({ orderItemId: '', rating: 5, content: '' });
      return;
    }
    try {
      const payload = await api.post('/reviews', reviewForm, { auth: true });
      notify(payload.message);
      setReviewForm({ orderItemId: '', rating: 5, content: '' });
      await loadAccount();
    } catch (error) { notify(error.message, 'error'); }
  };

  const chooseRating = (rating) => setReviewForm((current) => ({ ...current, rating }));

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="page page--muted account-page">
      <div className="container account-layout">
        <aside className="account-sidebar">
          <div className="account-user"><div><strong>{user?.fullName}</strong><small>{user?.email}</small></div></div>
          <nav>{accountNav.map(([Icon, label]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => setActive(label)}><Icon size={18} /> {label}{label === 'Sản phẩm yêu thích' && <b>{favorites.length}</b>}</button>)}</nav>
          <button className="account-logout" onClick={signOut}><LogOut size={18} /> Đăng xuất</button>
        </aside>

        <main className="account-main">
          <div className="account-topline"><div><span className="eyebrow">Trang tài khoản</span><h1>Chào {user?.fullName?.split(' ').slice(-1)[0]}</h1><p>Theo dõi đơn hàng và nhận hỗ trợ nhanh chóng.</p></div><button className="notification-button"><Bell size={20} /><b>{orders.filter((order) => order.orderStatus !== 'completed').length}</b></button></div>

          {loading && <div className="loading-panel">Đang tải dữ liệu tài khoản...</div>}

          {!loading && active === 'Tổng quan' && (
            <>
              <div className="account-stat-grid">
                <article><span><ReceiptText /></span><div><small>Tổng đơn hàng</small><strong>{orders.length}</strong><p>{completedOrders.length} đơn đã hoàn thành</p></div></article>
                <article><span><WalletCards /></span><div><small>Tổng chi tiêu</small><strong>{formatCurrency(totalSpent)}</strong><p>Chỉ tính đơn hoàn thành</p></div></article>
                <article><span><BadgeCheck /></span><div><small>Tài khoản đã mua</small><strong>{completedOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0)}</strong><p>Được bảo vệ theo chủ đơn</p></div></article>
                <article><span><Heart /></span><div><small>Sản phẩm yêu thích</small><strong>{favorites.length}</strong><p>Đang lưu để xem sau</p></div></article>
              </div>
              <section className="account-panel">
                <div className="account-panel__head"><div><h2>Đơn hàng gần đây</h2><p>Theo dõi trạng thái và xem chi tiết bàn giao.</p></div><button onClick={() => setActive('Đơn hàng của tôi')}>Xem tất cả <ChevronRight size={16} /></button></div>
                <OrderList orders={orders.slice(0, 5)} />
              </section>
              <div className="account-bottom-grid">
                <section className="account-panel delivery-card"><div className="account-panel__head"><div><h2>Bàn giao bảo mật</h2><p>Thông tin tài khoản sẽ được hỗ trợ qua Zalo sau khi đơn hoàn tất.</p></div><ShieldCheck size={22} /></div><p>Đội ngũ Hải Premium hỗ trợ bàn giao và bảo hành theo từng đơn hàng.</p><Link className="button button--soft button--block" to="/products">Tiếp tục mua sắm</Link></section>
                <section className="account-panel support-panel"><span><LifeBuoy /></span><h2>Bạn cần hỗ trợ?</h2><p>Gửi yêu cầu kèm đơn hàng để đội ngũ xử lý nhanh hơn.</p><button className="button button--primary" onClick={() => setActive('Yêu cầu hỗ trợ')}>Tạo yêu cầu hỗ trợ</button></section>
              </div>
            </>
          )}

          {!loading && active === 'Đơn hàng của tôi' && <section className="account-panel"><div className="account-panel__head"><div><h2>Đơn hàng của tôi</h2><p>{orders.length} đơn hàng trong tài khoản.</p></div></div><OrderList orders={orders} /></section>}

          {!loading && active === 'Đánh giá sản phẩm' && (
            <section className="account-panel">
              <div className="account-panel__head"><div><h2>Đánh giá sản phẩm</h2><p>Chỉ những sản phẩm trong đơn đã hoàn thành mới có thể gửi đánh giá.</p></div></div>
              {!reviewableItems.length ? <div className="account-placeholder"><Star size={38} /><h3>Chưa có sản phẩm có thể đánh giá</h3><p>Hoàn thành một đơn hàng để chia sẻ trải nghiệm của bạn.</p></div> : (
                <div className="customer-review-layout">
                  <div className="customer-review-list">
                    {reviewableItems.map((item) => <article key={item.id} className={Number(reviewForm.orderItemId) === item.id ? 'active' : ''}>
                      <div className="product-logo product-logo--tiny"><img src={assetUrl(item.product?.logo || '/assets/brand-mark.png')} alt="" /></div>
                      <div><strong>{item.productName}</strong><small>{item.packageName} · {item.orderCode}</small>{item.review && <span>Đã đánh giá {'★'.repeat(item.review.rating)}</span>}</div>
                      <button disabled={Boolean(item.review)} onClick={() => setReviewForm({ orderItemId: item.id, rating: item.review?.rating || 5, content: item.review?.content || '' })}>{item.review ? 'Đã gửi' : 'Đánh giá'}</button>
                    </article>)}
                  </div>
                  <form className="account-form customer-review-form" onSubmit={sendReview}>
                    <label className="form-field"><span>Sản phẩm</span><select required value={reviewForm.orderItemId} onChange={(event) => setReviewForm({ ...reviewForm, orderItemId: event.target.value })}><option value="">{pendingReviewItems.length ? 'Chọn sản phẩm cần đánh giá' : 'Tất cả sản phẩm đã được đánh giá'}</option>{pendingReviewItems.map((item) => <option key={item.id} value={item.id}>{item.productName} - {item.orderCode}</option>)}</select></label>
                    <div className="form-field"><span>Số sao</span><div className="rating-picker" role="radiogroup" aria-label="Chọn số sao" onPointerUp={() => setRatingDragging(false)} onPointerLeave={() => setRatingDragging(false)}>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={value <= reviewForm.rating ? 'active' : ''} role="radio" aria-checked={value === reviewForm.rating} aria-label={`${value} sao`} onClick={() => chooseRating(value)} onPointerDown={() => { setRatingDragging(true); chooseRating(value); }} onPointerEnter={() => ratingDragging && chooseRating(value)}><Star size={28} fill="currentColor" /></button>)}<strong>{reviewForm.rating} sao</strong></div></div>
                    <label className="form-field"><span>Nội dung đánh giá</span><textarea required minLength="5" rows="5" value={reviewForm.content} onChange={(event) => setReviewForm({ ...reviewForm, content: event.target.value })} placeholder="Chia sẻ trải nghiệm sử dụng sản phẩm..." /></label>
                    <button className="button button--primary" disabled={!reviewForm.orderItemId}>Gửi đánh giá</button>
                  </form>
                </div>
              )}
            </section>
          )}

          {!loading && active === 'Sản phẩm yêu thích' && <section className="account-panel"><div className="account-panel__head"><div><h2>Sản phẩm yêu thích</h2><p>{favoriteProducts.length} sản phẩm đang lưu.</p></div></div>{favoriteProducts.length ? <div className="favorite-account-grid">{favoriteProducts.map((product) => <Link key={product.id} to={`/products/${product.slug}`}><img src={assetUrl(product.logo)} alt={product.name} /><div><strong>{product.name}</strong><span>{formatCurrency(product.price)}</span></div><ChevronRight size={18} /></Link>)}</div> : <div className="account-placeholder"><Heart size={38} /><h3>Chưa có sản phẩm yêu thích</h3><Link to="/products" className="button button--primary">Khám phá sản phẩm</Link></div>}</section>}

          {!loading && active === 'Thông tin cá nhân' && <section className="account-panel"><div className="account-panel__head"><div><h2>Thông tin cá nhân</h2><p>Cập nhật họ tên và số điện thoại nhận hỗ trợ.</p></div></div><form className="account-form" onSubmit={saveProfile}><label className="form-field"><span>Họ và tên</span><input required value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} /></label><label className="form-field"><span>Email</span><input value={user?.email || ''} disabled /></label><label className="form-field"><span>Số điện thoại</span><input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label><button className="button button--primary">Lưu thay đổi</button></form></section>}

          {!loading && active === 'Đổi mật khẩu' && <section className="account-panel"><div className="account-panel__head"><div><h2>Đổi mật khẩu</h2><p>Mật khẩu mới phải có ít nhất 8 ký tự.</p></div></div><form className="account-form" onSubmit={changePassword}><label className="form-field"><span>Mật khẩu hiện tại</span><input type="password" required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></label><label className="form-field"><span>Mật khẩu mới</span><input type="password" minLength="8" required value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></label><label className="form-field"><span>Nhập lại mật khẩu mới</span><input type="password" minLength="8" required value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} /></label><button className="button button--primary">Đổi mật khẩu</button></form></section>}

          {!loading && active === 'Yêu cầu hỗ trợ' && <section className="account-panel"><div className="account-panel__head"><div><h2>Yêu cầu hỗ trợ</h2><p>Gửi vấn đề kèm đơn hàng liên quan.</p></div></div><form className="account-form" onSubmit={sendSupport}><label className="form-field"><span>Đơn hàng liên quan</span><select value={supportForm.orderId} onChange={(event) => setSupportForm({ ...supportForm, orderId: event.target.value })}><option value="">Không chọn đơn hàng</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.orderCode}</option>)}</select></label><label className="form-field"><span>Tiêu đề</span><input required minLength="3" value={supportForm.subject} onChange={(event) => setSupportForm({ ...supportForm, subject: event.target.value })} /></label><label className="form-field"><span>Nội dung</span><textarea required minLength="10" rows="5" value={supportForm.message} onChange={(event) => setSupportForm({ ...supportForm, message: event.target.value })} /></label><button className="button button--primary">Gửi yêu cầu</button></form><div className="support-request-list">{supportRequests.map((request) => <article key={request.id}><strong>{request.subject}</strong><span>{request.status}</span><p>{request.message}</p>{request.adminReply && <blockquote>Phản hồi: {request.adminReply}</blockquote>}</article>)}</div></section>}
        </main>
      </div>
    </div>
  );
}

function OrderList({ orders }) {
  if (!orders.length) return <div className="account-placeholder"><Package size={38} /><h3>Chưa có đơn hàng</h3><Link to="/products" className="button button--primary">Mua sản phẩm</Link></div>;
  return <div className="orders-table orders-table--no-action"><div className="orders-table__head"><span>Sản phẩm</span><span>Mã đơn</span><span>Ngày mua</span><span>Tổng tiền</span><span>Trạng thái</span></div>{orders.map((order) => { const first = order.items?.[0]; return <article key={order.id}><div className="order-product"><div className="product-logo product-logo--tiny"><img src={assetUrl(first?.product?.logo || '/assets/brand-mark.png')} alt="" /></div><div><strong>{first?.productName || 'Đơn hàng số'}</strong><small>{first?.packageName || `${order.items?.length || 0} sản phẩm`}</small></div></div><span>{order.orderCode}</span><span>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span><strong>{formatCurrency(order.total)}</strong><b className={`status-badge status-badge--${statusClass(order.orderStatus)}`}>{order.statusLabel}</b></article>; })}</div>;
}
