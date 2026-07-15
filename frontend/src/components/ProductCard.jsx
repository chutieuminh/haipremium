import { Heart, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, getCategory } from '../data/products';
import { useStore } from '../context/StoreContext';
import { assetUrl } from '../api/client';

function getBadge(product) {
  if (!product.badge) return null;
  const value = String(product.badge).trim().toLocaleLowerCase('vi-VN');

  if (value === 'hot' || value === 'nổi bật') return { type: 'hot', label: 'HOT' };
  if (value === 'mới' || value === 'moi') return { type: 'new', label: 'Mới' };
  if (value === 'bán chạy' || value === 'ban chay') return { type: 'best-seller', label: 'Bán chạy' };

  return null;
}

export default function ProductCard({ product }) {
  const { addToCart, toggleFavorite, favorites } = useStore();
  const category = product.category || getCategory(product.categoryId);
  const originalPrice = Number(product.originalPrice || product.price || 0);
  const price = Number(product.price || product.basePrice || 0);
  const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
  const isFavorite = favorites.includes(Number(product.id));
  const accent = category?.accent || '#1689d8';
  const badge = getBadge(product);

  return (
    <article className={`product-card product-card--${product.slug}`} style={{ '--product-accent': accent }}>
      <div className="product-card__media">
        <Link to={`/products/${product.slug}`} className="product-card__logo-link">
          <img src={assetUrl(product.logo)} alt={`Logo ${product.name}`} loading="lazy" />
        </Link>
        {badge && <span className={`product-card__badge product-card__badge--${badge.type}`}>
          {badge.label}
        </span>}
        <button
          type="button"
          className={`favorite-button ${isFavorite ? 'is-active' : ''}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleFavorite(product.id);
          }}
          aria-label={isFavorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
        >
          <Heart size={19} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="product-card__body">
        <span className="product-card__category">{category?.name || 'Sản phẩm số'}</span>
        <Link className="product-card__name" to={`/products/${product.slug}`}>{product.name}</Link>
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
