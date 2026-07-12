import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from './config.js';
import { AuditLog, Setting, Op } from './models.js';

export class AppError extends Error {
  constructor(message, statusCode = 400, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const success = (res, data = null, message = 'Thao tác thành công', status = 200, pagination) => {
  const payload = { success: true, message, data };
  if (pagination) payload.pagination = pagination;
  return res.status(status).json(payload);
};

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const signAccessToken = (user) => jwt.sign(
  { sub: user.id, role: user.role, email: user.email },
  env.jwtAccessSecret,
  { expiresIn: env.jwtAccessExpiresIn },
);

export const signRefreshToken = (user) => jwt.sign(
  { sub: user.id, type: 'refresh', jti: crypto.randomUUID() },
  env.jwtRefreshSecret,
  { expiresIn: env.jwtRefreshExpiresIn },
);

export const decodeDurationMs = (value) => {
  const match = String(value).match(/^(\d+)([smhd])$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * units[match[2].toLowerCase()];
};

export const setRefreshCookie = (res, token) => {
  res.cookie('hp_refresh', token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: decodeDurationMs(env.jwtRefreshExpiresIn),
    path: '/api/v1/auth',
  });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie('hp_refresh', {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/api/v1/auth',
  });
};

const getEncryptionKey = () => {
  if (!env.inventoryKey) throw new AppError('Chưa cấu hình INVENTORY_ENCRYPTION_KEY.', 500);
  if (/^[a-f0-9]{64}$/i.test(env.inventoryKey)) return Buffer.from(env.inventoryKey, 'hex');
  return crypto.createHash('sha256').update(env.inventoryKey).digest();
};

export const encryptSecret = (plainText) => {
  if (plainText === undefined || plainText === null || plainText === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
};

export const decryptSecret = (payload) => {
  if (!payload) return null;
  const [ivB64, tagB64, encryptedB64] = String(payload).split('.');
  if (!ivB64 || !tagB64 || !encryptedB64) throw new AppError('Dữ liệu mã hóa không hợp lệ.', 500);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedB64, 'base64')), decipher.final()]).toString('utf8');
};

export const safeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
});

export const numberValue = (value) => Number(value || 0);

export const serializePackage = (item) => ({
  id: item.id,
  name: item.name,
  label: item.name.includes('—') ? item.name.split('—').pop().trim() : item.name,
  duration: item.duration,
  accountType: item.accountType,
  description: item.description,
  price: numberValue(item.salePrice),
  salePrice: numberValue(item.salePrice),
  originalPrice: numberValue(item.originalPrice),
  stock: item.stock,
  warrantyDays: item.warrantyDays,
  isActive: item.isActive,
});

export const serializeProduct = (product, { includeReviews = false } = {}) => {
  const plain = product.get ? product.get({ plain: true }) : product;
  const packages = (plain.packages || []).filter((item) => item.isActive !== false).map(serializePackage);
  const minimumPackagePrice = packages.length ? Math.min(...packages.map((item) => item.price)) : numberValue(plain.basePrice);
  const minimumOriginalPrice = packages.length ? Math.min(...packages.map((item) => item.originalPrice)) : numberValue(plain.originalPrice);
  const category = plain.category || null;
  const result = {
    id: plain.id,
    name: plain.name,
    slug: plain.slug,
    categoryDbId: plain.categoryId,
    categoryId: category?.code || plain.categoryId,
    category: category ? { id: category.id, code: category.code, name: category.name, slug: category.slug } : null,
    shortDescription: plain.shortDescription,
    description: plain.description,
    logo: plain.logo,
    originalPrice: minimumOriginalPrice,
    price: minimumPackagePrice,
    basePrice: numberValue(plain.basePrice),
    status: plain.status,
    featured: Boolean(plain.isFeatured),
    isFeatured: Boolean(plain.isFeatured),
    isBestSeller: Boolean(plain.isBestSeller),
    warranty: plain.warrantyDescription,
    warrantyDescription: plain.warrantyDescription,
    usageInstructions: plain.usageInstructions,
    terms: plain.terms,
    features: Array.isArray(plain.features) ? plain.features : [],
    badge: plain.badge || (plain.isBestSeller ? 'Bán chạy' : plain.isFeatured ? 'Nổi bật' : 'Ưu đãi'),
    soldCount: plain.soldCount,
    viewCount: plain.viewCount,
    rating: numberValue(plain.averageRating),
    averageRating: numberValue(plain.averageRating),
    reviewCount: plain.reviewCount,
    stock: packages.reduce((sum, item) => sum + Number(item.stock || 0), 0),
    packages,
    images: plain.images || [],
    createdAt: plain.createdAt,
  };
  if (includeReviews) result.reviews = plain.reviews || [];
  return result;
};

export const orderStatusLabels = {
  pending_payment: 'Chờ thanh toán',
  payment_review: 'Chờ xác nhận',
  paid: 'Đã thanh toán',
  processing: 'Đang xử lý',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
};

export const serializeOrder = (order, { includeDeliveries = true } = {}) => {
  const plain = order.get ? order.get({ plain: true }) : order;
  const result = {
    ...plain,
    subtotal: numberValue(plain.subtotal),
    discountAmount: numberValue(plain.discountAmount),
    total: numberValue(plain.total),
    statusLabel: orderStatusLabels[plain.orderStatus] || plain.orderStatus,
    items: (plain.items || []).map((item) => ({
      ...item,
      unitPrice: numberValue(item.unitPrice),
      lineTotal: numberValue(item.lineTotal),
      product: item.product ? serializeProduct(item.product) : undefined,
      deliveries: includeDeliveries ? item.deliveries || [] : undefined,
    })),
  };
  return result;
};

export const createOrderCode = async (OrderModel) => {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `HP${date}`;
  const count = await OrderModel.count({ where: { orderCode: { [Op.like]: `${prefix}%` } } }).catch(() => 0);
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

export const calculateCoupon = (coupon, subtotal) => {
  const total = Number(subtotal);
  if (!coupon) return 0;
  let discount = coupon.discountType === 'PERCENTAGE'
    ? total * (Number(coupon.discountValue) / 100)
    : Number(coupon.discountValue);
  if (coupon.maximumDiscount) discount = Math.min(discount, Number(coupon.maximumDiscount));
  return Math.max(0, Math.min(total, Math.round(discount)));
};

export const getSettingsMap = async () => {
  const settings = await Setting.findAll();
  return Object.fromEntries(settings.map((setting) => {
    let value = setting.value;
    if (setting.type === 'number') value = Number(value);
    if (setting.type === 'boolean') value = value === 'true';
    if (setting.type === 'json') {
      try { value = JSON.parse(value); } catch { value = null; }
    }
    return [setting.key, value];
  }));
};

export const audit = async (req, action, entityType, entityId, metadata = {}) => {
  try {
    await AuditLog.create({
      actorUserId: req.user?.id || null,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      metadata,
      ipAddress: req.ip,
    });
  } catch (error) {
    if (env.nodeEnv !== 'production') console.error('Audit log failed:', error.message);
  }
};
