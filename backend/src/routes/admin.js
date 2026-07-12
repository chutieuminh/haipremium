import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import slugify from 'slugify';
import { body } from 'express-validator';
import { parse } from 'csv-parse/sync';
import { Op, fn, col, literal } from 'sequelize';
import { env, sequelize } from '../config.js';
import {
  AuditLog, Banner, Category, Coupon, Inventory, Order, OrderDelivery, OrderItem, Payment,
  Product, ProductPackage, Review, Setting, SupportRequest, User,
} from '../models.js';
import { authenticate, imageUpload, requireAdmin, validate } from '../middleware.js';
import {
  AppError, asyncHandler, audit, decryptSecret, encryptSecret, numberValue,
  serializeOrder, serializeProduct, success,
} from '../utils.js';

const router = express.Router();
router.use(authenticate, requireAdmin);

const productInclude = [
  { model: Category, as: 'category' },
  { model: ProductPackage, as: 'packages', required: false },
];
const orderInclude = [
  { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone'] },
  { model: OrderItem, as: 'items', include: [
    { model: Product, as: 'product', include: productInclude },
    { model: ProductPackage, as: 'package' },
    { model: OrderDelivery, as: 'deliveries', required: false },
  ] },
  { model: Payment, as: 'payments' },
];

router.get('/dashboard', asyncHandler(async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [todayRevenue, monthRevenue, totalOrders, pendingOrders, completedOrders, customers, inventoryAvailable, lowStock, recentOrders, topProducts] = await Promise.all([
    Order.sum('total', { where: { orderStatus: 'completed', completedAt: { [Op.gte]: startOfDay } } }),
    Order.sum('total', { where: { orderStatus: 'completed', completedAt: { [Op.gte]: startOfMonth } } }),
    Order.count(),
    Order.count({ where: { orderStatus: { [Op.in]: ['pending_payment', 'payment_review', 'paid', 'processing'] } } }),
    Order.count({ where: { orderStatus: 'completed' } }),
    User.count({ where: { role: 'customer' } }),
    Inventory.count({ where: { status: 'AVAILABLE' } }),
    ProductPackage.count({ where: { stock: { [Op.lte]: 5 }, isActive: true } }),
    Order.findAll({ include: orderInclude, order: [['createdAt', 'DESC']], limit: 8 }),
    Product.findAll({ include: productInclude, order: [['soldCount', 'DESC']], limit: 5 }),
  ]);

  const revenueRows = await Order.findAll({
    attributes: [[fn('DATE', col('completedAt')), 'date'], [fn('SUM', col('total')), 'revenue']],
    where: { orderStatus: 'completed', completedAt: { [Op.gte]: new Date(now.getTime() - 30 * 86400000) } },
    group: [fn('DATE', col('completedAt'))],
    order: [[fn('DATE', col('completedAt')), 'ASC']],
    raw: true,
  });

  return success(res, {
    stats: {
      todayRevenue: numberValue(todayRevenue), monthRevenue: numberValue(monthRevenue), totalOrders,
      pendingOrders, completedOrders, customers, inventoryAvailable, lowStock,
    },
    revenueChart: revenueRows.map((row) => ({ date: row.date, revenue: numberValue(row.revenue) })),
    recentOrders: recentOrders.map((order) => serializeOrder(order)),
    topProducts: topProducts.map(serializeProduct),
  });
}));

router.get('/categories', asyncHandler(async (_req, res) => success(res, await Category.findAll({ order: [['id', 'ASC']] }))));
router.post('/categories', [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('code').trim().isLength({ min: 2, max: 40 }),
], validate, asyncHandler(async (req, res) => {
  const category = await Category.create({
    code: req.body.code,
    name: req.body.name,
    slug: req.body.slug || slugify(req.body.name, { lower: true, strict: true, locale: 'vi' }),
    description: req.body.description,
    icon: req.body.icon,
    accent: req.body.accent,
    isActive: req.body.isActive ?? true,
  });
  await audit(req, 'CATEGORY_CREATED', 'Category', category.id);
  return success(res, category, 'Đã thêm danh mục.', 201);
}));
router.put('/categories/:id', asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw new AppError('Không tìm thấy danh mục.', 404);
  const allowed = ['code', 'name', 'slug', 'description', 'icon', 'accent', 'isActive'];
  for (const key of allowed) if (req.body[key] !== undefined) category[key] = req.body[key];
  await category.save();
  await audit(req, 'CATEGORY_UPDATED', 'Category', category.id);
  return success(res, category, 'Đã cập nhật danh mục.');
}));
router.delete('/categories/:id', asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw new AppError('Không tìm thấy danh mục.', 404);
  if (await Product.count({ where: { categoryId: category.id } })) throw new AppError('Không thể xóa danh mục đang có sản phẩm.', 422);
  await category.destroy();
  await audit(req, 'CATEGORY_DELETED', 'Category', req.params.id);
  return success(res, null, 'Đã xóa danh mục.');
}));

router.get('/products', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const where = {};
  if (req.query.q) where.name = { [Op.like]: `%${req.query.q}%` };
  if (req.query.status) where.status = req.query.status;
  const { rows, count } = await Product.findAndCountAll({ where, include: productInclude, distinct: true, limit, offset: (page - 1) * limit, order: [['createdAt', 'DESC']], paranoid: false });
  return success(res, rows.map(serializeProduct), 'Lấy danh sách sản phẩm thành công.', 200, { page, limit, totalItems: count, totalPages: Math.ceil(count / limit) || 1 });
}));

router.post('/products', imageUpload('products').single('logoFile'), asyncHandler(async (req, res) => {
  const payload = req.body;
  if (!payload.name || !payload.categoryId) throw new AppError('Tên và danh mục sản phẩm là bắt buộc.', 422);
  const logo = req.file ? `/uploads/products/${path.basename(req.file.path)}` : payload.logo;
  const product = await Product.create({
    categoryId: Number(payload.categoryId),
    name: payload.name,
    slug: payload.slug || slugify(payload.name, { lower: true, strict: true, locale: 'vi' }),
    shortDescription: payload.shortDescription,
    description: payload.description,
    logo,
    originalPrice: Number(payload.originalPrice || 0),
    basePrice: Number(payload.basePrice || 0),
    status: payload.status || 'active',
    isFeatured: String(payload.isFeatured) === 'true',
    isBestSeller: String(payload.isBestSeller) === 'true',
    warrantyDescription: payload.warrantyDescription,
    usageInstructions: payload.usageInstructions,
    terms: payload.terms,
    features: payload.features ? (typeof payload.features === 'string' ? payload.features.split('\n').filter(Boolean) : payload.features) : [],
    badge: payload.badge,
    seoTitle: payload.seoTitle,
    seoDescription: payload.seoDescription,
  });
  const fresh = await Product.findByPk(product.id, { include: productInclude });
  await audit(req, 'PRODUCT_CREATED', 'Product', product.id);
  return success(res, serializeProduct(fresh), 'Đã thêm sản phẩm.', 201);
}));

router.put('/products/:id', imageUpload('products').single('logoFile'), asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id, { paranoid: false });
  if (!product) throw new AppError('Không tìm thấy sản phẩm.', 404);
  const payload = req.body;
  const textFields = ['name', 'slug', 'shortDescription', 'description', 'status', 'warrantyDescription', 'usageInstructions', 'terms', 'badge', 'seoTitle', 'seoDescription'];
  for (const field of textFields) if (payload[field] !== undefined) product[field] = payload[field];
  if (payload.categoryId !== undefined) product.categoryId = Number(payload.categoryId);
  if (payload.originalPrice !== undefined) product.originalPrice = Number(payload.originalPrice);
  if (payload.basePrice !== undefined) product.basePrice = Number(payload.basePrice);
  if (payload.isFeatured !== undefined) product.isFeatured = String(payload.isFeatured) === 'true' || payload.isFeatured === true;
  if (payload.isBestSeller !== undefined) product.isBestSeller = String(payload.isBestSeller) === 'true' || payload.isBestSeller === true;
  if (payload.features !== undefined) product.features = typeof payload.features === 'string' ? payload.features.split('\n').filter(Boolean) : payload.features;
  if (req.file) product.logo = `/uploads/products/${path.basename(req.file.path)}`;
  else if (payload.logo !== undefined) product.logo = payload.logo;
  await product.save();
  const fresh = await Product.findByPk(product.id, { include: productInclude, paranoid: false });
  await audit(req, 'PRODUCT_UPDATED', 'Product', product.id);
  return success(res, serializeProduct(fresh), 'Đã cập nhật sản phẩm.');
}));

router.delete('/products/:id', asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw new AppError('Không tìm thấy sản phẩm.', 404);
  await product.destroy();
  await audit(req, 'PRODUCT_DELETED', 'Product', product.id);
  return success(res, null, 'Đã xóa mềm sản phẩm.');
}));

router.get('/packages', asyncHandler(async (req, res) => {
  const where = req.query.productId ? { productId: req.query.productId } : {};
  const packages = await ProductPackage.findAll({ where, include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'slug', 'logo'] }], order: [['createdAt', 'DESC']] });
  return success(res, packages.map((item) => ({ ...item.toJSON(), salePrice: numberValue(item.salePrice), originalPrice: numberValue(item.originalPrice) })));
}));

router.post('/packages', [
  body('productId').isInt({ min: 1 }), body('name').trim().notEmpty(), body('duration').trim().notEmpty(),
  body('accountType').isIn(['Tài khoản riêng', 'Tài khoản dùng chung', 'Nâng cấp chính chủ', 'Mã kích hoạt', 'Thành viên nhóm']),
  body('salePrice').isFloat({ min: 0 }), body('stock').optional().isInt({ min: 0 }),
], validate, asyncHandler(async (req, res) => {
  const pkg = await ProductPackage.create(req.body);
  await audit(req, 'PACKAGE_CREATED', 'ProductPackage', pkg.id);
  return success(res, pkg, 'Đã thêm gói sản phẩm.', 201);
}));
router.put('/packages/:id', asyncHandler(async (req, res) => {
  const pkg = await ProductPackage.findByPk(req.params.id);
  if (!pkg) throw new AppError('Không tìm thấy gói sản phẩm.', 404);
  const allowed = ['productId', 'name', 'duration', 'accountType', 'description', 'originalPrice', 'salePrice', 'stock', 'warrantyDays', 'isActive'];
  for (const key of allowed) if (req.body[key] !== undefined) pkg[key] = req.body[key];
  await pkg.save();
  await audit(req, 'PACKAGE_UPDATED', 'ProductPackage', pkg.id);
  return success(res, pkg, 'Đã cập nhật gói sản phẩm.');
}));
router.delete('/packages/:id', asyncHandler(async (req, res) => {
  const pkg = await ProductPackage.findByPk(req.params.id);
  if (!pkg) throw new AppError('Không tìm thấy gói sản phẩm.', 404);
  if (await OrderItem.count({ where: { packageId: pkg.id } })) {
    pkg.isActive = false;
    await pkg.save();
    return success(res, pkg, 'Gói đã có đơn hàng nên được chuyển sang trạng thái ẩn.');
  }
  await pkg.destroy();
  await audit(req, 'PACKAGE_DELETED', 'ProductPackage', pkg.id);
  return success(res, null, 'Đã xóa gói sản phẩm.');
}));

router.get('/orders', asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.orderStatus = req.query.status;
  if (req.query.q) where[Op.or] = [{ orderCode: { [Op.like]: `%${req.query.q}%` } }, { customerEmail: { [Op.like]: `%${req.query.q}%` } }, { customerName: { [Op.like]: `%${req.query.q}%` } }];
  const orders = await Order.findAll({ where, include: orderInclude, order: [['createdAt', 'DESC']] });
  return success(res, orders.map((order) => serializeOrder(order)));
}));

router.get('/orders/:id/payment-proof', asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError('Không tìm thấy đơn hàng.', 404);
  if (!order.paymentProofPath) throw new AppError('Đơn hàng chưa có ảnh biên lai.', 404);
  const filename = path.basename(order.paymentProofPath);
  const filePath = path.join(env.uploadDir, 'payment-proofs', filename);
  const buffer = await fs.readFile(filePath).catch(() => null);
  if (!buffer) throw new AppError('Không tìm thấy tệp biên lai trên máy chủ.', 404);
  const extension = path.extname(filename).toLowerCase();
  const mimeType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
  await audit(req, 'PAYMENT_PROOF_VIEWED', 'Order', order.id);
  return success(res, { mimeType, dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}` });
}));

router.get('/orders/:id', asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, { include: orderInclude });
  if (!order) throw new AppError('Không tìm thấy đơn hàng.', 404);
  return success(res, serializeOrder(order));
}));

router.post('/orders/:id/confirm-payment', asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError('Không tìm thấy đơn hàng.', 404);
  if (!['pending_payment', 'payment_review'].includes(order.orderStatus)) throw new AppError('Đơn hàng không ở trạng thái chờ xác nhận.', 422);
  order.paymentStatus = 'paid';
  order.orderStatus = 'paid';
  await order.save();
  await Payment.update({ status: 'paid', confirmedBy: req.user.id, confirmedAt: new Date() }, { where: { orderId: order.id } });
  await audit(req, 'PAYMENT_CONFIRMED', 'Order', order.id, { orderCode: order.orderCode });
  return success(res, order, 'Đã xác nhận thanh toán.');
}));

router.put('/orders/:id/status', [body('orderStatus').isIn(['pending_payment', 'payment_review', 'paid', 'processing', 'completed', 'cancelled', 'refunded'])], validate, asyncHandler(async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(req.params.id, { include: [{ model: OrderItem, as: 'items' }], transaction, lock: transaction.LOCK.UPDATE });
    if (!order) throw new AppError('Không tìm thấy đơn hàng.', 404);
    const oldStatus = order.orderStatus;
    const newStatus = req.body.orderStatus;
    if (newStatus === 'completed') throw new AppError('Hãy sử dụng chức năng bàn giao để hoàn thành đơn.', 422);
    if (newStatus === 'cancelled' && !['cancelled', 'refunded', 'completed'].includes(oldStatus)) {
      for (const item of order.items) await ProductPackage.increment('stock', { by: item.quantity, where: { id: item.packageId }, transaction });
    }
    order.orderStatus = newStatus;
    if (req.body.internalNote !== undefined) order.internalNote = req.body.internalNote;
    await order.save({ transaction });
    return order;
  });
  await audit(req, 'ORDER_STATUS_CHANGED', 'Order', result.id, { status: result.orderStatus });
  return success(res, result, 'Đã cập nhật trạng thái đơn hàng.');
}));

router.post('/orders/:id/deliver', asyncHandler(async (req, res) => {
  const delivered = await sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(req.params.id, { include: [{ model: OrderItem, as: 'items' }], transaction, lock: transaction.LOCK.UPDATE });
    if (!order) throw new AppError('Không tìm thấy đơn hàng.', 404);
    if (!['paid', 'processing'].includes(order.orderStatus) || order.paymentStatus !== 'paid') throw new AppError('Đơn hàng phải được thanh toán trước khi bàn giao.', 422);

    const assignments = [];
    for (const item of order.items) {
      const inventories = await Inventory.findAll({
        where: { packageId: item.packageId, status: 'AVAILABLE' },
        order: [['id', 'ASC']],
        limit: item.quantity,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (inventories.length < item.quantity) throw new AppError(`Không đủ dữ liệu kho cho ${item.packageName}.`, 422);
      for (const inventory of inventories) {
        inventory.status = 'SOLD';
        inventory.orderId = order.id;
        inventory.assignedUserId = order.userId;
        inventory.assignedAt = new Date();
        await inventory.save({ transaction });
        const delivery = await OrderDelivery.create({ orderItemId: item.id, inventoryId: inventory.id, userId: order.userId, deliveredAt: new Date() }, { transaction });
        assignments.push(delivery);
      }
      await Product.increment('soldCount', { by: item.quantity, where: { id: item.productId }, transaction });
    }
    order.orderStatus = 'completed';
    order.completedAt = new Date();
    await order.save({ transaction });
    return { order, assignments: assignments.length };
  });
  await audit(req, 'ORDER_DELIVERED', 'Order', delivered.order.id, { assignments: delivered.assignments });
  return success(res, { orderId: delivered.order.id, orderCode: delivered.order.orderCode, deliveredItems: delivered.assignments }, 'Đã bàn giao và hoàn thành đơn hàng.');
}));

router.get('/users', asyncHandler(async (req, res) => {
  const where = { role: 'customer' };
  if (req.query.q) where[Op.or] = [{ fullName: { [Op.like]: `%${req.query.q}%` } }, { email: { [Op.like]: `%${req.query.q}%` } }];
  const users = await User.findAll({ where, attributes: { exclude: ['passwordHash'] }, order: [['createdAt', 'DESC']] });
  return success(res, users);
}));
router.put('/users/:id/status', [body('status').isIn(['active', 'blocked'])], validate, asyncHandler(async (req, res) => {
  const user = await User.findOne({ where: { id: req.params.id, role: 'customer' } });
  if (!user) throw new AppError('Không tìm thấy khách hàng.', 404);
  user.status = req.body.status;
  await user.save();
  await audit(req, 'USER_STATUS_CHANGED', 'User', user.id, { status: user.status });
  return success(res, { id: user.id, status: user.status }, 'Đã cập nhật trạng thái khách hàng.');
}));

const serializeInventoryAdmin = (item, reveal = false) => {
  const plain = item.get({ plain: true });
  return {
    ...plain,
    encryptedPassword: undefined,
    encryptedActivationCode: undefined,
    encryptedRecoveryInfo: undefined,
    password: reveal ? decryptSecret(plain.encryptedPassword) : plain.encryptedPassword ? '••••••••' : null,
    activationCode: reveal ? decryptSecret(plain.encryptedActivationCode) : plain.encryptedActivationCode ? '••••••••' : null,
    recoveryInfo: reveal ? decryptSecret(plain.encryptedRecoveryInfo) : plain.encryptedRecoveryInfo ? '••••••••' : null,
  };
};

router.get('/inventories', asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.packageId) where.packageId = req.query.packageId;
  if (req.query.status) where.status = req.query.status;
  const items = await Inventory.findAll({ where, include: [{ model: ProductPackage, as: 'package', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'slug', 'logo'] }] }], order: [['createdAt', 'DESC']], limit: 500 });
  return success(res, items.map((item) => serializeInventoryAdmin(item)));
}));
router.get('/inventories/:id/reveal', asyncHandler(async (req, res) => {
  const item = await Inventory.findByPk(req.params.id, { include: [{ model: ProductPackage, as: 'package', include: [{ model: Product, as: 'product' }] }] });
  if (!item) throw new AppError('Không tìm thấy dữ liệu kho.', 404);
  await audit(req, 'INVENTORY_SECRET_REVEALED', 'Inventory', item.id);
  return success(res, serializeInventoryAdmin(item, true));
}));
router.post('/inventories', [body('packageId').isInt({ min: 1 }), body('type').isIn(['ACCOUNT', 'LICENSE_KEY', 'INVITE_LINK', 'MANUAL_DELIVERY'])], validate, asyncHandler(async (req, res) => {
  const item = await Inventory.create({
    packageId: req.body.packageId,
    type: req.body.type,
    loginEmail: req.body.loginEmail || null,
    loginUsername: req.body.loginUsername || null,
    encryptedPassword: encryptSecret(req.body.password),
    encryptedActivationCode: encryptSecret(req.body.activationCode),
    encryptedRecoveryInfo: encryptSecret(req.body.recoveryInfo),
    additionalInformation: req.body.additionalInformation,
    status: req.body.status || 'AVAILABLE',
    expiresAt: req.body.expiresAt || null,
  });
  if (item.status === 'AVAILABLE') await ProductPackage.increment('stock', { by: 1, where: { id: item.packageId } });
  await audit(req, 'INVENTORY_CREATED', 'Inventory', item.id);
  return success(res, serializeInventoryAdmin(item), 'Đã thêm dữ liệu kho.', 201);
}));
router.post('/inventories/import', express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' }), asyncHandler(async (req, res) => {
  const rows = parse(req.body, { columns: true, skip_empty_lines: true, trim: true });
  if (!rows.length) throw new AppError('Tệp CSV không có dữ liệu.', 422);
  const created = [];
  for (const row of rows.slice(0, 1000)) {
    if (!row.packageId || !row.type) continue;
    created.push(await Inventory.create({
      packageId: Number(row.packageId), type: row.type, loginEmail: row.loginEmail || null,
      loginUsername: row.loginUsername || null, encryptedPassword: encryptSecret(row.password),
      encryptedActivationCode: encryptSecret(row.activationCode), encryptedRecoveryInfo: encryptSecret(row.recoveryInfo),
      additionalInformation: row.additionalInformation || null, status: row.status || 'AVAILABLE', expiresAt: row.expiresAt || null,
    }));
  }
  const stockByPackage = created.filter((item) => item.status === 'AVAILABLE').reduce((map, item) => map.set(item.packageId, (map.get(item.packageId) || 0) + 1), new Map());
  for (const [packageId, count] of stockByPackage) await ProductPackage.increment('stock', { by: count, where: { id: packageId } });
  await audit(req, 'INVENTORY_IMPORTED', 'Inventory', null, { count: created.length });
  return success(res, { imported: created.length }, `Đã nhập ${created.length} bản ghi kho.`, 201);
}));
router.put('/inventories/:id', asyncHandler(async (req, res) => {
  const item = await Inventory.findByPk(req.params.id);
  if (!item) throw new AppError('Không tìm thấy dữ liệu kho.', 404);
  const oldStatus = item.status;
  const oldPackageId = item.packageId;
  const allowed = ['packageId', 'type', 'loginEmail', 'loginUsername', 'additionalInformation', 'status', 'expiresAt'];
  for (const key of allowed) if (req.body[key] !== undefined) item[key] = req.body[key];
  if (req.body.password !== undefined) item.encryptedPassword = encryptSecret(req.body.password);
  if (req.body.activationCode !== undefined) item.encryptedActivationCode = encryptSecret(req.body.activationCode);
  if (req.body.recoveryInfo !== undefined) item.encryptedRecoveryInfo = encryptSecret(req.body.recoveryInfo);
  await item.save();
  if (oldStatus === 'AVAILABLE' && (item.status !== 'AVAILABLE' || oldPackageId !== item.packageId)) await ProductPackage.decrement('stock', { by: 1, where: { id: oldPackageId } });
  if (item.status === 'AVAILABLE' && (oldStatus !== 'AVAILABLE' || oldPackageId !== item.packageId)) await ProductPackage.increment('stock', { by: 1, where: { id: item.packageId } });
  await audit(req, 'INVENTORY_UPDATED', 'Inventory', item.id);
  return success(res, serializeInventoryAdmin(item), 'Đã cập nhật dữ liệu kho.');
}));
router.delete('/inventories/:id', asyncHandler(async (req, res) => {
  const item = await Inventory.findByPk(req.params.id);
  if (!item) throw new AppError('Không tìm thấy dữ liệu kho.', 404);
  if (item.status === 'SOLD') throw new AppError('Không thể xóa dữ liệu đã bàn giao.', 422);
  if (item.status === 'AVAILABLE') await ProductPackage.decrement('stock', { by: 1, where: { id: item.packageId } });
  await item.destroy();
  await audit(req, 'INVENTORY_DELETED', 'Inventory', item.id);
  return success(res, null, 'Đã xóa dữ liệu kho.');
}));

router.get('/coupons', asyncHandler(async (_req, res) => success(res, await Coupon.findAll({ order: [['createdAt', 'DESC']] }))));
router.post('/coupons', [body('code').trim().notEmpty(), body('discountType').isIn(['PERCENTAGE', 'FIXED_AMOUNT']), body('discountValue').isFloat({ min: 0 })], validate, asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase() });
  await audit(req, 'COUPON_CREATED', 'Coupon', coupon.id);
  return success(res, coupon, 'Đã tạo mã giảm giá.', 201);
}));
router.put('/coupons/:id', asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) throw new AppError('Không tìm thấy mã giảm giá.', 404);
  const allowed = ['code', 'description', 'discountType', 'discountValue', 'minimumOrderValue', 'maximumDiscount', 'usageLimit', 'usageLimitPerUser', 'startDate', 'endDate', 'isActive'];
  for (const key of allowed) if (req.body[key] !== undefined) coupon[key] = key === 'code' ? String(req.body[key]).toUpperCase() : req.body[key];
  await coupon.save();
  await audit(req, 'COUPON_UPDATED', 'Coupon', coupon.id);
  return success(res, coupon, 'Đã cập nhật mã giảm giá.');
}));
router.delete('/coupons/:id', asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) throw new AppError('Không tìm thấy mã giảm giá.', 404);
  coupon.isActive = false;
  await coupon.save();
  await audit(req, 'COUPON_DISABLED', 'Coupon', coupon.id);
  return success(res, null, 'Đã vô hiệu hóa mã giảm giá.');
}));

router.get('/reviews', asyncHandler(async (_req, res) => {
  const reviews = await Review.findAll({ include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }, { model: Product, attributes: ['id', 'name', 'slug'] }], order: [['createdAt', 'DESC']] });
  return success(res, reviews);
}));
router.put('/reviews/:id/status', [body('isVisible').isBoolean()], validate, asyncHandler(async (req, res) => {
  const review = await Review.findByPk(req.params.id);
  if (!review) throw new AppError('Không tìm thấy đánh giá.', 404);
  review.isVisible = req.body.isVisible;
  await review.save();
  await audit(req, 'REVIEW_VISIBILITY_CHANGED', 'Review', review.id, { isVisible: review.isVisible });
  return success(res, review, 'Đã cập nhật trạng thái đánh giá.');
}));

router.get('/support-requests', asyncHandler(async (_req, res) => {
  const requests = await SupportRequest.findAll({ include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }, { model: Order, as: 'order', attributes: ['id', 'orderCode'] }], order: [['createdAt', 'DESC']] });
  return success(res, requests);
}));
router.put('/support-requests/:id', asyncHandler(async (req, res) => {
  const request = await SupportRequest.findByPk(req.params.id);
  if (!request) throw new AppError('Không tìm thấy yêu cầu hỗ trợ.', 404);
  if (req.body.status !== undefined) request.status = req.body.status;
  if (req.body.adminReply !== undefined) request.adminReply = req.body.adminReply;
  await request.save();
  await audit(req, 'SUPPORT_REQUEST_UPDATED', 'SupportRequest', request.id);
  return success(res, request, 'Đã cập nhật yêu cầu hỗ trợ.');
}));


router.get('/banners', asyncHandler(async (_req, res) => success(res, await Banner.findAll({ order: [['sortOrder', 'ASC']] }))));
router.post('/banners', asyncHandler(async (req, res) => {
  if (!req.body.title || !req.body.imageUrl) throw new AppError('Tiêu đề và ảnh banner là bắt buộc.', 422);
  const banner = await Banner.create({
    title: req.body.title, subtitle: req.body.subtitle, imageUrl: req.body.imageUrl,
    linkUrl: req.body.linkUrl, sortOrder: Number(req.body.sortOrder || 0), isActive: req.body.isActive ?? true,
  });
  await audit(req, 'BANNER_CREATED', 'Banner', banner.id);
  return success(res, banner, 'Đã thêm banner.', 201);
}));
router.put('/banners/:id', asyncHandler(async (req, res) => {
  const banner = await Banner.findByPk(req.params.id);
  if (!banner) throw new AppError('Không tìm thấy banner.', 404);
  for (const key of ['title', 'subtitle', 'imageUrl', 'linkUrl', 'sortOrder', 'isActive']) if (req.body[key] !== undefined) banner[key] = req.body[key];
  await banner.save();
  await audit(req, 'BANNER_UPDATED', 'Banner', banner.id);
  return success(res, banner, 'Đã cập nhật banner.');
}));
router.delete('/banners/:id', asyncHandler(async (req, res) => {
  const banner = await Banner.findByPk(req.params.id);
  if (!banner) throw new AppError('Không tìm thấy banner.', 404);
  await banner.destroy();
  await audit(req, 'BANNER_DELETED', 'Banner', banner.id);
  return success(res, null, 'Đã xóa banner.');
}));

router.get('/settings', asyncHandler(async (_req, res) => {
  const settings = await Setting.findAll({ order: [['key', 'ASC']] });
  return success(res, Object.fromEntries(settings.map((item) => [item.key, { value: item.type === 'secret' ? '••••••••' : item.value, type: item.type }])));
}));
router.put('/settings', asyncHandler(async (req, res) => {
  for (const [key, incoming] of Object.entries(req.body)) {
    const value = typeof incoming === 'object' && incoming !== null ? incoming.value : incoming;
    const type = typeof incoming === 'object' && incoming !== null ? incoming.type || 'text' : 'text';
    if (value === '••••••••') continue;
    await Setting.upsert({ key, value: value === null || value === undefined ? '' : String(value), type });
  }
  await audit(req, 'SETTINGS_UPDATED', 'Setting', null, { keys: Object.keys(req.body) });
  return success(res, null, 'Đã cập nhật cài đặt website.');
}));

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const limit = Math.min(200, Number(req.query.limit || 100));
  const logs = await AuditLog.findAll({ include: [{ model: User, as: 'actor', attributes: ['id', 'fullName', 'email'] }], order: [['createdAt', 'DESC']], limit });
  return success(res, logs);
}));

export default router;
