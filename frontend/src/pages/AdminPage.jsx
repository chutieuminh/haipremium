import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3, Bell, ChevronDown, ChevronRight, ClipboardList, CreditCard, Info,
  Eye, EyeOff, LayoutDashboard, LogOut, Menu, MessageSquareText, MoreVertical, Package, Pencil, Search,
  Settings, ShoppingBag, Star, Tags, Trash2, TrendingUp, UsersRound, Plus, RefreshCcw, FolderTree, Images,
} from 'lucide-react';
import Brand from '../components/Brand';
import { formatCurrency } from '../data/products';
import { api, assetUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

const adminNav = [
  [LayoutDashboard, 'Tổng quan'], [ShoppingBag, 'Đơn hàng'], [Package, 'Sản phẩm'],
  [FolderTree, 'Danh mục'], [Tags, 'Gói sản phẩm'], [UsersRound, 'Khách hàng'],
  [CreditCard, 'Mã giảm giá'], [Star, 'Đánh giá'], [MessageSquareText, 'Yêu cầu hỗ trợ'],
  [Images, 'Banner & nội dung'], [Settings, 'Cài đặt'],
];

const endpointMap = {
  'Đơn hàng': '/admin/orders', 'Sản phẩm': '/admin/products?limit=100', 'Danh mục': '/admin/categories',
  'Gói sản phẩm': '/admin/packages',
  'Khách hàng': '/admin/users', 'Mã giảm giá': '/admin/coupons', 'Đánh giá': '/admin/reviews',
  'Yêu cầu hỗ trợ': '/admin/support-requests', 'Banner & nội dung': '/admin/banners',
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
  const [orders, setOrders] = useState([]);
  const { user, logout } = useAuth();
  const { notify } = useStore();
  const navigate = useNavigate();

  const loadBase = async () => {
    try {
      const [categoryPayload, productPayload, packagePayload, orderPayload] = await Promise.all([
        api.get('/admin/categories', { auth: true }),
        api.get('/admin/products?limit=100', { auth: true }),
        api.get('/admin/packages', { auth: true }),
        api.get('/admin/orders', { auth: true }),
      ]);
      setCategories(categoryPayload.data);
      setProducts(productPayload.data);
      setPackages(packagePayload.data);
      setOrders(orderPayload.data);
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
        if (active === 'Đơn hàng') setOrders(payload.data);
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
          <div className="admin-header__actions"><button onClick={load}><RefreshCcw size={19} /></button><div><strong>QTV Hải Premium</strong><small>Quản trị viên</small></div></div>
        </header>

        <div className="admin-content">
          <div className="admin-page-heading"><div><span className="eyebrow">Trang quản trị</span><h1>{active}</h1><p></p></div><button className="button button--soft" onClick={load}><RefreshCcw size={17} /> Làm mới</button></div>
          {loading ? <div className="loading-panel">Đang tải dữ liệu...</div> : active === 'Tổng quan' ? <Dashboard data={dashboard} onOpen={choose} /> : <AdminSection active={active} data={filtered} reload={load} notify={notify} categories={categories} products={products} packages={packages} orders={orders} refreshBase={loadBase} />}
        </div>
      </main>
    </div>
  );
}

function Dashboard({ data, onOpen }) {
  if (!data) return null;
  const stats = data.stats || {};
  const cards = [
    [BarChart3, 'Doanh thu tháng', formatCurrency(stats.monthRevenue)],
    [ClipboardList, 'Tổng đơn hàng', stats.totalOrders || 0],
    [Bell, 'Đơn cần xử lý', stats.pendingOrders || 0],
    [UsersRound, 'Khách hàng', stats.customers || 0],
  ];
  const completionRate = stats.totalOrders ? Math.round((stats.completedOrders || 0) / stats.totalOrders * 100) : 0;
  const todayMetrics = [
    [ShoppingBag, 'Đơn hàng mới', stats.todayOrders || 0, 'Đơn phát sinh hôm nay'],
    [TrendingUp, 'Doanh thu hôm nay', formatCurrency(stats.todayRevenue), 'Đơn hoàn tất trong ngày'],
    [UsersRound, 'Khách hàng mới', stats.newCustomers || 0, 'Tài khoản đăng ký hôm nay'],
    [ClipboardList, 'Tỷ lệ hoàn thành', `${completionRate}%`, `${stats.completedOrders || 0}/${stats.totalOrders || 0} đơn đã hoàn tất`],
  ];

  return <>
    <div className="admin-dashboard-intro">
      <div>
        <span>Vận hành hệ thống</span>
        <p>Theo dõi đơn hàng, doanh thu và tiến độ xử lý trong một nơi.</p>
      </div>
      <button type="button" onClick={() => onOpen('Đơn hàng')}><ShoppingBag size={16} /> Quản lý đơn hàng</button>
    </div>
    <div className="admin-stat-grid admin-stat-grid--overview">{cards.map(([Icon, label, value]) => <article key={label}><span><Icon /></span><div><small>{label}</small><strong>{value}</strong></div></article>)}</div>
    <div className="admin-dashboard-grid">
      <section className="admin-panel admin-panel--recent-orders">
        <div className="admin-panel__head"><div><h2>Đơn hàng mới nhất</h2><p>Cập nhật từ các giao dịch gần đây.</p></div><button onClick={() => onOpen('Đơn hàng')}>Xem tất cả <ChevronRight size={15} /></button></div>
        <AdminOrderTable orders={data.recentOrders || []} compact />
      </section>
      <section className="admin-panel admin-panel--performance">
        <div className="admin-panel__head"><div><h2>Hiệu suất hôm nay</h2><p>Chỉ số vận hành trong ngày.</p></div><span className="admin-live-indicator">Trực tiếp</span></div>
        <div className="admin-performance-grid">{todayMetrics.map(([Icon, label, value, helper]) => <article key={label}><span><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong><p>{helper}</p></div></article>)}</div>
      </section>
    </div>
  </>;
}

function AdminSection(props) {
  switch (props.active) {
    case 'Đơn hàng': return <OrdersAdminCrud {...props} />;
    case 'Sản phẩm': return <ProductsAdminCrud {...props} />;
    case 'Danh mục': return <CategoriesAdmin {...props} />;
    case 'Gói sản phẩm': return <PackagesAdminCrud {...props} />;
    case 'Khách hàng': return <UsersAdminCrud {...props} />;
    case 'Mã giảm giá': return <CouponsAdmin {...props} />;
    case 'Đánh giá': return <ReviewsAdmin {...props} />;
    case 'Yêu cầu hỗ trợ': return <SupportAdmin {...props} />;
    case 'Banner & nội dung': return <BannersAdmin {...props} />;
    case 'Cài đặt': return <SettingsAdmin {...props} />;
    default: return null;
  }
}

function AdminActionMenu({ items, triggerLabel }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const triggerRef = useRef(null);
  const menuId = useMemo(() => Math.random().toString(36).slice(2), []);
  const visibleItems = items.filter(Boolean);
  useEffect(() => {
    const closeOtherMenus = (event) => {
      if (event.detail !== menuId) setOpen(false);
    };
    window.addEventListener('admin-action-menu-open', closeOtherMenus);
    return () => window.removeEventListener('admin-action-menu-open', closeOtherMenus);
  }, [menuId]);
  useEffect(() => {
    if (!open) return undefined;
    const positionPanel = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 168;
      const estimatedHeight = 18 + visibleItems.length * 42;
      const openDown = rect.bottom + estimatedHeight + 14 < window.innerHeight;
      setPanelStyle({
        top: `${openDown ? rect.bottom + 12 : Math.max(12, rect.top - estimatedHeight - 12)}px`,
        left: `${Math.min(window.innerWidth - width - 12, Math.max(12, rect.right - width))}px`,
        width: `${width}px`,
      });
    };
    positionPanel();
    window.addEventListener('resize', positionPanel);
    window.addEventListener('scroll', positionPanel, true);
    return () => {
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('scroll', positionPanel, true);
    };
  }, [open, visibleItems.length]);
  if (!visibleItems.length) return null;
  const iconFor = (item) => {
    if (item.icon) return item.icon;
    if (item.danger || /xóa|hủy/i.test(item.label)) return Trash2;
    if (/sửa/i.test(item.label)) return Pencil;
    if (/ẩn|tắt|khóa/i.test(item.label)) return EyeOff;
    if (/hiện|bật|mở/i.test(item.label)) return Eye;
    return MoreVertical;
  };
  const run = (item) => {
    setOpen(false);
    item.onClick?.();
  };
  return (
    <div className="admin-action-menu">
      <button ref={triggerRef} type="button" className={`admin-action-menu__trigger ${triggerLabel ? 'admin-action-menu__trigger--label' : ''}`} onClick={() => setOpen((current) => { const next = !current; if (next) window.dispatchEvent(new CustomEvent('admin-action-menu-open', { detail: menuId })); return next; })} aria-expanded={open}>
        {triggerLabel ? <>{triggerLabel}<ChevronDown size={18} /></> : <MoreVertical size={18} />}
      </button>
      {open && (
        <div className="admin-action-menu__panel" style={panelStyle}>
          {visibleItems.map((item) => {
            const Icon = iconFor(item);
            return (
              <button key={item.label} type="button" className={item.danger ? 'is-danger' : item.primary ? 'is-primary' : ''} onClick={() => run(item)}>
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminCrudModal({ title, description, submitLabel, onClose, onSubmit, children }) {
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <section className="admin-panel admin-order-modal admin-crud-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-panel__head">
          <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
          <button type="button" onClick={onClose}>Đóng</button>
        </div>
        <form className="admin-form" onSubmit={onSubmit}>
          {children}
          <button className="button button--primary">{submitLabel}</button>
        </form>
      </section>
    </div>
  );
}

function AdminInfoModal({ title, description, onClose, children }) {
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <section className="admin-panel admin-order-modal admin-crud-modal admin-info-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-panel__head">
          <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
          <button type="button" onClick={onClose}>Đóng</button>
        </div>
        <div className="admin-info-grid">
          {children}
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value, wide = false }) {
  return (
    <article className={`admin-info-item ${wide ? 'is-wide' : ''}`}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </article>
  );
}

function initialsOf(value) {
  const parts = String(value || 'KH').trim().split(/\s+/).filter(Boolean);
  const source = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return source.map((part) => part[0]?.toUpperCase()).join('') || 'KH';
}

function AdminOrderTable({ orders, actions }) {
  const hasActions = Boolean(actions);
  return <div className={`admin-data-table ${hasActions ? 'admin-data-table--actions' : 'admin-data-table--no-actions'}`}><div className="admin-table-head"><span>Mã đơn</span><span>Khách hàng</span><span>Tổng tiền</span><span>Trạng thái</span><span>Ngày tạo</span>{hasActions && <span>Thao tác</span>}</div>{orders.map((order) => <article key={order.id}><strong>{order.orderCode}</strong><span>{order.customerName}<small>{order.customerEmail}</small></span><b>{formatCurrency(order.total)}</b><span className={`status-badge status-badge--${order.orderStatus === 'completed' ? 'completed' : order.orderStatus === 'payment_review' ? 'review' : 'processing'}`}>{order.statusLabel}</span><span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span>{hasActions && <div className="admin-row-actions">{actions(order)}</div>}</article>)}</div>;
}

function OrdersAdmin({ data, reload, notify }) {
  const act = async (path, body) => { try { const payload = body ? await api.put(path, body, { auth: true }) : await api.post(path, undefined, { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  const viewProof = async (order) => { try { const payload = await api.get(`/admin/orders/${order.id}/payment-proof`, { auth: true }); const popup = window.open('', '_blank'); if (popup) popup.document.write(`<title>Biên lai ${order.orderCode}</title><img src="${payload.data.dataUrl}" style="max-width:100%;display:block;margin:auto" />`); } catch (error) { notify(error.message, 'error'); } };
  return <section className="admin-panel"><div className="admin-panel__head"><div><h2>Quản lý đơn hàng</h2><p>Xác nhận thanh toán, chuyển xử lý và bàn giao kho tự động.</p></div></div><AdminOrderTable orders={data} actions={(order) => <>{order.paymentProofPath && <button onClick={() => viewProof(order)}>Biên lai</button>}{['pending_payment', 'payment_review'].includes(order.orderStatus) && <button onClick={() => act(`/admin/orders/${order.id}/confirm-payment`)}>Xác nhận tiền</button>}{order.orderStatus === 'paid' && <button onClick={() => act(`/admin/orders/${order.id}/status`, { orderStatus: 'processing' })}>Đang xử lý</button>}{['paid', 'processing'].includes(order.orderStatus) && <button className="primary" onClick={() => act(`/admin/orders/${order.id}/deliver`)}>Bàn giao</button>}{!['completed', 'cancelled', 'refunded'].includes(order.orderStatus) && <button className="danger" onClick={() => act(`/admin/orders/${order.id}/status`, { orderStatus: 'cancelled' })}>Hủy</button>}</>} /></section>;
}

function OrdersAdminCrud({ data, reload, notify, packages, refreshBase }) {
  const initial = { userId: '', packageId: packages[0]?.id || '', quantity: 1, customerName: '', customerEmail: '', customerPhone: '', note: '', orderStatus: 'pending_payment', paymentStatus: 'unpaid', internalNote: '' };
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  useEffect(() => { if (!form.packageId && packages[0]) setForm((current) => ({ ...current, packageId: packages[0].id })); }, [packages]);
  const reset = () => { setEditing(null); setViewing(null); setShowComposer(false); setForm({ ...initial, packageId: packages[0]?.id || '' }); };
  const reloadAll = async () => { await Promise.all([reload(), refreshBase?.()]); };
  const act = async (path, body) => { try { const payload = body ? await api.put(path, body, { auth: true }) : await api.post(path, undefined, { auth: true }); notify(payload.message); reloadAll(); } catch (error) { notify(error.message, 'error'); } };
  const viewProof = async (order) => { try { const payload = await api.get(`/admin/orders/${order.id}/payment-proof`, { auth: true }); const popup = window.open('', '_blank'); if (popup) popup.document.write(`<title>Biên lai ${order.orderCode}</title><img src="${payload.data.dataUrl}" style="max-width:100%;display:block;margin:auto" />`); } catch (error) { notify(error.message, 'error'); } };
  const create = () => { setEditing(null); setViewing(null); setForm({ ...initial, packageId: packages[0]?.id || '' }); setShowComposer(true); };
  const view = (order) => { setViewing(order); setEditing(null); setShowComposer(false); };
  const edit = (order) => { setEditing(order); setViewing(null); setShowComposer(false); setForm({ ...initial, customerName: order.customerName || '', customerEmail: order.customerEmail || '', customerPhone: order.customerPhone || '', note: order.note || '', internalNote: order.internalNote || '', orderStatus: order.orderStatus || 'pending_payment', paymentStatus: order.paymentStatus || 'unpaid' }); };
  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = editing ? await api.put(`/admin/orders/${editing.id}`, form, { auth: true }) : await api.post('/admin/orders', form, { auth: true });
      notify(payload.message);
      reset();
      reloadAll();
    } catch (error) { notify(error.message, 'error'); }
  };
  const remove = async (order) => { if (!confirm(`Xóa đơn ${order.orderCode}?`)) return; try { const payload = await api.delete(`/admin/orders/${order.id}`, { auth: true }); notify(payload.message); reloadAll(); } catch (error) { notify(error.message, 'error'); } };
  const formFields = (
    <>
      {!editing && (
        <>
          <Field label="ID khách hàng"><input required type="number" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="Nhập ID khách hàng" /></Field>
          <Field label="Gói sản phẩm"><select value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}>{packages.map((item) => <option key={item.id} value={item.id}>{item.product?.name} - {item.name}</option>)}</select></Field>
          <Field label="Số lượng"><input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
        </>
      )}
      <Field label="Tên khách hàng"><input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></Field>
      <Field label="Email"><input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} /></Field>
      <Field label="Điện thoại"><input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} /></Field>
      <div className="admin-form-row">
        <Field label="Trạng thái đơn"><select value={form.orderStatus} onChange={(e) => setForm({ ...form, orderStatus: e.target.value })}>{['pending_payment', 'payment_review', 'paid', 'processing', 'completed', 'cancelled', 'refunded'].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Trạng thái tiền"><select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>{['unpaid', 'review', 'paid', 'refunded'].map((value) => <option key={value}>{value}</option>)}</select></Field>
      </div>
      <Field label="Ghi chú"><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
      <Field label="Ghi chú nội bộ"><textarea value={form.internalNote} onChange={(e) => setForm({ ...form, internalNote: e.target.value })} /></Field>
    </>
  );

  return <><div className="admin-orders-workspace"><section className="admin-panel"><div className="admin-panel__head"><div><h2>Quản lý đơn hàng</h2><p>Xác nhận, bàn giao, chỉnh sửa và theo dõi đơn hàng.</p></div><button className="button button--soft" type="button" onClick={create}><Plus size={16} /> Tạo đơn</button></div><AdminOrderTable orders={data} actions={(order) => <AdminActionMenu items={[{ label: 'Xem thông tin', icon: Info, onClick: () => view(order) }, order.paymentProofPath && { label: 'Xem biên lai', onClick: () => viewProof(order) }, { label: 'Sửa', onClick: () => edit(order) }, ['pending_payment', 'payment_review'].includes(order.orderStatus) && { label: 'Xác nhận tiền', onClick: () => act(`/admin/orders/${order.id}/confirm-payment`) }, order.orderStatus === 'paid' && { label: 'Chuyển xử lý', onClick: () => act(`/admin/orders/${order.id}/status`, { orderStatus: 'processing' }) }, ['paid', 'processing'].includes(order.orderStatus) && { label: 'Bàn giao', primary: true, onClick: () => act(`/admin/orders/${order.id}/deliver`) }, !['completed', 'cancelled', 'refunded'].includes(order.orderStatus) && { label: 'Hủy đơn', danger: true, onClick: () => act(`/admin/orders/${order.id}/status`, { orderStatus: 'cancelled' }) }, { label: 'Xóa', danger: true, onClick: () => remove(order) }]} />} /></section></div>{viewing && <AdminInfoModal title={viewing.orderCode} description={viewing.customerName || viewing.customerEmail || 'Đơn hàng'} onClose={() => setViewing(null)}><InfoItem label="Khách hàng" value={viewing.customerName} /><InfoItem label="Email" value={viewing.customerEmail} /><InfoItem label="Điện thoại" value={viewing.customerPhone} /><InfoItem label="Tổng tiền" value={formatCurrency(viewing.total)} /><InfoItem label="Trạng thái đơn" value={viewing.statusLabel || viewing.orderStatus} /><InfoItem label="Trạng thái tiền" value={viewing.paymentStatus} /><InfoItem label="Ngày tạo" value={viewing.createdAt ? new Date(viewing.createdAt).toLocaleString('vi-VN') : '-'} /><InfoItem label="Số sản phẩm" value={viewing.items?.length || 0} />{viewing.note && <InfoItem wide label="Ghi chú" value={viewing.note} />}{viewing.internalNote && <InfoItem wide label="Ghi chú nội bộ" value={viewing.internalNote} />}</AdminInfoModal>}{showComposer && <AdminCrudModal title="Tạo đơn mới" description="Chỉ dùng khi cần tạo đơn thủ công cho khách." submitLabel="Tạo đơn hàng" onClose={reset} onSubmit={submit}>{formFields}</AdminCrudModal>}{editing && <AdminCrudModal title={`Sửa ${editing.orderCode}`} description="Cập nhật thông tin và trạng thái đơn." submitLabel="Lưu đơn hàng" onClose={reset} onSubmit={submit}>{formFields}</AdminCrudModal>}</>;
}

function ProductsAdminCrud({ data, categories, reload, notify, refreshBase }) {
  const initial = { name: '', categoryId: categories[0]?.id || '', shortDescription: '', description: '', logo: '/assets/logos/chatgpt.png', basePrice: 99000, originalPrice: 199000, badge: '', status: 'active', isFeatured: false, isBestSeller: false, warrantyDescription: '', usageInstructions: '', terms: '', features: '' };
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  useEffect(() => { if (!form.categoryId && categories[0]) setForm((current) => ({ ...current, categoryId: categories[0].id })); }, [categories]);
  const reset = () => { setEditing(null); setViewing(null); setFormOpen(false); setForm({ ...initial, categoryId: categories[0]?.id || '' }); };
  const create = () => { setEditing(null); setViewing(null); setForm({ ...initial, categoryId: categories[0]?.id || '' }); setFormOpen(true); };
  const view = (product) => { setViewing(product); setEditing(null); setFormOpen(false); };
  const edit = (product) => {
    setEditing(product);
    setViewing(null);
    setFormOpen(true);
    setForm({
      name: product.name || '',
      categoryId: product.categoryDbId || product.category?.id || '',
      shortDescription: product.shortDescription || '',
      description: product.description || '',
      logo: product.logo || '',
      basePrice: product.basePrice || product.price || 0,
      originalPrice: product.originalPrice || 0,
      badge: product.badge || '',
      status: product.status || 'active',
      isFeatured: Boolean(product.isFeatured || product.featured),
      isBestSeller: Boolean(product.isBestSeller),
      warrantyDescription: product.warrantyDescription || product.warranty || '',
      usageInstructions: product.usageInstructions || '',
      terms: product.terms || '',
      features: Array.isArray(product.features) ? product.features.join('\n') : '',
    });
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = editing ? await api.put(`/admin/products/${editing.id}`, form, { auth: true }) : await api.post('/admin/products', form, { auth: true });
      notify(payload.message);
      reset();
      await Promise.all([reload(), refreshBase()]);
    } catch (error) { notify(error.message, 'error'); }
  };
  const toggle = async (product) => { try { const payload = await api.put(`/admin/products/${product.id}`, { status: product.status === 'active' ? 'inactive' : 'active' }, { auth: true }); notify(payload.message); reload(); refreshBase(); } catch (error) { notify(error.message, 'error'); } };
  const remove = async (product) => { if (!confirm(`Xóa mềm ${product.name}?`)) return; try { const payload = await api.delete(`/admin/products/${product.id}`, { auth: true }); notify(payload.message); reload(); refreshBase(); } catch (error) { notify(error.message, 'error'); } };
  const productCategoryKey = (product) => String(product.categoryDbId || product.category?.id || product.categoryId || '');
  const categoryGroups = categories.map((category) => ({
    category,
    products: data.filter((product) => productCategoryKey(product) === String(category.id) || product.categoryId === category.code),
  })).filter((group) => group.products.length);
  const groupedProductIds = new Set(categoryGroups.flatMap((group) => group.products.map((product) => product.id)));
  const uncategorizedProducts = data.filter((product) => !groupedProductIds.has(product.id));
  const renderProductRow = (product) => <article key={product.id}><img src={assetUrl(product.logo)} alt="" /><div><strong>{product.name}</strong><small>{product.shortDescription || product.category?.name}</small></div><span className={product.status === 'active' ? 'admin-state is-on' : 'admin-state'}>{product.status === 'active' ? 'Hiển thị' : 'Đã ẩn'}</span><AdminActionMenu items={[{ label: 'Xem thông tin', icon: Info, onClick: () => view(product) }, { label: 'Sửa', onClick: () => edit(product) }, { label: product.status === 'active' ? 'Ẩn sản phẩm' : 'Hiện sản phẩm', onClick: () => toggle(product) }, { label: 'Xóa', danger: true, onClick: () => remove(product) }]} /></article>;

  return <><section className="admin-panel admin-products-panel"><div className="admin-panel__head"><div><h2>Danh sách sản phẩm</h2><p>{data.length} sản phẩm trong {categoryGroups.length} danh mục.</p></div><button className="button button--soft" type="button" onClick={create}><Plus size={16} /> Thêm sản phẩm</button></div><div className="admin-product-groups">{categoryGroups.map((group) => <section className="admin-product-group" key={group.category.id} style={{ '--admin-category-accent': group.category.accent || '#1689d8' }}><header className="admin-product-group__head"><div><span className="admin-product-group__marker" /><h3>{group.category.name}</h3></div><b>{group.products.length} sản phẩm</b></header><div className="admin-product-list admin-product-list--grouped">{group.products.map(renderProductRow)}</div></section>)}{uncategorizedProducts.length > 0 && <section className="admin-product-group admin-product-group--uncategorized"><header className="admin-product-group__head"><div><span className="admin-product-group__marker" /><h3>Chưa phân loại</h3></div><b>{uncategorizedProducts.length} sản phẩm</b></header><div className="admin-product-list admin-product-list--grouped">{uncategorizedProducts.map(renderProductRow)}</div></section>}</div></section>{viewing && <AdminInfoModal title={viewing.name} description={viewing.category?.name || 'Sản phẩm'} onClose={() => setViewing(null)}><InfoItem label="Danh mục" value={viewing.category?.name} /><InfoItem label="Giá bán" value={formatCurrency(viewing.price || viewing.basePrice)} /><InfoItem label="Giá gốc" value={formatCurrency(viewing.originalPrice)} /><InfoItem label="Trạng thái" value={viewing.status === 'active' ? 'Hiển thị' : 'Đã ẩn'} /><InfoItem label="Badge" value={viewing.badge} /><InfoItem label="Logo" value={viewing.logo} /><InfoItem label="Nổi bật" value={viewing.isFeatured || viewing.featured ? 'Có' : 'Không'} /><InfoItem label="Bán chạy" value={viewing.isBestSeller ? 'Có' : 'Không'} />{viewing.shortDescription && <InfoItem wide label="Mô tả ngắn" value={viewing.shortDescription} />}{viewing.description && <InfoItem wide label="Mô tả chi tiết" value={viewing.description} />}</AdminInfoModal>}{formOpen && <AdminCrudModal title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} description={editing ? `Đang sửa: ${editing.name}` : 'Thông tin được lưu vào MySQL.'} submitLabel={editing ? 'Lưu sản phẩm' : 'Thêm sản phẩm'} onClose={reset} onSubmit={submit}><Field label="Tên sản phẩm"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Danh mục"><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Logo"><input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} /></Field><Field label="Badge"><input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Bán chạy, Hot hoặc Mới" /></Field><Field label="Mô tả ngắn"><textarea value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} /></Field><Field label="Mô tả chi tiết"><textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><div className="admin-form-row"><Field label="Giá bán"><input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} /></Field><Field label="Giá gốc"><input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} /></Field></div><div className="admin-form-row"><Field label="Trạng thái"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">active</option><option value="inactive">inactive</option></select></Field><Field label="Tính năng"><textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></Field></div><Field label="Bảo hành"><textarea value={form.warrantyDescription} onChange={(e) => setForm({ ...form, warrantyDescription: e.target.value })} /></Field><Field label="Hướng dẫn sử dụng"><textarea value={form.usageInstructions} onChange={(e) => setForm({ ...form, usageInstructions: e.target.value })} /></Field><Field label="Điều khoản"><textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></Field><label className="check-row"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Nổi bật</label><label className="check-row"><input type="checkbox" checked={form.isBestSeller} onChange={(e) => setForm({ ...form, isBestSeller: e.target.checked })} /> Bán chạy</label></AdminCrudModal>}</>;
  return <><section className="admin-panel"><div className="admin-panel__head"><div><h2>Danh sách sản phẩm</h2><p>{data.length} sản phẩm.</p></div><button className="button button--soft" type="button" onClick={create}><Plus size={16} /> Thêm sản phẩm</button></div><div className="admin-product-list">{data.map((product) => <article key={product.id}><img src={assetUrl(product.logo)} alt="" /><div><strong>{product.name}</strong></div><span className={product.status === 'active' ? 'admin-state is-on' : 'admin-state'}>{product.status === 'active' ? 'Hiển thị' : 'Đã ẩn'}</span><AdminActionMenu items={[{ label: 'Xem thông tin', icon: Info, onClick: () => view(product) }, { label: 'Sửa', onClick: () => edit(product) }, { label: product.status === 'active' ? 'Ẩn sản phẩm' : 'Hiện sản phẩm', onClick: () => toggle(product) }, { label: 'Xóa', danger: true, onClick: () => remove(product) }]} /></article>)}</div></section>{viewing && <AdminInfoModal title={viewing.name} description={viewing.category?.name || 'Sản phẩm'} onClose={() => setViewing(null)}><InfoItem label="Danh mục" value={viewing.category?.name} /><InfoItem label="Giá bán" value={formatCurrency(viewing.price || viewing.basePrice)} /><InfoItem label="Giá gốc" value={formatCurrency(viewing.originalPrice)} /><InfoItem label="Trạng thái" value={viewing.status === 'active' ? 'Hiển thị' : 'Đã ẩn'} /><InfoItem label="Badge" value={viewing.badge} /><InfoItem label="Logo" value={viewing.logo} /><InfoItem label="Nổi bật" value={viewing.isFeatured || viewing.featured ? 'Có' : 'Không'} /><InfoItem label="Bán chạy" value={viewing.isBestSeller ? 'Có' : 'Không'} />{viewing.shortDescription && <InfoItem wide label="Mô tả ngắn" value={viewing.shortDescription} />}{viewing.description && <InfoItem wide label="Mô tả chi tiết" value={viewing.description} />}</AdminInfoModal>}{formOpen && <AdminCrudModal title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} description={editing ? `Đang sửa: ${editing.name}` : 'Thông tin được lưu vào MySQL.'} submitLabel={editing ? 'Lưu sản phẩm' : 'Thêm sản phẩm'} onClose={reset} onSubmit={submit}><Field label="Tên sản phẩm"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Danh mục"><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Logo"><input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} /></Field><Field label="Badge"><input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Bán chạy, Ưu đãi..." /></Field><Field label="Mô tả ngắn"><textarea value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} /></Field><Field label="Mô tả chi tiết"><textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><div className="admin-form-row"><Field label="Giá bán"><input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} /></Field><Field label="Giá gốc"><input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} /></Field></div><div className="admin-form-row"><Field label="Trạng thái"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">active</option><option value="inactive">inactive</option></select></Field><Field label="Tính năng"><textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></Field></div><Field label="Bảo hành"><textarea value={form.warrantyDescription} onChange={(e) => setForm({ ...form, warrantyDescription: e.target.value })} /></Field><Field label="Hướng dẫn sử dụng"><textarea value={form.usageInstructions} onChange={(e) => setForm({ ...form, usageInstructions: e.target.value })} /></Field><Field label="Điều khoản"><textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></Field><label className="check-row"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Nổi bật</label><label className="check-row"><input type="checkbox" checked={form.isBestSeller} onChange={(e) => setForm({ ...form, isBestSeller: e.target.checked })} /> Bán chạy</label></AdminCrudModal>}</>;
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
  const initial = { code: '', name: '', slug: '', description: '', icon: 'FolderTree', accent: '#1689D8', isActive: true };
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const reset = () => { setEditing(null); setViewing(null); setFormOpen(false); setForm(initial); };
  const create = () => { setEditing(null); setViewing(null); setForm(initial); setFormOpen(true); };
  const view = (item) => { setViewing(item); setEditing(null); setFormOpen(false); };
  const edit = (item) => {
    setEditing(item);
    setViewing(null);
    setFormOpen(true);
    setForm({
      code: item.code || '',
      name: item.name || '',
      slug: item.slug || '',
      description: item.description || '',
      icon: item.icon || 'FolderTree',
      accent: item.accent || '#1689D8',
      isActive: item.isActive !== false,
    });
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = editing ? await api.put(`/admin/categories/${editing.id}`, form, { auth: true }) : await api.post('/admin/categories', form, { auth: true });
      notify(payload.message);
      reset();
      await Promise.all([reload(), refreshBase?.()]);
    } catch (error) { notify(error.message, 'error'); }
  };
  const toggle = async (item) => {
    try {
      const payload = await api.put(`/admin/categories/${item.id}`, { isActive: !item.isActive }, { auth: true });
      notify(payload.message);
      await Promise.all([reload(), refreshBase?.()]);
    } catch (error) { notify(error.message, 'error'); }
  };
  const remove = async (item) => { if (!confirm(`Xóa danh mục ${item.name}?`)) return; try { const payload = await api.delete(`/admin/categories/${item.id}`, { auth: true }); notify(payload.message); reload(); refreshBase(); } catch (error) { notify(error.message, 'error'); } };
  return <><section className="admin-panel"><div className="admin-panel__head"><div><h2>Danh mục sản phẩm</h2><p>Xem, sửa trạng thái và quản lý nhóm sản phẩm.</p></div><button className="button button--soft" type="button" onClick={create}><Plus size={16} /> Thêm danh mục</button></div><div className="admin-simple-list admin-crud-list admin-category-list">{data.map((item) => <article key={item.id}><div><strong>{item.name}</strong></div><span className={item.isActive ? 'admin-state is-on' : 'admin-state'}>{item.isActive ? 'Hiển thị' : 'Đã ẩn'}</span><AdminActionMenu items={[{ label: 'Xem thông tin', icon: Info, onClick: () => view(item) }, { label: 'Sửa', onClick: () => edit(item) }, { label: item.isActive ? 'Ẩn' : 'Hiện', onClick: () => toggle(item) }, { label: 'Xóa', danger: true, onClick: () => remove(item) }]} /></article>)}</div></section>{viewing && <AdminInfoModal title={viewing.name} description="Danh mục sản phẩm" onClose={() => setViewing(null)}><InfoItem label="Mã danh mục" value={viewing.code} /><InfoItem label="Slug" value={`/${viewing.slug}`} /><InfoItem label="Icon" value={viewing.icon} /><InfoItem label="Màu nhấn" value={viewing.accent} /><InfoItem label="Trạng thái" value={viewing.isActive ? 'Hiển thị' : 'Đã ẩn'} />{viewing.description && <InfoItem wide label="Mô tả" value={viewing.description} />}</AdminInfoModal>}{formOpen && <AdminCrudModal title={editing ? 'Sửa danh mục' : 'Thêm danh mục'} description={editing ? `Đang sửa: ${editing.name}` : 'Tạo nhóm sản phẩm mới.'} submitLabel={editing ? 'Lưu danh mục' : 'Thêm danh mục'} onClose={reset} onSubmit={submit}><Field label="Mã danh mục"><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="security" /></Field><Field label="Tên danh mục"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Slug"><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="de-trong-de-tu-tao" /></Field><Field label="Mô tả"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><div className="admin-form-row"><Field label="Icon"><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></Field><Field label="Màu nhấn"><input type="color" value={form.accent} onChange={(e) => setForm({ ...form, accent: e.target.value })} /></Field></div><label className="check-row"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Hiển thị danh mục</label></AdminCrudModal>}</>;
}

function PackagesAdmin({ data, products, reload, notify, refreshBase }) {
  const [form, setForm] = useState({ productId: products[0]?.id || '', name: 'Gói 1 tháng', duration: '1 tháng', accountType: 'Tài khoản riêng', originalPrice: 199000, salePrice: 99000, stock: 10, warrantyDays: 30, isActive: true });
  useEffect(() => { if (!form.productId && products[0]) setForm((current) => ({ ...current, productId: products[0].id })); }, [products]);
  const submit = async (event) => { event.preventDefault(); try { const payload = await api.post('/admin/packages', form, { auth: true }); notify(payload.message); reload(); refreshBase(); } catch (error) { notify(error.message, 'error'); } };
  return <div className="admin-two-column"><section className="admin-panel"><div className="admin-panel__head"><h2>Gói sản phẩm</h2></div><div className="admin-simple-list">{data.map((item) => <article key={item.id}><div><strong>{item.product?.name}</strong><small>{item.name} · {item.accountType}</small></div><b>{formatCurrency(item.salePrice)}</b><span>{item.stock}</span></article>)}</div></section><section className="admin-panel"><div className="admin-panel__head"><h2>Thêm gói</h2></div><form className="admin-form" onSubmit={submit}><Field label="Sản phẩm"><select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Tên gói"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Thời hạn"><input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></Field><Field label="Loại tài khoản"><select value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>{['Tài khoản riêng', 'Tài khoản dùng chung', 'Nâng cấp chính chủ', 'Mã kích hoạt', 'Thành viên nhóm'].map((value) => <option key={value}>{value}</option>)}</select></Field><div className="admin-form-row"><Field label="Giá bán"><input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} /></Field><Field label="Tồn kho"><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field></div><button className="button button--primary">Thêm gói</button></form></section></div>;
}

function PackagesAdminCrud({ data, products, reload, notify, refreshBase }) {
  const initial = { productId: products[0]?.id || '', name: 'Gói 1 tháng', duration: '1 tháng', accountType: 'Tài khoản riêng', description: '', originalPrice: 199000, salePrice: 99000, stock: 10, warrantyDays: 30, isActive: true };
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [packageQuery, setPackageQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('all');
  useEffect(() => { if (!form.productId && products[0]) setForm((current) => ({ ...current, productId: products[0].id })); }, [products]);
  const productFilters = useMemo(() => {
    const productMap = new Map();
    data.forEach((item) => {
      const key = String(item.product?.id || item.productId || 'unknown');
      if (!productMap.has(key)) productMap.set(key, { id: key, name: item.product?.name || 'Chưa gắn sản phẩm', count: 0 });
      productMap.get(key).count += 1;
    });
    return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [data]);
  const visiblePackages = useMemo(() => {
    const keyword = packageQuery.trim().toLowerCase();
    return data.filter((item) => {
      const productId = String(item.product?.id || item.productId || 'unknown');
      const matchesProduct = selectedProductId === 'all' || productId === selectedProductId;
      const searchable = [item.product?.name, item.name, item.duration, item.accountType, item.description].filter(Boolean).join(' ').toLowerCase();
      return matchesProduct && (!keyword || searchable.includes(keyword));
    });
  }, [data, packageQuery, selectedProductId]);
  const groupedPackages = useMemo(() => {
    const groups = new Map();
    visiblePackages.forEach((item) => {
      const key = String(item.product?.id || item.productId || 'unknown');
      if (!groups.has(key)) groups.set(key, { id: key, name: item.product?.name || 'Chưa gắn sản phẩm', items: [] });
      groups.get(key).items.push(item);
    });
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [visiblePackages]);
  const reset = () => { setEditing(null); setViewing(null); setFormOpen(false); setForm({ ...initial, productId: products[0]?.id || '' }); };
  const create = () => { setEditing(null); setViewing(null); setForm({ ...initial, productId: products[0]?.id || '' }); setFormOpen(true); };
  const view = (item) => { setViewing(item); setEditing(null); setFormOpen(false); };
  const edit = (item) => {
    setEditing(item);
    setViewing(null);
    setFormOpen(true);
    setForm({
      productId: item.productId || item.product?.id || '',
      name: item.name || '',
      duration: item.duration || '',
      accountType: item.accountType || 'Tài khoản riêng',
      description: item.description || '',
      originalPrice: item.originalPrice || 0,
      salePrice: item.salePrice || 0,
      stock: item.stock || 0,
      warrantyDays: item.warrantyDays || 30,
      isActive: item.isActive !== false,
    });
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = editing ? await api.put(`/admin/packages/${editing.id}`, form, { auth: true }) : await api.post('/admin/packages', form, { auth: true });
      notify(payload.message);
      reset();
      await Promise.all([reload(), refreshBase?.()]);
    } catch (error) { notify(error.message, 'error'); }
  };
  const remove = async (item) => {
    if (!confirm(`Xóa gói ${item.name}?`)) return;
    try {
      const payload = await api.delete(`/admin/packages/${item.id}`, { auth: true });
      notify(payload.message);
      await Promise.all([reload(), refreshBase?.()]);
    } catch (error) { notify(error.message, 'error'); }
  };
  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2>Gói sản phẩm</h2>
            <p>{visiblePackages.length} / {data.length} gói đang hiển thị.</p>
          </div>
          <button className="button button--soft" type="button" onClick={create}><Plus size={16} /> Thêm gói</button>
        </div>
        <div className="admin-package-toolbar">
          <label className="admin-package-search">
            <Search size={18} />
            <input value={packageQuery} onChange={(event) => setPackageQuery(event.target.value)} placeholder="Tìm theo tên gói, sản phẩm, loại tài khoản..." />
          </label>
          <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
            <option value="all">Tất cả sản phẩm</option>
            {productFilters.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.count})</option>)}
          </select>
        </div>
        <div className="admin-package-groups">
          {groupedPackages.map((group) => (
            <section key={group.id} className="admin-package-group">
              <div className="admin-package-group__head">
                <strong>{group.name}</strong>
                <span>{group.items.length} gói</span>
              </div>
              <div className="admin-simple-list admin-package-list">
                {group.items.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.duration} · {item.accountType}</small>
                    </div>
                    <AdminActionMenu items={[
                      { label: 'Xem thông tin', icon: Info, onClick: () => view(item) },
                      { label: 'Sửa', onClick: () => edit(item) },
                      { label: 'Xóa', danger: true, onClick: () => remove(item) },
                    ]} />
                  </article>
                ))}
              </div>
            </section>
          ))}
          {!groupedPackages.length && <div className="admin-empty-state">Không tìm thấy gói phù hợp.</div>}
        </div>
      </section>
      {viewing && (
        <AdminInfoModal title={viewing.product?.name || 'Gói sản phẩm'} description={`${viewing.name || ''} · ${viewing.accountType || ''}`} onClose={() => setViewing(null)}>
          <InfoItem label="Sản phẩm" value={viewing.product?.name} />
          <InfoItem label="Tên gói" value={viewing.name} />
          <InfoItem label="Thời hạn" value={viewing.duration} />
          <InfoItem label="Loại tài khoản" value={viewing.accountType} />
          <InfoItem label="Giá bán" value={formatCurrency(viewing.salePrice)} />
          <InfoItem label="Giá gốc" value={formatCurrency(viewing.originalPrice)} />
          <InfoItem label="Tồn kho" value={viewing.stock} />
          <InfoItem label="Bảo hành" value={`${viewing.warrantyDays || 0} ngày`} />
          <InfoItem label="Trạng thái" value={viewing.isActive === false ? 'Đã tắt' : 'Đang bật'} />
          {viewing.description && <InfoItem wide label="Mô tả" value={viewing.description} />}
        </AdminInfoModal>
      )}
      {formOpen && <AdminCrudModal title={editing ? 'Sửa gói' : 'Thêm gói'} description={editing ? `Đang sửa: ${editing.product?.name || ''} - ${editing.name}` : 'Tạo gói bán mới cho sản phẩm.'} submitLabel={editing ? 'Lưu gói' : 'Thêm gói'} onClose={reset} onSubmit={submit}><Field label="Sản phẩm"><select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Tên gói"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Thời hạn"><input required value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></Field><Field label="Loại tài khoản"><select value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>{['Tài khoản riêng', 'Tài khoản dùng chung', 'Nâng cấp chính chủ', 'Mã kích hoạt', 'Thành viên nhóm'].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Mô tả"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><div className="admin-form-row"><Field label="Giá gốc"><input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} /></Field><Field label="Giá bán"><input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} /></Field></div><div className="admin-form-row"><Field label="Tồn kho"><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field><Field label="Ngày bảo hành"><input type="number" value={form.warrantyDays} onChange={(e) => setForm({ ...form, warrantyDays: e.target.value })} /></Field></div><label className="check-row"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Đang bật</label></AdminCrudModal>}
    </>
  );
}

function UsersAdmin({ data, reload, notify }) {
  const toggle = async (user) => { try { const payload = await api.put(`/admin/users/${user.id}/status`, { status: user.status === 'active' ? 'blocked' : 'active' }, { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  return <section className="admin-panel"><div className="admin-panel__head"><h2>Khách hàng</h2></div><div className="admin-data-table admin-users-table"><div className="admin-table-head"><span>Họ tên</span><span>Email</span><span>Điện thoại</span><span>Trạng thái</span><span>Ngày tạo</span><span>Thao tác</span></div>{data.map((user) => <article key={user.id}><strong>{user.fullName}</strong><span>{user.email}</span><span>{user.phone || '-'}</span><b>{user.status}</b><span>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</span><button onClick={() => toggle(user)}>{user.status === 'active' ? 'Khóa' : 'Mở khóa'}</button></article>)}</div></section>;
}

function UsersAdminCrud({ data, reload, notify }) {
  const initial = { fullName: '', email: '', phone: '', password: '', status: 'active' };
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const reset = () => { setEditing(null); setViewing(null); setFormOpen(false); setForm(initial); };
  const create = () => { setEditing(null); setViewing(null); setForm(initial); setFormOpen(true); };
  const view = (user) => { setViewing(user); setEditing(null); setFormOpen(false); };
  const edit = (user) => {
    setEditing(user);
    setViewing(null);
    setFormOpen(true);
    setForm({ fullName: user.fullName || '', email: user.email || '', phone: user.phone || '', password: '', status: user.status || 'active' });
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      const payloadBody = editing && !form.password ? Object.fromEntries(Object.entries(form).filter(([key]) => key !== 'password')) : form;
      const payload = editing ? await api.put(`/admin/users/${editing.id}`, payloadBody, { auth: true }) : await api.post('/admin/users', form, { auth: true });
      notify(payload.message);
      reset();
      reload();
    } catch (error) { notify(error.message, 'error'); }
  };
  const toggle = async (user) => { try { const payload = await api.put(`/admin/users/${user.id}/status`, { status: user.status === 'active' ? 'blocked' : 'active' }, { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  const remove = async (user) => {
    if (!confirm(`Xóa khách hàng ${user.email}?`)) return;
    try {
      const payload = await api.delete(`/admin/users/${user.id}`, { auth: true });
      notify(payload.message);
      reload();
    } catch (error) { notify(error.message, 'error'); }
  };
  return <><section className="admin-panel"><div className="admin-panel__head"><div><h2>Khách hàng</h2><p>{data.length} khách hàng.</p></div><button className="button button--soft" type="button" onClick={create}><Plus size={16} /> Thêm khách</button></div><div className="admin-data-table admin-users-table"><div className="admin-table-head"><span>Họ tên</span><span>Email</span><span>Điện thoại</span><span>Trạng thái</span><span>Thao tác</span></div>{data.map((user) => <article key={user.id}><strong>{user.fullName}</strong><span>{user.email}</span><span>{user.phone || '-'}</span><b className={user.status === 'active' ? 'admin-state is-on' : 'admin-state'}>{user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</b><AdminActionMenu items={[{ label: 'Xem thông tin', icon: Info, onClick: () => view(user) }, { label: 'Sửa', onClick: () => edit(user) }, { label: user.status === 'active' ? 'Khóa' : 'Mở khóa', onClick: () => toggle(user) }, { label: 'Xóa', danger: true, onClick: () => remove(user) }]} /></article>)}</div></section>{viewing && <AdminInfoModal title={viewing.fullName || viewing.email} description="Thông tin khách hàng" onClose={() => setViewing(null)}><InfoItem label="Họ tên" value={viewing.fullName} /><InfoItem label="Email" value={viewing.email} /><InfoItem label="Điện thoại" value={viewing.phone} /><InfoItem label="Trạng thái" value={viewing.status === 'active' ? 'Hoạt động' : 'Đã khóa'} /><InfoItem label="Ngày tạo" value={viewing.createdAt ? new Date(viewing.createdAt).toLocaleString('vi-VN') : '-'} /><InfoItem label="ID khách hàng" value={viewing.id} /></AdminInfoModal>}{formOpen && <AdminCrudModal title={editing ? 'Sửa khách hàng' : 'Thêm khách hàng'} description={editing ? `Đang sửa: ${editing.fullName}` : 'Tạo tài khoản khách hàng mới.'} submitLabel={editing ? 'Lưu khách hàng' : 'Thêm khách hàng'} onClose={reset} onSubmit={submit}><Field label="Họ tên"><input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field><Field label="Email"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Điện thoại"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field><Field label={editing ? 'Mật khẩu mới (bỏ trống nếu không đổi)' : 'Mật khẩu'}><input required={!editing} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field><Field label="Trạng thái"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">active</option><option value="blocked">blocked</option></select></Field></AdminCrudModal>}</>;
}

function CouponsAdmin({ data, reload, notify }) {
  const initial = { code: '', description: '', discountType: 'PERCENTAGE', discountValue: 10, minimumOrderValue: 0, maximumDiscount: 100000, usageLimit: 100, usageLimitPerUser: 1, startDate: '', endDate: '', isActive: true };
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const reset = () => { setEditing(null); setViewing(null); setFormOpen(false); setForm(initial); };
  const create = () => { setEditing(null); setViewing(null); setForm(initial); setFormOpen(true); };
  const view = (item) => { setViewing(item); setEditing(null); setFormOpen(false); };
  const edit = (item) => {
    setEditing(item);
    setViewing(null);
    setFormOpen(true);
    setForm({
      code: item.code || '',
      description: item.description || '',
      discountType: item.discountType || 'PERCENTAGE',
      discountValue: item.discountValue || 0,
      minimumOrderValue: item.minimumOrderValue || 0,
      maximumDiscount: item.maximumDiscount || 0,
      usageLimit: item.usageLimit || 0,
      usageLimitPerUser: item.usageLimitPerUser || 1,
      startDate: item.startDate ? String(item.startDate).slice(0, 10) : '',
      endDate: item.endDate ? String(item.endDate).slice(0, 10) : '',
      isActive: item.isActive !== false,
    });
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      const payloadBody = { ...form, startDate: form.startDate || null, endDate: form.endDate || null };
      const payload = editing ? await api.put(`/admin/coupons/${editing.id}`, payloadBody, { auth: true }) : await api.post('/admin/coupons', payloadBody, { auth: true });
      notify(payload.message);
      reset();
      reload();
    } catch (error) { notify(error.message, 'error'); }
  };
  const remove = async (item) => {
    if (!confirm(`Xóa mã ${item.code}?`)) return;
    try {
      const payload = await api.delete(`/admin/coupons/${item.id}`, { auth: true });
      notify(payload.message);
      reload();
    } catch (error) { notify(error.message, 'error'); }
  };
  const toggle = async (item) => {
    try {
      const payload = await api.put(`/admin/coupons/${item.id}`, { isActive: !item.isActive }, { auth: true });
      notify(payload.message);
      reload();
    } catch (error) { notify(error.message, 'error'); }
  };
  return <><section className="admin-panel"><div className="admin-panel__head"><div><h2>Mã giảm giá</h2><p>Xem, tạo và kiểm soát trạng thái voucher.</p></div><button className="button button--soft" type="button" onClick={create}><Plus size={16} /> Tạo mã</button></div><div className="admin-simple-list admin-crud-list">{data.map((item) => <article key={item.id}><div><strong>{item.code}</strong><small>{item.description || 'Không có mô tả'}</small></div><b>{item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : formatCurrency(item.discountValue)}</b><span className={item.isActive ? 'admin-state is-on' : 'admin-state'}>{item.isActive ? 'Đang bật' : 'Đã tắt'}</span><AdminActionMenu items={[{ label: 'Xem thông tin', icon: Info, onClick: () => view(item) }, { label: 'Sửa', onClick: () => edit(item) }, { label: item.isActive ? 'Tắt' : 'Bật', onClick: () => toggle(item) }, { label: 'Xóa', danger: true, onClick: () => remove(item) }]} /></article>)}</div></section>{viewing && <AdminInfoModal title={viewing.code} description={viewing.description || 'Mã giảm giá'} onClose={() => setViewing(null)}><InfoItem label="Loại giảm" value={viewing.discountType === 'PERCENTAGE' ? 'Phần trăm' : 'Số tiền cố định'} /><InfoItem label="Giá trị" value={viewing.discountType === 'PERCENTAGE' ? `${viewing.discountValue}%` : formatCurrency(viewing.discountValue)} /><InfoItem label="Đơn tối thiểu" value={formatCurrency(viewing.minimumOrderValue)} /><InfoItem label="Giảm tối đa" value={formatCurrency(viewing.maximumDiscount)} /><InfoItem label="Tổng lượt dùng" value={viewing.usageLimit} /><InfoItem label="Mỗi khách tối đa" value={viewing.usageLimitPerUser} /><InfoItem label="Ngày bắt đầu" value={viewing.startDate ? new Date(viewing.startDate).toLocaleDateString('vi-VN') : '-'} /><InfoItem label="Ngày kết thúc" value={viewing.endDate ? new Date(viewing.endDate).toLocaleDateString('vi-VN') : '-'} /><InfoItem label="Trạng thái" value={viewing.isActive ? 'Đang bật' : 'Đã tắt'} /></AdminInfoModal>}{formOpen && <AdminCrudModal title={editing ? `Sửa ${editing.code}` : 'Tạo mã'} description={editing ? 'Cập nhật điều kiện áp dụng.' : 'Tạo mã khuyến mãi mới.'} submitLabel={editing ? 'Lưu mã' : 'Tạo mã'} onClose={reset} onSubmit={submit}><Field label="Mã"><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field><Field label="Mô tả"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label="Loại giảm"><select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}><option value="PERCENTAGE">Phần trăm</option><option value="FIXED_AMOUNT">Số tiền cố định</option></select></Field><div className="admin-form-row"><Field label="Giá trị"><input type="number" min="0" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} /></Field><Field label="Giảm tối đa"><input type="number" min="0" value={form.maximumDiscount} onChange={(e) => setForm({ ...form, maximumDiscount: e.target.value })} /></Field></div><div className="admin-form-row"><Field label="Đơn tối thiểu"><input type="number" min="0" value={form.minimumOrderValue} onChange={(e) => setForm({ ...form, minimumOrderValue: e.target.value })} /></Field><Field label="Tổng lượt dùng"><input type="number" min="0" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} /></Field></div><div className="admin-form-row"><Field label="Mỗi khách tối đa"><input type="number" min="1" value={form.usageLimitPerUser} onChange={(e) => setForm({ ...form, usageLimitPerUser: e.target.value })} /></Field><Field label="Ngày bắt đầu"><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field></div><Field label="Ngày kết thúc"><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field><label className="check-row"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Đang bật</label></AdminCrudModal>}</>;
}

function ReviewsAdmin({ data, reload, notify, orders, refreshBase }) {
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const reviewTargets = useMemo(() => (orders || []).flatMap((order) => (order.items || []).map((item) => ({ order, item }))).filter(({ item }) => !item.review), [orders]);
  const initial = { orderItemId: reviewTargets[0]?.item?.id || '', rating: 5, content: '', isVisible: true };
  const [form, setForm] = useState(initial);
  const [formOpen, setFormOpen] = useState(false);
  useEffect(() => { if (!editing && !form.orderItemId && reviewTargets[0]) setForm((current) => ({ ...current, orderItemId: reviewTargets[0].item.id })); }, [reviewTargets, editing]);
  const create = () => { setEditing(null); setViewing(null); setForm({ orderItemId: reviewTargets[0]?.item?.id || '', rating: 5, content: '', isVisible: true }); setFormOpen(true); };
  const view = (review) => { setViewing(review); setEditing(null); setFormOpen(false); };
  const edit = (review) => {
    setEditing(review);
    setViewing(null);
    setFormOpen(true);
    setForm({ orderItemId: review.orderItemId || '', rating: review.rating || 5, content: review.content || '', isVisible: review.isVisible !== false });
  };
  const reset = () => { setEditing(null); setViewing(null); setFormOpen(false); setForm({ orderItemId: reviewTargets[0]?.item?.id || '', rating: 5, content: '', isVisible: true }); };
  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = editing ? await api.put(`/admin/reviews/${editing.id}`, form, { auth: true }) : await api.post('/admin/reviews', form, { auth: true });
      notify(payload.message);
      reset();
      await Promise.all([reload(), refreshBase?.()]);
    } catch (error) { notify(error.message, 'error'); }
  };
  const toggle = async (review) => { try { const payload = await api.put(`/admin/reviews/${review.id}/status`, { isVisible: !review.isVisible }, { auth: true }); notify(payload.message); await Promise.all([reload(), refreshBase?.()]); } catch (error) { notify(error.message, 'error'); } };
  const remove = async (review) => {
    if (!confirm(`Xóa đánh giá của ${review.user?.fullName || review.user?.email || 'khách hàng'}?`)) return;
    try {
      const payload = await api.delete(`/admin/reviews/${review.id}`, { auth: true });
      notify(payload.message);
      await Promise.all([reload(), refreshBase?.()]);
      if (editing?.id === review.id) reset();
    } catch (error) { notify(error.message, 'error'); }
  };
  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2>Đánh giá khách hàng</h2>
            <p>{data.length} đánh giá đang được quản lý.</p>
          </div>
          <button className="button button--soft" type="button" onClick={create} disabled={!reviewTargets.length}><Plus size={16} /> Thêm đánh giá</button>
        </div>
        <div className="admin-review-list admin-review-list--cards">
          {data.map((review) => {
            const customerName = review.user?.fullName || review.user?.email || 'Khách hàng';
            const productName = review.Product?.name || review.product?.name || 'Sản phẩm';
            return (
              <article className="admin-review-card" key={review.id}>
                <div className="admin-review-card__person">
                  <span className="admin-review-avatar">{initialsOf(customerName)}</span>
                  <div>
                    <strong>{customerName}</strong>
                    <small>{productName}</small>
                    <span className={review.isVisible ? 'admin-state is-on' : 'admin-state'}>{review.isVisible ? 'Hiển thị' : 'Đã ẩn'}</span>
                  </div>
                </div>
                <p className="admin-review-bubble">{review.content}</p>
                <div className="admin-review-card__side">
                  <span className="admin-review-stars">{'★'.repeat(review.rating || 0)}</span>
                  <AdminActionMenu items={[
                    { label: 'Xem thông tin', icon: Info, onClick: () => view(review) },
                    { label: 'Sửa', onClick: () => edit(review) },
                    { label: review.isVisible ? 'Ẩn' : 'Hiện', onClick: () => toggle(review) },
                    { label: 'Xóa', danger: true, onClick: () => remove(review) },
                  ]} />
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {viewing && <AdminInfoModal title={viewing.user?.fullName || viewing.user?.email || 'Khách hàng'} description={viewing.Product?.name || viewing.product?.name || 'Sản phẩm'} onClose={() => setViewing(null)}><InfoItem label="Số sao" value={`${viewing.rating || 0} sao`} /><InfoItem label="Trạng thái" value={viewing.isVisible ? 'Đang hiển thị' : 'Đã ẩn'} /><InfoItem label="Khách hàng" value={viewing.user?.fullName || viewing.user?.email} /><InfoItem label="Sản phẩm" value={viewing.Product?.name || viewing.product?.name} /><InfoItem wide label="Nội dung đánh giá" value={viewing.content} /></AdminInfoModal>}
      {formOpen && <AdminCrudModal title={editing ? 'Sửa đánh giá' : 'Thêm đánh giá'} description={editing ? `${editing.user?.fullName || editing.user?.email || 'Khách hàng'} · ${editing.Product?.name || editing.product?.name || 'Sản phẩm'}` : 'Chỉ hiện các sản phẩm trong đơn chưa có đánh giá.'} submitLabel={editing ? 'Lưu đánh giá' : 'Thêm đánh giá'} onClose={reset} onSubmit={submit}>{!editing && <Field label="Sản phẩm đã mua"><select required value={form.orderItemId} onChange={(e) => setForm({ ...form, orderItemId: e.target.value })}>{reviewTargets.map(({ order, item }) => <option key={item.id} value={item.id}>{order.customerName || order.customerEmail} · {item.productName} · {order.orderCode}</option>)}</select></Field>}<Field label="Số sao"><select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} sao</option>)}</select></Field><Field label="Nội dung"><textarea required rows="6" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Nhập nội dung đánh giá..." /></Field><label className="check-row"><input type="checkbox" checked={form.isVisible} onChange={(e) => setForm({ ...form, isVisible: e.target.checked })} /> Hiển thị đánh giá</label></AdminCrudModal>}
    </>
  );
}

function SupportAdmin({ data, reload, notify }) {
  const resolve = async (item) => { const reply = prompt('Nhập phản hồi cho khách hàng:', item.adminReply || 'Đã tiếp nhận và xử lý yêu cầu của bạn.'); if (reply === null) return; try { const payload = await api.put(`/admin/support-requests/${item.id}`, { status: 'resolved', adminReply: reply }, { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  return <section className="admin-panel"><div className="admin-panel__head"><h2>Yêu cầu hỗ trợ</h2></div><div className="admin-review-list">{data.map((item) => <article key={item.id}><div><strong>{item.subject}</strong><span>{item.status}</span></div><small>{item.user?.fullName} · {item.order?.orderCode || 'Không gắn đơn'}</small><p>{item.message}</p>{item.adminReply && <blockquote>{item.adminReply}</blockquote>}<button onClick={() => resolve(item)}>Phản hồi & hoàn tất</button></article>)}</div></section>;
}

function BannersAdmin({ data, reload, notify }) {
  const emptyForm = { title: '', subtitle: '', imageUrl: '/assets/hero.jpg', linkUrl: '/products', sortOrder: 0, isActive: true };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const reset = () => { setEditing(null); setViewing(null); setFormOpen(false); setForm(emptyForm); };
  const create = () => { setEditing(null); setViewing(null); setForm(emptyForm); setFormOpen(true); };
  const view = (item) => { setViewing(item); setEditing(null); setFormOpen(false); };
  const buildPayload = (source) => ({
    title: source.title,
    subtitle: source.subtitle,
    imageUrl: source.imageUrl,
    linkUrl: source.linkUrl,
    sortOrder: Number(source.sortOrder || 0),
    isActive: Boolean(source.isActive),
  });
  const edit = (item) => {
    setEditing(item);
    setViewing(null);
    setFormOpen(true);
    setForm({ title: item.title || '', subtitle: item.subtitle || '', imageUrl: item.imageUrl || '', linkUrl: item.linkUrl || '', sortOrder: item.sortOrder || 0, isActive: item.isActive !== false });
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = editing
        ? await api.put(`/admin/banners/${editing.id}`, buildPayload(form), { auth: true })
        : await api.post('/admin/banners', buildPayload(form), { auth: true });
      notify(payload.message);
      reset();
      reload();
    } catch (error) { notify(error.message, 'error'); }
  };
  const toggle = async (item) => {
    try {
      const payload = await api.put(`/admin/banners/${item.id}`, { isActive: !item.isActive }, { auth: true });
      notify(payload.message);
      if (editing?.id === item.id) setForm((current) => ({ ...current, isActive: !item.isActive }));
      reload();
    } catch (error) { notify(error.message, 'error'); }
  };
  const remove = async (item) => {
    if (!confirm(`Xóa banner ${item.title}?`)) return;
    try {
      const payload = await api.delete(`/admin/banners/${item.id}`, { auth: true });
      notify(payload.message);
      if (editing?.id === item.id) reset();
      reload();
    } catch (error) { notify(error.message, 'error'); }
  };
  return <><section className="admin-panel"><div className="admin-panel__head"><div><h2>Banner & nội dung</h2><p>{data.length} banner đang được quản lý.</p></div><button className="button button--soft" type="button" onClick={create}><Plus size={16} /> Thêm banner</button></div><div className="admin-simple-list admin-crud-list admin-banner-list">{data.map((item) => <article key={item.id}><b>#{item.sortOrder}</b><img src={assetUrl(item.imageUrl)} alt="" /><div><strong>{item.title}</strong></div><span className={item.isActive ? 'admin-state is-on' : 'admin-state'}>{item.isActive ? 'Hiển thị' : 'Đã ẩn'}</span><AdminActionMenu items={[{ label: 'Xem thông tin', icon: Info, onClick: () => view(item) }, { label: 'Sửa', onClick: () => edit(item) }, { label: item.isActive ? 'Ẩn' : 'Hiện', onClick: () => toggle(item) }, { label: 'Xóa', danger: true, onClick: () => remove(item) }]} /></article>)}</div></section>{viewing && <AdminInfoModal title={viewing.title} description="Banner & nội dung" onClose={() => setViewing(null)}><div className="admin-info-preview"><img src={assetUrl(viewing.imageUrl)} alt="" /></div><InfoItem label="Liên kết" value={viewing.linkUrl} /><InfoItem label="Thứ tự" value={`#${viewing.sortOrder}`} /><InfoItem label="Trạng thái" value={viewing.isActive ? 'Hiển thị' : 'Đã ẩn'} /><InfoItem wide label="Đường dẫn ảnh" value={viewing.imageUrl} />{viewing.subtitle && <InfoItem wide label="Mô tả" value={viewing.subtitle} />}</AdminInfoModal>}{formOpen && <AdminCrudModal title={editing ? 'Sửa banner' : 'Thêm banner'} description={editing ? `Đang sửa: ${editing.title}` : 'Quản lý ảnh, liên kết và thứ tự hiển thị.'} submitLabel={editing ? 'Lưu banner' : 'Thêm banner'} onClose={reset} onSubmit={submit}><Field label="Tiêu đề"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Mô tả"><textarea value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field><Field label="Đường dẫn ảnh"><input required value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></Field><Field label="Liên kết"><input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} /></Field><Field label="Thứ tự"><input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field><label className="check-row"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Hiển thị banner</label></AdminCrudModal>}</>;
}

function SettingsAdmin({ data, notify, reload }) {
  const [form, setForm] = useState({});
  const hiddenKeys = new Set(['bank_name', 'bank_account_name', 'bank_account_number', 'bank_qr_url']);
  useEffect(() => { setForm(Object.fromEntries(Object.entries(data || {}).filter(([key]) => !hiddenKeys.has(key)).map(([key, item]) => [key, item.value]))); }, [data]);
  const submit = async (event) => { event.preventDefault(); try { const payload = await api.put('/admin/settings', Object.fromEntries(Object.entries(form).map(([key, value]) => [key, { value, type: data[key]?.type || 'text' }])), { auth: true }); notify(payload.message); reload(); } catch (error) { notify(error.message, 'error'); } };
  return <section className="admin-panel"><div className="admin-panel__head"><div><h2>Cài đặt website</h2><p></p></div></div><form className="admin-form settings-form" onSubmit={submit}>{Object.entries(form).map(([key, value]) => <Field key={key} label={key.replaceAll('_', ' ')}><textarea rows={String(value).length > 80 ? 4 : 1} value={value} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>)}<button className="button button--primary">Lưu cài đặt</button></form></section>;
}

function Field({ label, children }) {
  if (label === 'Badge') {
    const value = children.props.value;
    const onChange = children.props.onChange;
    const options = ['Bán chạy', 'Hot', 'Mới'];
    return <fieldset className="form-field badge-selector"><span>Phân loại sản phẩm</span><div className="badge-selector__options">{options.map((option) => <label className="check-row" key={option}><input type="checkbox" checked={value === option} onChange={() => onChange({ target: { value: option } })} /> {option === 'Hot' ? 'HOT' : option}</label>)}<label className="check-row badge-selector__none"><input type="checkbox" checked={!value} onChange={() => onChange({ target: { value: '' } })} /> Không gắn nhãn</label></div></fieldset>;
  }
  return <label className="form-field"><span>{label}</span>{children}</label>;
}
