import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BadgeCheck, BookOpenCheck, BriefcaseBusiness, Check, Clock3, Coins,
  ClipboardList, Cpu, KeyRound, PenTool, RefreshCcw, ShieldCheck, Shuffle, WandSparkles,
} from 'lucide-react';
import { assetUrl } from '../api/client';
import { useCatalog } from '../context/CatalogContext';
import { formatCurrency } from '../data/products';

const questions = [
  {
    key: 'purpose',
    eyebrow: 'Nhu cầu sử dụng',
    title: 'Bạn cần tài khoản Premium cho mục đích gì?',
    description: 'Chọn mục phù hợp với nhu cầu chính của bạn.',
    options: [
      ['study', 'Học tập', 'Ngoại ngữ, tài liệu và kỹ năng', BookOpenCheck],
      ['work', 'Làm việc', 'Năng suất, lưu trữ và cộng tác', BriefcaseBusiness],
      ['ai', 'AI', 'Trợ lý, tạo nội dung và tự động hóa', Cpu],
      ['creative', 'Thiết kế', 'Hình ảnh, video và sáng tạo', PenTool],
    ],
  },
  {
    key: 'activation',
    eyebrow: 'Cách kích hoạt',
    title: 'Bạn muốn nhận Premium theo hình thức nào?',
    description: 'Chọn cách kích hoạt thuận tiện nhất với bạn.',
    options: [
      ['upgrade', 'Nâng cấp chính chủ', 'Sử dụng tài khoản hiện tại của bạn', BadgeCheck],
      ['provided', 'Tài khoản / Mã riêng', 'Nhận tài khoản hoặc mã kích hoạt sẵn', KeyRound],
      ['flexible', 'Không quan trọng', 'Ưu tiên gói phù hợp và tiết kiệm', Shuffle],
    ],
  },
  {
    key: 'duration',
    eyebrow: 'Thời hạn mong muốn',
    title: 'Bạn muốn sử dụng trong bao lâu?',
    description: 'Thời hạn dài thường giúp tối ưu chi phí mỗi tháng.',
    options: [
      ['1', '1 tháng', 'Linh hoạt, phù hợp để trải nghiệm', Clock3],
      ['3', '3 tháng', 'Cân bằng giữa chi phí và thời gian', Clock3],
      ['12', '1 năm', 'Tiết kiệm hơn khi sử dụng lâu dài', Clock3],
    ],
  },
  {
    key: 'budget',
    eyebrow: 'Ngân sách dự kiến',
    title: 'Bạn muốn chi tối đa bao nhiêu?',
    description: 'Mức giá được tính cho toàn bộ thời hạn đã chọn.',
    options: [
      ['100000', 'Dưới 100.000đ', 'Ưu tiên các lựa chọn tiết kiệm nhất', Coins],
      ['200000', 'Khoảng 200.000đ', 'Nhiều gói phổ biến để lựa chọn', Coins],
      ['400000', 'Khoảng 400.000đ', 'Linh hoạt về tính năng và thời hạn', Coins],
      ['800000', 'Khoảng 800.000đ', 'Ưu tiên trải nghiệm đầy đủ', Coins],
      ['unlimited', 'Không giới hạn', 'Tìm gói phù hợp nhất trước', Coins],
    ],
  },
  {
    key: 'priority',
    eyebrow: 'Ưu tiên quan trọng nhất',
    title: 'Điều gì quan trọng nhất với bạn?',
    description: 'Lựa chọn này giúp tinh chỉnh kết quả cuối cùng.',
    options: [
      ['cheap', 'Giá tốt', 'Chi phí thấp và tiết kiệm nhiều', Coins],
      ['features', 'Nhiều tính năng', 'Ưu tiên trải nghiệm Premium đầy đủ', WandSparkles],
      ['warranty', 'Bảo hành lâu', 'An tâm trong suốt thời gian sử dụng', ShieldCheck],
    ],
  },
];

const upgradePattern = /nâng cấp|chính chủ/i;
const providedPattern = /tài khoản riêng|mã kích hoạt|account|license|key/i;

const durationInMonths = (value = '') => {
  const normalized = String(value).toLowerCase();
  const amount = Number(normalized.match(/\d+/)?.[0] || 1);
  return normalized.includes('năm') || normalized.includes('year') ? amount * 12 : amount;
};

const purposeMatches = (product, purpose) => {
  const category = String(product.categoryId || product.category?.code || '').toLowerCase();
  return category === purpose;
};

function buildRecommendations(products, answers) {
  const requestedDuration = Number(answers.duration || 1);
  const budget = answers.budget === 'unlimited' ? Infinity : Number(answers.budget || 0);
  const candidates = products.flatMap((product) => {
    const packages = product.packages?.length ? product.packages : [{
      id: `base-${product.id}`,
      label: 'Gói tiêu chuẩn',
      duration: '1 tháng',
      accountType: 'Tài khoản riêng',
      price: product.price,
      originalPrice: product.originalPrice,
      warrantyDays: 30,
      stock: product.stock,
    }];

    return packages.filter((item) => item.stock !== 0).map((item) => {
      const price = Number(item.price ?? item.salePrice ?? product.price ?? 0);
      const originalPrice = Number(item.originalPrice ?? product.originalPrice ?? price);
      const months = durationInMonths(item.duration);
      const accountType = String(item.accountType || '');
      const activationMatches = answers.activation === 'flexible'
        || (answers.activation === 'upgrade' && upgradePattern.test(accountType))
        || (answers.activation === 'provided' && providedPattern.test(accountType));
      let score = 5;

      score += purposeMatches(product, answers.purpose) ? 32 : 0;
      score += activationMatches ? 12 : 3;
      score += Math.max(2, 17 - Math.min(15, Math.abs(months - requestedDuration) * 2.1));

      if (budget === Infinity) score += 13;
      else if (price <= budget) score += 17 - Math.min(8, ((budget - price) / Math.max(budget, 1)) * 8);
      else score += Math.max(0, 8 - ((price - budget) / Math.max(budget, 1)) * 16);

      if (answers.priority === 'cheap') score += Math.max(3, 14 - price / 80000);
      if (answers.priority === 'features') score += Math.min(14, 7 + (product.features?.length || 0) + Number(product.rating || 0) / 2);
      if (answers.priority === 'warranty') score += Math.min(14, 3 + Number(item.warrantyDays || 0) / 34);

      return {
        product,
        package: item,
        price,
        originalPrice,
        savings: Math.max(0, originalPrice - price),
        score: Math.round(Math.max(55, Math.min(98, score))),
      };
    });
  }).sort((a, b) => b.score - a.score || b.savings - a.savings || a.price - b.price);

  const uniqueProducts = [];
  for (const candidate of candidates) {
    if (uniqueProducts.some((item) => Number(item.product.id) === Number(candidate.product.id))) continue;
    uniqueProducts.push(candidate);
    if (uniqueProducts.length === 3) break;
  }
  return uniqueProducts;
}

function MatchCard({ match, primary = false }) {
  const { product, package: selectedPackage, score, savings, price } = match;
  return (
    <article className={`match-result-card ${primary ? 'match-result-card--primary' : ''}`}>
      {primary && <span className="match-result-card__best"><BadgeCheck size={16} /> Phù hợp nhất</span>}
      <div className="match-result-card__top">
        <span className="match-result-card__logo"><img src={assetUrl(product.logo)} alt={product.name} /></span>
        <span className="match-result-card__score"><strong>{score}%</strong><small>phù hợp</small></span>
      </div>
      <div className="match-result-card__content">
        <span>{product.category?.name || 'Premium'}</span>
        <h2>{product.name}</h2>
        <p>{selectedPackage.label || selectedPackage.name} · {selectedPackage.duration} · {selectedPackage.accountType}</p>
        <div className="match-result-card__price"><strong>{formatCurrency(price)}</strong>{match.originalPrice > price && <del>{formatCurrency(match.originalPrice)}</del>}</div>
        <div className="match-result-card__saving"><Coins size={16} /> Tiết kiệm <strong>{formatCurrency(savings)}</strong> so với mua lẻ</div>
      </div>
      <Link className="button button--primary" to={`/products/${product.slug}`}>Nâng cấp ngay <ArrowRight size={17} /></Link>
    </article>
  );
}

export default function PremiumMatchPage() {
  const { products, loading, error } = useCatalog();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ purpose: '', activation: '', duration: '', budget: '', priority: '' });
  const [completed, setCompleted] = useState(false);
  const question = questions[step];
  const results = useMemo(() => completed ? buildRecommendations(products, answers) : [], [completed, products, answers]);

  const choose = (value) => setAnswers((current) => ({ ...current, [question.key]: value }));
  const next = () => {
    if (!answers[question.key]) return;
    if (step === questions.length - 1) setCompleted(true);
    else setStep((current) => current + 1);
  };
  const restart = () => {
    setAnswers({ purpose: '', activation: '', duration: '', budget: '', priority: '' });
    setStep(0);
    setCompleted(false);
  };

  return (
    <main className="premium-match-page">
      <section className="premium-match-hero">
        <div className="container">
          <span className="premium-match-hero__eyebrow">Tư vấn gói tài khoản</span>
          <h1>Gói tài khoản nào thực sự phù hợp với bạn?</h1>
          <p>Hãy cho chúng tôi biết nhu cầu của bạn, hệ thống sẽ phân tích và đề xuất gói phù hợp nhất.</p>
          <div className="premium-match-hero__trust"><span><Check /> Không cần đăng nhập</span><span><Check /> Kết quả tức thì</span><span><Check /> Chỉ mất 1 phút</span></div>
        </div>
      </section>

      <section className="section premium-match-workspace">
        <div className="container">
          {!completed ? (
            <div className="match-wizard">
              <aside className="match-wizard__progress">
                <div><ClipboardList size={24} /><span><strong>Hồ sơ nhu cầu</strong><small>{step + 1}/5 câu hỏi</small></span></div>
                <div className="match-progress-bar"><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
                <ol>{questions.map((item, index) => <li className={index === step ? 'is-active' : index < step ? 'is-done' : ''} key={item.key}><i>{index < step ? <Check size={14} /> : index + 1}</i><span>{item.eyebrow}</span></li>)}</ol>
              </aside>

              <div className="match-wizard__question">
                <div className="match-question-head"><span>{question.eyebrow}</span><h2>{question.title}</h2><p>{question.description}</p></div>
                <div className={`match-options match-options--${question.options.length}`}>
                  {question.options.map(([value, label, description, Icon]) => (
                    <button type="button" className={answers[question.key] === value ? 'is-selected' : ''} onClick={() => choose(value)} key={value}>
                      <i><Icon size={23} /></i><span><strong>{label}</strong><small>{description}</small></span><b><Check size={15} /></b>
                    </button>
                  ))}
                </div>
                <div className="match-wizard__actions">
                  <button className="button button--ghost" type="button" disabled={step === 0} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} /> Quay lại</button>
                  <button className="button button--primary" type="button" disabled={!answers[question.key]} onClick={next}>{step === questions.length - 1 ? 'Xem gói phù hợp' : 'Tiếp tục'} <ArrowRight size={17} /></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="match-results">
              <div className="match-results__head">
                <span><BadgeCheck size={19} /> Đã phân tích xong</span>
                <h1>Gói phù hợp dành cho bạn</h1>
                <p>Kết quả được xếp hạng theo nhu cầu, thời hạn, ngân sách và ưu tiên bạn đã chọn.</p>
                <button type="button" onClick={restart}><RefreshCcw size={16} /> Tư vấn lại</button>
              </div>
              {error && <div className="api-warning">{error}</div>}
              {loading ? <div className="loading-panel">Đang phân tích các gói Premium...</div> : results.length ? (
                <>
                  <div className="match-results__primary"><MatchCard match={results[0]} primary /></div>
                  {results.length > 1 && <div className="match-results__alternatives"><h2>2 lựa chọn thay thế</h2><div>{results.slice(1).map((item) => <MatchCard match={item} key={item.product.id} />)}</div></div>}
                </>
              ) : <div className="empty-state"><h2>Chưa tìm thấy gói phù hợp</h2><p>Hãy thử chọn ngân sách hoặc thời hạn khác.</p><button className="button button--primary" onClick={restart}>Tư vấn lại</button></div>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
