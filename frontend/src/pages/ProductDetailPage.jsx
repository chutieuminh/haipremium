import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, Check, ChevronRight, Clock3, Heart, Minus, Plus,
  RefreshCcw, ShieldCheck, ShoppingCart, Star, Zap,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SectionHeading from '../components/SectionHeading';
import { formatCurrency } from '../data/products';
import { useStore } from '../context/StoreContext';
import { useCatalog } from '../context/CatalogContext';
import { api, assetUrl } from '../api/client';
import { ZALO_CONTACT_URL } from '../constants/contact';

const tabs = ['Mô tả', 'Tính năng', 'Hướng dẫn sử dụng', 'Bảo hành', 'Đánh giá'];

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleFavorite, favorites, notify } = useStore();
  const { products } = useCatalog();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('Mô tả');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/products/${slug}`)
      .then((payload) => {
        setProduct(payload.data);
        setSelectedPackageId(payload.data.packages?.[0]?.id || null);
      })
      .catch((err) => {
        const fallback = products.find((item) => item.slug === slug);
        if (fallback) {
          setProduct(fallback);
          setSelectedPackageId(fallback.packages?.[0]?.id || null);
        } else setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [slug, products.length]);

  const selectedPackage = product?.packages?.find((item) => Number(item.id) === Number(selectedPackageId)) || product?.packages?.[0];
  const related = useMemo(() => products.filter((item) => item.categoryId === product?.categoryId && item.id !== product?.id).slice(0, 4), [products, product]);
  const isFavorite = favorites.includes(Number(product?.id));

  if (loading) return <div className="page section"><div className="container loading-panel">Đang tải chi tiết sản phẩm...</div></div>;
  if (!product || error) {
    return (
      <div className="page section"><div className="container empty-state"><h1>Không tìm thấy sản phẩm</h1><p>{error || 'Sản phẩm có thể đã thay đổi hoặc không còn hiển thị.'}</p><Link to="/products" className="button button--primary">Quay lại danh sách</Link></div></div>
    );
  }

  const tabContent = {
    'Mô tả': <p>{product.description}</p>,
    'Tính năng': <ul>{(product.features || []).map((item) => <li key={item}><Check size={17} /> {item}</li>)}</ul>,
    'Hướng dẫn sử dụng': <p>{product.usageInstructions || 'Sau khi đơn hàng hoàn tất, mở trang tài khoản để xem thông tin bàn giao và làm theo hướng dẫn đi kèm.'}</p>,
    'Bảo hành': <p>{product.warrantyDescription || product.warranty}</p>,
    'Đánh giá': product.reviews?.length ? (
      <div className="review-list">{product.reviews.map((review) => <article key={review.id}><strong>{review.user?.fullName || 'Khách hàng'}</strong><span>{'★'.repeat(review.rating)}</span><p>{review.content}</p></article>)}</div>
    ) : <p>Chưa có đánh giá nào cho sản phẩm này.</p>,
  };

  return (
    <div className="page product-detail-page">
      <div className="container breadcrumb"><Link to="/">Trang chủ</Link><ChevronRight size={14} /><Link to="/products">Sản phẩm</Link><ChevronRight size={14} /><span>{product.name}</span></div>
      <section className="container product-detail-grid">
        <div className="product-detail-media">
          <button className="back-floating" onClick={() => navigate(-1)}><ArrowLeft size={17} /> Quay lại</button>
          <div className={`product-detail-logo product-detail-logo--${product.slug}`}><img src={assetUrl(product.logo)} alt={product.name} /></div>
          <div className="product-detail-trust"><span><BadgeCheck /> Nguồn hàng kiểm tra</span><span><RefreshCcw /> Bảo hành minh bạch</span><span><Zap /> Kích hoạt nhanh</span></div>
        </div>

        <div className="product-detail-info">
          <span className="eyebrow">{product.category?.name || 'Tài khoản premium'}</span>
          <div className="product-title-row"><h1>{product.name}</h1><button className={`favorite-button favorite-button--large ${isFavorite ? 'is-active' : ''}`} onClick={() => toggleFavorite(product.id)}><Heart fill={isFavorite ? 'currentColor' : 'none'} /></button></div>
          <div className="rating-row rating-row--large"><Star fill="currentColor" /><strong>{Number(product.rating || 0).toFixed(1)}</strong><span>({product.reviewCount || 0} đánh giá)</span><i>Đã bán {Number(product.soldCount || 0).toLocaleString('vi-VN')}</i></div>
          <p className="product-detail-description">{product.shortDescription}</p>

          <div className="package-picker">
            <div className="package-picker__head"><h3>Chọn gói sử dụng</h3><span><Clock3 size={16} /> Còn {selectedPackage?.stock || 0} sản phẩm</span></div>
            <div className="package-options">
              {(product.packages || []).map((item) => (
                <button key={item.id} className={Number(selectedPackage?.id) === Number(item.id) ? 'active' : ''} onClick={() => { setSelectedPackageId(item.id); setQuantity(1); }}>
                  <strong>{item.label || item.name}</strong><span>{item.accountType}</span><b>{formatCurrency(item.price ?? item.salePrice)}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="product-buy-box">
            <div className="detail-price"><small>Giá gói đã chọn</small><strong>{formatCurrency(selectedPackage?.price ?? selectedPackage?.salePrice ?? product.price)}</strong>{selectedPackage?.originalPrice > (selectedPackage?.price ?? selectedPackage?.salePrice) && <del>{formatCurrency(selectedPackage.originalPrice)}</del>}</div>
            <div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(selectedPackage?.stock || 1, quantity + 1))}><Plus size={16} /></button></div>
            <button className="button button--soft button--large" onClick={() => addToCart(product, selectedPackage, quantity)} disabled={!selectedPackage?.stock}><ShoppingCart size={19} /> Thêm vào giỏ</button>
            <a className={`button button--primary button--large ${!selectedPackage?.stock ? 'is-disabled' : ''}`} href={selectedPackage?.stock ? ZALO_CONTACT_URL : undefined} target="_blank" rel="noreferrer" aria-disabled={!selectedPackage?.stock}>Mua ngay</a>
          </div>
          <div className="detail-notes"><span><ShieldCheck size={18} /> Dữ liệu bàn giao chỉ hiển thị cho chủ đơn hàng</span><span><BadgeCheck size={18} /> Hỗ trợ trong thời gian gói còn hiệu lực</span></div>
        </div>
      </section>

      <section className="section section--muted product-tabs-section">
        <div className="container">
          <div className="product-tabs">{tabs.map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
          <div className="product-tab-content"><h2>{activeTab}</h2>{tabContent[activeTab]}</div>
        </div>
      </section>

      {related.length > 0 && <section className="section"><div className="container"><SectionHeading eyebrow="Có thể bạn quan tâm" title="Sản phẩm liên quan" to="/products" /><div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></div></section>}
    </div>
  );
}
