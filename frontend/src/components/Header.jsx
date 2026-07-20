import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BookmarkCheck, CircleUserRound, Menu, Search, ShoppingBasket, UserRound, X, ChevronDown, Flame, Headphones, LogOut, Shield,
} from 'lucide-react';
import Brand from './Brand';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';

const navItems = [
  ['/', 'Trang chủ'],
  ['/products', 'Sản phẩm'],
  ['/premium-match', 'Chọn gói cho bạn'],
  ['/guide', 'Hướng dẫn'],
];

export default function Header() {
  const { cartCount, favorites, setCartOpen, notify } = useStore();
  const { user, logout } = useAuth();
  const { categories } = useCatalog();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [userMenu, setUserMenu] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isMobileNavActive = (to) => {
    const [path, queryString] = to.split('?');
    if (location.pathname !== path) return false;
    if (queryString) return location.search === `?${queryString}`;
    const params = new URLSearchParams(location.search);
    return path !== '/products' || (params.get('sort') !== 'discount' && params.get('favorites') !== 'true');
  };
  const mobileNavState = location.pathname === '/products'
    ? new URLSearchParams(location.search).get('favorites') === 'true'
      ? 'favorites'
      : 'products'
    : location.pathname.slice(1) || 'home';

  useEffect(() => { setMobileOpen(false); setUserMenu(false); setCategoryOpen(false); }, [location.pathname, location.search]);

  useEffect(() => {
    const closeCategory = (event) => {
      if (!categoryMenuRef.current?.contains(event.target)) setCategoryOpen(false);
    };
    document.addEventListener('pointerdown', closeCategory);
    return () => document.removeEventListener('pointerdown', closeCategory);
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    const value = search.trim();
    navigate(value ? `/products?q=${encodeURIComponent(value)}` : '/products');
  };

  const signOut = async () => {
    await logout();
    notify('Đã đăng xuất.', 'info');
    navigate('/');
  };

  return (
    <>
      <div className="topbar">
        <div className="container topbar__inner">
          <span><Headphones size={14} /> Hỗ trợ nhanh: 9:00 - 17:00 mỗi ngày</span>
          <div>
            <Link to="/guide">Chính sách bảo hành</Link>
            {user?.role === 'admin' && <><span className="topbar__divider" /><Link to="/admin">Trang quản trị</Link></>}
          </div>
        </div>
      </div>

      <header className="header">
        <div className="container header__main">
          <button className="icon-button mobile-only" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><Menu size={22} /></button>
          <Brand />
          <form className="header-search" onSubmit={submitSearch}>
            <Search size={19} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm ChatGPT, Canva,..." aria-label="Tìm kiếm sản phẩm" />
            <button type="submit">Tìm kiếm</button>
          </form>

          <div className="header-actions">
            <Link className="header-action desktop-only" to="/products?favorites=true">
              <span className="header-action__icon"><BookmarkCheck size={21} /><b>{favorites.length}</b></span>
              <span><small>Đã lưu</small><strong>Yêu thích</strong></span>
            </Link>
            <button className="header-action" type="button" onClick={() => setCartOpen(true)}>
              <span className="header-action__icon"><ShoppingBasket size={21} /><b>{cartCount}</b></span>
              <span className="desktop-only"><small>Giỏ hàng</small><strong>Sản phẩm</strong></span>
            </button>
            {user ? (
              <div className="header-user-wrap desktop-only">
                <button className="header-action" type="button" onClick={() => setUserMenu((value) => !value)}>
                  <span className="header-action__icon"><CircleUserRound size={21} /></span>
                  <span><small>Xin chào</small><strong>{user.fullName?.split(' ').slice(-1)[0]}</strong></span>
                  <ChevronDown size={15} />
                </button>
                {userMenu && (
                  <div className="header-user-menu">
                    <Link to={user.role === 'admin' ? '/admin' : '/account'}>{user.role === 'admin' ? <Shield size={16} /> : <UserRound size={16} />} {user.role === 'admin' ? 'Quản trị' : 'Tài khoản của tôi'}</Link>
                    <button onClick={signOut}><LogOut size={16} /> Đăng xuất</button>
                  </div>
                )}
              </div>
            ) : (
              <Link className="header-action desktop-only" to="/login">
                <span className="header-action__icon"><CircleUserRound size={21} /></span>
                <span><small>Xin chào</small><strong>Đăng nhập</strong></span>
              </Link>
            )}
          </div>
        </div>

        <div className="header__nav desktop-only">
          <div className="container nav-row">
            <div className={`category-menu ${categoryOpen ? 'is-open' : ''}`} ref={categoryMenuRef}>
              <button className="category-trigger" type="button" aria-expanded={categoryOpen} onClick={() => setCategoryOpen((value) => !value)}><Menu size={18} /> Danh mục sản phẩm <ChevronDown size={16} /></button>
              <div className="category-menu__dropdown">
                <Link to="/products" onClick={() => setCategoryOpen(false)}>Tất cả sản phẩm</Link>
                {categories.map((item) => <Link key={item.id || item.code} to={`/products?category=${item.code || item.id}`} onClick={() => setCategoryOpen(false)}>{item.name}</Link>)}
              </div>
            </div>
            <nav className="nav-links">
              {navItems.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
            </nav>
            <Link className="nav-promo" to="/products"><Flame size={18} fill="currentColor" strokeWidth={2.2} /> Giảm đến 50% hôm nay. Mua ngay!</Link>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileOpen(false)}>
          <aside className="mobile-menu" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-menu__header"><Brand compact /><button className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><X /></button></div>
            <form className="mobile-search" onSubmit={submitSearch}><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." /></form>
            <nav className={`mobile-nav mobile-nav--${mobileNavState}`}>
              {navItems.map(([to, label]) => <Link key={to} to={to} className={isMobileNavActive(to) ? 'is-active' : ''} aria-current={isMobileNavActive(to) ? 'page' : undefined}>{label}</Link>)}
              {user ? <Link to={user.role === 'admin' ? '/admin' : '/account'}>{user.role === 'admin' ? 'Trang quản trị' : 'Tài khoản của tôi'}</Link> : <Link to="/login">Đăng nhập / Đăng ký</Link>}
              <Link to="/products?favorites=true">Sản phẩm yêu thích ({favorites.length})</Link>
              {user && <button className="mobile-logout" onClick={signOut}>Đăng xuất</button>}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
