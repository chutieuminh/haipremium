import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import Brand from '../components/Brand';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState('login');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useStore();
  const { login, register } = useAuth();

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const user = tab === 'login'
        ? await login({ email: form.email, password: form.password })
        : await register(form);
      notify(tab === 'login' ? 'Đăng nhập thành công.' : 'Tạo tài khoản thành công.');
      const target = location.state?.from || (user.role === 'admin' ? '/admin' : '/account');
      navigate(target, { replace: true });
    } catch (error) {
      notify(error.message, 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <div className="auth-visual__top"><Brand /></div>
        <div className="auth-visual__content">
          <span className="eyebrow eyebrow--light"> Hải Premium Accounts</span>
          <h1>Nâng cấp tài khoản Premium chính chủ</h1>
          <p>Nâng cấp toàn khoản chính chủ, hỗ trợ nhanh chóng, bảo hành lỗi 1 đổi 1 nếu có vấn đề.</p>
          <div className="auth-benefits"><span><Check size={17} /> Theo dõi trạng thái đơn hàng</span><span><Check size={17} /> Lưu sản phẩm yêu thích</span><span><Check size={17} /> Xem thông tin bàn giao bảo mật</span></div>
        </div>
        <div className="auth-visual__trust"><ShieldCheck /> <span><strong>Bảo mật thông tin người dùng</strong></span></div>
      </section>

      <section className="auth-form-wrap">
        <Link className="auth-back" to="/">← Về trang chủ</Link>
        <div className="auth-card">
          <div className="auth-tabs"><button className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>Đăng nhập</button><button className={tab === 'register' ? 'active' : ''} onClick={() => setTab('register')}>Đăng ký</button></div>
          <div className="auth-card__heading"><h2>{tab === 'login' ? 'Chào mừng bạn quay lại' : 'Tham gia Hải Premium'}</h2><p>{tab === 'login' ? 'Đăng nhập để quản lý đơn hàng và sản phẩm đã mua.' : 'Tạo tài khoản để bắt đầu sử dụng các tính năng đặc biệt.'}</p></div>
          <form onSubmit={submit}>
            {tab === 'register' && <label className="form-field"><span>Họ và tên</span><input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Nguyễn Văn A" /></label>}
            <label className="form-field"><span>Email</span><div className="input-with-icon"><Mail size={18} /><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="email@example.com" /></div></label>
            {tab === 'register' && <label className="form-field"><span>Số điện thoại</span><input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="0901 234 567" /></label>}
            <label className="form-field"><span>Mật khẩu</span><div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} minLength="8" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            {tab === 'register' && <label className="check-row auth-agree"><input type="checkbox" required /><span>Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật.</span></label>}
            {tab === 'login' && <div className="auth-options"><label className="check-row"><input type="checkbox" /><span>Ghi nhớ đăng nhập</span></label><a href="#forgot">Quên mật khẩu?</a></div>}
            <button className="button button--primary button--large button--block" type="submit" disabled={submitting}>{submitting ? 'Đang xử lý...' : tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <ArrowRight size={18} /></button>
          </form>
        </div>
      </section>
    </div>
  );
}
