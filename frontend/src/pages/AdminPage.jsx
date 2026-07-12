import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3, Bell, Boxes, ChevronDown, ChevronRight, ClipboardList, CreditCard,
  FileText, LayoutDashboard, LogOut, Menu, MessageSquareText, Package, Search,
  Settings, ShoppingBag, Star, Tags, TrendingUp, UsersRound, Eye, Plus, RefreshCcw, FolderTree, Images,
} from 'lucide-react';
import Brand from '../components/Brand';
import { formatCurrency } from '../data/products';
import { api, assetUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

const adminNav = [
  [LayoutDashboard, 'Tổng quan'], [ShoppingBag, 'Đơn hàng'], [Package, 'Sản phẩm'],
  [FolderTree, 'Danh mục'], [Tags, 'Gói sản phẩm'], [Boxes, 'Kho tài khoản số'], [UsersRound, 'Khách hàng'],
  [CreditCard, 'Mã giảm giá'], [Star, 'Đánh giá'], [MessageSquareText, 'Yêu cầu hỗ trợ'],
  [Images, 'Banner & nội dung'], [FileText, 'Nhật ký hoạt động'], [Settings, 'Cài đặt'],
];

const endpointMap = {
  'Đơn hàng': '/admin/orders', 'Sản phẩm': '/admin/products?limit=100', 'Danh mục': '/admin/categories',
  'Gói sản phẩm': '/admin/packages', 'Kho tài khoản số': '/admin/inventories',
  'Khách hàng': '/admin/users', 'Mã giảm giá': '/admin/coupons', 'Đánh giá': '/admin/reviews',
  'Yêu cầu hỗ trợ': '/admin/support-requests', 'Banner & nội dung': '/admin/banners', 'Nhật ký hoạt động': '/admin/audit-logs',
  'Cài đặt': '/admin/settings',
};

export default function AdminPage() {
  const [active, setActive] = useState('Tổng quan');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [revealedInventory, setRevealedInventory] = useState(null);
  const { user, logout } = useAuth();
  const { notify } = useStore();
  const navigate = useNavigate();

  const loadBase = async () => {
    try {
      const [categoryPayload, productPayload, packagePayload] = await Promise.all([
        api.get('/admin/categories', { auth: true }),
        api.get('/admin/products?limit=100', { auth: true }),
        api.get('/admin/packages', { auth: true }),
      ]);
      setCategories(categoryPayload.data);
      setProducts(productPayload.data);
      setPackages(packagePayload.data);
    } catch (error) { notify(error.message, 'error'); }
  };

  const load = async () => {
    setLoading(true);
    try {
      if (active === 'Tổng quan') {
        const payload = await api.get('/admin/dashboard', { auth: true });
        setDashboard(payload.data);
      } else {
        const payload = await api.get(endpointMap[active], { auth: true });
        setData(payload.data);
      }
    } catch (error) { notify(error.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { load(); }, [active]);

  const filtered = useMemo(() => {
    if (!Array.isArray(data) || !query.trim()) return data;
    const text = query.toLowerCase();
    return data.filter((item) => JSON.stringify(item).toLowerCase().includes(text));
  }, [data, query]);

  const signOut = async () => { await logout(); navigate('/'); };
  const choose = (label) => { setActive(label); setSidebarOpen(false); setQuery(''); };

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-sidebar__brand"><Brand compact /><span>ADMIN</span></div>
        <nav><small>QUẢN LÝ</small>{adminNav.map(([Icon, label]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => choose(label)}><Icon size={18} /><span>{label}</span>{label === 'Đơn hàng' && dashboard?.stats?.pendingOrders > 0 && <b>{dashboard.stats.pendingOrders}</b>}</button>)}</nav>
        <div className="admin-sidebar__foot"><Link to="/">Xem website <ChevronRight size={16} /></Link><button onClick={signOut}><LogOut size={18} /> Đăng xuất</button></div>
      </aside>
      {sidebarOpen && <div className="admin-backdrop" onClick={() => setSidebarOpen(false)} />}

      <main className="admin-main">
        <header className="admin-header">
          <button className="icon-button admin-mobile-menu" onClick={() => setSidebarOpen(true)}><Menu /></button>
          <div className="admin-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong mục đang mở..." /></div>
          <div className="admin-header__actions"><button onClick={load}><RefreshCcw size={19} /></button><span className="admin-avatar">{user?.fullName?.slice(0, 2).toUpperCase()}</span><div><strong>{user?.fullName}</strong><small>Quản trị viên</small></div><ChevronDown size={16} /></div>
        </header>

        <div className="admin-content">
          <div className="admin-page-heading"><div><span className="eyebrow">Hải Premium Admin</span><h1>{active}</h1><p>Dữ liệu được đọc và cập nhật trực tiếp từ Node.js API và MySQL.</p></div><button className="button button--soft" onClick={load}><RefreshCcw size={17} /> Làm mới</button></div>
          {loading ? <div className="loading-panel">Đang tải dữ liệu...</div> : active === 'Tổng quan' ? <Dashboard data={dashboard} onOpen={choose} /> : <AdminSection active={active} data={filtered} reload={load} notify={notify} categories={categories} products={products} packages={packages} refreshBase={loadBase} revealedInventory={revealedInventory} setRevealedInventory={setRevealedInventory} />}
        </div>
      </main>
    </div>
  );
}

function Dashboard({ data, onOpen }) {
  if (!data) return null;
  const stats = data.stats || {};
  const cards = [
    [TrendingUp, 'Doanh thu hôm nay', formatCurrency(stats.todayRevenue)],
    [BarChart3, 'Doanh thu tháng', formatCurrency(stats.monthRevenue)],
    [ClipboardList, 'Tổng đơn hàng', stats.totalOrders || 0],
    [Bell, 'Đơn cần xử lý', stats.pendingOrders || 0],
    [UsersRound, 'Khách hàng', stats.customers || 0],
    [Boxes, 'Kho khả dụng', stats.inventoryAvailable || 0],
  ];
  return <><div className="admin-stat-grid">{cards.map(([Icon, label, value]) => <article key={label}><span><Icon /></span><div><small>{label}</small><strong>{value}</strong></div></article>)}</div><div className="admin-dashboard-grid"><section className="admin-panel"><div className="admin-panel__head"><div><h2>Đơn hàng mới nhất</h2><p>Nhấn để chuyển tới quản lý đơn hàng.</p></div><button onClick={() => onOpen('Đơn hàng')}>Xem tất cả</button></div><AdminOrderTable orders={data.recentOrders || []} compact /></section><section className="admin-panel"><div className="admin-panel__head"><div><h2>Sản phẩm bán chạy</h2><p>Xếp theo số lượng đã bán.</p></div></div><div className="admin-top-products">{(data.topProducts || []).map((product) => <article key={product.id}><img src={assetUrl(product.logo)} alt="" /><div><strong>{product.name}</strong><small>{product.soldCount} lượt bán</small></div><b>{formatCurrency(product.price)}</b></article>)}</div></section></div></>;
}

function AdminSection(props) {
  switch (props.active) {
    case 'Đơn hàng': return <OrdersAdmin {...props} />;
    case 'Sản phẩm': return <ProductsAdmin {...props} />;
    case 'Danh mục': return <CategoriesAdmin {...props} />;
    case 'Gói sản phẩm': return <PackagesAdmin {...props} />;
    case 'Kho tài khoản số': return <InventoryAdmin {...props} />;
    case 'Khách hàng': return <UsersAdmin {...props} />;
    case 'Mã giảm giá': return <CouponsAdmin {...props} />;
    case 'Đánh giá': return <ReviewsAdmin {...props} />;
    case 'Yêu cầu hỗ trợ': return <SupportAdmin {...props} />;
    case 'Banner & nội dung': return <BannersAdmin {...props} />;
    case 'Nhật ký hoạt động': return <AuditAdmin {...props} />;
    case 'Cài đặt': return <SettingsAdmin {...props} />;
    default: return null;
  }
}

function AdminOrderTable({ orders, actions }) {
  return <div className="admin-data-table"><div className="admin-table-head"><span>Mã đơn</span><span>Khách hàng</span><span>Tổng tiền</span><span>Trạng thái</span><span>Ngày tạo</span><span>Thao tác</span></div>{orders.map((order) => <article key={order.id}><strong>{order.orderCode}</strong><span>{order.customerName}<small>{order.customerEmail}</small></span><b>{formatCurrency(order.total)}</b><span className={`status-badge status-badge--${order.orderStatus === 'completed' ? 'completed' : order.orderStatus === 'payment_review' ? 'review' : 'processing'}`}>{order.statusLabel}</span><span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span><div className="admin-row-actions">{actions?.(order)}</div></article>)}</div>;
}

function OrdersAdmin({ data, reload, notify }) {
  const act = async (path, body) => { try { const payload = body ? await api.put(path, body, { auth: true }) : await api.post(path, undefined, { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  const viewProof = async (order) => { try { const payload = await api.get(`/admin/orders/${order.id}/payment-proof`, { auth: true }); const popup = window.open('', '_blank'); if (popup) popup.document.write(`<title>Biên lai ${order.orderCode}</title><img src="${payload.data.dataUrl}" style="max-width:100%;display:block;margin:auto" />`); } catch (error) { notify(error.message, 'error'); } };
  return <section className="admin-panel"><div className="admin-panel__head"><div><h2>Quản lý đơn hàng</h2><p>Xác nhận thanh toán, chuyển xử lý và bàn giao kho tự động.</p></div></div><AdminOrderTable orders={data} actions={(order) => <>{order.paymentProofPath && <button onClick={() => viewProof(order)}>Biên lai</button>}{['pending_payment', 'payment_review'].includes(order.orderStatus) && <button onClick={() => act(`/admin/orders/${order.id}/confirm-payment`)}>Xác nhận tiền</button>}{order.orderStatus === 'paid' && <button onClick={() => act(`/admin/orders/${order.id}/status`, { orderStatus: 'processing' })}>Đang xử lý</button>}{['paid', 'processing'].includes(order.orderStatus) && <button className="primary" onClick={() => act(`/admin/orders/${order.id}/deliver`)}>Bàn giao</button>}{!['completed', 'cancelled', 'refunded'].includes(order.orderStatus) && <button className="danger" onClick={() => act(`/admin/orders/${order.id}/status`, { orderStatus: 'cancelled' })}>Hủy</button>}</>} /></section>;
}

function ProductsAdmin({ data, categories, reload, notify, refreshBase }) {
  const initial = { name: '', categoryId: categories[0]?.id || '', shortDescription: '', description: '', logo: '/assets/logos/chatgpt.png', basePrice: 99000, originalPrice: 199000, isFeatured: false, isBestSeller: false, status: 'active' };
  const [form, setForm] = useState(initial);
  useEffect(() => { if (!form.categoryId && categories[0]) setForm((current) => ({ ...current, categoryId: categories[0].id })); }, [categories]);
  const submit = async (event) => { event.preventDefault(); try { const payload = await api.post('/admin/products', form, { auth: true }); notify(payload.message); setForm({ ...initial, categoryId: categories[0]?.id || '' }); await Promise.all([reload(), refreshBase()]); } catch (error) { notify(error.message, 'error'); } };
  const toggle = async (product) => { try { const payload = await api.put(`/admin/products/${product.id}`, { status: product.status === 'active' ? 'inactive' : 'active' }, { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  const remove = async (product) => { if (!confirm(`Xóa mềm ${product.name}?`)) return; try { const payload = await api.delete(`/admin/products/${product.id}`, { auth: true }); notify(payload.message); reload(); refreshBase(); } catch (error) { notify(error.message, 'error'); } };
  return <div className="admin-two-column"><section className="admin-panel"><div className="admin-panel__head"><div><h2>Danh sách sản phẩm</h2><p>{data.length} sản phẩm.</p></div></div><div className="admin-product-list">{data.map((product) => <article key={product.id}><img src={assetUrl(product.logo)} alt="" /><div><strong>{product.name}</strong><small>{product.category?.name} · {formatCurrency(product.price)}</small></div><span>{product.status}</span><button onClick={() => toggle(product)}>{product.status === 'active' ? 'Ẩn' : 'Hiện'}</button><button className="danger" onClick={() => remove(product)}>Xóa</button></article>)}</div></section><section className="admin-panel"><div className="admin-panel__head"><div><h2>Thêm sản phẩm</h2><p>Thông tin được lưu vào MySQL.</p></div></div><form className="admin-form" onSubmit={submit}><Field label="Tên sản phẩm"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Danh mục"><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Logo"><input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} /></Field><Field label="Mô tả ngắn"><textarea value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} /></Field><div className="admin-form-row"><Field label="Giá bán"><input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} /></Field><Field label="Giá gốc"><input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} /></Field></div><label className="check-row"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Nổi bật</label><button className="button button--primary"><Plus size={17} /> Thêm sản phẩm</button></form></section></div>;
}

function CategoriesAdmin({ data, reload, notify, refreshBase }) {
  const [form, setForm] = useState({ code: '', name: '', description: '', icon: 'FolderTree', accent: '#1689D8', isActive: true });
  const submit = async (event) => { event.preventDefault(); try { const payload = await api.post('/admin/categories', form, { auth: true }); notify(payload.message); setForm({ ...form, code: '', name: '', description: '' }); reload(); refreshBase(); } catch (error) { notify(error.message, 'error'); } };
  const remove = async (item) => { if (!confirm(`Xóa danh mục ${item.name}?`)) return; try { const payload = await api.delete(`/admin/categories/${item.id}`, { auth: true }); notify(payload.message); reload(); refreshBase(); } catch (error) { notify(error.message, 'error'); } };
  return <div className="admin-two-column"><section className="admin-panel"><div className="admin-panel__head"><h2>Danh mục sản phẩm</h2></div><div className="admin-simple-list">{data.map((item) => <article key={item.id}><div><strong>{item.name}</strong><small>{item.code} · /{item.slug}</small></div><span>{item.isActive ? 'Đang bật' : 'Đã ẩn'}</span><button className="danger" onClick={() => remove(item)}>Xóa</button></article>)}</div></section><section className="admin-panel"><div className="admin-panel__head"><h2>Thêm danh mục</h2></div><form className="admin-form" onSubmit={submit}><Field label="Mã danh mục"><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="security" /></Field><Field label="Tên danh mục"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Mô tả"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label="Màu nhấn"><input type="color" value={form.accent} onChange={(e) => setForm({ ...form, accent: e.target.value })} /></Field><button className="button button--primary">Thêm danh mục</button></form></section></div>;
}

function PackagesAdmin({ data, products, reload, notify, refreshBase }) {
  const [form, setForm] = useState({ productId: products[0]?.id || '', name: 'Gói 1 tháng', duration: '1 tháng', accountType: 'Tài khoản riêng', originalPrice: 199000, salePrice: 99000, stock: 10, warrantyDays: 30, isActive: true });
  useEffect(() => { if (!form.productId && products[0]) setForm((current) => ({ ...current, productId: products[0].id })); }, [products]);
  const submit = async (event) => { event.preventDefault(); try { const payload = await api.post('/admin/packages', form, { auth: true }); notify(payload.message); reload(); refreshBase(); } catch (error) { notify(error.message, 'error'); } };
  return <div className="admin-two-column"><section className="admin-panel"><div className="admin-panel__head"><h2>Gói sản phẩm</h2></div><div className="admin-simple-list">{data.map((item) => <article key={item.id}><div><strong>{item.product?.name}</strong><small>{item.name} · {item.accountType}</small></div><b>{formatCurrency(item.salePrice)}</b><span>Kho {item.stock}</span></article>)}</div></section><section className="admin-panel"><div className="admin-panel__head"><h2>Thêm gói</h2></div><form className="admin-form" onSubmit={submit}><Field label="Sản phẩm"><select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Tên gói"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Thời hạn"><input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></Field><Field label="Loại tài khoản"><select value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>{['Tài khoản riêng', 'Tài khoản dùng chung', 'Nâng cấp chính chủ', 'Mã kích hoạt', 'Thành viên nhóm'].map((value) => <option key={value}>{value}</option>)}</select></Field><div className="admin-form-row"><Field label="Giá bán"><input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} /></Field><Field label="Tồn kho"><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field></div><button className="button button--primary">Thêm gói</button></form></section></div>;
}

function InventoryAdmin({ data, packages, reload, notify, revealedInventory, setRevealedInventory }) {
  const [form, setForm] = useState({ packageId: packages[0]?.id || '', type: 'ACCOUNT', loginEmail: '', loginUsername: '', password: '', activationCode: '', additionalInformation: '' });
  useEffect(() => { if (!form.packageId && packages[0]) setForm((current) => ({ ...current, packageId: packages[0].id })); }, [packages]);
  const submit = async (event) => { event.preventDefault(); try { const payload = await api.post('/admin/inventories', form, { auth: true }); notify(payload.message); setForm((current) => ({ ...current, loginEmail: '', loginUsername: '', password: '', activationCode: '' })); reload(); } catch (error) { notify(error.message, 'error'); } };
  const reveal = async (id) => { try { const payload = await api.get(`/admin/inventories/${id}/reveal`, { auth: true }); setRevealedInventory(payload.data); } catch (error) { notify(error.message, 'error'); } };
  return <div className="admin-two-column"><section className="admin-panel"><div className="admin-panel__head"><div><h2>Kho tài khoản số</h2><p>Dữ liệu nhạy cảm được mã hóa AES-256-GCM.</p></div></div><div className="admin-simple-list inventory-list">{data.map((item) => <article key={item.id}><div><strong>{item.package?.product?.name}</strong><small>{item.package?.name} · {item.type}</small></div><span>{item.status}</span><button onClick={() => reveal(item.id)}><Eye size={16} /> Xem</button></article>)}</div>{revealedInventory && <div className="admin-secret-modal"><button onClick={() => setRevealedInventory(null)}>×</button><h3>Dữ liệu kho #{revealedInventory.id}</h3><p>Email: <strong>{revealedInventory.loginEmail || '-'}</strong></p><p>Tên đăng nhập: <strong>{revealedInventory.loginUsername || '-'}</strong></p><p>Mật khẩu: <strong>{revealedInventory.password || '-'}</strong></p><p>Mã kích hoạt: <strong>{revealedInventory.activationCode || '-'}</strong></p></div>}</section><section className="admin-panel"><div className="admin-panel__head"><h2>Thêm dữ liệu kho</h2></div><form className="admin-form" onSubmit={submit}><Field label="Gói sản phẩm"><select value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}>{packages.map((item) => <option key={item.id} value={item.id}>{item.product?.name} — {item.name}</option>)}</select></Field><Field label="Loại"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['ACCOUNT', 'LICENSE_KEY', 'INVITE_LINK', 'MANUAL_DELIVERY'].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Email đăng nhập"><input value={form.loginEmail} onChange={(e) => setForm({ ...form, loginEmail: e.target.value })} /></Field><Field label="Tên đăng nhập"><input value={form.loginUsername} onChange={(e) => setForm({ ...form, loginUsername: e.target.value })} /></Field><Field label="Mật khẩu"><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field><Field label="Mã kích hoạt"><input value={form.activationCode} onChange={(e) => setForm({ ...form, activationCode: e.target.value })} /></Field><button className="button button--primary">Lưu vào kho</button></form></section></div>;
}

function UsersAdmin({ data, reload, notify }) {
  const toggle = async (user) => { try { const payload = await api.put(`/admin/users/${user.id}/status`, { status: user.status === 'active' ? 'blocked' : 'active' }, { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  return <section className="admin-panel"><div className="admin-panel__head"><h2>Khách hàng</h2></div><div className="admin-data-table admin-users-table"><div className="admin-table-head"><span>Họ tên</span><span>Email</span><span>Điện thoại</span><span>Trạng thái</span><span>Ngày tạo</span><span>Thao tác</span></div>{data.map((user) => <article key={user.id}><strong>{user.fullName}</strong><span>{user.email}</span><span>{user.phone || '-'}</span><b>{user.status}</b><span>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</span><button onClick={() => toggle(user)}>{user.status === 'active' ? 'Khóa' : 'Mở khóa'}</button></article>)}</div></section>;
}

function CouponsAdmin({ data, reload, notify }) {
  const [form, setForm] = useState({ code: '', description: '', discountType: 'PERCENTAGE', discountValue: 10, minimumOrderValue: 0, maximumDiscount: 100000, usageLimit: 100, usageLimitPerUser: 1, isActive: true });
  const submit = async (event) => { event.preventDefault(); try { const payload = await api.post('/admin/coupons', form, { auth: true }); notify(payload.message); setForm((current) => ({ ...current, code: '', description: '' })); reload(); } catch (error) { notify(error.message, 'error'); } };
  return <div className="admin-two-column"><section className="admin-panel"><div className="admin-panel__head"><h2>Mã giảm giá</h2></div><div className="admin-simple-list">{data.map((item) => <article key={item.id}><div><strong>{item.code}</strong><small>{item.description}</small></div><b>{item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : formatCurrency(item.discountValue)}</b><span>{item.isActive ? 'Đang bật' : 'Đã tắt'}</span></article>)}</div></section><section className="admin-panel"><div className="admin-panel__head"><h2>Tạo mã</h2></div><form className="admin-form" onSubmit={submit}><Field label="Mã"><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field><Field label="Mô tả"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label="Loại giảm"><select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}><option value="PERCENTAGE">Phần trăm</option><option value="FIXED_AMOUNT">Số tiền cố định</option></select></Field><Field label="Giá trị"><input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} /></Field><Field label="Đơn tối thiểu"><input type="number" value={form.minimumOrderValue} onChange={(e) => setForm({ ...form, minimumOrderValue: e.target.value })} /></Field><button className="button button--primary">Tạo mã</button></form></section></div>;
}

function ReviewsAdmin({ data, reload, notify }) {
  const toggle = async (review) => { try { const payload = await api.put(`/admin/reviews/${review.id}/status`, { isVisible: !review.isVisible }, { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  return <section className="admin-panel"><div className="admin-panel__head"><h2>Đánh giá khách hàng</h2></div><div className="admin-review-list">{data.map((review) => <article key={review.id}><div><strong>{review.user?.fullName}</strong><span>{'★'.repeat(review.rating)}</span></div><small>{review.Product?.name}</small><p>{review.content}</p><button onClick={() => toggle(review)}>{review.isVisible ? 'Ẩn đánh giá' : 'Hiện đánh giá'}</button></article>)}</div></section>;
}

function SupportAdmin({ data, reload, notify }) {
  const resolve = async (item) => { const reply = prompt('Nhập phản hồi cho khách hàng:', item.adminReply || 'Đã tiếp nhận và xử lý yêu cầu của bạn.'); if (reply === null) return; try { const payload = await api.put(`/admin/support-requests/${item.id}`, { status: 'resolved', adminReply: reply }, { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  return <section className="admin-panel"><div className="admin-panel__head"><h2>Yêu cầu hỗ trợ</h2></div><div className="admin-review-list">{data.map((item) => <article key={item.id}><div><strong>{item.subject}</strong><span>{item.status}</span></div><small>{item.user?.fullName} · {item.order?.orderCode || 'Không gắn đơn'}</small><p>{item.message}</p>{item.adminReply && <blockquote>{item.adminReply}</blockquote>}<button onClick={() => resolve(item)}>Phản hồi & hoàn tất</button></article>)}</div></section>;
}

function BannersAdmin({ data, reload, notify }) {
  const [form, setForm] = useState({ title: '', subtitle: '', imageUrl: '/assets/hero.jpg', linkUrl: '/products', sortOrder: 0, isActive: true });
  const submit = async (event) => { event.preventDefault(); try { const payload = await api.post('/admin/banners', form, { auth: true }); notify(payload.message); setForm((current) => ({ ...current, title: '', subtitle: '' })); reload(); } catch (error) { notify(error.message, 'error'); } };
  const remove = async (item) => { if (!confirm(`Xóa banner ${item.title}?`)) return; try { const payload = await api.delete(`/admin/banners/${item.id}`, { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  return <div className="admin-two-column"><section className="admin-panel"><div className="admin-panel__head"><h2>Banner</h2></div><div className="admin-simple-list">{data.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{item.subtitle}</small></div><span>Thứ tự {item.sortOrder}</span><button className="danger" onClick={() => remove(item)}>Xóa</button></article>)}</div></section><section className="admin-panel"><div className="admin-panel__head"><h2>Thêm banner</h2></div><form className="admin-form" onSubmit={submit}><Field label="Tiêu đề"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Mô tả"><textarea value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field><Field label="Đường dẫn ảnh"><input required value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></Field><Field label="Liên kết"><input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} /></Field><Field label="Thứ tự"><input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field><button className="button button--primary">Thêm banner</button></form></section></div>;
}

function AuditAdmin({ data }) {
  return <section className="admin-panel"><div className="admin-panel__head"><div><h2>Nhật ký hoạt động</h2><p>Theo dõi các thao tác nhạy cảm trong hệ thống.</p></div></div><div className="audit-list">{data.map((item) => <article key={item.id}><span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span><strong>{item.action}</strong><p>{item.actor?.email || 'Hệ thống'} · {item.entityType || '-'} #{item.entityId || '-'}</p></article>)}</div></section>;
}

function SettingsAdmin({ data, notify, reload }) {
  const [form, setForm] = useState({});
  useEffect(() => { setForm(Object.fromEntries(Object.entries(data || {}).map(([key, item]) => [key, item.value]))); }, [data]);
  const submit = async (event) => { event.preventDefault(); try { const payload = await api.put('/admin/settings', Object.fromEntries(Object.entries(form).map(([key, value]) => [key, { value, type: data[key]?.type || 'text' }])), { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  return <section className="admin-panel"><div className="admin-panel__head"><div><h2>Cài đặt website</h2><p>Ngân hàng, hỗ trợ và chính sách được frontend đọc trực tiếp.</p></div></div><form className="admin-form settings-form" onSubmit={submit}>{Object.entries(form).map(([key, value]) => <Field key={key} label={key.replaceAll('_', ' ')}><textarea rows={String(value).length > 80 ? 4 : 1} value={value} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>)}<button className="button button--primary">Lưu cài đặt</button></form></section>;
}

function Field({ label, children }) { return <label className="form-field"><span>{label}</span>{children}</label>; }
