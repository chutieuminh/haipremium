import { Facebook, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Brand from './Brand';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Brand />
          <p>Giải pháp nâng cấp tài khoản bản quyền với chi phí hợp lý, bảo mật và hỗ trợ tận tâm.</p>
          <div className="footer__socials">
            <a href="https://www.facebook.com/tranngochai.premiums" aria-label="Facebook"><Facebook size={18} /></a>
            <a href="https://zalo.me/0814831885" aria-label="Zalo"><MessageCircle size={18} /></a>  
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
          <p><Phone size={17} /> 081 483 1885</p>
          <p><MapPin size={17} />LK 17-515 Waterfront City 2 Võ Nguyên Giáp, Vĩnh Niệm, Lê Chân, 184300</p>
          <span className="footer__verified"><ShieldCheck size={17} /> Bảo hành minh bạch</span>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">
          <span>© 2026 Hải Premium.</span>  
        </div>
      </div>
    </footer>
  );
}
