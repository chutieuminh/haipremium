import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, BadgeDollarSign, BookOpenCheck, BriefcaseBusiness, Check, ChevronDown,
  Clock3, Cpu, Headset, MessageCircle, MessageCircleMore, PackageCheck,
  PenTool, ShoppingBag, Star, Zap,
  TicketPercent,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SectionHeading from '../components/SectionHeading';
import { api, assetUrl } from '../api/client';
import { faqs, testimonials } from '../data/products';
import { useCatalog } from '../context/CatalogContext';

const categoryIcons = {
  GraduationCap: BookOpenCheck,
  Sparkles: Cpu,
  Palette: PenTool,
  BriefcaseBusiness,
};
const DefaultCategoryIcon = PackageCheck;

const benefits = [
  [MessageCircleMore, 'Tư vấn rõ ràng', 'Giải đáp đầy đủ trước khi khách hàng xác nhận mua.'],
  [BadgeDollarSign, 'Đa dạng lựa chọn', 'Nhiều gói linh hoạt, tối ưu theo nhu cầu'],
  [Zap, 'Quy trình đơn giản', 'Đặt hàng, thanh toán và nhận hướng dẫn nhanh chóng.'],
  [Headset, 'Hỗ trợ tận tâm', 'Đồng hành trong suốt thời gian sử dụng'],
];

const steps = [
  [ShoppingBag, 'Chọn sản phẩm', 'Tìm đúng ứng dụng và gói sử dụng phù hợp.'],
  [PackageCheck, 'Chọn gói sử dụng', 'Kiểm tra thời hạn, giá và thêm sản phẩm vào giỏ.'],
  [MessageCircle, 'Liên hệ Zalo', 'Tạo đơn, thanh toán và nhận tài khoản qua kênh hỗ trợ.'],
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [banners, setBanners] = useState([]);
  const { categories, products, loading, error } = useCatalog();
  const featuredProducts = products.filter((item) => item.featured || item.isFeatured).slice(0, 8);
  const logoProducts = products.slice(0, 32);
  const heroBanner = banners[0];
  const promoBanner = banners[1];

  useEffect(() => {
    let active = true;
    api.get('/banners')
      .then((payload) => { if (active) setBanners(payload.data || []); })
      .catch(() => { if (active) setBanners([]); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <section className="hero-section">
        <div className="container">
          <div className="hero-card">
            <img src={assetUrl(heroBanner?.imageUrl) || '/assets/hero.jpg'} alt={heroBanner?.title || 'Hải Premium cung cấp tài khoản bản quyền giá hợp lý'} />
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
          <div className="promo-banner" style={promoBanner?.imageUrl ? { '--promo-image': `url("${assetUrl(promoBanner.imageUrl)}")` } : undefined}>
            <div className="promo-banner__icon"><TicketPercent /></div>
            <div>
              <span>Ưu đãi khách hàng mới</span>
              <h2>{promoBanner?.title || 'Giảm 10% cho đơn hàng đầu tiên'}</h2>
              <p>{promoBanner?.subtitle || <>Nhập mã <strong>HAIPREMIUM10</strong> khi thanh toán. Áp dụng cho đơn từ 199.000đ.</>}</p>
            </div>
            <Link to={promoBanner?.linkUrl || '/products'} className="button button--white">Mua ngay <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="section section--muted logo-showcase-section">
        <div className="container">
          <SectionHeading
            eyebrow="Khám phá sản phẩm"
            title="Chọn ứng dụng phù hợp với nhu cầu"
            description="Khám phá các gói dịch vụ theo nhu cầu học tập, làm việc và sáng tạo."
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
            <h2>Chỉ 3 bước để bắt đầu</h2>
            <p>Trao đổi trực tiếp qua Zalo, xác nhận rõ sản phẩm, mức giá và điều kiện sử dụng trước khi thanh toán.</p>
            <div className="trust-list">
              <span><Check size={17} /> Gửi nhu cầu và nhận tư vấn nhanh qua Zalo</span>
              <span><Check size={17} /> Xác nhận đơn hàng, giá và thời hạn sử dụng</span>
              <span><Check size={17} /> Không yêu cầu mật khẩu, mã OTP hoặc dữ liệu đăng nhập</span>
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
            eyebrow="Trải nghiệm từ khách hàng"
            title="Đánh giá của người dùng"
            description="Từng phản hồi, đánh giá là động lực để chúng tôi cải thiện chất lượng sản phẩm và hỗ trợ."
          />
          <div className="testimonial-grid">
            {testimonials.map((item) => (
              <article className="testimonial-card" key={item.name}>
                <div className="testimonial-card__stars">{Array.from({ length: item.rating }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}</div>
                <p>“{item.content}”</p>
                <div className="testimonial-card__person">
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
