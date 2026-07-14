import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../data/products';
import { api, assetUrl } from '../api/client';
import { ZALO_CONTACT_URL } from '../constants/contact';

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, updateQuantity, removeFromCart, cartTotal, setCart, notify } = useStore();
  const { user } = useAuth();
  const [creatingOrder, setCreatingOrder] = useState(false);
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
      }, { auth: true });
      setCart([]);
      setCartOpen(false);
      notify(`Đã tạo đơn ${payload.data.orderCode}. Đang mở Zalo để thanh toán.`);
      window.open(ZALO_CONTACT_URL, '_blank', 'noopener,noreferrer');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setCreatingOrder(false);
    }
  };
  if (!cartOpen) return null;
  return (
    <div className="drawer-overlay" onClick={() => setCartOpen(false)}>
      <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="cart-drawer__head">
          <div>
            <small>Giỏ hàng của bạn</small>
            <h3>{cart.length} sản phẩm</h3>
          </div>
          <button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Đóng giỏ hàng"><X /></button>
        </div>

        <div className="cart-drawer__body">
          {cart.length === 0 ? (
            <div className="empty-state compact">
              <span className="empty-state__icon"><ShoppingBag /></span>
              <h3>Giỏ hàng đang trống</h3>
              <p>Khám phá các gói tài khoản phù hợp với nhu cầu của bạn.</p>
              <Link className="button button--primary" to="/products" onClick={() => setCartOpen(false)}>Xem sản phẩm</Link>
            </div>
          ) : cart.map((item) => (
            <article className="mini-cart-item" key={item.key}>
              <div className="product-logo product-logo--small"><img src={assetUrl(item.logo)} alt={item.name} /></div>
              <div className="mini-cart-item__info">
                <Link to={`/products/${item.slug}`} onClick={() => setCartOpen(false)}>{item.name}</Link>
                <small>{item.packageLabel} · {item.accountType}</small>
                <strong>{formatCurrency(item.price)}</strong>
                <div className="quantity-control quantity-control--small">
                  <button onClick={() => updateQuantity(item.key, item.quantity - 1)}><Minus size={13} /></button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.key, item.quantity + 1)}><Plus size={13} /></button>
                </div>
              </div>
              <button className="remove-button" onClick={() => removeFromCart(item.key)} aria-label="Xóa sản phẩm"><Trash2 size={17} /></button>
            </article>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="cart-drawer__foot">
            <div className="cart-summary-row"><span>Tạm tính</span><strong>{formatCurrency(cartTotal)}</strong></div>
            <p></p>
            <Link className="button button--primary button--block" to="/cart" onClick={() => setCartOpen(false)}>Xem giỏ hàng</Link>
            <button className="button button--ghost button--block" type="button" onClick={createOrderAndContact} disabled={creatingOrder}>{creatingOrder ? 'Đang tạo đơn...' : 'Liên hệ thanh toán'}</button>
          </div>
        )}
      </aside>
    </div>
  );
}
