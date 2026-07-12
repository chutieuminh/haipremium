import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return <div className="page page--muted section"><div className="container empty-state empty-state--large"><strong className="error-code">404</strong><h1>Trang bạn tìm không tồn tại</h1><p>Đường dẫn có thể đã thay đổi hoặc chưa được tạo trong bản demo.</p><Link className="button button--primary" to="/">Về trang chủ</Link></div></div>;
}
