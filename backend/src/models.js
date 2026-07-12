import { DataTypes, Op } from 'sequelize';
import { sequelize } from './config.js';

const common = { timestamps: true };

export const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  fullName: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(190), allowNull: false, unique: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING(30) },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false },
  avatar: { type: DataTypes.STRING(255) },
  role: { type: DataTypes.ENUM('customer', 'admin'), allowNull: false, defaultValue: 'customer' },
  status: { type: DataTypes.ENUM('active', 'blocked'), allowNull: false, defaultValue: 'active' },
}, { ...common, tableName: 'users', indexes: [{ fields: ['email'] }, { fields: ['role', 'status'] }] });

export const RefreshToken = sequelize.define('RefreshToken', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: { type: DataTypes.DATE },
}, { ...common, tableName: 'refresh_tokens', indexes: [{ fields: ['tokenHash'] }, { fields: ['expiresAt'] }] });

export const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  icon: { type: DataTypes.STRING(80) },
  accent: { type: DataTypes.STRING(20), defaultValue: '#1689D8' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { ...common, tableName: 'categories', indexes: [{ fields: ['slug'] }, { fields: ['isActive'] }] });

export const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(180), allowNull: false },
  slug: { type: DataTypes.STRING(190), allowNull: false, unique: true },
  shortDescription: { type: DataTypes.STRING(500) },
  description: { type: DataTypes.TEXT('long') },
  logo: { type: DataTypes.STRING(255) },
  originalPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  basePrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
  isBestSeller: { type: DataTypes.BOOLEAN, defaultValue: false },
  warrantyDescription: { type: DataTypes.TEXT },
  usageInstructions: { type: DataTypes.TEXT },
  terms: { type: DataTypes.TEXT },
  features: { type: DataTypes.JSON },
  badge: { type: DataTypes.STRING(80) },
  soldCount: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  viewCount: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  averageRating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
  reviewCount: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  seoTitle: { type: DataTypes.STRING(190) },
  seoDescription: { type: DataTypes.STRING(500) },
}, {
  ...common,
  tableName: 'products',
  paranoid: true,
  indexes: [
    { fields: ['slug'] }, { fields: ['status'] }, { fields: ['isFeatured'] },
    { fields: ['isBestSeller'] }, { fields: ['createdAt'] }, { fields: ['categoryId', 'status'] },
  ],
});

export const ProductImage = sequelize.define('ProductImage', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  url: { type: DataTypes.STRING(255), allowNull: false },
  altText: { type: DataTypes.STRING(255) },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { ...common, tableName: 'product_images' });

export const ProductPackage = sequelize.define('ProductPackage', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  duration: { type: DataTypes.STRING(80), allowNull: false },
  accountType: { type: DataTypes.ENUM('Tài khoản riêng', 'Tài khoản dùng chung', 'Nâng cấp chính chủ', 'Mã kích hoạt', 'Thành viên nhóm'), allowNull: false },
  description: { type: DataTypes.TEXT },
  originalPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  salePrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  stock: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  warrantyDays: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 30 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { ...common, tableName: 'product_packages', indexes: [{ fields: ['productId', 'isActive'] }] });

export const Inventory = sequelize.define('Inventory', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  type: { type: DataTypes.ENUM('ACCOUNT', 'LICENSE_KEY', 'INVITE_LINK', 'MANUAL_DELIVERY'), allowNull: false, defaultValue: 'ACCOUNT' },
  loginEmail: { type: DataTypes.STRING(190) },
  loginUsername: { type: DataTypes.STRING(190) },
  encryptedPassword: { type: DataTypes.TEXT },
  encryptedActivationCode: { type: DataTypes.TEXT },
  encryptedRecoveryInfo: { type: DataTypes.TEXT },
  additionalInformation: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('AVAILABLE', 'RESERVED', 'SOLD', 'DISABLED'), allowNull: false, defaultValue: 'AVAILABLE' },
  assignedAt: { type: DataTypes.DATE },
  expiresAt: { type: DataTypes.DATE },
}, { ...common, tableName: 'inventories', indexes: [{ fields: ['packageId', 'status'] }, { fields: ['orderId'] }, { fields: ['assignedUserId'] }] });

export const Cart = sequelize.define('Cart', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
}, { ...common, tableName: 'carts', indexes: [{ unique: true, fields: ['userId'] }] });

export const CartItem = sequelize.define('CartItem', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1, validate: { min: 1 } },
}, { ...common, tableName: 'cart_items', indexes: [{ unique: true, fields: ['cartId', 'packageId'] }] });

export const Favorite = sequelize.define('Favorite', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
}, { ...common, tableName: 'favorites', indexes: [{ unique: true, fields: ['userId', 'productId'] }] });

export const Coupon = sequelize.define('Coupon', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  description: { type: DataTypes.STRING(500) },
  discountType: { type: DataTypes.ENUM('PERCENTAGE', 'FIXED_AMOUNT'), allowNull: false },
  discountValue: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  minimumOrderValue: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  maximumDiscount: { type: DataTypes.DECIMAL(12, 2) },
  usageLimit: { type: DataTypes.INTEGER.UNSIGNED },
  usageLimitPerUser: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 1 },
  usedCount: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  startDate: { type: DataTypes.DATE },
  endDate: { type: DataTypes.DATE },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { ...common, tableName: 'coupons', indexes: [{ fields: ['code'] }, { fields: ['isActive', 'startDate', 'endDate'] }] });

export const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  orderCode: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  customerName: { type: DataTypes.STRING(120), allowNull: false },
  customerEmail: { type: DataTypes.STRING(190), allowNull: false },
  customerPhone: { type: DataTypes.STRING(30), allowNull: false },
  note: { type: DataTypes.TEXT },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  discountAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  paymentMethod: { type: DataTypes.ENUM('bank', 'qr', 'wallet'), allowNull: false, defaultValue: 'bank' },
  paymentStatus: { type: DataTypes.ENUM('unpaid', 'review', 'paid', 'refunded'), allowNull: false, defaultValue: 'unpaid' },
  orderStatus: { type: DataTypes.ENUM('pending_payment', 'payment_review', 'paid', 'processing', 'completed', 'cancelled', 'refunded'), allowNull: false, defaultValue: 'pending_payment' },
  paymentProofPath: { type: DataTypes.STRING(255) },
  internalNote: { type: DataTypes.TEXT },
  completedAt: { type: DataTypes.DATE },
}, { ...common, tableName: 'orders', indexes: [{ fields: ['orderCode'] }, { fields: ['userId', 'createdAt'] }, { fields: ['orderStatus'] }, { fields: ['createdAt'] }] });

export const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  productName: { type: DataTypes.STRING(180), allowNull: false },
  productSlug: { type: DataTypes.STRING(190), allowNull: false },
  packageName: { type: DataTypes.STRING(200), allowNull: false },
  accountType: { type: DataTypes.STRING(80), allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  lineTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, { ...common, tableName: 'order_items', indexes: [{ fields: ['orderId'] }, { fields: ['productId'] }] });

export const OrderDelivery = sequelize.define('OrderDelivery', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  deliveredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  viewedAt: { type: DataTypes.DATE },
}, { ...common, tableName: 'order_deliveries', indexes: [{ unique: true, fields: ['inventoryId'] }, { fields: ['userId'] }] });

export const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  method: { type: DataTypes.STRING(40), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'review', 'paid', 'failed', 'refunded'), defaultValue: 'pending' },
  transactionReference: { type: DataTypes.STRING(150) },
  proofPath: { type: DataTypes.STRING(255) },
  confirmedAt: { type: DataTypes.DATE },
}, { ...common, tableName: 'payments', indexes: [{ fields: ['orderId'] }, { fields: ['status'] }] });

export const CouponUsage = sequelize.define('CouponUsage', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  discountAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, { ...common, tableName: 'coupon_usages', indexes: [{ fields: ['couponId', 'userId'] }] });

export const Review = sequelize.define('Review', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  rating: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, validate: { min: 1, max: 5 } },
  content: { type: DataTypes.TEXT, allowNull: false },
  isVisible: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { ...common, tableName: 'reviews', indexes: [{ unique: true, fields: ['orderItemId'] }, { fields: ['productId', 'isVisible'] }] });

export const Banner = sequelize.define('Banner', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(190), allowNull: false },
  subtitle: { type: DataTypes.STRING(500) },
  imageUrl: { type: DataTypes.STRING(255), allowNull: false },
  linkUrl: { type: DataTypes.STRING(255) },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { ...common, tableName: 'banners' });

export const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  value: { type: DataTypes.TEXT },
  type: { type: DataTypes.ENUM('text', 'number', 'boolean', 'json', 'secret'), defaultValue: 'text' },
}, { ...common, tableName: 'settings' });

export const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  action: { type: DataTypes.STRING(120), allowNull: false },
  entityType: { type: DataTypes.STRING(80) },
  entityId: { type: DataTypes.STRING(80) },
  metadata: { type: DataTypes.JSON },
  ipAddress: { type: DataTypes.STRING(80) },
}, { ...common, tableName: 'audit_logs', updatedAt: false, indexes: [{ fields: ['action'] }, { fields: ['createdAt'] }] });

export const SupportRequest = sequelize.define('SupportRequest', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  subject: { type: DataTypes.STRING(190), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'), defaultValue: 'open' },
  adminReply: { type: DataTypes.TEXT },
}, { ...common, tableName: 'support_requests', indexes: [{ fields: ['userId', 'status'] }] });

// Associations
User.hasMany(RefreshToken, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

Category.hasMany(Product, { foreignKey: { name: 'categoryId', allowNull: false } });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Product.hasMany(ProductImage, { foreignKey: { name: 'productId', allowNull: false }, as: 'images', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(ProductPackage, { foreignKey: { name: 'productId', allowNull: false }, as: 'packages', onDelete: 'CASCADE' });
ProductPackage.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

ProductPackage.hasMany(Inventory, { foreignKey: { name: 'packageId', allowNull: false }, as: 'inventories' });
Inventory.belongsTo(ProductPackage, { foreignKey: 'packageId', as: 'package' });

User.hasOne(Cart, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'userId' });
Cart.hasMany(CartItem, { foreignKey: { name: 'cartId', allowNull: false }, as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });
ProductPackage.hasMany(CartItem, { foreignKey: { name: 'packageId', allowNull: false } });
CartItem.belongsTo(ProductPackage, { foreignKey: 'packageId', as: 'package' });

User.hasMany(Favorite, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
Product.hasMany(Favorite, { foreignKey: { name: 'productId', allowNull: false }, onDelete: 'CASCADE' });
Favorite.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Favorite.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Order, { foreignKey: { name: 'userId', allowNull: false }, as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Coupon.hasMany(Order, { foreignKey: 'couponId' });
Order.belongsTo(Coupon, { foreignKey: 'couponId', as: 'coupon' });
Order.hasMany(OrderItem, { foreignKey: { name: 'orderId', allowNull: false }, as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Product.hasMany(OrderItem, { foreignKey: { name: 'productId', allowNull: false } });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
ProductPackage.hasMany(OrderItem, { foreignKey: { name: 'packageId', allowNull: false } });
OrderItem.belongsTo(ProductPackage, { foreignKey: 'packageId', as: 'package' });

Order.hasMany(Payment, { foreignKey: { name: 'orderId', allowNull: false }, as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'orderId' });
User.hasMany(Payment, { foreignKey: 'confirmedBy' });
Payment.belongsTo(User, { foreignKey: 'confirmedBy', as: 'confirmer' });

Coupon.hasMany(CouponUsage, { foreignKey: { name: 'couponId', allowNull: false } });
User.hasMany(CouponUsage, { foreignKey: { name: 'userId', allowNull: false } });
Order.hasOne(CouponUsage, { foreignKey: { name: 'orderId', allowNull: false } });
CouponUsage.belongsTo(Coupon, { foreignKey: 'couponId' });
CouponUsage.belongsTo(User, { foreignKey: 'userId' });
CouponUsage.belongsTo(Order, { foreignKey: 'orderId' });

OrderItem.hasMany(OrderDelivery, { foreignKey: { name: 'orderItemId', allowNull: false }, as: 'deliveries' });
Inventory.hasOne(OrderDelivery, { foreignKey: { name: 'inventoryId', allowNull: false }, as: 'delivery' });
OrderDelivery.belongsTo(OrderItem, { foreignKey: 'orderItemId', as: 'orderItem' });
OrderDelivery.belongsTo(Inventory, { foreignKey: 'inventoryId', as: 'inventory' });
User.hasMany(OrderDelivery, { foreignKey: { name: 'userId', allowNull: false }, as: 'deliveries' });
OrderDelivery.belongsTo(User, { foreignKey: 'userId' });
Order.hasMany(Inventory, { foreignKey: 'orderId', as: 'assignedInventories' });
Inventory.belongsTo(Order, { foreignKey: 'orderId' });
User.hasMany(Inventory, { foreignKey: 'assignedUserId' });
Inventory.belongsTo(User, { foreignKey: 'assignedUserId' });

User.hasMany(Review, { foreignKey: { name: 'userId', allowNull: false } });
Product.hasMany(Review, { foreignKey: { name: 'productId', allowNull: false }, as: 'reviews' });
OrderItem.hasOne(Review, { foreignKey: { name: 'orderItemId', allowNull: false } });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Review.belongsTo(Product, { foreignKey: 'productId' });
Review.belongsTo(OrderItem, { foreignKey: 'orderItemId' });

User.hasMany(AuditLog, { foreignKey: 'actorUserId' });
AuditLog.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });
User.hasMany(SupportRequest, { foreignKey: { name: 'userId', allowNull: false } });
Order.hasMany(SupportRequest, { foreignKey: 'orderId' });
SupportRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });
SupportRequest.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

export const models = {
  User, RefreshToken, Category, Product, ProductImage, ProductPackage, Inventory,
  Cart, CartItem, Favorite, Order, OrderItem, OrderDelivery, Payment, Coupon,
  CouponUsage, Review, Banner, Setting, AuditLog, SupportRequest,
};

export { Op };
