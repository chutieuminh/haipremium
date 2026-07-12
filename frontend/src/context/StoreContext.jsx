import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const StoreContext = createContext(null);

const readStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export function StoreProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState(() => readStorage('hp_cart', []));
  const [favorites, setFavorites] = useState(() => readStorage('hp_favorites', []));
  const [toast, setToast] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!user) localStorage.setItem('hp_cart', JSON.stringify(cart));
  }, [cart, user]);
  useEffect(() => {
    if (!user) localStorage.setItem('hp_favorites', JSON.stringify(favorites));
  }, [favorites, user]);

  const notify = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    window.clearTimeout(window.__hpToastTimer);
    window.__hpToastTimer = window.setTimeout(() => setToast(null), 3000);
  };

  const refreshRemoteState = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const localCart = readStorage('hp_cart', []);
      if (localCart.length) {
        await api.post('/cart/sync', { items: localCart.map((item) => ({ packageId: item.packageId, quantity: item.quantity })) }, { auth: true });
        localStorage.removeItem('hp_cart');
      }
      const [cartPayload, favoritePayload] = await Promise.all([
        api.get('/cart', { auth: true }),
        api.get('/favorites', { auth: true }),
      ]);
      setCart(cartPayload.data);
      setFavorites(favoritePayload.data.map((item) => Number(item.id)));
    } catch (error) {
      notify(error.message || 'Không thể đồng bộ dữ liệu tài khoản.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user) refreshRemoteState();
    else {
      setCart(readStorage('hp_cart', []));
      setFavorites(readStorage('hp_favorites', []));
    }
  }, [user?.id, authLoading]);

  const addToCart = async (product, selectedPackage = product.packages?.[0], quantity = 1, openDrawer = true) => {
    if (!selectedPackage) {
      notify('Sản phẩm chưa có gói khả dụng.', 'error');
      return;
    }
    if (user) {
      try {
        const payload = await api.post('/cart/items', { packageId: selectedPackage.id, quantity }, { auth: true });
        setCart(payload.data);
        notify(`Đã thêm ${product.name} vào giỏ hàng`);
      } catch (error) {
        notify(error.message, 'error');
        return;
      }
    } else {
      const key = `${product.id}-${selectedPackage.id}`;
      setCart((current) => {
        const existing = current.find((item) => item.key === key);
        if (existing) {
          return current.map((item) => item.key === key
            ? { ...item, quantity: Math.min(item.quantity + quantity, selectedPackage.stock || 99) }
            : item);
        }
        return [...current, {
          key,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          logo: product.logo,
          packageId: selectedPackage.id,
          packageLabel: selectedPackage.label || selectedPackage.name || 'Gói mặc định',
          accountType: selectedPackage.accountType || 'Tài khoản riêng',
          price: selectedPackage.price ?? selectedPackage.salePrice ?? product.price,
          quantity,
          stock: selectedPackage.stock || product.stock,
        }];
      });
      notify(`Đã thêm ${product.name} vào giỏ hàng`);
    }
    if (openDrawer) setCartOpen(true);
  };

  const updateQuantity = async (key, quantity) => {
    const item = cart.find((entry) => entry.key === key);
    if (!item) return;
    const nextQuantity = Math.max(1, Math.min(Number(quantity) || 1, item.stock || 99));
    if (user) {
      try {
        const payload = await api.put(`/cart/items/${item.id}`, { quantity: nextQuantity }, { auth: true });
        setCart(payload.data);
      } catch (error) { notify(error.message, 'error'); }
    } else {
      setCart((current) => current.map((entry) => entry.key === key ? { ...entry, quantity: nextQuantity } : entry));
    }
  };

  const removeFromCart = async (key) => {
    const item = cart.find((entry) => entry.key === key);
    if (!item) return;
    if (user) {
      try {
        const payload = await api.delete(`/cart/items/${item.id}`, { auth: true });
        setCart(payload.data);
      } catch (error) { notify(error.message, 'error'); return; }
    } else {
      setCart((current) => current.filter((entry) => entry.key !== key));
    }
    notify('Đã xóa sản phẩm khỏi giỏ hàng', 'info');
  };

  const clearCart = async () => {
    if (user) {
      try {
        const payload = await api.delete('/cart', { auth: true });
        setCart(payload.data);
      } catch (error) { notify(error.message, 'error'); }
    } else setCart([]);
  };

  const toggleFavorite = async (productId) => {
    const numericId = Number(productId);
    const exists = favorites.includes(numericId);
    if (user) {
      try {
        if (exists) await api.delete(`/favorites/${numericId}`, { auth: true });
        else await api.post(`/favorites/${numericId}`, undefined, { auth: true });
      } catch (error) {
        notify(error.message, 'error');
        return;
      }
    }
    setFavorites((current) => exists ? current.filter((id) => id !== numericId) : [...current, numericId]);
    notify(exists ? 'Đã bỏ khỏi danh sách yêu thích' : 'Đã thêm vào danh sách yêu thích', 'info');
  };

  const cartCount = cart.reduce((sum, item) => sum + Number(item.quantity), 0);
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

  const value = useMemo(() => ({
    cart, favorites, toast, cartOpen, syncing, setCartOpen, setCart,
    addToCart, updateQuantity, removeFromCart, clearCart, toggleFavorite,
    cartCount, cartTotal, notify, refreshRemoteState,
  }), [cart, favorites, toast, cartOpen, syncing, cartCount, cartTotal, user]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore phải được dùng bên trong StoreProvider');
  return context;
};
