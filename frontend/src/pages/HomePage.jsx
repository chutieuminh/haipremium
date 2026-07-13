import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, Check, ChevronDown, CircleDollarSign,
  Clock3, CreditCard, Gift, GraduationCap, Headphones, PackageCheck,
  Palette, ShieldCheck, ShoppingBag, Sparkles, Star, Zap,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SectionHeading from '../components/SectionHeading';
import { faqs, testimonials } from '../data/products';
import { useCatalog } from '../context/CatalogContext';

const categoryIcons = {
  GraduationCap,
  Sparkles,
  Palette,
  BriefcaseBusiness,
};
const DefaultCategoryIcon = Sparkles;

const benefits = [
  [BadgeCheck, 'Tài khoản bản quyền', 'Nguồn cung minh bạch, kiểm tra trước khi giao'],
  [CircleDollarSign, 'Giá cả hợp lý', 'Nhiều gói linh hoạt, tối ưu theo nhu cầu'],
  [Zap, 'Giao hàng nhanh', 'Xử lý đơn và bàn giao trong thời gian ngắn'],
  [Headphones, 'Hỗ trợ tận tâm', 'Đồng hành trong suốt thời gian sử dụng'],
];

const steps = [
  [ShoppingBag, 'Chọn sản phẩm', 'Tìm đúng ứng dụng và gói sử dụng phù hợp.'],
  [CreditCard, 'Thanh toán', 'Chuyển khoản an toàn với nội dung đơn hàng riêng.'],
  [PackageCheck, 'Nhận tài khoản', 'Thông tin được bàn giao tại trang đơn hàng.'],
  [ShieldCheck, 'Dùng & bảo hành', 'Hỗ trợ khi có lỗi theo chính sách từng gói.'],
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);
  const { categories, products, loading, error } = useCatalog();
  const featuredProducts = products.filter((item) => item.featured || item.isFeatured).slice(0, 8);
  const logoProducts = products.slice(0, 32);

  return (
    <>
      <section className="hero-section">
        <div className="container">
          <div className="hero-card">
            <img src="/assets/hero.jpg" alt="Hải Premium cung cấp tài khoản bản quyền giá hợp lý" />
            <div className="hero-card__cta">
              <Link to="/products" className="button button--primary button--large">Khám phá sản phẩm <ArrowRight size={18} /></Link>
              <Link to="/products?sort=discount" className="button button--white button--large">Xem ưu đãi</Link>
            </div>
            <div className="hero-card__stats">
              <span><strong>40+</strong> sản phẩm</span>
              <span><strong>5.000+</strong> lượt mua</span>
              <span><strong>5/5</strong> đánh giá</span>
            </div>
          </div>
        </div>
      </section>

      <section className="benefits-section">
        <div className="container benefits-grid">
          {benefits.map(([Icon, title, text]) => (
            <article className="benefit-item" key={title}>
              <span><Icon size={23} /></span>
              <div><strong>{title}</strong><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--muted">
        <div className="container">
          <SectionHeading
            eyebrow="Khám phá nhanh"
            title="Danh mục dành cho mọi nhu cầu"
            description="Từ học tập, làm việc đến sáng tạo nội dung — chọn đúng công cụ và tiết kiệm chi phí."
            to="/products"
          />
          <div className="category-grid">
            {categories.map((category) => {
              const Icon = categoryIcons[category.icon] || DefaultCategoryIcon;
              const count = products.filter((item) => item.categoryId === (category.code || category.id)).length;
              return (
                <Link className="category-card" to={`/products?category=${category.code || category.id}`} key={category.id} style={{ '--category-accent': category.accent }}>
                  <span className="category-card__icon"><Icon size={27} /></span>
                  <div>
                    <h3>{category.name}</h3>
                    <p>{category.description}</p>
                    <small>{count} sản phẩm <ArrowRight size={14} /></small>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {error && <div className="api-warning">Backend chưa sẵn sàng: {error}. Giao diện đang dùng dữ liệu dự phòng.</div>}
          <SectionHeading
            eyebrow="Được lựa chọn nhiều"
            title="Sản phẩm bán chạy"
            description="Những gói được khách hàng Hải Premium tin dùng nhiều nhất."
            to="/products?sort=popular"
          />
          <div className="product-grid">
            {loading ? Array.from({ length: 4 }).map((_, index) => <div className="product-skeleton" key={index} />) : featuredProducts.map((product) => <ProductCard product={product} key={product.id} />)}
          </div>
        </div>
      </section>

      <section className="section section--compact">
        <div className="container">
          <div className="promo-banner">
            <div className="promo-banner__icon"><Gift /></div>
            <div>
              <span>Ưu đãi khách hàng mới</span>
              <h2>Giảm 10% cho đơn hàng đầu tiên</h2>
              <p>Nhập mã <strong>HAIPREMIUM10</strong> khi thanh toán. Áp dụng cho đơn từ 199.000đ.</p>
            </div>
            <Link to="/products" className="button button--white">Mua ngay <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="section section--muted logo-showcase-section">
        <div className="container">
          <SectionHeading
            eyebrow="Hệ sinh thái sản phẩm"
            title="Ứng dụng premium bạn đang tìm kiếm"
            description="Danh mục đa dạng, cập nhật liên tục và có nhiều thời hạn sử dụng."
          />
          <div className="logo-cloud">
            {logoProducts.map((product) => (
              <Link to={`/products/${product.slug}`} className="logo-pill" key={product.id} title={product.name}>
                <img src={product.logo} alt={product.name} loading="lazy" />
                <span>{product.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split-feature">
          <div className="split-feature__copy">
            <span className="eyebrow">Mua hàng đơn giản</span>
            <h2>Chỉ 4 bước để bắt đầu</h2>
            <p>Luồng mua được tối giản, thông tin sản phẩm và điều kiện sử dụng hiển thị rõ ràng trước khi thanh toán.</p>
            <div className="trust-list">
              <span><Check size={17} /> Không cần chờ tư vấn mới đặt hàng</span>
              <span><Check size={17} /> Theo dõi trạng thái đơn ngay trong tài khoản</span>
              <span><Check size={17} /> Thông tin bàn giao được bảo vệ</span>
            </div>
            <Link to="/guide" className="text-link">Xem hướng dẫn chi tiết <ArrowRight size={16} /></Link>
          </div>
          <div className="steps-grid">
            {steps.map(([Icon, title, text], index) => (
              <article className="step-card" key={title}>
                <span className="step-card__number">0{index + 1}</span>
                <span className="step-card__icon"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <SectionHeading
            eyebrow="Khách hàng nói gì về Hải Premium"
            title="Trải nghiệm thực tế tại Hải Premium"
            description="Từng phản hồi, đánh giá là động lực để chúng tôi cải thiện chất lượng sản phẩm và hỗ trợ."
          />
          <div className="testimonial-grid">
            {testimonials.map((item) => (
              <article className="testimonial-card" key={item.name}>
                <div className="testimonial-card__stars">{Array.from({ length: item.rating }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}</div>
                <p>“{item.content}”</p>
                <div className="testimonial-card__person">
                  <span>{item.avatar}</span>
                  <div><strong>{item.name}</strong><small>Đã mua {item.product}</small></div>
                  <BadgeCheck size={19} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container faq-layout">
          <div className="faq-layout__intro">
            <span className="eyebrow">Câu hỏi thường gặp</span>
            <h2>Bạn cần biết trước khi mua?</h2>
            <p>Các thông tin quan trọng về bàn giao, bảo hành và cách sử dụng tài khoản kỹ thuật số.</p>
            <div className="support-card">
              <span><Clock3 /></span>
              <div><strong>Cần hỗ trợ nhanh?</strong><p>Đội ngũ phản hồi từ 09:00 đến 17:00 mỗi ngày.</p></div>
            </div>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer], index) => (
              <article className={`faq-item ${openFaq === index ? 'is-open' : ''}`} key={question}>
                <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                  <span>{question}</span><ChevronDown size={19} />
                </button>
                <div className="faq-item__answer"><p>{answer}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
