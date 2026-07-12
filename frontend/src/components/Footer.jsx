import { Facebook, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Brand from './Brand';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Brand />
          <p>Giải pháp tài khoản bản quyền với chi phí hợp lý, giao nhanh và hỗ trợ tận tâm.</p>
          <div className="footer__socials">
            <a href="#facebook" aria-label="Facebook"><Facebook size={18} /></a>
            <a href="#zalo" aria-label="Zalo"><MessageCircle size={18} /></a>
            <a href="mailto:support@haipremium.vn" aria-label="Email"><Mail size={18} /></a>
          </div>
        </div>
        <div>
          <h4>Sản phẩm</h4>
          <Link to="/products?category=study">Học tập</Link>
          <Link to="/products?category=ai">AI - Trí tuệ nhân tạo</Link>
          <Link to="/products?category=creative">Thiết kế - Sáng tạo</Link>
          <Link to="/products?category=work">Phục vụ công việc</Link>
        </div>
        <div>
          <h4>Hỗ trợ khách hàng</h4>
          <Link to="/guide">Hướng dẫn mua hàng</Link>
          <Link to="/guide">Chính sách bảo hành</Link>
          <Link to="/guide">Điều khoản sử dụng</Link>
          <Link to="/guide">Chính sách bảo mật</Link>
        </div>
        <div>
          <h4>Liên hệ Hải Premium</h4>
          <p><Phone size={17} /> 0900 123 456</p>
          <p><Mail size={17} /> support@haipremium.vn</p>
          <p><MapPin size={17} /> Việt Nam</p>
          <span className="footer__verified"><ShieldCheck size={17} /> Bảo hành minh bạch</span>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">
          <span>© 2026 Hải Premium. Hệ thống thương mại điện tử fullstack.</span>
          <span>Logo bên thứ ba chỉ dùng để nhận diện sản phẩm.</span>
        </div>
      </div>
    </footer>
  );
}
