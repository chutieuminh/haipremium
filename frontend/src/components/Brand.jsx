import { Link } from 'react-router-dom';

export default function Brand({ compact = false }) {
  const goHomeTop = () => {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  return (
    <Link to="/" className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="Hải Premium - Trang chủ" onClick={goHomeTop}>
      <span className="brand__mark-wrap">
        <img src="/assets/brand-mark.png" alt="" className="brand__mark" />
      </span>
      <span className="brand__copy">
        <strong>Hải Premium</strong>
        {!compact && <small>Nâng cấp tài khoản Premium chính chủ</small>}
      </span>
    </Link>
  );
}
