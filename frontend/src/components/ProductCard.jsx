import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, getCategory } from '../data/products';
import { useStore } from '../context/StoreContext';
import { assetUrl } from '../api/client';

export default function ProductCard({ product }) {
  const { addToCart, toggleFavorite, favorites } = useStore();
  const category = product.category || getCategory(product.categoryId);
  const originalPrice = Number(product.originalPrice || product.price || 0);
  const price = Number(product.price || product.basePrice || 0);
  const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
  const isFavorite = favorites.includes(Number(product.id));

  return (
    <article className="product-card">
      <div className="product-card__media">
        <Link to={`/products/${product.slug}`} className="product-card__logo-link">
          <img src={assetUrl(product.logo)} alt={`Logo ${product.name}`} loading="lazy" />
        </Link>
        <span className="product-card__badge">{product.badge || 'Ưu đãi'}</span>
        <button
          className={`favorite-button ${isFavorite ? 'is-active' : ''}`}
          onClick={() => toggleFavorite(product.id)}
          aria-label={isFavorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
        >
          <Heart size={19} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="product-card__body">
        <span className="product-card__category">{category?.name || 'Sản phẩm số'}</span>
        <Link className="product-card__name" to={`/products/${product.slug}`}>{product.name}</Link>
        <div className="rating-row">
          <Star size={15} fill="currentColor" />
          <strong>{Number(product.rating || product.averageRating || 0).toFixed(1)}</strong>
          <span>({product.reviewCount || 0})</span>
          <i>Đã bán {Number(product.soldCount || 0).toLocaleString('vi-VN')}</i>
        </div>
        <div className="product-card__price">
          <div><strong>{formatCurrency(price)}</strong>{originalPrice > price && <del>{formatCurrency(originalPrice)}</del>}</div>
          {discount > 0 && <span>-{discount}%</span>}
        </div>
        <div className="product-card__actions">
          <Link className="button button--soft" to={`/products/${product.slug}`}>Chi tiết</Link>
          <button className="button button--primary icon-only" onClick={() => addToCart(product)} aria-label="Thêm vào giỏ" disabled={!product.packages?.length || product.stock <= 0}>
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
