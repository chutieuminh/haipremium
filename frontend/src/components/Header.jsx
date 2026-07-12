import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Heart, Menu, Search, ShoppingBag, UserRound, X, ChevronDown, Headphones, LogOut, Shield,
} from 'lucide-react';
import Brand from './Brand';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';

const navItems = [
  ['/', 'Trang chủ'],
  ['/products', 'Sản phẩm'],
  ['/products?category=ai', 'AI & công nghệ'],
  ['/products?sort=discount', 'Khuyến mãi'],
  ['/guide', 'Hướng dẫn'],
];

export default function Header() {
  const { cartCount, favorites, setCartOpen, notify } = useStore();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [userMenu, setUserMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); setUserMenu(false); }, [location.pathname, location.search]);

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
          <span><Headphones size={14} /> Hỗ trợ nhanh: 08:00 – 23:00 mỗi ngày</span>
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
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm ChatGPT, Canva, Microsoft 365..." aria-label="Tìm kiếm sản phẩm" />
            <button type="submit">Tìm kiếm</button>
          </form>

          <div className="header-actions">
            <Link className="header-action desktop-only" to="/products?favorites=true">
              <span className="header-action__icon"><Heart size={21} /><b>{favorites.length}</b></span>
              <span><small>Đã lưu</small><strong>Yêu thích</strong></span>
            </Link>
            <button className="header-action" type="button" onClick={() => setCartOpen(true)}>
              <span className="header-action__icon"><ShoppingBag size={21} /><b>{cartCount}</b></span>
              <span className="desktop-only"><small>Giỏ hàng</small><strong>Sản phẩm</strong></span>
            </button>
            {user ? (
              <div className="header-user-wrap desktop-only">
                <button className="header-action" type="button" onClick={() => setUserMenu((value) => !value)}>
                  <span className="header-action__icon"><UserRound size={21} /></span>
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
                <span className="header-action__icon"><UserRound size={21} /></span>
                <span><small>Xin chào</small><strong>Đăng nhập</strong></span>
              </Link>
            )}
          </div>
        </div>

        <div className="header__nav desktop-only">
          <div className="container nav-row">
            <button className="category-trigger" onClick={() => navigate('/products')}><Menu size={18} /> Danh mục sản phẩm <ChevronDown size={16} /></button>
            <nav className="nav-links">
              {navItems.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
            </nav>
            <div className="nav-promo"><span>🔥</span> Giảm đến 60% hôm nay</div>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileOpen(false)}>
          <aside className="mobile-menu" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-menu__header"><Brand compact /><button className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><X /></button></div>
            <form className="mobile-search" onSubmit={submitSearch}><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." /></form>
            <nav className="mobile-nav">
              {navItems.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
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
