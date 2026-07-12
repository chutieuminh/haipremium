import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useCatalog } from '../context/CatalogContext';
import { useStore } from '../context/StoreContext';

const PAGE_SIZE = 12;

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { favorites } = useStore();
  const { categories, products, loading, error } = useCatalog();
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'featured';
  const onlyFavorites = searchParams.get('favorites') === 'true';
  const maxPrice = Number(searchParams.get('maxPrice') || 500000);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || value === 'featured' || value === false) next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = products.filter((product) => {
      const matchQuery = !normalized || `${product.name} ${product.shortDescription}`.toLowerCase().includes(normalized);
      const matchCategory = category === 'all' || product.categoryId === category;
      const matchPrice = product.price <= maxPrice;
      const matchFavorite = !onlyFavorites || favorites.includes(product.id);
      return matchQuery && matchCategory && matchPrice && matchFavorite;
    });

    return [...list].sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'popular') return b.soldCount - a.soldCount;
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'discount') return (b.originalPrice - b.price) - (a.originalPrice - a.price);
      return Number(b.featured) - Number(a.featured) || b.soldCount - a.soldCount;
    });
  }, [query, category, sort, onlyFavorites, favorites, maxPrice]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setSearchParams({});
    setPage(1);
  };

  return (
    <div className="page page--muted">
      <section className="catalog-hero">
        <div className="container">
          <span className="eyebrow">Kho tài khoản premium</span>
          <h1>Chọn công cụ phù hợp với bạn</h1>
          <p>Hơn 40 sản phẩm cho học tập, AI, sáng tạo và công việc — nhiều thời hạn, giá minh bạch.</p>
          <div className="catalog-search">
            <Search size={20} />
            <input
              value={query}
              onChange={(event) => setParam('q', event.target.value)}
              placeholder="Bạn đang tìm sản phẩm nào?"
            />
            {query && <button onClick={() => setParam('q', '')} aria-label="Xóa tìm kiếm"><X size={18} /></button>}
          </div>
        </div>
      </section>

      <section className="section catalog-section">
        <div className="container catalog-layout">
          <button className="button button--soft filter-mobile-toggle mobile-only" onClick={() => setFilterOpen(true)}>
            <Filter size={18} /> Bộ lọc
          </button>

          <aside className={`catalog-filter ${filterOpen ? 'is-open' : ''}`}>
            <div className="catalog-filter__mobile-head mobile-only">
              <strong>Bộ lọc sản phẩm</strong>
              <button className="icon-button" onClick={() => setFilterOpen(false)}><X /></button>
            </div>

            <div className="filter-block">
              <h3>Danh mục</h3>
              <label className="radio-row">
                <input type="radio" name="category" checked={category === 'all'} onChange={() => setParam('category', 'all')} />
                <span>Tất cả sản phẩm</span><b>{products.length}</b>
              </label>
              {categories.map((item) => (
                <label className="radio-row" key={item.id}>
                  <input type="radio" name="category" checked={category === (item.code || item.id)} onChange={() => setParam('category', item.code || item.id)} />
                  <span>{item.name}</span><b>{products.filter((product) => product.categoryId === (item.code || item.id)).length}</b>
                </label>
              ))}
            </div>

            <div className="filter-block">
              <h3>Khoảng giá</h3>
              <input
                className="price-range"
                type="range"
                min="50000"
                max="500000"
                step="10000"
                value={maxPrice}
                onChange={(event) => setParam('maxPrice', event.target.value)}
              />
              <div className="range-labels"><span>50.000đ</span><strong>{maxPrice.toLocaleString('vi-VN')}đ</strong></div>
            </div>

            <div className="filter-block">
              <h3>Lựa chọn khác</h3>
              <label className="check-row">
                <input type="checkbox" checked={onlyFavorites} onChange={(event) => setParam('favorites', event.target.checked ? 'true' : false)} />
                <span>Chỉ sản phẩm yêu thích</span>
              </label>
              <label className="check-row"><input type="checkbox" defaultChecked /><span>Còn hàng</span></label>
              <label className="check-row"><input type="checkbox" /><span>Đang giảm giá</span></label>
            </div>

            <button className="button button--ghost button--block" onClick={clearFilters}>Xóa bộ lọc</button>
          </aside>

          {filterOpen && <div className="filter-backdrop mobile-only" onClick={() => setFilterOpen(false)} />}

          <div className="catalog-main">
            {error && <div className="api-warning">{error}</div>}
            <div className="catalog-toolbar">
              <div>
                <h2>{onlyFavorites ? 'Sản phẩm yêu thích' : category === 'all' ? 'Tất cả sản phẩm' : categories.find((item) => (item.code || item.id) === category)?.name}</h2>
                <p>Tìm thấy <strong>{filtered.length}</strong> sản phẩm phù hợp</p>
              </div>
              <label className="sort-select">
                <SlidersHorizontal size={17} />
                <select value={sort} onChange={(event) => setParam('sort', event.target.value)}>
                  <option value="featured">Nổi bật</option>
                  <option value="popular">Bán chạy nhất</option>
                  <option value="price-asc">Giá thấp đến cao</option>
                  <option value="price-desc">Giá cao đến thấp</option>
                  <option value="rating">Đánh giá cao nhất</option>
                  <option value="discount">Giảm nhiều nhất</option>
                </select>
                <ChevronDown size={16} />
              </label>
            </div>

            {loading ? <div className="loading-panel">Đang tải sản phẩm từ MySQL...</div> : visible.length > 0 ? (
              <>
                <div className="product-grid product-grid--catalog">
                  {visible.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
                {pageCount > 1 && (
                  <div className="pagination">
                    <button disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button>
                    {Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => (
                      <button key={value} className={page === value ? 'active' : ''} onClick={() => setPage(value)}>{value}</button>
                    ))}
                    <button disabled={page === pageCount} onClick={() => setPage(page + 1)}>Sau</button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state catalog-empty">
                <span className="empty-state__icon"><Search /></span>
                <h3>Không tìm thấy sản phẩm phù hợp</h3>
                <p>Thử thay đổi từ khóa, danh mục hoặc khoảng giá.</p>
                <button className="button button--primary" onClick={clearFilters}>Xóa bộ lọc</button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
