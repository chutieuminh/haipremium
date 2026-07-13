import { Link } from 'react-router-dom';
import { Check, ChevronRight, Headphones, MessageCircle, Search, ShieldCheck, ShoppingCart } from 'lucide-react';
import { ZALO_CONTACT_URL } from '../constants/contact';

const guideSteps = [
  [Search, 'Tìm sản phẩm', 'Dùng thanh tìm kiếm hoặc bộ lọc để chọn ứng dụng phù hợp.'],
  [ShoppingCart, 'Chọn gói', 'Kiểm tra thời hạn, loại tài khoản, giá và điều kiện sử dụng.'],
  [MessageCircle, 'Liên hệ Zalo', 'Liên hệ Zalo để thanh toán và nhận tài khoản nhanh chóng.'],
];

export default function GuidePage() {
  return (
    <div className="page page--muted">
      <section className="guide-hero"><div className="container"><span className="eyebrow">Trung tâm trợ giúp</span><h1>Mua tài khoản premium dễ dàng và an toàn</h1><p>Hướng dẫn từ lúc chọn sản phẩm đến khi nhận thông tin bàn giao.</p></div></section>
      <section className="section"><div className="container">
        <div className="guide-steps">{guideSteps.map(([Icon,title,text], index) => <article key={title}><span>0{index+1}</span><i><Icon /></i><h2>{title}</h2><p>{text}</p>{index < guideSteps.length - 1 && <ChevronRight className="guide-arrow" />}</article>)}</div>
        <div className="guide-layout">
          <main className="guide-content">
            <section><h2>Trước khi đặt hàng</h2><p>Đọc kỹ mô tả, loại tài khoản và các điều kiện của từng gói. Một số gói là tài khoản dùng chung hoặc thành viên nhóm, vì vậy không được tự ý đổi mật khẩu hay thông tin bảo mật.</p><ul><li><Check />Kiểm tra thiết bị và khu vực hỗ trợ.</li><li><Check />Chọn đúng thời hạn sử dụng.</li><li><Check />Đọc chính sách bảo hành của sản phẩm.</li></ul></section>
            <section><h2>Chính sách bảo hành</h2><p>Hải Premium hỗ trợ lỗi phát sinh từ tài khoản hoặc quá trình kích hoạt trong thời hạn của gói. Không áp dụng với trường hợp khách hàng vi phạm hướng dẫn sử dụng, tự đổi thông tin hoặc chia sẻ trái quy định.</p><div className="guide-notice"><ShieldCheck /><div><strong>Lưu ý quan trọng</strong><span>Website chỉ phân phối sản phẩm, mã kích hoạt hoặc quyền sử dụng hợp pháp. Logo bên thứ ba chỉ dùng để nhận diện sản phẩm.</span></div></div></section>
          </main>
          <aside className="guide-support-card"><span><Headphones /></span><h2>Vẫn cần hỗ trợ?</h2><p>Đội ngũ Hải Premium hoạt động từ 09:00 đến 17:00 mỗi ngày.</p><a className="button button--primary button--block" href={ZALO_CONTACT_URL} target="_blank" rel="noreferrer">Liên hệ Zalo hỗ trợ</a><Link className="button button--ghost button--block" to="/products">Xem sản phẩm</Link></aside>
        </div>
      </div></section>
    </div>
  );
}
