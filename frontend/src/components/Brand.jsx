import { Link } from 'react-router-dom';

export default function Brand({ compact = false }) {
  return (
    <Link to="/" className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="Hải Premium - Trang chủ">
      <span className="brand__mark-wrap">
        <img src="/assets/brand-mark.png" alt="" className="brand__mark" />
      </span>
      <span className="brand__copy">
        <strong>Hải Premium</strong>
        {!compact && <small>Premium Apps · Giá tốt mỗi ngày</small>}
      </span>
    </Link>
  );
}
