import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { categories as fallbackCategories, products as fallbackProducts } from '../data/products';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [categoryPayload, productPayload] = await Promise.all([
        api.get('/categories'),
        api.get('/products?limit=100&sort=featured'),
      ]);
      setCategories(categoryPayload.data);
      setProducts(productPayload.data);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu từ máy chủ.');
      // Dữ liệu dự phòng chỉ giúp giao diện không trắng khi MySQL chưa chạy.
      setCategories(fallbackCategories.map((item) => ({ ...item, code: item.id })));
      setProducts(fallbackProducts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const value = useMemo(() => ({ categories, products, loading, error, reload }), [categories, products, loading, error]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog phải được dùng bên trong CatalogProvider');
  return context;
};
